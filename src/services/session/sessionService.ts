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
        id, plan_id, client_id, date, day_name, focus, type, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.plan_id ?? null,
        data.client_id,
        data.date,
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

    await enqueueClientUpdate(data.client_id, ['sessions']);
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
    await enqueueClientUpdate(clientId, ['sessions', 'session_results']);
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

    await enqueueClientUpdate(clientId, ['sessions']);
  });
}

/**
 * Fetches sessions for a client.
 */
export async function getSessionsByClient(clientId: string): Promise<Session[]> {
  const db = getDB();
  return await db.getAllAsync<Session>(
    `SELECT * FROM sessions WHERE client_id = ? ORDER BY date DESC, created_at DESC`,
    [clientId]
  );
}
