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
  Platform
} from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../RootNavigator';
import { Ionicons } from '@expo/vector-icons';

import { getClientById, updateClientOverview, getDetailedClient } from '../../services/client/clientService';
import { getSessionsByClient, markSessionMissed } from '../../services/session/sessionService';
import { getExercisesByClient } from '../../services/session/exerciseService';
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

  const [exercises, setExercises] = useState<any[]>([]);
  // Layout states
  const [isAnalyticsExpanded, setIsAnalyticsExpanded] = useState(false);
  const [expandedWeeks, setExpandedWeeks] = useState<string[]>([]);
  const [activeWeekIdForSession, setActiveWeekIdForSession] = useState<string | null>(null);

  // Overview Editing State
  const [isEditingOverview, setIsEditingOverview] = useState(false);
  const [overviewDraft, setOverviewDraft] = useState('');

  // Modals Visibility
  const [isSessionModalVisible, setIsSessionModalVisible] = useState(false);
  const [isMeasurementModalVisible, setIsMeasurementModalVisible] = useState(false);
  const [activeSessionToComplete, setActiveSessionToComplete] = useState<string | null>(null);
  const [isPlanModalVisible, setIsPlanModalVisible] = useState(false);
  const [planModalMode, setPlanModalMode] = useState<'create' | 'edit'>('create');
  const [planModalInitialData, setPlanModalInitialData] = useState<{ id: string, title: string, goal: string } | null>(null);
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
      const [c, s, m, p, ph, st, an, dp, ex] = await Promise.all([
        getClientById(clientId),
        getSessionsByClient(clientId),
        getMeasurements(clientId),
        getPlansByClient(clientId),
        getPhotos(clientId),
        getClientStatus(clientId),
        getCompletionStats(clientId),
        getDietPlansByClient(clientId),
        getExercisesByClient(clientId),
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
    if (Platform.OS === 'web') {
      if (window.confirm(`Are you sure you want to delete "${title}"?`)) {
        handleDeletePlan(id);
      }
    } else {
      Alert.alert('Delete Plan', `Are you sure you want to delete "${title}"?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => handleDeletePlan(id) }
      ]);
    }
  };

  const upcomingSessionsRaw = useMemo(() => sessions.filter(s => s.status === 'planned'), [sessions]);
  const completedSessions = useMemo(() => sessions.filter(s => s.status !== 'planned'), [sessions]);

  // Unified auto-expansion on load
  useEffect(() => {
    if (plans.length > 0 && expandedWeeks.length === 0) {
      setExpandedWeeks(plans.map(p => p.id));
    }
  }, [plans]);

  // Compute bucketing for sessions
  const { upcoming, pendingData } = useMemo(() => {
    const now = new Date();
    const up: any[] = [];
    const pen: any[] = [];
    
    upcomingSessionsRaw.forEach(s => {
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
      
      const sessionWithState = { ...s, isPending };
      if (isPending) pen.push(sessionWithState);
      else up.push(sessionWithState);
    });

    return { upcoming: up, pendingData: pen };
  }, [upcomingSessionsRaw]);

  const toggleWeekExpand = (weekId: string) => {
    setExpandedWeeks(prev => prev.includes(weekId) ? prev.filter(id => id !== weekId) : [...prev, weekId]);
  };

  const renderFigmaWeekBreakdown = (weekId: string) => {
    // 1. Find sessions for this week
    const weekSessions = sessions.filter(s => s.plan_id === weekId).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // 2. Group by Day Name
    const map = new Map<string, typeof weekSessions>();
    weekSessions.forEach(s => {
       const day = s.day_name.toUpperCase();
       if (!map.has(day)) map.set(day, []);
       map.get(day)!.push(s);
    });

    if (map.size === 0) return <Text style={{color: '#666', fontStyle: 'italic', marginLeft: 12, marginBottom: 12}}>No exercises mapped to this week yet.</Text>;

    return (
      <View style={styles.figmaWeekBlock}>
        {Array.from(map.entries()).map(([day, daySessions]) => (
          <View key={day} style={styles.figmaDayBlock}>
            <Text style={styles.figmaDayHeader}>{day}{daySessions[0]?.focus ? ` - ${daySessions[0].focus.toLowerCase()}` : ''}</Text>
            {daySessions.map(session => {
              const sessionEx = exercises.filter(e => e.session_id === session.id);
              if (sessionEx.length === 0) return <Text key={session.id} style={styles.figmaMutedText}>No exact exercises defined for {session.focus || 'this session'}.</Text>;
              
              return sessionEx.map(ex => (
                <View key={ex.id} style={styles.figmaExRow}>
                  <Text style={styles.figmaExName}>{ex.name || 'Unnamed Exercise'}</Text>
                  <Text style={styles.figmaExSets}>{ex.target_sets || 0}x{ex.target_reps || 0}</Text>
                  <Text style={styles.figmaExNotes} numberOfLines={1}>{ex.notes || ''}</Text>
                </View>
              ));
            })}
          </View>
        ))}
      </View>
    );
  };

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
          {upcoming.length === 0 ? (
             <Text style={styles.emptyText}>No upcoming sessions.</Text>
          ) : (
             upcoming.map((s: any) => (
               <TouchableOpacity key={s.id} style={styles.listItem} onPress={() => { setActiveSessionToManage(s); setIsManageSessionVisible(true); }}>
                 <View style={styles.flex1}>
                   <View style={styles.row}>
                     <Text style={styles.listItemTitle}>{s.date}</Text>
                     <View style={[styles.badge, {backgroundColor: '#1A2A50'}]}>
                       <Text style={[styles.badgeText, {color: '#6699FF'}]}>
                         {(s.plan_title || s.type).toUpperCase()}
                         {s.plan_goal ? ` - ${s.plan_goal.toLowerCase()}` : ''}
                       </Text>
                     </View>
                   </View>
                   <Text style={styles.listItemSub}>{s.start_time || '00:00'} - {s.duration_minutes || 60}min - {s.focus}</Text>
                 </View>
                 <View style={styles.row}>
                   <Ionicons name="ellipsis-vertical" size={20} color="#AAA"/>
                 </View>
               </TouchableOpacity>
             ))
          )}

          {pendingData.length > 0 && (
            <>
              <Text style={[styles.subHeading, { marginTop: 16 }]}>PENDING DATA</Text>
              {pendingData.map((s: any) => (
                <TouchableOpacity key={s.id} style={[styles.listItem, { borderColor: '#FFD700', borderWidth: 1 }]} onPress={() => { setActiveSessionToManage(s); setIsManageSessionVisible(true); }}>
                  <View style={styles.flex1}>
                    <View style={styles.row}>
                      <Text style={styles.listItemTitle}>{s.date}</Text>
                      <View style={[styles.badge, {backgroundColor:'#FFD700'}]}>
                        <Text style={[styles.badgeText, {color:'#000'}]}>
                          {(s.plan_title || 'PENDING').toUpperCase()}
                          {s.plan_goal ? ` - ${s.plan_goal.toLowerCase()}` : ''}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.listItemSub, {color: '#FFD700'}]}>{s.start_time || '00:00'} - {s.duration_minutes || 60}min - {s.focus}</Text>
                  </View>
                  <View style={styles.row}>
                    <Ionicons name="ellipsis-vertical" size={20} color="#FFD700"/>
                  </View>
                </TouchableOpacity>
              ))}
            </>
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
            <TouchableOpacity style={styles.actionBtnLight} onPress={() => { setPlanModalMode('create'); setParentForNewWeekly(null); setIsPlanModalVisible(true); }}>
              <Ionicons name="add" size={12} color="#AAA" />
              <Text style={[styles.actionBtnLightText, {marginLeft: 4}]}>Add Plan</Text>
            </TouchableOpacity>
          </View>

          {monthlyPlans.length === 0 && standaloneWeeklyPlans.length === 0 ? (
             <Text style={styles.emptyText}>No plans active. Tap Edit Plan to map a new cycle.</Text>
          ) : (
            <>
              {monthlyPlans.map(month => (
                <View key={month.id} style={{ marginBottom: 20 }}>
                  <View style={[styles.row, { justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }]}>
                    <Text style={[styles.listItemTitle, { color: '#FFD700' }]}>{month.title.toUpperCase()}{month.goal ? ` - ${month.goal.toLowerCase()}` : ''}</Text>
                    <View style={styles.row}>
                       <TouchableOpacity style={{marginRight: 10}} onPress={() => { setPlanModalMode('edit'); setPlanModalInitialData({ id: month.id, title: month.title, goal: month.goal }); setIsPlanModalVisible(true); }}>
                          <Ionicons name="pencil" size={18} color="#FFD700" />
                       </TouchableOpacity>
                       <TouchableOpacity style={{marginRight: 10}} onPress={() => { setPlanModalMode('create'); setParentForNewWeekly(month.id); setIsPlanModalVisible(true); }}>
                          <Ionicons name="add-circle" size={18} color="#FFD700" />
                       </TouchableOpacity>
                        <TouchableOpacity onPress={() => confirmDeletePlan(month.id, month.title)}>
                           <Ionicons name="trash" size={18} color="#666" />
                        </TouchableOpacity>
                    </View>
                  </View>
                  <View style={{ marginBottom: 12 }} />

                  {(weeklyPlansByMonth[month.id] || []).map(week => {
                    const isExpanded = expandedWeeks.includes(week.id);
                    return (
                      <View key={week.id} style={styles.weekGroup}>
                        <View style={[styles.row, { justifyContent: 'space-between', marginBottom: 8 }]}>
                          <TouchableOpacity style={styles.row} onPress={() => toggleWeekExpand(week.id)} activeOpacity={0.8}>
                            <Ionicons name={isExpanded ? "chevron-down" : "chevron-forward"} size={16} color="#FFD700" style={{marginRight: 6}} />
                            <Text style={styles.subHeading}>{week.title.toUpperCase()}{week.goal ? ` - ${week.goal.toLowerCase()}` : ''}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => { setEditWeeklyPlanId(week.id); setIsEditWeeklyVisible(true); }}>
                            <Ionicons name="pencil" size={16} color="#FFD700" />
                          </TouchableOpacity>
                        </View>
                        {isExpanded && renderFigmaWeekBreakdown(week.id)}
                      </View>
                    );
                  })}
                </View>
              ))}

              {standaloneWeeklyPlans.map(week => {
                const isExpanded = expandedWeeks.includes(week.id);
                return (
                  <View key={week.id} style={{ marginBottom: 20 }}>
                    <View style={[styles.row, { justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }]}>
                      <TouchableOpacity style={styles.row} onPress={() => toggleWeekExpand(week.id)} activeOpacity={0.8}>
                         <Ionicons name={isExpanded ? "chevron-down" : "chevron-forward"} size={18} color="#FFD700" style={{marginRight: 6}} />
                         <Text style={[styles.listItemTitle, { color: '#FFD700' }]}>{week.title.toUpperCase()}{week.goal ? ` - ${week.goal.toLowerCase()}` : ''}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => confirmDeletePlan(week.id, week.title)}>
                        <Ionicons name="trash" size={18} color="#666" />
                      </TouchableOpacity>
                    </View>
                    
                    <TouchableOpacity 
                      style={[styles.actionBtnLight, {alignSelf: 'flex-start', marginBottom: 16 }]} 
                      onPress={() => { setEditWeeklyPlanId(week.id); setIsEditWeeklyVisible(true); }}
                    >
                      <Ionicons name="pencil" size={12} color="#FFD700" />
                      <Text style={[styles.actionBtnLightText, { marginLeft: 4, color: '#FFD700' }]}>Edit Plan</Text>
                    </TouchableOpacity>
                    
                    {isExpanded && renderFigmaWeekBreakdown(week.id)}
                  </View>
                );
              })}
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
      <AddPlanModal
        visible={isPlanModalVisible}
        clientId={clientId}
        parentPlanId={parentForNewWeekly}
        mode={planModalMode}
        initialData={planModalInitialData}
        onClose={() => setIsPlanModalVisible(false)}
        onSuccess={() => { setIsPlanModalVisible(false); fetchData(); }}
      />
      
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
  
  // Weekly Figma Styles
  weekGroup: { marginBottom: 16, paddingLeft: 8 },
  figmaWeekBlock: { paddingLeft: 4, marginTop: 12, marginBottom: 16 },
  figmaDayBlock: { marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#1F1F1F' },
  figmaDayHeader: { color: '#FF7D00', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 12 },
  figmaExRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, paddingHorizontal: 4 },
  figmaExName: { flex: 2, color: '#FFF', fontSize: 13, fontWeight: '600' },
  figmaExSets: { flex: 1, color: '#FFF', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  figmaExNotes: { flex: 2, color: '#666', fontSize: 11, textAlign: 'right', fontStyle: 'italic' },
  figmaMutedText: { color: '#444', fontSize: 12, fontStyle: 'italic' },
});
