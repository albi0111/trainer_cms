import { ClientDisplayStatus, ClientMeasurement } from '../types';

/**
 * Derives the client's display status from real data — never from stored value alone.
 *
 * Rules:
 *   - 'inactive'   → trainer explicitly marked inactive (stored override, always respected)
 *   - 'incomplete' → no measurements yet (derived, never stored)
 *   - 'active'     → has at least one measurement (derived, never stored)
 *
 * The stored `status` field on the Client document only holds 'inactive' as a meaningful
 * value. 'active' and 'incomplete' are ALWAYS derived here.
 *
 * Usage: call this wherever the UI needs to show status.
 *        NEVER read client.status directly in UI components.
 */
export function deriveClientStatus(
  storedStatus: 'active' | 'inactive',
  measurements: Pick<ClientMeasurement, 'id'>[]
): ClientDisplayStatus {
  // Trainer's manual inactive override — always respected regardless of measurements
  if (storedStatus === 'inactive') return 'inactive';

  // Derived from measurement presence
  return measurements.length > 0 ? 'active' : 'incomplete';
}
