// ─────────────────────────────────────────────────────────────────────────────
// Client Status Utility — Derived status logic
// Cleaned from reference — no Expo/RN dependencies
// ─────────────────────────────────────────────────────────────────────────────

import type { ClientStatus, Plan, Session } from '../types';

export type ClientBadgeStatus = 'active' | 'completed' | 'on-hold';

/**
 * Derives the client status based on session activity.
 * Status is NEVER stored — always computed on read.
 *
 * Logic:
 * 1. If no sessions exist → active (newly created)
 * 2. If created within last 30 days → active
 * 3. Otherwise → inactive
 *
 * TODO: Fully implement once sessions are populated —
 *       use latest session date for accurate derivation.
 */
export function deriveClientStatus(createdAt: string): ClientStatus {
  const createdDate = new Date(createdAt);
  const now = new Date();

  const diffDays = (now.getTime() - createdDate.getTime()) / (1000 * 3600 * 24);

  if (diffDays > 30) {
    return 'inactive';
  }

  return 'active';
}

/**
 * Matches the reference app's derived status rules based on completed sessions
 * and completed plans.
 */
export function deriveClientStatusFromData(
  sessions: Pick<Session, 'status' | 'date'>[],
  plans: Pick<Plan, 'status'>[] = [],
): ClientStatus {
  const lastCompletedSession = sessions
    .filter((session) => session.status === 'completed')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

  if (!lastCompletedSession) {
    return 'active';
  }

  const lastDate = new Date(lastCompletedSession.date);
  const now = new Date();
  const diffDays = (now.getTime() - lastDate.getTime()) / (1000 * 3600 * 24);

  if (diffDays < 7) {
    return 'active';
  }

  if (diffDays >= 90 && plans.some((plan) => plan.status === 'completed')) {
    return 'completed';
  }

  return 'inactive';
}

export function toClientBadgeStatus(status: ClientStatus): ClientBadgeStatus {
  if (status === 'inactive') {
    return 'on-hold';
  }

  return status;
}
