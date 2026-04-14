import React, { createContext, useContext, useState } from 'react';

export type ClientStatus = 'active' | 'inactive' | 'on-hold';

export interface Session {
  id: string;
  date: string;
  time: string;
  duration: number;
  type: string;
  notes: string;
  completed: boolean;
}

export interface ProgressEntry {
  id: string;
  date: string;
  weight: number;
  bodyFat?: number;
  notes: string;
}

export interface Exercise {
  name: string;
  sets: number;
  reps: string;
  notes?: string;
}

export interface WorkoutDay {
  day: string;
  exercises: Exercise[];
}

export interface Meal {
  name: string;
  description: string;
}

export interface DietPlan {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  meals: Meal[];
  notes: string;
}

export interface Client {
  id: string;
  name: string;
  age: number;
  gender: string;
  phone: string;
  email: string;
  goal: string;
  status: ClientStatus;
  experience: string;
  injuries: string;
  lifestyle: string;
  weight: number;
  height: number;
  targetWeight: number;
  sessions: Session[];
  progress: ProgressEntry[];
  workoutPlan: WorkoutDay[];
  dietPlan: DietPlan;
  overviewNotes: string;
  createdAt: string;
}

const defaultDietPlan: DietPlan = {
  calories: 0, protein: 0, carbs: 0, fat: 0, meals: [], notes: '',
};

const mockClients: Client[] = [
  {
    id: '1',
    name: 'Marcus Chen',
    age: 28,
    gender: 'Male',
    phone: '+1 234 567 8901',
    email: 'marcus.chen@email.com',
    goal: 'Build Muscle Mass',
    status: 'active',
    experience: '2 years gym experience, primarily self-taught',
    injuries: 'Mild right knee strain (2022) — avoid heavy leg press',
    lifestyle: 'Desk job, sedentary 8hrs/day, sleeps ~7hrs, low stress',
    weight: 78,
    height: 178,
    targetWeight: 85,
    overviewNotes: 'Highly motivated, responds well to progressive overload. Prefers morning sessions. Needs guidance on form — tends to rush sets.',
    sessions: [
      { id: 'c1s1', date: '2026-04-10', time: '09:00', duration: 60, type: 'Strength', notes: 'Chest & back focus', completed: false },
      { id: 'c1s2', date: '2026-04-08', time: '09:00', duration: 60, type: 'Strength', notes: 'Legs day — light knee work', completed: true },
      { id: 'c1s3', date: '2026-04-05', time: '10:00', duration: 45, type: 'HIIT', notes: 'Cardio conditioning round', completed: true },
      { id: 'c1s4', date: '2026-04-03', time: '09:00', duration: 60, type: 'Strength', notes: 'Arms & shoulders', completed: true },
    ],
    progress: [
      { id: 'c1p1', date: '2026-03-01', weight: 76, bodyFat: 19, notes: 'Starting baseline' },
      { id: 'c1p2', date: '2026-03-15', weight: 77, bodyFat: 18.5, notes: 'Good progress' },
      { id: 'c1p3', date: '2026-04-01', weight: 78, bodyFat: 18, notes: 'Steady gains' },
      { id: 'c1p4', date: '2026-04-08', weight: 78.5, bodyFat: 17.5, notes: 'On track' },
    ],
    workoutPlan: [
      { day: 'Monday', exercises: [
        { name: 'Bench Press', sets: 4, reps: '8–10', notes: 'Focus on chest squeeze' },
        { name: 'Incline DB Press', sets: 3, reps: '10–12' },
        { name: 'Pull-ups', sets: 4, reps: '6–8' },
        { name: 'Seated Row', sets: 3, reps: '10–12' },
      ]},
      { day: 'Wednesday', exercises: [
        { name: 'Barbell Squat', sets: 4, reps: '6–8', notes: 'Light knee wrap' },
        { name: 'Leg Press', sets: 3, reps: '12–15', notes: 'Moderate weight only' },
        { name: 'Romanian Deadlift', sets: 3, reps: '10–12' },
        { name: 'Calf Raises', sets: 4, reps: '20' },
      ]},
      { day: 'Friday', exercises: [
        { name: 'Overhead Press', sets: 4, reps: '8–10' },
        { name: 'Lateral Raises', sets: 3, reps: '15–20' },
        { name: 'Barbell Curls', sets: 3, reps: '12–15' },
        { name: 'Tricep Pushdowns', sets: 3, reps: '12–15' },
      ]},
    ],
    dietPlan: {
      calories: 2800,
      protein: 190,
      carbs: 320,
      fat: 80,
      meals: [
        { name: 'Breakfast (7am)', description: 'Oats 100g, whey protein shake, 4 scrambled eggs' },
        { name: 'Lunch (1pm)', description: 'Chicken breast 200g, brown rice 150g, mixed vegetables' },
        { name: 'Pre-workout (4pm)', description: 'Greek yogurt, banana, handful of nuts' },
        { name: 'Post-workout (7pm)', description: 'Whey protein shake, white rice 100g' },
        { name: 'Dinner (8pm)', description: 'Salmon 200g, sweet potato 200g, salad' },
      ],
      notes: 'High protein phase. Prioritize protein at every meal. Creatine 5g daily.',
    },
    createdAt: '2026-03-01',
  },
  {
    id: '2',
    name: 'Priya Sharma',
    age: 32,
    gender: 'Female',
    phone: '+1 987 654 3210',
    email: 'priya.sharma@email.com',
    goal: 'Weight Loss & Tone',
    status: 'active',
    experience: 'Beginner, mostly yoga and walks',
    injuries: 'None reported',
    lifestyle: 'Busy professional, moderate stress, sleeps 6hrs, eats out frequently',
    weight: 68,
    height: 163,
    targetWeight: 60,
    overviewNotes: 'Consistent and disciplined. Responds better to shorter, intense sessions. Needs nutritional coaching — main challenge is diet.',
    sessions: [
      { id: 'c2s1', date: '2026-04-10', time: '11:00', duration: 45, type: 'HIIT', notes: 'Full body circuit', completed: false },
      { id: 'c2s2', date: '2026-04-07', time: '11:00', duration: 45, type: 'HIIT', notes: 'Cardio + core', completed: true },
      { id: 'c2s3', date: '2026-04-04', time: '11:00', duration: 45, type: 'Strength', notes: 'Upper body', completed: true },
    ],
    progress: [
      { id: 'c2p1', date: '2026-03-01', weight: 70, bodyFat: 28, notes: 'Start' },
      { id: 'c2p2', date: '2026-03-20', weight: 69, bodyFat: 27, notes: '' },
      { id: 'c2p3', date: '2026-04-05', weight: 68, bodyFat: 26, notes: 'Great progress!' },
    ],
    workoutPlan: [
      { day: 'Tuesday', exercises: [
        { name: 'Jump Rope', sets: 3, reps: '3 min' },
        { name: 'Bodyweight Squats', sets: 4, reps: '20' },
        { name: 'Push-ups', sets: 3, reps: '12–15' },
        { name: 'Plank', sets: 3, reps: '45 sec' },
      ]},
      { day: 'Thursday', exercises: [
        { name: 'Treadmill', sets: 1, reps: '20 min HIIT' },
        { name: 'Dumbbell Lunges', sets: 3, reps: '12 each' },
        { name: 'Lat Pulldown', sets: 3, reps: '12–15' },
        { name: 'Russian Twists', sets: 3, reps: '20' },
      ]},
      { day: 'Saturday', exercises: [
        { name: 'Cycling', sets: 1, reps: '30 min moderate' },
        { name: 'Glute Bridges', sets: 4, reps: '20' },
        { name: 'Seated Shoulder Press', sets: 3, reps: '12' },
      ]},
    ],
    dietPlan: {
      calories: 1600,
      protein: 130,
      carbs: 160,
      fat: 55,
      meals: [
        { name: 'Breakfast (8am)', description: 'Greek yogurt 200g, berries, 2 boiled eggs' },
        { name: 'Lunch (1pm)', description: 'Grilled chicken salad, olive oil dressing' },
        { name: 'Snack (4pm)', description: 'Apple, 20g almonds' },
        { name: 'Dinner (7pm)', description: 'Grilled fish 150g, steamed vegetables, small portion rice' },
      ],
      notes: 'Caloric deficit of ~400 kcal. High protein to preserve muscle. Avoid processed foods and sugar.',
    },
    createdAt: '2026-03-05',
  },
  {
    id: '3',
    name: 'Alex Johnson',
    age: 24,
    gender: 'Male',
    phone: '+1 555 123 4567',
    email: 'alex.j@email.com',
    goal: 'Athletic Performance',
    status: 'active',
    experience: 'College athlete (soccer), 5+ years training',
    injuries: 'Ankle sprain history, fully recovered',
    lifestyle: 'Active lifestyle, good sleep, competitive mindset',
    weight: 74,
    height: 180,
    targetWeight: 76,
    overviewNotes: 'Elite mentality. Push him hard. Focus on speed, power, and agility. Works great in high-intensity sessions.',
    sessions: [
      { id: 'c3s1', date: '2026-04-10', time: '14:00', duration: 75, type: 'Performance', notes: 'Speed & agility drills', completed: false },
      { id: 'c3s2', date: '2026-04-08', time: '14:00', duration: 75, type: 'Strength', notes: 'Explosive lower body', completed: true },
      { id: 'c3s3', date: '2026-04-06', time: '14:00', duration: 60, type: 'Performance', notes: 'Plyometrics', completed: true },
    ],
    progress: [
      { id: 'c3p1', date: '2026-03-01', weight: 73, bodyFat: 12, notes: 'Baseline' },
      { id: 'c3p2', date: '2026-04-01', weight: 74, bodyFat: 11.5, notes: 'Clean lean gain' },
    ],
    workoutPlan: [
      { day: 'Monday', exercises: [
        { name: 'Power Clean', sets: 5, reps: '3' },
        { name: 'Box Jumps', sets: 4, reps: '6' },
        { name: 'Sprint Intervals', sets: 6, reps: '30m' },
      ]},
      { day: 'Wednesday', exercises: [
        { name: 'Deadlift', sets: 5, reps: '3–5' },
        { name: 'Bulgarian Split Squat', sets: 3, reps: '8 each' },
        { name: 'Agility Ladder', sets: 5, reps: '3 patterns' },
      ]},
      { day: 'Friday', exercises: [
        { name: 'Bench Press', sets: 4, reps: '6' },
        { name: 'Pull-ups weighted', sets: 4, reps: '6' },
        { name: 'Core Circuit', sets: 3, reps: '4 exercises' },
      ]},
    ],
    dietPlan: {
      calories: 3200,
      protein: 180,
      carbs: 420,
      fat: 85,
      meals: [
        { name: 'Pre-training', description: 'Oats, banana, protein shake' },
        { name: 'Post-training', description: 'Protein shake, sports drink, rice cakes' },
        { name: 'Lunch', description: 'Large chicken/rice bowl, vegetables' },
        { name: 'Dinner', description: 'Red meat or salmon, pasta, salad' },
      ],
      notes: 'Performance-focused nutrition. Carb timing around training crucial.',
    },
    createdAt: '2026-03-10',
  },
  {
    id: '4',
    name: 'Emma Davis',
    age: 35,
    gender: 'Female',
    phone: '+1 444 333 2222',
    email: 'emma.davis@email.com',
    goal: 'Tone & Flexibility',
    status: 'on-hold',
    experience: 'Intermediate, 1 year regular gym',
    injuries: 'Lower back sensitivity',
    lifestyle: 'Work from home, two kids, limited time',
    weight: 62,
    height: 165,
    targetWeight: 59,
    overviewNotes: 'On hold due to travel (April). Will resume May 1. Great attitude but scheduling is tough with kids.',
    sessions: [
      { id: 'c4s1', date: '2026-03-28', time: '10:00', duration: 45, type: 'Pilates', notes: 'Core & flexibility', completed: true },
      { id: 'c4s2', date: '2026-03-25', time: '10:00', duration: 45, type: 'Strength', notes: 'Upper body light', completed: true },
    ],
    progress: [
      { id: 'c4p1', date: '2026-03-01', weight: 63, bodyFat: 24, notes: 'Start' },
      { id: 'c4p2', date: '2026-03-28', weight: 62, bodyFat: 23.5, notes: 'Good start' },
    ],
    workoutPlan: [
      { day: 'Tuesday', exercises: [
        { name: 'Yoga Flow', sets: 1, reps: '20 min' },
        { name: 'Resistance Band Squats', sets: 3, reps: '15' },
        { name: 'Glute Kickbacks', sets: 3, reps: '15 each' },
      ]},
      { day: 'Friday', exercises: [
        { name: 'Pilates Core', sets: 1, reps: '20 min' },
        { name: 'Dumbbell Row', sets: 3, reps: '12' },
        { name: 'Stretching', sets: 1, reps: '10 min' },
      ]},
    ],
    dietPlan: {
      calories: 1800,
      protein: 110,
      carbs: 200,
      fat: 70,
      meals: [
        { name: 'Breakfast', description: 'Smoothie with protein, spinach, fruit' },
        { name: 'Lunch', description: 'Quinoa bowl with vegetables and chickpeas' },
        { name: 'Dinner', description: 'Lean protein with roasted vegetables' },
      ],
      notes: 'Balanced, whole-foods diet. No strict calorie counting — focus on quality.',
    },
    createdAt: '2026-03-01',
  },
  {
    id: '5',
    name: 'Ryan Kim',
    age: 41,
    gender: 'Male',
    phone: '+1 777 888 9999',
    email: 'ryan.kim@email.com',
    goal: 'Rehabilitation & Strength',
    status: 'active',
    experience: 'Fitness veteran, returning after surgery',
    injuries: 'Right shoulder rotator cuff surgery (Jan 2026) — avoid overhead pressing',
    lifestyle: 'Active job (contractor), moderate lifestyle, sleeps well',
    weight: 88,
    height: 182,
    targetWeight: 83,
    overviewNotes: 'Post-surgery rehab client. Cleared by physio for controlled resistance training. No overhead work yet. Progressing steadily.',
    sessions: [
      { id: 'c5s1', date: '2026-04-09', time: '16:00', duration: 45, type: 'Rehabilitation', notes: 'Shoulder mobility + lower body', completed: true },
      { id: 'c5s2', date: '2026-04-06', time: '16:00', duration: 45, type: 'Rehabilitation', notes: 'Band work, light resistance', completed: true },
    ],
    progress: [
      { id: 'c5p1', date: '2026-02-01', weight: 91, bodyFat: 22, notes: 'Post-surgery baseline' },
      { id: 'c5p2', date: '2026-03-01', weight: 90, bodyFat: 21.5, notes: '' },
      { id: 'c5p3', date: '2026-04-01', weight: 88, bodyFat: 20.5, notes: 'Great progress' },
    ],
    workoutPlan: [
      { day: 'Monday', exercises: [
        { name: 'Shoulder Mobility Drills', sets: 3, reps: '10 each' },
        { name: 'Leg Press', sets: 3, reps: '15' },
        { name: 'Seated Row (light)', sets: 3, reps: '15' },
      ]},
      { day: 'Thursday', exercises: [
        { name: 'Resistance Band Rotations', sets: 3, reps: '15' },
        { name: 'Goblet Squat', sets: 4, reps: '12' },
        { name: 'Walking Lunges', sets: 3, reps: '10 each' },
      ]},
    ],
    dietPlan: {
      calories: 2200,
      protein: 165,
      carbs: 220,
      fat: 75,
      meals: [
        { name: 'Breakfast', description: 'Protein oats, eggs, fruit' },
        { name: 'Lunch', description: 'Lean protein, salad, whole grain bread' },
        { name: 'Dinner', description: 'Fish or chicken, vegetables, small carb' },
      ],
      notes: 'Anti-inflammatory diet focus. Omega-3 supplementation. Slight caloric deficit.',
    },
    createdAt: '2026-02-01',
  },
  {
    id: '6',
    name: 'Sofia Rodriguez',
    age: 26,
    gender: 'Female',
    phone: '+1 321 654 9870',
    email: 'sofia.r@email.com',
    goal: 'General Fitness',
    status: 'inactive',
    experience: 'Casual gym goer, 6 months',
    injuries: 'None',
    lifestyle: 'Social, irregular schedule, student',
    weight: 58,
    height: 160,
    targetWeight: 57,
    overviewNotes: 'Paused sessions in March. Has not responded to follow-ups. Will attempt to reconnect in May.',
    sessions: [
      { id: 'c6s1', date: '2026-03-10', time: '13:00', duration: 45, type: 'General', notes: 'Full body routine', completed: true },
      { id: 'c6s2', date: '2026-03-07', time: '13:00', duration: 45, type: 'General', notes: 'Cardio + core', completed: true },
    ],
    progress: [
      { id: 'c6p1', date: '2026-02-15', weight: 59, bodyFat: 22, notes: 'Start' },
      { id: 'c6p2', date: '2026-03-10', weight: 58, bodyFat: 21.5, notes: '' },
    ],
    workoutPlan: [
      { day: 'Monday', exercises: [
        { name: 'Treadmill', sets: 1, reps: '20 min' },
        { name: 'Squat', sets: 3, reps: '12' },
        { name: 'Dumbbell Press', sets: 3, reps: '12' },
      ]},
    ],
    dietPlan: {
      calories: 1700,
      protein: 100,
      carbs: 200,
      fat: 60,
      meals: [
        { name: 'Breakfast', description: 'Cereal or toast, fruit' },
        { name: 'Lunch', description: 'Balanced meal' },
        { name: 'Dinner', description: 'Home cooked balanced meal' },
      ],
      notes: 'Flexible approach. Focus on sustainable habits.',
    },
    createdAt: '2026-02-15',
  },
];

interface AppContextType {
  clients: Client[];
  addClient: (client: Omit<Client, 'id' | 'sessions' | 'progress' | 'workoutPlan' | 'dietPlan' | 'overviewNotes' | 'createdAt'>) => string;
  updateClient: (id: string, updates: Partial<Client>) => void;
  getClient: (id: string) => Client | undefined;
  addSession: (clientId: string, session: Omit<Session, 'id'>) => void;
  updateSession: (clientId: string, session: Session) => void;
  deleteSession: (clientId: string, sessionId: string) => void;
  addProgress: (clientId: string, entry: Omit<ProgressEntry, 'id'>) => void;
  deleteProgress: (clientId: string, entryId: string) => void;
  updateWorkoutPlan: (clientId: string, plan: WorkoutDay[]) => void;
  updateDietPlan: (clientId: string, plan: DietPlan) => void;
  updateOverviewNotes: (clientId: string, notes: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [clients, setClients] = useState<Client[]>(mockClients);

  const addClient = (data: Omit<Client, 'id' | 'sessions' | 'progress' | 'workoutPlan' | 'dietPlan' | 'overviewNotes' | 'createdAt'>) => {
    const id = Date.now().toString();
    const newClient: Client = {
      ...data,
      id,
      sessions: [],
      progress: [],
      workoutPlan: [],
      dietPlan: defaultDietPlan,
      overviewNotes: '',
      createdAt: new Date().toISOString().split('T')[0],
    };
    setClients(prev => [newClient, ...prev]);
    return id;
  };

  const updateClient = (id: string, updates: Partial<Client>) => {
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const getClient = (id: string) => clients.find(c => c.id === id);

  const addSession = (clientId: string, session: Omit<Session, 'id'>) => {
    const newSession = { ...session, id: Date.now().toString() };
    setClients(prev => prev.map(c =>
      c.id === clientId ? { ...c, sessions: [newSession, ...c.sessions] } : c
    ));
  };

  const updateSession = (clientId: string, session: Session) => {
    setClients(prev => prev.map(c =>
      c.id === clientId ? { ...c, sessions: c.sessions.map(s => s.id === session.id ? session : s) } : c
    ));
  };

  const deleteSession = (clientId: string, sessionId: string) => {
    setClients(prev => prev.map(c =>
      c.id === clientId ? { ...c, sessions: c.sessions.filter(s => s.id !== sessionId) } : c
    ));
  };

  const addProgress = (clientId: string, entry: Omit<ProgressEntry, 'id'>) => {
    const newEntry = { ...entry, id: Date.now().toString() };
    setClients(prev => prev.map(c =>
      c.id === clientId ? { ...c, progress: [...c.progress, newEntry] } : c
    ));
  };

  const deleteProgress = (clientId: string, entryId: string) => {
    setClients(prev => prev.map(c =>
      c.id === clientId ? { ...c, progress: c.progress.filter(p => p.id !== entryId) } : c
    ));
  };

  const updateWorkoutPlan = (clientId: string, plan: WorkoutDay[]) => {
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, workoutPlan: plan } : c));
  };

  const updateDietPlan = (clientId: string, plan: DietPlan) => {
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, dietPlan: plan } : c));
  };

  const updateOverviewNotes = (clientId: string, notes: string) => {
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, overviewNotes: notes } : c));
  };

  return (
    <AppContext.Provider value={{
      clients, addClient, updateClient, getClient,
      addSession, updateSession, deleteSession,
      addProgress, deleteProgress,
      updateWorkoutPlan, updateDietPlan, updateOverviewNotes,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}