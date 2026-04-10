import { create } from 'zustand';
import NetInfo from '@react-native-community/netinfo';
import { ClientWithProfile, ClientMeasurement, ClientProfile } from '../features/clients/types';
import { clientService, MeasurementInput } from '../features/clients/services/clientService';
import { sessionService } from '../features/sessions/services/sessionService';
import { SessionLogInput } from '../features/sessions/types';
import { getChangedFields } from '../shared/utils/syncUtils';

interface ClientState {
  // ── Data ────────────────────────────────────────────────────────────────────
  clients: ClientWithProfile[];
  selectedClient: ClientWithProfile | null;

  // ── Status ──────────────────────────────────────────────────────────────────
  isInitialLoading: boolean; // true until first snapshot fires
  isSyncing: boolean;       // true during writes
  isOnline: boolean;
  error: string | null;

  // ── Subscription lifecycle ──────────────────────────────────────────────────
  _unsubscribe: (() => void) | null;

  // ── Actions ─────────────────────────────────────────────────────────────────
  subscribeClients: () => void;
  unsubscribeClients: () => void;
  
  /** 
   * Create client with optimistic UI and UUID reconciliation.
   */
  createClient: (name: string, profile?: Partial<ClientWithProfile>) => Promise<void>;
  
  /**
   * Delta-only update to prevent accidental overwrites.
   */
  updateProfile: (
    id: string,
    data: Partial<ClientWithProfile>
  ) => Promise<void>;

  setInactive: (id: string, currentVersion: number) => Promise<void>;
  addMeasurement: (clientId: string, input: MeasurementInput) => Promise<void>;
  softDeleteClient: (id: string, currentVersion: number) => Promise<void>;
  addSessionLog: (clientId: string, input: SessionLogInput) => Promise<void>;

  setSelectedClient: (client: ClientWithProfile | null) => void;
  clearError: () => void;
  setOnline: (isOnline: boolean) => void;
}

const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const useClientStore = create<ClientState>((set, get) => {
  // Listen for network changes
  NetInfo.addEventListener((state) => {
    set({ isOnline: !!state.isConnected });
  });

  return {
    clients: [],
    selectedClient: null,
    isInitialLoading: true,
    isSyncing: false,
    isOnline: true,
    error: null,
    _unsubscribe: null,

    setOnline: (isOnline) => set({ isOnline }),

    subscribeClients: () => {
      if (get()._unsubscribe) return; // idempotent

      // SAFETY NET: If the network hangs (initial setup or invalid keys),
      // we stop the loader after 10 seconds.
      const fallbackTimer = setTimeout(() => {
        if (get().isInitialLoading) {
          set({ 
            isInitialLoading: false, 
            error: 'Connection Timeout. If this is a new project, ensure Firestore is enabled in Firebase Console and Security Rules are set to "test mode" or allow reads.' 
          });
        }
      }, 10000);

      const unsubscribe = clientService.subscribeToClients(
        (serverClients) => {
          clearTimeout(fallbackTimer);
          set((state) => {
            // SOFT-MERGE LOGIC
            // 1. Preserve local UI flags (status: 'creating') for clients already in server list
            const merged = serverClients.map((sd) => {
              const local = state.clients.find((lc) => lc.client_uuid === sd.client_uuid);
              if (local && (local as any).status === 'creating') {
                return { ...sd, status: 'creating' } as ClientWithProfile;
              }
              return sd;
            });

            // 2. Keep "optimistic-only" clients that haven't hit the server yet
            const localOnly = state.clients.filter(
              (lc) => 
                lc.id.startsWith('temp_') && 
                !serverClients.some((sd) => sd.client_uuid === lc.client_uuid)
            );

            // 3. Sort by created_at_local (fallback) to ensure stable immediate ordering
            const allClients = [...merged, ...localOnly].sort((a, b) => {
              const dateA = a.created_at_local ? new Date(a.created_at_local).getTime() : 0;
              const dateB = b.created_at_local ? new Date(b.created_at_local).getTime() : 0;
              return dateB - dateA; // Newest first
            });

            return { 
              clients: allClients, 
              isInitialLoading: false, // Transition to false after first success
              error: null 
            };
          });
        },
        (error) => {
          clearTimeout(fallbackTimer);
          set({ error: error.message, isInitialLoading: false });
        }
      );
      set({ _unsubscribe: () => {
        clearTimeout(fallbackTimer);
        unsubscribe();
      }});
    },

    unsubscribeClients: () => {
      get()._unsubscribe?.();
      set({ _unsubscribe: null });
    },

    createClient: async (name, profile) => {
      const client_uuid = generateUUID();
      const tempId = `temp_${client_uuid}`;
      
      const optimisticClient: ClientWithProfile = {
        id: tempId,
        client_uuid,
        name,
        status: 'creating' as any,
        created_at_local: new Date(),
        search_tokens: [],
        version: 1,
        deleted: false,
        ...(profile || {}),
      } as ClientWithProfile;

      // 1. ADD OPTIMISTICALLY (Instant local feedback)
      set((state) => ({ 
        clients: [optimisticClient, ...state.clients],
        isSyncing: true,
        error: null 
      }));

      // 2. DISPATCH BACKGROUND SYNC (Non-blocking)
      clientService.createClient(name, { ...profile, client_uuid } as any)
        .then(() => set({ isSyncing: false }))
        .catch((e) => {
          // Rollback on hard failure (e.g. perms)
          set((state) => ({
            clients: state.clients.filter((c) => c.id !== tempId),
            error: e instanceof Error ? e.message : 'Creation failed',
            isSyncing: false,
          }));
        });
      
      // Control returns to UI immediately — navigation happens while sync pulses
    },

    updateProfile: async (id, data) => {
      const client = get().clients.find((c) => c.id === id);
      if (!client) return;

      const delta = getChangedFields(client, data);
      if (Object.keys(delta).length === 0) return;

      set({ isSyncing: true, error: null });
      
      // Background sync — fire and continue
      clientService.updateProfile(id, delta, client.version)
        .finally(() => set({ isSyncing: false }))
        .catch((e) => set({ error: e instanceof Error ? e.message : 'Update failed' }));
    },

    setInactive: async (id, currentVersion) => {
      set({ isSyncing: true, error: null });
      try {
        await clientService.setInactive(id, currentVersion);
        set({ isSyncing: false });
      } catch (e: unknown) {
        set({ error: e instanceof Error ? e.message : 'Update failed', isSyncing: false });
        throw e;
      }
    },

    addMeasurement: async (clientId, input) => {
      set({ isSyncing: true, error: null });
      try {
        await clientService.addMeasurement(clientId, input);
        set({ isSyncing: false });
      } catch (e: unknown) {
        set({ error: e instanceof Error ? e.message : 'Measurement failed', isSyncing: false });
        throw e;
      }
    },

    softDeleteClient: async (id, currentVersion) => {
      set({ isSyncing: true, error: null });
      try {
        await clientService.softDeleteClient(id, currentVersion);
        set({ isSyncing: false });
      } catch (e: unknown) {
        set({ error: e instanceof Error ? e.message : 'Delete failed', isSyncing: false });
      }
    },

    addSessionLog: async (clientId, input) => {
      set({ isSyncing: true, error: null });
      try {
        await sessionService.addSessionLog(clientId, input);
        set({ isSyncing: false });
      } catch (e: unknown) {
        set({ error: e instanceof Error ? e.message : 'Session failed', isSyncing: false });
        throw e;
      }
    },

    setSelectedClient: (client) => set({ selectedClient: client }),
    clearError: () => set({ error: null }),
  };
});
