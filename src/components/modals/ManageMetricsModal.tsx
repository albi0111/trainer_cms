import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  getClientMeasurementConfigs, 
  updateClientMeasurementConfig, 
  deleteClientMeasurementConfig, 
  prepopulateDefaultConfigs 
} from '../../services/measurement/measurementService';
import { MeasurementConfig, MeasurementCategory } from '../../types';

interface ManageMetricsModalProps {
  visible: boolean;
  clientId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ManageMetricsModal({
  visible,
  clientId,
  onClose,
  onSuccess,
}: ManageMetricsModalProps) {
  const [configs, setConfigs] = useState<MeasurementConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingConfig, setEditingConfig] = useState<Partial<MeasurementConfig>>({});

  useEffect(() => {
    if (visible) {
      fetchConfigs();
    }
  }, [visible, clientId]);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const data = await getClientMeasurementConfigs(clientId);
      setConfigs(data);
    } catch (err) {
      console.error('[ManageMetricsModal] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editingConfig.key || !editingConfig.label || !editingConfig.category) {
      Alert.alert('Error', 'Key, Label and Category are required');
      return;
    }
    
    try {
      await updateClientMeasurementConfig(clientId, {
        key: editingConfig.key,
        label: editingConfig.label,
        unit: editingConfig.unit,
        category: editingConfig.category as MeasurementCategory,
        target_min: editingConfig.target_min,
        target_max: editingConfig.target_max,
      });
      setIsEditing(false);
      setEditingConfig({});
      fetchConfigs();
      onSuccess();
    } catch (err) {
      console.error('[ManageMetricsModal] Save error:', err);
      Alert.alert('Error', 'Failed to save metric.');
    }
  };

  const handleDelete = (key: string, label: string) => {
    Alert.alert(
      'Delete Metric',
      `Are you sure you want to stop tracking "${label}"? Historical data remains but won't be easily visible.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: async () => {
            await deleteClientMeasurementConfig(clientId, key);
            fetchConfigs();
            onSuccess();
          } 
        },
      ]
    );
  };

  const handleRestore = async () => {
    try {
      await prepopulateDefaultConfigs(clientId);
      fetchConfigs();
      onSuccess();
    } catch (err) {
      console.error('[ManageMetricsModal] Restore error:', err);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent={true}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>{isEditing ? 'Edit Metric' : 'Tracked Metrics'}</Text>
            <TouchableOpacity onPress={isEditing ? () => setIsEditing(false) : onClose}>
              <Ionicons name="close" size={24} color="#AAA" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color="#FFD700" style={{ margin: 40 }} />
          ) : isEditing ? (
            <ScrollView style={styles.form}>
              <Text style={styles.label}>KEY (Internal ID, unique)</Text>
              <TextInput 
                style={[styles.input, editingConfig.updated_at ? styles.disabledInput : null]} 
                value={editingConfig.key} 
                onChangeText={(t) => setEditingConfig(prev => ({ ...prev, key: t.toLowerCase().replace(/[^a-z0-9_]/g, '_') }))}
                placeholder="e.g. chest_cm"
                placeholderTextColor="#555"
                editable={!editingConfig.updated_at}
              />

              <View style={styles.row}>
                <View style={styles.flex1}>
                   <Text style={styles.label}>LABEL (Display Name)</Text>
                   <TextInput 
                     style={styles.input} 
                     value={editingConfig.label} 
                     onChangeText={(t) => setEditingConfig(prev => ({ ...prev, label: t }))}
                     placeholder="e.g. Chest"
                     placeholderTextColor="#555"
                   />
                </View>
                <View style={{ width: 100 }}>
                   <Text style={styles.label}>UNIT</Text>
                   <TextInput 
                     style={styles.input} 
                     value={editingConfig.unit} 
                     onChangeText={(t) => setEditingConfig(prev => ({ ...prev, unit: t }))}
                     placeholder="cm"
                     placeholderTextColor="#555"
                   />
                </View>
              </View>

              <Text style={styles.label}>CATEGORY</Text>
              <View style={styles.tabContainer}>
                <TouchableOpacity 
                  style={[styles.tab, editingConfig.category === 'body' && styles.tabActive]} 
                  onPress={() => setEditingConfig(prev => ({ ...prev, category: 'body' }))}
                >
                  <Text style={[styles.tabText, editingConfig.category === 'body' && styles.tabTextActive]}>Body</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.tab, editingConfig.category === 'performance' && styles.tabActive]} 
                  onPress={() => setEditingConfig(prev => ({ ...prev, category: 'performance' }))}
                >
                  <Text style={[styles.tabText, editingConfig.category === 'performance' && styles.tabTextActive]}>Performance</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.row, { marginTop: 16 }]}>
                <TouchableOpacity style={styles.submitBtn} onPress={handleSave}>
                  <Text style={styles.submitBtnText}>Save Metric</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : (
            <ScrollView style={styles.list}>
              <View style={styles.listHeader}>
                <Text style={styles.sectionHeader}>BODY MEASUREMENTS</Text>
                {configs.filter(c => c.category === 'body').map(c => (
                  <View key={c.key} style={styles.metricRow}>
                    <View style={styles.metricInfo}>
                      <Text style={styles.metricLabel}>{c.label}</Text>
                      <Text style={styles.metricKey}>{c.key} {c.unit ? `(${c.unit})` : ''}</Text>
                    </View>
                    <View style={styles.actions}>
                       <TouchableOpacity onPress={() => { setEditingConfig(c); setIsEditing(true); }}>
                         <Ionicons name="pencil" size={18} color="#FFD700" />
                       </TouchableOpacity>
                       <TouchableOpacity onPress={() => handleDelete(c.key, c.label)} style={{ marginLeft: 16 }}>
                         <Ionicons name="trash-outline" size={18} color="#FF5252" />
                       </TouchableOpacity>
                    </View>
                  </View>
                ))}

                <Text style={[styles.sectionHeader, { marginTop: 20 }]}>PERFORMANCE</Text>
                {configs.filter(c => c.category === 'performance').map(c => (
                  <View key={c.key} style={styles.metricRow}>
                    <View style={styles.metricInfo}>
                      <Text style={styles.metricLabel}>{c.label}</Text>
                      <Text style={styles.metricKey}>{c.key} {c.unit ? `(${c.unit})` : ''}</Text>
                    </View>
                    <View style={styles.actions}>
                       <TouchableOpacity onPress={() => { setEditingConfig(c); setIsEditing(true); }}>
                         <Ionicons name="pencil" size={18} color="#FFD700" />
                       </TouchableOpacity>
                       <TouchableOpacity onPress={() => handleDelete(c.key, c.label)} style={{ marginLeft: 16 }}>
                         <Ionicons name="trash-outline" size={18} color="#FF5252" />
                       </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>

              <View style={styles.footer}>
                <TouchableOpacity style={styles.addBtn} onPress={() => { setEditingConfig({ category: 'body' }); setIsEditing(true); }}>
                  <Ionicons name="add" size={20} color="#000" />
                  <Text style={styles.addBtnText}>Add New Metric</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.restoreBtn} onPress={handleRestore}>
                  <Text style={styles.restoreBtnText}>Restore Default Sets</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  container: { backgroundColor: '#1A1A1A', borderRadius: 24, padding: 32, width: '100%', maxWidth: 500, maxHeight: '80%', borderWidth: 1, borderColor: '#333' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 20, fontWeight: '700', color: '#FFF' },
  list: { flexGrow: 0 },
  sectionHeader: { fontSize: 10, fontWeight: '800', color: '#666', letterSpacing: 1, marginBottom: 12 },
  metricRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#333' },
  metricInfo: { flex: 1 },
  metricLabel: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  metricKey: { color: '#888', fontSize: 12, marginTop: 2 },
  actions: { flexDirection: 'row' },
  footer: { marginTop: 24, gap: 12 },
  listHeader: { marginBottom: 12 },
  addBtn: { backgroundColor: '#FFD700', borderRadius: 12, padding: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  addBtnText: { color: '#000', fontWeight: '700', marginLeft: 6 },
  restoreBtn: { padding: 12, alignItems: 'center' },
  restoreBtnText: { color: '#666', fontSize: 13, fontWeight: '600' },

  form: { gap: 16 },
  label: { color: '#AAA', fontSize: 11, fontWeight: '700', marginBottom: 6, letterSpacing: 0.5 },
  input: { backgroundColor: '#222', color: '#FFF', borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1, borderColor: '#333' },
  disabledInput: { backgroundColor: '#111', color: '#666' },
  row: { flexDirection: 'row', gap: 12 },
  flex1: { flex: 1 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#222', borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#444' },
  tabText: { color: '#888', fontSize: 13, fontWeight: '700' },
  tabTextActive: { color: '#FFD700' },
  submitBtn: { flex: 1, backgroundColor: '#3DCC88', padding: 16, borderRadius: 12, alignItems: 'center' },
  submitBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});
