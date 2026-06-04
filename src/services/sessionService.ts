import { db } from '../db/db';
import type {
  Exercise,
  MissedReason,
  Plan,
  Session,
  SessionActivityEntry,
  SessionResult,
  SessionType,
  UpdateSessionInput,
} from '../types';
import { generateId } from '../utils/id';
import {
  buildRecentActivities,
  getSessionDurationMinutes,
} from './shared/clientSnapshotMapper';
import { nowIsoUtc, toDayName, todayLocalIso } from './shared/date';
import { validatePlanForSession } from './plan/planService';
import {
  onSessionCompleted as planCalendarSessionCompleted,
  onSessionDeleted as planCalendarSessionDeleted,
  onSessionMissed as planCalendarSessionMissed,
  onSessionReverted as planCalendarSessionReverted,
  planForSession as planCalendarSession,
  replanForSession as replanCalendarSession,
} from './calendar/calendarReminderPlanner';
import { scheduleGoogleBackgroundSync } from './google/googleSyncService';
import { enqueueClientUpdate } from './sync/syncQueueService';

export type { SessionActivityEntry } from '../types';
export {
  buildRecentActivities,
  getSessionDurationMinutes,
  getSessionEndMillis,
  partitionPlannedSessions,
} from './shared/clientSnapshotMapper';

export interface SessionExerciseDraft {
  id?: string;
  name: string;
  reps?: string;
  target_sets?: number;
}

export interface CreateSessionInput {
  client_id: string;
  plan_id?: string | null;
  date: string;
  start_time?: string;
  end_time?: string;
  duration_minutes?: number;
  day_name: string;
  focus: string;
  type?: SessionType;
  measure_reminder?: boolean;
  postponed_note?: string;
  original_date?: string;
  notes?: string;
  exercises?: SessionExerciseDraft[];
}

export interface CompleteSessionInput {
  difficulty: number;
  energy: number;
  performanceNotes?: string;
}

export interface MarkMissedInput {
  reason: MissedReason;
  note: string;
}

async function runCalendarReminderSideEffect(operation: () => Promise<boolean>): Promise<void> {
  try {
    await operation();
  } catch (error) {
    console.warn('Calendar reminder planning failed', error);
  }
}

async function touchClient(clientId: string, now: string): Promise<void> {
  await db.clients.update(clientId, (client) => {
    if (!client) {
      return;
    }
    client.version += 1;
    client.updated_at = now;
    if (client.sync_status !== 'pending_delete') {
      client.sync_status = 'pending';
    }
  });
}

function sessionDateFallsWithinPlan(date: string, plan: Pick<Plan, 'start_date' | 'end_date'>): boolean {
  return date >= plan.start_date && date <= plan.end_date;
}

function resolveSessionPlanIdFromPlans(
  weeklyPlans: Plan[],
  date: string,
  preferredPlanId?: string | null,
): string | null {
  const matchingPlans = weeklyPlans.filter((plan) => sessionDateFallsWithinPlan(date, plan));

  if (matchingPlans.length === 1) {
    return matchingPlans[0]!.id;
  }

  if (preferredPlanId) {
    const preferredPlan = weeklyPlans.find((plan) => plan.id === preferredPlanId);
    if (!preferredPlan) {
      return matchingPlans[0]?.id || null;
    }

    if (matchingPlans.length === 0 || matchingPlans.some((plan) => plan.id === preferredPlan.id)) {
      return preferredPlan.id;
    }
  }

  return matchingPlans[0]?.id || null;
}

async function resolveSessionPlanId(
  clientId: string,
  date: string,
  preferredPlanId?: string | null,
): Promise<string | null> {
  const weeklyPlans = await db.plans
    .where('client_id')
    .equals(clientId)
    .filter((plan) => plan.type === 'weekly')
    .toArray();

  return resolveSessionPlanIdFromPlans(weeklyPlans, date, preferredPlanId);
}

export async function getSessionExercises(sessionId: string): Promise<Exercise[]> {
  return db.exercises.where('session_id').equals(sessionId).sortBy('order_index');
}

export async function replaceSessionExercises(sessionId: string, exercises: SessionExerciseDraft[], createdAt: string): Promise<void> {
  await db.exercises.where('session_id').equals(sessionId).delete();
  if (exercises.length === 0) {
    return;
  }

  await db.exercises.bulkPut(
    exercises.map((exercise, index) => ({
      id: exercise.id || generateId(),
      session_id: sessionId,
      name: exercise.name || '',
      order_index: index,
      target_sets: exercise.target_sets,
      target_reps: exercise.reps || '',
      sets: [],
      created_at: createdAt,
    })),
  );
}

export async function createSession(input: CreateSessionInput): Promise<string> {
  const now = nowIsoUtc();
  const id = generateId();

  await db.transaction('rw', [db.plans, db.sessions, db.exercises, db.clients, db.syncQueue], async () => {
    const resolvedPlanId = await resolveSessionPlanId(input.client_id, input.date, input.plan_id ?? null);
    const resolvedDayName = toDayName(input.date);

    if (resolvedPlanId) {
      await validatePlanForSession(resolvedPlanId);
    }

    await db.sessions.put({
      id,
      client_id: input.client_id,
      plan_id: resolvedPlanId,
      date: input.date,
      start_time: input.start_time,
      end_time: input.end_time,
      duration_minutes: input.duration_minutes,
      day_name: resolvedDayName,
      focus: input.focus,
      type: input.type || 'mixed',
      status: 'planned',
      postponed_note: input.postponed_note,
      original_date: input.original_date,
      notes: input.notes,
      measure_reminder: Boolean(input.measure_reminder),
      created_at: now,
      updated_at: now,
    });

    await replaceSessionExercises(id, input.exercises || [], now);
    await touchClient(input.client_id, now);
    await enqueueClientUpdate(input.client_id, ['sessions', 'exercises']);
  });

  await runCalendarReminderSideEffect(() => planCalendarSession(id));
  scheduleGoogleBackgroundSync();
  return id;
}

export async function updateSession(
  sessionId: string,
  clientId: string,
  input: UpdateSessionInput,
  exercises?: SessionExerciseDraft[],
): Promise<void> {
  const now = nowIsoUtc();
  await db.transaction('rw', [db.plans, db.sessions, db.exercises, db.clients, db.syncQueue], async () => {
    const existingSession = await db.sessions.get(sessionId);
    if (!existingSession) {
      throw new Error('Session not found.');
    }

    const nextDate = input.date ?? existingSession.date;
    const preferredPlanId = input.plan_id ?? existingSession.plan_id ?? null;
    const resolvedPlanId = await resolveSessionPlanId(clientId, nextDate, preferredPlanId);
    const resolvedDayName = toDayName(nextDate);

    if (resolvedPlanId) {
      await validatePlanForSession(resolvedPlanId);
    }

    await db.sessions.update(sessionId, {
      ...input,
      plan_id: resolvedPlanId,
      day_name: resolvedDayName,
      updated_at: now,
    } as Partial<Session>);

    if (exercises) {
      await replaceSessionExercises(sessionId, exercises, now);
    }

    await touchClient(clientId, now);
    await enqueueClientUpdate(clientId, ['sessions', 'exercises']);
  });

  await runCalendarReminderSideEffect(() => replanCalendarSession(sessionId));
  scheduleGoogleBackgroundSync();
}

export async function getSessionsByClient(clientId: string): Promise<Session[]> {
  const sessions = await db.sessions.where('client_id').equals(clientId).toArray();
  return sessions.sort((a, b) => {
    const aTime = new Date(`${a.date}T${a.start_time || '00:00'}:00`).getTime();
    const bTime = new Date(`${b.date}T${b.start_time || '00:00'}:00`).getTime();
    return bTime - aTime;
  });
}

export async function repairDetachedSessionPlanLinks(clientId: string): Promise<number> {
  const now = nowIsoUtc();
  const repairedCount = await db.transaction('rw', [db.plans, db.sessions, db.clients, db.syncQueue], async () => {
    const [weeklyPlans, clientSessions] = await Promise.all([
      db.plans.where('client_id').equals(clientId).filter((plan) => plan.type === 'weekly').toArray(),
      db.sessions.where('client_id').equals(clientId).toArray(),
    ]);

    const weeklyPlansById = new Map(weeklyPlans.map((plan) => [plan.id, plan]));

    const repairs = clientSessions
      .map((session) => {
        const currentPlan = session.plan_id ? weeklyPlansById.get(session.plan_id) : null;
        const currentPlanMatchesDate = currentPlan
          ? sessionDateFallsWithinPlan(session.date, currentPlan)
          : false;
        const resolvedPlanId = resolveSessionPlanIdFromPlans(weeklyPlans, session.date, session.plan_id ?? null);
        const resolvedDayName = toDayName(session.date);
        const needsPlanRepair = Boolean(resolvedPlanId) && (!currentPlanMatchesDate || session.plan_id !== resolvedPlanId);
        const needsDayRepair = session.day_name !== resolvedDayName;

        if (!needsPlanRepair && !needsDayRepair) {
          return null;
        }

        return {
          sessionId: session.id,
          planId: needsPlanRepair ? resolvedPlanId : session.plan_id,
          dayName: resolvedDayName,
        };
      })
      .filter((repair): repair is { sessionId: string; planId: string | null; dayName: string } => repair !== null);

    if (repairs.length === 0) {
      return 0;
    }

    for (const repair of repairs) {
      await db.sessions.update(repair.sessionId, {
        plan_id: repair.planId,
        day_name: repair.dayName,
        updated_at: now,
      });
    }

    await touchClient(clientId, now);
    await enqueueClientUpdate(clientId, ['sessions']);
    return repairs.length;
  });

  if (repairedCount > 0) {
    scheduleGoogleBackgroundSync();
  }

  return repairedCount;
}

export async function getTodaySessions(): Promise<Session[]> {
  const today = todayLocalIso();
  return db.sessions.where('[status+date]').equals(['planned', today]).sortBy('start_time');
}

export async function getRecentActivitiesByClient(clientId: string): Promise<SessionActivityEntry[]> {
  const sessions = await db.sessions.where('client_id').equals(clientId).toArray();
  const results = sessions.length > 0
    ? await db.sessionResults.bulkGet(sessions.map((session) => session.id))
    : [];
  return buildRecentActivities(sessions, results.filter(Boolean) as SessionResult[]);
}

export async function completeSession(sessionId: string, clientId: string, data: CompleteSessionInput): Promise<void> {
  const now = nowIsoUtc();
  const session = await db.sessions.get(sessionId);
  const existingResult = await db.sessionResults.get(sessionId);

  if (existingResult) {
    throw new Error('This session is already completed.');
  }

  let performanceNotes = data.performanceNotes || undefined;
  if (session?.original_date) {
    const postponeInfo = `session postponed from ${session.original_date}, reason - ${session.postponed_note || 'N/A'}`;
    performanceNotes = performanceNotes
      ? `${postponeInfo}\nsession notes:\n${performanceNotes}`
      : postponeInfo;
  }

  await db.transaction('rw', db.sessions, db.sessionResults, db.clients, db.syncQueue, async () => {
    await db.sessions.update(sessionId, { status: 'completed', updated_at: now });
    await db.sessionResults.put({
      session_id: sessionId,
      perceived_difficulty: data.difficulty,
      energy_level: data.energy,
      performance_notes: performanceNotes,
      completed_at: now,
    });
    await touchClient(clientId, now);
    await enqueueClientUpdate(clientId, ['sessions', 'session_results']);
  });

  await runCalendarReminderSideEffect(() => planCalendarSessionCompleted(sessionId));
  scheduleGoogleBackgroundSync();
}

export async function markSessionMissed(sessionId: string, clientId: string, data: MarkMissedInput): Promise<void> {
  if (data.reason === 'other' && data.note.trim() === '') {
    throw new Error('A note is required for reason "other".');
  }

  const now = nowIsoUtc();
  await db.transaction('rw', db.sessions, db.clients, db.syncQueue, async () => {
    await db.sessions.update(sessionId, {
      status: 'missed',
      missed_reason: data.reason,
      missed_note: data.note || undefined,
      updated_at: now,
    });
    await touchClient(clientId, now);
    await enqueueClientUpdate(clientId, ['sessions']);
  });

  await runCalendarReminderSideEffect(() => planCalendarSessionMissed(sessionId));
  scheduleGoogleBackgroundSync();
}

export async function revertSession(sessionId: string, clientId: string): Promise<void> {
  const now = nowIsoUtc();
  await db.transaction('rw', db.sessions, db.sessionResults, db.clients, db.syncQueue, async () => {
    await db.sessions.update(sessionId, {
      status: 'planned',
      missed_reason: undefined,
      missed_note: undefined,
      postponed_note: undefined,
      updated_at: now,
    });
    await db.sessionResults.delete(sessionId);
    await touchClient(clientId, now);
    await enqueueClientUpdate(clientId, ['sessions', 'session_results']);
  });

  await runCalendarReminderSideEffect(() => planCalendarSessionReverted(sessionId));
  scheduleGoogleBackgroundSync();
}

export async function deleteSession(sessionId: string, clientId: string): Promise<void> {
  const now = nowIsoUtc();
  await db.transaction('rw', [
    db.sessions,
    db.sessionResults,
    db.exercises,
    db.clients,
    db.syncQueue,
  ], async () => {
    await db.sessions.delete(sessionId);
    await db.sessionResults.delete(sessionId);
    await db.exercises.where('session_id').equals(sessionId).delete();
    await touchClient(clientId, now);
    await enqueueClientUpdate(clientId, ['sessions', 'session_results', 'exercises']);
  });

  await runCalendarReminderSideEffect(() => planCalendarSessionDeleted(sessionId));
  scheduleGoogleBackgroundSync();
}

export async function duplicateSession(
  sourceSessionId: string,
  clientId: string,
  date: string,
  startTime: string,
  endTime?: string,
): Promise<string> {
  const source = await db.sessions.get(sourceSessionId);
  if (!source) {
    throw new Error('Source session not found.');
  }
  const exercises = await getSessionExercises(sourceSessionId);

  return createSession({
    client_id: clientId,
    plan_id: source.plan_id,
    date,
    start_time: startTime,
    end_time: endTime,
    duration_minutes: getSessionDurationMinutes({
      start_time: startTime,
      end_time: endTime,
      duration_minutes: source.duration_minutes,
    }),
    day_name: toDayName(date),
    focus: source.focus,
    type: source.type,
    measure_reminder: source.measure_reminder,
    exercises: exercises.map((exercise) => ({
      name: exercise.name,
      reps: exercise.target_reps,
      target_sets: exercise.target_sets,
    })),
  });
}
