// ─────────────────────────────────────────────────────────────────────────────
// Sync Constants — Hardcoded file names & folder names
// Source of truth: resrc/system_prompt.md §4.2
// ─────────────────────────────────────────────────────────────────────────────

export const SYNC_CONFIG = {
  RETRY_BACKOFF_SECONDS: [5, 30, 300],
  MAX_RETRIES: 3,
};

export const DRIVE_FILE_NAMES = {
  ROOT_FOLDER: 'fit.persona',
  META: 'meta.json',
  CLIENTS_INDEX: 'clients_index.json',
};

export const DOMAIN_FILE_NAMES: Record<string, string> = {
  core: 'core.json',
  profiles: 'profiles.json', // Not in SyncDomain but part of core
  lifestyles: 'lifestyles.json',
  assessments: 'assessments.json',
  measurements: 'measurements.json',
  photos: 'photos.json',
  plans: 'plans.json',
  diet_plans: 'diet_plans.json',
  sessions: 'sessions.json',
  results: 'results.json',
  exercises: 'exercises.json',
};
