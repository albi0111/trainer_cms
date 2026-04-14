import { create } from 'zustand';

interface ClientFormState {
  formData: any;
  setFormData: (data: any) => void;
  resetForm: () => void;
}

export const useClientFormStore = create<ClientFormState>((set) => ({
  formData: {},
  setFormData: (formData) => set({ formData }),
  resetForm: () => set({ formData: {} }),
}));
