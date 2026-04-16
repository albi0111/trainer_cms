import { getDB } from '../db/database';
import { Plan, Session } from '../../types';
import { generateId } from '../../utils/id';
import { nowISO } from '../../utils/date';
import { enqueueClientUpdate } from '../sync/syncQueueService';

/**
 * Validates plan-session integrity.
 * §Rule: Session.plan_id MUST reference ONLY weekly plans.
 */
export async function validatePlanForSession(planId: string): Promise<void> {
  const db = getDB();
  const plan = await db.getFirstAsync<{ type: string }>(
    'SELECT type FROM plans WHERE id = ?',
    [planId]
  );
  if (!plan) throw new Error('Reference plan does not exist.');
  if (plan.type !== 'weekly') {
    throw new Error('Sessions can only be linked to Weekly plans, not Monthly containers.');
  }
}

/**
 * Creates a monthly container plan.
 * §Rule: Monthly plans have NO sessions. Only weekly plans own sessions.
 */
export async function createMonthlyPlan(
  clientId: string,
  title: string,
  goal: string,
  startDateArg?: string,
  endDateArg?: string
): Promise<string> {
  const db = getDB();
  const id = generateId();
  const now = nowISO();
  
  const startDate = startDateArg || now.split('T')[0];
  const endDate = endDateArg || new Date(new Date(startDate).getTime() + 28 * 24 * 3600 * 1000).toISOString().split('T')[0];

  await db.withTransactionAsync(async () => {
    // 1. Insert Monthly Plan
    await db.runAsync(
      `INSERT INTO plans (
        id, client_id, type, title, goal, start_date, end_date, 
        parent_plan_id, order_index, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, clientId, 'monthly', title, goal, startDate, endDate, null, null, 'upcoming', now, now]
    );

    // 2. Automatically generate 4 weekly plans
    const startObj = new Date(startDate);
    for (let i = 1; i <= 4; i++) {
      const weekId = generateId();
      const weekStart = new Date(startObj.getTime() + (i - 1) * 7 * 24 * 3600 * 1000).toISOString().split('T')[0];
      const weekEnd = new Date(startObj.getTime() + (i * 7 - 1) * 24 * 3600 * 1000).toISOString().split('T')[0];
      
      await db.runAsync(
        `INSERT INTO plans (
          id, client_id, type, title, goal, start_date, end_date, 
          parent_plan_id, order_index, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [weekId, clientId, 'weekly', `Week ${i}`, '', weekStart, weekEnd, id, i, 'upcoming', now, now]
      );
    }

    await db.runAsync(
      `UPDATE clients SET version = version + 1, updated_at = ? WHERE id = ?`,
      [now, clientId]
    );

    await enqueueClientUpdate(clientId, ['plans']);
  });

  return id;
}

/**
 * Updates an existing plan's title and goal.
 */
export async function updatePlan(
  planId: string,
  clientId: string,
  data: Partial<Pick<Plan, 'title' | 'goal' | 'status'>>
): Promise<void> {
  const db = getDB();
  const now = nowISO();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'UPDATE plans SET title = COALESCE(?, title), goal = COALESCE(?, goal), status = COALESCE(?, status), updated_at = ? WHERE id = ?',
      [data.title ?? null, data.goal ?? null, data.status ?? null, now, planId]
    );

    await db.runAsync(
      'UPDATE clients SET version = version + 1, updated_at = ? WHERE id = ?',
      [now, clientId]
    );

    await enqueueClientUpdate(clientId, ['plans']);
  });
}

/**
 * Creates a weekly plan under a monthly parent.
 * §Rule: weekly must have monthly parent (logical hierarchy).
 * §Rule: order_index required for weekly plans.
 */
export async function createWeeklyPlan(
  clientId: string,
  parentPlanId: string | null,
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
    // 1. Validate parent is monthly if provided
    if (parentPlanId) {
      const parent = await db.getFirstAsync<Plan>(
        'SELECT type FROM plans WHERE id = ?',
        [parentPlanId]
      );

      if (!parent || parent.type !== 'monthly') {
        throw new Error('Weekly plans must have a valid Monthly parent plan if linked.');
      }
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
 * Deletes a plan and all its children/associated data.
 * §Rule: Deleting Monthly → Delete all child Weekly plans → Delete all associated Sessions.
 * §Rule: Deleting Weekly → Delete all associated Sessions.
 */
export async function deletePlan(planId: string, clientId: string): Promise<void> {
  const db = getDB();
  const now = nowISO();

  await db.withTransactionAsync(async () => {
    // 1. Determine plan type
    const plan = await db.getFirstAsync<{ type: string }>(
      'SELECT type FROM plans WHERE id = ?',
      [planId]
    );
    if (!plan) return;

    if (plan.type === 'monthly') {
      // Find all child weekly plans
      const weeklyPlans = await db.getAllAsync<{ id: string }>(
        'SELECT id FROM plans WHERE parent_plan_id = ? AND type = "weekly"',
        [planId]
      );
      const weeklyIds = weeklyPlans.map(wp => wp.id);

      if (weeklyIds.length > 0) {
        const placeholders = weeklyIds.map(() => '?').join(',');
        // Delete sessions belonging to these weeks
        await db.runAsync(`DELETE FROM sessions WHERE plan_id IN (${placeholders})`, weeklyIds);
        // Delete weekly plans
        await db.runAsync(`DELETE FROM plans WHERE parent_plan_id = ?`, [planId]);
      }
    } else {
      // Deleting a single weekly plan -> delete its sessions
      await db.runAsync('DELETE FROM sessions WHERE plan_id = ?', [planId]);
    }

    // 2. Delete the plan itself
    await db.runAsync('DELETE FROM plans WHERE id = ?', [planId]);

    // 3. Update client version
    await db.runAsync(
      'UPDATE clients SET version = version + 1, updated_at = ? WHERE id = ?',
      [now, clientId]
    );

    // 4. Enqueue sync for affected domains
    await enqueueClientUpdate(clientId, ['plans', 'sessions']);
  });
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
