import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../db/db';
import {
  cancelSessionNotificationJobs,
  flushNotificationMutationQueue,
} from './pushNotificationService';

const functionState = vi.hoisted(() => ({
  calls: [] as Array<{ name: string; data: Record<string, unknown> }>,
  shouldFail: true,
}));

vi.mock('firebase/functions', () => ({
  httpsCallable: (_functions: unknown, name: string) => async (data: Record<string, unknown>) => {
    functionState.calls.push({ name, data });
    if (functionState.shouldFail) {
      throw new Error('network unavailable');
    }
    return { data: { ok: true } };
  },
}));

vi.mock('../firebase/firebaseApp', () => ({
  getFirebaseFunctionsInstance: vi.fn(() => ({})),
  getFirebaseMessagingInstance: vi.fn(),
  getFirebaseVapidKey: vi.fn(() => 'test-vapid-key'),
}));

vi.mock('../sync/googleAuth', () => ({
  getGoogleAccountIdentity: vi.fn(async () => ({
    google_account_id: 'account_A',
    google_email: 'a@example.com',
  })),
  getStoredGoogleAccountIdentity: vi.fn(() => ({
    google_account_id: 'account_A',
    google_email: 'a@example.com',
  })),
  getToken: vi.fn(() => 'google-access-token'),
}));

vi.mock('./notificationPreferences', () => ({
  arePushNotificationsEnabled: vi.fn(() => true),
  setPushNotificationsEnabled: vi.fn(),
}));

beforeEach(async () => {
  functionState.calls = [];
  functionState.shouldFail = true;
  db.close();
  await db.delete();
  await db.open();
});

describe('durable notification mutation queue', () => {
  it('keeps failed cancellation mutations and retries them successfully later', async () => {
    await cancelSessionNotificationJobs('session_1');

    let entries = await db.notification_mutation_queue.toArray();
    expect(entries).toHaveLength(1);
    expect(entries[0]?.type).toBe('cancel_jobs');
    expect(entries[0]?.status).toBe('failed');
    expect(entries[0]?.attempt_count).toBe(1);
    expect(entries[0]?.last_error).toBe('network unavailable');
    expect(entries[0]?.next_retry_at).toEqual(expect.any(String));
    expect(functionState.calls).toHaveLength(1);
    expect(functionState.calls[0]?.name).toBe('cancelNotificationJobs');
    expect(functionState.calls[0]?.data).toMatchObject({
      google_account_id: 'account_A',
      entity_type: 'session',
      entity_id: 'session_1',
    });

    functionState.shouldFail = false;
    await db.notification_mutation_queue.update(entries[0]!.id, { next_retry_at: null });
    await flushNotificationMutationQueue();

    entries = await db.notification_mutation_queue.toArray();
    expect(entries[0]?.status).toBe('succeeded');
    expect(entries[0]?.next_retry_at).toBeNull();
    expect(functionState.calls).toHaveLength(2);
    expect(functionState.calls[1]?.name).toBe('cancelNotificationJobs');
  });

  it('coalesces newer mutations for the same account and entity', async () => {
    await cancelSessionNotificationJobs('session_1');
    await db.notification_mutation_queue.update((await db.notification_mutation_queue.toArray())[0]!.id, {
      next_retry_at: null,
    });
    await cancelSessionNotificationJobs('session_1');

    const entries = await db.notification_mutation_queue.toArray();
    expect(entries).toHaveLength(1);
    expect(entries[0]?.google_account_id).toBe('account_A');
    expect(entries[0]?.entity_type).toBe('session');
    expect(entries[0]?.entity_id).toBe('session_1');
    expect(entries[0]?.status).toBe('failed');
    expect(entries[0]?.attempt_count).toBe(2);
  });
});
