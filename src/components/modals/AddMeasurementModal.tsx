// ─────────────────────────────────────────────────────────────────────────────
// Add Measurement Modal
// Source of truth: Step 3 Requirements
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { Ionicons } from '@expo/vector-icons';
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
import { addMeasurement } from '../../services/measurement/measurementService';

interface AddMeasurementModalProps {
  visible: boolean;
  clientId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormData {
  date: string; // YYYY-MM-DD
  weight_kg: string;
  body_fat_pct?: string;
  notes?: string;
}

export default function AddMeasurementModal({
  visible,
  clientId,
  onClose,
  onSuccess,
}: AddMeasurementModalProps) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      weight_kg: '',
      body_fat_pct: '',
      notes: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await addMeasurement(clientId, {
        date: data.date,
        weight_kg: parseFloat(data.weight_kg),
        body_fat_pct: data.body_fat_pct ? parseFloat(data.body_fat_pct) : undefined,
        notes: data.notes,
      });
      reset();
      onSuccess();
    } catch (error: any) {
      if (error.message?.includes('UNIQUE constraint failed')) {
        Alert.alert('Duplicate Date', 'A measurement for this date already exists. Append-only rule: past entries cannot be modified.');
      } else {
        console.error('[AddMeasurementModal] Error:', error);
        Alert.alert('Error', 'Failed to add measurement.');
      }
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Log Progress</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}><Ionicons name="close" size={20} color="#AAA" /></TouchableOpacity>
          </View>

          <View style={styles.form}>
            <View style={styles.row}>
              <View style={styles.flex1}>
                <Text style={styles.label}>DATE (YYYY-MM-DD)</Text>
                <Controller
                  control={control}
                  rules={{ required: 'Required', pattern: { value: /^\d{4}-\d{2}-\d{2}$/, message: 'Invalid format' } }}
                  name="date"
                  render={({ field: { onChange, value } }) => (
                    <TextInput style={styles.input} onChangeText={onChange} value={value} placeholder="2024-04-14" placeholderTextColor="#555" />
                  )}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.flex1}>
                <Text style={styles.label}>WEIGHT (KG) *</Text>
                <Controller
                  control={control}
                  rules={{ required: 'Required' }}
                  name="weight_kg"
                  render={({ field: { onChange, value } }) => (
                    <TextInput style={styles.input} onChangeText={onChange} value={value} keyboardType="numeric" placeholder="75.5" placeholderTextColor="#555" />
                  )}
                />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.label}>BODY FAT %</Text>
                <Controller
                  control={control}
                  name="body_fat_pct"
                  render={({ field: { onChange, value } }) => (
                    <TextInput style={styles.input} onChangeText={onChange} value={value} keyboardType="numeric" placeholder="15.2" placeholderTextColor="#555" />
                  )}
                />
              </View>
            </View>

            <Text style={styles.label}>NOTES</Text>
            <Controller
              control={control}
              name="notes"
              render={({ field: { onChange, value } }) => (
                <TextInput style={[styles.input, styles.textArea]} onChangeText={onChange} value={value} multiline numberOfLines={3} placeholder="Observations, how client felt..." placeholderTextColor="#555" />
              )}
            />

            <View style={[styles.row, { marginTop: 16 }]}>
              <TouchableOpacity style={[styles.cancelButton, { flex: 1 }]} onPress={onClose} disabled={isSubmitting}>
                 <Text style={[styles.cancelButtonText, { textAlign: 'center' }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled, { flex: 1, marginTop: 0 }]} onPress={handleSubmit(onSubmit)} disabled={isSubmitting}>
                {isSubmitting ? <ActivityIndicator color="#000" /> : <Text style={styles.submitButtonText}>✓ Log Entry</Text>}
              </TouchableOpacity>
            </View>
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
  closeBtn: { padding: 4 },
  form: { gap: 16 },
  row: { flexDirection: 'row', gap: 12 },
  flex1: { flex: 1 },
  label: { color: '#AAA', fontSize: 12, fontWeight: '600', marginBottom: 4 },
  input: { backgroundColor: '#222', color: '#FFF', borderRadius: 12, padding: 14, fontSize: 16, borderWidth: 1, borderColor: '#333' },
  textArea: { height: 80, textAlignVertical: 'top' },
  submitButton: { backgroundColor: '#FFD700', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#000', fontWeight: '700', fontSize: 16 },
  cancelButton: { backgroundColor: '#222', padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  cancelButtonText: { color: '#AAA', fontWeight: '600', fontSize: 16 },
});
