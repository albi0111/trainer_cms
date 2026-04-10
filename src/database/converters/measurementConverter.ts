import { FirestoreDataConverter, QueryDocumentSnapshot, Timestamp } from 'firebase/firestore';
import { ClientMeasurement } from '../../features/clients/types';

/**
 * Converts between Firestore measurement documents and ClientMeasurement in-memory shape.
 *
 * METRIC RULE: All numeric values are ALREADY metric when they reach Firestore.
 * Unit conversion (imperial → metric) is performed in clientService BEFORE write.
 * This converter only does Timestamp → Date conversion — no unit logic here.
 *
 * APPEND-ONLY: This converter is only used for reads.
 * measurementConverter.toFirestore is called by addDoc() only (never updateDoc).
 */
export const measurementConverter: FirestoreDataConverter<ClientMeasurement> = {
  toFirestore(measurement: ClientMeasurement) {
    return { ...measurement };
  },

  fromFirestore(snapshot: QueryDocumentSnapshot, options): ClientMeasurement {
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

      // ── Measurement fields ─────────────────────────────────────────────────
      client_id:   data.client_id   ?? '',
      client_uuid: data.client_uuid ?? '', // FK reconciliation
      date:        data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date),
      created_at_local: data.created_at_local instanceof Timestamp
        ? data.created_at_local.toDate()
        : (data.created_at_local ? new Date(data.created_at_local) : new Date()),
      unit_system: data.unit_system ?? 'metric',       // display context only
      source:      data.source      ?? 'manual',

      // Numeric values — all metric (kg / cm / %) — stored as-is
      weight_kg:      data.weight_kg      ?? undefined,
      height_cm:      data.height_cm      ?? undefined,
      waist_cm:       data.waist_cm       ?? undefined,
      hip_cm:         data.hip_cm         ?? undefined,
      chest_cm:       data.chest_cm       ?? undefined,
      body_fat_pct:   data.body_fat_pct   ?? undefined,
      notes:          data.notes          ?? undefined,
    };
  },
};
