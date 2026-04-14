// ─────────────────────────────────────────────────────────────────────────────
// Client Screen — Details, Sessions, Progress & Plans
// Source of truth: Step 3 & Step 4 Requirements
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../RootNavigator';
import { getClientById } from '../../services/client/clientService';
import { getSessionsByClient, markSessionMissed } from '../../services/session/sessionService';
import { getMeasurements } from '../../services/measurement/measurementService';
import { getPlansByClient } from '../../services/plan/planService';
import { getWeightTrend, getCompletionStats, getClientStatus } from '../../services/analytics/analyticsService';
import { Client, ClientProfile, Session, Measurement, Plan, ClientStatus } from '../../types';

import AddSessionModal from '../../components/modals/AddSessionModal';
import AddMeasurementModal from '../../components/modals/AddMeasurementModal';
import CompleteSessionModal from '../../components/modals/CompleteSessionModal';
import AddPlanModal from '../../components/modals/AddPlanModal';

type ClientScreenRouteProp = RouteProp<RootStackParamList, 'Client'>;

export default function ClientScreen() {
  const route = useRoute<ClientScreenRouteProp>();
  const { clientId } = route.params;

  const [clientData, setClientData] = useState<Client & { profile: ClientProfile } | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [status, setStatus] = useState<ClientStatus>('active');
  const [stats, setStats] = useState<{ total: number, completed: number, percentage: number } | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals Visibility
  const [isSessionModalVisible, setIsSessionModalVisible] = useState(false);
  const [isMeasurementModalVisible, setIsMeasurementModalVisible] = useState(false);
  const [activeSessionToComplete, setActiveSessionToComplete] = useState<string | null>(null);
  const [isPlanModalVisible, setIsPlanModalVisible] = useState(false);
  const [parentForNewWeekly, setParentForNewWeekly] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [c, s, m, p, st, an] = await Promise.all([
        getClientById(clientId),
        getSessionsByClient(clientId),
        getMeasurements(clientId),
        getPlansByClient(clientId),
        getClientStatus(clientId),
        getCompletionStats(clientId),
      ]);
      setClientData(c);
      setSessions(s);
      setMeasurements(m);
      setPlans(p);
      setStatus(st);
      setStats(an);
    } catch (error) {
      console.error('[ClientScreen] Fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Hierarchy Logic
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
      <ScrollView contentContainerStyle={styles.content}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.rowCentered}>
            <Text style={styles.name}>{clientData.name}</Text>
            <View style={[styles.statusHeaderBadge, (styles as any)[`status_${status}`]]}>
              <Text style={styles.statusHeaderText}>{status.toUpperCase()}</Text>
            </View>
          </View>
          <Text style={styles.goal}>{clientData.goal || 'No goal set'}</Text>
        </View>

        {/* ── Summary Stats ── */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{stats?.percentage || 0}%</Text>
            <Text style={styles.statLabel}>Completion</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{measurements[0]?.weight_kg || '—'}</Text>
            <Text style={styles.statLabel}>Current Kg</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{sessions.length}</Text>
            <Text style={styles.statLabel}>Total Sessions</Text>
          </View>
        </View>

        {/* ── Plans Section ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Plans & Hierarchy</Text>
            <TouchableOpacity onPress={() => { setParentForNewWeekly(null); setIsPlanModalVisible(true); }}>
              <Text style={styles.actionText}>+ Monthly</Text>
            </TouchableOpacity>
          </View>
          
          {monthlyPlans.length === 0 ? (
            <Text style={styles.emptyText}>No monthly plans defined</Text>
          ) : (
            monthlyPlans.map(month => (
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

                {/* Weeks under this month */}
                <View style={styles.weeksList}>
                  {(weeklyPlansByMonth[month.id] || []).map(week => (
                    <View key={week.id} style={styles.weekCard}>
                      <Text style={styles.weekOrder}>WEEK {week.order_index}</Text>
                      <Text style={styles.weekTitle}>{week.title}</Text>
                    </View>
                  ))}
                  {(!weeklyPlansByMonth[month.id] || weeklyPlansByMonth[month.id].length === 0) && (
                    <Text style={styles.miniEmpty}>No weeks planned yet</Text>
                  )}
                </View>
              </View>
            ))
          )}
        </View>

        {/* ── Sessions Section ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Sessions</Text>
            <TouchableOpacity onPress={() => setIsSessionModalVisible(true)}>
              <Text style={styles.actionText}>+ Manual</Text>
            </TouchableOpacity>
          </View>
          
          {sessions.length === 0 ? (
            <Text style={styles.emptyText}>No sessions planned</Text>
          ) : (
            sessions.map((s) => (
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
            ))
          )}
        </View>

        {/* ── Progress Section ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Progress</Text>
            <TouchableOpacity onPress={() => setIsMeasurementModalVisible(true)}>
              <Text style={styles.actionText}>+ Log</Text>
            </TouchableOpacity>
          </View>

          {measurements.length === 0 ? (
            <Text style={styles.emptyText}>No measurements logged</Text>
          ) : (
            <View style={styles.measurementList}>
              {measurements.slice(0, 3).map((m) => (
                <View key={m.id} style={styles.measurementRow}>
                  <Text style={styles.mDate}>{m.date}</Text>
                  <Text style={styles.mValue}>{m.weight_kg} kg</Text>
                  <Text style={styles.mSubValue}>{m.body_fat_pct ? `${m.body_fat_pct}% BF` : '—'}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── Modals ── */}
      <AddSessionModal
        visible={isSessionModalVisible}
        clientId={clientId}
        onClose={() => setIsSessionModalVisible(false)}
        onSuccess={() => { setIsSessionModalVisible(false); fetchData(); }}
      />
      <AddMeasurementModal
        visible={isMeasurementModalVisible}
        clientId={clientId}
        onClose={() => setIsMeasurementModalVisible(false)}
        onSuccess={() => { setIsMeasurementModalVisible(false); fetchData(); }}
      />
      <CompleteSessionModal
        visible={!!activeSessionToComplete}
        sessionId={activeSessionToComplete || ''}
        clientId={clientId}
        onClose={() => setActiveSessionToComplete(null)}
        onSuccess={() => { setActiveSessionToComplete(null); fetchData(); }}
      />
      <AddPlanModal
        visible={isPlanModalVisible}
        clientId={clientId}
        parentPlanId={parentForNewWeekly}
        onClose={() => setIsPlanModalVisible(false)}
        onSuccess={() => { setIsPlanModalVisible(false); fetchData(); }}
      />
    </SafeAreaView>
  );
}

const YELLOW = '#FFD700';
const GREEN = '#66BB6A';
const RED = '#FF5252';
const SURFACE = '#161616';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A0A' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20 },
  header: { marginBottom: 24 },
  rowCentered: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { fontSize: 32, fontWeight: '800', color: '#FFF' },
  statusHeaderBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusHeaderText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
  goal: { fontSize: 16, color: '#888', marginTop: 4 },
  
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  statBox: { flex: 1, backgroundColor: SURFACE, padding: 16, borderRadius: 16, alignItems: 'center' },
  statVal: { color: YELLOW, fontSize: 20, fontWeight: '800' },
  statLabel: { color: '#888', fontSize: 11, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },

  status_active: { backgroundColor: '#1B3A1C' },
  status_inactive: { backgroundColor: '#333' },
  status_completed: { backgroundColor: '#1B2C3A' },
  status_planned: { backgroundColor: '#333' },
  status_missed: { backgroundColor: '#3A1B1B' },

  section: { marginBottom: 32 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: YELLOW, textTransform: 'uppercase', letterSpacing: 1.5 },
  actionText: { color: YELLOW, fontSize: 13, fontWeight: '700' },
  emptyText: { color: '#444', fontStyle: 'italic', fontSize: 14 },
  
  // Plans
  monthContainer: { backgroundColor: SURFACE, borderRadius: 16, padding: 16, marginBottom: 16 },
  monthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  planTitle: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  planDates: { color: '#555', fontSize: 11, marginTop: 2 },
  addWeekBtn: { backgroundColor: '#222', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#333' },
  addWeekText: { color: YELLOW, fontSize: 11, fontWeight: '700' },
  weeksList: { borderTopWidth: 1, borderTopColor: '#222', paddingTop: 12 },
  weekCard: { backgroundColor: '#1A1A1A', padding: 12, borderRadius: 10, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  weekOrder: { color: YELLOW, fontSize: 10, fontWeight: '800', marginRight: 12 },
  weekTitle: { color: '#AAA', fontSize: 14, fontWeight: '600' },
  miniEmpty: { color: '#333', fontSize: 12, fontStyle: 'italic', marginLeft: 4 },

  // Sessions
  sessionCard: { backgroundColor: SURFACE, borderRadius: 16, padding: 16, marginBottom: 12 },
  sessionMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  sessionDate: { color: '#888', fontSize: 11, fontWeight: '600' },
  sessionFocus: { color: '#FFF', fontSize: 18, fontWeight: '700', marginTop: 2 },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  statusText: { color: '#FFF', fontSize: 9, fontWeight: '800' },
  sessionActions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  flex1: { flex: 1 },
  btnComplete: { flex: 1, backgroundColor: GREEN, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  btnMissed: { flex: 1, backgroundColor: '#333', paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#000', fontSize: 12, fontWeight: '700' },

  // Progress
  measurementList: { backgroundColor: SURFACE, borderRadius: 16, overflow: 'hidden' },
  measurementRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#222' },
  mDate: { color: '#888', fontSize: 14, flex: 1 },
  mValue: { color: '#FFF', fontSize: 14, fontWeight: '700', flex: 1, textAlign: 'center' },
  mSubValue: { color: '#555', fontSize: 13, flex: 1, textAlign: 'right' },
  
  errorText: { color: RED, fontSize: 16, fontWeight: '600' },
});
