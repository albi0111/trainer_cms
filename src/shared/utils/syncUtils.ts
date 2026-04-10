import AsyncStorage from '@react-native-async-storage/async-storage';
import { serverTimestamp, FieldValue } from 'firebase/firestore';
import { sanitizeUpdate } from './sanitizeUtils';

const DEVICE_ID_KEY = '@trainer_cms_device_id';

let cachedDeviceId: string | null = null;

export async function getDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId;
  
  let id = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = Math.random().toString(36).substring(2, 15);
    await AsyncStorage.setItem(DEVICE_ID_KEY, id);
  }
  cachedDeviceId = id;
  return id;
}

/**
 * Internal helper to prepare common audit fields.
 */
async function _prepareBasePayload<T extends object>(data: T) {
  const deviceId = await getDeviceId();
  const safeData = sanitizeUpdate(data);

  return {
    deviceId,
    safeData,
    timestamp: serverTimestamp() as unknown as FieldValue,
  };
}

/**
 * Prepares a payload for updating an existing document.
 * Enforces:
 * - Sanitization (no empty strings, nulls, or undefined)
 * - serverTimestamp() for updated_at
 * - Optimistic version increment
 * - Respects existing 'deleted' flag if provided (crucial for soft-delete)
 */
export async function getUpdatePayload<T extends object>(data: T, currentVersion: number) {
  const { deviceId, safeData, timestamp } = await _prepareBasePayload(data);

  return {
    ...safeData,
    updated_at: timestamp,
    updated_by: deviceId,
    version: currentVersion + 1,
    // Default to false only if not already specified in payload
    deleted: (safeData as any).deleted ?? false,
  };
}

/**
 * Prepares a payload for creating a new document.
 * Enforces:
 * - Sanitization
 * - serverTimestamp() for both created_at and updated_at
 * - created_at_local for immediate UI sorting
 * - Version 1 initialization
 */
export async function getCreatePayload<T extends object>(data: T) {
  const { deviceId, safeData, timestamp } = await _prepareBasePayload(data);

  return {
    ...safeData,
    created_at: timestamp,
    created_at_local: new Date(), // Local fallback for immediate sorting
    updated_at: timestamp,
    updated_by: deviceId,
    version: 1,
    deleted: false,
  };
}

/**
 * Computes a shallow delta between original and updated objects.
 * Required for delta-only Firestore updates to prevent unintentional overwrites.
 */
export function getChangedFields<T extends Record<string, any>>(
  original: T,
  updated: Partial<T>
): Partial<T> {
  const diff: Partial<T> = {};
  
  Object.keys(updated).forEach((key) => {
    const k = key as keyof T;
    // Only include if value actually changed
    if (updated[k] !== original[k]) {
      diff[k] = updated[k];
    }
  });

  return diff;
}

