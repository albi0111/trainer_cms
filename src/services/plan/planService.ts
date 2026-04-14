// ─────────────────────────────────────────────────────────────────────────────
// Plan Service — Flat hierarchical plan management
// Source of truth: resrc/system_prompt.md §2.4
// ─────────────────────────────────────────────────────────────────────────────

import { getDB } from '../db/database';
import { Plan } from '../../types';
import { generateId } from '../../utils/id';
import { nowISO } from '../../utils/date';
import { enqueueClientUpdate } from '../sync/syncQueueService';

/**
 * Creates a monthly container plan.
 * §Rule: Monthly plans have NO sessions. Only weekly plans own sessions.
 */
export async function createMonthlyPlan(
  clientId: string,
  title: string,
  goal: string,
  startDate: string,
  endDate: string
): Promise<string> {
  const db = getDB();
  const id = generateId();
  const now = nowISO();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO plans (
        id, client_id, type, title, goal, start_date, end_date, 
        parent_plan_id, order_index, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, clientId, 'monthly', title, goal, startDate, endDate, null, null, 'upcoming', now, now]
    );

    await db.runAsync(
      `UPDATE clients SET version = version + 1, updated_at = ? WHERE id = ?`,
      [now, clientId]
    );

    await enqueueClientUpdate(clientId, ['plans']);
  });

  return id;
}

/**
 * Creates a weekly plan under a monthly parent.
 * §Rule: weekly must have monthly parent (logical hierarchy).
 * §Rule: order_index required for weekly plans.
 */
export async function createWeeklyPlan(
  clientId: string,
  parentPlanId: string,
  title: string,
  goal: string,
  startDate: string,
  endDate: string,
  orderIndex: number
): Promise<string> {
  const db = getDB();
  const id = generateId();
  const now = nowISO();

  await db.withTransactionAsync(async () => {
    // 1. Validate parent is monthly
    const parent = await db.getFirstAsync<Plan>(
      'SELECT type FROM plans WHERE id = ?',
      [parentPlanId]
    );

    if (!parent || parent.type !== 'monthly') {
      throw new Error('Weekly plans must have a valid Monthly parent plan.');
    }

    // 2. Insert weekly plan
    await db.runAsync(
      `INSERT INTO plans (
        id, client_id, type, title, goal, start_date, end_date, 
        parent_plan_id, order_index, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, clientId, 'weekly', title, goal, startDate, endDate, parentPlanId, orderIndex, 'upcoming', now, now]
    );

    await db.runAsync(
      `UPDATE clients SET version = version + 1, updated_at = ? WHERE id = ?`,
      [now, clientId]
    );

    await enqueueClientUpdate(clientId, ['plans']);
  });

  return id;
}

/**
 * Fetches all plans for a client.
 */
export async function getPlansByClient(clientId: string): Promise<Plan[]> {
  const db = getDB();
  return await db.getAllAsync<Plan>(
    'SELECT * FROM plans WHERE client_id = ? ORDER BY type DESC, start_date ASC', 
    [clientId]
  );
}

/**
 * Helper to fetch weekly plans for a specific monthly plan.
 */
export async function getWeeklyPlansByMonthly(monthlyPlanId: string): Promise<Plan[]> {
  const db = getDB();
  return await db.getAllAsync<Plan>(
    'SELECT * FROM plans WHERE parent_plan_id = ? AND type = "weekly" ORDER BY order_index ASC',
    [monthlyPlanId]
  );
}
