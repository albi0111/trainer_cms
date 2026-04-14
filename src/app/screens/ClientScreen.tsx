// ─────────────────────────────────────────────────────────────────────────────
// Client Screen — Details, Sessions & Progress
// Source of truth: Step 3 Requirements
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState, useCallback } from 'react';
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
import { Client, ClientProfile, Session, Measurement, MissedReason } from '../../types';

import AddSessionModal from '../../components/modals/AddSessionModal';
import AddMeasurementModal from '../../components/modals/AddMeasurementModal';
import CompleteSessionModal from '../../components/modals/CompleteSessionModal';

type ClientScreenRouteProp = RouteProp<RootStackParamList, 'Client'>;

export default function ClientScreen() {
  const route = useRoute<ClientScreenRouteProp>();
  const { clientId } = route.params;

  const [clientData, setClientData] = useState<Client & { profile: ClientProfile } | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals Visibility
  const [isSessionModalVisible, setIsSessionModalVisible] = useState(false);
  const [isMeasurementModalVisible, setIsMeasurementModalVisible] = useState(false);
  const [activeSessionToComplete, setActiveSessionToComplete] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [c, s, m] = await Promise.all([
        getClientById(clientId),
        getSessionsByClient(clientId),
        getMeasurements(clientId),
      ]);
      setClientData(c);
      setSessions(s);
      setMeasurements(m);
    } catch (error) {
      console.error('[ClientScreen] Fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
          <Text style={styles.name}>{clientData.name}</Text>
          <Text style={styles.goal}>{clientData.goal || 'No goal set'}</Text>
        </View>

        {/* ── Sessions Section ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Sessions</Text>
            <TouchableOpacity onPress={() => setIsSessionModalVisible(true)}>
              <Text style={styles.actionText}>+ Plan</Text>
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
                {s.status === 'missed' && s.missed_reason && (
                  <Text style={styles.missedNote}>Reason: {s.missed_reason} {s.missed_note ? `(${s.missed_note})` : ''}</Text>
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
              {measurements.map((m) => (
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
    </SafeAreaView>
  );
}

const YELLOW = '#FFD700';
const GREEN = '#66BB6A';
const RED = '#FF5252';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A0A' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20 },
  header: { marginBottom: 32 },
  name: { fontSize: 32, fontWeight: '800', color: '#FFF' },
  goal: { fontSize: 16, color: '#888', marginTop: 4 },
  section: { marginBottom: 32 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: YELLOW, textTransform: 'uppercase', letterSpacing: 1.5 },
  actionText: { color: YELLOW, fontSize: 13, fontWeight: '700' },
  emptyText: { color: '#444', fontStyle: 'italic', fontSize: 14 },
  
  // Session Cards
  sessionCard: { backgroundColor: '#161616', borderRadius: 16, padding: 16, marginBottom: 12 },
  sessionMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  sessionDate: { color: '#888', fontSize: 11, fontWeight: '600' },
  sessionFocus: { color: '#FFF', fontSize: 18, fontWeight: '700', marginTop: 2 },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  status_planned: { backgroundColor: '#333' },
  status_completed: { backgroundColor: '#1B3A1C' },
  status_missed: { backgroundColor: '#3A1B1B' },
  statusText: { color: '#FFF', fontSize: 9, fontWeight: '800' },
  sessionActions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  btnComplete: { flex: 1, backgroundColor: GREEN, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  btnMissed: { flex: 1, backgroundColor: '#333', paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#000', fontSize: 12, fontWeight: '700' },
  missedNote: { color: RED, fontSize: 12, marginTop: 8, fontStyle: 'italic' },

  // Progress Section
  measurementList: { backgroundColor: '#161616', borderRadius: 16, overflow: 'hidden' },
  measurementRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#222' },
  mDate: { color: '#888', fontSize: 14, flex: 1 },
  mValue: { color: '#FFF', fontSize: 14, fontWeight: '700', flex: 1, textAlign: 'center' },
  mSubValue: { color: '#555', fontSize: 13, flex: 1, textAlign: 'right' },
  
  errorText: { color: RED, fontSize: 16, fontWeight: '600' },
});
