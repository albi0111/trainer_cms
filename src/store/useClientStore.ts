import { create } from 'zustand';
import { Client } from '../features/clients/types';
import { clientService } from '../features/clients/services/clientService';

interface ClientState {
  // Data
  clients: Client[];
  selectedClient: Client | null;

  // Status
  isLoading: boolean;  // true until the first snapshot arrives
  error: string | null;

  // Subscription lifecycle
  _unsubscribe: (() => void) | null;

  // Actions
  subscribeClients: () => void;
  unsubscribeClients: () => void;
  createClient: (data: Parameters<typeof clientService.createClient>[0]) => Promise<void>;
  updateClient: (id: string, data: Parameters<typeof clientService.updateClient>[1], currentVersion: number) => Promise<void>;
  softDeleteClient: (id: string, currentVersion: number) => Promise<void>;
  setSelectedClient: (client: Client | null) => void;
  clearError: () => void;
}

export const useClientStore = create<ClientState>((set, get) => ({
  clients: [],
  selectedClient: null,
  isLoading: true,   // start true — remains until first onSnapshot fires
  error: null,
  _unsubscribe: null,

  /**
   * Starts the live Firestore subscription.
   * Safe to call multiple times — ignored if already subscribed.
   * The snapshot fires immediately from the local cache (offline-first),
   * then again whenever Firestore syncs new data.
   */
  subscribeClients: () => {
    if (get()._unsubscribe) return; // already subscribed

    const unsubscribe = clientService.subscribeToClients(
      (clients) => {
        // onUpdate: replace the full list with the latest snapshot
        set({ clients, isLoading: false, error: null });
      },
      (error) => {
        // onError: surface the error but keep any previously loaded data
        set({ error: error.message, isLoading: false });
      }
    );

    set({ _unsubscribe: unsubscribe });
  },

  /**
   * Tears down the Firestore listener.
   * Call this on screen unmount to prevent memory leaks.
   */
  unsubscribeClients: () => {
    get()._unsubscribe?.();
    set({ _unsubscribe: null });
  },

  /**
   * Writes a new client. The subscription handles the UI update automatically —
   * no manual refetch is needed or performed.
   */
  createClient: async (data) => {
    set({ error: null });
    try {
      await clientService.createClient(data);
      // onSnapshot will update `clients` automatically
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      set({ error: msg });
      throw e;
    }
  },

  /**
   * Updates a client using last-write-wins conflict resolution.
   * `currentVersion` is read from local state — no server round-trip.
   */
  updateClient: async (id, data, currentVersion) => {
    set({ error: null });
    try {
      await clientService.updateClient(id, data, currentVersion);
      // onSnapshot will update `clients` automatically
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      set({ error: msg });
      throw e;
    }
  },

  /**
   * Soft-deletes a client. `currentVersion` comes from local state.
   * The subscription will remove the client from `clients` when Firestore confirms.
   */
  softDeleteClient: async (id, currentVersion) => {
    set({ error: null });
    try {
      await clientService.softDeleteClient(id, currentVersion);
      // onSnapshot will update `clients` automatically
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      set({ error: msg });
    }
  },

  setSelectedClient: (client) => set({ selectedClient: client }),
  clearError: () => set({ error: null }),
}));
