// ─────────────────────────────────────────────────────────────────────────────
// Dashboard Screen
// - List Clients using FlashList
// - Display name and derived status
// - Open Add Client Modal
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../../store/useAppStore';
import { login } from '../../services/auth/googleAuth';
import { getAllClients } from '../../services/client/clientService';
import { Client } from '../../types';
import { RootStackNavigationProp } from '../RootNavigator';
import { deriveClientStatus } from '../../utils/clientStatus';
import AddClientModal from '../../components/modals/AddClientModal';

export default function DashboardScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const [clients, setClients] = useState<Client[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const isConnectedToDrive = useAppStore((s) => s.isConnectedToDrive);
  const setIsConnectedToDrive = useAppStore((s) => s.setIsConnectedToDrive);

  const fetchClients = useCallback(async () => {
    try {
      const data = await getAllClients();
      setClients(data);
    } catch (error) {
      console.error('[Dashboard] Failed to fetch clients:', error);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleConnectDrive = useCallback(async () => {
    try {
      await login();
      setIsConnectedToDrive(true);
    } catch (error) {
      Alert.alert('Connection Failed', 'Could not connect to Google Drive.');
    }
  }, [setIsConnectedToDrive]);

  const renderClientItem = ({ item }: { item: Client }) => (
    <TouchableOpacity
      style={styles.clientCard}
      onPress={() => navigation.navigate('Client', { clientId: item.id })}
      activeOpacity={0.7}
    >
      <View style={styles.clientInfo}>
        <Text style={styles.clientName}>{item.name}</Text>
        <Text style={styles.clientMeta}>{item.goal || 'No goal set'}</Text>
      </View>
      <View style={[styles.statusBadge, (styles as any)[`status_${deriveClientStatus(item.created_at)}`]]}>
        <Text style={styles.statusText}>{deriveClientStatus(item.created_at).toUpperCase()}</Text>
      </View>
    </TouchableOpacity>
  );

  const FList = FlashList as any;

  return (
    <SafeAreaView style={styles.root}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.brandTitle}>fit.persona</Text>

        {!isConnectedToDrive ? (
          <TouchableOpacity style={styles.driveButton} onPress={handleConnectDrive}>
            <Text style={styles.driveButtonText}>Connect Drive</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.driveConnected}>
            <Text style={styles.driveConnectedText}>● Drive</Text>
          </View>
        )}
      </View>

      {/* ── Client List ── */}
      <View style={styles.listContainer}>
        <FList
          data={clients}
          renderItem={renderClientItem}
          estimatedItemSize={80}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyHint}>No clients found</Text>
            </View>
          }
          contentContainerStyle={styles.listPadding}
        />
      </View>

      {/* ── FAB ── */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setIsModalVisible(true)}
        activeOpacity={0.85}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      <AddClientModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onSuccess={(id) => {
          setIsModalVisible(false);
          fetchClients();
          navigation.navigate('Client', { clientId: id });
        }}
      />
    </SafeAreaView>
  );
}

const YELLOW = '#FFD700';
const BG = '#0A0A0A';
const SURFACE = '#161616';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: SURFACE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandTitle: { fontSize: 24, fontWeight: '800', color: YELLOW },
  driveButton: { backgroundColor: YELLOW, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  driveButtonText: { color: '#000', fontSize: 12, fontWeight: '700' },
  driveConnected: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#1B3A1C' },
  driveConnectedText: { color: '#66BB6A', fontSize: 11, fontWeight: '700' },
  listContainer: { flex: 1 },
  listPadding: { padding: 16 },
  clientCard: {
    backgroundColor: SURFACE,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  clientInfo: { flex: 1 },
  clientName: { color: '#FFF', fontSize: 18, fontWeight: '700', marginBottom: 2 },
  clientMeta: { color: '#888', fontSize: 13 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  status_active: { backgroundColor: '#1B3A1C' },
  status_inactive: { backgroundColor: '#333' },
  status_completed: { backgroundColor: '#1B2C3A' },
  statusText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  emptyHint: { color: '#555', fontSize: 15 },
  fab: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 36 : 28,
    right: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: YELLOW,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: YELLOW,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
  },
  fabIcon: { fontSize: 32, color: '#000', lineHeight: 36 },
});
