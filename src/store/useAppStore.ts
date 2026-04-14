// ─────────────────────────────────────────────────────────────────────────────
// Zustand App Store — UI-state only, NO data storage
// Source of truth: resrc/system_prompt.md §  Architecture Overview
// Rule: Zustand = UI state (volatile, never persisted)
// ─────────────────────────────────────────────────────────────────────────────

import { create } from 'zustand';

export type AppSyncStatus = 'idle' | 'syncing' | 'error';

interface AppState {
  // ── UI state ──────────────────────────────────────────────────────────────
  /** The client currently being viewed. null = no client selected. */
  selectedClientId: string | null;
  /** Whether the user has a valid Google Drive connection. */
  isConnectedToDrive: boolean;
  /** Current sync state for status-bar feedback. */
  syncStatus: AppSyncStatus;

  // ── Setters ───────────────────────────────────────────────────────────────
  setSelectedClientId: (id: string | null) => void;
  setIsConnectedToDrive: (connected: boolean) => void;
  setSyncStatus: (status: AppSyncStatus) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Defaults
  selectedClientId: null,
  isConnectedToDrive: false,
  syncStatus: 'idle',

  // Setters
  setSelectedClientId: (id) => set({ selectedClientId: id }),
  setIsConnectedToDrive: (connected) => set({ isConnectedToDrive: connected }),
  setSyncStatus: (status) => set({ syncStatus: status }),
}));
