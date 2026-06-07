import { db } from '../../db/db';
import { SYNC_CONFIG, SYNC_DOMAINS } from '../../constants/sync';
import type {
  Client,
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
import { getAppSettings } from '../calendar/calendarSettingsService';

let activeSync: Promise<boolean> | null = null;
let scheduledSyncId: number | null = null;
let deletedDriveClientListCache: {
  remoteIndexUpdatedAt: string;
  items: DeletedDriveClientSummary[];
} | null = null;

export interface DeletedDriveClientSummary {
  id: string;
  name: string;
  updated_at: string;
  version: number;
  restorable: boolean;
}

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

async function hasPullableRemoteChanges(index: DriveClientsIndex): Promise<boolean> {
  const localClients = await db.clients.toArray();
  const localById = new Map(localClients.map((client) => [client.id, client]));

  for (const remoteEntry of index.clients) {
    const localClient = localById.get(remoteEntry.id);

    if (localClient?.sync_status === 'pending') {
      if (remoteEntry.version !== localClient.version || remoteEntry.updated_at !== localClient.updated_at) {
        return true;
      }
      continue;
    }

    if (shouldPullRemoteClient(localClient, remoteEntry)) {
      return true;
    }
  }

  return false;
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

function getClientDisplayName(client: Client | undefined, fallbackId: string): string {
  const name = client?.name?.trim();
  return name || `Deleted client ${fallbackId.slice(0, 8)}`;
}

async function resolveClientFileId(entry: DriveClientIndexEntry, clientsFolderId: string): Promise<string | undefined> {
  return entry.file_id || (
    await findDriveFileByName(`${entry.id}.json`, clientsFolderId)
  )?.id;
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
        const deletedSnapshot = localClient ? await buildClientSnapshot(queueEntry.client_id) : null;
        const existingEntry = indexByClientId.get(queueEntry.client_id);
        const resolvedFileId = await resolveClientFileId(
          existingEntry || {
            id: queueEntry.client_id,
            version: localClient?.version || 1,
            updated_at: localClient?.updated_at || now,
            deleted: false,
          },
          layout.clientsFolderId,
        );
        const retainedFileId = deletedSnapshot
          ? await uploadFile(
            `${queueEntry.client_id}.json`,
            layout.clientsFolderId,
            {
              ...deletedSnapshot,
              deleted: true,
              client: {
                ...deletedSnapshot.client,
                sync_status: 'pending_delete',
              },
            },
            resolvedFileId,
          )
          : resolvedFileId;

        const deletedEntry: DriveClientIndexEntry = {
          id: queueEntry.client_id,
          version: localClient?.version || existingEntry?.version || 1,
          updated_at: localClient?.updated_at || now,
          deleted: true,
          file_id: retainedFileId,
          display_name: localClient?.name || existingEntry?.display_name,
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
        display_name: remoteSnapshot.client.name,
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

export async function listDeletedDriveClients(forceRefresh = false): Promise<DeletedDriveClientSummary[]> {
  if (!navigator.onLine) {
    return [];
  }

  const layout = await ensureDriveLayout();
  const remoteIndex = await loadRemoteIndex(layout.clientsIndexFileId);
  if (
    !forceRefresh
    && deletedDriveClientListCache
    && deletedDriveClientListCache.remoteIndexUpdatedAt === remoteIndex.updated_at
  ) {
    return deletedDriveClientListCache.items;
  }

  const deletedEntries = remoteIndex.clients.filter((entry) => entry.deleted);
  const cachedById = new Map(deletedDriveClientListCache?.items.map((item) => [item.id, item]) || []);

  const summaries = await Promise.all(deletedEntries.map(async (entry): Promise<DeletedDriveClientSummary> => {
    const cached = cachedById.get(entry.id);
    if (!forceRefresh && cached?.updated_at === entry.updated_at && cached.version === entry.version) {
      return cached;
    }

    const fileId = await resolveClientFileId(entry, layout.clientsFolderId);
    if (!fileId) {
      return {
        id: entry.id,
        name: entry.display_name || getClientDisplayName(undefined, entry.id),
        updated_at: entry.updated_at,
        version: entry.version,
        restorable: false,
      };
    }

    if (entry.display_name) {
      return {
        id: entry.id,
        name: entry.display_name,
        updated_at: entry.updated_at,
        version: entry.version,
        restorable: true,
      };
    }

    const snapshot = await downloadFile<DriveClientSnapshot>(fileId);
    return {
      id: entry.id,
      name: getClientDisplayName(snapshot?.client, entry.id),
      updated_at: entry.updated_at,
      version: entry.version,
      restorable: Boolean(snapshot?.client),
    };
  }));

  const sortedSummaries = summaries.sort((left, right) => right.updated_at.localeCompare(left.updated_at));
  deletedDriveClientListCache = {
    remoteIndexUpdatedAt: remoteIndex.updated_at,
    items: sortedSummaries,
  };
  return sortedSummaries;
}

export async function restoreDeletedDriveClient(clientId: string): Promise<void> {
  if (!navigator.onLine) {
    throw new Error('Connect to the internet before restoring a Drive backup.');
  }

  const layout = await ensureDriveLayout();
  const remoteIndex = await loadRemoteIndex(layout.clientsIndexFileId);
  const indexByClientId = new Map(remoteIndex.clients.map((entry) => [entry.id, entry]));
  const remoteEntry = indexByClientId.get(clientId);

  if (!remoteEntry?.deleted) {
    throw new Error('This client is not marked as deleted in Drive.');
  }

  const fileId = await resolveClientFileId(remoteEntry, layout.clientsFolderId);
  if (!fileId) {
    throw new Error('This deleted client has no Drive backup file to restore.');
  }

  const deletedSnapshot = await downloadFile<DriveClientSnapshot>(fileId);
  if (!deletedSnapshot?.client) {
    throw new Error('This deleted client backup is empty or unreadable.');
  }

  const restoredAt = nowIsoUtc();
  const restoredVersion = Math.max(deletedSnapshot.version || 1, remoteEntry.version || 1) + 1;
  const restoredSnapshot: DriveClientSnapshot = normalizeRemoteSnapshot({
    ...deletedSnapshot,
    version: restoredVersion,
    updated_at: restoredAt,
    deleted: false,
    client: {
      ...deletedSnapshot.client,
      sync_status: 'synced',
      version: restoredVersion,
      updated_at: restoredAt,
    },
  });

  const restoredFileId = await uploadFile(`${clientId}.json`, layout.clientsFolderId, restoredSnapshot, fileId);
  const updatedAt = nowIsoUtc();
  indexByClientId.set(clientId, {
    id: clientId,
    version: restoredVersion,
    updated_at: restoredAt,
    deleted: false,
    file_id: restoredFileId,
    display_name: restoredSnapshot.client.name,
  });

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
  await applyClientSnapshot(restoredSnapshot);
  await db.syncQueue.where('client_id').equals(clientId).delete();
  if (deletedDriveClientListCache) {
    deletedDriveClientListCache = {
      remoteIndexUpdatedAt: updatedAt,
      items: deletedDriveClientListCache.items.filter((item) => item.id !== clientId),
    };
  }
  await patchSyncMeta({
    remote_index_updated_at: updatedAt,
    remote_meta_updated_at: updatedAt,
    last_sync_at: updatedAt,
    last_sync_error: '',
  });
}

export async function syncFromCloud(): Promise<boolean> {
  if (!navigator.onLine) {
    return false;
  }

  const layout = await ensureDriveLayout();
  const syncMeta = await readSyncMeta();
  const remoteMeta = await loadRemoteMeta(layout.metaFileId);
  const remoteIndex = await loadRemoteIndex(layout.clientsIndexFileId);
  const hasRemoteUpdates = hasRemoteChanges(syncMeta, remoteMeta, remoteIndex)
    || await hasPullableRemoteChanges(remoteIndex);

  if (!(await hasPendingQueue()) && !hasRemoteUpdates) {
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
  const hasRemoteUpdates = hasRemoteChanges(syncMeta, remoteMeta, remoteIndex)
    || await hasPullableRemoteChanges(remoteIndex);

  if (!hasRemoteUpdates) {
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
      const settings = await getAppSettings();
      if (!settings.google_drive_sync_enabled) {
        return false;
      }

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
  enabled: boolean;
  lastSyncAt?: string;
  lastError?: string;
}> {
  const syncMeta = await readSyncMeta();
  const settings = await getAppSettings();
  return {
    pendingCount: await db.syncQueue.count(),
    isConnected: Boolean(syncMeta.root_folder_id),
    enabled: settings.google_drive_sync_enabled,
    lastSyncAt: syncMeta.last_sync_at,
    lastError: syncMeta.last_sync_error,
  };
}
