import { randomUUID } from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import { getMessaging, type MulticastMessage } from 'firebase-admin/messaging';
import { setGlobalOptions } from 'firebase-functions/v2';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as logger from 'firebase-functions/logger';

initializeApp();

const REGION = process.env.FUNCTION_REGION || 'us-central1';
const DEVICE_TOKENS_COLLECTION = 'device_tokens';
const NOTIFICATION_JOBS_COLLECTION = 'notification_jobs';
const NOTIFICATION_ENTITIES_COLLECTION = 'notification_entities';
const DELIVERY_LOCK_TTL_MS = 5 * 60 * 1000;
const MAX_JOBS_PER_TICK = 100;
const MAX_TOKENS_PER_MULTICAST = 500;
const JOB_RETRY_INTERVALS_MS = [
  60 * 1000,
  5 * 60 * 1000,
  15 * 60 * 1000,
  60 * 60 * 1000,
  6 * 60 * 60 * 1000,
];

setGlobalOptions({
  region: REGION,
  maxInstances: 10,
});

type NotificationJobStatus = 'pending' | 'delivered' | 'cancelled' | 'skipped_stale' | 'failed_permanent';
type NotificationJobType = 'measurement_2day' | 'measurement_1hour' | 'session_log_2min' | 'session_log_2hour';
type NotificationEntityState = 'active' | 'cancelled';

const ALLOWED_NOTIFICATION_TYPES = new Set<NotificationJobType>([
  'measurement_2day',
  'measurement_1hour',
  'session_log_2min',
  'session_log_2hour',
]);
const ALLOWED_ENTITY_TYPES = new Set(['session']);

interface GoogleIdentity {
  google_account_id: string;
  google_email: string;
}

interface NotificationJobData {
  google_account_id: string;
  type: NotificationJobType;
  scheduled_at: Timestamp;
  status: NotificationJobStatus;
  title: string;
  body: string;
  entity_type: string;
  entity_id: string;
  entity_version: string;
  created_at: Timestamp | FieldValue;
  updated_at?: Timestamp | FieldValue;
  delivered_at?: Timestamp | null;
  cancelled_at?: Timestamp | null;
  skipped_stale_at?: Timestamp | null;
  dedupe_key: string;
  client_id?: string;
  attempt_count?: number;
  last_error?: string | null;
  next_retry_at?: Timestamp | null;
  delivery_lock_id?: string | null;
  delivery_locked_at?: Timestamp | null;
}

interface NotificationEntityData {
  google_account_id: string;
  entity_type: string;
  entity_id: string;
  current_version: string;
  notification_state: NotificationEntityState;
  updated_at: Timestamp | FieldValue;
}

interface ValidatedNotificationJobInput {
  type: NotificationJobType;
  scheduled_at: Timestamp;
  title: string;
  body: string;
  entity_type: string;
  entity_id: string;
  entity_version: string;
  dedupe_key: string;
  client_id?: string;
}

const db = getFirestore();
const messaging = getMessaging();

function assertObject(value: unknown, message: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new HttpsError('invalid-argument', message);
  }
  return value as Record<string, unknown>;
}

function readString(data: Record<string, unknown>, key: string, required = true): string {
  const value = data[key];
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  if (!required) {
    return '';
  }
  throw new HttpsError('invalid-argument', `Missing ${key}.`);
}

function readOptionalString(data: Record<string, unknown>, key: string): string | undefined {
  const value = data[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readNotificationType(data: Record<string, unknown>): NotificationJobType {
  const type = readString(data, 'type');
  if (!ALLOWED_NOTIFICATION_TYPES.has(type as NotificationJobType)) {
    throw new HttpsError('invalid-argument', `Unknown notification type: ${type}.`);
  }
  return type as NotificationJobType;
}

function readEntityType(data: Record<string, unknown>): string {
  const entityType = readString(data, 'entity_type');
  if (!ALLOWED_ENTITY_TYPES.has(entityType)) {
    throw new HttpsError('invalid-argument', `Invalid entity_type: ${entityType}.`);
  }
  return entityType;
}

function readEntityVersion(data: Record<string, unknown>): string {
  return readString(data, 'entity_version');
}

function parseScheduledAt(value: unknown): Timestamp {
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new HttpsError('invalid-argument', 'scheduled_at must be an ISO string or timestamp.');
  }

  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new HttpsError('invalid-argument', 'scheduled_at is invalid.');
  }

  return Timestamp.fromDate(date);
}

function readValidatedNotificationJob(rawJob: unknown): ValidatedNotificationJobInput {
  const jobInput = assertObject(rawJob, 'Each notification job must be an object.');
  return {
    type: readNotificationType(jobInput),
    scheduled_at: parseScheduledAt(jobInput.scheduled_at),
    title: readString(jobInput, 'title'),
    body: readString(jobInput, 'body'),
    entity_type: readEntityType(jobInput),
    entity_id: readString(jobInput, 'entity_id'),
    entity_version: readEntityVersion(jobInput),
    dedupe_key: readString(jobInput, 'dedupe_key'),
    client_id: readOptionalString(jobInput, 'client_id'),
  };
}

function makeScopedDocId(...parts: string[]): string {
  return Buffer.from(parts.join(':'), 'utf8').toString('base64url');
}

function makeEntityDocId(identity: GoogleIdentity | Pick<NotificationJobData, 'google_account_id'>, entityType: string, entityId: string): string {
  return makeScopedDocId(identity.google_account_id, entityType, entityId);
}

function makeJobUrl(job: NotificationJobData): string {
  if (job.entity_type === 'session' && job.client_id) {
    return `/client/${encodeURIComponent(job.client_id)}`;
  }
  return '/';
}

async function verifyGoogleAccessToken(accessToken: string): Promise<GoogleIdentity> {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new HttpsError('unauthenticated', `Google identity verification failed: ${response.status}`);
  }

  const data = await response.json() as { sub?: string; email?: string };
  if (!data.sub || !data.email) {
    throw new HttpsError('unauthenticated', 'Google identity response did not include account id and email.');
  }

  return {
    google_account_id: data.sub,
    google_email: data.email,
  };
}

async function getRequestIdentity(data: Record<string, unknown>): Promise<GoogleIdentity> {
  const accessToken = readString(data, 'google_access_token');
  const requestedAccountId = readString(data, 'google_account_id');
  const identity = await verifyGoogleAccessToken(accessToken);

  if (requestedAccountId !== identity.google_account_id) {
    throw new HttpsError('permission-denied', 'google_account_id does not match the Google access token identity.');
  }

  return identity;
}

export const registerDeviceToken = onCall(async (request) => {
  const data = assertObject(request.data, 'registerDeviceToken requires an object payload.');
  const identity = await getRequestIdentity(data);
  const deviceId = readString(data, 'device_id');
  const fcmToken = readString(data, 'fcm_token');
  const platform = readString(data, 'platform', false) || 'unknown';
  const userAgent = readString(data, 'user_agent', false) || 'unknown';
  const now = Timestamp.now();
  const docId = makeScopedDocId(identity.google_account_id, deviceId);
  const docRef = db.collection(DEVICE_TOKENS_COLLECTION).doc(docId);
  const existing = await docRef.get();

  await docRef.set({
    google_account_id: identity.google_account_id,
    google_email: identity.google_email,
    device_id: deviceId,
    fcm_token: fcmToken,
    platform,
    user_agent: userAgent,
    active: true,
    created_at: existing.exists ? existing.data()?.created_at || now : now,
    updated_at: now,
    last_seen_at: now,
  });

  return {
    ok: true,
    google_account_id: identity.google_account_id,
    google_email: identity.google_email,
  };
});

export const createNotificationJob = onCall(async (request) => {
  const data = assertObject(request.data, 'createNotificationJob requires an object payload.');
  const identity = await getRequestIdentity(data);
  const rawJobs = Array.isArray(data.jobs) ? data.jobs : [data.job ?? data];
  const now = Timestamp.now();
  let createdOrUpdated = 0;
  let skippedDelivered = 0;

  for (const rawJob of rawJobs) {
    const job = readValidatedNotificationJob(rawJob);
    const docRef = db.collection(NOTIFICATION_JOBS_COLLECTION)
      .doc(makeScopedDocId(identity.google_account_id, job.dedupe_key));
    const entityRef = db.collection(NOTIFICATION_ENTITIES_COLLECTION)
      .doc(makeEntityDocId(identity, job.entity_type, job.entity_id));

    await db.runTransaction(async (transaction) => {
      const existing = await transaction.get(docRef);
      const existingData = existing.data() as Partial<NotificationJobData> | undefined;

      transaction.set(entityRef, {
        google_account_id: identity.google_account_id,
        entity_type: job.entity_type,
        entity_id: job.entity_id,
        current_version: job.entity_version,
        notification_state: 'active',
        updated_at: now,
      } satisfies NotificationEntityData, { merge: true });

      if (existingData?.status === 'delivered') {
        skippedDelivered += 1;
        return;
      }

      transaction.set(docRef, {
        google_account_id: identity.google_account_id,
        type: job.type,
        scheduled_at: job.scheduled_at,
        status: 'pending',
        title: job.title,
        body: job.body,
        entity_type: job.entity_type,
        entity_id: job.entity_id,
        entity_version: job.entity_version,
        client_id: job.client_id,
        created_at: existingData?.created_at || now,
        updated_at: now,
        delivered_at: null,
        cancelled_at: null,
        skipped_stale_at: null,
        dedupe_key: job.dedupe_key,
        attempt_count: existingData?.attempt_count || 0,
        last_error: null,
        next_retry_at: null,
        delivery_lock_id: null,
        delivery_locked_at: null,
      } satisfies NotificationJobData);
      createdOrUpdated += 1;
    });
  }

  return {
    ok: true,
    created_or_updated: createdOrUpdated,
    skipped_delivered: skippedDelivered,
  };
});

export const cancelNotificationJobs = onCall(async (request) => {
  const data = assertObject(request.data, 'cancelNotificationJobs requires an object payload.');
  const identity = await getRequestIdentity(data);
  const now = Timestamp.now();
  const rawEntityType = readOptionalString(data, 'entity_type');
  const entityType = rawEntityType ? readEntityType({ entity_type: rawEntityType }) : undefined;
  const entityId = readOptionalString(data, 'entity_id');
  const entityVersion = readOptionalString(data, 'entity_version');
  if ((entityType && !entityId) || (!entityType && entityId)) {
    throw new HttpsError('invalid-argument', 'entity_type and entity_id must be provided together.');
  }
  const dedupeKeys = Array.isArray(data.dedupe_keys)
    ? data.dedupe_keys.filter((value): value is string => typeof value === 'string' && Boolean(value.trim()))
    : [];
  let refs: FirebaseFirestore.DocumentReference[] = [];

  if (dedupeKeys.length > 0) {
    refs = dedupeKeys.map((dedupeKey) => db.collection(NOTIFICATION_JOBS_COLLECTION)
      .doc(makeScopedDocId(identity.google_account_id, dedupeKey)));
  } else {
    let query: FirebaseFirestore.Query = db.collection(NOTIFICATION_JOBS_COLLECTION)
      .where('google_account_id', '==', identity.google_account_id)
      .where('status', '==', 'pending');

    if (entityType) {
      query = query.where('entity_type', '==', entityType);
    }
    if (entityId) {
      query = query.where('entity_id', '==', entityId);
    }

    const snapshot = await query.get();
    refs = snapshot.docs.map((doc) => doc.ref);
  }

  const batch = db.batch();
  let writes = 0;

  if (entityType && entityId) {
    const entityRef = db.collection(NOTIFICATION_ENTITIES_COLLECTION)
      .doc(makeEntityDocId(identity, entityType, entityId));
    batch.set(entityRef, {
      google_account_id: identity.google_account_id,
      entity_type: entityType,
      entity_id: entityId,
      current_version: entityVersion || now.toMillis().toString(),
      notification_state: 'cancelled',
      updated_at: now,
    } satisfies NotificationEntityData, { merge: true });
    writes += 1;
  }

  let cancelled = 0;
  for (const ref of refs) {
    const snapshot = await ref.get();
    if (snapshot.data()?.status !== 'pending') {
      continue;
    }
    batch.update(ref, {
      status: 'cancelled',
      cancelled_at: now,
      updated_at: now,
      delivery_lock_id: null,
      delivery_locked_at: null,
    });
    cancelled += 1;
    writes += 1;
  }

  if (writes > 0) {
    await batch.commit();
  }

  return { ok: true, cancelled };
});

export const rescheduleNotificationJobs = onCall(async (request) => {
  const data = assertObject(request.data, 'rescheduleNotificationJobs requires an object payload.');
  const identity = await getRequestIdentity(data);
  const now = Timestamp.now();
  const entityType = readEntityType(data);
  const entityId = readString(data, 'entity_id');
  const entityVersion = readEntityVersion(data);
  const rawJobs = Array.isArray(data.jobs) ? data.jobs : [];
  const jobs = rawJobs.map(readValidatedNotificationJob);

  if (jobs.length === 0) {
    throw new HttpsError('invalid-argument', 'rescheduleNotificationJobs requires at least one job.');
  }

  for (const job of jobs) {
    if (job.entity_type !== entityType || job.entity_id !== entityId || job.entity_version !== entityVersion) {
      throw new HttpsError('invalid-argument', 'All jobs must match the rescheduled entity and version.');
    }
  }

  const entityRef = db.collection(NOTIFICATION_ENTITIES_COLLECTION)
    .doc(makeEntityDocId(identity, entityType, entityId));
  const pendingJobsQuery = db.collection(NOTIFICATION_JOBS_COLLECTION)
    .where('google_account_id', '==', identity.google_account_id)
    .where('status', '==', 'pending')
    .where('entity_type', '==', entityType)
    .where('entity_id', '==', entityId);
  const jobRefs = jobs.map((job) => db.collection(NOTIFICATION_JOBS_COLLECTION)
    .doc(makeScopedDocId(identity.google_account_id, job.dedupe_key)));

  const result = await db.runTransaction(async (transaction) => {
    const pendingSnapshot = await transaction.get(pendingJobsQuery);
    const existingSnapshots = await Promise.all(jobRefs.map((ref) => transaction.get(ref)));
    let cancelled = 0;
    let createdOrUpdated = 0;
    let skippedDelivered = 0;

    transaction.set(entityRef, {
      google_account_id: identity.google_account_id,
      entity_type: entityType,
      entity_id: entityId,
      current_version: entityVersion,
      notification_state: 'active',
      updated_at: now,
    } satisfies NotificationEntityData, { merge: true });

    pendingSnapshot.docs.forEach((doc) => {
      transaction.update(doc.ref, {
        status: 'cancelled',
        cancelled_at: now,
        updated_at: now,
        delivery_lock_id: null,
        delivery_locked_at: null,
      });
      cancelled += 1;
    });

    jobs.forEach((job, index) => {
      const docRef = jobRefs[index]!;
      const existingData = existingSnapshots[index]?.data() as Partial<NotificationJobData> | undefined;

      if (existingData?.status === 'delivered') {
        skippedDelivered += 1;
        return;
      }

      transaction.set(docRef, {
        google_account_id: identity.google_account_id,
        type: job.type,
        scheduled_at: job.scheduled_at,
        status: 'pending',
        title: job.title,
        body: job.body,
        entity_type: job.entity_type,
        entity_id: job.entity_id,
        entity_version: job.entity_version,
        client_id: job.client_id,
        created_at: existingData?.created_at || now,
        updated_at: now,
        delivered_at: null,
        cancelled_at: null,
        skipped_stale_at: null,
        dedupe_key: job.dedupe_key,
        attempt_count: existingData?.attempt_count || 0,
        last_error: null,
        next_retry_at: null,
        delivery_lock_id: null,
        delivery_locked_at: null,
      } satisfies NotificationJobData);
      createdOrUpdated += 1;
    });

    return {
      cancelled,
      created_or_updated: createdOrUpdated,
      skipped_delivered: skippedDelivered,
    };
  });

  return {
    ok: true,
    ...result,
  };
});

function isInvalidTokenError(code: string | undefined): boolean {
  return code === 'messaging/registration-token-not-registered'
    || code === 'messaging/invalid-registration-token'
    || code === 'messaging/invalid-argument';
}

function isTransientMessagingError(code: string | undefined): boolean {
  return code === 'messaging/unavailable'
    || code === 'messaging/internal-error'
    || code === 'messaging/deadline-exceeded'
    || code === 'messaging/resource-exhausted'
    || code === 'messaging/server-unavailable'
    || code === 'messaging/unknown-error';
}

function formatMessagingError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function getNextJobRetryTimestamp(attemptCount: number): Timestamp {
  const interval = JOB_RETRY_INTERVALS_MS[Math.min(
    Math.max(attemptCount - 1, 0),
    JOB_RETRY_INTERVALS_MS.length - 1,
  )]!;
  return Timestamp.fromMillis(Date.now() + interval);
}

async function acquireJobLock(
  ref: FirebaseFirestore.DocumentReference,
  lockId: string,
  now: Timestamp,
): Promise<NotificationJobData | null> {
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const job = snapshot.data() as NotificationJobData | undefined;

    if (!job || job.status !== 'pending') {
      return null;
    }

    if (job.next_retry_at instanceof Timestamp && job.next_retry_at.toMillis() > now.toMillis()) {
      return null;
    }

    if (job.entity_type === 'session') {
      const entityRef = db.collection(NOTIFICATION_ENTITIES_COLLECTION)
        .doc(makeEntityDocId(job, job.entity_type, job.entity_id));
      const entitySnapshot = await transaction.get(entityRef);
      const entity = entitySnapshot.data() as NotificationEntityData | undefined;

      if (
        !entity
        || entity.notification_state !== 'active'
        || entity.current_version !== job.entity_version
      ) {
        transaction.update(ref, {
          status: 'skipped_stale',
          skipped_stale_at: now,
          updated_at: now,
          delivery_lock_id: null,
          delivery_locked_at: null,
        });
        return null;
      }
    }

    const lockedAtMillis = job.delivery_locked_at instanceof Timestamp
      ? job.delivery_locked_at.toMillis()
      : 0;

    if (job.delivery_lock_id && Date.now() - lockedAtMillis < DELIVERY_LOCK_TTL_MS) {
      return null;
    }

    transaction.update(ref, {
      delivery_lock_id: lockId,
      delivery_locked_at: now,
      updated_at: now,
    });

    return job;
  });
}

async function markJobStatus(
  ref: FirebaseFirestore.DocumentReference,
  status: Extract<NotificationJobStatus, 'delivered' | 'failed_permanent'>,
  error?: string,
): Promise<void> {
  const now = Timestamp.now();
  await ref.update({
    status,
    delivered_at: status === 'delivered' ? now : null,
    last_error: error || null,
    next_retry_at: null,
    updated_at: now,
    delivery_lock_id: null,
    delivery_locked_at: null,
  });
}

async function markJobRetryableFailure(
  ref: FirebaseFirestore.DocumentReference,
  job: NotificationJobData,
  error: string,
): Promise<void> {
  const attemptCount = (job.attempt_count || 0) + 1;
  await ref.update({
    status: 'pending',
    attempt_count: attemptCount,
    last_error: error,
    next_retry_at: getNextJobRetryTimestamp(attemptCount),
    updated_at: Timestamp.now(),
    delivery_lock_id: null,
    delivery_locked_at: null,
  });
}

async function sendJobNotification(ref: FirebaseFirestore.DocumentReference): Promise<void> {
  const lockId = randomUUID();
  const now = Timestamp.now();
  const job = await acquireJobLock(ref, lockId, now);

  if (!job) {
    return;
  }

  const tokenSnapshot = await db.collection(DEVICE_TOKENS_COLLECTION)
    .where('google_account_id', '==', job.google_account_id)
    .where('active', '==', true)
    .get();

  if (tokenSnapshot.empty) {
    await markJobStatus(ref, 'failed_permanent', 'No active FCM device tokens for this Google account.');
    return;
  }

  const tokenDocs = tokenSnapshot.docs
    .map((doc) => ({ ref: doc.ref, token: doc.data().fcm_token as string | undefined }))
    .filter((entry): entry is { ref: FirebaseFirestore.DocumentReference; token: string } => Boolean(entry.token));
  const url = makeJobUrl(job);
  let successCount = 0;
  let transientFailureCount = 0;
  let permanentFailureCount = 0;
  let lastError = '';

  for (let offset = 0; offset < tokenDocs.length; offset += MAX_TOKENS_PER_MULTICAST) {
    const chunk = tokenDocs.slice(offset, offset + MAX_TOKENS_PER_MULTICAST);
    const message: MulticastMessage = {
      tokens: chunk.map((entry) => entry.token),
      notification: {
        title: job.title,
        body: job.body,
      },
      data: {
        job_id: ref.id,
        type: job.type,
        entity_type: job.entity_type,
        entity_id: job.entity_id,
        client_id: job.client_id || '',
        url,
      },
      webpush: {
        notification: {
          title: job.title,
          body: job.body,
          icon: '/fit-icon-192.png',
          badge: '/fit-icon-192.png',
          data: {
            job_id: ref.id,
            type: job.type,
            entity_type: job.entity_type,
            entity_id: job.entity_id,
            client_id: job.client_id || '',
            url,
          },
        },
        fcmOptions: {
          link: url,
        },
      },
    };

    let response;
    try {
      response = await messaging.sendEachForMulticast(message);
    } catch (error) {
      const code = (error as { code?: string } | undefined)?.code;
      lastError = formatMessagingError(error);
      if (successCount > 0) {
        break;
      }
      if (isTransientMessagingError(code)) {
        await markJobRetryableFailure(ref, job, lastError);
        return;
      }
      await markJobStatus(ref, 'failed_permanent', lastError);
      return;
    }
    successCount += response.successCount;

    const cleanupBatch = db.batch();
    let cleanupCount = 0;
    response.responses.forEach((result, index) => {
      if (result.success) {
        return;
      }

      const code = result.error?.code;
      lastError = result.error?.message || code || 'FCM send failed.';
      if (isInvalidTokenError(code)) {
        cleanupBatch.update(chunk[index]!.ref, {
          active: false,
          updated_at: Timestamp.now(),
        });
        cleanupCount += 1;
        permanentFailureCount += 1;
        return;
      }

      if (isTransientMessagingError(code)) {
        transientFailureCount += 1;
        return;
      }

      permanentFailureCount += 1;
    });
    if (cleanupCount > 0) {
      await cleanupBatch.commit();
    }
  }

  if (successCount > 0) {
    await markJobStatus(ref, 'delivered');
    return;
  }

  if (transientFailureCount > 0) {
    await markJobRetryableFailure(ref, job, lastError || 'FCM send failed with a transient error.');
    return;
  }

  await markJobStatus(
    ref,
    'failed_permanent',
    lastError || `FCM send failed for ${permanentFailureCount} token(s).`,
  );
}

export const sendDueNotifications = onSchedule('every 1 minutes', async () => {
  const now = Timestamp.now();
  const snapshot = await db.collection(NOTIFICATION_JOBS_COLLECTION)
    .where('status', '==', 'pending')
    .where('scheduled_at', '<=', now)
    .orderBy('scheduled_at', 'asc')
    .limit(MAX_JOBS_PER_TICK)
    .get();
  const dueDocs = snapshot.docs.filter((doc) => {
    const nextRetryAt = doc.data().next_retry_at;
    return !(nextRetryAt instanceof Timestamp) || nextRetryAt.toMillis() <= now.toMillis();
  });

  logger.info('Processing due notification jobs', { count: dueDocs.length, scanned: snapshot.size });

  await Promise.all(dueDocs.map((doc) => sendJobNotification(doc.ref)));
});
