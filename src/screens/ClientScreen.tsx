import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './ClientScreen.css';
import { useNavigate, useParams } from 'react-router-dom';

import TopNavBar from '../components/layout/TopNavBar';
import PageWrapper from '../components/layout/PageWrapper';
import TabBar from '../components/ui/TabBar';
import ClientHeaderCard from '../components/client/ClientHeaderCard';
import OverviewSection from '../components/client/OverviewSection';
import SessionsSection from '../components/client/SessionsSection';
import RecentActivitySection, { type ActivityEntry } from '../components/client/RecentActivitySection';
import type { CompleteSessionData } from '../components/client/CompleteSessionModal';
import type { MarkMissedData } from '../components/client/MarkMissedModal';
import type { ClientModalStep } from '../components/modals/ClientModal';
import SkeletonClientProfile from '../components/skeletons/SkeletonClientProfile';
import SkeletonInfoCard from '../components/skeletons/SkeletonInfoCard';
import { EMPTY_ASSESSMENT, EMPTY_LIFESTYLE, EMPTY_PROFILE } from '../constants/assessment';
import useStaggeredEntrance from '../hooks/useStaggeredEntrance';
import { archiveClient, deleteClient, getClientDetail, updateClient, updateClientOverview } from '../services/client/clientService';
import { saveDietPlan, updatePlan } from '../services/plan/planService';
import { checkSessionOverlap, getPlannerScheduleRange } from '../services/schedule/scheduleService';
import {
  completeSession,
  createSession,
  deleteSession,
  duplicateSession,
  getSessionDurationMinutes,
  markSessionMissed,
  partitionPlannedSessions,
  repairDetachedSessionPlanLinks,
  revertSession,
  updateSession,
  type SessionExerciseDraft,
} from '../services/sessionService';
import { toDayName } from '../services/shared/date';
import { useHaptic } from '../hooks/useHaptic';
import { useSoundFeedback } from '../hooks/useSoundFeedback';
import { useAppStore } from '../store/useAppStore';
import type {
  ClientAssessment,
  ClientLifestyle,
  ClientProfile,
  ClientStatus,
  DietPlan,
  Exercise,
  Plan,
  ScheduledSession,
  Session,
} from '../types';

const AppAlert = lazy(() => import('../components/shared/AppAlert'));
const AnalyticsSection = lazy(() => import('../components/client/AnalyticsSection'));
const ClientModal = lazy(() => import('../components/modals/ClientModal'));
const DietPlanSection = lazy(() => import('../components/client/DietPlanSection'));
const MedicationSection = lazy(() => import('../components/client/MedicationSection'));
const NewSessionModal = lazy(() => import('../components/client/NewSessionModal'));
const ProfileSection = lazy(() => import('../components/client/ProfileSection'));
const ScheduleCalendarModal = lazy(() => import('../components/client/ScheduleCalendarModal'));
const WorkoutPlanSection = lazy(() => import('../components/client/WorkoutPlanSection'));

const TABS = [
  { key: 'overview', label: 'Overview',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg> },
  { key: 'analytics', label: 'Analytics',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg> },
  { key: 'plans', label: 'Plans',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 10v4" />
        <path d="M6 8v8" />
        <path d="M18 8v8" />
        <path d="M21 10v4" />
        <path d="M6 12h12" />
      </svg>
    ) },
  { key: 'health', label: 'Health',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg> },
  { key: 'profile', label: 'Profile',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> },
];

const TAB_INDEX = Object.fromEntries(TABS.map((tab, index) => [tab.key, index])) as Record<string, number>;

const EMPTY_CLIENT = {
  id: '',
  name: '',
  goal: '',
  status: 'active' as ClientStatus,
  phone: '',
  email: '',
  overview_notes: '',
};

type ClientScreenProfileState = Omit<ClientProfile, 'client_id' | 'updated_at'>;
type ClientScreenLifestyleState = Omit<ClientLifestyle, 'client_id' | 'updated_at'>;
type ClientScreenAssessmentState = Omit<ClientAssessment, 'client_id' | 'updated_at'>;

function ClientTabFallback() {
  return (
    <div className="client-profile-skeleton-list" aria-hidden="true">
      <SkeletonInfoCard />
      <SkeletonInfoCard />
      <SkeletonInfoCard />
    </div>
  );
}

export default function ClientScreen() {
  const navigate = useNavigate();
  const { id: routeClientId } = useParams<{ id: string }>();
  const clientId = routeClientId || '';
  const hydrateClientDetail = useAppStore((state) => state.hydrateClientDetail);
  const hydrateSchedule = useAppStore((state) => state.hydrateSchedule);
  const invalidateClientDetail = useAppStore((state) => state.invalidateClientDetail);
  const invalidateDashboard = useAppStore((state) => state.invalidateDashboard);
  const refreshDashboard = useAppStore((state) => state.refreshDashboard);
  const setSelectedClientId = useAppStore((state) => state.setSelectedClientId);
  const haptic = useHaptic();
  const { playDelete, playSuccess } = useSoundFeedback();

  const [activeTab, setActiveTab] = useState('overview');
  const [previousTab, setPreviousTab] = useState<string | null>(null);
  const [tabDirection, setTabDirection] = useState<'forward' | 'back'>('forward');
  const [isEditingOverview, setIsEditingOverview] = useState(false);
  const [overviewNotes, setOverviewNotes] = useState('');
  const [medicationNotes, setMedicationNotes] = useState('');
  const [isEditingMed, setIsEditingMed] = useState(false);
  const [isEditingDiet, setIsEditingDiet] = useState(false);
  const [isUpdateModalVisible, setIsUpdateModalVisible] = useState(false);
  const [updateModalStep, setUpdateModalStep] = useState<ClientModalStep>('personal');
  const [dietPlans, setDietPlans] = useState<DietPlan[]>([]);
  const [workoutPlans, setWorkoutPlans] = useState<Plan[]>([]);
  const [clientData, setClientData] = useState(EMPTY_CLIENT);
  const [profileData, setProfileData] = useState<ClientScreenProfileState>(EMPTY_PROFILE);
  const [lifestyleData, setLifestyleData] = useState<ClientScreenLifestyleState>(EMPTY_LIFESTYLE);
  const [assessmentData, setAssessmentData] = useState<ClientScreenAssessmentState>(EMPTY_ASSESSMENT);
  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([]);
  const [pendingSessions, setPendingSessions] = useState<Session[]>([]);
  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [calendarWeekPlan, setCalendarWeekPlan] = useState<Plan | null>(null);
  const calendarWeekPlanIdRef = useRef<string | null>(null);
  const [calendarSessions, setCalendarSessions] = useState<ScheduledSession[] | null>(null);
  const [newSessionSlot, setNewSessionSlot] = useState<{ date: string; time: string } | null>(null);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [postponeMode, setPostponeMode] = useState(false);
  const [archiveClientVisible, setArchiveClientVisible] = useState(false);
  const [deleteClientVisible, setDeleteClientVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showLoadingSkeleton, setShowLoadingSkeleton] = useState(false);
  const [hasLoadedDeleteAlert, setHasLoadedDeleteAlert] = useState(false);
  const [hasLoadedArchiveAlert, setHasLoadedArchiveAlert] = useState(false);
  const [hasLoadedSessionEditor, setHasLoadedSessionEditor] = useState(false);
  const [hasLoadedCalendarModal, setHasLoadedCalendarModal] = useState(false);
  const [hasLoadedUpdateModal, setHasLoadedUpdateModal] = useState(false);
  const hasLoadedClientRef = useRef(false);
  const profileSkeletonEntrance = useStaggeredEntrance({
    itemCount: showLoadingSkeleton ? 3 : 0,
    once: false,
  });

  const loadCalendarSessions = useCallback(async (anchorDate?: string) => {
    const { startDate, endDate } = getPlannerScheduleRange(anchorDate);
    const sessions = await hydrateSchedule(startDate, endDate);
    setCalendarSessions(sessions);
    return sessions;
  }, [hydrateSchedule]);

  const openCalendar = useCallback((plan: Plan | null) => {
    calendarWeekPlanIdRef.current = plan?.id ?? null;
    setCalendarWeekPlan(plan);
    if (plan) {
      void loadCalendarSessions();
    }
  }, [loadCalendarSessions]);

  const closeCalendar = useCallback(() => {
    calendarWeekPlanIdRef.current = null;
    setCalendarWeekPlan(null);
  }, []);

  const loadData = useCallback(async () => {
    if (!clientId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      await repairDetachedSessionPlanLinks(clientId);
      const detail = await hydrateClientDetail(clientId) || await getClientDetail(clientId);
      if (!detail) {
        navigate('/');
        return;
      }

      setClientData({
        id: detail.client.id,
        name: detail.client.name,
        goal: detail.client.goal,
        status: detail.status,
        phone: detail.client.phone ?? '',
        email: detail.client.email ?? '',
        overview_notes: detail.client.overview_notes ?? '',
      });
      setOverviewNotes(detail.client.overview_notes || '');
      setProfileData({
        ...EMPTY_PROFILE,
        ...detail.profile,
        medications: detail.profile.medications ?? '',
      });
      setMedicationNotes(detail.profile.medications || '');
      setLifestyleData({
        ...EMPTY_LIFESTYLE,
        ...detail.lifestyle,
      });
      setAssessmentData({
        ...EMPTY_ASSESSMENT,
        ...detail.assessment,
      });
      setDietPlans(detail.dietPlans);
      setWorkoutPlans(detail.plans);
      setAllSessions(detail.sessions);
      setExercises(detail.exercises);
      setActivities(detail.activities);

      const { upcoming, pending } = partitionPlannedSessions(detail.sessions);
      setUpcomingSessions(upcoming);
      setPendingSessions(pending);

      if (calendarWeekPlanIdRef.current) {
        const nextWeekPlan = detail.plans.find((plan) => plan.id === calendarWeekPlanIdRef.current) || null;
        setCalendarWeekPlan(nextWeekPlan);
        if (!nextWeekPlan) {
          calendarWeekPlanIdRef.current = null;
          setCalendarSessions(null);
        } else {
          await loadCalendarSessions();
        }
      }

      setErrorMessage('');
    } catch (error) {
      console.error('Failed to load client detail', error);
      setErrorMessage('Failed to load client data.');
    } finally {
      setLoading(false);
    }
  }, [clientId, hydrateClientDetail, loadCalendarSessions, navigate]);

  const refreshPageData = useCallback(async () => {
    invalidateClientDetail(clientId);
    invalidateDashboard();
    await loadData();
  }, [clientId, invalidateClientDetail, invalidateDashboard, loadData]);

  useEffect(() => {
    hasLoadedClientRef.current = false;
    setShowLoadingSkeleton(false);
    setSelectedClientId(clientId || null);
    void loadData();
    return () => {
      setSelectedClientId(null);
    };
  }, [clientId, loadData, setSelectedClientId]);

  useEffect(() => {
    if (hasLoadedClientRef.current || !loading) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShowLoadingSkeleton(true);
    }, 150);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loading]);

  useEffect(() => {
    if (loading) {
      return;
    }

    hasLoadedClientRef.current = true;

    if (!showLoadingSkeleton) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShowLoadingSkeleton(false);
    }, 200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loading, showLoadingSkeleton]);

  useEffect(() => {
    if (!newSessionSlot?.date) {
      return;
    }

    void loadCalendarSessions(newSessionSlot.date);
  }, [loadCalendarSessions, newSessionSlot?.date]);

  useEffect(() => {
    if (!previousTab) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setPreviousTab(null);
    }, 280);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [previousTab]);

  useEffect(() => {
    if (archiveClientVisible) {
      setHasLoadedArchiveAlert(true);
    }
  }, [archiveClientVisible]);

  useEffect(() => {
    if (deleteClientVisible) {
      setHasLoadedDeleteAlert(true);
    }
  }, [deleteClientVisible]);

  useEffect(() => {
    if (newSessionSlot) {
      setHasLoadedSessionEditor(true);
    }
  }, [newSessionSlot]);

  useEffect(() => {
    if (calendarWeekPlan) {
      setHasLoadedCalendarModal(true);
    }
  }, [calendarWeekPlan]);

  useEffect(() => {
    if (isUpdateModalVisible) {
      setHasLoadedUpdateModal(true);
    }
  }, [isUpdateModalVisible]);

  const handleCompleteSession = useCallback(async (sessionId: string, data: CompleteSessionData): Promise<boolean> => {
    try {
      await completeSession(sessionId, clientId, {
        difficulty: data.difficulty,
        energy: data.energy,
        performanceNotes: data.performanceNotes,
      });
      await refreshPageData();
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to complete session.');
      return false;
    }
  }, [clientId, refreshPageData]);

  const handleMissSession = useCallback(async (sessionId: string, data: MarkMissedData): Promise<boolean> => {
    try {
      await markSessionMissed(sessionId, clientId, data);
      await refreshPageData();
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to mark session missed.');
      return false;
    }
  }, [clientId, refreshPageData]);

  const handleRevert = useCallback(async (sessionId: string) => {
    try {
      await revertSession(sessionId, clientId);
      await refreshPageData();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to revert session.');
    }
  }, [clientId, refreshPageData]);

  const closeSessionEditor = useCallback(() => {
    setNewSessionSlot(null);
    setEditingSession(null);
    setPostponeMode(false);
  }, []);

  const handleSaveSession = useCallback(async (data: {
    id?: string;
    date: string;
    start_time: string;
    end_time: string;
    focus: string;
    postponed_note?: string;
    exercises: SessionExerciseDraft[];
    measure_reminder?: boolean;
  }) => {
    const planId = calendarWeekPlanIdRef.current ?? editingSession?.plan_id ?? null;
    const durationMinutes = getSessionDurationMinutes({
      start_time: data.start_time,
      end_time: data.end_time,
      duration_minutes: editingSession?.duration_minutes,
    });

    const overlap = await checkSessionOverlap(
      data.date,
      data.start_time,
      data.end_time,
      editingSession?.id,
    );
    if (overlap) {
      throw new Error(
        overlap.client_id === clientId
          ? 'This session overlaps with another scheduled session.'
          : `This time overlaps with ${overlap.client_name}'s session.`,
      );
    }

    const isPostponed = Boolean(
      editingSession &&
      (
        editingSession.date !== data.date ||
        editingSession.start_time !== data.start_time ||
        editingSession.end_time !== data.end_time
      ),
    );

    if (editingSession) {
      await updateSession(
        editingSession.id,
        clientId,
        {
          plan_id: planId,
          date: data.date,
          start_time: data.start_time,
          end_time: data.end_time,
          duration_minutes: durationMinutes,
          day_name: toDayName(data.date),
          focus: data.focus || '',
          type: editingSession.type,
          status: 'planned',
          measure_reminder: Boolean(data.measure_reminder),
          original_date: editingSession.original_date || (isPostponed ? editingSession.date : undefined),
          postponed_note: isPostponed
            ? (data.postponed_note || editingSession.postponed_note || 're-scheduled from calendar')
            : editingSession.postponed_note,
        },
        data.exercises,
      );
    } else {
      await createSession({
        client_id: clientId,
        plan_id: planId,
        date: data.date,
        start_time: data.start_time,
        end_time: data.end_time,
        duration_minutes: durationMinutes,
        day_name: toDayName(data.date),
        focus: data.focus || '',
        type: 'mixed',
        measure_reminder: Boolean(data.measure_reminder),
        exercises: data.exercises,
      });
    }

    closeSessionEditor();
    closeCalendar();
    playSuccess();
    haptic.success();
    await refreshPageData();
  }, [clientId, closeCalendar, closeSessionEditor, editingSession, haptic, playSuccess, refreshPageData]);

  const handleTabChange = useCallback((nextTab: string) => {
    if (nextTab === activeTab) {
      return;
    }

    setTabDirection((TAB_INDEX[nextTab] ?? 0) > (TAB_INDEX[activeTab] ?? 0) ? 'forward' : 'back');
    setPreviousTab(activeTab);
    setActiveTab(nextTab);
  }, [activeTab]);

  const upcomingAndPendingSessions = useMemo(
    () => upcomingSessions.concat(pendingSessions),
    [pendingSessions, upcomingSessions],
  );

  useEffect(() => {
    if (allSessions.length === 0) {
      return undefined;
    }

    const refreshSessionBuckets = () => {
      const { upcoming, pending } = partitionPlannedSessions(allSessions);
      setUpcomingSessions(upcoming);
      setPendingSessions(pending);
    };

    refreshSessionBuckets();
    const intervalId = window.setInterval(refreshSessionBuckets, 60 * 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [allSessions]);

  const profileSectionData = useMemo(() => ({
    client: clientData,
    profile: profileData,
    lifestyle: lifestyleData,
    assessment: assessmentData,
  }), [assessmentData, clientData, lifestyleData, profileData]);

  const renderTabPanel = useCallback((tabKey: string) => {
    if (tabKey === 'overview') {
      return (
        <div className="overview-container">
          <OverviewSection
            value={overviewNotes}
            isEditing={isEditingOverview}
            onValueChange={setOverviewNotes}
            onToggleEdit={() => setIsEditingOverview(!isEditingOverview)}
            onSave={async () => {
              await updateClientOverview(clientId, overviewNotes);
              setIsEditingOverview(false);
              await refreshPageData();
            }}
          />

          <RecentActivitySection activities={activities} onRevert={handleRevert} />

          <SessionsSection
            clientId={clientId}
            clientName={clientData.name}
            upcoming={upcomingSessions}
            pending={pendingSessions}
            onCompleteSession={handleCompleteSession}
            onMissSession={handleMissSession}
            onPostponeSession={(sessionId) => {
              const session = allSessions.find((item) => item.id === sessionId);
              if (!session) {
                return;
              }
              setEditingSession(session);
              setNewSessionSlot({ date: session.date || '', time: session.start_time || '' });
              setPostponeMode(true);
            }}
          />
        </div>
      );
    }

    if (tabKey === 'analytics') {
      return (
        <Suspense fallback={<ClientTabFallback />}>
          <AnalyticsSection clientId={clientId} />
        </Suspense>
      );
    }

    if (tabKey === 'plans') {
      return (
        <div className="plans-container">
          <Suspense fallback={<ClientTabFallback />}>
            <WorkoutPlanSection
              clientId={clientId}
              plans={workoutPlans}
              sessions={allSessions}
              exercises={exercises}
              onOpenCalendar={openCalendar}
              onEditSession={(session) => {
                setEditingSession(session);
                setNewSessionSlot({ date: session.date || '', time: session.start_time || '' });
                setPostponeMode(false);
              }}
              onPlansChange={refreshPageData}
            />
          </Suspense>
        </div>
      );
    }

    if (tabKey === 'health') {
      return (
        <div className="health-container">
          <Suspense fallback={<ClientTabFallback />}>
            <MedicationSection
              value={medicationNotes}
              isEditing={isEditingMed}
              onValueChange={setMedicationNotes}
              onToggleEdit={() => setIsEditingMed(!isEditingMed)}
              onSave={async () => {
                await updateClient(clientId, {
                  profile: {
                    medications: medicationNotes,
                  },
                });
                setIsEditingMed(false);
                await refreshPageData();
              }}
            />

            <DietPlanSection
              dietPlans={dietPlans}
              isEditing={isEditingDiet}
              onToggleEdit={() => setIsEditingDiet(!isEditingDiet)}
              onSavePlan={async (planData) => {
                await saveDietPlan(clientId, planData, dietPlans[0]?.id);
                setIsEditingDiet(false);
                await refreshPageData();
              }}
            />
          </Suspense>
        </div>
      );
    }

    return (
      <Suspense fallback={<ClientTabFallback />}>
        <ProfileSection
          data={profileSectionData}
          onEditSection={(section) => {
            setUpdateModalStep(section);
            setIsUpdateModalVisible(true);
          }}
          onArchiveClient={() => setArchiveClientVisible(true)}
          onDeleteClient={() => setDeleteClientVisible(true)}
        />
      </Suspense>
    );
  }, [
    activities,
    allSessions,
    assessmentData,
    clientData,
    clientId,
    dietPlans,
    exercises,
    handleCompleteSession,
    handleMissSession,
    handleRevert,
    isEditingDiet,
    isEditingMed,
    isEditingOverview,
    lifestyleData,
    medicationNotes,
    openCalendar,
    upcomingAndPendingSessions,
    overviewNotes,
    pendingSessions,
    profileSectionData,
    refreshPageData,
    upcomingSessions,
    workoutPlans,
  ]);

  const visibleTabs = previousTab ? [previousTab, activeTab] : [activeTab];

  const plannerSessions = useMemo(
    () => calendarSessions || allSessions.map((session) => ({
      ...session,
      client_name: clientData.name || 'This client',
    })),
    [allSessions, calendarSessions, clientData.name],
  );

  return (
    <div className="client-page">
      <TopNavBar showBack />

      <PageWrapper>
        <div className="client-content">
          <div className="client-content-stack">
            <div
              className="client-content-stack__content"
              style={{
                opacity: loading && !hasLoadedClientRef.current ? 0 : 1,
                transform: loading && !hasLoadedClientRef.current ? 'translate3d(0, 6px, 0)' : 'translate3d(0, 0, 0)',
                transition: 'opacity 200ms ease-out, transform 200ms ease-out',
              }}
            >
              <ClientHeaderCard
                name={clientData.name}
                goal={clientData.goal}
                age={profileData.age}
                weight={profileData.initial_weight_kg}
                height={profileData.height_cm}
                status={clientData.status}
                bpSystolic={assessmentData.bp_systolic}
                bpDiastolic={assessmentData.bp_diastolic}
              />

              <TabBar tabs={TABS} activeTab={activeTab} onTabChange={handleTabChange} />

              {errorMessage && <div className="client-inline-error">{errorMessage}</div>}

              <div className={`tab-content ${previousTab ? 'tab-content--transitioning' : ''}`}>
                {visibleTabs.map((tabKey) => {
                  const isExiting = previousTab === tabKey;

                  return (
                    <div
                      key={tabKey}
                      className={[
                        'tab-pane',
                        isExiting
                          ? `tab-pane--${tabDirection}-exit`
                          : previousTab
                            ? `tab-pane--${tabDirection}-enter`
                            : 'tab-pane--current',
                      ].join(' ')}
                    >
                      {renderTabPanel(tabKey)}
                    </div>
                  );
                })}
              </div>
            </div>

            {showLoadingSkeleton ? (
              <div
                className="client-content-stack__skeleton"
                style={{ opacity: loading ? 1 : 0 }}
                aria-hidden="true"
              >
                <SkeletonClientProfile />
                <div className="client-profile-skeleton-list">
                  {Array.from({ length: 3 }).map((_, index) => {
                    const itemProps = profileSkeletonEntrance.getItemProps(index);

                    return (
                      <div
                        key={`client-profile-skeleton-${index}`}
                        className={itemProps.className}
                        style={itemProps.style}
                      >
                        <SkeletonInfoCard />
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </PageWrapper>

      {hasLoadedUpdateModal ? (
        <Suspense fallback={null}>
          <ClientModal
            open={isUpdateModalVisible}
            onClose={() => setIsUpdateModalVisible(false)}
            onSuccess={async () => {
              setIsUpdateModalVisible(false);
              await refreshPageData();
            }}
            clientId={clientId}
            initialStep={updateModalStep}
          />
        </Suspense>
      ) : null}

      {hasLoadedCalendarModal ? (
        <Suspense fallback={null}>
          <ScheduleCalendarModal
            visible={!!calendarWeekPlan}
            onClose={closeCalendar}
            weekPlan={calendarWeekPlan}
            sessions={plannerSessions}
            activeClientId={clientId}
            onSlotClick={(date, time) => {
              setPostponeMode(false);
              setNewSessionSlot({ date, time });
              setEditingSession(null);
            }}
            onSessionClick={(session) => {
              setPostponeMode(false);
              setEditingSession(session);
              setNewSessionSlot({ date: session.date || '', time: session.start_time || '' });
            }}
            onGoalChange={async (goal) => {
              if (!calendarWeekPlan) {
                return;
              }
              await updatePlan(calendarWeekPlan.id, clientId, { goal });
              await refreshPageData();
            }}
            onDeleteSession={async (sessionId) => {
              await deleteSession(sessionId, clientId);
              playDelete();
              haptic.error();
              await refreshPageData();
            }}
            onPasteSession={async (date, hour, sourceId) => {
              const source = allSessions.find((session) => session.id === sourceId);
              if (!source) {
                return;
              }

              const startTime = `${hour.toString().padStart(2, '0')}:00`;
              const endTime = source.end_time
                ? `${String((hour + getSessionDurationMinutes(source) / 60) % 24).padStart(2, '0')}:${source.end_time.split(':')[1] || '00'}`
                : `${String((hour + 1) % 24).padStart(2, '0')}:00`;
              const overlap = await checkSessionOverlap(date, startTime, endTime);

              if (overlap) {
                setErrorMessage('This slot is already occupied. Please choose another time.');
                return;
              }

              await duplicateSession(sourceId, clientId, date, startTime, endTime);
              await refreshPageData();
            }}
          />
        </Suspense>
      ) : null}

      {hasLoadedSessionEditor ? (
        <Suspense fallback={null}>
          <NewSessionModal
            visible={!!newSessionSlot}
            onClose={closeSessionEditor}
            initialDate={newSessionSlot?.date || ''}
            initialTime={newSessionSlot?.time || ''}
            editingSession={editingSession}
            sessions={plannerSessions}
            postponeMode={postponeMode}
            onDelete={async (sessionId) => {
              await deleteSession(sessionId, clientId);
              playDelete();
              haptic.error();
              closeSessionEditor();
              await refreshPageData();
            }}
            onSave={handleSaveSession}
          />
        </Suspense>
      ) : null}

      {hasLoadedArchiveAlert ? (
        <Suspense fallback={null}>
          <AppAlert
            visible={archiveClientVisible}
            title="Archive Client"
            message="Archive this client? Their data will stay on this device and Drive, but they will be hidden from the dashboard."
            confirmLabel="Archive"
            cancelLabel="Cancel"
            onConfirm={async () => {
              await archiveClient(clientId);
              playDelete();
              haptic.error();
              setArchiveClientVisible(false);
              invalidateClientDetail(clientId);
              invalidateDashboard();
              await refreshDashboard();
              navigate('/');
            }}
            onCancel={() => setArchiveClientVisible(false)}
          />
        </Suspense>
      ) : null}

      {hasLoadedDeleteAlert ? (
        <Suspense fallback={null}>
          <AppAlert
            visible={deleteClientVisible}
            title="Delete Client"
            message="Deleting this client will remove it locally after cloud sync confirms the delete."
            confirmLabel="Delete"
            cancelLabel="Cancel"
            onConfirm={async () => {
              await deleteClient(clientId);
              playDelete();
              haptic.error();
              setDeleteClientVisible(false);
              invalidateClientDetail(clientId);
              invalidateDashboard();
              await refreshDashboard();
              navigate('/');
            }}
            onCancel={() => setDeleteClientVisible(false)}
          />
        </Suspense>
      ) : null}
    </div>
  );
}
