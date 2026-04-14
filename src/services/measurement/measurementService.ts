// ─────────────────────────────────────────────────────────────────────────────
// Measurement Service — Append-only progress tracking
// Source of truth: resrc/system_prompt.md §2.3
// ─────────────────────────────────────────────────────────────────────────────

import { getDB } from '../db/database';
import { Measurement } from '../../types';
import { generateId } from '../../utils/id';
import { nowISO, isValidDate } from '../../utils/date';
import { enqueueClientUpdate } from '../sync/syncQueueService';

/**
 * Adds a new measurement record.
 * §Rule 2.3: Measurements are append-only.Past entries are NEVER mutated.
 * §Rule: UNIQUE(client_id, date) enforced at DB level.
 */
export async function addMeasurement(
  clientId: string,
  data: Omit<Measurement, 'id' | 'client_id' | 'created_at'>
): Promise<void> {
  // Audit Fix: Strict date format enforcement
  if (!isValidDate(data.date)) {
    throw new Error('Measurements must use a valid YYYY-MM-DD date format.');
  }

  const db = getDB();
  const id = generateId();
  const now = nowISO();

  await db.withTransactionAsync(async () => {
    // 1. Insert measurement
    // If (clientId, data.date) already exists, this will throw a SQLITE_CONSTRAINT error
    await db.runAsync(
      `INSERT INTO measurements (
        id, client_id, date, weight_kg, body_fat_pct, chest_cm, waist_cm, hips_cm, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        clientId,
        data.date,
        data.weight_kg,
        data.body_fat_pct ?? null,
        data.chest_cm ?? null,
        data.waist_cm ?? null,
        data.hips_cm ?? null,
        data.notes ?? null,
        now
      ]
    );

    // 2. Update client version (§2.1 / §5.3)
    await db.runAsync(
      `UPDATE clients SET version = version + 1, updated_at = ? WHERE id = ?`,
      [now, clientId]
    );

    // 3. Enqueue sync for 'measurements' domain
    await enqueueClientUpdate(clientId, ['measurements']);
  });
}

/**
 * Fetches all measurements for a client, ordered by date DESC.
 */
export async function getMeasurements(clientId: string): Promise<Measurement[]> {
  const db = getDB();
  return await db.getAllAsync<Measurement>(
    `SELECT * FROM measurements WHERE client_id = ? ORDER BY date DESC`,
    [clientId]
  );
}
