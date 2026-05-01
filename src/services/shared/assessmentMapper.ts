import { ASSESSMENT_EXERCISES, FLEXIBILITY_LABELS } from '../../constants/assessment';
import type {
  AssessmentExercise,
  AssessmentExerciseKey,
  ClientAssessment,
  FlexibilityKey,
  FlexibilityResult,
  Gender,
} from '../../types';

const LEGACY_ASSESSMENT_EXERCISE_KEY_MAP: Record<string, AssessmentExerciseKey> = {
  bench_press: 'exersise_1',
  squat: 'exersise_2',
  leg_press: 'exersise_3',
  lat_pulldown: 'exersise_4',
  seated_row: 'exersise_5',
  leg_curl: 'exersise_6',
  cardio: 'exersise_7',
  other: 'exersise_8',
  exersise_1: 'exersise_1',
  exersise_2: 'exersise_2',
  exersise_3: 'exersise_3',
  exersise_4: 'exersise_4',
  exersise_5: 'exersise_5',
  exersise_6: 'exersise_6',
  exersise_7: 'exersise_7',
  exersise_8: 'exersise_8',
};

function normalizeAssessmentExerciseKey(
  key: string | undefined,
  orderIndex: number,
): AssessmentExerciseKey {
  if (key) {
    const mapped = LEGACY_ASSESSMENT_EXERCISE_KEY_MAP[key];
    if (mapped) {
      return mapped;
    }
  }

  return ASSESSMENT_EXERCISES[orderIndex]?.key || ASSESSMENT_EXERCISES[0]!.key;
}

export function normalizeGender(value: string | undefined): Gender {
  const normalized = (value || '').trim().toLowerCase();
  if (normalized === 'male' || normalized === 'female') {
    return normalized;
  }
  return 'other';
}

export function normalizeAssessmentExercises(exercises: AssessmentExercise[] | undefined): AssessmentExercise[] {
  const existing = new Map<AssessmentExerciseKey, AssessmentExercise>();
  for (const [index, exercise] of (exercises || []).entries()) {
    const normalizedKey = normalizeAssessmentExerciseKey(exercise.key, index);
    existing.set(normalizedKey, {
      key: normalizedKey,
      order_index: exercise.order_index,
      note: exercise.note || '',
    });
  }

  return ASSESSMENT_EXERCISES.map((definition, index) => ({
    key: definition.key,
    order_index: existing.get(definition.key)?.order_index ?? index,
    note: existing.get(definition.key)?.note || '',
  }));
}

export function normalizeFlexibilityResults(results: FlexibilityResult[] | undefined): FlexibilityResult[] {
  const byKey = new Map<FlexibilityKey, FlexibilityResult>();
  for (const result of results || []) {
    const key = result.key;
    byKey.set(key, {
      key,
      label: FLEXIBILITY_LABELS[key],
      right: typeof result.right === 'boolean' ? result.right : undefined,
      left: typeof result.left === 'boolean' ? result.left : undefined,
      pass: typeof result.pass === 'boolean' ? result.pass : undefined,
      note: result.note || '',
    });
  }

  return Object.entries(FLEXIBILITY_LABELS).map(([key, label]) => {
    const result = byKey.get(key as FlexibilityKey);
    return {
      key: key as FlexibilityKey,
      label,
      right: result?.right,
      left: result?.left,
      pass: result?.pass,
      note: result?.note || '',
    };
  });
}

export function normalizeAssessment(
  assessment: ClientAssessment | null | undefined,
): ClientAssessment | null {
  if (!assessment) {
    return null;
  }

  return {
    ...assessment,
    exercises: normalizeAssessmentExercises(assessment.exercises),
    flexibility: normalizeFlexibilityResults(assessment.flexibility),
  };
}
