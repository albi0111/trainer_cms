// ─────────────────────────────────────────────────────────────────────────────
// Session Service — Append-only execution tracking
// Source of truth: resrc/system_prompt.md §2.5, §2.6
// ─────────────────────────────────────────────────────────────────────────────

import { getDB } from '../db/database';
import { Session, SessionResult, MissedReason } from '../../types';
import { generateId } from '../../utils/id';
import { nowISO } from '../../utils/date';
import { enqueueClientUpdate } from '../sync/syncQueueService';
import { validatePlanForSession } from '../plan/planService';

/**
 * Creates a new planned session.
 * Always updates client version and enqueues sync.
 */
export async function createSession(
  data: Omit<Session, 'id' | 'status' | 'created_at' | 'updated_at' | 'missed_reason' | 'missed_note'>
): Promise<string> {
  const db = getDB();
  const id = generateId();
  const now = nowISO();

  await db.withTransactionAsync(async () => {
    // Audit Fix: Plan Integrity Validation
    if (data.plan_id) {
      await validatePlanForSession(data.plan_id);
    }

    await db.runAsync(
      `INSERT INTO sessions (
        id, plan_id, client_id, date, start_time, end_time, duration_minutes, day_name, focus, type, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.plan_id ?? null,
        data.client_id,
        data.date,
        data.start_time ?? null,
        data.end_time ?? null,
        data.duration_minutes ?? null,
        data.day_name,
        data.focus,
        data.type,
        'planned',
        now,
        now
      ]
    );

    await db.runAsync(
      `UPDATE clients SET version = version + 1, updated_at = ? WHERE id = ?`,
      [now, data.client_id]
    );

    await enqueueClientUpdate(data.client_id, ['sessions'], db);
  });

  return id;
}

/**
 * Completes a session.
 * §Rule: Completing session MUST create SessionResult (§2.6).
 * §Rule: SessionResult is only created when status = 'completed'.
 */
export async function completeSession(
  sessionId: string,
  clientId: string,
  result: Omit<SessionResult, 'session_id' | 'completed_at'>
): Promise<void> {
  const db = getDB();
  const now = nowISO();

  await db.withTransactionAsync(async () => {
    // Audit Fix: Guard against double completion/duplicate SessionResult
    const existing = await db.getFirstAsync<{ session_id: string }>(
      'SELECT session_id FROM session_results WHERE session_id = ?',
      [sessionId]
    );
    if (existing) {
      throw new Error('This session is already completed.');
    }

    // 1. Update session status (strictly whitelisted fields only)
    await db.runAsync(
      `UPDATE sessions SET status = 'completed', updated_at = ? WHERE id = ?`,
      [now, sessionId]
    );

    // 2. Insert session result
    await db.runAsync(
      `INSERT INTO session_results (
        session_id, perceived_difficulty, energy_level, performance_notes, trainer_notes, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        sessionId,
        result.perceived_difficulty,
        result.energy_level,
        result.performance_notes ?? null,
        result.trainer_notes ?? null,
        now
      ]
    );

    // 3. Update client version
    await db.runAsync(
      `UPDATE clients SET version = version + 1, updated_at = ? WHERE id = ?`,
      [now, clientId]
    );

    // 4. Enqueue sync for BOTH domains (§5.3 rule: affected_domains collected)
    await enqueueClientUpdate(clientId, ['sessions', 'session_results'], db);
  });
}

/**
 * Marks a session as missed with a mandatory reason.
 */
export async function markSessionMissed(
  sessionId: string,
  clientId: string,
  reason: MissedReason,
  note?: string
): Promise<void> {
  // §Validation rule: missed_note REQUIRED if reason = 'other'
  if (reason === 'other' && (!note || note.trim() === '')) {
    throw new Error('A note is required for reason "other".');
  }

  const db = getDB();
  const now = nowISO();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE sessions SET 
        status = 'missed', 
        missed_reason = ?, 
        missed_note = ?, 
        updated_at = ? 
       WHERE id = ?`,
      [reason, note ?? null, now, sessionId]
    );

    await db.runAsync(
      `UPDATE clients SET version = version + 1, updated_at = ? WHERE id = ?`,
      [now, clientId]
    );

    await enqueueClientUpdate(clientId, ['sessions'], db);
  });
}

/**
 * Fetches sessions for a client.
 */
export async function getSessionsByClient(clientId: string): Promise<any[]> {
  const db = getDB();
  return await db.getAllAsync<any>(
    `SELECT s.*, p.title as plan_title, p.goal as plan_goal
     FROM sessions s 
     LEFT JOIN plans p ON s.plan_id = p.id
     WHERE s.client_id = ? 
     ORDER BY s.date DESC, s.created_at DESC`,
    [clientId]
  );
}

/**
 * Updates an existing session's details.
 * §Rule: Always updates client version and enqueues sync.
 */
export async function updateSession(
  sessionId: string,
  clientId: string,
  data: Partial<Omit<Session, 'id' | 'client_id' | 'created_at' | 'updated_at'>>
): Promise<void> {
  const db = getDB();
  const now = nowISO();

  // Build dynamic update query
  const fields: string[] = [];
  const values: any[] = [];
  
  if (data.date !== undefined) { fields.push('date = ?'); values.push(data.date); }
  if (data.start_time !== undefined) { fields.push('start_time = ?'); values.push(data.start_time); }
  if (data.end_time !== undefined) { fields.push('end_time = ?'); values.push(data.end_time); }
  if (data.duration_minutes !== undefined) { fields.push('duration_minutes = ?'); values.push(data.duration_minutes); }
  if (data.focus !== undefined) { fields.push('focus = ?'); values.push(data.focus); }
  if (data.type !== undefined) { fields.push('type = ?'); values.push(data.type); }
  if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
  if (data.postponed_note !== undefined) { fields.push('postponed_note = ?'); values.push(data.postponed_note); }
  if (data.notes !== undefined) { fields.push('notes = ?'); values.push(data.notes); }

  if (fields.length === 0) return;

  fields.push('updated_at = ?');
  values.push(now);
  values.push(sessionId);

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE sessions SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    await db.runAsync(
      `UPDATE clients SET version = version + 1, updated_at = ? WHERE id = ?`,
      [now, clientId]
    );

    await enqueueClientUpdate(clientId, ['sessions'], db);
  });
}

/**
 * Postpones a session to a new date/time with a note.
 */
export async function postponeSession(
  sessionId: string,
  clientId: string,
  newDate: string,
  newTime: string | null,
  newEndTime: string | null,
  note: string | null
): Promise<void> {
  return updateSession(sessionId, clientId, {
    date: newDate,
    start_time: newTime ?? undefined,
    end_time: newEndTime ?? undefined,
    postponed_note: note ?? undefined
  });
}

/**
 * Deletes a session explicitly (e.g. Remove Day).
 */
export async function deleteSession(sessionId: string, clientId: string): Promise<void> {
  const db = getDB();
  const now = nowISO();

  await db.withTransactionAsync(async () => {
    await db.runAsync(`DELETE FROM exercises WHERE session_id = ?`, [sessionId]); // cascade delete exercises
    await db.runAsync(`DELETE FROM sessions WHERE id = ?`, [sessionId]);

    await db.runAsync(
      `UPDATE clients SET version = version + 1, updated_at = ? WHERE id = ?`,
      [now, clientId]
    );

    await enqueueClientUpdate(clientId, ['sessions', 'exercises'], db);
  });
}

