// ─────────────────────────────────────────────────────────────────────────────
// UUID utility — wraps the uuid package for consistent ID generation
// ─────────────────────────────────────────────────────────────────────────────

import { v4 as uuidv4 } from 'uuid';

/**
 * Generates a new UUID v4.
 * Used wherever the spec calls for a unique ID (clients, sessions, etc.)
 */
export function generateId(): string {
  return uuidv4();
}
