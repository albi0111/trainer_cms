import { FirestoreDataConverter, QueryDocumentSnapshot, Timestamp } from 'firebase/firestore';
import { SessionLog } from '../../features/sessions/types';

/**
 * sessionConverter: Handles Timestamp <-> Date conversion for SessionLogs.
 * Note: Metric consistency is enforced at the service level before writing.
 */
export const sessionConverter: FirestoreDataConverter<SessionLog> = {
  toFirestore(session: SessionLog) {
    return { ...session };
  },

  fromFirestore(snapshot: QueryDocumentSnapshot, options): SessionLog {
    const data = snapshot.data(options);
    return {
      // ── BaseModel ──────────────────────────────────────────────────────────
      id:         snapshot.id,
      created_at: (data.created_at as Timestamp).toDate(),
      updated_at: data.updated_at instanceof Timestamp
        ? data.updated_at.toDate()
        : data.updated_at,
      updated_by: data.updated_by ?? '',
      version:    data.version   ?? 1,
      deleted:    data.deleted   ?? false,
      deleted_at: data.deleted_at instanceof Timestamp
        ? data.deleted_at.toDate()
        : (data.deleted_at ?? null),

      // ── Session fields ─────────────────────────────────────────────────────
      client_id:     data.client_id     ?? '',
      date:          data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date),
      type:          data.type          ?? 'workout',
      status:        data.status        ?? 'planned',
      workout_data:  data.workout_data  ?? undefined,
      missed_reason: data.missed_reason ?? undefined,
      notes:         data.notes         ?? undefined,
      source:        data.source        ?? 'manual',
    };
  },
};
