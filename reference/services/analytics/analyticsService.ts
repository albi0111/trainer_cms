// ─────────────────────────────────────────────────────────────────────────────
// Analytics Service — Pure derived metrics
// Source of truth: resrc/system_prompt.md §7
// ─────────────────────────────────────────────────────────────────────────────

import { getDB } from '../db/database';
import { ClientStatus } from '../../types';

/**
 * Derives the current client status based on session activity and plans.
 * §Rule 2.12 & §7.1: Status is ALWAYS derived on render.
 */
export async function getClientStatus(clientId: string): Promise<ClientStatus> {
  const db = getDB();
  
  // 1. Fetch last session date
  const lastSession = await db.getFirstAsync<{ date: string }>(
    `SELECT date FROM sessions WHERE client_id = ? AND status = 'completed' 
     ORDER BY date DESC LIMIT 1`,
    [clientId]
  );

  if (!lastSession) return 'active';

  const lastDate = new Date(lastSession.date);
  const now = new Date();
  const diffDays = (now.getTime() - lastDate.getTime()) / (1000 * 3600 * 24);

  // Status Logic FIX: 
  // 1. Recent activity < 30 days -> active
  // 2. No activity > 90 days AND has completed plan -> completed
  // 3. Else -> inactive

  if (diffDays < 7) return 'active';

  if (diffDays >= 90) {
    // Check if any plan is completed (§2.12)
    const completedPlan = await db.getFirstAsync(
      "SELECT id FROM plans WHERE client_id = ? AND status = 'completed' LIMIT 1",
      [clientId]
    );
    if (completedPlan) return 'completed';
  }
  
  return 'inactive';
}

/**
 * Calculates session completion percentage for a client.
 */
export async function getCompletionStats(clientId: string) {
  const db = getDB();
  const stats = await db.getFirstAsync<{ total: number, completed: number }>(
    `SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
     FROM sessions WHERE client_id = ?`,
    [clientId]
  );

  const total = stats?.total || 0;
  const completed = stats?.completed || 0;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { total, completed, percentage };
}

/**
 * Fetches weight trend for charts.
 */
export async function getWeightTrend(clientId: string) {
  const db = getDB();
  return await db.getAllAsync<{ date: string, weight_kg: number }>(
    `SELECT date, weight_kg FROM measurements WHERE client_id = ? 
     ORDER BY date ASC LIMIT 10`,
    [clientId]
  );
}

/**
 * Calculates difficulty trend from session results.
 */
export async function getDifficultyTrend(clientId: string) {
  const db = getDB();
  return await db.getAllAsync<{ date: string, difficulty: number }>(
    `SELECT s.date, r.perceived_difficulty as difficulty 
     FROM sessions s
     JOIN session_results r ON s.id = r.session_id
     WHERE s.client_id = ? AND s.status = 'completed'
     ORDER BY s.date ASC LIMIT 10`,
    [clientId]
  );
}

/**
 * Counts missed sessions and their reasons.
 */
export async function getMissedSessionStats(clientId: string) {
  const db = getDB();
  const rows = await db.getAllAsync<{ reason: string, count: number }>(
    `SELECT missed_reason as reason, COUNT(*) as count 
     FROM sessions WHERE client_id = ? AND status = 'missed'
     GROUP BY missed_reason`,
    [clientId]
  );
  return rows;
}

/**
 * High-performance fetch for the main Dashboard screen.
 * Returns counts and the "Today's Schedule" list.
 */
export async function getDashboardStats() {
  const db = getDB();
  // Use local date string (YYYY-MM-DD) to ensure schedule matches trainer's local day
  const today = new Date().toLocaleDateString('en-CA'); 

  // 1. Today's Sessions with Client Name (only planned sessions should show in the dashboard count/list)
  const todaySchedule = await db.getAllAsync<any>(
    `SELECT s.*, c.name as client_name 
     FROM sessions s
     JOIN clients c ON s.client_id = c.id
     WHERE s.date = ? AND s.status = 'planned'
     ORDER BY s.date ASC, s.created_at ASC`,
    [today]
  );

  // 2. Client Statuses and Next Sessions
  const allClients = await db.getAllAsync<any>("SELECT id, name FROM clients WHERE sync_status != 'pending_delete'");
  const clientDataMap: Record<string, { status: ClientStatus, nextSession?: string }> = {};
  let activeCount = 0;

  for (const client of allClients) {
    const status = await getClientStatus(client.id);
    if (status === 'active') activeCount++;

    // Fetch next session
    const nextS = await db.getFirstAsync<{ date: string, start_time: string, focus: string }>(
      `SELECT date, start_time, focus FROM sessions 
       WHERE client_id = ? AND status = 'planned' AND date >= ?
       ORDER BY date ASC, start_time ASC LIMIT 1`,
      [client.id, today]
    );

    let nextSessionStr = 'no upcoming sessions';
    if (nextS) {
      const isToday = nextS.date === today;
      nextSessionStr = `${isToday ? 'Today' : nextS.date} · ${nextS.start_time || '--:--'} · ${nextS.focus}`;
    }

    clientDataMap[client.id] = { status, nextSession: nextSessionStr };
  }

  return {
    todaySessions: todaySchedule,
    activeClientCount: activeCount,
    clientDataMap
  };
}
