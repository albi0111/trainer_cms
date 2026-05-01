import type {
  AssessmentExerciseKey,
  ClientAssessment,
  ClientLifestyle,
  ClientProfile,
  FlexibilityKey,
} from '../types';

export interface AssessmentExerciseDefinition {
  key: AssessmentExerciseKey;
  field: string;
  label: string;
  icon: string;
}

export interface FlexibilityTestDefinition {
  key: FlexibilityKey;
  label: string;
  keyR: string;
  keyL: string;
  bilateral: boolean;
}

export const ASSESSMENT_EXERCISES: AssessmentExerciseDefinition[] = [
  { key: 'exersise_1', field: 'strength_1_note', label: 'Exercise 1', icon: '/assesment-icons/assesment-exercise-1.png' },
  { key: 'exersise_2', field: 'strength_2_note', label: 'Exercise 2', icon: '/assesment-icons/assesment-exercise-2.png' },
  { key: 'exersise_3', field: 'strength_3_note', label: 'Exercise 3', icon: '/assesment-icons/assesment-exercise-3.png' },
  { key: 'exersise_4', field: 'strength_4_note', label: 'Exercise 4', icon: '/assesment-icons/assesment-exercise-4.png' },
  { key: 'exersise_5', field: 'strength_5_note', label: 'Exercise 5', icon: '/assesment-icons/assesment-exercise-5.jpeg' },
  { key: 'exersise_6', field: 'strength_6_note', label: 'Exercise 6', icon: '/assesment-icons/assesment-exercise-6.jpeg' },
  { key: 'exersise_7', field: 'strength_7_note', label: 'Exercise 7', icon: '/assesment-icons/assesment-exercise-7.png' },
  { key: 'exersise_8', field: 'strength_8_note', label: 'Exercise 8', icon: '/assesment-icons/assesment-exercise-8.png' },
];

export const FLEXIBILITY_TESTS: FlexibilityTestDefinition[] = [
  { label: 'Hamstrings', key: 'hamstrings', keyR: 'flex_hamstrings_r', keyL: 'flex_hamstrings_l', bilateral: false },
  { label: 'Quadriceps', key: 'quadriceps', keyR: 'flex_quadriceps_r', keyL: 'flex_quadriceps_l', bilateral: false },
  { label: 'Hip Flexors', key: 'hip_flexors', keyR: 'flex_hip_flexors_r', keyL: 'flex_hip_flexors_l', bilateral: false },
  { label: 'Shoulders', key: 'shoulders', keyR: 'flex_shoulders_r', keyL: 'flex_shoulders_l', bilateral: false },
  { label: 'Toe Reach', key: 'seated_toe_reach', keyR: 'flex_toe_reach', keyL: '', bilateral: true },
  { label: 'Trunk Rotation', key: 'trunk_rotation', keyR: 'flex_trunk_r', keyL: 'flex_trunk_l', bilateral: false },
];

export const FLEXIBILITY_LABELS: Record<FlexibilityKey, string> = FLEXIBILITY_TESTS.reduce(
  (labels, test) => {
    labels[test.key] = test.label;
    return labels;
  },
  {} as Record<FlexibilityKey, string>,
);

export const EMPTY_PROFILE: Omit<ClientProfile, 'client_id' | 'updated_at'> = {
  age: 0,
  gender: 'other',
  initial_weight_kg: 0,
  height_cm: 0,
  medical_notes: '',
  medications: '',
  photo_uri: '',
};

export const EMPTY_LIFESTYLE: Omit<ClientLifestyle, 'client_id' | 'updated_at'> = {
  job_type: '',
  notes: '',
};

export const EMPTY_ASSESSMENT: Omit<ClientAssessment, 'client_id' | 'updated_at'> = {
  assessed_at: undefined,
  bp_systolic: null,
  bp_diastolic: null,
  resting_heart_rate: null,
  vitals_remarks: '',
  exercises: [],
  cardio_time_minutes: null,
  cardio_distance_km: null,
  cardio_mhr: null,
  flexibility: [],
  objectives: '',
};
