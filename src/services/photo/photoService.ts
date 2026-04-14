// ─────────────────────────────────────────────────────────────────────────────
// Photo Service — Recoverable progress photo management
// Source of truth: resrc/system_prompt.md §2.8 & §7 (Step 7)
// ─────────────────────────────────────────────────────────────────────────────

import * as FileSystem from 'expo-file-system';
import { getDB } from '../db/database';
import { ProgressPhoto } from '../../types';
import { generateId } from '../../utils/id';
import { nowISO } from '../../utils/date';
import { enqueueClientUpdate } from '../sync/syncQueueService';

const PHOTOS_DIR = `${(FileSystem as any).documentDirectory}clients/`;

/**
 * Ensures the photos directory exists for a specific client.
 */
async function ensureDir(clientId: string) {
  const dir = `${PHOTOS_DIR}${clientId}/photos/`;
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
  return dir;
}

/**
 * Saves a progress photo locally and stores metadata.
 * §Rule: Save file to local storage FIRST, metadata SECOND.
 */
export async function addProgressPhoto(
  clientId: string,
  sourceUri: string,
  date: string,
  type: string = 'front', // 'front', 'side', 'back'
  notes?: string
): Promise<void> {
  const db = getDB();
  const id = generateId();
  const now = nowISO();

  // 1. Move file to permanent local storage
  const clientPhotoDir = await ensureDir(clientId);
  const fileExt = sourceUri.split('.').pop() || 'jpg';
  const localPath = `${clientPhotoDir}${id}.${fileExt}`;
  
  await FileSystem.copyAsync({
    from: sourceUri,
    to: localPath,
  });

  // 2. Transactional Metadata Insert
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO progress_photos (
        id, client_id, date, uri, type, notes, 
        upload_status, drive_file_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, clientId, date, localPath, type, notes || '', 'local', null, now]
    );

    await db.runAsync(
      'UPDATE clients SET version = version + 1, updated_at = ? WHERE id = ?',
      [now, clientId]
    );

    await enqueueClientUpdate(clientId, ['progress_photos']);
  });
}

/**
 * Fetches progress photos for a client.
 */
export async function getPhotos(clientId: string): Promise<ProgressPhoto[]> {
  const db = getDB();
  return await db.getAllAsync<ProgressPhoto>(
    'SELECT * FROM progress_photos WHERE client_id = ? ORDER BY date DESC',
    [clientId]
  );
}

/**
 * Deletes a photo both locally and from metadata.
 */
export async function deletePhoto(photoId: string, clientId: string, localUri: string): Promise<void> {
  const db = getDB();
  const now = nowISO();

  // 1. Delete local file
  try {
    const fileInfo = await FileSystem.getInfoAsync(localUri);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(localUri);
    }
  } catch (err) {
    console.warn('[PhotoService] Failed to delete local file:', err);
  }

  // 2. Clear metadata
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM progress_photos WHERE id = ?', [photoId]);
    await db.runAsync(
      'UPDATE clients SET version = version + 1, updated_at = ? WHERE id = ?',
      [now, clientId]
    );
    await enqueueClientUpdate(clientId, ['progress_photos']);
  });
}
