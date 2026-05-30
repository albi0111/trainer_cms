import { db } from '../../db/db';
import { EMPTY_ASSESSMENT, EMPTY_LIFESTYLE, EMPTY_PROFILE } from '../../constants/assessment';
import { normalizeAssessment } from './assessmentMapper';
import type {
  Client,
  ClientAssessment,
  ClientDetail,
  ClientLifestyle,
  ClientProfile,
  ClientStatus,
  DietPlan,
  DriveClientSnapshot,
  Exercise,
  Measurement,
  MeasurementConfig,
  Plan,
  ProgressPhoto,
  Session,
  SessionActivityEntry,
  SessionResult,
} from '../../types';
import { deriveClientStatusFromData } from '../../utils/clientStatus';
import { compareDateTimes } from './date';

const CORE_MEASUREMENT_KEYS = [
  'weight_kg',
  'height_cm',
  'body_fat_pct',
  'chest_cm',
  'waist_cm',
  'hips_cm',
  'arm_cm',
  'thigh_cm',
  'neck_cm',
  'calf_cm',
  'pull_strength_kg',
  'push_strength_kg',
  'lower_body_strength_kg',
  'cardio_endurance_min',
] as const;

export function parseMeasurement(measurement: Measurement): Measurement {
  let values: Record<string, number | undefined> = {};
  if (measurement.custom_values_json) {
    try {
      values = JSON.parse(measurement.custom_values_json) as Record<string, number | undefined>;
    } catch {
      values = {};
    }
  }

  for (const key of CORE_MEASUREMENT_KEYS) {
    const value = measurement[key];
    if (typeof value === 'number') {
      values[key] = value;
    }
  }

  return {
    ...measurement,
    values,
  };
}

function toPersistedMeasurement(measurement: Measurement): Measurement {
  const { values, ...persisted } = measurement;
  return {
    ...persisted,
    custom_values_json: measurement.custom_values_json || serializeMeasurementValues(values || {}),
  };
}

function toSnapshotMeasurement(measurement: Measurement): Measurement {
  return toPersistedMeasurement(parseMeasurement(measurement));
}

export function serializeMeasurementValues(values: Record<string, number | undefined>): string {
  const compactValues = Object.entries(values).reduce<Record<string, number>>((acc, [key, value]) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      acc[key] = value;
    }
    return acc;
  }, {});

  return JSON.stringify(compactValues);
}

export function getSessionDurationMinutes(
  session: Pick<Session, 'start_time' | 'end_time' | 'duration_minutes'>,
): number {
  if (session.start_time && session.end_time) {
    const start = session.start_time.split(':').map(Number);
    const end = session.end_time.split(':').map(Number);
    if (start.length === 2 && end.length === 2) {
      const startMinutes = (start[0] || 0) * 60 + (start[1] || 0);
      const endMinutes = (end[0] || 0) * 60 + (end[1] || 0);
      if (endMinutes > startMinutes) {
        return endMinutes - startMinutes;
      }
    }
  }

  return session.duration_minutes || 60;
}

export function getSessionEndMillis(
  session: Pick<Session, 'date' | 'start_time' | 'end_time' | 'duration_minutes'>,
): number {
  if (session.end_time) {
    return compareDateTimes(session.date, session.end_time);
  }

  if (session.start_time) {
    return compareDateTimes(session.date, session.start_time) + getSessionDurationMinutes(session) * 60 * 1000;
  }

  return compareDateTimes(session.date);
}

export function partitionPlannedSessions(sessions: Session[]): {
  upcoming: Session[];
  pending: Session[];
} {
  const now = Date.now();
  const upcoming: Session[] = [];
  const pending: Session[] = [];

  for (const session of sessions) {
    if (session.status !== 'planned') {
      continue;
    }

    if (getSessionEndMillis(session) < now) {
      pending.push(session);
    } else {
      upcoming.push(session);
    }
  }

  upcoming.sort((a, b) => compareDateTimes(a.date, a.start_time) - compareDateTimes(b.date, b.start_time));
  pending.sort((a, b) => compareDateTimes(b.date, b.start_time) - compareDateTimes(a.date, a.start_time));

  return { upcoming, pending };
}

export function buildRecentActivities(
  sessions: Session[],
  sessionResults: SessionResult[],
): SessionActivityEntry[] {
  const resultsBySessionId = new Map(sessionResults.map((result) => [result.session_id, result]));

  return sessions
    .filter((session): session is Session & { status: 'completed' | 'missed' } =>
      session.status === 'completed' || session.status === 'missed',
    )
    .map((session) => {
      const result = resultsBySessionId.get(session.id);
      return {
        id: session.id,
        date: session.date,
        focus: session.focus,
        start_time: session.start_time || '',
        duration_minutes: getSessionDurationMinutes(session),
        status: session.status,
        energy_level: result?.energy_level,
        perceived_difficulty: result?.perceived_difficulty,
        performance_notes: result?.performance_notes,
        missed_reason: session.missed_reason,
        missed_note: session.missed_note,
      };
    })
    .sort((a, b) => compareDateTimes(b.date, b.start_time) - compareDateTimes(a.date, a.start_time));
}

export function deriveClientDetailStatus(plans: Plan[], sessions: Session[]): ClientStatus {
  return deriveClientStatusFromData(sessions, plans);
}

function buildDefaultProfile(client: Client, profile: ClientProfile | undefined): ClientProfile {
  return {
    client_id: client.id,
    ...EMPTY_PROFILE,
    ...profile,
    updated_at: profile?.updated_at || client.updated_at,
  };
}

function buildDefaultLifestyle(client: Client, lifestyle: ClientLifestyle | undefined): ClientLifestyle {
  return {
    client_id: client.id,
    ...EMPTY_LIFESTYLE,
    ...lifestyle,
    updated_at: lifestyle?.updated_at || client.updated_at,
  };
}

function buildDefaultAssessment(client: Client, assessment: ClientAssessment | null): ClientAssessment {
  return normalizeAssessment({
    client_id: client.id,
    ...EMPTY_ASSESSMENT,
    ...assessment,
    updated_at: assessment?.updated_at || client.updated_at,
  })!;
}

export async function getClientSnapshotTables(clientId: string): Promise<{
  client: Client | undefined;
  profile: ClientProfile | undefined;
  lifestyle: ClientLifestyle | undefined;
  assessment: ClientAssessment | null;
  measurementConfigs: MeasurementConfig[];
  measurements: Measurement[];
  plans: Plan[];
  dietPlans: DietPlan[];
  sessions: Session[];
  sessionResults: SessionResult[];
  exercises: Exercise[];
  progressPhotos: ProgressPhoto[];
}> {
  const [
    client,
    rawProfile,
    rawLifestyle,
    rawAssessment,
    measurementConfigs,
    measurements,
    plans,
    dietPlans,
    sessions,
    sessionResults,
    exercises,
    progressPhotos,
  ] = await Promise.all([
    db.clients.get(clientId),
    db.clientProfiles.get(clientId),
    db.clientLifestyles.get(clientId),
    db.clientAssessments.get(clientId),
    db.measurementConfigs.where('client_id').equals(clientId).sortBy('label'),
    db.measurements.where('client_id').equals(clientId).sortBy('date'),
    db.plans.where('client_id').equals(clientId).sortBy('start_date'),
    db.dietPlans.where('client_id').equals(clientId).toArray(),
    db.sessions.where('client_id').equals(clientId).toArray(),
    db.sessions.where('client_id').equals(clientId).primaryKeys().then((sessionIds) =>
      sessionIds.length > 0 ? db.sessionResults.bulkGet(sessionIds as string[]) : Promise.resolve([]),
    ),
    db.sessions.where('client_id').equals(clientId).primaryKeys().then((sessionIds) =>
      sessionIds.length > 0 ? db.exercises.where('session_id').anyOf(sessionIds as string[]).toArray() : Promise.resolve([]),
    ),
    db.progressPhotos.where('client_id').equals(clientId).toArray(),
  ]);

  const profile = client ? buildDefaultProfile(client, rawProfile) : undefined;
  const lifestyle = client ? buildDefaultLifestyle(client, rawLifestyle) : undefined;
  const assessment = client ? buildDefaultAssessment(client, normalizeAssessment(rawAssessment)) : null;

  return {
    client,
    profile,
    lifestyle,
    assessment,
    measurementConfigs,
    measurements: measurements.map(parseMeasurement),
    plans,
    dietPlans,
    sessions: sessions.sort((a, b) => compareDateTimes(a.date, a.start_time) - compareDateTimes(b.date, b.start_time)),
    sessionResults: sessionResults.filter(Boolean) as SessionResult[],
    exercises: exercises.sort((a, b) => a.order_index - b.order_index),
    progressPhotos,
  };
}

export async function buildClientSnapshot(clientId: string): Promise<DriveClientSnapshot | null> {
  const tables = await getClientSnapshotTables(clientId);
  if (!tables.client || !tables.profile || !tables.lifestyle || !tables.assessment) {
    return null;
  }

  return {
    version: tables.client.version,
    updated_at: tables.client.updated_at,
    deleted: tables.client.sync_status === 'pending_delete',
    client: tables.client,
    profile: tables.profile,
    lifestyle: tables.lifestyle,
    assessment: tables.assessment,
    measurementConfigs: tables.measurementConfigs,
    measurements: tables.measurements.map(toSnapshotMeasurement),
    plans: tables.plans,
    dietPlans: tables.dietPlans,
    sessions: tables.sessions,
    sessionResults: tables.sessionResults,
    exercises: tables.exercises,
    progressPhotos: tables.progressPhotos,
  };
}

export async function buildClientDetail(clientId: string): Promise<ClientDetail | null> {
  const tables = await getClientSnapshotTables(clientId);
  if (!tables.client || !tables.profile || !tables.lifestyle || !tables.assessment) {
    return null;
  }

  return {
    client: tables.client,
    profile: tables.profile,
    lifestyle: tables.lifestyle,
    assessment: tables.assessment,
    plans: tables.plans,
    dietPlans: tables.dietPlans,
    sessions: tables.sessions,
    exercises: tables.exercises,
    sessionResults: tables.sessionResults,
    measurementConfigs: tables.measurementConfigs,
    measurements: tables.measurements,
    progressPhotos: tables.progressPhotos,
    status: deriveClientDetailStatus(tables.plans, tables.sessions),
    activities: buildRecentActivities(tables.sessions, tables.sessionResults),
  };
}

export async function purgeClientRecords(clientId: string): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.clients,
      db.clientProfiles,
      db.clientLifestyles,
      db.clientAssessments,
      db.measurements,
      db.measurementConfigs,
      db.progressPhotos,
      db.plans,
      db.dietPlans,
      db.sessions,
      db.sessionResults,
      db.exercises,
      db.syncQueue,
      db.clientSyncState,
    ],
    async () => {
      await db.clients.delete(clientId);
      await db.clientProfiles.delete(clientId);
      await db.clientLifestyles.delete(clientId);
      await db.clientAssessments.delete(clientId);
      await db.measurements.where('client_id').equals(clientId).delete();
      await db.measurementConfigs.where('client_id').equals(clientId).delete();
      await db.progressPhotos.where('client_id').equals(clientId).delete();
      await db.plans.where('client_id').equals(clientId).delete();
      await db.dietPlans.where('client_id').equals(clientId).delete();
      const sessionIds = await db.sessions.where('client_id').equals(clientId).primaryKeys() as string[];
      await db.sessions.where('client_id').equals(clientId).delete();
      if (sessionIds.length > 0) {
        await Promise.all(sessionIds.map((sessionId) => db.sessionResults.delete(sessionId)));
        await db.exercises.where('session_id').anyOf(sessionIds).delete();
      }
      await db.syncQueue.where('client_id').equals(clientId).delete();
      await db.clientSyncState.delete(clientId);
    },
  );
}

export async function applyClientSnapshot(snapshot: DriveClientSnapshot): Promise<void> {
  if (snapshot.deleted) {
    await purgeClientRecords(snapshot.client.id);
    return;
  }

  await db.transaction(
    'rw',
    [
      db.clients,
      db.clientProfiles,
      db.clientLifestyles,
      db.clientAssessments,
      db.measurements,
      db.measurementConfigs,
      db.progressPhotos,
      db.plans,
      db.dietPlans,
      db.sessions,
      db.sessionResults,
      db.exercises,
      db.clientSyncState,
    ],
    async () => {
      await db.clients.put({ ...snapshot.client, sync_status: 'synced' });
      await db.clientProfiles.put(snapshot.profile);
      await db.clientLifestyles.put(snapshot.lifestyle);
      await db.clientAssessments.put(normalizeAssessment(snapshot.assessment) || snapshot.assessment);
      await db.measurements.where('client_id').equals(snapshot.client.id).delete();
      await db.measurementConfigs.where('client_id').equals(snapshot.client.id).delete();
      await db.progressPhotos.where('client_id').equals(snapshot.client.id).delete();
      await db.plans.where('client_id').equals(snapshot.client.id).delete();
      await db.dietPlans.where('client_id').equals(snapshot.client.id).delete();
      const sessionIds = await db.sessions.where('client_id').equals(snapshot.client.id).primaryKeys() as string[];
      await db.sessions.where('client_id').equals(snapshot.client.id).delete();
      if (sessionIds.length > 0) {
        await Promise.all(sessionIds.map((sessionId) => db.sessionResults.delete(sessionId)));
        await db.exercises.where('session_id').anyOf(sessionIds).delete();
      }

      if (snapshot.measurements.length > 0) {
        await db.measurements.bulkPut(snapshot.measurements.map((measurement) => toPersistedMeasurement(parseMeasurement(measurement))));
      }
      if (snapshot.measurementConfigs.length > 0) {
        await db.measurementConfigs.bulkPut(snapshot.measurementConfigs);
      }
      if (snapshot.progressPhotos.length > 0) {
        await db.progressPhotos.bulkPut(snapshot.progressPhotos);
      }
      if (snapshot.plans.length > 0) {
        await db.plans.bulkPut(snapshot.plans);
      }
      if (snapshot.dietPlans.length > 0) {
        await db.dietPlans.bulkPut(snapshot.dietPlans);
      }
      if (snapshot.sessions.length > 0) {
        await db.sessions.bulkPut(snapshot.sessions);
      }
      if (snapshot.sessionResults.length > 0) {
        await db.sessionResults.bulkPut(snapshot.sessionResults);
      }
      if (snapshot.exercises.length > 0) {
        await db.exercises.bulkPut(snapshot.exercises);
      }

      await db.clientSyncState.put({
        client_id: snapshot.client.id,
        remote_updated_at: snapshot.updated_at,
        remote_version: snapshot.version,
        last_synced_at: snapshot.updated_at,
      });
    },
  );
}
