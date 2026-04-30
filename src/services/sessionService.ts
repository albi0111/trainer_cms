import { db } from '../db/db';
import type { Session, SessionResult } from '../types';
import { nowISO } from '../utils/date';
import type { CompleteSessionData } from '../components/client/CompleteSessionModal';
import type { MarkMissedData } from '../components/client/MarkMissedModal';

export interface SessionActivityEntry {
  id: string;
  date: string;
  focus: string;
  start_time: string;
  duration_minutes: number;
  status: 'completed' | 'missed';
  energy_level?: number;
  perceived_difficulty?: number;
  performance_notes?: string;
  missed_reason?: string;
  missed_note?: string;
}

export function getSessionDurationMinutes(
  session: Pick<Session, 'start_time' | 'end_time' | 'duration_minutes'>,
): number {
  if (session.start_time && session.end_time) {
    const startParts = session.start_time.split(':').map(Number);
    const endParts = session.end_time.split(':').map(Number);

    if (startParts.length === 2 && endParts.length === 2) {
      const [startHour, startMinute] = startParts;
      const [endHour, endMinute] = endParts;

      if (
        startHour !== undefined &&
        startMinute !== undefined &&
        endHour !== undefined &&
        endMinute !== undefined &&
        Number.isFinite(startHour) &&
        Number.isFinite(startMinute) &&
        Number.isFinite(endHour) &&
        Number.isFinite(endMinute)
      ) {
        const startTotal = startHour * 60 + startMinute;
        const endTotal = endHour * 60 + endMinute;
        const diff = endTotal - startTotal;

        if (diff > 0) {
          return diff;
        }
      }
    }
  }

  return session.duration_minutes || 60;
}

export function getSessionEnd(
  session: Pick<Session, 'date' | 'start_time' | 'end_time' | 'duration_minutes'>,
): Date | null {
  if (!session.start_time) {
    return null;
  }

  if (session.end_time) {
    return new Date(`${session.date}T${session.end_time}:00`);
  }

  const sessionEnd = new Date(`${session.date}T${session.start_time}:00`);
  sessionEnd.setMinutes(sessionEnd.getMinutes() + getSessionDurationMinutes(session));
  return sessionEnd;
}

export function partitionPlannedSessions(sessions: Session[]): {
  upcoming: Session[];
  pending: Session[];
} {
  const now = new Date();
  const upcoming: Session[] = [];
  const pending: Session[] = [];

  sessions
    .filter((session) => session.status === 'planned')
    .forEach((session) => {
      const sessionEnd = getSessionEnd(session);

      if (sessionEnd && now > sessionEnd) {
        pending.push(session);
        return;
      }

      upcoming.push(session);
    });

  return {
    upcoming: upcoming.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    pending: pending.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
  };
}

export async function buildRecentActivities(sessions: Session[]): Promise<SessionActivityEntry[]> {
  const activitySessions = sessions.filter(
    (session): session is Session & { status: 'completed' | 'missed' } =>
      session.status === 'completed' || session.status === 'missed',
  );

  const results = activitySessions.length > 0
    ? await db.sessionResults.bulkGet(activitySessions.map((session) => session.id))
    : [];

  const resultsBySessionId = new Map<string, SessionResult>();
  results.forEach((result) => {
    if (result) {
      resultsBySessionId.set(result.session_id, result);
    }
  });

  return activitySessions
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
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function completeSession(sessionId: string, data: CompleteSessionData): Promise<void> {
  const now = nowISO();
  const session = await db.sessions.get(sessionId);
  const existingResult = await db.sessionResults.get(sessionId);

  if (existingResult) {
    throw new Error('This session is already completed.');
  }

  let performanceNotes = data.performanceNotes || undefined;
  if (session?.original_date) {
    const postponeInfo = `session postponded from ${session.original_date}, ressoin - ${session.postponed_note || 'N/A'}`;
    performanceNotes = performanceNotes
      ? `${postponeInfo}\nsession notes:\n${performanceNotes}`
      : postponeInfo;
  }

  await db.transaction('rw', db.sessions, db.sessionResults, async () => {
    await db.sessions.update(sessionId, { status: 'completed', updated_at: now });
    await db.sessionResults.put({
      session_id: sessionId,
      perceived_difficulty: data.difficulty,
      energy_level: data.energy,
      performance_notes: performanceNotes,
      completed_at: now,
    });
  });
}

export async function markSessionMissed(sessionId: string, data: MarkMissedData): Promise<void> {
  if (data.reason === 'other' && data.note.trim() === '') {
    throw new Error('A note is required for reason "other".');
  }

  await db.sessions.update(sessionId, {
    status: 'missed',
    missed_reason: data.reason,
    missed_note: data.note || undefined,
    updated_at: nowISO(),
  });
}

export async function revertSession(sessionId: string): Promise<void> {
  await db.transaction('rw', db.sessions, db.sessionResults, async () => {
    await db.sessions.update(sessionId, {
      status: 'planned',
      missed_reason: undefined,
      missed_note: undefined,
      postponed_note: undefined,
      updated_at: nowISO(),
    });
    await db.sessionResults.delete(sessionId);
  });
}
