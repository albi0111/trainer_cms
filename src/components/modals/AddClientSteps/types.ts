import { Client, ClientProfile, ClientLifestyle, ClientAssessment } from '../../../types';

export interface AddClientModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (clientId: string) => void;
  mode?: 'create' | 'edit';
  clientId?: string;
  initialData?: {
    client: Client;
    profile: ClientProfile;
    lifestyle: ClientLifestyle;
    assessment: ClientAssessment;
  };
  initialStep?: Step;
}

export interface FormData {
  // Step 1: Personal
  name: string;
  age: string;
  gender: 'Male' | 'Female' | 'Other';
  phone: string;
  email: string;

  // Step 2: Interview
  training_experience: string;
  injuries: string;
  lifestyle_notes: string;

  // Step 3: Assessment
  weight_kg: string;
  height_cm: string;
  bp: string;         // "120/80" format
  rhr: string;

  // Strength Exercises — Notes/Remarks
  strength_1_note: string;
  strength_2_note: string;
  strength_3_note: string;
  strength_4_note: string;
  strength_5_note: string;
  strength_6_note: string;
  strength_7_note: string;
  strength_8_note: string;

  // Flexibility tests — R/L checkboxes
  flex_hamstrings_r: boolean;
  flex_hamstrings_l: boolean;
  flex_quadriceps_r: boolean;
  flex_quadriceps_l: boolean;
  flex_hip_flexors_r: boolean;
  flex_hip_flexors_l: boolean;
  flex_shoulders_r: boolean;
  flex_shoulders_l: boolean;
  flex_toe_reach: boolean;
  flex_trunk_r: boolean;
  flex_trunk_l: boolean;
  // Cardio
  cardio_done: boolean;
  cardio_time: string;
  cardio_distance: string;
  cardio_mhr: string;
  // Objectives + Goal
  objectives: string;
  primary_goal: string;
}

export type Step = 'personal' | 'interview' | 'assessment';

export const FLEXIBILITY_TESTS = [
  { label: 'Hamstrings', keyR: 'flex_hamstrings_r', keyL: 'flex_hamstrings_l', bilateral: false },
  { label: 'Quadriceps', keyR: 'flex_quadriceps_r', keyL: 'flex_quadriceps_l', bilateral: false },
  { label: 'Hip Flexors', keyR: 'flex_hip_flexors_r', keyL: 'flex_hip_flexors_l', bilateral: false },
  { label: 'Shoulders', keyR: 'flex_shoulders_r', keyL: 'flex_shoulders_l', bilateral: false },
  { label: 'Toe Reach', keyR: 'flex_toe_reach', keyL: '', bilateral: true },
  { label: 'Trunk Rotation', keyR: 'flex_trunk_r', keyL: 'flex_trunk_l', bilateral: false },
] as const;
