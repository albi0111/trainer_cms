import { db, withDatabaseRecovery } from '../../db/db';
import type { ProgressPhoto } from '../../types';
import { generateId } from '../../utils/id';
import { nowIsoUtc } from '../shared/date';
import {
  deleteDriveFile,
  downloadBlobFile,
  downloadFile,
  findDriveFileByName,
  getDriveFile,
  getOrCreateMediaFolder,
  uploadBlobFile,
  uploadFile,
} from '../sync/driveService';

const TARGET_IMAGE_BYTES = 220 * 1024;
const INITIAL_LONG_EDGE = 1280;
const MIN_LONG_EDGE = 512;
const MIN_JPEG_QUALITY = 0.42;
const QUALITY_STEP = 0.08;
const DRIVE_INDEX_FILE = 'progress_photos_index.json';

export interface ProgressPhotoDriveKey {
  id: string;
  client_id: string;
  date: string;
  type?: ProgressPhoto['type'];
  note?: string;
  file_size_bytes?: number;
  drive_file_id: string;
  file_name: string;
  mime_type: 'image/jpeg';
  created_at: string;
}

export interface ProgressPhotoDraft {
  id: string;
  uri: string;
  file_size_bytes: number;
}

interface DriveProgressPhotoIndex {
  version: 1;
  updated_at: string;
  photos: ProgressPhotoDriveKey[];
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not read this image.'));
    };
    image.src = objectUrl;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Could not compress this image.'));
        return;
      }
      resolve(blob);
    }, 'image/jpeg', quality);
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not store this image.'));
    reader.readAsDataURL(blob);
  });
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}

function getCanvasSize(width: number, height: number, longEdge: number): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= longEdge) {
    return { width, height };
  }

  const scale = longEdge / longest;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

async function compressImage(file: File): Promise<{ dataUrl: string; sizeBytes: number }> {
  const image = await loadImageFromFile(file);
  return compressImageElement(image);
}

function loadImageFromUri(uri: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not read this image.'));
    image.src = uri;
  });
}

async function compressStoredImage(uri: string): Promise<{ dataUrl: string; sizeBytes: number }> {
  const image = await loadImageFromUri(uri);
  return compressImageElement(image);
}

async function compressImageElement(image: HTMLImageElement): Promise<{ dataUrl: string; sizeBytes: number }> {
  let longEdge = INITIAL_LONG_EDGE;
  let bestBlob: Blob | null = null;

  while (longEdge >= MIN_LONG_EDGE) {
    const { width, height } = getCanvasSize(image.naturalWidth, image.naturalHeight, longEdge);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Image compression is not available on this device.');
    }

    context.drawImage(image, 0, 0, width, height);

    for (let quality = 0.82; quality >= MIN_JPEG_QUALITY; quality -= QUALITY_STEP) {
      const blob = await canvasToBlob(canvas, quality);
      bestBlob = blob;
      if (blob.size <= TARGET_IMAGE_BYTES) {
        return {
          dataUrl: await blobToDataUrl(blob),
          sizeBytes: blob.size,
        };
      }
    }

    longEdge = Math.floor(longEdge * 0.82);
  }

  if (!bestBlob) {
    throw new Error('Image compression failed.');
  }

  return {
    dataUrl: await blobToDataUrl(bestBlob),
    sizeBytes: bestBlob.size,
  };
}

export function getProgressPhotoUploadLimit(): number {
  return Number.POSITIVE_INFINITY;
}

export async function getProgressPhotos(clientId: string): Promise<ProgressPhoto[]> {
  return withDatabaseRecovery(async () => {
    const photos = await db.progressPhotos
      .where('client_id')
      .equals(clientId)
      .sortBy('created_at');

    return photos.reverse();
  });
}

export async function saveProgressPhotos(
  clientId: string,
  files: File[],
  note: string,
  date = nowIsoUtc().slice(0, 10),
): Promise<ProgressPhoto[]> {
  const imageFiles = files
    .filter((file) => file.type.startsWith('image/'));

  if (imageFiles.length === 0) {
    return [];
  }

  const now = nowIsoUtc();
  const photos: ProgressPhoto[] = [];

  for (const file of imageFiles) {
    const compressed = await compressImage(file);
    photos.push({
      id: generateId(),
      client_id: clientId,
      uri: compressed.dataUrl,
      date,
      note: note.trim(),
      file_size_bytes: compressed.sizeBytes,
      upload_status: 'local',
      created_at: now,
    });
  }

  await withDatabaseRecovery(() => db.progressPhotos.bulkPut(photos));
  return photos;
}

export async function compressProgressPhotoFiles(files: File[]): Promise<ProgressPhotoDraft[]> {
  const imageFiles = files
    .filter((file) => file.type.startsWith('image/'));

  const drafts: ProgressPhotoDraft[] = [];
  for (const file of imageFiles) {
    const compressed = await compressImage(file);
    drafts.push({
      id: generateId(),
      uri: compressed.dataUrl,
      file_size_bytes: compressed.sizeBytes,
    });
  }

  return drafts;
}

export async function saveProgressPhotoDrafts(
  clientId: string,
  drafts: ProgressPhotoDraft[],
  note: string,
  date = nowIsoUtc().slice(0, 10),
): Promise<ProgressPhoto[]> {
  const now = nowIsoUtc();
  const photos: ProgressPhoto[] = drafts.map((draft) => ({
    id: draft.id,
    client_id: clientId,
    uri: draft.uri,
    date,
    note: note.trim(),
    file_size_bytes: draft.file_size_bytes,
    upload_status: 'local',
    created_at: now,
  }));

  if (photos.length === 0) {
    return [];
  }

  await withDatabaseRecovery(() => db.progressPhotos.bulkPut(photos));
  return photos;
}

export async function updateProgressPhotoGroup(
  clientId: string,
  previousDate: string,
  date: string,
  note: string,
  retainedPhotoIds: string[],
  newDrafts: ProgressPhotoDraft[],
): Promise<{
  deletedPhotoIds: string[];
  photos: ProgressPhoto[];
}> {
  const now = nowIsoUtc();
  const retainedIdSet = new Set(retainedPhotoIds);
  const existingPhotos = await db.progressPhotos
    .where('[client_id+date]')
    .equals([clientId, previousDate])
    .toArray();
  const deletedPhotos = existingPhotos.filter((photo) => !retainedIdSet.has(photo.id));
  const retainedPhotos = existingPhotos
    .filter((photo) => retainedIdSet.has(photo.id))
    .map((photo): ProgressPhoto => ({
      ...photo,
      date,
      note: note.trim(),
      upload_status: 'local',
    }));
  const addedPhotos: ProgressPhoto[] = newDrafts.map((draft) => ({
    id: draft.id,
    client_id: clientId,
    uri: draft.uri,
    date,
    note: note.trim(),
    file_size_bytes: draft.file_size_bytes,
    upload_status: 'local',
    created_at: now,
  }));

  await withDatabaseRecovery(() => db.transaction('rw', db.progressPhotos, async () => {
    if (deletedPhotos.length > 0) {
      await db.progressPhotos.bulkDelete(deletedPhotos.map((photo) => photo.id));
    }
    const nextPhotos = [...retainedPhotos, ...addedPhotos];
    if (nextPhotos.length > 0) {
      await db.progressPhotos.bulkPut(nextPhotos);
    }
  }));

  return {
    deletedPhotoIds: deletedPhotos.map((photo) => photo.id),
    photos: await getProgressPhotos(clientId),
  };
}

function createEmptyDriveIndex(): DriveProgressPhotoIndex {
  return {
    version: 1,
    updated_at: '1970-01-01T00:00:00Z',
    photos: [],
  };
}

function sortDriveKeys(keys: ProgressPhotoDriveKey[]): ProgressPhotoDriveKey[] {
  return [...keys].sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date);
    if (dateCompare !== 0) {
      return dateCompare;
    }

    return b.created_at.localeCompare(a.created_at);
  });
}

function toDriveRecord(photo: ProgressPhoto): ProgressPhotoDriveKey | null {
  if (!photo.drive_file_id) {
    return null;
  }

  return {
    id: photo.id,
    client_id: photo.client_id,
    date: photo.date,
    type: photo.type,
    note: photo.note,
    file_size_bytes: photo.file_size_bytes,
    drive_file_id: photo.drive_file_id,
    file_name: `${photo.id}.jpg`,
    mime_type: 'image/jpeg',
    created_at: photo.created_at,
  };
}

function upsertDriveRecord(
  index: DriveProgressPhotoIndex,
  record: ProgressPhotoDriveKey,
): void {
  const existingIndex = index.photos.findIndex((photo) => photo.id === record.id);
  if (existingIndex >= 0) {
    index.photos[existingIndex] = record;
    return;
  }

  index.photos.push(record);
}

async function loadDrivePhotoIndex(folderId: string): Promise<{
  fileId?: string;
  index: DriveProgressPhotoIndex;
}> {
  const indexFile = await findDriveFileByName(DRIVE_INDEX_FILE, folderId);
  if (!indexFile) {
    return { index: createEmptyDriveIndex() };
  }

  const index = await downloadFile<DriveProgressPhotoIndex>(indexFile.id);
  return {
    fileId: indexFile.id,
    index: index || createEmptyDriveIndex(),
  };
}

export async function uploadPendingProgressPhotos(clientId: string): Promise<ProgressPhotoDriveKey[]> {
  const folderId = await getOrCreateMediaFolder(clientId);
  const { fileId: indexFileId, index } = await loadDrivePhotoIndex(folderId);
  const localPhotos = await getProgressPhotos(clientId);
  let indexChanged = false;

  for (const photo of localPhotos) {
    if (photo.upload_status === 'uploaded' && photo.drive_file_id) {
      if (!index.photos.some((record) => record.id === photo.id)) {
        // Photo is marked uploaded locally but missing from the Drive index.
        // Verify the Drive file still exists before re-indexing — it may have
        // been deleted by another device via removeProgressPhotoDriveKeys.
        try {
          const driveFile = await getDriveFile(photo.drive_file_id);
          if (driveFile) {
            // File still exists on Drive; safe to re-add the index entry.
            const record = toDriveRecord(photo);
            if (record) {
              upsertDriveRecord(index, record);
              indexChanged = true;
            }
          } else {
            // File was deleted from Drive — mark the local row as stale so it
            // falls through to re-upload on the next iteration rather than
            // resurrecting a broken placeholder.
            await withDatabaseRecovery(() =>
              db.progressPhotos.update(photo.id, {
                upload_status: 'local',
                drive_file_id: undefined,
              }),
            );
            continue; // skip the early-continue below so it gets re-uploaded
          }
        } catch (error) {
          console.warn('[ProgressPhotoService] Drive file verification failed:', error);
          // On network error, leave the local row as-is and skip re-indexing
          // to avoid resurrecting a potentially deleted entry.
        }
      }
      continue;
    }

    try {
      const compressed = await compressStoredImage(photo.uri);
      const photoForUpload: ProgressPhoto = {
        ...photo,
        uri: compressed.dataUrl,
        file_size_bytes: compressed.sizeBytes,
      };
      const blob = await dataUrlToBlob(compressed.dataUrl);
      const driveFileId = await uploadBlobFile(
        `${photo.id}.jpg`,
        folderId,
        blob,
        'image/jpeg',
        photo.drive_file_id,
      );
      const uploadedPhoto: ProgressPhoto = {
        ...photoForUpload,
        drive_file_id: driveFileId,
        file_size_bytes: blob.size,
        upload_status: 'uploaded',
      };
      await withDatabaseRecovery(() => db.progressPhotos.put(uploadedPhoto));
      const record = toDriveRecord(uploadedPhoto);
      if (record) {
        upsertDriveRecord(index, record);
        indexChanged = true;
      }
    } catch (error) {
      console.warn('[ProgressPhotoService] Drive upload failed:', error);
      await withDatabaseRecovery(() => db.progressPhotos.update(photo.id, { upload_status: 'failed' }));
    }
  }

  if (indexChanged) {
    const latest = await loadDrivePhotoIndex(folderId);
    const mergedIndex = latest.index;
    index.photos.forEach((record) => upsertDriveRecord(mergedIndex, record));
    mergedIndex.updated_at = nowIsoUtc();
    await uploadFile(DRIVE_INDEX_FILE, folderId, mergedIndex, latest.fileId || indexFileId);
    return sortDriveKeys(mergedIndex.photos.filter((record) => record.client_id === clientId));
  }

  return sortDriveKeys(index.photos.filter((record) => record.client_id === clientId));
}

export async function getProgressPhotoDriveKeys(clientId: string): Promise<ProgressPhotoDriveKey[]> {
  const folderId = await getOrCreateMediaFolder(clientId);
  const { index } = await loadDrivePhotoIndex(folderId);
  return sortDriveKeys(index.photos.filter((record) => record.client_id === clientId));
}

export async function removeProgressPhotoDriveKeys(clientId: string, photoIds: string[]): Promise<ProgressPhotoDriveKey[]> {
  if (photoIds.length === 0) {
    return getProgressPhotoDriveKeys(clientId);
  }

  const folderId = await getOrCreateMediaFolder(clientId);
  const { fileId, index } = await loadDrivePhotoIndex(folderId);
  const deleteIdSet = new Set(photoIds);
  const removedRecords = index.photos.filter((record) => record.client_id === clientId && deleteIdSet.has(record.id));
  const nextIndex: DriveProgressPhotoIndex = {
    ...index,
    updated_at: nowIsoUtc(),
    photos: index.photos.filter((record) => !(record.client_id === clientId && deleteIdSet.has(record.id))),
  };

  await Promise.all(removedRecords.map((record) => deleteDriveFile(record.drive_file_id).catch((error) => {
    console.warn('[ProgressPhotoService] Drive image delete skipped:', error);
  })));

  if (fileId || nextIndex.photos.length > 0) {
    await uploadFile(DRIVE_INDEX_FILE, folderId, nextIndex, fileId);
  }

  return sortDriveKeys(nextIndex.photos.filter((record) => record.client_id === clientId));
}

export async function fetchProgressPhotoFromDrive(record: ProgressPhotoDriveKey): Promise<ProgressPhoto | null> {
  const existing = await db.progressPhotos.get(record.id);
  if (existing?.uri) {
    return existing;
  }

  const blob = await downloadBlobFile(record.drive_file_id);
  if (!blob) {
    return null;
  }

  const downloadedPhoto: ProgressPhoto = {
    id: record.id,
    client_id: record.client_id,
    uri: await blobToDataUrl(blob),
    date: record.date,
    type: record.type,
    note: record.note,
    file_size_bytes: record.file_size_bytes || blob.size,
    drive_file_id: record.drive_file_id,
    upload_status: 'uploaded',
    created_at: record.created_at,
  };
  await withDatabaseRecovery(() => db.progressPhotos.put(downloadedPhoto));
  return downloadedPhoto;
}

export async function syncProgressPhotosOnDemand(clientId: string): Promise<ProgressPhoto[]> {
  const keys = await uploadPendingProgressPhotos(clientId);
  for (const key of keys) {
    await fetchProgressPhotoFromDrive(key);
  }

  return getProgressPhotos(clientId);
}
