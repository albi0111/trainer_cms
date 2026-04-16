import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Session } from '../../types';
import { postponeSession, markSessionMissed } from '../../services/session/sessionService';

interface ManageSessionModalProps {
  visible: boolean;
  session: Session | null;
  clientId: string;
  onClose: () => void;
  onSuccess: () => void;
  onOpenComplete: () => void;
}

export default function ManageSessionModal({
  visible,
  session,
  clientId,
  onClose,
  onSuccess,
  onOpenComplete
}: ManageSessionModalProps) {
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'menu' | 'postpone' | 'missed'>('menu');

  // Postpone State
  const [newDate, setNewDate] = useState(session?.date || '');
  const [newTime, setNewTime] = useState(session?.start_time || '');
  const [newEndTime, setNewEndTime] = useState(session?.end_time || '');
  const [postponeNote, setPostponeNote] = useState('');

  // Missed State
  const [missedReason, setMissedReason] = useState<'sick' | 'travel' | 'busy' | 'no_show' | 'other'>('busy');
  const [missedNote, setMissedNote] = useState('');

  // Reset when opening
  React.useEffect(() => {
    if (visible && session) {
      setView('menu');
      setNewDate(session.date);
      setNewTime(session.start_time || '');
      setNewEndTime(session.end_time || '');
      setPostponeNote('');
      setMissedReason('busy');
      setMissedNote('');
    }
  }, [visible, session]);

  if (!session) return null;

  const handlePostpone = async () => {
    setLoading(true);
    try {
      await postponeSession(session.id, clientId, newDate, newTime || null, newEndTime || null, postponeNote || null);
      onSuccess();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMissed = async () => {
    setLoading(true);
    try {
      await markSessionMissed(session.id, clientId, missedReason, missedNote || undefined);
      onSuccess();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
        <View style={styles.container}>
          
          <View style={styles.header}>
            <Text style={styles.title}>
              {view === 'menu' ? 'Manage Session' : view === 'postpone' ? 'Postpone Session' : 'Mark Missed'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#888" />
            </TouchableOpacity>
          </View>

          {view === 'menu' && (
            <View style={styles.menu}>
              <TouchableOpacity style={styles.menuBtn} onPress={() => { onClose(); onOpenComplete(); }}>
                <View style={[styles.iconBox, { backgroundColor: '#FFEEAA' }]}>
                  <Ionicons name="checkmark-done" size={20} color="#000" />
                </View>
                <View>
                  <Text style={styles.menuBtnTitle}>Mark Complete</Text>
                  <Text style={styles.menuBtnDesc}>Log sets, reps, and results</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuBtn} onPress={() => setView('postpone')}>
                <View style={[styles.iconBox, { backgroundColor: '#333' }]}>
                  <Ionicons name="time" size={20} color="#FFD700" />
                </View>
                <View>
                  <Text style={styles.menuBtnTitle}>Postpone Session</Text>
                  <Text style={styles.menuBtnDesc}>Change date or time</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuBtn} onPress={() => setView('missed')}>
                <View style={[styles.iconBox, { backgroundColor: '#441111' }]}>
                  <Ionicons name="close-circle" size={20} color="#FF4444" />
                </View>
                <View>
                  <Text style={[styles.menuBtnTitle, { color: '#FF4444' }]}>Mark as Missed</Text>
                  <Text style={styles.menuBtnDesc}>Record absence or cancellation</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {view === 'postpone' && (
            <View style={styles.form}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>New Date</Text>
                  <TextInput style={styles.input} value={newDate} onChangeText={setNewDate} placeholder="YYYY-MM-DD" placeholderTextColor="#555" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Start Time</Text>
                  <TextInput style={styles.input} value={newTime} onChangeText={setNewTime} placeholder="HH:MM" placeholderTextColor="#555" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>End Time</Text>
                  <TextInput style={styles.input} value={newEndTime} onChangeText={setNewEndTime} placeholder="HH:MM" placeholderTextColor="#555" />
                </View>
              </View>

              <Text style={styles.label}>Reason / Note</Text>
              <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} value={postponeNote} onChangeText={setPostponeNote} multiline placeholder="Feeling sick..." placeholderTextColor="#555" />

              <TouchableOpacity style={styles.submitBtn} onPress={handlePostpone} disabled={loading}>
                {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.submitBtnText}>Postpone</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.backBtn} onPress={() => setView('menu')}><Text style={styles.backBtnText}>Back</Text></TouchableOpacity>
            </View>
          )}

          {view === 'missed' && (
            <View style={styles.form}>
              <Text style={styles.label}>Reason</Text>
              <View style={[styles.row, { flexWrap: 'wrap', marginBottom: 12 }]}>
                {['sick', 'travel', 'busy', 'no_show', 'other'].map(r => (
                  <TouchableOpacity key={r} style={[styles.chip, missedReason === r && styles.chipActive]} onPress={() => setMissedReason(r as any)}>
                    <Text style={[styles.chipText, missedReason === r && styles.chipTextActive]}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Note (Required if 'other')</Text>
              <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} value={missedNote} onChangeText={setMissedNote} multiline placeholder="Detail..." placeholderTextColor="#555" />

              <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#FF4444' }]} onPress={handleMissed} disabled={loading}>
                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={[styles.submitBtnText, { color: '#FFF' }]}>Confirm Missed</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.backBtn} onPress={() => setView('menu')}><Text style={styles.backBtnText}>Back</Text></TouchableOpacity>
            </View>
          )}

        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  container: { backgroundColor: '#161616', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 20, fontWeight: '700', color: '#FFF' },
  closeBtn: { padding: 4 },
  
  menu: { gap: 12 },
  menuBtn: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: '#222', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#333' },
  iconBox: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  menuBtnTitle: { color: '#FFF', fontSize: 16, fontWeight: '600', marginBottom: 2 },
  menuBtnDesc: { color: '#888', fontSize: 13 },

  form: { gap: 16 },
  row: { flexDirection: 'row', gap: 12 },
  label: { color: '#AAA', fontSize: 13, fontWeight: '600', marginBottom: 4 },
  input: { backgroundColor: '#222', color: '#FFF', borderRadius: 12, padding: 14, fontSize: 16, borderWidth: 1, borderColor: '#333' },
  
  chip: { backgroundColor: '#222', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#333' },
  chipActive: { backgroundColor: '#FFD700', borderColor: '#FFD700' },
  chipText: { color: '#888', fontWeight: '600' },
  chipTextActive: { color: '#000' },

  submitBtn: { backgroundColor: '#FFD700', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  submitBtnText: { color: '#000', fontWeight: '700', fontSize: 16 },
  backBtn: { padding: 16, alignItems: 'center' },
  backBtnText: { color: '#888', fontWeight: '600', fontSize: 16 },
});
