import { create } from 'zustand';
import type { ClientDetail, DashboardStats, ScheduledSession } from '../types';
import { getClientDetail } from '../services/client/clientService';
import { getDashboardStats } from '../services/analytics/analyticsService';
import { getMonthSchedule } from '../services/schedule/scheduleService';
import { checkForUpdates, getSyncSnapshot, runSyncCycle } from '../services/sync/syncService';
import { isAuthenticated, signIn, signOut } from '../services/sync/googleAuth';

export type AppSyncStatus = 'idle' | 'syncing' | 'error';

interface ScheduleCache {
  key: string;
  sessions: ScheduledSession[];
}

interface AppState {
  selectedClientId: string | null;
  isConnectedToDrive: boolean;
  syncStatus: AppSyncStatus;
  pendingSyncCount: number;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
  dashboard: DashboardStats | null;
  clientDetails: Record<string, ClientDetail>;
  scheduleCache: ScheduleCache | null;
  setSelectedClientId: (id: string | null) => void;
  refreshSyncState: () => Promise<void>;
  hydrateDashboard: () => Promise<DashboardStats>;
  hydrateClientDetail: (clientId: string) => Promise<ClientDetail | null>;
  hydrateSchedule: (startDate: string, endDate: string) => Promise<ScheduledSession[]>;
  connectDrive: () => Promise<void>;
  disconnectDrive: () => Promise<void>;
  runSync: () => Promise<void>;
  invalidateClientDetail: (clientId: string) => void;
  invalidateDashboard: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  selectedClientId: null,
  isConnectedToDrive: isAuthenticated(),
  syncStatus: 'idle',
  pendingSyncCount: 0,
  lastSyncedAt: null,
  lastSyncError: null,
  dashboard: null,
  clientDetails: {},
  scheduleCache: null,

  setSelectedClientId: (id) => set({ selectedClientId: id }),

  refreshSyncState: async () => {
    const snapshot = await getSyncSnapshot();
    const authenticated = isAuthenticated();
    set({
      isConnectedToDrive: authenticated,
      pendingSyncCount: snapshot.pendingCount,
      lastSyncedAt: snapshot.lastSyncAt || null,
      lastSyncError: snapshot.lastError || null,
      syncStatus: authenticated && !snapshot.lastError ? 'idle' : snapshot.lastError ? 'error' : 'idle',
    });
  },

  hydrateDashboard: async () => {
    const dashboard = await getDashboardStats();
    set({ dashboard });
    return dashboard;
  },

  hydrateClientDetail: async (clientId: string) => {
    const detail = await getClientDetail(clientId);
    if (detail) {
      set((state) => ({
        clientDetails: {
          ...state.clientDetails,
          [clientId]: detail,
        },
      }));
    }
    return detail;
  },

  hydrateSchedule: async (startDate: string, endDate: string) => {
    const key = `${startDate}:${endDate}`;
    const cached = get().scheduleCache;
    if (cached?.key === key) {
      return cached.sessions;
    }

    const sessions = await getMonthSchedule(startDate, endDate);
    set({ scheduleCache: { key, sessions } });
    return sessions;
  },

  connectDrive: async () => {
    await signIn();
    set({ isConnectedToDrive: true });
    await get().runSync();
    await get().refreshSyncState();
  },

  disconnectDrive: async () => {
    await signOut();
    set({
      isConnectedToDrive: false,
      syncStatus: 'idle',
      pendingSyncCount: 0,
      lastSyncError: null,
    });
  },

  runSync: async () => {
    set({ syncStatus: 'syncing' });
    try {
      await checkForUpdates();
      await runSyncCycle();
      await get().refreshSyncState();
      set({ syncStatus: 'idle' });
    } catch (error) {
      set({
        syncStatus: 'error',
        lastSyncError: error instanceof Error ? error.message : 'Sync failed.',
      });
    }
  },

  invalidateClientDetail: (clientId: string) => set((state) => {
    const nextDetails = { ...state.clientDetails };
    delete nextDetails[clientId];
    return { clientDetails: nextDetails, scheduleCache: null };
  }),

  invalidateDashboard: () => set({ dashboard: null, scheduleCache: null }),
}));
