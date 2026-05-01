import type { SyncDomain } from '../types';

export const SYNC_CONFIG = {
  maxRetries: 3,
  retryBackoffSeconds: [5, 30, 300],
  batchSize: 5,
  clientRootFolder: 'fit_persona',
  clientsFolder: 'clients',
  mediaFolder: 'media',
};

export const DRIVE_FILE_NAMES = {
  meta: 'meta.json',
  clientsIndex: 'clients_index.json',
};

export const SYNC_DOMAINS: SyncDomain[] = [
  'core',
  'measurements',
  'progress_photos',
  'plans',
  'diet_plans',
  'sessions',
  'session_results',
  'exercises',
];
