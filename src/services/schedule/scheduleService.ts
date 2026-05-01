import { db } from '../../db/db';
import type { ScheduledSession, Session } from '../../types';
import { compareDateTimes, todayLocalIso } from '../shared/date';

const CALENDAR_WEEKS_BEFORE = 26;
const CALENDAR_WEEKS_AFTER = 26;

function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function startOfWeek(date: Date): Date {
  const next = new Date(date);
  next.setHours(12, 0, 0, 0);
  next.setDate(next.getDate() - next.getDay());
  return next;
}

function getSessionEndMillis(session: Pick<Session, 'date' | 'start_time' | 'end_time' | 'duration_minutes'>): number {
  if (session.end_time) {
    return compareDateTimes(session.date, session.end_time);
  }

  if (session.start_time) {
    return compareDateTimes(session.date, session.start_time) + ((session.duration_minutes || 60) * 60 * 1000);
  }

  return compareDateTimes(session.date);
}

async function mapScheduledSessions(sessions: Session[]): Promise<ScheduledSession[]> {
  const clients = await db.clients.bulkGet(sessions.map((session) => session.client_id));
  const clientsById = new Map(clients.filter(Boolean).map((client) => [client!.id, client!]));

  return sessions
    .map((session) => ({
      ...session,
      client_name: clientsById.get(session.client_id)?.name || 'Unknown Client',
    }))
    .sort((left, right) => compareDateTimes(left.date, left.start_time) - compareDateTimes(right.date, right.start_time));
}

export function getPlannerScheduleRange(anchorDate = todayLocalIso()): { startDate: string; endDate: string } {
  const targetWeekStart = startOfWeek(new Date(`${anchorDate}T12:00:00`));
  const startDate = addDays(targetWeekStart, -(CALENDAR_WEEKS_BEFORE * 7));
  const endDate = addDays(startDate, ((CALENDAR_WEEKS_BEFORE + CALENDAR_WEEKS_AFTER + 1) * 7) - 1);

  return {
    startDate: todayLocalIso(startDate),
    endDate: todayLocalIso(endDate),
  };
}

export async function getScheduleByDate(date: string): Promise<ScheduledSession[]> {
  const sessions = await db.sessions.where('date').equals(date).toArray();
  const plannedSessions = sessions.filter((session) => session.status === 'planned');
  return mapScheduledSessions(plannedSessions);
}

export async function getGlobalScheduleForDateRange(startDate: string, endDate: string): Promise<ScheduledSession[]> {
  const sessions = await db.sessions.where('date').between(startDate, endDate, true, true).toArray();
  const plannedSessions = sessions.filter((session) => session.status === 'planned');
  return mapScheduledSessions(plannedSessions);
}

export async function getMonthSchedule(startDate: string, endDate: string): Promise<ScheduledSession[]> {
  return getGlobalScheduleForDateRange(startDate, endDate);
}

export async function checkSessionOverlap(
  date: string,
  startTime: string,
  endTime: string,
  excludeSessionId?: string,
): Promise<ScheduledSession | null> {
  const sessions = await getScheduleByDate(date);
  const start = compareDateTimes(date, startTime);
  const end = compareDateTimes(date, endTime);

  for (const session of sessions) {
    if (excludeSessionId && session.id === excludeSessionId) {
      continue;
    }

    const sessionStart = compareDateTimes(session.date, session.start_time);
    const sessionEnd = getSessionEndMillis(session);

    if (start < sessionEnd && end > sessionStart) {
      return session;
    }
  }

  return null;
}
