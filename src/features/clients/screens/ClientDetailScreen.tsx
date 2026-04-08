import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Appbar,
  Text,
  TextInput,
  Button,
  Chip,
  Divider,
  FAB,
  Portal,
  Dialog,
  useTheme,
  ActivityIndicator,
  Banner,
} from 'react-native-paper';
import { StackScreenProps } from '@react-navigation/stack';
import { ClientStackParamList } from '../../../app/navigation/AppNavigator';
import { useClientDetail } from '../hooks/useClientDetail';
import { useClientStore } from '../../../store/useClientStore';
import { ClientProfile } from '../types';
import { MeasurementInput } from '../services/clientService';
import { sanitizeUpdate } from '../../../shared/utils/sanitizeUtils';

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = StackScreenProps<ClientStackParamList, 'ClientDetail'>;

type TabKey = 'Overview' | 'Lifestyle' | 'Measurements' | 'Sessions' | 'Notes';
const TABS: TabKey[] = ['Overview', 'Lifestyle', 'Measurements', 'Sessions', 'Notes'];

// ─── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_COLORS = {
  incomplete: '#f59e0b',
  active:     '#10b981',
  inactive:   '#6b7280',
};

const StatusBadge = ({ status }: { status: 'incomplete' | 'active' | 'inactive' }) => (
  <Chip
    style={[styles.statusChip, { backgroundColor: STATUS_COLORS[status] + '22' }]}
    textStyle={{ color: STATUS_COLORS[status], fontWeight: '600', fontSize: 12 }}
    compact
  >
    {status.toUpperCase()}
  </Chip>
);

// ─── Tab Bar ──────────────────────────────────────────────────────────────────

interface TabBarProps {
  active: TabKey;
  onPress: (tab: TabKey) => void;
}

const TabBar = ({ active, onPress }: TabBarProps) => {
  const theme = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar}>
      {TABS.map((tab) => {
        const isActive = tab === active;
        return (
          <Pressable
            key={tab}
            onPress={() => onPress(tab)}
            style={[styles.tabItem, isActive && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 }]}
          >
            <Text
              style={[
                styles.tabLabel,
                isActive ? { color: theme.colors.primary, fontWeight: '700' } : { color: '#888' },
              ]}
            >
              {tab}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
};

// ─── Add Measurement Dialog ───────────────────────────────────────────────────

interface AddMeasurementDialogProps {
  visible: boolean;
  clientId: string;
  onDismiss: () => void;
}

const AddMeasurementDialog = ({ visible, clientId, onDismiss }: AddMeasurementDialogProps) => {
  const { addMeasurement } = useClientStore();
  const [weight, setWeight]   = useState('');
  const [height, setHeight]   = useState('');
  const [waist,  setWaist]    = useState('');
  const [hip,    setHip]      = useState('');
  const [chest,  setChest]    = useState('');
  const [bfPct,  setBfPct]    = useState('');
  const [notes,  setNotes]    = useState('');
  const [saving, setSaving]   = useState(false);

  const reset = () => {
    setWeight(''); setHeight(''); setWaist('');
    setHip(''); setChest(''); setBfPct(''); setNotes('');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const input: MeasurementInput = {
        date:        new Date(),
        unit_system: 'metric',
        source:      'manual',
        ...(weight ? { weight: parseFloat(weight) } : {}),
        ...(height ? { height: parseFloat(height) } : {}),
        ...(waist  ? { waist:  parseFloat(waist)  } : {}),
        ...(hip    ? { hip:    parseFloat(hip)    } : {}),
        ...(chest  ? { chest:  parseFloat(chest)  } : {}),
        ...(bfPct  ? { body_fat_pct: parseFloat(bfPct) } : {}),
        ...(notes  ? { notes }                          : {}),
      };
      await addMeasurement(clientId, input);
      reset();
      onDismiss();
    } finally {
      setSaving(false);
    }
  };

  const numericInput = (label: string, value: string, onChange: (v: string) => void) => (
    <TextInput
      key={label}
      label={label}
      value={value}
      onChangeText={onChange}
      mode="outlined"
      keyboardType="decimal-pad"
      style={styles.measureInput}
      dense
    />
  );

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Title>Add Measurement</Dialog.Title>
        <Dialog.ScrollArea style={{ maxHeight: 380 }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <View style={styles.measureGrid}>
                {numericInput('Weight (kg)',    weight, setWeight)}
                {numericInput('Height (cm)',    height, setHeight)}
                {numericInput('Waist (cm)',     waist,  setWaist)}
                {numericInput('Hip (cm)',       hip,    setHip)}
                {numericInput('Chest (cm)',     chest,  setChest)}
                {numericInput('Body fat (%)', bfPct,  setBfPct)}
              </View>
              <TextInput
                label="Notes (optional)"
                value={notes}
                onChangeText={setNotes}
                mode="outlined"
                multiline
                numberOfLines={2}
                style={[styles.measureInput, { marginHorizontal: 16 }]}
              />
            </ScrollView>
          </KeyboardAvoidingView>
        </Dialog.ScrollArea>
        <Dialog.Actions>
          <Button onPress={onDismiss} disabled={saving}>Cancel</Button>
          <Button onPress={handleSave} loading={saving} mode="contained">Save</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

// ─── Tab content components ───────────────────────────────────────────────────

const InfoRow = ({ label, value }: { label: string; value?: string }) => {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export const ClientDetailScreen = ({ route, navigation }: Props) => {
  const { clientId } = route.params;
  const theme = useTheme();

  const { client, measurements, displayStatus, analytics, isLoading, error } =
    useClientDetail(clientId);

  const { updateProfile, error: storeError, clearError } = useClientStore();

  const [activeTab,            setActiveTab]            = useState<TabKey>('Overview');
  const [showMeasureDialog,    setShowMeasureDialog]    = useState(false);
  const [isEditingOverview,    setIsEditingOverview]    = useState(false);

  // Inline edit state for Overview tab
  const [editName,  setEditName]  = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editGoal,  setEditGoal]  = useState('');

  const startEditOverview = () => {
    setEditName(client?.name  ?? '');
    setEditEmail(client?.email ?? '');
    setEditPhone(client?.phone ?? '');
    setEditGoal(client?.goal  ?? '');
    setIsEditingOverview(true);
  };

  const saveOverview = async () => {
    if (!client || !editName.trim()) return;
    await updateProfile(
      client.id,
      { name: editName.trim(), email: editEmail, phone: editPhone, goal: editGoal },
      client.version
    );
    setIsEditingOverview(false);
  };

  // ── Lifestyle edit state ──────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [lifestyleForm, setLifestyleForm] = useState<Partial<ClientProfile>>({});

  // Notes tab state — lifted here to avoid useState inside a render callback
  const [noteText,   setNoteText]   = useState('');
  const [noteSaving, setNoteSaving] = useState(false);

  const initLifestyleForm = () => {
    setLifestyleForm({
      occupation:         client?.occupation         ?? '',
      meal_timing:        client?.meal_timing        ?? '',
      medical_conditions: client?.medical_conditions ?? '',
    });
  };

  const saveLifestyle = async () => {
    if (!client) return;
    setSaving(true);
    try {
      await updateProfile(client.id, lifestyleForm, client.version);
    } finally {
      setSaving(false);
    }
  };

  // ── Loading / Error states ────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!client) {
    return (
      <View style={styles.centered}>
        <Text>Client not found.</Text>
      </View>
    );
  }

  // ── Tab content ───────────────────────────────────────────────────────────

  const renderOverview = () => (
    <ScrollView contentContainerStyle={styles.tabContent}>
      <View style={styles.overviewHeader}>
        <StatusBadge status={displayStatus} />
        {!isEditingOverview && (
          <Button icon="pencil" onPress={startEditOverview} compact mode="text">
            Edit
          </Button>
        )}
      </View>

      {isEditingOverview ? (
        <View style={styles.editSection}>
          <TextInput label="Name *" value={editName} onChangeText={setEditName} mode="outlined" style={styles.input} />
          <TextInput label="Email"  value={editEmail} onChangeText={setEditEmail} mode="outlined" keyboardType="email-address" autoCapitalize="none" style={styles.input} />
          <TextInput label="Phone"  value={editPhone} onChangeText={setEditPhone} mode="outlined" keyboardType="phone-pad" style={styles.input} />
          <TextInput label="Goal"   value={editGoal}  onChangeText={setEditGoal}  mode="outlined" multiline numberOfLines={2} style={styles.input} />
          <View style={styles.editActions}>
            <Button onPress={() => setIsEditingOverview(false)}>Cancel</Button>
            <Button onPress={saveOverview} disabled={!editName.trim()} mode="contained">Save</Button>
          </View>
        </View>
      ) : (
        <>
          <Text variant="headlineSmall" style={styles.clientName}>{client.name}</Text>
          <InfoRow label="Email"  value={client.email} />
          <InfoRow label="Phone"  value={client.phone} />
          <InfoRow label="Goal"   value={client.goal}  />
          <Divider style={styles.divider} />
          <Text variant="titleSmall" style={styles.sectionTitle}>Progress Summary</Text>
          {analytics.latestWeight != null && (
            <InfoRow label="Current weight" value={`${analytics.latestWeight} kg`} />
          )}
          {analytics.weightChange != null && (
            <InfoRow
              label="Weight change"
              value={`${analytics.weightChange > 0 ? '+' : ''}${analytics.weightChange} kg`}
            />
          )}
          {analytics.measurementTrend !== 'insufficient' && (
            <InfoRow label="Trend" value={analytics.measurementTrend} />
          )}
          {analytics.lastMeasurementDate && (
            <InfoRow
              label="Last measurement"
              value={analytics.lastMeasurementDate.toLocaleDateString()}
            />
          )}
          <InfoRow label="Measurements" value={String(analytics.measurementCount)} />
        </>
      )}
    </ScrollView>
  );

  const renderLifestyle = () => (
    <ScrollView contentContainerStyle={styles.tabContent}>
      <Text variant="titleSmall" style={styles.sectionTitle}>Lifestyle & Health</Text>

      <TextInput
        label="Occupation"
        value={lifestyleForm.occupation ?? client.occupation ?? ''}
        onFocus={initLifestyleForm}
        onChangeText={(v) => setLifestyleForm((f) => ({ ...f, occupation: v }))}
        mode="outlined" style={styles.input}
      />
      <TextInput
        label="Meal timing / Diet notes"
        value={lifestyleForm.meal_timing ?? client.meal_timing ?? ''}
        onFocus={initLifestyleForm}
        onChangeText={(v) => setLifestyleForm((f) => ({ ...f, meal_timing: v }))}
        mode="outlined" multiline numberOfLines={2} style={styles.input}
      />
      <TextInput
        label="Medical conditions"
        value={lifestyleForm.medical_conditions ?? client.medical_conditions ?? ''}
        onFocus={initLifestyleForm}
        onChangeText={(v) => setLifestyleForm((f) => ({ ...f, medical_conditions: v }))}
        mode="outlined" multiline numberOfLines={2} style={styles.input}
      />

      <Button
        onPress={saveLifestyle}
        loading={saving}
        mode="contained"
        style={styles.saveBtn}
        disabled={Object.keys(sanitizeUpdate(lifestyleForm)).length === 0 || saving}
      >
        Save Lifestyle Info
      </Button>
    </ScrollView>
  );

  const renderMeasurements = () => (
    <>
      <ScrollView contentContainerStyle={[styles.tabContent, { paddingBottom: 80 }]}>
        {measurements.length === 0 ? (
          <Text style={styles.emptyText}>No measurements yet. Tap + to add one.</Text>
        ) : (
          measurements.map((m, idx) => (
            <View key={m.id} style={styles.measureCard}>
              <Text variant="titleSmall" style={styles.measureDate}>
                {m.date.toLocaleDateString()}
                {idx === 0 ? '  ✦ Latest' : ''}
              </Text>
              <View style={styles.measureRow}>
                {m.weight_kg     != null && <Text style={styles.measureStat}>{m.weight_kg} kg</Text>}
                {m.body_fat_pct  != null && <Text style={styles.measureStat}>{m.body_fat_pct}% BF</Text>}
                {m.waist_cm      != null && <Text style={styles.measureStat}>Waist {m.waist_cm} cm</Text>}
              </View>
              {m.notes && <Text style={styles.measureNote}>{m.notes}</Text>}
            </View>
          ))
        )}
      </ScrollView>

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => setShowMeasureDialog(true)}
      />

      <AddMeasurementDialog
        visible={showMeasureDialog}
        clientId={clientId}
        onDismiss={() => setShowMeasureDialog(false)}
      />
    </>
  );

  const renderSessions = () => (
    <View style={styles.centered}>
      <Text variant="titleMedium" style={styles.placeholderTitle}>Sessions</Text>
      <Text style={styles.placeholderSub}>Session tracking is coming in Phase 2.</Text>
    </View>
  );

  const renderNotes = () => {
    const saveNotes = async () => {
      setNoteSaving(true);
      try {
        if (!client) return;
        await updateProfile(client.id, { notes: noteText }, client.version);
      } finally {
        setNoteSaving(false);
      }
    };

    return (
      <View style={styles.tabContent}>
        <TextInput
          label="Notes"
          value={noteText}
          onChangeText={setNoteText}
          mode="outlined"
          multiline
          numberOfLines={10}
          style={{ flex: 1 }}
        />
        <Button
          onPress={saveNotes}
          loading={noteSaving}
          mode="contained"
          style={styles.saveBtn}
        >
          Save Notes
        </Button>
      </View>
    );
  };

  const tabRenderers: Record<TabKey, () => React.ReactNode> = {
    Overview:     renderOverview,
    Lifestyle:    renderLifestyle,
    Measurements: renderMeasurements,
    Sessions:     renderSessions,
    Notes:        renderNotes,
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={client.name} />
      </Appbar.Header>

      <Banner
        visible={!!(error || storeError)}
        actions={[{ label: 'Dismiss', onPress: clearError }]}
        icon="alert-circle-outline"
      >
        {error ?? storeError ?? ''}
      </Banner>

      <TabBar active={activeTab} onPress={setActiveTab} />
      <Divider />

      <View style={styles.tabBody}>
        {tabRenderers[activeTab]()}
      </View>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:        { flex: 1 },
  centered:         { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabBar:           { flexGrow: 0, backgroundColor: '#fff' },
  tabItem:          { paddingHorizontal: 16, paddingVertical: 12 },
  tabLabel:         { fontSize: 13 },
  tabBody:          { flex: 1 },
  tabContent:       { padding: 16 },
  overviewHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  statusChip:       { alignSelf: 'flex-start' },
  clientName:       { fontWeight: '700', marginBottom: 12 },
  infoRow:          { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  infoLabel:        { color: '#888', fontSize: 13 },
  infoValue:        { color: '#222', fontSize: 13, fontWeight: '500', maxWidth: '60%', textAlign: 'right' },
  divider:          { marginVertical: 16 },
  sectionTitle:     { fontWeight: '700', marginBottom: 12, color: '#444' },
  editSection:      { gap: 4 },
  editActions:      { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
  input:            { marginBottom: 8 },
  saveBtn:          { marginTop: 16 },
  measureCard:      { backgroundColor: '#f8f9fa', borderRadius: 12, padding: 12, marginBottom: 10 },
  measureDate:      { fontWeight: '700', marginBottom: 4 },
  measureRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  measureStat:      { backgroundColor: '#e8f5e9', color: '#2e7d32', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, fontSize: 13, fontWeight: '600' },
  measureNote:      { marginTop: 6, color: '#666', fontSize: 12 },
  measureGrid:      { flexDirection: 'row', flexWrap: 'wrap', padding: 8 },
  measureInput:     { width: '47%', margin: '1.5%' },
  emptyText:        { textAlign: 'center', marginTop: 50, color: '#aaa' },
  placeholderTitle: { fontWeight: '700', marginBottom: 8, color: '#555' },
  placeholderSub:   { color: '#aaa', textAlign: 'center' },
  dialog:           { borderRadius: 16, marginHorizontal: 16 },
  fab:              { position: 'absolute', right: 16, bottom: 16 },
});
