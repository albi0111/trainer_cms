import { FirestoreDataConverter, QueryDocumentSnapshot, Timestamp } from 'firebase/firestore';
import { Client } from '../../features/clients/types';

export const clientConverter: FirestoreDataConverter<Client> = {
  toFirestore(client: Client) {
    return {
      ...client,
      // created_at stays as Date for simpler service logic, Firestore converts automatically
      // But for toFirestore explicitly, serverTimestamp() is often used for updated_at.
      // We pass the raw object and let firestore SDK handle FieldValues.
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options): Client {
    const data = snapshot.data(options);
    return {
      ...(data as Client),
      id: snapshot.id,
      created_at: (data.created_at as Timestamp).toDate(),
      // Handle potential FieldValue types in memory or after sync
      updated_at: data.updated_at instanceof Timestamp ? (data.updated_at as Timestamp).toDate() : data.updated_at,
      last_session_at: data.last_session_at instanceof Timestamp ? (data.last_session_at as Timestamp).toDate() : (data.last_session_at || null),
      deleted_at: data.deleted_at instanceof Timestamp ? (data.deleted_at as Timestamp).toDate() : (data.deleted_at || null),
    };
  }
};
