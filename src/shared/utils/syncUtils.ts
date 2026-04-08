import AsyncStorage from '@react-native-async-storage/async-storage';
import { serverTimestamp, FieldValue } from 'firebase/firestore';
import { sanitizeUpdate } from './sanitizeUtils';

const DEVICE_ID_KEY = '@trainer_cms_device_id';

export async function getDeviceId(): Promise<string> {
  let id = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = Math.random().toString(36).substring(2, 15);
    await AsyncStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

/**
 * Prepares a payload for updating an existing document.
 * Enforces:
 * - Sanitization (no empty strings, nulls, or undefined)
 * - serverTimestamp() for updated_at
 * - Optimistic version increment
 */
export async function getUpdatePayload<T extends object>(data: T, currentVersion: number) {
  const deviceId = await getDeviceId();
  const safeData = sanitizeUpdate(data);

  return {
    ...safeData,
    updated_at: serverTimestamp() as unknown as FieldValue,
    updated_by: deviceId,
    version: currentVersion + 1,
    deleted: false,
  };
}

/**
 * Prepares a payload for creating a new document.
 * Enforces:
 * - Sanitization
 * - serverTimestamp() for both created_at and updated_at
 * - Version 1 initialization
 */
export async function getCreatePayload<T extends object>(data: T) {
  const deviceId = await getDeviceId();
  const safeData = sanitizeUpdate(data);

  return {
    ...safeData,
    created_at: serverTimestamp() as unknown as FieldValue,
    updated_at: serverTimestamp() as unknown as FieldValue,
    updated_by: deviceId,
    version: 1,
    deleted: false,
  };
}
