// ─────────────────────────────────────────────────────────────────────────────
// Date utility — ensures ISO 8601 UTC format correctly
// Source of truth: resrc/system_prompt.md §2.1
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns current timestamp in strict ISO 8601 UTC format: YYYY-MM-DDTHH:mm:ssZ
 * Truncates milliseconds for maximum sync compatibility.
 */
export function nowISO(): string {
  const date = new Date();
  // toISOString() returns YYYY-MM-DDTHH:mm:ss.sssZ
  // We split by '.' to remove milliseconds.
  return date.toISOString().split('.')[0] + 'Z';
}

/**
 * Validates if a string is a valid ISO date (YYYY-MM-DD)
 */
export function isValidDate(dateStr: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}
