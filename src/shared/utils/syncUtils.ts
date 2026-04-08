import AsyncStorage from '@react-native-async-storage/async-storage';
import { serverTimestamp, FieldValue } from 'firebase/firestore';

const DEVICE_ID_KEY = '@trainer_cms_device_id';

export async function getDeviceId(): Promise<string> {
  let id = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = Math.random().toString(36).substring(2, 15); // Simple unique ID for device identification
    await AsyncStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export async function getUpdatePayload<T>(data: Partial<T>, currentVersion: number) {
  const deviceId = await getDeviceId();
  return {
    ...data,
    updated_at: serverTimestamp() as unknown as FieldValue,
    updated_by: deviceId,
    version: currentVersion + 1,
    deleted: false,
  };
}

export async function getCreatePayload<T>(data: T) {
  const deviceId = await getDeviceId();
  const now = new Date();
  return {
    ...data,
    created_at: now, // service layer will use serverTimestamp for actual write
    updated_at: serverTimestamp() as unknown as FieldValue,
    updated_by: deviceId,
    version: 1,
    deleted: false,
  };
}
