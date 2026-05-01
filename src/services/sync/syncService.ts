import { db } from '../../db/db';
import { SYNC_CONFIG, SYNC_DOMAINS } from '../../constants/sync';
import type {
  DriveClientIndexEntry,
  DriveClientsIndex,
  DriveMeta,
  DriveClientSnapshot,
  LocalSyncMeta,
  SyncQueueEntry,
} from '../../types';
import { buildClientSnapshot, applyClientSnapshot, purgeClientRecords } from '../shared/clientSnapshotMapper';
import { nowIsoUtc } from '../shared/date';
import {
  DRIVE_FOLDER_MIME_TYPE,
  deleteDriveFile,
  downloadFile,
  ensureDriveLayout,
  findDriveFileByName,
  uploadFile,
} from './driveService';
import {
  enqueueClientUpdate,
  getPendingQueue,
  markQueueEntryFailed,
  markQueueEntryProcessing,
  removeQueueEntry,
} from './syncQueueService';

let activeSync: Promise<boolean> | null = null;
let scheduledSyncId: number | null = null;

function getRetryTime(retryCount: number): string {
  const seconds = SYNC_CONFIG.retryBackoffSeconds[Math.min(retryCount - 1, SYNC_CONFIG.retryBackoffSeconds.length - 1)] || 300;
  return new Date(Date.now() + seconds * 1000).toISOString();
}

function toTimestamp(value?: string): number | null {
  if (!value) {
    return null;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function isRemoteTimestampNewer(localValue: string | undefined, remoteValue: string): boolean {
  if (!localValue) {
    return true;
  }

  const localTimestamp = toTimestamp(localValue);
  const remoteTimestamp = toTimestamp(remoteValue);

  if (localTimestamp !== null && remoteTimestamp !== null) {
    return remoteTimestamp > localTimestamp;
  }

  return remoteValue > localValue;
}

function hasRemoteChanges(syncMeta: LocalSyncMeta, remoteMeta: DriveMeta, remoteIndex: DriveClientsIndex): boolean {
  return (
    isRemoteTimestampNewer(syncMeta.remote_meta_updated_at, remoteMeta.updated_at)
    || isRemoteTimestampNewer(syncMeta.remote_index_updated_at, remoteIndex.updated_at)
  );
}

async function readSyncMeta(): Promise<LocalSyncMeta> {
  const meta = await db.syncMeta.get('default');
  if (meta) {
    return meta;
  }
  const seed: LocalSyncMeta = { id: 'default' };
  await db.syncMeta.put(seed);
  return seed;
}

async function patchSyncMeta(patch: Partial<LocalSyncMeta>): Promise<void> {
  const meta = await readSyncMeta();
  await db.syncMeta.put({
    ...meta,
    ...patch,
    id: 'default',
  });
}

async function loadRemoteMeta(fileId: string): Promise<DriveMeta> {
  return (await downloadFile<DriveMeta>(fileId)) || {
    version: 1,
    updated_at: '1970-01-01T00:00:00Z',
  };
}

async function loadRemoteIndex(fileId: string): Promise<DriveClientsIndex> {
  return (await downloadFile<DriveClientsIndex>(fileId)) || {
    version: 1,
    updated_at: '1970-01-01T00:00:00Z',
    clients: [],
  };
}

async function saveRemoteMeta(fileId: string, rootFolderId: string, meta: DriveMeta): Promise<string> {
  return uploadFile('meta.json', rootFolderId, meta, fileId);
}

async function saveRemoteIndex(fileId: string, rootFolderId: string, index: DriveClientsIndex): Promise<string> {
  return uploadFile('clients_index.json', rootFolderId, index, fileId);
}

async function hasPendingQueue(): Promise<boolean> {
  return (await db.syncQueue.count()) > 0;
}

function shouldSyncQueueEntry(entry: SyncQueueEntry): boolean {
  if (entry.status === 'pending' || entry.status === 'processing') {
    return true;
  }
  if (entry.status === 'failed' && entry.retry_count < SYNC_CONFIG.maxRetries) {
    return !entry.next_retry_at || entry.next_retry_at <= nowIsoUtc();
  }
  return false;
}

async function markClientAsSynced(clientId: string, updatedAt: string, version: number): Promise<void> {
  await db.transaction('rw', db.clients, db.clientSyncState, async () => {
    await db.clients.update(clientId, (client) => {
      if (!client) {
        return;
      }
      client.sync_status = 'synced';
      client.updated_at = updatedAt;
      client.version = version;
    });
    await db.clientSyncState.put({
      client_id: clientId,
      remote_updated_at: updatedAt,
      remote_version: version,
      last_synced_at: nowIsoUtc(),
    });
  });
}

function normalizeRemoteSnapshot(snapshot: DriveClientSnapshot): DriveClientSnapshot {
  return {
    ...snapshot,
    deleted: false,
    client: {
      ...snapshot.client,
      sync_status: 'synced',
    },
  };
}

async function processUploadQueue(): Promise<boolean> {
  const queue = (await getPendingQueue()).filter(shouldSyncQueueEntry);
  if (queue.length === 0) {
    return false;
  }

  const layout = await ensureDriveLayout();
  const remoteIndex = await loadRemoteIndex(layout.clientsIndexFileId);
  const indexByClientId = new Map(remoteIndex.clients.map((entry) => [entry.id, entry]));
  const now = nowIsoUtc();
  let remoteChanged = false;

  for (const queueEntry of queue) {
    try {
      await markQueueEntryProcessing(queueEntry.id);

      if (queueEntry.operation === 'delete') {
        const localClient = await db.clients.get(queueEntry.client_id);
        const existingEntry = indexByClientId.get(queueEntry.client_id);
        const resolvedFileId = existingEntry?.file_id || (
          await findDriveFileByName(`${queueEntry.client_id}.json`, layout.clientsFolderId)
        )?.id;

        if (resolvedFileId) {
          await deleteDriveFile(resolvedFileId);
        }

        const mediaFolder = await findDriveFileByName(queueEntry.client_id, layout.mediaFolderId, DRIVE_FOLDER_MIME_TYPE);
        if (mediaFolder) {
          await deleteDriveFile(mediaFolder.id);
        }

        const deletedEntry: DriveClientIndexEntry = {
          id: queueEntry.client_id,
          version: localClient?.version || existingEntry?.version || 1,
          updated_at: localClient?.updated_at || now,
          deleted: true,
          file_id: undefined,
        };
        indexByClientId.set(queueEntry.client_id, deletedEntry);
        await purgeClientRecords(queueEntry.client_id);
        await removeQueueEntry(queueEntry.id);
        remoteChanged = true;
        continue;
      }

      const snapshot = await buildClientSnapshot(queueEntry.client_id);
      if (!snapshot) {
        await removeQueueEntry(queueEntry.id);
        continue;
      }

      const remoteSnapshot = normalizeRemoteSnapshot(snapshot);
      const existingEntry = indexByClientId.get(queueEntry.client_id);
      const discoveredFileId = existingEntry?.file_id || (
        await findDriveFileByName(`${queueEntry.client_id}.json`, layout.clientsFolderId)
      )?.id;
      const fileId = await uploadFile(
        `${queueEntry.client_id}.json`,
        layout.clientsFolderId,
        remoteSnapshot,
        discoveredFileId,
      );

      indexByClientId.set(queueEntry.client_id, {
        id: queueEntry.client_id,
        version: remoteSnapshot.version,
        updated_at: remoteSnapshot.updated_at,
        deleted: false,
        file_id: fileId,
      });

      await markClientAsSynced(queueEntry.client_id, remoteSnapshot.updated_at, remoteSnapshot.version);
      await removeQueueEntry(queueEntry.id);
      remoteChanged = true;
    } catch (error) {
      const retryCount = queueEntry.retry_count + 1;
      await markQueueEntryFailed(queueEntry.id, retryCount, getRetryTime(retryCount));
      throw error;
    }
  }

  if (remoteChanged) {
    const updatedAt = nowIsoUtc();
    const updatedIndex: DriveClientsIndex = {
      version: Math.max(1, remoteIndex.version || 1),
      updated_at: updatedAt,
      clients: Array.from(indexByClientId.values()).sort((left, right) => left.id.localeCompare(right.id)),
    };
    const updatedMeta: DriveMeta = {
      version: 1,
      updated_at: updatedAt,
    };

    await saveRemoteIndex(layout.clientsIndexFileId, layout.rootFolderId, updatedIndex);
    await saveRemoteMeta(layout.metaFileId, layout.rootFolderId, updatedMeta);
    await patchSyncMeta({
      remote_index_updated_at: updatedAt,
      remote_meta_updated_at: updatedAt,
      last_sync_at: updatedAt,
      last_sync_error: '',
    });
  }

  return remoteChanged;
}

function shouldPullRemoteClient(
  localClient: { version: number; updated_at: string; sync_status: string } | undefined,
  remoteEntry: DriveClientIndexEntry,
): boolean {
  if (!localClient) {
    return !remoteEntry.deleted;
  }
  if (localClient.sync_status === 'pending_delete') {
    return false;
  }
  if (localClient.sync_status === 'pending') {
    return false;
  }
  if (remoteEntry.deleted) {
    return true;
  }
  if (remoteEntry.version > localClient.version) {
    return true;
  }
  return remoteEntry.version === localClient.version
    && isRemoteTimestampNewer(localClient.updated_at, remoteEntry.updated_at);
}

async function pullChangedClients(index: DriveClientsIndex, clientsFolderId: string): Promise<void> {
  const localClients = await db.clients.toArray();
  const localById = new Map(localClients.map((client) => [client.id, client]));
  const downloadTargets: DriveClientIndexEntry[] = [];

  for (const remoteEntry of index.clients) {
    const localClient = localById.get(remoteEntry.id);

    if (localClient?.sync_status === 'pending') {
      if (remoteEntry.version !== localClient.version || remoteEntry.updated_at !== localClient.updated_at) {
        await enqueueClientUpdate(localClient.id, SYNC_DOMAINS);
      }
      continue;
    }

    if (shouldPullRemoteClient(localClient, remoteEntry)) {
      if (remoteEntry.deleted) {
        await purgeClientRecords(remoteEntry.id);
        continue;
      }
      downloadTargets.push(remoteEntry);
    }
  }

  for (let indexOffset = 0; indexOffset < downloadTargets.length; indexOffset += SYNC_CONFIG.batchSize) {
    const batch = downloadTargets.slice(indexOffset, indexOffset + SYNC_CONFIG.batchSize);
    await Promise.all(batch.map(async (entry) => {
      const fileId = entry.file_id || (
        await findDriveFileByName(`${entry.id}.json`, clientsFolderId)
      )?.id;
      if (!fileId) {
        return;
      }
      const snapshot = await downloadFile<DriveClientSnapshot>(fileId);
      if (!snapshot) {
        return;
      }
      await applyClientSnapshot(normalizeRemoteSnapshot(snapshot));
    }));
  }
}

export async function syncFromCloud(): Promise<boolean> {
  if (!navigator.onLine) {
    return false;
  }

  const layout = await ensureDriveLayout();
  const syncMeta = await readSyncMeta();
  const remoteMeta = await loadRemoteMeta(layout.metaFileId);
  const remoteIndex = await loadRemoteIndex(layout.clientsIndexFileId);

  if (!(await hasPendingQueue()) && !hasRemoteChanges(syncMeta, remoteMeta, remoteIndex)) {
    await patchSyncMeta({
      last_sync_at: nowIsoUtc(),
      last_sync_error: '',
    });
    return false;
  }

  await pullChangedClients(remoteIndex, layout.clientsFolderId);
  await patchSyncMeta({
    remote_meta_updated_at: remoteMeta.updated_at,
    remote_index_updated_at: remoteIndex.updated_at,
    last_sync_at: nowIsoUtc(),
    last_sync_error: '',
  });
  return true;
}

export async function syncToCloud(): Promise<boolean> {
  if (!navigator.onLine) {
    return false;
  }

  try {
    const changed = await processUploadQueue();
    await patchSyncMeta({
      last_sync_at: nowIsoUtc(),
      last_sync_error: '',
    });
    return changed;
  } catch (error) {
    await patchSyncMeta({
      last_sync_error: error instanceof Error ? error.message : 'Sync failed.',
      last_sync_at: nowIsoUtc(),
    });
    throw error;
  }
}

export async function checkForUpdates(): Promise<boolean> {
  if (!navigator.onLine) {
    return false;
  }

  if (await hasPendingQueue()) {
    await syncToCloud();
    return true;
  }

  const layout = await ensureDriveLayout();
  const syncMeta = await readSyncMeta();
  const remoteMeta = await loadRemoteMeta(layout.metaFileId);
  const remoteIndex = await loadRemoteIndex(layout.clientsIndexFileId);

  if (!hasRemoteChanges(syncMeta, remoteMeta, remoteIndex)) {
    await patchSyncMeta({
      last_sync_at: nowIsoUtc(),
      last_sync_error: '',
    });
    return false;
  }

  return syncFromCloud();
}

export function scheduleBackgroundSync(): void {
  if (scheduledSyncId !== null) {
    window.clearTimeout(scheduledSyncId);
  }

  scheduledSyncId = window.setTimeout(() => {
    scheduledSyncId = null;
    void runSyncCycle().catch(() => undefined);
  }, 250);
}

export async function runSyncCycle(): Promise<boolean> {
  if (activeSync) {
    return activeSync;
  }

  activeSync = (async () => {
    try {
      const uploaded = await syncToCloud();
      const downloaded = await syncFromCloud();
      return uploaded || downloaded;
    } finally {
      activeSync = null;
    }
  })();

  return activeSync;
}

export async function getSyncSnapshot(): Promise<{
  pendingCount: number;
  isConnected: boolean;
  lastSyncAt?: string;
  lastError?: string;
}> {
  const syncMeta = await readSyncMeta();
  return {
    pendingCount: await db.syncQueue.count(),
    isConnected: Boolean(syncMeta.root_folder_id),
    lastSyncAt: syncMeta.last_sync_at,
    lastError: syncMeta.last_sync_error,
  };
}
