import { buildDefaultMetricConfigs } from '../../constants/metrics';
import { db } from '../../db/db';
import type {
  Client,
  ClientAssessment,
  ClientLifestyle,
  ClientProfile,
  DietPlan,
  Exercise,
  Gender,
  Measurement,
  Plan,
  Session,
  SessionResult,
  SessionType,
  SyncDomain,
  SyncQueueEntry,
} from '../../types';
import { toDayName } from '../shared/date';

const DEMO_CLIENT_IDS = [
  'demo-client-arjun-menon',
  'demo-client-meera-nair',
  'demo-client-rohan-george',
];

type DemoClientSeed = {
  id: string;
  name: string;
  phone: string;
  email: string;
  goal: string;
  overview: string;
  profile: Omit<ClientProfile, 'client_id' | 'updated_at'>;
  lifestyle: Omit<ClientLifestyle, 'client_id' | 'updated_at'>;
  assessment: Omit<ClientAssessment, 'client_id' | 'updated_at'>;
  measurements: Array<{
    offsetDays: number;
    weight: number;
    waist: number;
    chest: number;
    push: number;
    pull: number;
    lower: number;
    cardio: number;
    bodyFat: number;
  }>;
  sessionFocuses: Array<{
    offsetDays: number;
    time: string;
    focus: string;
    type: SessionType;
    status: Session['status'];
    difficulty?: number;
    energy?: number;
    measureReminder?: boolean;
  }>;
};

function isoDateWithOffset(offsetDays: number): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().split('T')[0] || '';
}

function isoNow(): string {
  return new Date().toISOString();
}

function addDays(dateIso: string, days: number): string {
  const date = new Date(`${dateIso}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0] || dateIso;
}

function demoExerciseTemplates(focus: string): Array<Pick<Exercise, 'name' | 'target_sets' | 'target_reps' | 'sets' | 'notes'>> {
  if (focus.toLowerCase().includes('mobility')) {
    return [
      { name: 'World greatest stretch', target_sets: 2, target_reps: '8/side', sets: [{ reps: 8 }], notes: 'Move slowly through hip rotation.' },
      { name: 'Thoracic openers', target_sets: 3, target_reps: '10/side', sets: [{ reps: 10 }], notes: 'Keep hips stacked.' },
      { name: '90/90 hip switches', target_sets: 3, target_reps: '12', sets: [{ reps: 12 }], notes: 'No hand support if possible.' },
    ];
  }

  if (focus.toLowerCase().includes('cardio')) {
    return [
      { name: 'Zone 2 bike', target_sets: 1, target_reps: '22 min', sets: [{ reps: 22 }], notes: 'Keep nasal breathing for first half.' },
      { name: 'Incline walk intervals', target_sets: 6, target_reps: '60 sec', sets: [{ reps: 6 }], notes: 'RPE 7 on working intervals.' },
      { name: 'Cooldown walk', target_sets: 1, target_reps: '6 min', sets: [{ reps: 6 }], notes: 'Bring HR down gradually.' },
    ];
  }

  return [
    { name: 'Goblet squat', target_sets: 4, target_reps: '10', sets: [{ weight_kg: 22, reps: 10, rpe: 7 }], notes: 'Pause one second at bottom.' },
    { name: 'Dumbbell bench press', target_sets: 4, target_reps: '8-10', sets: [{ weight_kg: 18, reps: 9, rpe: 8 }], notes: 'Keep shoulder blades pinned.' },
    { name: 'Lat pulldown', target_sets: 3, target_reps: '12', sets: [{ weight_kg: 42, reps: 12, rpe: 7 }], notes: 'Full stretch on each rep.' },
    { name: 'Farmer carry', target_sets: 3, target_reps: '30 m', sets: [{ weight_kg: 24, reps: 3, rpe: 8 }], notes: 'Tall posture, controlled turns.' },
  ];
}

function buildSeeds(): DemoClientSeed[] {
  return [
    {
      id: 'demo-client-arjun-menon',
      name: 'Arjun Menon',
      phone: '+91 98765 43210',
      email: 'arjun.menon@example.com',
      goal: 'Fat loss with strength progression',
      overview: 'Prefers evening sessions. Shoulder mobility needs warm-up attention before pressing work.',
      profile: {
        age: 34,
        gender: 'male' as Gender,
        height_cm: 176,
        initial_weight_kg: 86,
        medical_notes: 'Borderline high BP history. Track BP before high-intensity days.',
        medications: 'None',
      },
      lifestyle: {
        sleep_hours_avg: 6.5,
        stress_level: 'medium',
        activity_level: 'moderate',
        diet_type: 'mixed',
        water_intake_liters: 2.7,
        smoking: false,
        alcohol: true,
        job_type: 'Desk job',
        notes: 'Usually available after 6 PM.',
      },
      assessment: {
        assessed_at: isoDateWithOffset(-28),
        bp_systolic: 138,
        bp_diastolic: 88,
        resting_heart_rate: 78,
        vitals_remarks: 'High-normal BP. Monitor before loaded lower-body sessions.',
        exercises: [],
        cardio_time_minutes: 12,
        cardio_distance_km: 1.35,
        cardio_mhr: 154,
        flexibility: [],
        objectives: 'Drop 6 kg while improving push and pull strength.',
      },
      measurements: [
        { offsetDays: -35, weight: 86.2, waist: 98, chest: 104, push: 38, pull: 42, lower: 82, cardio: 12, bodyFat: 28 },
        { offsetDays: -28, weight: 85.4, waist: 96.8, chest: 103.5, push: 40, pull: 44, lower: 86, cardio: 14, bodyFat: 27.2 },
        { offsetDays: -21, weight: 84.9, waist: 95.6, chest: 103, push: 42, pull: 46, lower: 90, cardio: 15, bodyFat: 26.8 },
        { offsetDays: -14, weight: 84.1, waist: 94.2, chest: 102.8, push: 44, pull: 48, lower: 94, cardio: 17, bodyFat: 26.1 },
        { offsetDays: -3, weight: 83.6, waist: 93.5, chest: 102.5, push: 46, pull: 50, lower: 98, cardio: 18, bodyFat: 25.6 },
      ],
      sessionFocuses: [
        { offsetDays: -12, time: '18:30', focus: 'Strength baseline', type: 'strength', status: 'completed', difficulty: 7, energy: 8 },
        { offsetDays: -9, time: '18:30', focus: 'Cardio conditioning', type: 'cardio', status: 'completed', difficulty: 6, energy: 7 },
        { offsetDays: -6, time: '18:30', focus: 'Mobility and core', type: 'mobility', status: 'completed', difficulty: 5, energy: 8 },
        { offsetDays: -2, time: '18:30', focus: 'Upper push pull', type: 'strength', status: 'completed', difficulty: 8, energy: 7 },
        { offsetDays: 1, time: '18:30', focus: 'Lower body strength', type: 'strength', status: 'planned', measureReminder: true },
        { offsetDays: 4, time: '18:30', focus: 'Cardio intervals', type: 'cardio', status: 'planned' },
      ],
    },
    {
      id: 'demo-client-meera-nair',
      name: 'Meera Nair',
      phone: '+91 99887 76655',
      email: 'meera.nair@example.com',
      goal: 'Posture, mobility, and lean muscle',
      overview: 'Morning availability. Strong adherence with nutrition notes.',
      profile: {
        age: 29,
        gender: 'female' as Gender,
        height_cm: 164,
        initial_weight_kg: 62,
        medical_notes: 'Low BP tendency. Avoid abrupt standing after floor drills.',
        medications: '',
      },
      lifestyle: {
        sleep_hours_avg: 7.5,
        stress_level: 'low',
        activity_level: 'active',
        diet_type: 'veg',
        water_intake_liters: 3,
        smoking: false,
        alcohol: false,
        job_type: 'Hybrid desk job',
        notes: 'Enjoys mobility finishers.',
      },
      assessment: {
        assessed_at: isoDateWithOffset(-22),
        bp_systolic: 96,
        bp_diastolic: 62,
        resting_heart_rate: 68,
        vitals_remarks: 'Low-normal BP. Keep hydration cue before sessions.',
        exercises: [],
        cardio_time_minutes: 16,
        cardio_distance_km: 1.8,
        cardio_mhr: 148,
        flexibility: [],
        objectives: 'Improve posture, shoulder mobility, and full-body strength.',
      },
      measurements: [
        { offsetDays: -30, weight: 62.4, waist: 76, chest: 89, push: 22, pull: 26, lower: 58, cardio: 16, bodyFat: 24 },
        { offsetDays: -23, weight: 62.1, waist: 75.4, chest: 89, push: 23, pull: 28, lower: 61, cardio: 17, bodyFat: 23.6 },
        { offsetDays: -16, weight: 61.8, waist: 74.8, chest: 88.7, push: 25, pull: 30, lower: 64, cardio: 18, bodyFat: 23.1 },
        { offsetDays: -8, weight: 61.5, waist: 74.1, chest: 88.4, push: 26, pull: 31, lower: 66, cardio: 19, bodyFat: 22.8 },
      ],
      sessionFocuses: [
        { offsetDays: -10, time: '07:30', focus: 'Mobility reset', type: 'mobility', status: 'completed', difficulty: 4, energy: 8 },
        { offsetDays: -7, time: '07:30', focus: 'Lower strength', type: 'strength', status: 'completed', difficulty: 7, energy: 8 },
        { offsetDays: -4, time: '07:30', focus: 'Upper posture', type: 'strength', status: 'completed', difficulty: 6, energy: 9 },
        { offsetDays: 2, time: '07:30', focus: 'Mobility and measurements', type: 'mobility', status: 'planned', measureReminder: true },
      ],
    },
    {
      id: 'demo-client-rohan-george',
      name: 'Rohan George',
      phone: '+91 91234 56780',
      email: 'rohan.george@example.com',
      goal: 'Return to training after travel break',
      overview: 'Needs simple plans and travel-friendly alternatives.',
      profile: {
        age: 41,
        gender: 'male' as Gender,
        height_cm: 181,
        initial_weight_kg: 91,
        medical_notes: 'No major limitations. Mild knee discomfort on deep flexion.',
        medications: '',
      },
      lifestyle: {
        sleep_hours_avg: 6,
        stress_level: 'high',
        activity_level: 'sedentary',
        diet_type: 'non-veg',
        water_intake_liters: 2.1,
        smoking: false,
        alcohol: true,
        job_type: 'Travel-heavy sales',
        notes: 'Prefers shorter sessions.',
      },
      assessment: {
        assessed_at: isoDateWithOffset(-18),
        bp_systolic: 122,
        bp_diastolic: 78,
        resting_heart_rate: 74,
        vitals_remarks: 'Normal BP.',
        exercises: [],
        cardio_time_minutes: 10,
        cardio_distance_km: 1.1,
        cardio_mhr: 150,
        flexibility: [],
        objectives: 'Rebuild consistency with three weekly sessions.',
      },
      measurements: [
        { offsetDays: -24, weight: 91.2, waist: 101, chest: 107, push: 34, pull: 39, lower: 76, cardio: 10, bodyFat: 29 },
        { offsetDays: -17, weight: 90.8, waist: 100.2, chest: 106.6, push: 35, pull: 40, lower: 79, cardio: 11, bodyFat: 28.6 },
        { offsetDays: -10, weight: 90.2, waist: 99.4, chest: 106.2, push: 37, pull: 42, lower: 82, cardio: 12, bodyFat: 28.1 },
        { offsetDays: -1, weight: 89.8, waist: 98.9, chest: 106, push: 38, pull: 43, lower: 84, cardio: 13, bodyFat: 27.7 },
      ],
      sessionFocuses: [
        { offsetDays: -8, time: '20:00', focus: 'Travel reset strength', type: 'strength', status: 'completed', difficulty: 6, energy: 6 },
        { offsetDays: -5, time: '20:00', focus: 'Cardio base', type: 'cardio', status: 'missed' },
        { offsetDays: -1, time: '20:00', focus: 'Full-body strength', type: 'mixed', status: 'completed', difficulty: 7, energy: 7 },
        { offsetDays: 3, time: '20:00', focus: 'Short strength circuit', type: 'mixed', status: 'planned', measureReminder: true },
      ],
    },
  ];
}

async function removeExistingDemoData(): Promise<void> {
  const demoClients = await db.clients
    .filter((client) => DEMO_CLIENT_IDS.includes(client.id))
    .toArray();
  const demoClientIds = demoClients.map((client) => client.id);
  const demoSessions = await db.sessions.filter((session) => session.id.startsWith('demo-session-')).toArray();
  const demoPlanIds = (await db.plans.filter((plan) => plan.id.startsWith('demo-plan-')).toArray()).map((plan) => plan.id);
  const demoDietPlanIds = (await db.dietPlans.filter((plan) => plan.id.startsWith('demo-diet-')).toArray()).map((plan) => plan.id);
  const demoMeasurementIds = (await db.measurements.filter((measurement) => measurement.id.startsWith('demo-measurement-')).toArray()).map((measurement) => measurement.id);
  const demoExerciseIds = (await db.exercises.filter((exercise) => exercise.id.startsWith('demo-exercise-')).toArray()).map((exercise) => exercise.id);
  const demoSyncIds = (await db.syncQueue.filter((entry) => entry.id.startsWith('demo-sync-')).toArray()).map((entry) => entry.id);

  await db.exercises.bulkDelete([
    ...demoExerciseIds,
    ...demoSessions.map((session) => session.id),
  ]);
  await db.sessionResults.bulkDelete(demoSessions.map((session) => session.id));
  await db.sessions.bulkDelete(demoSessions.map((session) => session.id));
  await db.plans.bulkDelete(demoPlanIds);
  await db.dietPlans.bulkDelete(demoDietPlanIds);
  await db.measurements.bulkDelete(demoMeasurementIds);
  await db.syncQueue.bulkDelete(demoSyncIds);

  if (demoClientIds.length > 0) {
    await db.measurementConfigs.where('client_id').anyOf(demoClientIds).delete();
    await db.clientProfiles.bulkDelete(demoClientIds);
    await db.clientLifestyles.bulkDelete(demoClientIds);
    await db.clientAssessments.bulkDelete(demoClientIds);
    await db.clients.bulkDelete(demoClientIds);
  }
}

function buildClient(seed: DemoClientSeed, clientId: string, now: string): Client {
  return {
    id: clientId,
    name: seed.name,
    phone: seed.phone,
    email: seed.email,
    goal: seed.goal,
    overview_notes: seed.overview,
    version: 4,
    sync_status: 'pending',
    created_at: now,
    updated_at: now,
  };
}

function buildPlans(seed: DemoClientSeed, clientId: string, now: string): Plan[] {
  const startDate = isoDateWithOffset(-7);
  const monthlyId = `demo-plan-${seed.id}-month`;
  const plans: Plan[] = [{
    id: monthlyId,
    client_id: clientId,
    type: 'monthly',
    title: 'Demo 4 Week Progression',
    goal: seed.goal,
    start_date: startDate,
    end_date: addDays(startDate, 27),
    parent_plan_id: null,
    order_index: null,
    status: 'active',
    created_at: now,
    updated_at: now,
  }];

  for (let index = 1; index <= 4; index += 1) {
    const weekStart = addDays(startDate, (index - 1) * 7);
    plans.push({
      id: `demo-plan-${seed.id}-week-${index}`,
      client_id: clientId,
      type: 'weekly',
      title: `Week ${index}`,
      goal: index === 1 ? 'Baseline and movement quality' : index === 2 ? 'Volume build' : index === 3 ? 'Strength progression' : 'Review and deload',
      start_date: weekStart,
      end_date: addDays(weekStart, 6),
      parent_plan_id: monthlyId,
      order_index: index,
      status: index === 1 ? 'completed' : index === 2 ? 'active' : 'upcoming',
      created_at: now,
      updated_at: now,
    });
  }

  return plans;
}

function buildDietPlan(seed: DemoClientSeed, clientId: string, now: string): DietPlan {
  return {
    id: `demo-diet-${seed.id}`,
    client_id: clientId,
    title: 'Demo Nutrition Plan',
    goal: seed.goal,
    start_date: isoDateWithOffset(-7),
    end_date: isoDateWithOffset(21),
    calories: seed.profile.gender === 'female' ? 1850 : 2250,
    protein_g: seed.profile.gender === 'female' ? 120 : 155,
    carbs_g: seed.profile.gender === 'female' ? 210 : 250,
    fats_g: seed.profile.gender === 'female' ? 55 : 70,
    water_liters: seed.lifestyle.water_intake_liters,
    meals: [
      { name: 'Breakfast', foods: 'Oats, curd, fruit, and nuts' },
      { name: 'Lunch', foods: 'Rice or chapati, lean protein, dal, vegetables' },
      { name: 'Snack', foods: 'Protein shake or sprouts with fruit' },
      { name: 'Dinner', foods: 'Protein plate with vegetables and moderate carbs' },
    ],
    meal_notes: 'Keep protein split across the day.',
    notes: 'Demo plan for testing diet plan layout and Drive sync payloads.',
    created_at: now,
    updated_at: now,
  };
}

function buildMeasurements(seed: DemoClientSeed, clientId: string, now: string): Measurement[] {
  return seed.measurements.map((entry, index) => ({
    id: `demo-measurement-${seed.id}-${index + 1}`,
    client_id: clientId,
    date: isoDateWithOffset(entry.offsetDays),
    weight_kg: entry.weight,
    body_fat_pct: entry.bodyFat,
    chest_cm: entry.chest,
    waist_cm: entry.waist,
    hips_cm: entry.waist + 7,
    arm_cm: seed.profile.gender === 'female' ? 29 + index * 0.2 : 34 + index * 0.3,
    thigh_cm: seed.profile.gender === 'female' ? 53 + index * 0.4 : 58 + index * 0.5,
    neck_cm: seed.profile.gender === 'female' ? 32 : 39,
    calf_cm: seed.profile.gender === 'female' ? 35 + index * 0.2 : 38 + index * 0.2,
    push_strength_kg: entry.push,
    pull_strength_kg: entry.pull,
    lower_body_strength_kg: entry.lower,
    cardio_endurance_min: entry.cardio,
    values: {
      weight_kg: entry.weight,
      body_fat_pct: entry.bodyFat,
      chest_cm: entry.chest,
      waist_cm: entry.waist,
      push_strength_kg: entry.push,
      pull_strength_kg: entry.pull,
      lower_body_strength_kg: entry.lower,
      cardio_endurance_min: entry.cardio,
    },
    custom_values_json: JSON.stringify({
      weight_kg: entry.weight,
      body_fat_pct: entry.bodyFat,
      chest_cm: entry.chest,
      waist_cm: entry.waist,
      push_strength_kg: entry.push,
      pull_strength_kg: entry.pull,
      lower_body_strength_kg: entry.lower,
      cardio_endurance_min: entry.cardio,
    }),
    notes: index === seed.measurements.length - 1 ? 'Latest demo check-in.' : 'Demo progress log.',
    created_at: now,
  }));
}

function buildSessionsAndExercises(seed: DemoClientSeed, clientId: string, now: string): {
  sessions: Session[];
  results: SessionResult[];
  exercises: Exercise[];
} {
  const sessions: Session[] = [];
  const results: SessionResult[] = [];
  const exercises: Exercise[] = [];

  seed.sessionFocuses.forEach((entry, sessionIndex) => {
    const date = isoDateWithOffset(entry.offsetDays);
    const sessionId = `demo-session-${seed.id}-${sessionIndex + 1}`;
    const endHour = String(Number(entry.time.split(':')[0] || '0') + 1).padStart(2, '0');
    const endTime = `${endHour}:${entry.time.split(':')[1] || '00'}`;

    sessions.push({
      id: sessionId,
      client_id: clientId,
      plan_id: `demo-plan-${seed.id}-week-${entry.offsetDays < 0 ? 1 : 2}`,
      date,
      start_time: entry.time,
      end_time: endTime,
      duration_minutes: 60,
      day_name: toDayName(date),
      focus: entry.focus,
      type: entry.type,
      status: entry.status,
      missed_reason: entry.status === 'missed' ? 'travel' : undefined,
      missed_note: entry.status === 'missed' ? 'Travel conflict.' : undefined,
      notes: 'Demo session data.',
      measure_reminder: Boolean(entry.measureReminder),
      created_at: now,
      updated_at: now,
    });

    if (entry.status === 'completed') {
      results.push({
        session_id: sessionId,
        perceived_difficulty: entry.difficulty || 6,
        energy_level: entry.energy || 7,
        performance_notes: 'Completed as planned with steady pacing.',
        trainer_notes: 'Demo result note.',
        completed_at: `${date}T${endTime}:00.000Z`,
      });
    }

    demoExerciseTemplates(entry.focus).forEach((exercise, exerciseIndex) => {
      exercises.push({
        id: `demo-exercise-${seed.id}-${sessionIndex + 1}-${exerciseIndex + 1}`,
        session_id: sessionId,
        name: exercise.name,
        order_index: exerciseIndex,
        target_sets: exercise.target_sets,
        target_reps: exercise.target_reps,
        notes: exercise.notes,
        sets: exercise.sets,
        progression_note: exerciseIndex === 0 ? 'Add load when all reps stay under RPE 8.' : undefined,
        created_at: now,
      });
    });
  });

  return { sessions, results, exercises };
}

function buildSyncQueueEntry(clientId: string, now: string): SyncQueueEntry {
  const domains: SyncDomain[] = [
    'core',
    'measurements',
    'plans',
    'diet_plans',
    'sessions',
    'session_results',
    'exercises',
  ];

  return {
    id: `demo-sync-${clientId}`,
    client_id: clientId,
    operation: 'update',
    affected_domains: domains,
    status: 'pending',
    retry_count: 0,
    next_retry_at: null,
    created_at: now,
    updated_at: now,
  };
}

async function resolveClientId(seed: DemoClientSeed): Promise<string> {
  if (seed.name !== 'Arjun Menon') {
    return seed.id;
  }

  const existingArjun = await db.clients
    .filter((client) => client.name.trim().toLowerCase() === 'arjun menon' && client.sync_status !== 'pending_delete')
    .first();

  return existingArjun?.id || seed.id;
}

export async function seedDemoData(): Promise<{ clientCount: number; sessionCount: number; measurementCount: number }> {
  const now = isoNow();
  const seeds = buildSeeds();
  let sessionCount = 0;
  let measurementCount = 0;

  await db.transaction(
    'rw',
    [
      db.clients,
      db.clientProfiles,
      db.clientLifestyles,
      db.clientAssessments,
      db.measurementConfigs,
      db.measurements,
      db.plans,
      db.dietPlans,
      db.sessions,
      db.sessionResults,
      db.exercises,
      db.syncQueue,
    ],
    async () => {
      await removeExistingDemoData();

      for (const seed of seeds) {
        const clientId = await resolveClientId(seed);
        const existingClient = await db.clients.get(clientId);

        if (existingClient) {
          await db.clients.update(clientId, {
            goal: seed.goal,
            overview_notes: seed.overview,
            version: existingClient.version + 1,
            sync_status: 'pending',
            updated_at: now,
          });
        } else {
          await db.clients.put(buildClient(seed, clientId, now));
        }

        await db.clientProfiles.put({ client_id: clientId, ...seed.profile, updated_at: now });
        await db.clientLifestyles.put({ client_id: clientId, ...seed.lifestyle, updated_at: now });
        await db.clientAssessments.put({ client_id: clientId, ...seed.assessment, updated_at: now });
        await db.measurementConfigs.bulkPut(buildDefaultMetricConfigs(clientId, now));
        await db.plans.bulkPut(buildPlans(seed, clientId, now));
        await db.dietPlans.put(buildDietPlan(seed, clientId, now));

        const measurements = buildMeasurements(seed, clientId, now);
        await db.measurements.bulkPut(measurements);
        measurementCount += measurements.length;

        const sessionBundle = buildSessionsAndExercises(seed, clientId, now);
        await db.sessions.bulkPut(sessionBundle.sessions);
        await db.sessionResults.bulkPut(sessionBundle.results);
        await db.exercises.bulkPut(sessionBundle.exercises);
        sessionCount += sessionBundle.sessions.length;

        await db.syncQueue.put(buildSyncQueueEntry(clientId, now));
      }
    },
  );

  return {
    clientCount: seeds.length,
    sessionCount,
    measurementCount,
  };
}
