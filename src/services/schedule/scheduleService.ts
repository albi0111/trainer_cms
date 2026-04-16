import { getDB } from '../db/database';
import { Session } from '../../types';

export interface ScheduledSession extends Session {
  client_name: string;
}

/**
 * Returns all planned sessions across ALL clients for a specific date.
 * Used to check schedule conflicts when plotting or postponing a session.
 */
export async function getGlobalScheduleForDate(date: string): Promise<ScheduledSession[]> {
  const db = getDB();
  return await db.getAllAsync<ScheduledSession>(
    `SELECT 
        s.id, s.client_id, s.plan_id, s.date, s.start_time, s.end_time, 
        s.duration_minutes, s.day_name, s.focus, s.type, s.status, 
        s.postponed_note, s.notes, s.created_at, s.updated_at,
        c.name as client_name 
     FROM sessions s 
     JOIN clients c ON s.client_id = c.id
     WHERE s.date = ? 
       AND s.status = 'planned' 
       AND s.start_time IS NOT NULL 
     ORDER BY s.start_time ASC`,
    [date]
  );
}

/**
 * Returns all planned sessions across ALL clients for a date range.
 * Useful for building a weekly calendar view.
 */
export async function getGlobalScheduleForDateRange(startDate: string, endDate: string): Promise<ScheduledSession[]> {
  const db = getDB();
  return await db.getAllAsync<ScheduledSession>(
    `SELECT 
        s.id, s.client_id, s.plan_id, s.date, s.start_time, s.end_time, 
        s.duration_minutes, s.day_name, s.focus, s.type, s.status, 
        s.postponed_note, s.notes, s.created_at, s.updated_at,
        c.name as client_name 
     FROM sessions s 
     JOIN clients c ON s.client_id = c.id
     WHERE s.date >= ? AND s.date <= ? 
       AND s.status = 'planned'
       AND s.start_time IS NOT NULL
     ORDER BY s.date ASC, s.start_time ASC`,
    [startDate, endDate]
  );
}

/**
 * Checks if a given time slot overlaps with any existing planned sessions globally.
 * Returns the first conflicting session if found, else null.
 */
export async function checkSessionOverlap(
  date: string,
  startTime: string,
  endTime: string,
  excludeSessionId?: string
): Promise<ScheduledSession | null> {
  const db = getDB();
  const conflicts = await db.getAllAsync<ScheduledSession>(
    `SELECT 
        s.id, s.client_id, s.plan_id, s.date, s.start_time, s.end_time, 
        s.duration_minutes, s.day_name, s.focus, s.type, s.status, 
        s.postponed_note, s.notes, s.created_at, s.updated_at,
        c.name as client_name 
     FROM sessions s 
     JOIN clients c ON s.client_id = c.id
     WHERE s.date = ? 
       AND s.status = 'planned'
       AND s.start_time IS NOT NULL 
       AND s.end_time IS NOT NULL
       AND s.id != ?
       AND (
         (s.start_time < ? AND s.end_time > ?)
       )`,
    [date, excludeSessionId || 'NONE', endTime, startTime]
  );

  return conflicts.length > 0 ? conflicts[0] : null;
}

