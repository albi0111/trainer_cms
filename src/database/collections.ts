/**
 * Database Collection and Subcollection manifest.
 * Used for centralizing Firestore path management.
 */

export const CLIENTS_COLLECTION  = 'clients';
export const MEASUREMENTS_SUB    = 'measurements';
export const SESSION_LOGS_SUB    = 'session_logs';

/**
 * Standard FK field name for client relationship.
 */
export const CLIENT_ID_FK = 'client_id' as const;
