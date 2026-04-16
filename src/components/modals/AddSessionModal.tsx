// ─────────────────────────────────────────────────────────────────────────────
// Add Session Modal
// Source of truth: Step 3 Requirements
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
import { createSession } from '../../services/session/sessionService';
import { SessionType } from '../../types';

interface AddSessionModalProps {
  visible: boolean;
  clientId: string;
  planId?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormData {
  date: string;
  focus: string;
  type: SessionType;
}

const SESSION_TYPES: SessionType[] = ['strength', 'cardio', 'mobility', 'mixed'];

export default function AddSessionModal({
  visible,
  clientId,
  planId,
  onClose,
  onSuccess,
}: AddSessionModalProps) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      focus: '',
      type: 'strength',
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      const dateObj = new Date(data.date);
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

      await createSession({
        client_id: clientId,
        plan_id: planId || null,
        date: data.date,
        day_name: dayName,
        focus: data.focus,
        type: data.type,
        notes: '',
      });
      reset();
      onSuccess();
    } catch (error) {
      console.error('[AddSessionModal] Error:', error);
      Alert.alert('Error', 'Failed to create session.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Plan Session</Text>
            <TouchableOpacity onPress={onClose}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
            <Controller
              control={control}
              name="date"
              render={({ field: { onChange, value } }) => (
                <TextInput style={styles.input} onChangeText={onChange} value={value} />
              )}
            />

            <Text style={styles.label}>Focus / Body Part</Text>
            <Controller
              control={control}
              rules={{ required: 'Required' }}
              name="focus"
              render={({ field: { onChange, value } }) => (
                <TextInput style={styles.input} onChangeText={onChange} value={value} placeholder="e.g. Chest & Triceps" placeholderTextColor="#555" />
              )}
            />

            <Text style={styles.label}>Type</Text>
            <View style={styles.typeContainer}>
              {SESSION_TYPES.map((t) => (
                <Controller
                  key={t}
                  control={control}
                  name="type"
                  render={({ field: { onChange, value } }) => (
                    <TouchableOpacity
                      style={[styles.typeButton, value === t && styles.typeButtonActive]}
                      onPress={() => onChange(t)}
                    >
                      <Text style={[styles.typeButtonText, value === t && styles.typeButtonTextActive]}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              ))}
            </View>

            <TouchableOpacity style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]} onPress={handleSubmit(onSubmit)} disabled={isSubmitting}>
              {isSubmitting ? <ActivityIndicator color="#000" /> : <Text style={styles.submitButtonText}>Schedule Session</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  container: { backgroundColor: '#161616', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 20, fontWeight: '700', color: '#FFD700' },
  cancelText: { color: '#888', fontSize: 15 },
  form: { gap: 16 },
  label: { color: '#AAA', fontSize: 13, fontWeight: '600', marginBottom: 4 },
  input: { backgroundColor: '#222', color: '#FFF', borderRadius: 12, padding: 14, fontSize: 16, borderWidth: 1, borderColor: '#333' },
  typeContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: '#222', borderWidth: 1, borderColor: '#333' },
  typeButtonActive: { backgroundColor: '#FFD700', borderColor: '#FFD700' },
  typeButtonText: { color: '#888', fontWeight: '600' },
  typeButtonTextActive: { color: '#000' },
  submitButton: { backgroundColor: '#FFD700', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#000', fontWeight: '700', fontSize: 16 },
});
