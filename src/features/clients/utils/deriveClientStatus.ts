import { ClientDisplayStatus } from '../types';

// ─── Status Derivation Context ─────────────────────────────────────────────────
// Structured as a context object so Phase 2 can add new signals (hasSessions,
// lastSessionDate) without changing the function signature at every call site.
// Only add fields here when the signal is actually available — never add nulls
// just to pre-declare future intent.

export interface ClientStatusContext {
  /** Trainer-stored override. Only 'inactive' is a meaningful stored value. */
  storedStatus: 'active' | 'inactive';

  /** True if the client has at least one non-deleted measurement. */
  hasMeasurements: boolean;

  /**
   * Phase 2 — whether the client has any confirmed training sessions.
   * Pass `undefined` (default) until the Session system is live.
   * When Phase 2 ships, callers pass `hasSessions: sessions.length > 0`.
   */
  hasSessions?: boolean;
}

/**
 * Derives the client's display status from real data — never from stored value alone.
 *
 * Decision table:
 * ┌────────────────────┬─────────────────────┬────────────────────────┐
 * │  storedStatus      │  signals            │  result                │
 * ├────────────────────┼─────────────────────┼────────────────────────┤
 * │  'inactive'        │  any                │  'inactive' (override) │
 * │  'active'          │  no data            │  'incomplete'          │
 * │  'active'          │  meas. OR sessions  │  'active'              │
 * └────────────────────┴─────────────────────┴────────────────────────┘
 *
 * EXTENSION RULE (Phase 2):
 *   When the Session system lands, update this function — do NOT add
 *   a parallel status derivation elsewhere. This is the single source of truth.
 *
 * Usage: call this wherever the UI needs to show status.
 *        NEVER read client.status directly in UI components.
 */
export function deriveClientStatus(ctx: ClientStatusContext): ClientDisplayStatus {
  // Trainer's explicit inactive override — respected regardless of any signal
  if (ctx.storedStatus === 'inactive') return 'inactive';

  // 'active': has measurements OR sessions
  if (ctx.hasMeasurements || ctx.hasSessions) return 'active';

  // 'incomplete': default state for new clients with no logs
  return 'incomplete';
}
