import type { ClientStatus, Plan, Session } from '../types';

export type ClientBadgeStatus = 'active' | 'completed' | 'on-hold';

export function deriveClientStatusFromData(
  sessions: Pick<Session, 'status' | 'date'>[],
  plans: Pick<Plan, 'status'>[] = [],
): ClientStatus {
  let latestCompletedSessionTime = Number.NEGATIVE_INFINITY;

  for (const session of sessions) {
    if (session.status !== 'completed') {
      continue;
    }

    const sessionTime = new Date(session.date).getTime();
    if (sessionTime > latestCompletedSessionTime) {
      latestCompletedSessionTime = sessionTime;
    }
  }

  if (latestCompletedSessionTime === Number.NEGATIVE_INFINITY) {
    return 'active';
  }

  const now = new Date();
  const diffDays = (now.getTime() - latestCompletedSessionTime) / (1000 * 3600 * 24);

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
