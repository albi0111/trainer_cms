import {
  collection,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../../../database/firebase';
import { clientConverter } from '../../../database/converters/clientConverter';
import { Client } from '../types';
import { getUpdatePayload, getCreatePayload } from '../../../shared/utils/syncUtils';
import { generateSearchTokens } from '../../../shared/utils/searchUtils';

const CLIENTS_COLLECTION = 'clients';

export const clientService = {
  /**
   * Subscribes to the live client list via onSnapshot.
   * The callback receives the full up-to-date array on every Firestore change
   * (including offline cache hits, so this works offline-first).
   *
   * Returns an unsubscribe function — call it on component/store cleanup.
   *
   * NOTE: Search/filtering is intentionally done locally by the caller.
   * If a remote search strategy is needed in the future, add a separate
   * `subscribeToClientSearch(query, callback)` here without touching the screen.
   */
  subscribeToClients(
    onUpdate: (clients: Client[]) => void,
    onError: (error: Error) => void
  ): Unsubscribe {
    const q = query(
      collection(db, CLIENTS_COLLECTION).withConverter(clientConverter),
      where('deleted', '==', false),
      orderBy('name')
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const clients = snapshot.docs.map((d) => d.data());
        onUpdate(clients);
      },
      (error) => {
        onError(error);
      }
    );
  },

  /**
   * Fetches a single client by ID. Used for detail views — not the list path.
   */
  async getClientById(id: string): Promise<Client> {
    const docRef = doc(db, CLIENTS_COLLECTION, id).withConverter(clientConverter);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Client not found');
    return snap.data();
  },

  /**
   * Creates a new client. Write-only — the live subscription handles the UI update.
   */
  async createClient(clientData: {
    name: string;
    email: string;
    phone: string;
    goal: string;
  }): Promise<string> {
    const search_tokens = generateSearchTokens(clientData.name);
    const payload = await getCreatePayload({
      ...clientData,
      status: 'active' as const,
      last_session_at: null,
      search_tokens,
    });

    const docRef = await addDoc(
      collection(db, CLIENTS_COLLECTION).withConverter(clientConverter),
      payload as any
    );
    return docRef.id;
  },

  /**
   * Updates a client. Write-only — no read-before-write.
   *
   * Conflict strategy: Last-Write-Wins (LWW).
   * The caller provides the locally cached `currentVersion`. The version is
   * incremented deterministically (+1) in getUpdatePayload. If two devices
   * write concurrently, the last write to reach Firestore wins. This is
   * intentional and safe for a trainer CMS where concurrent edits to the same
   * client record are rare and non-critical.
   */
  async updateClient(
    id: string,
    data: Partial<Client>,
    currentVersion: number
  ): Promise<void> {
    const docRef = doc(db, CLIENTS_COLLECTION, id).withConverter(clientConverter);

    const search_tokens = data.name ? generateSearchTokens(data.name) : undefined;
    const payload = await getUpdatePayload(
      { ...data, ...(search_tokens ? { search_tokens } : {}) },
      currentVersion // LWW: version incremented to currentVersion + 1
    );

    await updateDoc(docRef, payload as any);
  },

  /**
   * Soft-deletes a client by setting deleted=true. Write-only.
   * `currentVersion` must be passed from local state — no server read needed.
   */
  async softDeleteClient(id: string, currentVersion: number): Promise<void> {
    const docRef = doc(db, CLIENTS_COLLECTION, id);
    const payload = await getUpdatePayload(
      { deleted: true, deleted_at: serverTimestamp() },
      currentVersion // LWW: same deterministic version strategy
    );
    await updateDoc(docRef, payload);
  },
};
