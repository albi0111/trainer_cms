import { create } from 'zustand';
import { ClientWithProfile, ClientMeasurement, ClientProfile } from '../features/clients/types';
import { clientService, MeasurementInput } from '../features/clients/services/clientService';

interface ClientState {
  // ── Data ────────────────────────────────────────────────────────────────────
  clients: ClientWithProfile[];
  selectedClient: ClientWithProfile | null;

  // ── Status ──────────────────────────────────────────────────────────────────
  isLoading: boolean;   // true until first snapshot fires
  error: string | null;

  // ── Subscription lifecycle ──────────────────────────────────────────────────
  _unsubscribe: (() => void) | null;

  // ── Actions ─────────────────────────────────────────────────────────────────

  /** Start live Firestore subscription. Safe to call multiple times. */
  subscribeClients: () => void;

  /** Tear down the listener. Call on screen unmount. */
  unsubscribeClients: () => void;

  /**
   * Create a new client. Only name is required.
   * Profile fields are optional — sanitized before write.
   */
  createClient: (name: string, profile?: Partial<ClientProfile>) => Promise<void>;

  /**
   * Partial profile update. Only non-empty fields are written.
   * Existing Firestore values for omitted/empty keys are preserved.
   */
  updateProfile: (
    id: string,
    data: { name?: string } & Partial<ClientProfile>,
    currentVersion: number
  ) => Promise<void>;

  /**
   * Store the 'inactive' override flag.
   * deriveClientStatus() will always respect this regardless of measurements.
   */
  setInactive: (id: string, currentVersion: number) => Promise<void>;

  /**
   * Append a measurement to a client's subcollection.
   * Never updates existing measurement documents.
   */
  addMeasurement: (clientId: string, input: MeasurementInput) => Promise<void>;

  /** Soft-delete — removes from list query immediately. */
  softDeleteClient: (id: string, currentVersion: number) => Promise<void>;

  setSelectedClient: (client: ClientWithProfile | null) => void;
  clearError: () => void;
}

export const useClientStore = create<ClientState>((set, get) => ({
  clients: [],
  selectedClient: null,
  isLoading: true,
  error: null,
  _unsubscribe: null,

  // ── Subscription ────────────────────────────────────────────────────────────

  subscribeClients: () => {
    if (get()._unsubscribe) return; // already subscribed — idempotent

    const unsubscribe = clientService.subscribeToClients(
      (clients) => set({ clients, isLoading: false, error: null }),
      (error)   => set({ error: error.message, isLoading: false })
    );
    set({ _unsubscribe: unsubscribe });
  },

  unsubscribeClients: () => {
    get()._unsubscribe?.();
    set({ _unsubscribe: null });
  },

  // ── Write actions ────────────────────────────────────────────────────────────

  createClient: async (name, profile) => {
    set({ error: null });
    try {
      await clientService.createClient(name, profile);
      // onSnapshot updates `clients` automatically — no manual refetch
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : 'Unknown error' });
      throw e;
    }
  },

  updateProfile: async (id, data, currentVersion) => {
    set({ error: null });
    try {
      await clientService.updateProfile(id, data, currentVersion);
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : 'Unknown error' });
      throw e;
    }
  },

  setInactive: async (id, currentVersion) => {
    set({ error: null });
    try {
      await clientService.setInactive(id, currentVersion);
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : 'Unknown error' });
      throw e;
    }
  },

  addMeasurement: async (clientId, input) => {
    set({ error: null });
    try {
      await clientService.addMeasurement(clientId, input);
      // Measurements live in a subcollection — useClientDetail hook handles their subscription
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : 'Unknown error' });
      throw e;
    }
  },

  softDeleteClient: async (id, currentVersion) => {
    set({ error: null });
    try {
      await clientService.softDeleteClient(id, currentVersion);
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : 'Unknown error' });
    }
  },

  setSelectedClient: (client) => set({ selectedClient: client }),
  clearError: () => set({ error: null }),
}));
