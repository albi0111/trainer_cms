// ─────────────────────────────────────────────────────────────────────────────
// Exercise Service — Immutable exercise tracking
// Source of truth: resrc/system_prompt.md §2.7, §12 (R25)
// ─────────────────────────────────────────────────────────────────────────────

import { getDB } from '../db/database';
import { Exercise } from '../../types';
import { generateId } from '../../utils/id';
import { nowISO } from '../../utils/date';
import { enqueueClientUpdate } from '../sync/syncQueueService';

/**
 * Adds an exercise to a session.
 */
export async function addExercise(
  clientId: string,
  data: Omit<Exercise, 'id' | 'created_at'>
): Promise<string> {
  const db = getDB();
  const id = generateId();
  const now = nowISO();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO exercises (
        id, session_id, name, order_index, target_sets, target_reps, notes, sets_json, progression_note, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.session_id, data.name, data.order_index, data.target_sets ?? null, data.target_reps ?? null, data.notes ?? null, JSON.stringify(data.sets), data.progression_note ?? null, now]
    );

    // Update client version
    await db.runAsync(
      'UPDATE clients SET version = version + 1, updated_at = ? WHERE id = ?',
      [now, clientId]
    );

    await enqueueClientUpdate(clientId, ['exercises'], db);
  });

  return id;
}

/**
 * Modifies an exercise (Immutability Pattern).
 * §Rule R25: Exercise rows are immutable after creation. 
 * Corrections use delete-and-reinsert, never UPDATE.
 */
export async function updateExercise(
  clientId: string,
  oldExerciseId: string,
  newData: Omit<Exercise, 'id' | 'created_at'>
): Promise<string> {
  const db = getDB();
  const newId = generateId();
  const now = nowISO();

  await db.withTransactionAsync(async () => {
    // 1. DELETE old record
    await db.runAsync('DELETE FROM exercises WHERE id = ?', [oldExerciseId]);

    // 2. INSERT new record with new ID
    await db.runAsync(
      `INSERT INTO exercises (
        id, session_id, name, order_index, target_sets, target_reps, notes, sets_json, progression_note, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [newId, newData.session_id, newData.name, newData.order_index, newData.target_sets ?? null, newData.target_reps ?? null, newData.notes ?? null, JSON.stringify(newData.sets), newData.progression_note ?? null, now]
    );

    // 3. Update client version
    await db.runAsync(
      'UPDATE clients SET version = version + 1, updated_at = ? WHERE id = ?',
      [now, clientId]
    );

    await enqueueClientUpdate(clientId, ['exercises'], db);
  });

  return newId;
}

/**
 * Fetches exercises for a session.
 */
export async function getExercisesBySession(sessionId: string): Promise<Exercise[]> {
  const db = getDB();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM exercises WHERE session_id = ? ORDER BY order_index ASC',
    [sessionId]
  );

  return rows.map(row => ({
    ...row,
    sets: JSON.parse(row.sets_json)
  }));
}

/**
 * Fetches all exercises for a client.
 */
export async function getExercisesByClient(clientId: string): Promise<Exercise[]> {
  const db = getDB();
  const rows = await db.getAllAsync<any>(
    `SELECT e.* FROM exercises e
     INNER JOIN sessions s ON e.session_id = s.id
     WHERE s.client_id = ?
     ORDER BY e.order_index ASC`,
    [clientId]
  );

  return rows.map(row => ({
    ...row,
    sets: JSON.parse(row.sets_json)
  }));
}

/**
 * Deletes an exercise entirely.
 */
export async function deleteExercise(clientId: string, exerciseId: string): Promise<void> {
  const db = getDB();
  const now = nowISO();

  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM exercises WHERE id = ?', [exerciseId]);

    // Update client version
    await db.runAsync(
      'UPDATE clients SET version = version + 1, updated_at = ? WHERE id = ?',
      [now, clientId]
    );

    await enqueueClientUpdate(clientId, ['exercises'], db);
  });
}
