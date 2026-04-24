import React, { useState, useEffect, useMemo } from 'react';
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
  getDefaultMetrics,
} from '../../services/measurement/measurementService';
import { MeasurementConfig, MeasurementCategory } from '../../types';

interface ManageMetricsModalProps {
  visible: boolean;
  clientId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface DefaultMetric {
  key: string;
  label: string;
  unit: string;
  category: string;
}

// Metrics that cannot be removed from any client
const LOCKED_KEYS = ['weight_kg'];

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
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);

  const allDefaults: DefaultMetric[] = useMemo(() => getDefaultMetrics(), []);

  useEffect(() => {
    if (visible) {
      fetchConfigs();
      setConfirmDeleteKey(null);
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

  // Metrics available to add (defaults not yet assigned to this client)
  const availableMetrics = useMemo(() => {
    const clientKeys = new Set(configs.map(c => c.key));
    return allDefaults.filter(d => !clientKeys.has(d.key));
  }, [configs, allDefaults]);

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

  const handleRemoveFromClient = async (key: string) => {
    try {
      await deleteClientMeasurementConfig(clientId, key);
      setConfirmDeleteKey(null);
      fetchConfigs();
      onSuccess();
    } catch (err) {
      console.error('[ManageMetricsModal] Remove error:', err);
    }
  };

  const handleAddToClient = async (metric: DefaultMetric) => {
    try {
      await updateClientMeasurementConfig(clientId, {
        key: metric.key,
        label: metric.label,
        unit: metric.unit,
        category: metric.category as MeasurementCategory,
      });
      fetchConfigs();
      onSuccess();
    } catch (err) {
      console.error('[ManageMetricsModal] Add error:', err);
    }
  };

  if (!visible) return null;

  // ── Edit/Create Form ──
  if (isEditing) {
    return (
      <Modal visible={visible} animationType="fade" transparent={true}>
        <View style={styles.overlay}>
          <View style={styles.container}>
            <View style={styles.header}>
              <Text style={styles.title}>
                {editingConfig.updated_at ? 'Edit Metric' : 'Create Metric'}
              </Text>
              <TouchableOpacity onPress={() => setIsEditing(false)}>
                <Ionicons name="arrow-back" size={22} color="#AAA" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
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
              <View style={styles.categoryTabContainer}>
                <TouchableOpacity
                  style={[styles.categoryTab, editingConfig.category === 'body' && styles.categoryTabActive]}
                  onPress={() => setEditingConfig(prev => ({ ...prev, category: 'body' }))}
                >
                  <Text style={[styles.categoryTabText, editingConfig.category === 'body' && styles.categoryTabTextActive]}>Body</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.categoryTab, editingConfig.category === 'performance' && styles.categoryTabActive]}
                  onPress={() => setEditingConfig(prev => ({ ...prev, category: 'performance' }))}
                >
                  <Text style={[styles.categoryTabText, editingConfig.category === 'performance' && styles.categoryTabTextActive]}>Performance</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.row, { marginTop: 20 }]}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsEditing(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submitBtn} onPress={handleSave}>
                  <Text style={styles.submitBtnText}>Save Metric</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  }

  // ── Main List View ──
  const bodyConfigs = configs.filter(c => c.category === 'body');
  const perfConfigs = configs.filter(c => c.category === 'performance');
  const bodyAvailable = availableMetrics.filter(m => m.category === 'body');
  const perfAvailable = availableMetrics.filter(m => m.category === 'performance');

  return (
    <Modal visible={visible} animationType="fade" transparent={true}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Manage Metrics</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#AAA" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color="#FFD700" style={{ margin: 40 }} />
          ) : (
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {/* ─── CLIENT METRICS (Top Section) ─── */}
              <View style={styles.sectionBox}>
                <View style={styles.sectionTitleRow}>
                  <View style={styles.sectionIconWrap}>
                    <Ionicons name="person" size={14} color="#FFD700" />
                  </View>
                  <Text style={styles.sectionTitle}>Client Metrics</Text>
                  <Text style={styles.sectionCount}>{configs.length}</Text>
                </View>

                {bodyConfigs.length > 0 && (
                  <>
                    <Text style={styles.categoryHeader}>BODY MEASUREMENTS</Text>
                    {bodyConfigs.map(c => renderClientMetric(c))}
                  </>
                )}

                {perfConfigs.length > 0 && (
                  <>
                    <Text style={[styles.categoryHeader, bodyConfigs.length > 0 && { marginTop: 16 }]}>PERFORMANCE</Text>
                    {perfConfigs.map(c => renderClientMetric(c))}
                  </>
                )}

                {configs.length === 0 && (
                  <Text style={styles.emptyText}>No metrics tracked for this client yet.</Text>
                )}
              </View>

              {/* ─── Divider ─── */}
              <View style={styles.divider} />

              {/* ─── AVAILABLE METRICS (Bottom Section) ─── */}
              <View style={styles.sectionBox}>
                <View style={styles.sectionTitleRow}>
                  <View style={[styles.sectionIconWrap, { backgroundColor: '#3DCC8820' }]}>
                    <Ionicons name="library" size={14} color="#3DCC88" />
                  </View>
                  <Text style={styles.sectionTitle}>Available Metrics</Text>
                  {availableMetrics.length > 0 && (
                    <Text style={[styles.sectionCount, { backgroundColor: '#3DCC8820', color: '#3DCC88' }]}>{availableMetrics.length}</Text>
                  )}
                </View>

                {bodyAvailable.length > 0 && (
                  <>
                    <Text style={styles.categoryHeader}>BODY MEASUREMENTS</Text>
                    {bodyAvailable.map(m => renderAvailableMetric(m))}
                  </>
                )}

                {perfAvailable.length > 0 && (
                  <>
                    <Text style={[styles.categoryHeader, bodyAvailable.length > 0 && { marginTop: 16 }]}>PERFORMANCE</Text>
                    {perfAvailable.map(m => renderAvailableMetric(m))}
                  </>
                )}

                {availableMetrics.length === 0 && (
                  <Text style={styles.emptyText}>All default metrics are tracked.</Text>
                )}

                {/* Create New Metric */}
                <TouchableOpacity
                  style={styles.createBtn}
                  onPress={() => { setEditingConfig({ category: 'body' }); setIsEditing(true); }}
                >
                  <View style={styles.createBtnIcon}>
                    <Ionicons name="add" size={18} color="#FFD700" />
                  </View>
                  <Text style={styles.createBtnText}>Create Custom Metric</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );

  // ── Render a client metric row ──
  function renderClientMetric(c: MeasurementConfig) {
    const isLocked = LOCKED_KEYS.includes(c.key);
    const isConfirming = confirmDeleteKey === c.key;

    return (
      <View key={c.key} style={styles.metricRow}>
        <View style={styles.metricInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.metricLabel}>{c.label}</Text>
            {isLocked && <Ionicons name="lock-closed" size={12} color="#555" />}
          </View>
          <Text style={styles.metricKey}>{c.key} {c.unit ? `(${c.unit})` : ''}</Text>
        </View>

        {isConfirming ? (
          <View style={styles.confirmRow}>
            <Text style={styles.confirmText}>Remove?</Text>
            <TouchableOpacity
              style={styles.confirmYes}
              onPress={() => handleRemoveFromClient(c.key)}
            >
              <Ionicons name="checkmark" size={16} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmNo}
              onPress={() => setConfirmDeleteKey(null)}
            >
              <Ionicons name="close" size={16} color="#AAA" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => { setEditingConfig(c); setIsEditing(true); }}
            >
              <Ionicons name="pencil" size={15} color="#FFD700" />
            </TouchableOpacity>
            {isLocked ? (
              <View style={[styles.actionBtn, styles.lockedBtn]}>
                <Ionicons name="lock-closed" size={13} color="#555" />
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.actionBtn, styles.removeBtn]}
                onPress={() => setConfirmDeleteKey(c.key)}
              >
                <Ionicons name="remove" size={15} color="#FF5252" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  }

  // ── Render an available metric row ──
  function renderAvailableMetric(m: DefaultMetric) {
    return (
      <View key={m.key} style={styles.metricRow}>
        <View style={styles.metricInfo}>
          <Text style={[styles.metricLabel, { color: '#AAA' }]}>{m.label}</Text>
          <Text style={styles.metricKey}>{m.key} {m.unit ? `(${m.unit})` : ''}</Text>
        </View>
        <TouchableOpacity
          style={[styles.actionBtn, styles.addBtn]}
          onPress={() => handleAddToClient(m)}
        >
          <Ionicons name="add" size={18} color="#3DCC88" />
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  container: { backgroundColor: '#1A1A1A', borderRadius: 24, padding: 28, width: '100%', maxWidth: 500, maxHeight: '85%', borderWidth: 1, borderColor: '#333' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 20, fontWeight: '700', color: '#FFF' },

  // ── Sections ──
  sectionBox: { paddingBottom: 8 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 10 },
  sectionIconWrap: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#FFD70020', alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { color: '#FFF', fontSize: 15, fontWeight: '700', flex: 1 },
  sectionCount: { backgroundColor: '#FFD70020', color: '#FFD700', fontSize: 11, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },

  categoryHeader: { fontSize: 10, fontWeight: '800', color: '#555', letterSpacing: 1, marginBottom: 8 },

  divider: { height: 1, backgroundColor: '#333', marginVertical: 16 },

  // ── Metric Rows ──
  list: { flexGrow: 0 },
  metricRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#222' },
  metricInfo: { flex: 1, marginRight: 12 },
  metricLabel: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  metricKey: { color: '#666', fontSize: 11, marginTop: 2 },

  // ── Actions ──
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#222', borderWidth: 1, borderColor: '#333', alignItems: 'center', justifyContent: 'center' },
  removeBtn: { borderColor: '#FF525240' },
  lockedBtn: { borderColor: '#33333380', backgroundColor: '#1A1A1A' },
  addBtn: { borderColor: '#3DCC8840', backgroundColor: '#3DCC8810' },

  // ── Confirm Row ──
  confirmRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  confirmText: { color: '#FF5252', fontSize: 12, fontWeight: '700' },
  confirmYes: { width: 28, height: 28, borderRadius: 6, backgroundColor: '#FF5252', alignItems: 'center', justifyContent: 'center' },
  confirmNo: { width: 28, height: 28, borderRadius: 6, backgroundColor: '#333', alignItems: 'center', justifyContent: 'center' },

  // ── Create Button ──
  createBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, marginTop: 16, borderWidth: 1, borderColor: '#333', borderStyle: 'dashed', borderRadius: 12, gap: 8 },
  createBtnIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#FFD70015', alignItems: 'center', justifyContent: 'center' },
  createBtnText: { color: '#FFD700', fontSize: 13, fontWeight: '700' },

  // ── Empty State ──
  emptyText: { color: '#555', fontSize: 13, fontStyle: 'italic', textAlign: 'center', paddingVertical: 16 },

  // ── Edit Form ──
  form: { gap: 16 },
  label: { color: '#AAA', fontSize: 11, fontWeight: '700', marginBottom: 6, letterSpacing: 0.5 },
  input: { backgroundColor: '#222', color: '#FFF', borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1, borderColor: '#333' },
  disabledInput: { backgroundColor: '#111', color: '#666' },
  row: { flexDirection: 'row', gap: 12 },
  flex1: { flex: 1 },

  categoryTabContainer: { flexDirection: 'row', backgroundColor: '#222', borderRadius: 12, padding: 4 },
  categoryTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  categoryTabActive: { backgroundColor: '#444' },
  categoryTabText: { color: '#888', fontSize: 13, fontWeight: '700' },
  categoryTabTextActive: { color: '#FFD700' },

  cancelBtn: { flex: 1, backgroundColor: '#222', padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  cancelBtnText: { color: '#AAA', fontWeight: '600', fontSize: 15 },
  submitBtn: { flex: 1, backgroundColor: '#3DCC88', padding: 16, borderRadius: 12, alignItems: 'center' },
  submitBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});
