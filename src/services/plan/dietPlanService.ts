// ─────────────────────────────────────────────────────────────────────────────
// Diet Plan Service — Data lifecycle for nutritional tracking
// Source of truth: resrc/system_prompt.md §2.10
// ─────────────────────────────────────────────────────────────────────────────

import { getDB } from '../db/database';
import { DietPlan } from '../../types';
import { generateId } from '../../utils/id';
import { nowISO } from '../../utils/date';
import { enqueueClientUpdate } from '../sync/syncQueueService';

/**
 * Creates or updates a diet plan for a client.
 */
export async function saveDietPlan(
  clientId: string,
  data: Omit<DietPlan, 'client_id' | 'created_at' | 'updated_at'>
): Promise<string> {
  const db = getDB();
  const now = nowISO();

  await db.withTransactionAsync(async () => {
    // Check if it's a new plan or update
    const existing = await db.getFirstAsync<{ id: string }>(
      'SELECT id FROM diet_plans WHERE id = ?',
      [data.id]
    );

    if (existing) {
      // UPDATE
      await db.runAsync(
        `UPDATE diet_plans SET 
          title = ?, goal = ?, start_date = ?, end_date = ?, 
          calories = ?, protein_g = ?, carbs_g = ?, fats_g = ?, 
          water_liters = ?, meal_notes = ?, notes = ?, updated_at = ?
         WHERE id = ?`,
        [
          data.title, data.goal, data.start_date ?? null, data.end_date ?? null,
          data.calories ?? null, data.protein_g ?? null, data.carbs_g ?? null, data.fats_g ?? null,
          data.water_liters ?? null, data.meal_notes ?? null, data.notes ?? null, now,
          data.id
        ]
      );
    } else {
      // INSERT
      await db.runAsync(
        `INSERT INTO diet_plans (
          id, client_id, title, goal, start_date, end_date, 
          calories, protein_g, carbs_g, fats_g, water_liters, 
          meal_notes, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.id, clientId, data.title, data.goal, data.start_date ?? null, data.end_date ?? null,
          data.calories ?? null, data.protein_g ?? null, data.carbs_g ?? null, data.fats_g ?? null,
          data.water_liters ?? null, data.meal_notes ?? null, data.notes ?? null, now, now
        ]
      );
    }

    // Update client version
    await db.runAsync(
      'UPDATE clients SET version = version + 1, updated_at = ? WHERE id = ?',
      [now, clientId]
    );

    await enqueueClientUpdate(clientId, ['diet_plans']);
  });

  return data.id;
}

/**
 * Fetches diet plans for a client.
 */
export async function getDietPlansByClient(clientId: string): Promise<DietPlan[]> {
  const db = getDB();
  return await db.getAllAsync<DietPlan>(
    'SELECT * FROM diet_plans WHERE client_id = ? ORDER BY created_at DESC',
    [clientId]
  );
}
