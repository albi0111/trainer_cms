// ─────────────────────────────────────────────────────────────────────────────
// ClientScreen — Full client view with session completion flow
// Tabs: Overview | Analytics | Plans | Health | Profile
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useEffect } from 'react';
import './ClientScreen.css';
import { db } from '../db/db';
import { useParams } from 'react-router-dom';

import TopNavBar from '../components/layout/TopNavBar';
import PageWrapper from '../components/layout/PageWrapper';
import TabBar from '../components/ui/TabBar';

import ClientHeaderCard from '../components/client/ClientHeaderCard';
import OverviewSection from '../components/client/OverviewSection';
import MedicationSection from '../components/client/MedicationSection';
import SessionsSection from '../components/client/SessionsSection';
import WorkoutPlanSection from '../components/client/WorkoutPlanSection';
import DietPlanSection from '../components/client/DietPlanSection';
import AnalyticsSection from '../components/client/AnalyticsSection';
import ProfileSection from '../components/client/ProfileSection';
import RecentActivitySection, { type ActivityEntry } from '../components/client/RecentActivitySection';
import { type CompleteSessionData } from '../components/client/CompleteSessionModal';
import { type MarkMissedData } from '../components/client/MarkMissedModal';
import ClientModal, { type ClientModalStep } from '../components/modals/ClientModal';
import ScheduleCalendarModal from '../components/client/ScheduleCalendarModal';
import NewSessionModal from '../components/client/NewSessionModal';
import { type ClientStatus, type Plan, type Exercise, type Session } from '../types';
import { buildRecentActivities, completeSession, getSessionDurationMinutes, markSessionMissed, partitionPlannedSessions, revertSession } from '../services/sessionService';
import { deriveClientStatusFromData } from '../utils/clientStatus';
import { generateId } from '../utils/id';
import { nowISO } from '../utils/date';

// ── Initial data (used as default state) ─────────────────────────────────────────
const INIT_CLIENT = {
  id: 'c1',
  name: 'albin',
  goal: 'goal\ngoal\ngoal\ngoal',
  status: 'active' as ClientStatus,
  phone: '0123456789',
  email: 'test@test.com',
};
const INIT_PROFILE = { 
  age: 26, 
  gender: 'Male', 
  initial_weight_kg: 74, 
  height_cm: 178, 
  medical_notes: 'line\nline\nline\nline\nline\nline\nline\nline\nline',
  medications: 'Omega-3 (1g daily)\nMulti-Vitamin (1 daily)\nMagnesium (400mg before sleep)'
};
const INIT_LIFESTYLE = { job_type: 'Beginner', notes: 'line\nline\nline\nline\nline\nline\nline\nline\nline' };
const INIT_ASSESSMENT = {
  bp_systolic: 120, bp_diastolic: 20, resting_heart_rate: 65, objectives: 'goal\ngoal\ngoal\ngoal',
  cardio_time_minutes: 3, cardio_distance_km: 3, cardio_mhr: 130,
  exercises: [
    { key: 'bench_press', note: 'line\nline\nline\nline' },
    { key: 'squat', note: 'line\nline\nline' },
    { key: 'leg_press', note: 'line\nline\nline\nline' },
    { key: 'lat_pulldown', note: 'line\nline\nline' },
    { key: 'seated_row', note: 'line\nline\nline\nline' },
    { key: 'leg_curl', note: 'line\nline\nline' },
    { key: 'cardio', note: '' },
    { key: 'other', note: '' },
  ],
  flexibility: [
    { key: 'hamstrings', label: 'Hamstrings', note: 'line\nline\nline\nline', r: true, l: true },
    { key: 'quadriceps', label: 'Quadriceps', r: true, l: false },
    { key: 'hip_flexors', label: 'Hip Flexors', r: false, l: true },
    { key: 'shoulders', label: 'Shoulders', r: true, l: true },
    { key: 'toe_reach', label: 'Toe Reach', pass: true },
    { key: 'trunk_rotation', label: 'Trunk Rotation', note: 'line\nline\nline\nline', r: true, l: false },
  ],
};

const MOCK_DIET_PLANS = [
  { id: 'd1', title: 'Mass Gainer Diet', goal: 'Bulking', calories: 2800, protein_g: 180, carbs_g: 320, fats_g: 85,
    meals: [
      { name: 'headers', foods: JSON.stringify(['Meal 1', 'Meal 2']) },
      { name: 'Sun', foods: JSON.stringify(['Oats + Banana + Whey', 'Chicken rice bowl']) },
      { name: 'Mon', foods: JSON.stringify(['Eggs + Toast', 'Pasta with ground turkey']) },
      { name: 'Tue', foods: JSON.stringify(['Smoothie bowl', 'Grilled fish + veggies']) },
      { name: 'Wed', foods: JSON.stringify(['Pancakes + berries', 'Steak + potatoes']) },
      { name: 'Thu', foods: JSON.stringify(['Yogurt parfait', 'Chicken wrap']) },
      { name: 'Fri', foods: JSON.stringify(['Eggs benedict', 'Salmon + quinoa']) },
      { name: 'Sat', foods: JSON.stringify(['French toast', 'Burger + salad']) },
    ] }
];

// ── Tab definitions ──────────────────────────────────────────────────────────
const TABS = [
  { key: 'overview', label: 'Overview',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg> },
  { key: 'analytics', label: 'Analytics',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg> },
  { key: 'plans', label: 'Plans',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg> },
  { key: 'health', label: 'Health',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg> },
  { key: 'profile', label: 'Profile',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> },
];

export default function ClientScreen() {
  const { id: routeClientId } = useParams<{ id: string }>();
  const clientId = routeClientId || 'c1';
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditingOverview, setIsEditingOverview] = useState(false);
  const [overviewNotes, setOverviewNotes] = useState('Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6\nLine 7\nLine 8\nLine 9\nLine 10');
  const [medicationNotes, setMedicationNotes] = useState('');
  const [isEditingMed, setIsEditingMed] = useState(false);
  const [isEditingDiet, setIsEditingDiet] = useState(false);
  const [isUpdateModalVisible, setIsUpdateModalVisible] = useState(false);
  const [updateModalStep, setUpdateModalStep] = useState<ClientModalStep>('personal');
  const [dietPlans, setDietPlans] = useState<any[]>(MOCK_DIET_PLANS);
  const [workoutPlans, setWorkoutPlans] = useState<Plan[]>([]);
  // Editable client data — starts from initial values, updated via modal
  const [clientData, setClientData] = useState<{
    id: string;
    name: string;
    goal: string;
    status: ClientStatus;
    phone?: string;
    email?: string;
    overview_notes?: string;
  }>(INIT_CLIENT);
  const [profileData, setProfileData] = useState<{
    age: number;
    gender: string;
    initial_weight_kg: number;
    height_cm: number;
    medical_notes: string;
    medications?: string;
  }>(INIT_PROFILE);
  const [lifestyleData, setLifestyleData] = useState<{
    job_type?: string;
    notes?: string;
  }>(INIT_LIFESTYLE);
  const [assessmentData, setAssessmentData] = useState<any>(INIT_ASSESSMENT);

  // Session logic — partitioning for the Overview tab
  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([]);
  const [pendingSessions, setPendingSessions] = useState<Session[]>([]);
  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);

  // Scheduling state
  const [calendarWeekPlan, setCalendarWeekPlan] = useState<Plan | null>(null);
  const [newSessionSlot, setNewSessionSlot] = useState<{ date: string, time: string } | null>(null);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [postponeMode, setPostponeMode] = useState(false);

  // ── Persistence: Hydrate from Dexie ─────────────────────────────
  const loadData = useCallback(async () => {
    try {
      // Seed if empty
      const existingClient = await db.clients.get(clientId);
      if (!existingClient && clientId === 'c1') {
        await db.clients.put({ ...INIT_CLIENT, id: clientId, version: 1, sync_status: 'synced', created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as any);
        await db.clientProfiles.put({ ...INIT_PROFILE, client_id: clientId, updated_at: new Date().toISOString() } as any);
        await db.clientLifestyles.put({ ...INIT_LIFESTYLE, client_id: clientId, updated_at: new Date().toISOString() } as any);
        await db.clientAssessments.put({ ...INIT_ASSESSMENT, client_id: clientId, updated_at: new Date().toISOString() } as any);
        for (const plan of MOCK_DIET_PLANS) {
          await db.dietPlans.put({ ...plan, client_id: clientId, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as any);
        }
      }

      // Load from DB
      const client = await db.clients.get(clientId);
      const profile = await db.clientProfiles.get(clientId);
      const lifestyle = await db.clientLifestyles.get(clientId);
      const assessment = await db.clientAssessments.get(clientId);
      const dPlans = await db.dietPlans.where('client_id').equals(clientId).toArray();
      const wPlans = await db.plans.where('client_id').equals(clientId).toArray();
      
      const dbSessions = await db.sessions.where('client_id').equals(clientId).toArray();
      const dbExercises = dbSessions.length > 0
        ? await db.exercises.where('session_id').anyOf(dbSessions.map((session) => session.id)).toArray()
        : [];
      const derivedStatus = deriveClientStatusFromData(dbSessions, wPlans);

      if (client) {
        setClientData({
          id: client.id,
          name: client.name,
          goal: client.goal,
          status: derivedStatus,
          phone: client.phone,
          email: client.email,
          overview_notes: client.overview_notes,
        });
        setOverviewNotes(client.overview_notes || '');
      }
      if (profile) {
        setProfileData(profile as any);
        setMedicationNotes(profile.medications || '');
      }
      if (lifestyle) setLifestyleData(lifestyle as any);
      if (assessment) setAssessmentData(assessment as any);
      if (dPlans.length > 0) setDietPlans(dPlans as any);
      setWorkoutPlans(wPlans);
      setAllSessions(dbSessions);
      setExercises(dbExercises);

      const { upcoming, pending } = partitionPlannedSessions(dbSessions);
      setUpcomingSessions(upcoming);
      setPendingSessions(pending);
      setActivities(await buildRecentActivities(dbSessions));

    } catch (e) {
      console.error('Failed to load from Dexie', e);
    }
  }, [clientId]);

  // Handler: receives updated data from ClientModal
  const handleUpdateClient = useCallback(async () => {
    await loadData();
  }, [loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Complete a session
  const handleCompleteSession = useCallback(async (id: string, data: CompleteSessionData) => {
    try {
      await completeSession(id, data);
      await loadData();
    } catch (error) {
      console.error('Failed to complete session', error);
      window.alert(error instanceof Error ? error.message : 'Failed to complete session.');
    }
  }, [loadData]);

  // Miss a session
  const handleMissSession = useCallback(async (id: string, data: MarkMissedData) => {
    try {
      await markSessionMissed(id, data);
      await loadData();
    } catch (error) {
      console.error('Failed to mark session missed', error);
      window.alert(error instanceof Error ? error.message : 'Failed to mark session missed.');
    }
  }, [loadData]);

  // Revert activity
  const handleRevert = useCallback(async (id: string) => {
    try {
      await revertSession(id);
      await loadData();
    } catch (error) {
      console.error('Failed to revert session', error);
      window.alert(error instanceof Error ? error.message : 'Failed to revert session.');
    }
  }, [loadData]);

  return (
    <div className="client-page">
      <TopNavBar showBack={true} />

      <PageWrapper>
        <div className="client-content">
          <ClientHeaderCard 
            name={clientData.name}
            goal={clientData.goal}
            age={profileData.age}
            weight={profileData.initial_weight_kg}
            height={profileData.height_cm}
            status={clientData.status}
          />

          <TabBar 
            tabs={TABS}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />

          <div className="tab-content">
            {activeTab === 'overview' && (
              <div className="overview-container">
                <OverviewSection
                  value={overviewNotes}
                  isEditing={isEditingOverview}
                  onValueChange={setOverviewNotes}
                  onToggleEdit={() => setIsEditingOverview(!isEditingOverview)}
                  onSave={async () => {
                    await db.clients.update(clientId, { overview_notes: overviewNotes });
                    setIsEditingOverview(false);
                  }}
                />


                <RecentActivitySection 
                  activities={activities}
                  onRevert={handleRevert}
                />

                <SessionsSection 
                  upcoming={upcomingSessions}
                  pending={pendingSessions}
                  onCompleteSession={handleCompleteSession}
                  onMissSession={handleMissSession}
                  onPostponeSession={(id) => {
                    const session = allSessions.find(s => s.id === id);
                    if (session) {
                      setEditingSession(session);
                      setNewSessionSlot({ date: session.date || '', time: session.start_time || '' });
                      setPostponeMode(true);
                    }
                  }}
                />
              </div>
            )}

            {activeTab === 'analytics' && (
              <AnalyticsSection clientId={clientId} />
            )}

            {activeTab === 'plans' && (
              <div className="plans-container">
                <WorkoutPlanSection 
                  clientId={clientId}
                  plans={workoutPlans} 
                  sessions={upcomingSessions.concat(pendingSessions)}
                  allSessions={allSessions}
                  exercises={exercises}
                  onOpenCalendar={(plan) => setCalendarWeekPlan(plan)}
                  onEditSession={(session) => {
                    setEditingSession(session);
                    setNewSessionSlot({ date: session.date || '', time: session.start_time || '' });
                    setPostponeMode(false);
                  }}
                  onPlansChange={loadData}
                />

              </div>
            )}

            {activeTab === 'health' && (
              <div className="health-container">
                <MedicationSection
                  value={medicationNotes}
                  isEditing={isEditingMed}
                  onValueChange={setMedicationNotes}
                  onToggleEdit={() => setIsEditingMed(!isEditingMed)}
                  onSave={async () => {
                    await db.clientProfiles.update(clientId, { medications: medicationNotes });
                    setIsEditingMed(false);
                  }}
                />
                <DietPlanSection 
                  dietPlans={dietPlans}
                  isEditing={isEditingDiet}
                  onToggleEdit={() => setIsEditingDiet(!isEditingDiet)}
                  onSavePlan={async (planData) => {
                    if (dietPlans.length > 0) {
                      await db.dietPlans.update(dietPlans[0].id, { ...planData, updated_at: nowISO() });
                    } else {
                      await db.dietPlans.add({ 
                        id: generateId(), 
                        client_id: clientId, 
                        ...planData, 
                        title: 'Daily Diet', 
                        goal: 'Maintenance',
                        created_at: nowISO(), 
                        updated_at: nowISO() 
                      } as any);
                    }
                    setIsEditingDiet(false);
                    await loadData();
                  }} 
                />
              </div>
            )}

            {activeTab === 'profile' && (
              <ProfileSection
                data={{ client: clientData, profile: profileData, lifestyle: lifestyleData, assessment: assessmentData }}
                onEditSection={(s: 'personal' | 'interview' | 'assessment') => {
                  setUpdateModalStep(s);
                  setIsUpdateModalVisible(true);
                }}
                onDeleteClient={() => {
                  if (window.confirm('Are you sure you want to delete this client?')) {
                    db.clients.delete(clientId).then(() => {
                      window.location.href = '/';
                    });
                  }
                }}
              />
            )}
          </div>
        </div>
      </PageWrapper>

      <ClientModal 
        open={isUpdateModalVisible} 
        onClose={() => setIsUpdateModalVisible(false)} 
        onSuccess={handleUpdateClient}
        clientId={clientId}
        initialStep={updateModalStep}
      />

      <ScheduleCalendarModal 
        visible={!!calendarWeekPlan}
        onClose={() => setCalendarWeekPlan(null)}
        weekPlan={calendarWeekPlan}
        sessions={allSessions}
        activeClientId={clientId}
        onSlotClick={(date: string, time: string) => {
          setPostponeMode(false);
          setNewSessionSlot({ date, time });
          setEditingSession(null);
        }}
        onSessionClick={(session: Session) => {
          setPostponeMode(false);
          setEditingSession(session);
          setNewSessionSlot({ date: session.date || '', time: session.start_time || '' });
        }}
        onGoalChange={async (goal: string) => {
          if (calendarWeekPlan) {
            await db.plans.update(calendarWeekPlan.id, { goal });
            await loadData();
          }
        }}
        onPlansChange={loadData}
      />

      <NewSessionModal
        visible={!!newSessionSlot}
        onClose={() => {
          setNewSessionSlot(null);
          setEditingSession(null);
          setPostponeMode(false);
        }}
        initialDate={newSessionSlot?.date || ''}
        initialTime={newSessionSlot?.time || ''}
        editingSession={editingSession}
        sessions={allSessions}
        postponeMode={postponeMode}
        onDelete={async (sId: string) => {
          await db.sessions.delete(sId);
          await db.exercises.where('session_id').equals(sId).delete();
          setNewSessionSlot(null);
          setEditingSession(null);
          setPostponeMode(false);
          await loadData();
        }}
        onSave={async (data: any) => {
          if (!calendarWeekPlan && !editingSession) return;
          const sId = data.id || generateId();
          const now = nowISO();
          const planId = calendarWeekPlan?.id ?? editingSession?.plan_id ?? null;
          const isPostponed = Boolean(
            editingSession &&
            (
              editingSession.date !== data.date ||
              editingSession.start_time !== data.start_time ||
              editingSession.end_time !== data.end_time
            ),
          );
          const durationMinutes = getSessionDurationMinutes({
            start_time: data.start_time,
            end_time: data.end_time,
            duration_minutes: editingSession?.duration_minutes,
          });

          await db.sessions.put({
            id: sId,
            client_id: clientId,
            plan_id: planId,
            date: data.date,
            start_time: data.start_time,
            end_time: data.end_time,
            duration_minutes: durationMinutes,
            day_name: new Date(data.date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase(),
            focus: data.focus || '',
            type: 'mixed',
            status: 'planned',
            measure_reminder: data.measure_reminder,
            original_date: editingSession
              ? (editingSession.original_date || (isPostponed ? editingSession.date : undefined))
              : undefined,
            postponed_note: editingSession
              ? (isPostponed ? (data.postponed_note || editingSession.postponed_note || 're-scheduled from calendar') : editingSession.postponed_note)
              : undefined,
            created_at: editingSession?.created_at || now,
            updated_at: now
          });

          await db.exercises.where('session_id').equals(sId).delete();
          for (let i = 0; i < data.exercises.length; i++) {
            const ex = data.exercises[i];
            await db.exercises.put({
              id: generateId(),
              session_id: sId,
              name: ex.name || '',
              order_index: i,
              target_reps: ex.reps,
              sets: [],
              created_at: now
            });
          }
          
          setNewSessionSlot(null);
          setEditingSession(null);
          setPostponeMode(false);
          await loadData();
        }}
      />
    </div>
  );
}
