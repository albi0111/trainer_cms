// ─────────────────────────────────────────────────────────────────────────────
// Client Status Utility — Derived status logic
// Source of truth: resrc/system_prompt.md §2.12
// ─────────────────────────────────────────────────────────────────────────────

import { ClientStatus } from '../types';

/**
 * Derives the client status based on session activity.
 * §Rule 2.12: status is NEVER stored.
 * 
 * Logic (Simplified for now):
 * 1. If no sessions exist -> active (newly created)
 * 2. If sessions exist but none recent -> inactive
 * 
 * TODO: Fully implement §2.12 once sessions table is populated.
 */
export function deriveClientStatus(createdAt: string): ClientStatus {
  const createdDate = new Date(createdAt);
  const now = new Date();
  
  // For now, if created within last 30 days, consider active
  const diffDays = (now.getTime() - createdDate.getTime()) / (1000 * 3600 * 24);
  
  if (diffDays > 30) {
    return 'inactive';
  }
  
  return 'active';
}
