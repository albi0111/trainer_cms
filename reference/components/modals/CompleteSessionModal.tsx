// ─────────────────────────────────────────────────────────────────────────────
// Complete Session Modal
// Source of truth: resrc/system_prompt.md §2.6
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';
import { completeSession } from '../../services/session/sessionService';

interface CompleteSessionModalProps {
  visible: boolean;
  sessionId: string;
  clientId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormData {
  perceived_difficulty: string; // 1-10
  energy_level: string; // 1-10
  performance_notes: string;
}

export default function CompleteSessionModal({
  visible,
  sessionId,
  clientId,
  onClose,
  onSuccess,
}: CompleteSessionModalProps) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      perceived_difficulty: '5',
      energy_level: '5',
      performance_notes: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      const difficulty = parseInt(data.perceived_difficulty, 10);
      const energy = parseInt(data.energy_level, 10);

      if (isNaN(difficulty) || difficulty < 1 || difficulty > 10) throw new Error('Difficulty must be 1-10');
      if (isNaN(energy) || energy < 1 || energy > 10) throw new Error('Energy must be 1-10');

      await completeSession(sessionId, clientId, {
        perceived_difficulty: difficulty,
        energy_level: energy,
        performance_notes: data.performance_notes,
      });
      reset();
      onSuccess();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to complete session.');
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Complete Session</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#888" />
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            <View style={styles.row}>
              <View style={styles.flex1}>
                <Text style={styles.label}>Difficulty (1-10)</Text>
                <Controller
                  control={control}
                  name="perceived_difficulty"
                  render={({ field: { onChange, value } }) => (
                    <TextInput style={styles.input} onChangeText={onChange} value={value} keyboardType="number-pad" />
                  )}
                />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.label}>Energy (1-10)</Text>
                <Controller
                  control={control}
                  name="energy_level"
                  render={({ field: { onChange, value } }) => (
                    <TextInput style={styles.input} onChangeText={onChange} value={value} keyboardType="number-pad" />
                  )}
                />
              </View>
            </View>

            <Text style={styles.label}>Performance Notes</Text>
            <Controller
              control={control}
              name="performance_notes"
              render={({ field: { onChange, value } }) => (
                <TextInput style={[styles.input, styles.textArea]} onChangeText={onChange} value={value} multiline placeholder="Client was highly focused today..." placeholderTextColor="#555" />
              )}
            />

            <TouchableOpacity style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]} onPress={handleSubmit(onSubmit)} disabled={isSubmitting}>
              {isSubmitting ? <ActivityIndicator color="#000" /> : <Text style={styles.submitButtonText}>Confirm Completion</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  container: { backgroundColor: '#161616', borderRadius: 24, padding: 32, width: '100%', maxWidth: 500, borderWidth: 1, borderColor: '#333' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 20, fontWeight: '700', color: '#66BB6A' },
  closeBtn: { padding: 4 },
  form: { gap: 16 },
  row: { flexDirection: 'row', gap: 12 },
  flex1: { flex: 1 },
  label: { color: '#AAA', fontSize: 13, fontWeight: '600', marginBottom: 4 },
  input: { backgroundColor: '#222', color: '#FFF', borderRadius: 12, padding: 14, fontSize: 16, borderWidth: 1, borderColor: '#333' },
  textArea: { height: 80, textAlignVertical: 'top' },
  submitButton: { backgroundColor: '#66BB6A', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#000', fontWeight: '700', fontSize: 16 },
});
