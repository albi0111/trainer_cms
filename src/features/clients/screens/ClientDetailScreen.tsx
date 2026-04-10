import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Modal,
  SafeAreaView,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { StackScreenProps } from '@react-navigation/stack';

import { useAppTheme, useAppStyle } from '../../../theme/ThemeContext';
import { AppTheme } from '../../../theme';
import { Stack } from '../../../shared/components/layout/Stack';
import { ClientStackParamList } from '../../../app/navigation/AppNavigator';
import { useClientDetail } from '../hooks/useClientDetail';
import { useClientStore } from '../../../store/useClientStore';
import { useClientFormStore } from '../../../store/useClientFormStore';
import { ThemeText } from '../../../shared/components/ThemeText';
import { Button } from '../../../shared/components/Button';
import { ClientCreationStepper } from '../components/ClientCreationStepper';
import { LoadingState } from '../../../shared/components/feedback/LoadingState';

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = StackScreenProps<ClientStackParamList, 'ClientDetail'>;

type TabKey = 'Overview' | 'Lifestyle' | 'Measurements' | 'Sessions' | 'Notes';
const TABS: TabKey[] = ['Overview', 'Lifestyle', 'Measurements', 'Sessions', 'Notes'];

// ─── Status Badge ─────────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: 'incomplete' | 'active' | 'inactive' }) => {
  const styles = useAppStyle((t: AppTheme) => {
    const colors = {
      incomplete: t.colors.warning,
      active:     t.colors.success,
      inactive:   t.colors.textTertiary,
    };
    return StyleSheet.create({
      badge: {
        backgroundColor: colors[status] + '22',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        alignSelf: 'flex-start',
      },
      text: {
        color: colors[status],
        fontWeight: '800',
        fontSize: 10,
        textTransform: 'uppercase',
      }
    });
  });

  return (
    <View style={styles.badge}>
      <ThemeText style={styles.text}>{status}</ThemeText>
    </View>
  );
};

// ─── Tab Bar ──────────────────────────────────────────────────────────────────

const TabBar = ({ active, onPress }: { active: TabKey; onPress: (tab: TabKey) => void }) => {
  const styles = useAppStyle((t: AppTheme) => StyleSheet.create({
    container: {
      flexDirection: 'row',
      backgroundColor: t.colors.surface,
      paddingHorizontal: t.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: t.colors.border,
    },
    tab: {
      paddingVertical: t.spacing.md,
      paddingHorizontal: t.spacing.sm,
      marginRight: t.spacing.md,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    activeTab: {
      borderBottomColor: t.colors.primary,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
    }
  }));

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.container}>
      {TABS.map((tab) => {
        const isActive = tab === active;
        return (
          <Pressable
            key={tab}
            onPress={() => onPress(tab)}
            style={[styles.tab, isActive && styles.activeTab]}
          >
            <ThemeText 
              style={styles.label} 
              color={isActive ? 'primary' : 'textSecondary'}
            >
              {tab}
            </ThemeText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export const ClientDetailScreen = ({ route, navigation }: Props) => {
  const { clientId } = route.params;
  const theme = useAppTheme();
  
  const { client, measurements, displayStatus, analytics, isLoading } = useClientDetail(clientId);
  const { updateProfile, setSelectedClient, isSyncing } = useClientStore();
  const { startEdit, resetForm } = useClientFormStore();

  const [activeTab, setActiveTab] = useState<TabKey>('Overview');
  const [showEditModal, setShowEditModal] = useState(false);

  // Sync selectedClient to store for tablet sidebar logic
  useEffect(() => {
    if (client) {
      setSelectedClient(client);
    }
  }, [client, setSelectedClient]);

  const handleEdit = () => {
    if (client) {
      startEdit({
        id: client.id,
        client_uuid: client.client_uuid,
        name: client.name,
        email: client.email,
        phone: client.phone,
        address: client.address,
        goal: client.goal,
        occupation: client.occupation,
        lifestyle: client.lifestyle,
        medical_conditions: client.medical_conditions,
        notes: client.notes,
      });
      setShowEditModal(true);
    }
  };

  const onUpdateComplete = async () => {
    const { formData } = useClientFormStore.getState();
    if (client) {
      await updateProfile(client.id, formData);
    }
    setShowEditModal(false);
    resetForm();
  };

  const styles = useAppStyle((t: AppTheme) => StyleSheet.create({
    container: { flex: 1, backgroundColor: t.colors.background },
    header: {
      paddingHorizontal: t.spacing.lg,
      paddingVertical: t.spacing.md,
      backgroundColor: t.colors.background,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    content: { flex: 1 },
    tabBody: { flex: 1, padding: t.spacing.lg },
    card: {
      backgroundColor: t.colors.surface,
      borderRadius: 16,
      padding: t.spacing.md,
      marginBottom: t.spacing.md,
      borderWidth: 1,
      borderColor: t.colors.border,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: t.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: t.colors.border + '44',
    },
    syncIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      position: 'absolute',
      top: 10,
      right: 16,
    }
  }));

  if (isLoading) return <LoadingState variant="skeleton" />;
  if (!client) return <ThemeText>Client not found</ThemeText>;

  const renderOverview = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Stack gap="lg">
        <View style={styles.card}>
          <ThemeText level="h2" style={{ marginBottom: 4 }}>{client.name}</ThemeText>
          <StatusBadge status={displayStatus} />
          <View style={{ marginTop: 16 }}>
            <View style={styles.infoRow}>
              <ThemeText color="textSecondary">Email</ThemeText>
              <ThemeText>{client.email || '—'}</ThemeText>
            </View>
            <View style={styles.infoRow}>
              <ThemeText color="textSecondary">Phone</ThemeText>
              <ThemeText>{client.phone || '—'}</ThemeText>
            </View>
            <View style={styles.infoRow}>
              <ThemeText color="textSecondary">Goal</ThemeText>
              <ThemeText numberOfLines={1}>{client.goal || '—'}</ThemeText>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <ThemeText level="h3" style={{ marginBottom: 12 }}>Analytics</ThemeText>
          <View style={styles.infoRow}>
            <ThemeText color="textSecondary">Latest Weight</ThemeText>
            <ThemeText>{analytics.latestWeight ? `${analytics.latestWeight} kg` : '—'}</ThemeText>
          </View>
          <View style={styles.infoRow}>
            <ThemeText color="textSecondary">Trend</ThemeText>
            <ThemeText color="primary">{analytics.measurementTrend.toUpperCase()}</ThemeText>
          </View>
        </View>
      </Stack>
    </ScrollView>
  );

  const renderLifestyle = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <ThemeText level="h3" style={{ marginBottom: 12 }}>Lifestyle Details</ThemeText>
        <ThemeText color="textSecondary" level="caption">Occupation</ThemeText>
        <ThemeText style={{ marginBottom: 12 }}>{client.occupation || '—'}</ThemeText>
        
        <ThemeText color="textSecondary" level="caption">Lifestyle</ThemeText>
        <ThemeText style={{ marginBottom: 12 }}>{client.lifestyle || '—'}</ThemeText>
        
        <ThemeText color="textSecondary" level="caption">Medical Conditions</ThemeText>
        <ThemeText>{client.medical_conditions || '—'}</ThemeText>
      </View>
    </ScrollView>
  );

  const renderMeasurements = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      {measurements.length === 0 ? (
        <ThemeText color="textTertiary">No measurements yet.</ThemeText>
      ) : (
        measurements.map(m => (
          <View key={m.id} style={styles.card}>
            <ThemeText level="h3">{new Date(m.date).toLocaleDateString()}</ThemeText>
            <ThemeText color="primary" level="h2">{m.weight_kg} kg</ThemeText>
          </View>
        ))
      )}
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Icon name="chevron-left" size={32} color={theme.colors.textPrimary} />
        </Pressable>
        <ThemeText style={{ fontWeight: '800', fontSize: 18 }}>Profile</ThemeText>
        <Pressable onPress={handleEdit}>
          <Icon name="pencil-outline" size={24} color={theme.colors.primary} />
        </Pressable>
      </View>

      {isSyncing && (
        <View style={styles.syncIndicator}>
          <Icon name="cloud-sync" size={16} color={theme.colors.primary} />
          <ThemeText level="caption" color="primary">SYNCING</ThemeText>
        </View>
      )}

      <TabBar active={activeTab} onPress={setActiveTab} />

      <View style={styles.tabBody}>
        {activeTab === 'Overview' && renderOverview()}
        {activeTab === 'Lifestyle' && renderLifestyle()}
        {activeTab === 'Measurements' && renderMeasurements()}
        {activeTab === 'Sessions' && <ThemeText color="textTertiary">Coming in Phase 2</ThemeText>}
        {activeTab === 'Notes' && (
          <View style={styles.card}>
            <ThemeText>{client.notes || 'No notes'}</ThemeText>
          </View>
        )}
      </View>

      <Modal
        visible={showEditModal}
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <ClientCreationStepper 
          onComplete={onUpdateComplete} 
          onCancel={() => {
            setShowEditModal(false);
            resetForm();
          }} 
        />
      </Modal>
    </SafeAreaView>
  );
};
