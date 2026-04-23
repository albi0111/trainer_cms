import React, { useState, useEffect } from 'react';
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
  ScrollView,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { addMeasurement, getClientMeasurementConfigs } from '../../services/measurement/measurementService';
import { MeasurementConfig } from '../../types';
import ManageMetricsModal from './ManageMetricsModal';

interface AddMeasurementModalProps {
  visible: boolean;
  clientId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormData {
  date: string; // YYYY-MM-DD
  values: Record<string, string>;
  notes?: string;
}

export default function AddMeasurementModal({
  visible,
  clientId,
  onClose,
  onSuccess,
}: AddMeasurementModalProps) {
  const [activeTab, setActiveTab] = useState<'body' | 'performance'>('body');
  const [configs, setConfigs] = useState<MeasurementConfig[]>([]);
  const [loadingConfigs, setLoadingConfigs] = useState(true);
  const [isManageMetricsVisible, setIsManageMetricsVisible] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      values: {},
      notes: '',
    },
  });

  useEffect(() => {
    if (visible) {
      loadConfigs();
    }
  }, [visible, clientId]);

  const loadConfigs = async () => {
    setLoadingConfigs(true);
    try {
      const data = await getClientMeasurementConfigs(clientId);
      setConfigs(data);
      // Reset form with standard date but empty values
      reset({
        date: new Date().toISOString().split('T')[0],
        values: {},
        notes: '',
      });
    } catch (error) {
      console.error('[AddMeasurementModal] Load configs error:', error);
    } finally {
      setLoadingConfigs(false);
    }
  };

  const parseNum = (val: string | undefined) => {
    if (!val || val.trim() === '') return undefined;
    const parsed = parseFloat(val);
    return isNaN(parsed) ? undefined : parsed;
  };

  const onSubmit = async (data: FormData) => {
    try {
      const parsedValues: Record<string, number | undefined> = {};
      Object.keys(data.values).forEach(key => {
        parsedValues[key] = parseNum(data.values[key]);
      });

      await addMeasurement(clientId, {
        date: data.date,
        custom_values_json: JSON.stringify(parsedValues),
        values: parsedValues,
        notes: data.notes,
      });
      reset();
      onSuccess();
    } catch (error: any) {
      if (error.message?.includes('UNIQUE constraint failed')) {
        Alert.alert('Duplicate Date', 'A measurement for this date already exists. Append-only rule: past entries cannot be modified.');
      } else {
        console.error('[AddMeasurementModal] Error:', error);
        Alert.alert('Error', `Failed to add measurement: ${error.message || error}`);
      }
    }
  };

  const renderInput = (key: string, label: string, unit?: string, placeholder?: string) => (
    <View key={key} style={styles.inputWrapper}>
      <Text style={styles.label}>{label.toUpperCase()} {unit ? `(${unit.toUpperCase()})` : ''}</Text>
      <Controller
        control={control}
        name={`values.${key}`}
        render={({ field: { onChange, value } }) => (
          <TextInput 
            style={styles.input} 
            onChangeText={onChange} 
            value={value || ''} 
            keyboardType="numeric" 
            placeholder={placeholder || '0.0'} 
            placeholderTextColor="#555" 
          />
        )}
      />
    </View>
  );

  const filteredConfigs = configs.filter(c => c.category === activeTab);

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Log Progress</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}><Ionicons name="close" size={20} color="#AAA" /></TouchableOpacity>
          </View>
          
          <View style={styles.tabContainer}>
            <TouchableOpacity style={[styles.tab, activeTab === 'body' && styles.tabActive]} onPress={() => setActiveTab('body')}>
              <Text style={[styles.tabText, activeTab === 'body' && styles.tabTextActive]}>Body Measurements</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, activeTab === 'performance' && styles.tabActive]} onPress={() => setActiveTab('performance')}>
              <Text style={[styles.tabText, activeTab === 'performance' && styles.tabTextActive]}>Performance</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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

            {loadingConfigs ? (
              <ActivityIndicator color="#FFD700" style={{ margin: 20 }} />
            ) : (
              <View style={styles.formGrid}>
                {filteredConfigs.map(c => renderInput(c.key, c.label, c.unit))}
                
                <TouchableOpacity 
                  style={styles.addMetricInlineBtn} 
                  onPress={() => setIsManageMetricsVisible(true)}
                >
                  <Ionicons name="add-circle-outline" size={20} color="#FFD700" />
                  <Text style={styles.addMetricInlineText}>Add Metric</Text>
                </TouchableOpacity>

                {filteredConfigs.length === 0 && (
                  <Text style={styles.emptyText}>No {activeTab} metrics defined.</Text>
                )}
              </View>
            )}

            <View style={{ marginTop: 12 }}>
              <Text style={styles.label}>NOTES</Text>
              <Controller
                control={control}
                name="notes"
                render={({ field: { onChange, value } }) => (
                  <TextInput style={[styles.input, styles.textArea]} onChangeText={onChange} value={value as string} multiline numberOfLines={3} placeholder="Observations, how client felt..." placeholderTextColor="#555" />
                )}
              />
            </View>
          </ScrollView>

          <View style={[styles.row, { marginTop: 16 }]}>
            <TouchableOpacity style={[styles.cancelButton, { flex: 1 }]} onPress={onClose} disabled={isSubmitting}>
                <Text style={[styles.cancelButtonText, { textAlign: 'center' }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled, { flex: 1, marginTop: 0 }]} onPress={handleSubmit(onSubmit)} disabled={isSubmitting}>
              {isSubmitting ? <ActivityIndicator color="#000" /> : <Text style={styles.submitButtonText}>✓ Log Entry</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      <ManageMetricsModal 
        visible={isManageMetricsVisible} 
        clientId={clientId} 
        onClose={() => setIsManageMetricsVisible(false)} 
        onSuccess={() => {
          loadConfigs();
        }} 
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  container: { backgroundColor: '#161616', borderRadius: 24, padding: 32, width: '100%', maxWidth: 600, maxHeight: '90%', borderWidth: 1, borderColor: '#333' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700', color: '#FFD700' },
  closeBtn: { padding: 4 },
  
  tabContainer: { flexDirection: 'row', backgroundColor: '#222', borderRadius: 12, padding: 4, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#FFD700' },
  tabText: { color: '#888', fontSize: 13, fontWeight: '700' },
  tabTextActive: { color: '#000' },

  scrollView: { flexGrow: 0 },
  scrollContent: { gap: 16, paddingBottom: 10 },
  row: { flexDirection: 'row', gap: 12 },
  flex1: { flex: 1 },
  formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  inputWrapper: { width: '48%' },
  label: { color: '#AAA', fontSize: 11, fontWeight: '700', marginBottom: 6, letterSpacing: 0.5 },
  input: { backgroundColor: '#222', color: '#FFF', borderRadius: 12, padding: 14, fontSize: 16, borderWidth: 1, borderColor: '#333' },
  textArea: { height: 80, textAlignVertical: 'top' },
  emptyText: { color: '#666', fontSize: 13, fontStyle: 'italic', textAlign: 'center', width: '100%', marginVertical: 20 },
  submitButton: { backgroundColor: '#FFD700', padding: 16, borderRadius: 12, alignItems: 'center' },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#000', fontWeight: '700', fontSize: 16 },
  cancelButton: { backgroundColor: '#222', padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  cancelButtonText: { color: '#AAA', fontWeight: '600', fontSize: 16 },

  addMetricInlineBtn: { 
    width: '48%', 
    height: 52, 
    borderWidth: 1, 
    borderColor: '#333', 
    borderStyle: 'dashed', 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center', 
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#1A1A1A'
  },
  addMetricInlineText: { color: '#FFD700', fontSize: 12, fontWeight: '700' },
});
