import React, { useEffect, useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getDB } from '../../services/db/database';
import { Plan, Session, Exercise } from '../../types';
import { createSession, deleteSession, updateSession, postponeSession as postponeSessionService } from '../../services/session/sessionService';
import { addExercise, deleteExercise, updateExercise, getExercisesBySession } from '../../services/session/exerciseService';
import { getGlobalScheduleForDateRange, checkSessionOverlap, ScheduledSession } from '../../services/schedule/scheduleService';
import ScheduleCalendarGrid from '../schedule/ScheduleCalendarGrid';
import AppTimePicker from '../shared/AppTimePicker';
import AppDatePicker from '../shared/AppDatePicker';
import ConfirmationModal from './ConfirmationModal';
import { scheduleMeasurementReminders, cancelMeasurementReminders } from '../../services/notification/notificationService';
import { commonStyles } from '../../theme/theme';

interface EditWeeklyPlanModalProps {
  visible: boolean;
  planId: string;
  clientId: string;
  onClose: () => void;
  onSuccess: () => void;
  postponeSession?: Session | null;
  onPostponeSuccess?: () => void;
  editSessionId?: string | null;
}

export default function EditWeeklyPlanModal({
  visible,
  planId,
  clientId,
  onClose,
  onSuccess,
  postponeSession,
  onPostponeSuccess,
  editSessionId
}: EditWeeklyPlanModalProps) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [allSessions, setAllSessions] = useState<ScheduledSession[]>([]);
  const [clientName, setClientName] = useState('');
  
  const [isEditorVisible, setIsEditorVisible] = useState(false);
  const [editingSession, setEditingSession] = useState<Partial<Session> & { exercises: any[] } | null>(null);
  const [conflict, setConflict] = useState<ScheduledSession | null>(null);

  const [isModified, setIsModified] = useState(false);
  const [postponeReason, setPostponeReason] = useState('');

  const [postponeConfirmData, setPostponeConfirmData] = useState<{ date: string, startTime: string, doPostpone: () => void } | null>(null);
  const [isDeleteSessionConfirmVisible, setIsDeleteSessionConfirmVisible] = useState(false);

  useEffect(() => {
    if (visible && (planId || postponeSession || editSessionId)) {
      loadData();
      setIsModified(false);
      setPostponeReason('');
      
      if (editSessionId) {
        openSessionEditor(editSessionId);
      }
    }
  }, [visible, planId, postponeSession, editSessionId]);

  const openSessionEditor = async (id: string) => {
    try {
      const db = getDB();
      const session = await db.getFirstAsync<Session>('SELECT * FROM sessions WHERE id = ?', [id]);
      if (session) {
        const exercises = await getExercisesBySession(id);
        setEditingSession({
          ...session,
          measure_reminder: !!session.measure_reminder,
          exercises: exercises.map(e => ({ ...e, _isNew: false, _isDeleted: false }))
        });
        setConflict(null);
        setIsEditorVisible(true);
      }
    } catch (e) {
      console.error('[openSessionEditor] Error:', e);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const db = getDB();
      if (!postponeSession && planId) {
        const p = await db.getFirstAsync<Plan>('SELECT * FROM plans WHERE id = ?', [planId]);
        if (!p) throw new Error('Plan not found');
        setPlan(p);
      }
      const today = new Date();
      const start = new Date(today.getTime() - 14 * 24 * 3600 * 1000).toISOString().split('T')[0];
      const end = new Date(today.getTime() + 60 * 24 * 3600 * 1000).toISOString().split('T')[0];
      const sessions = await getGlobalScheduleForDateRange(start, end);
      setAllSessions(sessions);
      const client = await db.getFirstAsync<{ name: string }>('SELECT name FROM clients WHERE id = ?', [clientId]);
      setClientName(client?.name || 'Client');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (isModified) onSuccess();
    else onClose();
  };

  const handleSlotPress = async (date: string, hour: number) => {
    const startTime = hour.toString().padStart(2, '0') + ':00';
    const endTime = (hour + 1).toString().padStart(2, '0') + ':00';
    
    if (postponeSession) {
      const doPostpone = async () => {
        setSaving(true);
        try {
          const duration = postponeSession.duration_minutes || 60;
          const [h, m] = startTime.split(':').map(Number);
          const endH = h + Math.floor(duration / 60);
          const endM = m + (duration % 60);
          const calcEndTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
          await postponeSessionService(postponeSession.id, clientId, date, startTime, calcEndTime, postponeReason || null, postponeSession.date);
          onPostponeSuccess?.();
        } catch (e: any) {
          Alert.alert('Error', e.message);
        } finally {
          setSaving(false);
        }
      };
      setPostponeConfirmData({ date, startTime, doPostpone });
      return;
    }

    const existingConflict = await checkSessionOverlap(date, startTime, endTime);
    setConflict(existingConflict);

    setEditingSession({
      client_id: clientId,
      plan_id: planId,
      date,
      start_time: startTime,
      end_time: endTime,
      day_name: new Date(date).toLocaleDateString('en-US', { weekday: 'long' }),
      focus: '',
      type: 'strength',
      status: 'planned',
      measure_reminder: false,
      exercises: []
    });
    setIsEditorVisible(true);
  };

  const handleSessionPress = async (session: ScheduledSession) => {
    if (postponeSession) return;
    if (session.client_id !== clientId) {
      Alert.alert('Other Client', `${session.client_name}'s session: ${session.focus}`);
      return;
    }
    const exercises = await getExercisesBySession(session.id);
    setEditingSession({
      ...session,
      measure_reminder: !!session.measure_reminder,
      exercises: exercises.map(e => ({ ...e, _isNew: false, _isDeleted: false }))
    });
    setConflict(null);
    setIsEditorVisible(true);
  };

  const validateConflict = async (date: string, start: string, end: string, sessionId?: string) => {
    if (!start || !end) return;
    const existingConflict = await checkSessionOverlap(date, start, end, sessionId);
    setConflict(existingConflict);
  };

  const saveEditedSession = async () => {
    if (!editingSession) return;
    if (conflict) {
        Alert.alert('Conflict', `Cannot save. Overlaps with ${conflict.client_name}'s session.`);
        return;
    }
    setSaving(true);
    let sessionId = editingSession.id;
    try {
      let duration = 60;
      if (editingSession.start_time && editingSession.end_time) {
        const [sh, sm] = editingSession.start_time.split(':').map(Number);
        const [eh, em] = editingSession.end_time.split(':').map(Number);
        if (!isNaN(sh) && !isNaN(eh)) {
           duration = (eh * 60 + em) - (sh * 60 + sm);
           if (duration < 0) duration += 24 * 60;
        }
      }
      if (!sessionId) {
        sessionId = await createSession({
          client_id: editingSession.client_id,
          plan_id: editingSession.plan_id,
          date: editingSession.date,
          day_name: editingSession.day_name,
          start_time: editingSession.start_time,
          end_time: editingSession.end_time,
          duration_minutes: duration,
          focus: editingSession.focus || '',
          type: editingSession.type || 'strength',
          notes: editingSession.notes || '',
        } as any);
      } else {
        await updateSession(sessionId, clientId, {
          date: editingSession.date,
          start_time: editingSession.start_time,
          end_time: editingSession.end_time,
          duration_minutes: duration,
          focus: editingSession.focus,
          type: editingSession.type,
          measure_reminder: editingSession.measure_reminder
        });
      }
      if (editingSession.measure_reminder) {
          const sessionForNotif: Session = { ...editingSession, id: sessionId! } as Session;
          await scheduleMeasurementReminders(sessionForNotif, clientName);
      } else {
          await cancelMeasurementReminders(sessionId!);
      }
      let exerciseCount = 0;
      for (const ex of editingSession.exercises) {
          if (ex._isDeleted) {
              if (!ex._isNew) await deleteExercise(clientId, ex.id);
              continue;
          }
          const currentIdx = exerciseCount++;
          const repsVal = ex.target_reps || '';
          const setsVal = 0;
          if (ex._isNew) {
              await addExercise(clientId, { session_id: sessionId!, name: ex.name || 'New Exercise', order_index: currentIdx, target_sets: setsVal, target_reps: repsVal, notes: ex.notes || '', sets: [] });
          } else {
              await updateExercise(clientId, ex.id, { session_id: sessionId!, name: ex.name, order_index: currentIdx, target_sets: setsVal, target_reps: repsVal, notes: ex.notes || '', sets: ex.sets || [] });
          }
      }
      setIsEditorVisible(false);
      setIsModified(true);
      setTimeout(() => loadData(), 100);
    } catch (e: any) {
      Alert.alert('Save Failed', e.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteActiveSession = async () => {
    if (!editingSession?.id) return;
    setIsDeleteSessionConfirmVisible(true);
  };

  const handleConfirmDeleteSession = async () => {
    if (!editingSession?.id) return;
    await deleteSession(editingSession.id!, clientId);
    await cancelMeasurementReminders(editingSession.id!);
    setIsDeleteSessionConfirmVisible(false);
    setIsEditorVisible(false);
    setIsModified(true);
    loadData();
  };

  if (loading) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, isMobile && styles.containerMobile]}>
          <View style={[styles.header, isMobile && styles.headerMobile]}>
            <View style={isMobile ? { width: '100%' } : { flex: 1 }}>
                <Text style={[styles.title, isMobile && { fontSize: 24, marginBottom: 8 }]}>{postponeSession ? 'Postpone Session' : (plan?.title || 'Weekly Planner')}</Text>
                {!isMobile && <Text style={styles.subTitle}>{postponeSession ? 'Select a new slot for the session' : 'Select a slot to schedule a workout'}</Text>}
            </View>

            <View style={isMobile ? { width: '100%', marginTop: 12 } : { flex: 2, marginHorizontal: 20 }}>
                <TextInput 
                   style={styles.noteInput}
                   placeholder={postponeSession ? "Reason for postpone..." : "Note - what this week focus on..."}
                   placeholderTextColor="#666"
                   value={postponeSession ? postponeReason : (plan?.goal || '')}
                   onChangeText={(val) => {
                       if (postponeSession) setPostponeReason(val);
                       else { setPlan(p => p ? { ...p, goal: val } : null); setIsModified(true); }
                   }}
                   onBlur={async () => {
                       if (!postponeSession && plan) {
                           const db = getDB();
                           await db.runAsync('UPDATE plans SET goal = ?, updated_at = ? WHERE id = ?', [plan.goal, new Date().toISOString(), planId]);
                       }
                   }}
                />
            </View>

            <TouchableOpacity onPress={handleClose} style={[styles.closeBtn, isModified && !postponeSession && { backgroundColor: '#FFD700' }, isMobile && { position: 'absolute', top: 16, right: 16 }]}>
              <Ionicons name={(isModified && !postponeSession) ? "checkmark" : "close"} size={20} color={(isModified && !postponeSession) ? "#000" : "#888"} />
            </TouchableOpacity>
          </View>

          <View style={styles.gridContainer}>
            <ScheduleCalendarGrid
              sessions={allSessions}
              activeClientId={clientId}
              onSlotPress={handleSlotPress}
              onSessionPress={handleSessionPress}
              highlightSessionId={postponeSession?.id || null}
              scrollToDate={postponeSession?.date || null}
            />
          </View>
        </View>

        <Modal visible={isEditorVisible} animationType="fade" transparent={true}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.drawerOverlay}>
            <View style={[styles.drawerContainer, isMobile && styles.drawerContainerMobile]}>
                <View style={[styles.header, { marginBottom: 20, paddingHorizontal: 0, paddingVertical: 0 }]}>
                    <Text style={[styles.drawerTitle, isMobile && { fontSize: 18 }]}>{editingSession?.id ? 'Edit Session' : 'New Session'}</Text>
                    <TouchableOpacity onPress={() => setIsEditorVisible(false)} style={styles.closeBtn}>
                        <Ionicons name="close" size={20} color="#888" />
                    </TouchableOpacity>
                </View>

                <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                    <AppDatePicker 
                        label="Date"
                        value={editingSession?.date || ''}
                        onChange={(val) => setEditingSession(prev => ({ ...prev!, date: val }))}
                    />
                    
                    <View style={styles.row}>
                        <AppTimePicker 
                            label="Start Time"
                            value={editingSession?.start_time || '08:00'} 
                            onChange={(val) => {
                                setEditingSession(prev => ({ ...prev!, start_time: val }));
                                validateConflict(editingSession!.date!, val, editingSession!.end_time!, editingSession?.id);
                            }}
                        />
                        <AppTimePicker 
                            label="End Time"
                            value={editingSession?.end_time || '09:00'}
                            onChange={(val) => {
                                setEditingSession(prev => ({ ...prev!, end_time: val }));
                                validateConflict(editingSession!.date!, editingSession!.start_time!, val, editingSession?.id);
                            }}
                        />
                    </View>

                    {conflict && (
                        <View style={styles.conflictWarning}>
                            <Ionicons name="warning" size={16} color="#FF4444" />
                            <Text style={styles.conflictWarningText}>Conflict: {conflict.client_name} is booked at this time.</Text>
                        </View>
                    )}

                    <Text style={styles.label}>Focus / Goal</Text>
                    <TextInput 
                        style={styles.input} 
                        value={editingSession?.focus} 
                        onChangeText={(val) => setEditingSession(prev => ({ ...prev!, focus: val }))}
                        placeholder="e.g. Chest & Triceps"
                        placeholderTextColor="#444"
                    />

                    <View style={[styles.row, { justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 10 }]}>
                        <Text style={styles.sectionTitle}>EXERCISES</Text>
                        <TouchableOpacity style={styles.addExBtn} onPress={() => {
                            setEditingSession(prev => ({
                                ...prev!,
                                exercises: [...prev!.exercises, { id: Math.random().toString(), name: '', target_sets: 0, target_reps: '', _isNew: true }]
                            }));
                        }}>
                             <Ionicons name="add" size={16} color="#FFD700" />
                             <Text style={{ color: '#FFD700', fontWeight: '700', fontSize: 12 }}>ADD</Text>
                        </TouchableOpacity>
                    </View>

                    {editingSession?.exercises.filter(e => !e._isDeleted).map((ex, idx) => (
                        <View key={ex.id} style={styles.exRow}>
                            <TextInput 
                                style={[styles.input, { flex: 3, fontSize: 14, paddingVertical: 10 }]} 
                                value={ex.name} 
                                onChangeText={(v) => {
                                    const next = [...editingSession.exercises];
                                    next[idx].name = v;
                                    setEditingSession(prev => ({ ...prev!, exercises: next }));
                                }}
                                placeholder="Exercise"
                                placeholderTextColor="#444"
                            />
                             <TextInput 
                                style={[styles.input, { flex: 1.2, textAlign: 'center', fontSize: 14, paddingVertical: 10 }]} 
                                value={ex.target_reps} 
                                placeholder="Sets/Reps"
                                placeholderTextColor="#444"
                                onChangeText={(v) => {
                                    const next = [...editingSession.exercises];
                                    next[idx].target_reps = v;
                                    setEditingSession(prev => ({ ...prev!, exercises: next }));
                                }}
                            />
                            <TouchableOpacity 
                                style={{ padding: 8 }}
                                onPress={() => {
                                 const next = [...editingSession.exercises];
                                 next[idx]._isDeleted = true;
                                 setEditingSession(prev => ({ ...prev!, exercises: next }));
                             }}>
                                <Ionicons name="trash-outline" size={18} color="#FF4444" />
                            </TouchableOpacity>
                        </View>
                    ))}

                    <View style={styles.divider} />

                    <TouchableOpacity 
                        style={styles.reminderToggle}
                        onPress={() => setEditingSession(prev => ({ ...prev!, measure_reminder: !prev?.measure_reminder }))}
                    >
                        <View style={[styles.checkbox, editingSession?.measure_reminder && styles.checkboxActive]}>
                            {editingSession?.measure_reminder && <Ionicons name="checkmark" size={14} color="#000" />}
                        </View>
                        <Text style={styles.reminderText}>📏 Remind me to take progress measurements</Text>
                    </TouchableOpacity>
                </ScrollView>

                <View style={[styles.row, { gap: 10, marginTop: 20 }]}>
                    {editingSession?.id && (
                        <TouchableOpacity style={styles.deleteBtn} onPress={deleteActiveSession}>
                            <Text style={styles.deleteBtnText}>Delete</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity 
                        style={[styles.saveBtn, (!!conflict || saving) && styles.disabledBtn]} 
                        onPress={saveEditedSession}
                        disabled={!!conflict || saving}
                    >
                        {saving ? <ActivityIndicator color="#000" /> : <Text style={styles.saveBtnText}>Save Session</Text>}
                    </TouchableOpacity>
                </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>

      <ConfirmationModal
        visible={!!postponeConfirmData}
        onClose={() => setPostponeConfirmData(null)}
        onConfirm={() => {
          postponeConfirmData?.doPostpone();
          setPostponeConfirmData(null);
        }}
        title="Confirm Postpone"
        message={`Are you sure you want to postpone this session to ${postponeConfirmData?.date} at ${postponeConfirmData?.startTime}?`}
        confirmText="Postpone"
        type="warning"
        icon="time-outline"
      />

      <ConfirmationModal
        visible={isDeleteSessionConfirmVisible}
        onClose={() => setIsDeleteSessionConfirmVisible(false)}
        onConfirm={handleConfirmDeleteSession}
        title="Delete Session"
        message="Are you sure you want to delete this session? This action cannot be undone."
        confirmText="Delete"
        type="danger"
        icon="trash"
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  container: { 
    width: '94%',
    maxWidth: 1000, 
    maxHeight: '94%',
    backgroundColor: '#0F0F0F',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#222',
    overflow: 'hidden'
  },
  containerMobile: { width: '100%', height: '100%', maxHeight: '100%', borderRadius: 0, borderWidth: 0 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingVertical: 20 },
  headerMobile: { flexDirection: 'column', paddingHorizontal: 16, paddingVertical: 16 },
  title: { fontSize: 24, fontWeight: '800', color: '#FFF' },
  subTitle: { color: '#666', fontSize: 13, marginTop: 4 },
  closeBtn: { 
    ...commonStyles.circularButton,
    backgroundColor: '#1A1A1A',
  },
  gridContainer: { flex: 1 },

  drawerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  drawerContainer: { width: '100%', maxWidth: 800, maxHeight: '90%', backgroundColor: '#161616', borderRadius: 24, padding: 32 },
  drawerContainerMobile: { padding: 20 },
  drawerTitle: { fontSize: 20, fontWeight: '700', color: '#FFF' },
  label: { color: '#888', fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#222', color: '#FFF', borderRadius: 12, padding: 14, fontSize: 16, borderWidth: 1, borderColor: '#333' },
  noteInput: { 
    backgroundColor: '#161616', 
    color: '#FFF', 
    borderRadius: 12, 
    paddingHorizontal: 16, 
    paddingVertical: 14, 
    borderWidth: 1, 
    borderColor: '#222', 
    fontSize: 14 
  },
  row: { flexDirection: 'row', gap: 12 },
  sectionTitle: { color: '#444', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  addExBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#222', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  exRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  conflictWarning: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#220000', padding: 10, borderRadius: 8, marginTop: 10, borderWidth: 1, borderColor: '#441111' },
  conflictWarningText: { color: '#FF4444', fontSize: 12, fontWeight: '600' },

  saveBtn: { flex: 2, backgroundColor: '#FFD700', padding: 16, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: '#000', fontWeight: '800', fontSize: 16 },
  deleteBtn: { flex: 1, backgroundColor: '#220000', padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#441111' },
  deleteBtnText: { color: '#FF4444', fontWeight: '700' },
  disabledBtn: { opacity: 0.4 },

  divider: { height: 1, backgroundColor: '#222', marginVertical: 20 },
  reminderToggle: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#333', alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: '#FFD700', borderColor: '#FFD700' },
  reminderText: { color: '#AAA', fontSize: 14, fontWeight: '600' },
});
