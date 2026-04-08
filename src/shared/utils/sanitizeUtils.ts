/**
 * Removes keys where the value is '', null, or undefined from any object.
 *
 * Purpose: protects existing Firestore data from accidental overwriting.
 * Every partial update that comes from a form must pass through this function
 * before reaching a Firestore write call.
 *
 * Usage:
 *   const safe = sanitizeUpdate({ name: 'Alice', email: '', phone: undefined });
 *   // → { name: 'Alice' }
 *
 * Works with setDoc({ merge: true }) — only the provided (non-empty) keys are written.
 * Existing Firestore fields NOT in the result are left untouched.
 */
export function sanitizeUpdate<T extends object>(data: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== '' && v !== null && v !== undefined)
  ) as Partial<T>;
}

/**
 * Converts imperial measurements to metric before Firestore storage.
 *
 * METRIC RULE: ALL values in Firestore are metric (kg, cm).
 * This function is the single conversion point — it must be called
 * in the service layer before any measurement write.
 *
 * @param lbs - pounds → returns kg (rounded to 2dp)
 * @param inches - inches → returns cm (rounded to 2dp)
 */
export function lbsToKg(lbs: number): number {
  return Math.round(lbs * 0.453592 * 100) / 100;
}

export function inchesToCm(inches: number): number {
  return Math.round(inches * 2.54 * 100) / 100;
}
