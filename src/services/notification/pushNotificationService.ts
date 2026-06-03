import { httpsCallable } from 'firebase/functions';
import { getToken as getMessagingToken } from 'firebase/messaging';
import Dexie, { type Table } from 'dexie';
import { db } from '../../db/db';
import type { Client, NotificationMutationQueueEntry, NotificationMutationType, Session } from '../../types';
import { generateId } from '../../utils/id';
import { getFirebaseFunctionsInstance, getFirebaseMessagingInstance, getFirebaseVapidKey } from '../firebase/firebaseApp';
import {
  getGoogleAccountIdentity,
  getStoredGoogleAccountIdentity,
  getToken as getGoogleAccessToken,
} from '../sync/googleAuth';
import { nowIsoUtc } from '../shared/date';
import { arePushNotificationsEnabled, setPushNotificationsEnabled } from './notificationPreferences';

const DEVICE_ID_KEY = 'fit-persona:push-notifications:device-id';
const FCM_SW_SCOPE = '/firebase-cloud-messaging-push-scope';
const FCM_SW_URL = '/firebase-messaging-sw.js';
const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;
const TWO_MINUTES_MS = 2 * 60 * 1000;
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const MEASUREMENT_TWO_DAY_HOUR = 20;
const MUTATION_RETRY_INTERVALS_MS = [
  60 * 1000,
  5 * 60 * 1000,
  15 * 60 * 1000,
  60 * 60 * 1000,
  6 * 60 * 60 * 1000,
];

type NotificationPermissionState = 'unsupported' | 'granted' | 'denied' | 'default';
type NotificationJobType = 'measurement_2day' | 'measurement_1hour' | 'session_log_2min' | 'session_log_2hour';

interface NotificationJobPayload {
  type: NotificationJobType;
  scheduled_at: string;
  title: string;
  body: string;
  entity_type: 'session';
  entity_id: string;
  client_id: string;
  entity_version: string;
  dedupe_key: string;
}

interface NotificationMutationPayload {
  entity_type: 'session';
  entity_id: string;
  entity_version?: string;
  jobs?: NotificationJobPayload[];
}

export interface PushNotificationStatus {
  permission: NotificationPermissionState;
  enabled: boolean;
  googleAccountId: string | null;
  googleEmail: string | null;
}

let mutationFlushPromise: Promise<void> | null = null;

function getNotificationMutationTable(): Table<NotificationMutationQueueEntry, string> {
  const transactionTable = Dexie.currentTransaction?.table('notification_mutation_queue') as
    | Table<NotificationMutationQueueEntry, string>
    | undefined;
  return transactionTable || db.notification_mutation_queue;
}

function getDeviceId(): string {
  const existing = window.localStorage.getItem(DEVICE_ID_KEY);
  if (existing) {
    return existing;
  }

  const nextId = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.localStorage.setItem(DEVICE_ID_KEY, nextId);
  return nextId;
}

function getPlatform(): string {
  const userAgent = navigator.userAgent || '';
  if (/android/i.test(userAgent)) {
    return 'android';
  }
  if (/ipad|iphone|ipod/i.test(userAgent)) {
    return 'ios';
  }
  if (/macintosh|mac os x/i.test(userAgent)) {
    return 'macos';
  }
  if (/windows/i.test(userAgent)) {
    return 'windows';
  }
  return 'web';
}

function getNotificationPermission(): NotificationPermissionState {
  if (!('Notification' in window)) {
    return 'unsupported';
  }
  return window.Notification.permission;
}

async function registerFcmServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service workers are not supported on this browser.');
  }

  return navigator.serviceWorker.register(FCM_SW_URL, {
    scope: FCM_SW_SCOPE,
  });
}

async function callNotificationFunction<TInput extends Record<string, unknown>, TOutput>(
  name: string,
  data: TInput,
): Promise<TOutput> {
  const callable = httpsCallable<TInput, TOutput>(getFirebaseFunctionsInstance(), name);
  const result = await callable(data);
  return result.data;
}

function getGoogleAccessTokenOrThrow(): string {
  const token = getGoogleAccessToken();
  if (!token) {
    throw new Error('Connect Google Drive before enabling notifications.');
  }
  return token;
}

function getSessionStart(session: Session): Date | null {
  if (!session.date || !session.start_time) {
    return null;
  }

  const start = new Date(`${session.date}T${session.start_time}:00`);
  return Number.isFinite(start.getTime()) ? start : null;
}

function formatSessionTime(session: Session): string {
  return session.start_time || 'scheduled time';
}

function getMeasurementTwoDayDate(sessionStart: Date): Date {
  const reminder = new Date(sessionStart.getTime() - TWO_DAYS_MS);
  reminder.setHours(MEASUREMENT_TWO_DAY_HOUR, 0, 0, 0);
  return reminder;
}

function buildDedupeKey(session: Session, type: NotificationJobType, scheduledAt: Date): string {
  return `session:${session.id}:${type}:${scheduledAt.getTime()}`;
}

function getSessionEntityVersion(session: Session): string {
  return session.updated_at || session.created_at || `${session.date}T${session.start_time || '00:00'}:00`;
}

function buildJob(
  session: Session,
  client: Client,
  type: NotificationJobType,
  scheduledAt: Date,
): NotificationJobPayload | null {
  if (scheduledAt.getTime() <= Date.now()) {
    return null;
  }

  const time = formatSessionTime(session);
  const focus = session.focus ? ` - ${session.focus}` : '';
  const titles: Record<NotificationJobType, string> = {
    measurement_2day: 'Measurement Reminder',
    measurement_1hour: 'Measurement Reminder',
    session_log_2min: 'Session Log Pending',
    session_log_2hour: 'Still Pending Log Entry',
  };
  const bodies: Record<NotificationJobType, string> = {
    measurement_2day: `${client.name}: take measurements in 2 days at ${time}${focus}.`,
    measurement_1hour: `${client.name}: take measurements in 1 hour at ${time}${focus}.`,
    session_log_2min: `${client.name}: log the session that started at ${time}${focus}.`,
    session_log_2hour: `${client.name}: session log is still pending for ${time}${focus}.`,
  };

  return {
    type,
    scheduled_at: scheduledAt.toISOString(),
    title: titles[type],
    body: bodies[type],
    entity_type: 'session',
    entity_id: session.id,
    client_id: session.client_id,
    entity_version: getSessionEntityVersion(session),
    dedupe_key: buildDedupeKey(session, type, scheduledAt),
  };
}

function buildSessionJobs(session: Session, client: Client): NotificationJobPayload[] {
  const sessionStart = getSessionStart(session);
  if (!sessionStart || session.status !== 'planned') {
    return [];
  }

  const jobs: NotificationJobPayload[] = [];
  const sessionLogTwoMin = buildJob(session, client, 'session_log_2min', new Date(sessionStart.getTime() + TWO_MINUTES_MS));
  const sessionLogTwoHour = buildJob(session, client, 'session_log_2hour', new Date(sessionStart.getTime() + TWO_HOURS_MS));

  if (sessionLogTwoMin) {
    jobs.push(sessionLogTwoMin);
  }
  if (sessionLogTwoHour) {
    jobs.push(sessionLogTwoHour);
  }

  if (session.measure_reminder) {
    const measurementTwoDay = buildJob(session, client, 'measurement_2day', getMeasurementTwoDayDate(sessionStart));
    const measurementOneHour = buildJob(session, client, 'measurement_1hour', new Date(sessionStart.getTime() - ONE_HOUR_MS));

    if (measurementTwoDay) {
      jobs.push(measurementTwoDay);
    }
    if (measurementOneHour) {
      jobs.push(measurementOneHour);
    }
  }

  return jobs;
}

async function getNotificationQueueIdentity(): Promise<{ google_account_id: string; google_email: string } | null> {
  return getStoredGoogleAccountIdentity() || getGoogleAccountIdentity();
}

function serializeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function getNextRetryAt(attemptCount: number): string {
  const interval = MUTATION_RETRY_INTERVALS_MS[Math.min(
    Math.max(attemptCount - 1, 0),
    MUTATION_RETRY_INTERVALS_MS.length - 1,
  )]!;
  return new Date(Date.now() + interval).toISOString();
}

async function markMutationSucceeded(entry: NotificationMutationQueueEntry): Promise<void> {
  const current = await db.notification_mutation_queue.get(entry.id);
  if (!current || current.payload_json !== entry.payload_json) {
    return;
  }

  await db.notification_mutation_queue.update(entry.id, {
    status: 'succeeded',
    last_error: undefined,
    next_retry_at: null,
    updated_at: nowIsoUtc(),
  });
}

async function markMutationFailed(entry: NotificationMutationQueueEntry, error: unknown): Promise<void> {
  const current = await db.notification_mutation_queue.get(entry.id);
  if (!current || current.payload_json !== entry.payload_json) {
    return;
  }

  const attemptCount = current.attempt_count + 1;
  await db.notification_mutation_queue.update(entry.id, {
    status: 'failed',
    attempt_count: attemptCount,
    last_error: serializeError(error),
    next_retry_at: getNextRetryAt(attemptCount),
    updated_at: nowIsoUtc(),
  });
}

function parseMutationPayload(entry: NotificationMutationQueueEntry): NotificationMutationPayload {
  const payload = JSON.parse(entry.payload_json) as NotificationMutationPayload;
  if (payload.entity_type !== 'session' || !payload.entity_id) {
    throw new Error('Notification mutation payload is invalid.');
  }
  return payload;
}

async function runNotificationMutation(entry: NotificationMutationQueueEntry): Promise<void> {
  const googleAccessToken = getGoogleAccessTokenOrThrow();
  const payload = parseMutationPayload(entry);

  if (entry.type === 'cancel_jobs') {
    await callNotificationFunction('cancelNotificationJobs', {
      google_access_token: googleAccessToken,
      google_account_id: entry.google_account_id,
      entity_type: payload.entity_type,
      entity_id: payload.entity_id,
      entity_version: payload.entity_version || '',
    });
    return;
  }

  if (entry.type === 'reschedule_jobs') {
    await callNotificationFunction('rescheduleNotificationJobs', {
      google_access_token: googleAccessToken,
      google_account_id: entry.google_account_id,
      entity_type: payload.entity_type,
      entity_id: payload.entity_id,
      entity_version: payload.entity_version || '',
      jobs: payload.jobs || [],
    });
    return;
  }

  await callNotificationFunction('createNotificationJob', {
    google_access_token: googleAccessToken,
    google_account_id: entry.google_account_id,
    jobs: payload.jobs || [],
  });
}

async function enqueueNotificationMutation(
  type: NotificationMutationType,
  payload: NotificationMutationPayload,
): Promise<void> {
  if (!arePushNotificationsEnabled()) {
    return;
  }

  const identity = await getNotificationQueueIdentity();
  if (!identity) {
    return;
  }

  const now = nowIsoUtc();
  const queue = getNotificationMutationTable();
  const existing = await queue
    .where('[google_account_id+entity_type+entity_id]')
    .equals([identity.google_account_id, payload.entity_type, payload.entity_id])
    .first();

  await queue.put({
    id: existing?.id || generateId(),
    type,
    google_account_id: identity.google_account_id,
    entity_type: payload.entity_type,
    entity_id: payload.entity_id,
    payload_json: JSON.stringify(payload),
    status: 'pending',
    attempt_count: existing?.status === 'succeeded' ? 0 : existing?.attempt_count || 0,
    last_error: undefined,
    next_retry_at: null,
    created_at: existing?.created_at || now,
    updated_at: now,
  });
}

async function flushNotificationMutationQueueOnce(): Promise<void> {
  if (!arePushNotificationsEnabled() || !getGoogleAccessToken()) {
    return;
  }

  const identity = await getGoogleAccountIdentity();
  if (!identity) {
    return;
  }

  const now = nowIsoUtc();
  const dueMutations = (await db.notification_mutation_queue
    .where('google_account_id')
    .equals(identity.google_account_id)
    .toArray())
    .filter((entry) => (
      entry.status !== 'succeeded'
      && (!entry.next_retry_at || entry.next_retry_at <= now)
    ))
    .sort((left, right) => left.created_at.localeCompare(right.created_at));

  for (const entry of dueMutations) {
    const current = await db.notification_mutation_queue.get(entry.id);
    if (!current || current.payload_json !== entry.payload_json || current.status === 'succeeded') {
      continue;
    }

    await db.notification_mutation_queue.update(entry.id, {
      status: 'processing',
      updated_at: nowIsoUtc(),
    });

    try {
      await runNotificationMutation(entry);
      await markMutationSucceeded(entry);
    } catch (error) {
      await markMutationFailed(entry, error);
    }
  }
}

export async function flushNotificationMutationQueue(): Promise<void> {
  if (mutationFlushPromise) {
    return mutationFlushPromise;
  }

  mutationFlushPromise = flushNotificationMutationQueueOnce().finally(() => {
    mutationFlushPromise = null;
  });

  return mutationFlushPromise;
}

async function registerDeviceTokenWithFirebase(fcmToken: string): Promise<void> {
  const googleAccessToken = getGoogleAccessTokenOrThrow();
  const identity = await getGoogleAccountIdentity();
  if (!identity) {
    throw new Error('Connect Google Drive before enabling notifications.');
  }

  await callNotificationFunction('registerDeviceToken', {
    google_access_token: googleAccessToken,
    google_account_id: identity.google_account_id,
    device_id: getDeviceId(),
    fcm_token: fcmToken,
    platform: getPlatform(),
    user_agent: navigator.userAgent || 'unknown',
  });
}

export async function getPushNotificationStatus(): Promise<PushNotificationStatus> {
  const identity = await getGoogleAccountIdentity().catch(() => null);

  return {
    permission: getNotificationPermission(),
    enabled: arePushNotificationsEnabled(),
    googleAccountId: identity?.google_account_id || null,
    googleEmail: identity?.google_email || null,
  };
}

export async function enablePushNotifications(): Promise<PushNotificationStatus> {
  if (getNotificationPermission() === 'unsupported') {
    throw new Error('Notifications are not supported on this browser.');
  }

  const permission = await window.Notification.requestPermission();
  if (permission !== 'granted') {
    setPushNotificationsEnabled(false);
    return getPushNotificationStatus();
  }

  const registration = await registerFcmServiceWorker();
  const messaging = await getFirebaseMessagingInstance();
  const fcmToken = await getMessagingToken(messaging, {
    vapidKey: getFirebaseVapidKey(),
    serviceWorkerRegistration: registration,
  });

  if (!fcmToken) {
    throw new Error('Firebase did not return an FCM token.');
  }

  await registerDeviceTokenWithFirebase(fcmToken);
  setPushNotificationsEnabled(true);
  await flushNotificationMutationQueue();
  await syncPlannedSessionNotificationJobs();
  return getPushNotificationStatus();
}

export async function refreshPushNotificationRegistration(): Promise<void> {
  if (!arePushNotificationsEnabled() || getNotificationPermission() !== 'granted' || !getGoogleAccessToken()) {
    return;
  }

  const registration = await registerFcmServiceWorker();
  const messaging = await getFirebaseMessagingInstance();
  const fcmToken = await getMessagingToken(messaging, {
    vapidKey: getFirebaseVapidKey(),
    serviceWorkerRegistration: registration,
  });

  if (!fcmToken) {
    return;
  }

  await registerDeviceTokenWithFirebase(fcmToken);
  await flushNotificationMutationQueue();
  await syncPlannedSessionNotificationJobs();
}

export async function cancelSessionNotificationJobs(sessionId: string): Promise<void> {
  if (!arePushNotificationsEnabled()) {
    return;
  }

  await enqueueNotificationMutation('cancel_jobs', {
    entity_type: 'session',
    entity_id: sessionId,
  });
  await flushNotificationMutationQueue();
}

export async function reconcileSessionNotificationJobs(sessionId: string): Promise<void> {
  if (!arePushNotificationsEnabled()) {
    return;
  }

  const session = await db.sessions.get(sessionId);
  if (!session || session.status !== 'planned') {
    await cancelSessionNotificationJobs(sessionId);
    return;
  }

  const client = await db.clients.get(session.client_id);
  if (!client || client.sync_status === 'pending_delete') {
    return;
  }

  const jobs = buildSessionJobs(session, client);
  if (jobs.length === 0) {
    await cancelSessionNotificationJobs(sessionId);
    return;
  }

  await enqueueNotificationMutation('reschedule_jobs', {
    entity_type: 'session',
    entity_id: session.id,
    entity_version: getSessionEntityVersion(session),
    jobs,
  });
  await flushNotificationMutationQueue();
}

export async function syncPlannedSessionNotificationJobs(): Promise<void> {
  if (!arePushNotificationsEnabled()) {
    return;
  }

  const sessions = await db.sessions.where('status').equals('planned').toArray();
  const clientIds = Array.from(new Set(sessions.map((session) => session.client_id)));
  const clients = await db.clients.bulkGet(clientIds);
  const clientById = new Map(clients.filter(Boolean).map((client) => [client!.id, client!]));
  for (const session of sessions) {
    const client = clientById.get(session.client_id);
    if (!client) {
      continue;
    }
    const jobs = buildSessionJobs(session, client);
    if (jobs.length === 0) {
      continue;
    }
    await enqueueNotificationMutation('reschedule_jobs', {
      entity_type: 'session',
      entity_id: session.id,
      entity_version: getSessionEntityVersion(session),
      jobs,
    });
  }

  await flushNotificationMutationQueue();
}
