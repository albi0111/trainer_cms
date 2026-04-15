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
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { getPlansByClient } from '../../services/plan/planService';
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

  const handleMarkMissed = (sessionId: string) => {
    Alert.alert('Mark as Missed', 'Select a reason:', [
      { text: 'Sick', onPress: () => markSessionMissed(sessionId, clientId, 'sick').then(fetchData) },
      { text: 'Travel', onPress: () => markSessionMissed(sessionId, clientId, 'travel').then(fetchData) },
      { text: 'Busy', onPress: () => markSessionMissed(sessionId, clientId, 'busy').then(fetchData) },
      { text: 'No Show', onPress: () => markSessionMissed(sessionId, clientId, 'no_show').then(fetchData) },
      { text: 'Other', onPress: () => {
        Alert.prompt('Other Reason', 'Enter details:', (note) => {
          if (note) markSessionMissed(sessionId, clientId, 'other', note).then(fetchData);
        });
      }},
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleAddPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled) {
        const date = new Date().toISOString().split('T')[0];
        await addProgressPhoto(clientId, result.assets[0].uri, date);
        fetchData();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to pick photo');
    }
  };

  const handleSaveOverview = async () => {
    try {
      await updateClientOverview(clientId, overviewDraft);
      setIsEditingOverview(false);
      fetchData();
    } catch (err) {
      Alert.alert('Error', 'Failed to save notes');
    }
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

  const currentWeight = measurements[0]?.weight_kg || clientData.profile.initial_weight_kg;
  const bmiVal = (clientData.profile.height_cm > 0) 
    ? (currentWeight / Math.pow(clientData.profile.height_cm / 100, 2)).toFixed(1)
    : 'N/A';

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* ── Summary Card ── */}
        <View style={styles.summaryCard}>
          <View style={styles.row}>
            <View style={styles.largeAvatar}>
              <Text style={styles.largeAvatarText}>{clientData.name.substring(0, 2).toUpperCase()}</Text>
            </View>
            <View style={styles.flex1}>
              <View style={styles.row}>
                <Text style={styles.name}>{clientData.name}</Text>
                <TouchableOpacity style={styles.profileBtn} onPress={handleOpenProfile}>
                  <Ionicons name="person-outline" size={14} color="#AAA" style={{ marginRight: 6 }} />
                  <Text style={styles.profileBtnText}>Profile</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.goalLine}>{clientData.goal || 'No goal set'}</Text>
            </View>
          </View>

          <View style={styles.headerStatsGrid}>
            {[
              { label: 'AGE', value: `${clientData.profile.age}y` },
              { label: 'WEIGHT', value: `${currentWeight} kg` },
              { label: 'HEIGHT', value: `${clientData.profile.height_cm} cm` },
              { label: 'TARGET', value: '60 kg' },
              { label: 'BMI', value: bmiVal },
            ].map(stat => (
              <View key={stat.label} style={styles.headerStatBox}>
                <Text style={styles.headerStatLabel}>{stat.label}</Text>
                <Text style={styles.headerStatVal}>{stat.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Overview Section ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.row}>
              <Ionicons name="document-text-outline" size={16} color="#FFD700" />
              <Text style={styles.sectionTitle}>OVERVIEW</Text>
            </View>
            {!isEditingOverview ? (
              <TouchableOpacity onPress={() => { setOverviewDraft(clientData.overview_notes || ''); setIsEditingOverview(true); }}>
                <Text style={styles.actionText}>Edit</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.row}>
                <TouchableOpacity onPress={() => setIsEditingOverview(false)}>
                  <Text style={[styles.actionText, { color: '#666', marginRight: 12 }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSaveOverview}>
                  <Text style={styles.actionText}>Save</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
          <View style={styles.card}>
            {isEditingOverview ? (
              <TextInput
                style={styles.overviewInput}
                multiline
                value={overviewDraft}
                onChangeText={setOverviewDraft}
                placeholder="Add special notes..."
                placeholderTextColor="#444"
              />
            ) : (
              <Text style={[styles.overviewText, !clientData.overview_notes && styles.emptyItalic]}>
                {clientData.overview_notes || 'No overview notes yet.'}
              </Text>
            )}
          </View>
        </View>

        {/* ── Analytics ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.row}>
              <Ionicons name="stats-chart-outline" size={16} color="#FFD700" />
              <Text style={styles.sectionTitle}>PROGRESS ANALYTICS</Text>
            </View>
          </View>
          {measurements.length < 2 ? (
            <View style={styles.card}><Text style={styles.emptyItalic}>Log more data to see trends.</Text></View>
          ) : (
            <>
              <View style={styles.card}>
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
              
              <View style={[styles.card, { marginTop: 12 }]}>
                <Text style={styles.chartTitle}>Body Measurements (cm)</Text>
                <View style={styles.chartContainer}>
                    {measurements.slice(0, 5).reverse().map((m, idx) => {
                      const val = m.chest_cm || m.waist_cm || m.hips_cm || 0;
                      const h = val > 0 ? (val / 150) * 80 : 2; // Normalize to 150cm max
                      return (
                        <View key={idx} style={styles.chartBarWrapper}>
                          <View style={styles.row}>
                             <View style={[styles.chartBar, { height: (m.chest_cm || 0)/150*80, width: 4, backgroundColor: '#FFD700' }]} />
                             <View style={[styles.chartBar, { height: (m.waist_cm || 0)/150*80, width: 4, backgroundColor: '#FF5252' }]} />
                             <View style={[styles.chartBar, { height: (m.hips_cm || 0)/150*80, width: 4, backgroundColor: '#3DCC88' }]} />
                          </View>
                          <Text style={styles.chartLabel}>{m.date.split('-')[2]}</Text>
                        </View>
                      );
                    })}
                </View>
                <View style={[styles.row, { marginTop: 12, justifyContent: 'center', gap: 16 }]}>
                   <View style={styles.row}><View style={[styles.legendDot, { backgroundColor: '#FFD700' }]} /><Text style={styles.legendText}>Chest</Text></View>
                   <View style={styles.row}><View style={[styles.legendDot, { backgroundColor: '#FF5252' }]} /><Text style={styles.legendText}>Waist</Text></View>
                   <View style={styles.row}><View style={[styles.legendDot, { backgroundColor: '#3DCC88' }]} /><Text style={styles.legendText}>Hips</Text></View>
                </View>
              </View>
            </>
          )}
        </View>

        {/* ── Diet Plan ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.row}>
              <Ionicons name="nutrition-outline" size={16} color="#FFD700" />
              <Text style={styles.sectionTitle}>DIET PLAN</Text>
            </View>
          </View>
          {dietPlans.length === 0 ? (
            <View style={styles.card}><Text style={styles.emptyItalic}>No diet plan active.</Text></View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.dietTitle}>{dietPlans[0].title}</Text>
              <View style={styles.macroRow}>
                {[{ v: dietPlans[0].calories, l: 'KCAL' }, { v: dietPlans[0].protein_g, l: 'PRO' }, { v: dietPlans[0].carbs_g, l: 'CHO' }, { v: dietPlans[0].fats_g, l: 'FAT' }].map(m => (
                  <View key={m.l} style={styles.macroBox}>
                    <Text style={styles.macroVal}>{m.v || '—'}</Text>
                    <Text style={styles.macroLabel}>{m.l}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* ── Hierarchy ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>WORKOUT PLANS</Text>
            <TouchableOpacity onPress={() => { setParentForNewWeekly(null); setIsPlanModalVisible(true); }}>
              <Text style={styles.actionText}>+ Monthly</Text>
            </TouchableOpacity>
          </View>
          {monthlyPlans.map(month => (
            <View key={month.id} style={styles.monthContainer}>
              <View style={styles.monthHeader}>
                <View style={styles.flex1}>
                   <Text style={styles.planTitle}>{month.title}</Text>
                   <Text style={styles.planDates}>{month.start_date} → {month.end_date}</Text>
                </View>
                <TouchableOpacity style={styles.addWeekBtn} onPress={() => { setParentForNewWeekly(month.id); setIsPlanModalVisible(true); }}>
                  <Text style={styles.addWeekText}>+ Week</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.weeksList}>
                {(weeklyPlansByMonth[month.id] || []).map(week => (
                   <View key={week.id} style={styles.weekCard}>
                     <Text style={styles.weekOrder}>WEEK {week.order_index}</Text>
                     <Text style={styles.weekTitle}>{week.title}</Text>
                   </View>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* ── Sessions ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>SESSIONS</Text>
            <TouchableOpacity onPress={() => setIsSessionModalVisible(true)}>
              <Text style={styles.actionText}>+ Manual</Text>
            </TouchableOpacity>
          </View>
          {sessions.slice(0, 5).map(s => (
            <View key={s.id} style={styles.sessionCard}>
              <View style={styles.sessionMain}>
                <View>
                  <Text style={styles.sessionDate}>{s.date} • {s.day_name}</Text>
                  <Text style={styles.sessionFocus}>{s.focus}</Text>
                </View>
                <View style={[styles.statusBadge, (styles as any)[`status_${s.status}`]]}>
                  <Text style={styles.statusText}>{s.status.toUpperCase()}</Text>
                </View>
              </View>
              {s.status === 'planned' && (
                <View style={styles.sessionActions}>
                  <TouchableOpacity style={styles.btnComplete} onPress={() => setActiveSessionToComplete(s.id)}>
                    <Text style={styles.btnText}>Complete</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btnMissed} onPress={() => handleMarkMissed(s.id)}>
                    <Text style={styles.btnText}>Missed</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* ── Measurements ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>MEASUREMENTS</Text>
            <TouchableOpacity onPress={() => setIsMeasurementModalVisible(true)}>
              <Text style={styles.actionText}>+ Log</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.measurementList}>
            {measurements.slice(0, 5).map(m => (
              <View key={m.id} style={styles.measurementRow}>
                <Text style={styles.mDate}>{m.date}</Text>
                <Text style={styles.mValue}>{m.weight_kg} kg</Text>
                <Text style={styles.mSubValue}>{m.body_fat_pct ? `${m.body_fat_pct}%` : '—'}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Photos ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>PROGRESS PHOTOS</Text>
            <TouchableOpacity onPress={handleAddPhoto}>
              <Text style={styles.actionText}>+ Add</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoList}>
            {photos.map(p => (
              <View key={p.id} style={styles.photoWrapper}>
                <Image source={{ uri: p.uri }} style={styles.photoImage} />
                <View style={styles.photoBadge}><Text style={styles.photoBadgeText}>{(p.type || 'front').toUpperCase()}</Text></View>
                <Text style={styles.photoDate}>{p.date}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </ScrollView>

      <AddSessionModal visible={isSessionModalVisible} clientId={clientId} onClose={() => setIsSessionModalVisible(false)} onSuccess={() => { setIsSessionModalVisible(false); fetchData(); }} />
      <AddMeasurementModal visible={isMeasurementModalVisible} clientId={clientId} onClose={() => setIsMeasurementModalVisible(false)} onSuccess={() => { setIsMeasurementModalVisible(false); fetchData(); }} />
      <CompleteSessionModal visible={!!activeSessionToComplete} sessionId={activeSessionToComplete || ''} clientId={clientId} onClose={() => setActiveSessionToComplete(null)} onSuccess={() => { setActiveSessionToComplete(null); fetchData(); }} />
      <AddPlanModal visible={isPlanModalVisible} clientId={clientId} parentPlanId={parentForNewWeekly} onClose={() => setIsPlanModalVisible(false)} onSuccess={() => { setIsPlanModalVisible(false); fetchData(); }} />
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

const YELLOW = '#FFD700';
const GREEN = '#3DCC88';
const SURFACE = '#161616';
const BORDER = '#1F1F1F';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A0A' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 24, paddingBottom: 60 },
  summaryCard: { backgroundColor: '#111', padding: 24, borderRadius: 24, marginBottom: 24, borderWidth: 1, borderColor: BORDER },
  largeAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: YELLOW, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  largeAvatarText: { color: '#000', fontSize: 24, fontWeight: '800' },
  name: { fontSize: 24, fontWeight: '800', color: '#FFF' },
  goalLine: { fontSize: 13, color: '#666', marginTop: 4 },
  headerStatsGrid: { flexDirection: 'row', gap: 10, marginTop: 24 },
  headerStatBox: { flex: 1, backgroundColor: SURFACE, borderRadius: 16, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: BORDER },
  headerStatLabel: { fontSize: 8, fontWeight: '800', color: '#666', marginBottom: 4 },
  headerStatVal: { fontSize: 14, fontWeight: '800', color: '#FFF' },
  section: { marginBottom: 32 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 10, fontWeight: '800', color: '#666', letterSpacing: 1.5 },
  actionText: { color: YELLOW, fontSize: 12, fontWeight: '700' },
  card: { backgroundColor: SURFACE, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: BORDER },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex1: { flex: 1 },
  overviewInput: { color: '#FFF', fontSize: 14, lineHeight: 22, height: 100, textAlignVertical: 'top' },
  overviewText: { color: '#AAA', fontSize: 14, lineHeight: 22 },
  emptyItalic: { color: '#444', fontStyle: 'italic', fontSize: 13 },
  chartTitle: { color: '#666', fontSize: 10, fontWeight: '800', marginBottom: 16 },
  chartContainer: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, height: 100 },
  chartBarWrapper: { flex: 1, alignItems: 'center' },
  chartBar: { width: '100%', backgroundColor: YELLOW, borderRadius: 4, minHeight: 4 },
  chartLabel: { color: '#444', fontSize: 10, marginTop: 8 },
  dietTitle: { color: '#FFF', fontSize: 16, fontWeight: '700', marginBottom: 16 },
  macroRow: { flexDirection: 'row', gap: 8 },
  macroBox: { flex: 1, backgroundColor: '#111', borderRadius: 12, padding: 10, alignItems: 'center' },
  macroVal: { fontSize: 14, fontWeight: '800', color: YELLOW },
  macroLabel: { fontSize: 8, color: '#444', marginTop: 2 },
  statusHeaderBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 8 },
  statusHeaderText: { color: '#FFF', fontSize: 8, fontWeight: '800' },
  status_active: { backgroundColor: '#1B3A1C' },
  status_inactive: { backgroundColor: '#333' },
  status_completed: { backgroundColor: '#1B2C3A' },
  status_planned: { backgroundColor: '#333' },
  status_missed: { backgroundColor: '#3A1B1B' },
  monthContainer: { backgroundColor: SURFACE, borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: BORDER },
  monthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  planTitle: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  planDates: { color: '#444', fontSize: 10, marginTop: 2 },
  addWeekBtn: { backgroundColor: '#111', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#222' },
  addWeekText: { color: YELLOW, fontSize: 10, fontWeight: '700' },
  weeksList: { borderTopWidth: 1, borderTopColor: '#1F1F1F', paddingTop: 12, gap: 8 },
  weekCard: { backgroundColor: '#1A1A1A', padding: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center' },
  weekOrder: { color: YELLOW, fontSize: 10, fontWeight: '800', marginRight: 12 },
  weekTitle: { color: '#AAA', fontSize: 13, fontWeight: '600' },
  sessionCard: { backgroundColor: SURFACE, borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: BORDER },
  sessionMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  sessionDate: { color: '#444', fontSize: 10, fontWeight: '600' },
  sessionFocus: { color: '#FFF', fontSize: 16, fontWeight: '700', marginTop: 4 },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  statusText: { color: '#FFF', fontSize: 8, fontWeight: '800' },
  sessionActions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  btnComplete: { flex: 1, backgroundColor: GREEN, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  btnMissed: { flex: 1, backgroundColor: '#222', paddingVertical: 10, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  btnText: { color: '#000', fontSize: 12, fontWeight: '700' },
  measurementList: { backgroundColor: SURFACE, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: BORDER },
  measurementRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1F1F1F' },
  mDate: { color: '#666', fontSize: 13, flex: 1 },
  mValue: { color: '#FFF', fontSize: 14, fontWeight: '700', flex: 1, textAlign: 'center' },
  mSubValue: { color: '#444', fontSize: 12, flex: 1, textAlign: 'right' },
  photoList: { marginTop: 4 },
  photoWrapper: { marginRight: 16, position: 'relative' },
  photoImage: { width: 140, height: 180, borderRadius: 20, backgroundColor: '#111', borderWidth: 1, borderColor: BORDER },
  photoBadge: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  photoBadgeText: { color: YELLOW, fontSize: 8, fontWeight: '800' },
  photoDate: { color: '#444', fontSize: 10, fontWeight: '600', marginTop: 8, textAlign: 'center' },
  errorText: { color: '#FF5252', fontSize: 16, fontWeight: '600' },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  legendText: { color: '#666', fontSize: 10, fontWeight: '700' },
  profileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F1F1F',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    marginLeft: 'auto',
  },
  profileBtnText: {
    color: '#AAA',
    fontSize: 12,
    fontWeight: '600',
  },
});
