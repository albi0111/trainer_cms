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
  Platform,
  useWindowDimensions
} from 'react-native';
import { RichEditor, RichToolbar, actions } from 'react-native-pell-rich-editor';
import { RouteProp, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../RootNavigator';
import { Ionicons } from '@expo/vector-icons';

import { getClientById, updateClientOverview, getDetailedClient } from '../../services/client/clientService';
import { getSessionsByClient, markSessionMissed } from '../../services/session/sessionService';
import { getExercisesByClient } from '../../services/session/exerciseService';
import { getMeasurements, getClientMeasurementConfigs } from '../../services/measurement/measurementService';
import { getPlansByClient, deletePlan } from '../../services/plan/planService';
import { getDietPlansByClient } from '../../services/plan/dietPlanService';
import * as ImagePicker from 'expo-image-picker';
import { getPhotos, addProgressPhoto } from '../../services/photo/photoService';
import { getCompletionStats, getClientStatus } from '../../services/analytics/analyticsService';
import { Client, ClientProfile, Session, Measurement, Plan, ClientStatus, ProgressPhoto, DietPlan, MeasurementConfig } from '../../types';

import AddMeasurementModal from '../../components/modals/AddMeasurementModal';
import CompleteSessionModal from '../../components/modals/CompleteSessionModal';
import AddPlanModal from '../../components/modals/AddPlanModal';
import AddClientModal from '../../components/modals/AddClientModal';
import ClientProfileModal from '../../components/modals/ClientProfileModal';
import ManageSessionModal from '../../components/modals/ManageSessionModal';
import EditWeeklyPlanModal from '../../components/modals/EditWeeklyPlanModal';
import ProgressDashboard from '../../components/analytics/ProgressDashboard';
import ManageMetricsModal from '../../components/modals/ManageMetricsModal';

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
  const [isAnalyticsExpanded, setIsAnalyticsExpanded] = useState(true);
  const [expandedWeeks, setExpandedWeeks] = useState<string[]>([]);
  const [measurementConfigs, setMeasurementConfigs] = useState<MeasurementConfig[]>([]);
  const [isManageMetricsVisible, setIsManageMetricsVisible] = useState(false);

  // Overview Editing State
  const [isEditingOverview, setIsEditingOverview] = useState(false);
  const [overviewDraft, setOverviewDraft] = useState('');
  const richText = React.useRef<any>(null);
  const { width } = useWindowDimensions();

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

  const latestWeight = useMemo(() => {
    if (measurements.length === 0) return null;
    const sorted = [...measurements].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return sorted[0].weight_kg;
  }, [measurements]);

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
      const [c, s, m, p, ph, st, an, dp, ex, mc] = await Promise.all([
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
    return { upcoming: up, pendingData: pen };
  }, [upcomingSessionsRaw]);

  const toggleWeekExpand = (weekId: string) => {
    setExpandedWeeks(prev => prev.includes(weekId) ? prev.filter(id => id !== weekId) : [...prev, weekId]);
  };

  const renderFigmaWeekBreakdown = (weekId: string) => {
    const weekSessions = sessions.filter(s => s.plan_id === weekId).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
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
      <View style={styles.topNav}>
         <TouchableOpacity onPress={() => {}} style={styles.row}>
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
        
        <View style={styles.clientHeaderCard}>
          <View style={styles.headerTopRow}>
            <View style={styles.headerAvatar}>
               <Text style={styles.headerAvatarText}>{clientData.name.substring(0, 2).toUpperCase()}</Text>
            </View>
            <View style={styles.headerMainInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.headerName}>{clientData.name}</Text>
                <View style={styles.statusBadgeSmall}><Text style={styles.statusBadgeTextSmall}>Active</Text></View>
              </View>
              <Text style={styles.headerGoal}>{clientData.goal || 'General Fitness'}</Text>
            </View>
          </View>
          
          <View style={[styles.statsRow, { marginTop: 24 }]}>
            <View style={styles.statItem}><Text style={styles.statLabel}>AGE</Text><Text style={styles.statValue}>{clientData.profile.age}y</Text></View>
            <View style={styles.statItem}><Text style={styles.statLabel}>WEIGHT</Text><Text style={styles.statValue}>{latestWeight || clientData.profile.initial_weight_kg}{latestWeight || clientData.profile.initial_weight_kg ? ' kg' : '—'}</Text></View>
            <View style={styles.statItem}><Text style={styles.statLabel}>HEIGHT</Text><Text style={styles.statValue}>{clientData.profile.height_cm || '—'}{clientData.profile.height_cm ? ' cm' : ''}</Text></View>
          </View>
        </View>

        <View style={styles.cardContainer}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.row}>
              <Ionicons name="document-text-outline" size={16} color="#FFD700" />
              <Text style={styles.cardHeaderTitle}>Overview</Text>
            </View>
            <TouchableOpacity style={styles.actionBtnLight} onPress={() => isEditingOverview ? handleSaveOverview() : setIsEditingOverview(true)}>
              <Ionicons name={isEditingOverview ? "checkmark" : "pencil"} size={12} color="#AAA" />
              <Text style={[styles.actionBtnLightText, {marginLeft: 4}]}>{isEditingOverview ? 'Save' : 'Edit'}</Text>
            </TouchableOpacity>
          </View>
          
          {isEditingOverview ? (
            <View style={{ flex: 1, minHeight: 200 }}>
              {Platform.OS === 'web' ? (
                <View style={{ flex: 1, backgroundColor: '#1A1A1A', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#333' }}>
                  {React.createElement('div', {
                    contentEditable: true,
                    style: { color: '#CCC', minHeight: 180, outline: 'none', fontSize: '14px', lineHeight: '22px' },
                    onInput: (e: any) => setOverviewDraft(e.currentTarget.innerHTML),
                    dangerouslySetInnerHTML: { __html: overviewDraft }
                  })}
                </View>
              ) : (
                <View style={{ flex: 1, backgroundColor: '#1A1A1A', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#333' }}>
                  <RichToolbar editor={richText} actions={[ actions.setBold, actions.setItalic, actions.setUnderline, actions.heading1, actions.heading2, actions.insertBulletsList, actions.checkboxList ]} iconTint="#AAA" selectedIconTint="#FFD700" style={{ backgroundColor: '#262626' }} />
                  <RichEditor ref={richText} initialContentHTML={overviewDraft} onChange={setOverviewDraft} editorStyle={{ backgroundColor: '#1A1A1A', color: '#CCC' }} placeholder="Tap to start typing notes..." />
                </View>
              )}
            </View>
          ) : (
            <View style={styles.overviewContainer}>
              {clientData.overview_notes ? (
                Platform.OS === 'web' ? (
                  React.createElement('div', { style: { color: '#AAA', fontSize: '14px', lineHeight: '22px' }, dangerouslySetInnerHTML: { __html: clientData.overview_notes } })
                ) : (
                  <View style={{ flex: 1, backgroundColor: 'transparent', minHeight: 40 }}>
                    <RichEditor initialContentHTML={clientData.overview_notes} disabled={true} editorStyle={{ backgroundColor: 'transparent', color: '#AAA' }} scrollEnabled={false} />
                  </View>
                )
              ) : (
                <Text style={styles.overviewText}>No overview notes yet. Tap Edit to add profile context.</Text>
              )}
            </View>
          )}
        </View>

        <View style={styles.cardContainer}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.row}><Ionicons name="calendar-outline" size={16} color="#6699FF" /><Text style={styles.cardHeaderTitle}>Sessions</Text></View>
          </View>
          <Text style={styles.subHeading}>UPCOMING</Text>
          {upcoming.length === 0 ? <Text style={styles.emptyText}>No upcoming sessions.</Text> : upcoming.map((s: any) => (
             <TouchableOpacity key={s.id} style={styles.listItem} onPress={() => { setActiveSessionToManage(s); setIsManageSessionVisible(true); }}>
               <View style={styles.flex1}>
                 <View style={styles.row}>
                   <Text style={styles.listItemTitle}>{s.date}</Text>
                   <View style={[styles.badge, {backgroundColor: '#1A2A50'}]}><Text style={[styles.badgeText, {color: '#6699FF'}]}>{(s.plan_title || s.type).toUpperCase()}{s.plan_goal ? ` - ${s.plan_goal.toLowerCase()}` : ''}</Text></View>
                 </View>
                 <Text style={styles.listItemSub}>{s.start_time || '00:00'} - {s.duration_minutes || 60}min - {s.focus}</Text>
               </View>
               <Ionicons name="ellipsis-vertical" size={20} color="#AAA"/>
             </TouchableOpacity>
          ))}
          {pendingData.length > 0 && (
            <>
              <Text style={[styles.subHeading, { marginTop: 16 }]}>PENDING DATA</Text>
              {pendingData.map((s: any) => (
                <TouchableOpacity key={s.id} style={[styles.listItem, { borderColor: '#FFD700', borderWidth: 1 }]} onPress={() => { setActiveSessionToManage(s); setIsManageSessionVisible(true); }}>
                  <View style={styles.flex1}>
                    <View style={styles.row}>
                      <Text style={styles.listItemTitle}>{s.date}</Text>
                      <View style={[styles.badge, {backgroundColor:'#FFD700'}]}><Text style={[styles.badgeText, {color:'#000'}]}>{(s.plan_title || 'PENDING').toUpperCase()}{s.plan_goal ? ` - ${s.plan_goal.toLowerCase()}` : ''}</Text></View>
                    </View>
                    <Text style={[styles.listItemSub, {color: '#FFD700'}]}>{s.start_time || '00:00'} - {s.duration_minutes || 60}min - {s.focus}</Text>
                  </View>
                  <Ionicons name="ellipsis-vertical" size={20} color="#FFD700"/>
                </TouchableOpacity>
              ))}
            </>
          )}
          <Text style={[styles.subHeading, { marginTop: 16 }]}>COMPLETED</Text>
          {completedSessions.length === 0 ? <Text style={styles.emptyText}>No completed sessions.</Text> : completedSessions.map(s => (
             <View key={s.id} style={styles.listItem}>
               <Ionicons name="checkmark" size={16} color="#3DCC88" />
               <View style={styles.flex1}><Text style={[styles.listItemTitle, {color: '#AAA', marginLeft: 8}]}>{s.date} - 09:00 - {s.type} - 60min</Text></View>
               <TouchableOpacity onPress={() => Alert.alert('Delete Session', 'Feature coming soon')}><Ionicons name="close" size={18} color="#FF5252"/></TouchableOpacity>
             </View>
          ))}
        </View>

        <ProgressDashboard 
          measurements={measurements}
          configs={measurementConfigs}
          onLogPress={() => setIsMeasurementModalVisible(true)}
          onManageMetrics={() => setIsManageMetricsVisible(true)}
        />

        <View style={styles.cardContainer}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.row}><Ionicons name="barbell" size={16} color="#FFD700" /><Text style={styles.cardHeaderTitle}>Workout Plan</Text></View>
            <TouchableOpacity style={styles.actionBtnLight} onPress={() => { setPlanModalMode('create'); setParentForNewWeekly(null); setIsPlanModalVisible(true); }}><Ionicons name="add" size={12} color="#AAA" /><Text style={[styles.actionBtnLightText, {marginLeft: 4}]}>Add Plan</Text></TouchableOpacity>
          </View>
          {monthlyPlans.length === 0 && standaloneWeeklyPlans.length === 0 ? <Text style={styles.emptyText}>No plans active. Tap Edit Plan to map a new cycle.</Text> : (
            <>
              {monthlyPlans.map(month => (
                <View key={month.id} style={{ marginBottom: 20 }}>
                  <View style={[styles.row, { justifyContent: 'space-between', marginBottom: 4 }]}>
                    <Text style={[styles.listItemTitle, { color: '#FFD700' }]}>{month.title.toUpperCase()}{month.goal ? ` - ${month.goal.toLowerCase()}` : ''}</Text>
                    <View style={styles.row}>
                       <TouchableOpacity style={{marginRight: 10}} onPress={() => { setPlanModalMode('edit'); setPlanModalInitialData({ id: month.id, title: month.title, goal: month.goal }); setIsPlanModalVisible(true); }}><Ionicons name="pencil" size={18} color="#FFD700" /></TouchableOpacity>
                       <TouchableOpacity style={{marginRight: 10}} onPress={() => { setPlanModalMode('create'); setParentForNewWeekly(month.id); setIsPlanModalVisible(true); }}><Ionicons name="add-circle" size={18} color="#FFD700" /></TouchableOpacity>
                       <TouchableOpacity onPress={() => confirmDeletePlan(month.id, month.title)}><Ionicons name="trash" size={18} color="#666" /></TouchableOpacity>
                    </View>
                  </View>
                  {(weeklyPlansByMonth[month.id] || []).map(week => {
                    const isExpanded = expandedWeeks.includes(week.id);
                    return (
                      <View key={week.id} style={styles.weekGroup}>
                        <View style={[styles.row, { justifyContent: 'space-between', marginBottom: 8 }]}>
                          <TouchableOpacity style={styles.row} onPress={() => toggleWeekExpand(week.id)} activeOpacity={0.8}><Ionicons name={isExpanded ? "chevron-down" : "chevron-forward"} size={16} color="#FFD700" style={{marginRight: 6}} /><Text style={styles.subHeading}>{week.title.toUpperCase()}{week.goal ? ` - ${week.goal.toLowerCase()}` : ''}</Text></TouchableOpacity>
                          <TouchableOpacity onPress={() => { setEditWeeklyPlanId(week.id); setIsEditWeeklyVisible(true); }}><Ionicons name="pencil" size={16} color="#FFD700" /></TouchableOpacity>
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
                    <View style={[styles.row, { justifyContent: 'space-between', marginBottom: 12 }]}>
                      <TouchableOpacity style={styles.row} onPress={() => toggleWeekExpand(week.id)} activeOpacity={0.8}><Ionicons name={isExpanded ? "chevron-down" : "chevron-forward"} size={18} color="#FFD700" style={{marginRight: 6}} /><Text style={[styles.listItemTitle, { color: '#FFD700' }]}>{week.title.toUpperCase()}{week.goal ? ` - ${week.goal.toLowerCase()}` : ''}</Text></TouchableOpacity>
                      <TouchableOpacity onPress={() => confirmDeletePlan(week.id, week.title)}><Ionicons name="trash" size={18} color="#666" /></TouchableOpacity>
                    </View>
                    <TouchableOpacity style={[styles.actionBtnLight, {alignSelf: 'flex-start', marginBottom: 16 }]} onPress={() => { setEditWeeklyPlanId(week.id); setIsEditWeeklyVisible(true); }}><Ionicons name="pencil" size={12} color="#FFD700" /><Text style={[styles.actionBtnLightText, { marginLeft: 4, color: '#FFD700' }]}>Edit Plan</Text></TouchableOpacity>
                    {isExpanded && renderFigmaWeekBreakdown(week.id)}
                  </View>
                );
              })}
            </>
          )}
        </View>

        <View style={styles.cardContainer}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.row}><Ionicons name="nutrition" size={16} color="#3DCC88" /><Text style={styles.cardHeaderTitle}>Diet Plan</Text></View>
            <TouchableOpacity style={styles.actionBtnLight} onPress={() => Alert.alert('Edit Plan', 'Diet Plan editor modal features coming soon.')}><Ionicons name="pencil" size={12} color="#AAA" /><Text style={[styles.actionBtnLightText, {marginLeft: 4}]}>Edit Plan</Text></TouchableOpacity>
          </View>
          {dietPlans.length === 0 ? <Text style={styles.emptyText}>No diet plan active.</Text> : (
             <View>
               <View style={styles.macroRow}>
                 {[
                   { v: dietPlans[0].calories, l: 'kcal', ul: 'CALORIES', c: '#FFF' }, 
                   { v: dietPlans[0].protein_g, l: 'g', ul: 'PROTEIN', c: '#FF5252' }, 
                   { v: dietPlans[0].carbs_g, l: 'g', ul: 'CARBS', c: '#3DCC88' }, 
                   { v: dietPlans[0].fats_g, l: 'g', ul: 'FAT', c: '#FFD700' }
                 ].map(m => (
                   <View key={m.ul} style={styles.macroBox}><Text style={[styles.macroVal, m.c ? {color: m.c} : null]}>{m.v || '—'} <Text style={styles.macroUnit}>{m.l}</Text></Text><Text style={styles.macroLabel}>{m.ul}</Text></View>
                 ))}
               </View>
               {(dietPlans[0].meals || []).length > 0 ? dietPlans[0].meals!.map((meal, idx) => (
                   <View key={idx} style={[styles.listItem, {flexDirection: 'column', alignItems: 'flex-start'}]}><Text style={styles.mealName}>{meal.name}</Text><Text style={styles.mealFoods}>{meal.foods}</Text></View>
               )) : (
                 <View style={[styles.listItem, {flexDirection: 'column', alignItems: 'flex-start'}]}><Text style={styles.mealName}>Notes / Guidelines</Text><Text style={styles.mealFoods}>{dietPlans[0].meal_notes || 'No specific meals detailed.'}</Text></View>
               )}
             </View>
          )}
        </View>

      </ScrollView>

      <AddMeasurementModal visible={isMeasurementModalVisible} clientId={clientId} onClose={() => setIsMeasurementModalVisible(false)} onSuccess={() => { setIsMeasurementModalVisible(false); fetchData(); }} />
      <ManageMetricsModal visible={isManageMetricsVisible} clientId={clientId} onClose={() => setIsManageMetricsVisible(false)} onSuccess={() => { fetchData(); }} />
      <CompleteSessionModal visible={!!activeSessionToComplete} sessionId={activeSessionToComplete || ''} clientId={clientId} onClose={() => setActiveSessionToComplete(null)} onSuccess={() => { setActiveSessionToComplete(null); fetchData(); }} />
      <AddPlanModal visible={isPlanModalVisible} clientId={clientId} parentPlanId={parentForNewWeekly} mode={planModalMode} initialData={planModalInitialData} onClose={() => setIsPlanModalVisible(false)} onSuccess={() => { setIsPlanModalVisible(false); fetchData(); }} />
      <ManageSessionModal visible={isManageSessionVisible} session={activeSessionToManage} clientId={clientId} onClose={() => setIsManageSessionVisible(false)} onSuccess={() => { setIsManageSessionVisible(false); fetchData(); }} onOpenComplete={() => setActiveSessionToComplete(activeSessionToManage?.id || '')} />
      {editWeeklyPlanId && <EditWeeklyPlanModal visible={isEditWeeklyVisible} planId={editWeeklyPlanId} clientId={clientId} onClose={() => setIsEditWeeklyVisible(false)} onSuccess={() => { setIsEditWeeklyVisible(false); fetchData(); }} />}
      <ClientProfileModal visible={isProfileModalVisible} onClose={() => setIsProfileModalVisible(false)} data={detailedClientData} onEditSection={handleEditProfileSection} />
      <AddClientModal visible={isEditModalVisible} mode="edit" clientId={clientId} initialData={detailedClientData} initialStep={editStep} onClose={() => setIsEditModalVisible(false)} onSuccess={() => { setIsEditModalVisible(false); fetchData(); }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A0A' },
  flex1: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 24, paddingBottom: 60 },
  row: { flexDirection: 'row', alignItems: 'center' },
  topNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#1F1F1F' },
  logoBadge: { width: 24, height: 24, borderRadius: 4, backgroundColor: '#FFD700', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  logoBadgeText: { color: '#000', fontWeight: '900', fontSize: 16, lineHeight: 18 },
  logoText: { color: '#FFF', fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  profileBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#333', gap: 6 },
  profileBtnText: { color: '#AAA', fontSize: 10, fontWeight: '700' },
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
  macroRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  macroBox: { flex: 1, backgroundColor: '#161616', paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#1F1F1F' },
  macroVal: { fontSize: 16, fontWeight: '800' },
  macroUnit: { fontSize: 10, color: '#AAA', fontWeight: '600' },
  macroLabel: { fontSize: 9, color: '#666', fontWeight: '800', marginTop: 6 },
  mealName: { color: '#3DCC88', fontSize: 13, fontWeight: '700', marginBottom: 6 },
  mealFoods: { color: '#CCC', fontSize: 13, lineHeight: 20 },
  errorText: { color: '#FF5252', fontSize: 16, fontWeight: '600' },
  figmaWeekBlock: { paddingLeft: 4, marginTop: 12, marginBottom: 16 },
  figmaDayBlock: { marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#1F1F1F' },
  figmaDayHeader: { color: '#FF7D00', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 12 },
  figmaExRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, paddingHorizontal: 4 },
  figmaExName: { flex: 2, color: '#FFF', fontSize: 13, fontWeight: '600' },
  figmaExSets: { flex: 1, color: '#FFF', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  figmaExNotes: { flex: 2, color: '#666', fontSize: 11, textAlign: 'right', fontStyle: 'italic' },
  figmaMutedText: { color: '#444', fontSize: 12, fontStyle: 'italic' },
  clientHeaderCard: { backgroundColor: '#111', borderRadius: 24, padding: 24, marginBottom: 16, borderWidth: 1, borderColor: '#1F1F1F' },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  headerAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFD700', justifyContent: 'center', alignItems: 'center' },
  headerAvatarText: { color: '#000', fontSize: 22, fontWeight: '900' },
  headerMainInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerName: { color: '#FFF', fontSize: 24, fontWeight: '800' },
  headerGoal: { color: '#888', fontSize: 14, marginTop: 4, fontWeight: '500' },
  statusBadgeSmall: { backgroundColor: '#1A2A1A', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, borderWidth: 1, borderColor: '#3DCC8850' },
  statusBadgeTextSmall: { color: '#3DCC88', fontSize: 10, fontWeight: '700' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  statItem: { flex: 1 },
  statLabel: { color: '#444', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
  statValue: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  overviewContainer: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline' },
  overviewText: { color: '#AAA', fontSize: 14, lineHeight: 22 },
  weekGroup: { marginBottom: 16, paddingLeft: 8 },
});
