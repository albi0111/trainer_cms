// ─────────────────────────────────────────────────────────────────────────────
// Sync Constants — Hardcoded file names & folder names
// Source of truth: resrc/system_prompt.md §4.2
// ─────────────────────────────────────────────────────────────────────────────

export const SYNC_CONFIG = {
  RETRY_BACKOFF_SECONDS: [5, 30, 300],
  MAX_RETRIES: 3,
};

export const DRIVE_FILE_NAMES = {
  ROOT_FOLDER: 'fit_persona',
  META: 'meta.json',
  CLIENTS_INDEX: 'clients_index.json',
};

/**
 * Hardcoded domain file names §12 R30.
 * These are non-negotiable constants.
 */
export const DOMAIN_FILE_NAMES: Record<string, string> = {
  core: 'core.json',
  measurements: 'measurements.json',
  progress_photos: 'progress_photos.json',
  plans: 'plans.json',
  diet_plans: 'diet_plans.json',
  sessions: 'sessions.json',
  session_results: 'session_results.json',
  exercises: 'exercises.json',
};

