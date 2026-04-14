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

  if (diffDays < 30) return 'active';

  if (diffDays >= 90) {
    // Check if any plan is completed
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
