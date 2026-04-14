import { create } from 'zustand';

interface ClientState {
  clients: any[];
  selectedClient: any | null;
  isLoading: boolean;
  error: string | null;
  
  // Minimal actions
  setClients: (clients: any[]) => void;
  setSelectedClient: (client: any | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useClientStore = create<ClientState>((set) => ({
  clients: [],
  selectedClient: null,
  isLoading: false,
  error: null,

  setClients: (clients) => set({ clients }),
  setSelectedClient: (client) => set({ selectedClient: client }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
