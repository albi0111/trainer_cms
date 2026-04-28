// ─────────────────────────────────────────────────────────────────────────────
// ID utility — wraps nanoid for consistent ID generation
// Source of truth: resrc/system_prompt.md §2.1
// ─────────────────────────────────────────────────────────────────────────────

import { nanoid } from 'nanoid';

/**
 * Generates a new nanoid.
 * §Rule 2.1: Use nanoid for stable unique identifiers.
 * 
 * Note: Switched from uuid to nanoid to match Step 3 audit requirements.
 */
export function generateId(): string {
  return nanoid();
}
