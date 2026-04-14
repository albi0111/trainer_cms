// ─────────────────────────────────────────────────────────────────────────────
// Sync Queue — Table structure only (no sync logic yet)
// Source of truth: resrc/system_prompt.md §5.5
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Drive domain file names — hardcoded constants.
 * §3 rule: "These names are hardcoded constants in the codebase.
 *           Any code that constructs a domain file name dynamically is a bug."
 */
export const DOMAIN_FILES = {
  core: 'core.json',
  measurements: 'measurements.json',
  progress_photos: 'progress_photos.json',
  plans: 'plans.json',
  diet_plans: 'diet_plans.json',
  sessions: 'sessions.json',
  session_results: 'session_results.json',
  exercises: 'exercises.json',
} as const;

/**
 * Drive folder structure constants.
 * Root folder name is fixed — no dynamic naming allowed.
 */
export const DRIVE_PATHS = {
  ROOT_FOLDER: 'fit_persona',
  META_FILE: 'meta.json',
  CLIENTS_INDEX_FILE: 'clients_index.json',
  CLIENTS_SUBFOLDER: 'clients',
} as const;
