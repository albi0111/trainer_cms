/**
 * Strips keys from a partial update object where the value would cause
 * accidental data loss in Firestore.
 *
 * ┌────────────────┬────────────────────────────────────────────────────────────┐
 * │  Input value   │  Behaviour                                                 │
 * ├────────────────┼────────────────────────────────────────────────────────────┤
 * │  ''            │  STRIPPED — empty string is never a valid field update     │
 * │  undefined     │  STRIPPED — truly absent values are not written            │
 * │  null          │  STRIPPED — use sanitizeUpdateAllowNull() for rare cases   │
 * │  any other     │  KEPT    — written to Firestore as-is                      │
 * └────────────────┴────────────────────────────────────────────────────────────┘
 *
 * Works with setDoc({ merge: true }) — only surviving keys are written.
 * Firestore fields absent from the result are left completely untouched.
 *
 * Usage (typical form save):
 *   const safe = sanitizeUpdate({ name: 'Alice', email: '', phone: undefined });
 *   // → { name: 'Alice' }
 *   await setDoc(ref, safe, { merge: true });
 */
export function sanitizeUpdate<T extends object>(data: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(data)
      .map(([k, v]) => {
        // Auto-trim strings before evaluating emptiness
        const value = typeof v === 'string' ? v.trim() : v;
        return [k, value];
      })
      .filter(([, v]) => v !== '' && v !== null && v !== undefined)
  ) as Partial<T>;
}

// ─── Unit Conversion ──────────────────────────────────────────────────────────
// METRIC RULE: ALL values stored in Firestore are metric (kg, cm).
// These are the ONLY conversion functions in the codebase.
// The service layer calls them before any Firestore write — never in UI components.

/**
 * Converts pounds → kilograms, rounded to 2 decimal places.
 * @param lbs weight in lbs
 */
export function lbsToKg(lbs: number): number {
  return Math.round(lbs * 0.453592 * 100) / 100;
}

/**
 * Converts inches → centimetres, rounded to 2 decimal places.
 * @param inches measurement in inches
 */
export function inchesToCm(inches: number): number {
  return Math.round(inches * 2.54 * 100) / 100;
}
