import { FirestoreDataConverter, QueryDocumentSnapshot, Timestamp } from 'firebase/firestore';
import { ClientWithProfile } from '../../features/clients/types';

/**
 * Converts between Firestore documents and the ClientWithProfile in-memory shape.
 *
 * fromFirestore:
 *   - Converts Timestamp fields → JS Date
 *   - All ClientProfile fields are read with nullish coalescing → undefined if absent
 *   - last_session_at is REMOVED (no longer part of the model)
 *
 * toFirestore:
 *   - Spreads the object. FieldValues (serverTimestamp) pass through unmodified.
 */
export interface ClientStatusContext {
  /** Trainer-stored override. 'creating' is transient for optimistic UI. */
  storedStatus: 'active' | 'inactive' | 'creating';
}

export const clientConverter: FirestoreDataConverter<ClientWithProfile> = {
  toFirestore(client: ClientWithProfile) {
    return { ...client };
  },

  fromFirestore(snapshot: QueryDocumentSnapshot, options): ClientWithProfile {
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

      // ── Client core ────────────────────────────────────────────────────────
      client_uuid:   data.client_uuid ?? '',
      name:          data.name   ?? '',
      status:        data.status ?? 'active',
      search_tokens: data.search_tokens ?? [],
      created_at_local: data.created_at_local instanceof Timestamp
        ? data.created_at_local.toDate()
        : (data.created_at_local ? new Date(data.created_at_local) : new Date()),

      // ── ClientProfile (all optional — undefined if not in Firestore) ───────
      email:              data.email              ?? undefined,
      phone:              data.phone              ?? undefined,
      address:            data.address            ?? undefined,
      goal:               data.goal               ?? undefined,
      occupation:         data.occupation         ?? undefined,
      lifestyle:          data.lifestyle          ?? undefined,
      activity_level:     data.activity_level     ?? undefined,
      sleep_quality:      data.sleep_quality      ?? undefined,
      meal_timing:        data.meal_timing        ?? undefined,
      medical_conditions: data.medical_conditions ?? undefined,
    };
  },
};
