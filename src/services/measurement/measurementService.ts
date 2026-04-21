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
    // Audit Fix: Extract values for legacy columns if present
    const v = data.values || {};
    const customJson = JSON.stringify(v);

    // 1. Insert measurement
    await db.runAsync(
      `INSERT INTO measurements (
        id, client_id, date, weight_kg, height_cm, body_fat_pct, chest_cm, waist_cm, hips_cm, 
        arm_cm, thigh_cm, neck_cm, calf_cm, pull_strength_kg, push_strength_kg, 
        lower_body_strength_kg, cardio_endurance_min, custom_values_json, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        clientId,
        data.date,
        v.weight_kg ?? (data.weight_kg ?? 0.0),
        v.height_cm ?? (data.height_cm ?? null),
        v.body_fat_pct ?? (data.body_fat_pct ?? null),
        v.chest_cm ?? (data.chest_cm ?? null),
        v.waist_cm ?? (data.waist_cm ?? null),
        v.hips_cm ?? (data.hips_cm ?? null),
        v.arm_cm ?? (data.arm_cm ?? null),
        v.thigh_cm ?? (data.thigh_cm ?? null),
        v.neck_cm ?? (data.neck_cm ?? null),
        v.calf_cm ?? (data.calf_cm ?? null),
        v.pull_strength_kg ?? (data.pull_strength_kg ?? null),
        v.push_strength_kg ?? (data.push_strength_kg ?? null),
        v.lower_body_strength_kg ?? (data.lower_body_strength_kg ?? null),
        v.cardio_endurance_min ?? (data.cardio_endurance_min ?? null),
        customJson,
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
    await enqueueClientUpdate(clientId, ['measurements'], db);
  });
}

/**
 * Fetches all measurements for a client, ordered by date DESC.
 * Parses custom_values_json into values helper.
 */
export async function getMeasurements(clientId: string): Promise<Measurement[]> {
  const db = getDB();
  const rows = await db.getAllAsync<Measurement>(
    `SELECT * FROM measurements WHERE client_id = ? ORDER BY date DESC`,
    [clientId]
  );
  
  return rows.map(r => ({
    ...r,
    values: r.custom_values_json ? JSON.parse(r.custom_values_json) : {}
  }));
}

/**
 * Configuration Management — Client Metrics
 */

export async function getClientMeasurementConfigs(clientId: string): Promise<import('../../types').MeasurementConfig[]> {
  const db = getDB();
  const configs = await db.getAllAsync<import('../../types').MeasurementConfig>(
    `SELECT * FROM client_measurement_configs WHERE client_id = ? ORDER BY category, label`,
    [clientId]
  );
  
  // If no configs, prepopulate with defaults (§Rule: User feedback)
  if (configs.length === 0) {
    await prepopulateDefaultConfigs(clientId);
    return await getClientMeasurementConfigs(clientId);
  }
  
  return configs;
}

export async function updateClientMeasurementConfig(
  clientId: string, 
  config: Omit<import('../../types').MeasurementConfig, 'client_id' | 'updated_at'>
): Promise<void> {
  const db = getDB();
  const now = nowISO();
  
  await db.runAsync(
    `INSERT INTO client_measurement_configs (client_id, key, label, unit, category, target_min, target_max, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(client_id, key) DO UPDATE SET 
      label=excluded.label, unit=excluded.unit, category=excluded.category, 
      target_min=excluded.target_min, target_max=excluded.target_max, updated_at=excluded.updated_at`,
    [clientId, config.key, config.label, config.unit ?? null, config.category, config.target_min ?? null, config.target_max ?? null, now]
  );
}

export async function deleteClientMeasurementConfig(clientId: string, key: string): Promise<void> {
  const db = getDB();
  await db.runAsync(
    `DELETE FROM client_measurement_configs WHERE client_id = ? AND key = ?`,
    [clientId, key]
  );
}

const DEFAULT_METRICS = [
  { key: 'weight_kg', label: 'Weight', unit: 'kg', category: 'body' },
  { key: 'chest_cm', label: 'Chest', unit: 'cm', category: 'body' },
  { key: 'waist_cm', label: 'Waist', unit: 'cm', category: 'body' },
  { key: 'hips_cm', label: 'Hips', unit: 'cm', category: 'body' },
  { key: 'arm_cm', label: 'Arm', unit: 'cm', category: 'body' },
  { key: 'calf_cm', label: 'Calf', unit: 'cm', category: 'body' },
  { key: 'pull_strength_kg', label: 'Pull Strength', unit: 'kg', category: 'performance' },
  { key: 'push_strength_kg', label: 'Push Strength', unit: 'kg', category: 'performance' },
  { key: 'lower_body_strength_kg', label: 'Lower Body', unit: 'kg', category: 'performance' },
  { key: 'cardio_endurance_min', label: 'Cardio', unit: 'min', category: 'performance' },
];

export async function prepopulateDefaultConfigs(clientId: string): Promise<void> {
  const db = getDB();
  const now = nowISO();
  
  await db.withTransactionAsync(async () => {
    for (const m of DEFAULT_METRICS) {
      await db.runAsync(
        `INSERT OR IGNORE INTO client_measurement_configs (client_id, key, label, unit, category, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [clientId, m.key, m.label, m.unit, m.category, now]
      );
    }
  });
}
