import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Platform,
} from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { RootStackParamList, RootStackNavigationProp } from '../RootNavigator';
import { Ionicons } from '@expo/vector-icons';

import { getClientById, updateClientOverview, getDetailedClient, deleteClient } from '../../services/client/clientService';
import { getSessionsByClient, getRecentActivity, revertSession } from '../../services/session/sessionService';
import { getExercisesByClient } from '../../services/session/exerciseService';
import { getMeasurements, getClientMeasurementConfigs } from '../../services/measurement/measurementService';
import { getPlansByClient, deletePlan } from '../../services/plan/planService';
import { getDietPlansByClient } from '../../services/plan/dietPlanService';
import { getPhotos } from '../../services/photo/photoService';
import { getCompletionStats, getClientStatus } from '../../services/analytics/analyticsService';
import { Client, ClientProfile, Session, Measurement, Plan, ClientStatus, ProgressPhoto, DietPlan, MeasurementConfig } from '../../types';

// Modals
import CompleteSessionModal from '../../components/modals/CompleteSessionModal';
import AddPlanModal from '../../components/modals/AddPlanModal';
import AddClientModal from '../../components/modals/AddClientModal';
import ManageSessionModal from '../../components/modals/ManageSessionModal';
import EditWeeklyPlanModal from '../../components/modals/EditWeeklyPlanModal';
import ConfirmationModal from '../../components/modals/ConfirmationModal';

// Shared components
import TopNavBar from '../../components/shared/TopNavBar';
import TabBar, { TabDefinition } from '../../components/shared/TabBar';

// Client section components
import ClientHeaderCard from '../../components/client/ClientHeaderCard';
import OverviewSection from '../../components/client/OverviewSection';
import SessionsSection from '../../components/client/SessionsSection';
import AnalyticsSection from '../../components/client/AnalyticsSection';
import WorkoutPlanSection from '../../components/client/WorkoutPlanSection';
import MedicationSection from '../../components/client/MedicationSection';
import DietPlanSection from '../../components/client/DietPlanSection';
import ProfileSection from '../../components/client/ProfileSection';
import RecentActivitySection from '../../components/client/RecentActivitySection';

type ClientScreenRouteProp = RouteProp<RootStackParamList, 'Client'>;

const CLIENT_TABS: TabDefinition[] = [
  { key: 'overview', label: 'Overview', icon: 'document-text-outline' },
  { key: 'analytics', label: 'Analytics', icon: 'analytics-outline' },
  { key: 'plans', label: 'Plans', icon: 'barbell' },
  { key: 'health', label: 'Health', icon: 'medkit-outline' },
  { key: 'profile', label: 'Profile', icon: 'person-outline' },
];

export default function ClientScreen() {
  const route = useRoute<ClientScreenRouteProp>();
  const navigation = useNavigation<RootStackNavigationProp>();
  const { clientId } = route.params;

  // ── Core Data State ──
  const [clientData, setClientData] = useState<Client & { profile: ClientProfile } | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [dietPlans, setDietPlans] = useState<DietPlan[]>([]);
  const [status, setStatus] = useState<ClientStatus>('active');
  const [stats, setStats] = useState<{ total: number, completed: number, percentage: number } | null>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exercises, setExercises] = useState<any[]>([]);
  const [measurementConfigs, setMeasurementConfigs] = useState<MeasurementConfig[]>([]);

  // ── Tab State ──
  const [activeTab, setActiveTab] = useState('overview');

  // ── Overview Editing State ──
  const [isEditingOverview, setIsEditingOverview] = useState(false);
  const [overviewDraft, setOverviewDraft] = useState('');
  const richText = React.useRef<any>(null);

  // ── Plan Expansion State ──
  const [expandedWeeks, setExpandedWeeks] = useState<string[]>([]);

  // ── Modal States ──
  const [activeSessionToComplete, setActiveSessionToComplete] = useState<string | null>(null);
  const [isPlanModalVisible, setIsPlanModalVisible] = useState(false);
  const [planModalMode, setPlanModalMode] = useState<'create' | 'edit'>('create');
  const [planModalInitialData, setPlanModalInitialData] = useState<{ id: string, title: string, goal: string } | null>(null);
  const [parentForNewWeekly, setParentForNewWeekly] = useState<string | null>(null);
  const [activeSessionToManage, setActiveSessionToManage] = useState<Session | null>(null);
  const [isManageSessionVisible, setIsManageSessionVisible] = useState(false);
  const [isEditWeeklyVisible, setIsEditWeeklyVisible] = useState(false);
  const [editWeeklyPlanId, setEditWeeklyPlanId] = useState<string | null>(null);
  const [sessionToPostpone, setSessionToPostpone] = useState<Session | null>(null);

  // ── Profile Tab State ──
  const [detailedClientData, setDetailedClientData] = useState<any>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editStep, setEditStep] = useState<'personal' | 'interview' | 'assessment'>('personal');
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [isDeletePlanModalVisible, setIsDeletePlanModalVisible] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<{ id: string, title: string } | null>(null);
  const [sessionToRevert, setSessionToRevert] = useState<string | null>(null);

  // ── Data Fetching ──
  const fetchData = useCallback(async () => {
    try {
      const [c, s, m, p, ph, st, an, dp, ex, mc, ra] = await Promise.all([
        getClientById(clientId),
        getSessionsByClient(clientId),
        getMeasurements(clientId),
        getPlansByClient(clientId),
        getPhotos(clientId),
        getClientStatus(clientId),
        getCompletionStats(clientId),
        getDietPlansByClient(clientId),
        getExercisesByClient(clientId),
        getClientMeasurementConfigs(clientId),
        getRecentActivity(clientId),
      ]);
      setClientData(c);
      setSessions(s);
      setMeasurements(m);
      setPlans(p);
      setPhotos(ph);
      setStatus(st);
      setStats(an);
      setDietPlans(dp);
      setExercises(ex);
      setMeasurementConfigs(mc);
      setRecentActivity(ra);
    } catch (error) {
      console.error('[ClientScreen] Fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Overview Editor Setup ──
  useEffect(() => {
    if (clientData) {
      let notes = clientData.overview_notes || '';
      notes = notes.replace(/\[b\](.*?)\[\/b\]/gi, '<b>$1</b>');
      notes = notes.replace(/\[i\](.*?)\[\/i\]/gi, '<i>$1</i>');
      notes = notes.replace(/\[u\](.*?)\[\/u\]/gi, '<u>$1</u>');
      notes = notes.replace(/\[h1\](.*?)\[\/h1\]/gi, '<h1>$1</h1>');
      notes = notes.replace(/\[h2\](.*?)\[\/h2\]/gi, '<h2>$1</h2>');
      setOverviewDraft(notes);
    }
  }, [clientData]);

  const handleSaveOverview = async () => {
    try {
      await updateClientOverview(clientId, overviewDraft);
      setIsEditingOverview(false);
      fetchData();
    } catch (err) {
      console.error('[ClientScreen] Save overview failed:', err);
      Alert.alert('Error', 'Failed to update overview.');
    }
  };

  // ── Fetch profile data (needed for header objectives + profile tab) ──
  useEffect(() => {
    if (!detailedClientData) {
      getDetailedClient(clientId).then(setDetailedClientData).catch(console.error);
    }
  }, [clientId, detailedClientData]);

  const handleEditProfileSection = (section: 'personal' | 'interview' | 'assessment') => {
    setEditStep(section);
    setIsEditModalVisible(true);
  };

  // ── Computed Values ──
  const latestWeight = useMemo(() => {
    if (measurements.length === 0) return null;
    const sorted = [...measurements].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return sorted[0].weight_kg;
  }, [measurements]);

  const monthlyPlans = useMemo(() => plans.filter(p => p.type === 'monthly'), [plans]);
  const standaloneWeeklyPlans = useMemo(() => plans.filter(p => p.type === 'weekly' && !p.parent_plan_id), [plans]);
  const weeklyPlansByMonth = useMemo(() => {
    const map: Record<string, Plan[]> = {};
    plans.filter(p => p.type === 'weekly').forEach(w => {
      if (w.parent_plan_id) {
        if (!map[w.parent_plan_id]) map[w.parent_plan_id] = [];
        map[w.parent_plan_id].push(w);
      }
    });
    return map;
  }, [plans]);

  const upcomingSessionsRaw = useMemo(() => sessions.filter(s => s.status === 'planned'), [sessions]);

  useEffect(() => {
    if (plans.length > 0 && expandedWeeks.length === 0) {
      setExpandedWeeks(plans.map(p => p.id));
    }
  }, [plans]);

  const { upcoming, pendingData } = useMemo(() => {
    const now = new Date();
    const up: any[] = [];
    const pen: any[] = [];
    upcomingSessionsRaw.forEach(s => {
      let isPending = false;
      if (s.start_time) {
        let sessionEnd: Date;
        if (s.end_time) sessionEnd = new Date(`${s.date}T${s.end_time}:00`);
        else if (s.duration_minutes) {
          sessionEnd = new Date(`${s.date}T${s.start_time}:00`);
          sessionEnd.setMinutes(sessionEnd.getMinutes() + s.duration_minutes);
        } else {
          sessionEnd = new Date(`${s.date}T${s.start_time}:00`);
          sessionEnd.setMinutes(sessionEnd.getMinutes() + 60);
        }
        if (now > sessionEnd) isPending = true;
      }
      if (isPending) pen.push({ ...s, isPending });
      else up.push({ ...s, isPending });
    });
    return { 
      upcoming: up.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()), 
      pendingData: pen.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) 
    };
  }, [upcomingSessionsRaw]);

  // ── Plan Handlers ──
  const handleDeletePlan = async (id: string) => {
    try {
      await deletePlan(id, clientId);
      fetchData();
    } catch (err: any) {
      console.error('[ClientScreen] deletePlan failed:', err);
      Alert.alert('Error', 'Failed to delete plan: ' + err.message);
    }
  };

  const confirmDeletePlan = (id: string, title: string) => {
    setPlanToDelete({ id, title });
    setIsDeletePlanModalVisible(true);
  };

  const handleDeleteClient = async () => {
    try {
      await deleteClient(clientId);
      navigation.navigate('Dashboard');
    } catch (err: any) {
      console.error('[ClientScreen] deleteClient failed:', err);
      Alert.alert('Error', 'Failed to delete client: ' + err.message);
    }
  };

  const handleRevertSession = useCallback(async () => {
    if (!sessionToRevert) return;
    try {
      await revertSession(sessionToRevert, clientId);
      setSessionToRevert(null);
      fetchData();
    } catch (err: any) {
      console.error('[ClientScreen] revertSession failed:', err);
      Alert.alert('Error', 'Failed to revert session: ' + err.message);
    }
  }, [clientId, fetchData, sessionToRevert]);

  const confirmRevertSession = useCallback((sessionId: string) => {
    setSessionToRevert(sessionId);
  }, []);

  const confirmDeleteClient = () => {
    setIsDeleteModalVisible(true);
  };

  const toggleWeekExpand = (weekId: string) => {
    setExpandedWeeks(prev => prev.includes(weekId) ? prev.filter(id => id !== weekId) : [...prev, weekId]);
  };

  // ── Render Tab Content ──
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <>
            {clientData && (
              <OverviewSection
                clientData={clientData}
                isEditing={isEditingOverview}
                overviewDraft={overviewDraft}
                richTextRef={richText}
                onDraftChange={setOverviewDraft}
                onToggleEdit={() => setIsEditingOverview(true)}
                onSave={handleSaveOverview}
              />
            )}
            <RecentActivitySection activities={recentActivity} onRevertSession={confirmRevertSession} />
            <SessionsSection
              upcoming={upcoming}
              pendingData={pendingData}
              onManageSession={(s) => { setActiveSessionToManage(s); setIsManageSessionVisible(true); }}
            />
          </>
        );
      case 'analytics':
        return (
          <AnalyticsSection
            measurements={measurements}
            measurementConfigs={measurementConfigs}
            clientId={clientId}
            onDataChange={fetchData}
          />
        );
      case 'plans':
        return (
          <WorkoutPlanSection
            monthlyPlans={monthlyPlans}
            standaloneWeeklyPlans={standaloneWeeklyPlans}
            weeklyPlansByMonth={weeklyPlansByMonth}
            sessions={sessions}
            exercises={exercises}
            expandedWeeks={expandedWeeks}
            onToggleWeekExpand={toggleWeekExpand}
            onAddPlan={() => { setPlanModalMode('create'); setParentForNewWeekly(null); setIsPlanModalVisible(true); }}
            onEditPlan={(plan) => { setPlanModalMode('edit'); setPlanModalInitialData({ id: plan.id, title: plan.title, goal: plan.goal }); setIsPlanModalVisible(true); }}
            onAddWeeklyToPlan={(parentId) => { setPlanModalMode('create'); setParentForNewWeekly(parentId); setIsPlanModalVisible(true); }}
            onDeletePlan={confirmDeletePlan}
            onEditWeeklyPlan={(weekId) => { setEditWeeklyPlanId(weekId); setIsEditWeeklyVisible(true); }}
          />
        );
      case 'health':
        return (
          <>
            <MedicationSection />
            <DietPlanSection dietPlans={dietPlans} />
          </>
        );
      case 'profile':
        return (
          <ProfileSection
            data={detailedClientData}
            onEditSection={handleEditProfileSection}
            onDeleteClient={confirmDeleteClient}
          />
        );
      default:
        return null;
    }
  };

  // ── Loading / Error States ──
  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.center}><ActivityIndicator color="#FFD700" size="large" /></View>
      </SafeAreaView>
    );
  }

  if (!clientData) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.center}><Text style={styles.errorText}>Client not found</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <TopNavBar
        leftContent={
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.row}>
            <Ionicons name="arrow-back" size={22} color="#FFD700" />
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.flex1} contentContainerStyle={styles.content}>
        <ClientHeaderCard clientData={clientData} latestWeight={latestWeight ?? null} assessment={detailedClientData?.assessment} />
        <TabBar tabs={CLIENT_TABS} activeTab={activeTab} onTabChange={setActiveTab} />
        {renderTabContent()}
      </ScrollView>

      {/* ── Modals ── */}
      <CompleteSessionModal visible={!!activeSessionToComplete} sessionId={activeSessionToComplete || ''} clientId={clientId} onClose={() => setActiveSessionToComplete(null)} onSuccess={() => { setActiveSessionToComplete(null); fetchData(); }} />
      <AddPlanModal visible={isPlanModalVisible} clientId={clientId} parentPlanId={parentForNewWeekly} mode={planModalMode} initialData={planModalInitialData} onClose={() => setIsPlanModalVisible(false)} onSuccess={() => { setIsPlanModalVisible(false); fetchData(); }} />
      <ManageSessionModal 
        visible={isManageSessionVisible} 
        session={activeSessionToManage} 
        clientId={clientId} 
        onClose={() => setIsManageSessionVisible(false)} 
        onSuccess={() => { setIsManageSessionVisible(false); fetchData(); }} 
        onOpenComplete={() => setActiveSessionToComplete(activeSessionToManage?.id || '')} 
        onOpenPostponePick={(s) => { 
          setSessionToPostpone(s); 
          setEditWeeklyPlanId(s.plan_id || 'manual'); // Fallback if no plan_id
          setIsEditWeeklyVisible(true); 
        }} 
      />
      {isEditWeeklyVisible && editWeeklyPlanId && (
        <EditWeeklyPlanModal 
          visible={isEditWeeklyVisible} 
          planId={editWeeklyPlanId === 'manual' ? '' : editWeeklyPlanId} 
          clientId={clientId} 
          onClose={() => { setIsEditWeeklyVisible(false); setSessionToPostpone(null); }} 
          onSuccess={() => { setIsEditWeeklyVisible(false); setSessionToPostpone(null); fetchData(); }}
          postponeSession={sessionToPostpone}
          onPostponeSuccess={() => { setIsEditWeeklyVisible(false); setSessionToPostpone(null); fetchData(); }}
        />
      )}
      <AddClientModal visible={isEditModalVisible} mode="edit" clientId={clientId} initialData={detailedClientData} initialStep={editStep} onClose={() => setIsEditModalVisible(false)} onSuccess={() => { setIsEditModalVisible(false); setDetailedClientData(null); fetchData(); }} />
      <ConfirmationModal
        visible={isDeleteModalVisible}
        onClose={() => setIsDeleteModalVisible(false)}
        onConfirm={() => { setIsDeleteModalVisible(false); handleDeleteClient(); }}
        title="Delete Client"
        message={`Are you sure you want to delete ${clientData?.name || 'this client'}? This will permanently remove all their data and history.`}
        confirmText="Delete"
        type="danger"
        icon="trash"
      />
      <ConfirmationModal
        visible={isDeletePlanModalVisible}
        onClose={() => { setIsDeletePlanModalVisible(false); setPlanToDelete(null); }}
        onConfirm={() => {
          if (planToDelete) {
            handleDeletePlan(planToDelete.id);
            setIsDeletePlanModalVisible(false);
            setPlanToDelete(null);
          }
        }}
        title="Delete Plan"
        message={`Are you sure you want to delete "${planToDelete?.title}"? This will remove the plan and its associated schedule.`}
        confirmText="Delete"
        type="danger"
        icon="trash"
      />
      <ConfirmationModal
        visible={!!sessionToRevert}
        onClose={() => setSessionToRevert(null)}
        onConfirm={handleRevertSession}
        title="Revert Session"
        message="Are you sure you want to revert this session back to planned? This will remove the completion data."
        confirmText="Revert"
        type="warning"
        icon="refresh-outline"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A0A' },
  flex1: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 24, paddingBottom: 60 },
  row: { flexDirection: 'row', alignItems: 'center' },
  errorText: { color: '#FF5252', fontSize: 16, fontWeight: '600' },
});
