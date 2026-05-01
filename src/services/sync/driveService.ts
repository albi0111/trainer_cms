import { db } from '../../db/db';
import { DRIVE_FILE_NAMES, SYNC_CONFIG } from '../../constants/sync';
import type { DriveClientsIndex, DriveMeta, LocalSyncMeta } from '../../types';
import { getToken } from './googleAuth';

const DRIVE_API = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3/files';
export const DRIVE_FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime?: string;
  modifiedTime?: string;
}

export interface DriveLayout {
  rootFolderId: string;
  clientsFolderId: string;
  mediaFolderId: string;
  metaFileId: string;
  clientsIndexFileId: string;
}

async function getAuthHeaders(): Promise<HeadersInit> {
  const token = getToken();
  if (!token) {
    throw new Error('Google Drive is not connected.');
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

async function getSyncMeta(): Promise<LocalSyncMeta> {
  const meta = await db.syncMeta.get('default');
  if (meta) {
    return meta;
  }
  const seed: LocalSyncMeta = { id: 'default' };
  await db.syncMeta.put(seed);
  return seed;
}

async function patchSyncMeta(patch: Partial<LocalSyncMeta>): Promise<void> {
  const meta = await getSyncMeta();
  await db.syncMeta.put({
    ...meta,
    ...patch,
    id: 'default',
  });
}

function escapeDriveQuery(value: string): string {
  return value.replace(/'/g, "\\'");
}

export async function findDriveFileByName(name: string, parentId?: string, mimeType?: string): Promise<DriveFile | null> {
  const files = await listDriveFilesByName(name, parentId, mimeType);
  return files[0] || null;
}

async function listDriveFilesByName(name: string, parentId?: string, mimeType?: string): Promise<DriveFile[]> {
  const queryParts = [`name = '${escapeDriveQuery(name)}'`, 'trashed = false'];
  if (parentId) {
    queryParts.push(`'${parentId}' in parents`);
  }
  if (mimeType) {
    queryParts.push(`mimeType = '${mimeType}'`);
  }

  const response = await fetch(
    `${DRIVE_API}?q=${encodeURIComponent(queryParts.join(' and '))}&fields=files(id,name,mimeType,createdTime,modifiedTime)&pageSize=20&orderBy=modifiedTime desc,createdTime desc`,
    { headers: await getAuthHeaders() },
  );
  if (!response.ok) {
    throw new Error(`Drive lookup failed: ${response.status}`);
  }

  const data = await response.json() as { files?: DriveFile[] };
  return data.files || [];
}

async function getDriveFile(fileId: string): Promise<DriveFile | null> {
  const response = await fetch(`${DRIVE_API}/${fileId}?fields=id,name,mimeType,createdTime,modifiedTime`, {
    headers: await getAuthHeaders(),
  });

  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Drive file fetch failed: ${response.status}`);
  }

  return response.json() as Promise<DriveFile>;
}

async function createFolder(name: string, parentId?: string): Promise<string> {
  const body: Record<string, unknown> = {
    name,
    mimeType: DRIVE_FOLDER_MIME_TYPE,
  };
  if (parentId) {
    body.parents = [parentId];
  }

  const response = await fetch(DRIVE_API, {
    method: 'POST',
    headers: {
      ...(await getAuthHeaders()),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Drive folder creation failed: ${response.status}`);
  }

  const data = await response.json() as { id: string };
  return data.id;
}

export async function listFiles(parentId: string): Promise<DriveFile[]> {
  const response = await fetch(
    `${DRIVE_API}?q=${encodeURIComponent(`'${parentId}' in parents and trashed = false`)}&fields=files(id,name,mimeType)`,
    { headers: await getAuthHeaders() },
  );
  if (!response.ok) {
    throw new Error(`Drive list failed: ${response.status}`);
  }
  const data = await response.json() as { files?: DriveFile[] };
  return data.files || [];
}

export async function downloadFile<T>(fileId: string): Promise<T | null> {
  const response = await fetch(`${DRIVE_API}/${fileId}?alt=media`, {
    headers: await getAuthHeaders(),
  });

  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Drive download failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function uploadFile<T>(
  name: string,
  parentId: string,
  content: T,
  fileId?: string,
): Promise<string> {
  const headers = await getAuthHeaders();
  const bodyBlob = new Blob([JSON.stringify(content)], { type: 'application/json' });

  if (fileId) {
    const response = await fetch(`${DRIVE_UPLOAD_API}/${fileId}?uploadType=media`, {
      method: 'PATCH',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: bodyBlob,
    });

    if (!response.ok) {
      throw new Error(`Drive file update failed: ${response.status}`);
    }

    return fileId;
  }

  const metadata = new Blob([JSON.stringify({
    name,
    parents: [parentId],
    mimeType: 'application/json',
  })], { type: 'application/json' });
  const form = new FormData();
  form.append('metadata', metadata);
  form.append('file', bodyBlob, name);

  const response = await fetch(`${DRIVE_UPLOAD_API}?uploadType=multipart`, {
    method: 'POST',
    headers,
    body: form,
  });

  if (!response.ok) {
    throw new Error(`Drive file upload failed: ${response.status}`);
  }

  const data = await response.json() as { id: string };
  return data.id;
}

export async function deleteDriveFile(fileId: string): Promise<void> {
  const response = await fetch(`${DRIVE_API}/${fileId}`, {
    method: 'DELETE',
    headers: await getAuthHeaders(),
  });
  if (!response.ok && response.status !== 404) {
    throw new Error(`Drive delete failed: ${response.status}`);
  }
}

async function ensureFile<T>(name: string, parentId: string, seed: T, existingId?: string): Promise<string> {
  const existingByName = (await listDriveFilesByName(name, parentId))
    .find((file) => file.mimeType !== DRIVE_FOLDER_MIME_TYPE);
  if (existingByName) {
    return existingByName.id;
  }

  if (existingId) {
    const existingById = await getDriveFile(existingId);
    if (existingById && existingById.mimeType !== DRIVE_FOLDER_MIME_TYPE) {
      return existingId;
    }
  }

  return uploadFile(name, parentId, seed);
}

async function ensureFolder(
  name: string,
  metaKey: 'root_folder_id' | 'clients_folder_id' | 'media_folder_id',
  parentId?: string,
  existingId?: string,
): Promise<string> {
  if (existingId) {
    const existingById = await getDriveFile(existingId);
    if (existingById?.mimeType === DRIVE_FOLDER_MIME_TYPE) {
      await patchSyncMeta({ [metaKey]: existingById.id });
      return existingById.id;
    }
  }

  const existing = await findDriveFileByName(name, parentId, DRIVE_FOLDER_MIME_TYPE);
  const folderId = existing?.id || await createFolder(name, parentId);
  await patchSyncMeta({ [metaKey]: folderId });
  return folderId;
}

async function ensureTrackedFile<T>(
  name: string,
  parentId: string,
  seed: T,
  metaKey: 'meta_file_id' | 'clients_index_file_id',
  existingId?: string,
): Promise<string> {
  const fileId = await ensureFile(name, parentId, seed, existingId);
  await patchSyncMeta({ [metaKey]: fileId });
  return fileId;
}

export async function ensureDriveLayout(): Promise<DriveLayout> {
  const syncMeta = await getSyncMeta();

  const rootFolderId = await ensureFolder(
    SYNC_CONFIG.clientRootFolder,
    'root_folder_id',
    undefined,
    syncMeta.root_folder_id,
  );
  const clientsFolderId = await ensureFolder(
    SYNC_CONFIG.clientsFolder,
    'clients_folder_id',
    rootFolderId,
    syncMeta.clients_folder_id,
  );
  const mediaFolderId = await ensureFolder(
    SYNC_CONFIG.mediaFolder,
    'media_folder_id',
    rootFolderId,
    syncMeta.media_folder_id,
  );

  const metaFileId = await ensureTrackedFile<DriveMeta>(
    DRIVE_FILE_NAMES.meta,
    rootFolderId,
    { version: 1, updated_at: '1970-01-01T00:00:00Z' },
    'meta_file_id',
    syncMeta.meta_file_id,
  );
  const clientsIndexFileId = await ensureTrackedFile<DriveClientsIndex>(
    DRIVE_FILE_NAMES.clientsIndex,
    rootFolderId,
    { version: 1, updated_at: '1970-01-01T00:00:00Z', clients: [] },
    'clients_index_file_id',
    syncMeta.clients_index_file_id,
  );

  return {
    rootFolderId,
    clientsFolderId,
    mediaFolderId,
    metaFileId,
    clientsIndexFileId,
  };
}

export async function getOrCreateMediaFolder(clientId: string): Promise<string> {
  const layout = await ensureDriveLayout();
  const existing = await findDriveFileByName(clientId, layout.mediaFolderId, DRIVE_FOLDER_MIME_TYPE);
  return existing?.id || createFolder(clientId, layout.mediaFolderId);
}
