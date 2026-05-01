import { db } from '../../db/db';
import type { DietPlan, Plan } from '../../types';
import { generateId } from '../../utils/id';
import { nowIsoUtc } from '../shared/date';
import { enqueueClientUpdate } from '../sync/syncQueueService';
import { scheduleBackgroundSync } from '../sync/syncService';

async function touchClient(clientId: string, now: string): Promise<void> {
  await db.clients.update(clientId, (client) => {
    if (!client) {
      return;
    }
    client.version += 1;
    client.updated_at = now;
    if (client.sync_status !== 'pending_delete') {
      client.sync_status = 'pending';
    }
  });
}

export async function validatePlanForSession(planId: string): Promise<void> {
  const plan = await db.plans.get(planId);
  if (!plan) {
    throw new Error('Reference plan does not exist.');
  }
  if (plan.type !== 'weekly') {
    throw new Error('Sessions can only be linked to weekly plans.');
  }
}

export async function createMonthlyPlan(
  clientId: string,
  title: string,
  goal: string,
  startDateArg?: string,
): Promise<string> {
  const id = generateId();
  const now = nowIsoUtc();
  const startDate = startDateArg || now.split('T')[0] || '';
  const endDate = new Date(new Date(startDate).getTime() + 27 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0] || '';

  await db.transaction('rw', db.plans, db.clients, db.syncQueue, async () => {
    await db.plans.put({
      id,
      client_id: clientId,
      type: 'monthly',
      title,
      goal,
      start_date: startDate,
      end_date: endDate,
      parent_plan_id: null,
      order_index: null,
      status: 'upcoming',
      created_at: now,
      updated_at: now,
    });

    for (let index = 1; index <= 4; index += 1) {
      const weekStart = new Date(new Date(startDate).getTime() + (index - 1) * 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0] || '';
      const weekEnd = new Date(new Date(startDate).getTime() + (index * 7 - 1) * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0] || '';

      await db.plans.put({
        id: generateId(),
        client_id: clientId,
        type: 'weekly',
        title: `Week ${index}`,
        goal: '',
        start_date: weekStart,
        end_date: weekEnd,
        parent_plan_id: id,
        order_index: index,
        status: 'upcoming',
        created_at: now,
        updated_at: now,
      });
    }

    await touchClient(clientId, now);
    await enqueueClientUpdate(clientId, ['plans']);
  });

  void scheduleBackgroundSync();
  return id;
}

export async function createWeeklyPlan(
  clientId: string,
  title: string,
  goal: string,
  startDate: string,
  parentPlanId: string | null = null,
  orderIndex: number | null = null,
): Promise<string> {
  const id = generateId();
  const now = nowIsoUtc();
  const endDate = new Date(new Date(startDate).getTime() + 6 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0] || '';

  await db.transaction('rw', db.plans, db.clients, db.syncQueue, async () => {
    if (parentPlanId) {
      const parent = await db.plans.get(parentPlanId);
      if (!parent || parent.type !== 'monthly') {
        throw new Error('Weekly plans must belong to a monthly plan.');
      }
    }

    await db.plans.put({
      id,
      client_id: clientId,
      type: 'weekly',
      title,
      goal,
      start_date: startDate,
      end_date: endDate,
      parent_plan_id: parentPlanId,
      order_index: orderIndex,
      status: 'upcoming',
      created_at: now,
      updated_at: now,
    });

    await touchClient(clientId, now);
    await enqueueClientUpdate(clientId, ['plans']);
  });

  void scheduleBackgroundSync();
  return id;
}

export async function updatePlan(
  planId: string,
  clientId: string,
  input: Partial<Pick<Plan, 'title' | 'goal' | 'status'>>,
): Promise<void> {
  const now = nowIsoUtc();
  await db.transaction('rw', db.plans, db.clients, db.syncQueue, async () => {
    await db.plans.update(planId, {
      ...input,
      updated_at: now,
    });
    await touchClient(clientId, now);
    await enqueueClientUpdate(clientId, ['plans']);
  });

  void scheduleBackgroundSync();
}

export async function getPlansByClient(clientId: string): Promise<Plan[]> {
  return db.plans.where('client_id').equals(clientId).sortBy('start_date');
}

export async function deletePlan(planId: string, clientId: string): Promise<void> {
  const now = nowIsoUtc();
  await db.transaction(
    'rw',
    [
      db.plans,
      db.sessions,
      db.sessionResults,
      db.exercises,
      db.clients,
      db.syncQueue,
    ],
    async () => {
      const childPlans = await db.plans.where('parent_plan_id').equals(planId).toArray();
      const affectedPlanIds = [planId, ...childPlans.map((plan) => plan.id)];
      const sessions = affectedPlanIds.length > 0
        ? await db.sessions.where('plan_id').anyOf(affectedPlanIds).toArray()
        : [];

      for (const session of sessions) {
        await db.sessionResults.delete(session.id);
      }
      if (sessions.length > 0) {
        await db.exercises.where('session_id').anyOf(sessions.map((session) => session.id)).delete();
        await db.sessions.bulkDelete(sessions.map((session) => session.id));
      }

      await db.plans.bulkDelete(affectedPlanIds);
      await touchClient(clientId, now);
      await enqueueClientUpdate(clientId, ['plans', 'sessions', 'session_results', 'exercises']);
    },
  );

  void scheduleBackgroundSync();
}

export async function getDietPlansByClient(clientId: string): Promise<DietPlan[]> {
  return db.dietPlans.where('client_id').equals(clientId).toArray();
}

export async function saveDietPlan(
  clientId: string,
  input: Partial<Omit<DietPlan, 'id' | 'client_id' | 'created_at' | 'updated_at'>>,
  existingPlanId?: string,
): Promise<string> {
  const now = nowIsoUtc();
  const id = existingPlanId || generateId();

  await db.transaction('rw', db.dietPlans, db.clients, db.syncQueue, async () => {
    const existing = existingPlanId ? await db.dietPlans.get(existingPlanId) : null;
    await db.dietPlans.put({
      id,
      client_id: clientId,
      title: input.title ?? existing?.title ?? '',
      goal: input.goal ?? existing?.goal ?? '',
      start_date: input.start_date ?? existing?.start_date,
      end_date: input.end_date ?? existing?.end_date,
      calories: input.calories ?? existing?.calories,
      protein_g: input.protein_g ?? existing?.protein_g,
      carbs_g: input.carbs_g ?? existing?.carbs_g,
      fats_g: input.fats_g ?? existing?.fats_g,
      water_liters: input.water_liters ?? existing?.water_liters,
      meals: input.meals ?? existing?.meals ?? [],
      meal_notes: input.meal_notes ?? existing?.meal_notes,
      notes: input.notes ?? existing?.notes,
      created_at: existing?.created_at || now,
      updated_at: now,
    });

    await touchClient(clientId, now);
    await enqueueClientUpdate(clientId, ['diet_plans']);
  });

  void scheduleBackgroundSync();
  return id;
}
