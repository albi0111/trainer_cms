import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Image,
  SafeAreaView,
} from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../RootNavigator';
import { Ionicons } from '@expo/vector-icons';

import { 
  getClientById, 
  updateClientOverview, 
  getDetailedClient 
} from '../../services/client/clientService';
import { getSessionsByClient, markSessionMissed } from '../../services/session/sessionService';
import { getMeasurements } from '../../services/measurement/measurementService';
import { getPlansByClient, deletePlan } from '../../services/plan/planService';
import { getDietPlansByClient } from '../../services/plan/dietPlanService';
import * as ImagePicker from 'expo-image-picker';
import { getPhotos, addProgressPhoto } from '../../services/photo/photoService';
import { getCompletionStats, getClientStatus } from '../../services/analytics/analyticsService';
import { Client, ClientProfile, Session, Measurement, Plan, ClientStatus, ProgressPhoto, DietPlan } from '../../types';

import AddSessionModal from '../../components/modals/AddSessionModal';
import AddMeasurementModal from '../../components/modals/AddMeasurementModal';
import CompleteSessionModal from '../../components/modals/CompleteSessionModal';
import AddPlanModal from '../../components/modals/AddPlanModal';
import AddClientModal from '../../components/modals/AddClientModal';
import ClientProfileModal from '../../components/modals/ClientProfileModal';
import ManageSessionModal from '../../components/modals/ManageSessionModal';
import EditWeeklyPlanModal from '../../components/modals/EditWeeklyPlanModal';

type ClientScreenRouteProp = RouteProp<RootStackParamList, 'Client'>;

export default function ClientScreen() {
  const route = useRoute<ClientScreenRouteProp>();
  const { clientId } = route.params;

  const [clientData, setClientData] = useState<Client & { profile: ClientProfile } | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [dietPlans, setDietPlans] = useState<DietPlan[]>([]);
  const [status, setStatus] = useState<ClientStatus>('active');
  const [stats, setStats] = useState<{ total: number, completed: number, percentage: number } | null>(null);
  const [loading, setLoading] = useState(true);

  // Layout states
  const [isAnalyticsExpanded, setIsAnalyticsExpanded] = useState(false);
  const [activeWeekIdForSession, setActiveWeekIdForSession] = useState<string | null>(null);

  // Overview Editing State
  const [isEditingOverview, setIsEditingOverview] = useState(false);
  const [overviewDraft, setOverviewDraft] = useState('');

  // Modals Visibility
  const [isSessionModalVisible, setIsSessionModalVisible] = useState(false);
  const [isMeasurementModalVisible, setIsMeasurementModalVisible] = useState(false);
  const [activeSessionToComplete, setActiveSessionToComplete] = useState<string | null>(null);
  const [isPlanModalVisible, setIsPlanModalVisible] = useState(false);
  const [parentForNewWeekly, setParentForNewWeekly] = useState<string | null>(null);
  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);
  const [detailedClientData, setDetailedClientData] = useState<any>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editStep, setEditStep] = useState<'personal' | 'interview' | 'assessment'>('personal');

  const [activeSessionToManage, setActiveSessionToManage] = useState<Session | null>(null);
  const [isManageSessionVisible, setIsManageSessionVisible] = useState(false);
  const [isEditWeeklyVisible, setIsEditWeeklyVisible] = useState(false);
  const [editWeeklyPlanId, setEditWeeklyPlanId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [c, s, m, p, ph, st, an, dp] = await Promise.all([
        getClientById(clientId),
        getSessionsByClient(clientId),
        getMeasurements(clientId),
        getPlansByClient(clientId),
        getPhotos(clientId),
        getClientStatus(clientId),
        getCompletionStats(clientId),
        getDietPlansByClient(clientId),
      ]);
      setClientData(c);
      setSessions(s);
      setMeasurements(m);
      setPlans(p);
      setPhotos(ph);
      setStatus(st);
      setStats(an);
      setDietPlans(dp);
    } catch (error) {
      console.error('[ClientScreen] Fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenProfile = async () => {
    const detailed = await getDetailedClient(clientId);
    setDetailedClientData(detailed);
    setIsProfileModalVisible(true);
  };

  const handleEditProfileSection = (section: 'personal' | 'interview' | 'assessment') => {
    setEditStep(section);
    setIsProfileModalVisible(false);
    setIsEditModalVisible(true);
  };

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
  const completedSessions = useMemo(() => sessions.filter(s => s.status !== 'planned'), [sessions]);

  // Compute pending state for upcoming sessions
  const upcomingSessions = useMemo(() => {
    const now = new Date();
    return upcomingSessionsRaw.map(s => {
      let isPending = false;
      if (s.start_time) {
        let sessionEnd: Date;
        if (s.end_time) {
          sessionEnd = new Date(`${s.date}T${s.end_time}:00`);
        } else if (s.duration_minutes) {
          sessionEnd = new Date(`${s.date}T${s.start_time}:00`);
          sessionEnd.setMinutes(sessionEnd.getMinutes() + s.duration_minutes);
        } else {
          sessionEnd = new Date(`${s.date}T${s.start_time}:00`);
          sessionEnd.setMinutes(sessionEnd.getMinutes() + 60); // Default 1 hour
        }
        if (now > sessionEnd) {
          isPending = true;
        }
      }
      return { ...s, isPending };
    });
  }, [upcomingSessionsRaw]);

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
      {/* Dynamic Header */}
      <View style={styles.topNav}>
         <TouchableOpacity onPress={() => {} /* Placeholder for Back Navigation */} style={styles.row}>
            <Ionicons name="arrow-back" size={16} color="#FFF" />
            <Text style={{color: '#FFF', fontSize: 12, fontWeight: '700', marginLeft: 4}}>Back</Text>
         </TouchableOpacity>
         <View style={styles.row}>
            <View style={styles.logoBadge}><Text style={styles.logoBadgeText}>—</Text></View>
            <Text style={styles.logoText}>FIT.PERSONA</Text>
         </View>
         <TouchableOpacity style={styles.profileBtn} onPress={handleOpenProfile}>
           <Ionicons name="person-outline" size={12} color="#AAA" />
           <Text style={styles.profileBtnText}>Profile</Text>
         </TouchableOpacity>
      </View>

      <ScrollView style={styles.flex1} contentContainerStyle={styles.content}>
        
        {/* ── Sessions Card ── */}
        <View style={styles.cardContainer}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.row}>
              <Ionicons name="calendar-outline" size={16} color="#6699FF" />
              <Text style={styles.cardHeaderTitle}>Sessions</Text>
            </View>
            <TouchableOpacity style={styles.actionBtnLight} onPress={() => { setActiveWeekIdForSession(null); setIsSessionModalVisible(true); }}>
              <Text style={styles.actionBtnLightText}>+ Add Session</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.subHeading}>UPCOMING</Text>
          {upcomingSessions.length === 0 ? (
             <Text style={styles.emptyText}>No upcoming sessions.</Text>
          ) : (
             upcomingSessions.map((s: any) => (
               <TouchableOpacity key={s.id} style={[styles.listItem, s.isPending && { borderColor: '#FFD700', borderWidth: 1 }]} onPress={() => { setActiveSessionToManage(s); setIsManageSessionVisible(true); }}>
                 <View style={styles.flex1}>
                   <View style={styles.row}>
                     <Text style={styles.listItemTitle}>{s.date}</Text>
                     <View style={[styles.badge, s.isPending ? {backgroundColor:'#FFD700'} : {backgroundColor: '#1A2A50'}]}>
                       <Text style={[styles.badgeText, s.isPending ? {color:'#000'} : {color: '#6699FF'}]}>
                         {s.isPending ? 'PENDING' : s.type.toUpperCase()}
                       </Text>
                     </View>
                   </View>
                   <Text style={[styles.listItemSub, s.isPending && {color: '#FFD700'}]}>{s.start_time || '00:00'} - {s.duration_minutes || 60}min - {s.focus}</Text>
                 </View>
                 <View style={styles.row}>
                   <Ionicons name="ellipsis-vertical" size={20} color={s.isPending ? "#FFD700" : "#AAA"}/>
                 </View>
               </TouchableOpacity>
             ))
          )}

          <Text style={[styles.subHeading, { marginTop: 16 }]}>COMPLETED</Text>
          {completedSessions.length === 0 ? (
             <Text style={styles.emptyText}>No completed sessions.</Text>
          ) : (
             completedSessions.map(s => (
               <View key={s.id} style={styles.listItem}>
                 <Ionicons name="checkmark" size={16} color="#3DCC88" />
                 <View style={styles.flex1}>
                   <Text style={[styles.listItemTitle, {color: '#AAA', marginLeft: 8}]}>{s.date} - 09:00 - {s.type} - 60min</Text>
                 </View>
                 <TouchableOpacity onPress={() => Alert.alert('Delete Session', 'Feature coming soon')}><Ionicons name="close" size={18} color="#FF5252"/></TouchableOpacity>
               </View>
             ))
          )}
        </View>

        {/* ── Progress Card ── */}
        <View style={styles.cardContainer}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.row}>
              <Ionicons name="trending-up" size={16} color="#3DCC88" />
              <Text style={styles.cardHeaderTitle}>Progress</Text>
            </View>
            <TouchableOpacity style={styles.actionBtnLight} onPress={() => setIsMeasurementModalVisible(true)}>
              <Ionicons name="pencil" size={12} color="#AAA" />
              <Text style={[styles.actionBtnLightText, {marginLeft: 4}]}>Log Progress</Text>
            </TouchableOpacity>
          </View>

          {measurements.length === 0 ? (
             <Text style={styles.emptyText}>No measurements logged yet.</Text>
          ) : (
             measurements.map(m => (
               <View key={m.id} style={styles.listItem}>
                  <View style={styles.flex1}>
                     <View style={styles.row}>
                        <View style={{marginRight: 24}}>
                          <Text style={styles.tinyLabel}>WEIGHT</Text>
                          <Text style={styles.valueText}><Text style={{color: '#3DCC88'}}>{m.weight_kg}</Text> kg</Text>
                        </View>
                        <View>
                          <Text style={styles.tinyLabel}>BODY FAT</Text>
                          <Text style={styles.valueText}>{m.body_fat_pct ? `${m.body_fat_pct}%` : '—'}</Text>
                        </View>
                     </View>
                  </View>
                  <View style={{alignItems: 'flex-end', marginRight: 16}}>
                     <Text style={[styles.tinyLabel, {color: '#888'}]}>{m.date}</Text>
                     <Text style={[styles.listItemSub, {marginTop: 2}]}>{m.notes || '—'}</Text>
                  </View>
                  <TouchableOpacity onPress={() => Alert.alert('Delete Progress', 'Feature coming soon')}><Ionicons name="close" size={18} color="#FF5252"/></TouchableOpacity>
               </View>
             ))
          )}
        </View>

        {/* ── Analytics Accordion ── */}
        <TouchableOpacity style={styles.accordionHeader} onPress={() => setIsAnalyticsExpanded(!isAnalyticsExpanded)}>
           <Ionicons name="bar-chart" size={14} color="#FF5252" />
           <Text style={styles.accordionText}>Analytics</Text>
           <Text style={styles.accordionSubText}>tap to {isAnalyticsExpanded ? 'collapse' : 'expand'}</Text>
           <Ionicons name={isAnalyticsExpanded ? 'chevron-up' : 'chevron-down'} size={16} color="#666" style={{marginLeft: 'auto'}} />
        </TouchableOpacity>

        {isAnalyticsExpanded && measurements.length > 0 && (
           <View style={[styles.cardContainer, { marginTop: -16, borderTopLeftRadius: 0, borderTopRightRadius: 0, paddingTop: 24 }]}>
               <Text style={styles.chartTitle}>Weight Trend (kg)</Text>
               <View style={styles.chartContainer}>
                   {measurements.slice(0, 7).reverse().map((m, idx) => {
                     const maxWeight = Math.max(...measurements.map(x => x.weight_kg));
                     const h = (m.weight_kg / maxWeight) * 80;
                     return (
                       <View key={idx} style={styles.chartBarWrapper}>
                         <View style={[styles.chartBar, { height: h }]} />
                         <Text style={styles.chartLabel}>{m.date.split('-')[2]}</Text>
                       </View>
                     );
                   })}
               </View>
           </View>
        )}

        {/* ── Workout Plan Card ── */}
        <View style={styles.cardContainer}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.row}>
              <Ionicons name="barbell" size={16} color="#FFD700" />
              <Text style={styles.cardHeaderTitle}>Workout Plan</Text>
            </View>
            <TouchableOpacity style={styles.actionBtnLight} onPress={() => { setParentForNewWeekly(null); setIsPlanModalVisible(true); }}>
              <Ionicons name="pencil" size={12} color="#AAA" />
              <Text style={[styles.actionBtnLightText, {marginLeft: 4}]}>Edit Plan</Text>
            </TouchableOpacity>
          </View>

          {monthlyPlans.length === 0 && standaloneWeeklyPlans.length === 0 ? (
             <Text style={styles.emptyText}>No plans active. Tap Edit Plan to map a new cycle.</Text>
          ) : (
            <>
              {monthlyPlans.map(month => (
                <View key={month.id} style={{ marginBottom: 20 }}>
                  <View style={[styles.row, { justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }]}>
                    <Text style={[styles.listItemTitle, { color: '#FFD700' }]}>{month.title}</Text>
                    <View style={styles.row}>
                       <TouchableOpacity style={{marginRight: 12}} onPress={() => { setParentForNewWeekly(month.id); setIsPlanModalVisible(true); }}>
                          <Ionicons name="add-circle" size={18} color="#FFD700" />
                       </TouchableOpacity>
                       <TouchableOpacity onPress={() => Alert.alert('Delete Plan', 'Are you sure?', [
                         { text: 'Cancel', style: 'cancel' },
                         { text: 'Delete', style: 'destructive', onPress: async () => { await deletePlan(month.id, clientId); fetchData(); } }
                       ])}>
                          <Ionicons name="trash" size={18} color="#666" />
                       </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={[styles.emptyText, { marginBottom: 16 }]}>{month.goal}</Text>

                  {(weeklyPlansByMonth[month.id] || []).map(week => (
                    <View key={week.id} style={{ marginBottom: 16, paddingLeft: 12, borderLeftWidth: 1, borderLeftColor: '#333' }}>
                      <View style={[styles.row, { justifyContent: 'space-between', marginBottom: 8 }]}>
                        <Text style={styles.subHeading}>{week.title.toUpperCase()}</Text>
                        <TouchableOpacity onPress={() => { setEditWeeklyPlanId(week.id); setIsEditWeeklyVisible(true); }}>
                          <Text style={[styles.actionBtnLightText, { color: '#FFD700' }]}>Planner Grid</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              ))}

              {standaloneWeeklyPlans.map(week => (
                <View key={week.id} style={{ marginBottom: 20 }}>
                  <View style={[styles.row, { justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }]}>
                    <Text style={[styles.listItemTitle, { color: '#FFD700' }]}>{week.title}</Text>
                    <TouchableOpacity onPress={() => Alert.alert('Delete Plan', 'Are you sure?', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: async () => { await deletePlan(week.id, clientId); fetchData(); } }
                    ])}>
                      <Ionicons name="trash" size={18} color="#666" />
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.emptyText, { marginBottom: 16 }]}>{week.goal}</Text>
                  <TouchableOpacity 
                    style={[styles.actionBtnLight, {alignSelf: 'flex-start'}]} 
                    onPress={() => { setEditWeeklyPlanId(week.id); setIsEditWeeklyVisible(true); }}
                  >
                    <Ionicons name="grid" size={12} color="#FFD700" />
                    <Text style={[styles.actionBtnLightText, { marginLeft: 4, color: '#FFD700' }]}>Open Planner Grid</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}
        </View>

        {/* ── Diet Plan Card ── */}
        <View style={styles.cardContainer}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.row}>
              <Ionicons name="nutrition" size={16} color="#3DCC88" />
              <Text style={styles.cardHeaderTitle}>Diet Plan</Text>
            </View>
            <TouchableOpacity style={styles.actionBtnLight} onPress={() => Alert.alert('Edit Plan', 'Diet Plan editor modal features coming soon.')}>
              <Ionicons name="pencil" size={12} color="#AAA" />
              <Text style={[styles.actionBtnLightText, {marginLeft: 4}]}>Edit Plan</Text>
            </TouchableOpacity>
          </View>

          {dietPlans.length === 0 ? (
             <Text style={styles.emptyText}>No diet plan active.</Text>
          ) : (
             <View>
               {/* Macros */}
               <View style={styles.macroRow}>
                 {[
                   { v: dietPlans[0].calories, l: 'kcal', ul: 'CALORIES', c: '#FFF' }, 
                   { v: dietPlans[0].protein_g, l: 'g', ul: 'PROTEIN', c: '#FF5252' }, 
                   { v: dietPlans[0].carbs_g, l: 'g', ul: 'CARBS', c: '#3DCC88' }, 
                   { v: dietPlans[0].fats_g, l: 'g', ul: 'FAT', c: '#FFD700' }
                 ].map(m => (
                   <View key={m.ul} style={styles.macroBox}>
                     <Text style={[styles.macroVal, m.c ? {color: m.c} : null]}>{m.v || '—'} <Text style={styles.macroUnit}>{m.l}</Text></Text>
                     <Text style={styles.macroLabel}>{m.ul}</Text>
                   </View>
                 ))}
               </View>
               {/* Meals List */}
               {(dietPlans[0].meals || []).length > 0 ? (
                 dietPlans[0].meals!.map((meal, idx) => (
                   <View key={idx} style={[styles.listItem, {flexDirection: 'column', alignItems: 'flex-start'}]}>
                     <Text style={styles.mealName}>{meal.name}</Text>
                     <Text style={styles.mealFoods}>{meal.foods}</Text>
                   </View>
                 ))
               ) : (
                 <View style={[styles.listItem, {flexDirection: 'column', alignItems: 'flex-start'}]}>
                    <Text style={styles.mealName}>Notes / Guidelines</Text>
                    <Text style={styles.mealFoods}>{dietPlans[0].meal_notes || 'No specific meals detailed.'}</Text>
                 </View>
               )}
             </View>
          )}
        </View>

      </ScrollView>

      <AddSessionModal visible={isSessionModalVisible} clientId={clientId} planId={activeWeekIdForSession} onClose={() => setIsSessionModalVisible(false)} onSuccess={() => { setIsSessionModalVisible(false); fetchData(); }} />
      <AddMeasurementModal visible={isMeasurementModalVisible} clientId={clientId} onClose={() => setIsMeasurementModalVisible(false)} onSuccess={() => { setIsMeasurementModalVisible(false); fetchData(); }} />
      <CompleteSessionModal visible={!!activeSessionToComplete} sessionId={activeSessionToComplete || ''} clientId={clientId} onClose={() => setActiveSessionToComplete(null)} onSuccess={() => { setActiveSessionToComplete(null); fetchData(); }} />
      <AddPlanModal visible={isPlanModalVisible} clientId={clientId} parentPlanId={parentForNewWeekly} onClose={() => setIsPlanModalVisible(false)} onSuccess={() => { setIsPlanModalVisible(false); fetchData(); }} />
      
      <ManageSessionModal
        visible={isManageSessionVisible}
        session={activeSessionToManage}
        clientId={clientId}
        onClose={() => setIsManageSessionVisible(false)}
        onSuccess={() => { setIsManageSessionVisible(false); fetchData(); }}
        onOpenComplete={() => {
          setActiveSessionToComplete(activeSessionToManage?.id || '');
        }}
      />
      
      {editWeeklyPlanId && (
        <EditWeeklyPlanModal
          visible={isEditWeeklyVisible}
          planId={editWeeklyPlanId}
          clientId={clientId}
          onClose={() => setIsEditWeeklyVisible(false)}
          onSuccess={() => { setIsEditWeeklyVisible(false); fetchData(); }}
        />
      )}
      <ClientProfileModal 
        visible={isProfileModalVisible} 
        onClose={() => setIsProfileModalVisible(false)} 
        data={detailedClientData}
        onEditSection={handleEditProfileSection}
      />
      <AddClientModal
        visible={isEditModalVisible}
        mode="edit"
        clientId={clientId}
        initialData={detailedClientData}
        initialStep={editStep}
        onClose={() => setIsEditModalVisible(false)}
        onSuccess={() => { setIsEditModalVisible(false); fetchData(); }}
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
  
  // Custom Header
  topNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#1F1F1F' },
  logoBadge: { width: 24, height: 24, borderRadius: 4, backgroundColor: '#FFD700', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  logoBadgeText: { color: '#000', fontWeight: '900', fontSize: 16, lineHeight: 18 },
  logoText: { color: '#FFF', fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  profileBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#333', gap: 6 },
  profileBtnText: { color: '#AAA', fontSize: 10, fontWeight: '700' },

  // General Card
  cardContainer: { backgroundColor: '#111111', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#1F1F1F' },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  cardHeaderTitle: { color: '#FFF', fontSize: 14, fontWeight: '700', marginLeft: 8 },
  actionBtnLight: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#222' },
  actionBtnLightText: { color: '#AAA', fontSize: 11, fontWeight: '600' },
  
  subHeading: { color: '#666', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
  emptyText: { color: '#555', fontSize: 12, fontStyle: 'italic' },
  
  listItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161616', padding: 16, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#1F1F1F' },
  listItemTitle: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  listItemSub: { color: '#666', fontSize: 12, marginTop: 4 },
  
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginLeft: 12 },
  badgeText: { fontSize: 9, fontWeight: '800' },
  
  tinyLabel: { color: '#666', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  valueText: { color: '#FFF', fontSize: 16, fontWeight: '800', marginTop: 2 },
  
  accordionHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111111', padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#1F1F1F', gap: 6 },
  accordionText: { color: '#AAA', fontSize: 12, fontWeight: '700', marginLeft: 6 },
  accordionSubText: { color: '#555', fontSize: 11 },
  
  chartTitle: { color: '#666', fontSize: 10, fontWeight: '800', marginBottom: 16 },
  chartContainer: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, height: 100 },
  chartBarWrapper: { flex: 1, alignItems: 'center' },
  chartBar: { width: '100%', backgroundColor: '#FFD700', borderRadius: 4, minHeight: 4 },
  chartLabel: { color: '#444', fontSize: 10, marginTop: 8 },
  
  macroRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  macroBox: { flex: 1, backgroundColor: '#161616', paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#1F1F1F' },
  macroVal: { fontSize: 16, fontWeight: '800' },
  macroUnit: { fontSize: 10, color: '#AAA', fontWeight: '600' },
  macroLabel: { fontSize: 9, color: '#666', fontWeight: '800', marginTop: 6 },
  
  mealName: { color: '#3DCC88', fontSize: 13, fontWeight: '700', marginBottom: 6 },
  mealFoods: { color: '#CCC', fontSize: 13, lineHeight: 20 },
  errorText: { color: '#FF5252', fontSize: 16, fontWeight: '600' },
});
