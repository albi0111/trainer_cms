import { create } from 'zustand';
import { ClientProfile } from '../features/clients/types';

interface ClientFormData extends Partial<ClientProfile> {
  name: string;
  id?: string; // used for edit flow
  client_uuid?: string;
  height_cm?: number; // for initial assessment
  weight_kg?: number; // for initial assessment
}

interface ClientFormState {
  formData: ClientFormData;
  step: number;
  isEditMode: boolean;

  // Actions
  setName: (name: string) => void;
  updateFields: (fields: Partial<ClientFormData>) => void;
  nextStep: () => void;
  prevStep: () => void;
  setStep: (step: number) => void;
  
  /** Initialize form for creating a new client */
  startCreate: () => void;
  
  /** Initialize form with existing client data for editing */
  startEdit: (client: ClientFormData) => void;
  
  resetForm: () => void;
}

const INITIAL_DATA: ClientFormData = {
  name: '',
  email: '',
  phone: '',
  goal: '',
  lifestyle: '',
  medical_conditions: '',
  notes: '',
  height_cm: undefined,
  weight_kg: undefined,
};

export const useClientFormStore = create<ClientFormState>((set) => ({
  formData: { ...INITIAL_DATA },
  step: 0,
  isEditMode: false,

  setName: (name) => set((s) => ({ formData: { ...s.formData, name } })),
  
  updateFields: (fields) => set((s) => ({ 
    formData: { ...s.formData, ...fields } 
  })),

  nextStep: () => set((s) => ({ step: s.step + 1 })),
  prevStep: () => set((s) => ({ step: Math.max(0, s.step - 1) })),
  setStep: (step) => set({ step }),

  startCreate: () => set({ 
    formData: { ...INITIAL_DATA }, 
    step: 0, 
    isEditMode: false 
  }),

  startEdit: (client) => set({ 
    formData: { ...client }, 
    step: 0, 
    isEditMode: true 
  }),

  resetForm: () => set({ 
    formData: { ...INITIAL_DATA }, 
    step: 0, 
    isEditMode: false 
  }),
}));
