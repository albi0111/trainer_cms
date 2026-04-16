// ─────────────────────────────────────────────────────────────────────────────
// Add Plan Modal (Monthly/Weekly)
// Source of truth: Step 4 Requirements
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
import { createMonthlyPlan, createWeeklyPlan } from '../../services/plan/planService';

interface AddPlanModalProps {
  visible: boolean;
  clientId: string;
  parentPlanId?: string | null; // If provided, creates a weekly plan
  onClose: () => void;
  onSuccess: () => void;
}

interface FormData {
  planType: 'monthly' | 'weekly';
  title: string;
  goal: string;
  startDate: string;
  endDate: string;
}

export default function AddPlanModal({
  visible,
  clientId,
  parentPlanId,
  onClose,
  onSuccess,
}: AddPlanModalProps) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      planType: parentPlanId ? 'weekly' : 'monthly',
      title: parentPlanId ? `Week ${new Date().getDate()}` : '',
      goal: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 28 * 24 * 3600 * 1000).toISOString().split('T')[0],
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      if (data.planType === 'weekly') {
        const start = new Date().toISOString().split('T')[0];
        const end = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0];
        await createWeeklyPlan(
          clientId,
          parentPlanId || null,
          data.title,
          data.goal,
          start,
          end,
          1
        );
      } else {
        await createMonthlyPlan(
          clientId,
          data.title,
          data.goal
        );
      }
      reset();
      onSuccess();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create plan.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>{parentPlanId ? 'Add Weekly Plan' : 'Add New Plan'}</Text>
            <TouchableOpacity onPress={onClose}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
          </View>

          <View style={styles.form}>
            {!parentPlanId && (
              <View>
                <Text style={styles.label}>Plan Frequency</Text>
                <Controller
                  control={control}
                  name="planType"
                  render={({ field: { onChange, value } }) => (
                    <View style={styles.row}>
                      <TouchableOpacity style={[styles.typeBtn, value === 'monthly' && styles.typeBtnActive]} onPress={() => onChange('monthly')}>
                        <Text style={[styles.typeBtnText, value === 'monthly' && styles.typeBtnTextActive]}>Monthly (Auto 4-Weeks)</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.typeBtn, value === 'weekly' && styles.typeBtnActive]} onPress={() => onChange('weekly')}>
                        <Text style={[styles.typeBtnText, value === 'weekly' && styles.typeBtnTextActive]}>Standalone Weekly</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                />
              </View>
            )}

            <Text style={styles.label}>Title</Text>
            <Controller
              control={control}
              name="title"
              render={({ field: { onChange, value } }) => (
                <TextInput style={styles.input} onChangeText={onChange} value={value} placeholder="e.g. Summer Shred" placeholderTextColor="#555" />
              )}
            />

            <Text style={styles.label}>Primary Goal / Focus</Text>
            <Controller
              control={control}
              name="goal"
              render={({ field: { onChange, value } }) => (
                <TextInput style={[styles.input, styles.textArea]} multiline numberOfLines={3} onChangeText={onChange} value={value} placeholder="Muscle gain..." placeholderTextColor="#555" />
              )}
            />

            <TouchableOpacity style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]} onPress={handleSubmit(onSubmit)} disabled={isSubmitting}>
              {isSubmitting ? <ActivityIndicator color="#000" /> : <Text style={styles.submitButtonText}>Create Plan</Text>}
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
  flex1: { flex: 1 },
  row: { flexDirection: 'row', gap: 12 },
  label: { color: '#AAA', fontSize: 13, fontWeight: '600', marginBottom: 4 },
  input: { backgroundColor: '#222', color: '#FFF', borderRadius: 12, padding: 14, fontSize: 16, borderWidth: 1, borderColor: '#333' },
  textArea: { height: 80, textAlignVertical: 'top' },
  typeBtn: { flex: 1, padding: 12, backgroundColor: '#222', borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  typeBtnActive: { backgroundColor: '#FFD700', borderColor: '#FFD700' },
  typeBtnText: { color: '#888', fontWeight: '700', fontSize: 11 },
  typeBtnTextActive: { color: '#000' },
  submitButton: { backgroundColor: '#FFD700', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#000', fontWeight: '700', fontSize: 16 },
});
