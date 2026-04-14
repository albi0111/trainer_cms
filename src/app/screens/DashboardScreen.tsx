// ─────────────────────────────────────────────────────────────────────────────
// Dashboard Screen — Client Management & Global Sync
// Source of truth: Polish Phase
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  AppState,
  AppStateStatus,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../RootNavigator';
import { FlashList } from '@shopify/flash-list';
const FlashListAny = FlashList as any;
import { Ionicons } from '@expo/vector-icons';

import { getAllClients } from '../../services/client/clientService';
import { runSync } from '../../services/sync/syncWorker';
import { Client } from '../../types';

import AddClientModal from '../../components/modals/AddClientModal';
import SyncIndicator from '../../components/SyncIndicator';

type NavigationProp = StackNavigationProp<RootStackParamList, 'Dashboard'>;

export default function DashboardScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const data = await getAllClients();
      setClients(data);
    } catch (error) {
      console.error('[Dashboard] Fetch clients failed:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSync = useCallback(async () => {
    try {
      const result = await runSync();
      if (result?.remoteUpdated) {
        // Notification for Risk 4 §Multi-device reality
        Alert.alert('Cloud Update', 'Data from another device has been synced. Refreshing roster...');
      }
      fetchData();
    } catch (err) {
      console.error('[Dashboard] Sync error:', err);
    }
  }, [fetchData]);

  useEffect(() => {
    fetchData();
    handleSync();

    // Auto-sync on app resume §1
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        handleSync();
      }
    });

    return () => subscription.remove();
  }, [fetchData, handleSync]);

  const renderClientItem = ({ item }: { item: Client }) => (
    <TouchableOpacity
      style={styles.clientCard}
      onPress={() => navigation.navigate('Client', { clientId: item.id })}
      activeOpacity={0.7}
    >
      <View style={styles.clientInfo}>
        <Text style={styles.clientName}>{item.name}</Text>
        <Text style={styles.clientGoal}>{item.goal || 'General Fitness'}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#333" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.root}>
      <SyncIndicator onTriggerSync={handleSync} />

      <View style={styles.header}>
        <Text style={styles.title}>Clients</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setIsModalVisible(true)}>
          <Ionicons name="person-add" size={20} color="#000" />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.listContainer}>
        {loading ? (
          <View style={styles.center}><ActivityIndicator color="#FFD700" size="large" /></View>
        ) : (
          <FlashListAny
            data={clients}
            renderItem={renderClientItem}
            estimatedItemSize={80}
            keyExtractor={(item: any) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="people-outline" size={48} color="#FFD700" />
                </View>
                <Text style={styles.emptyTitle}>Your Roster is Empty</Text>
                <Text style={styles.emptySub}>Start by adding your first athlete using the "Add" button above.</Text>
                <View style={styles.emptyPointer}>
                  <Ionicons name="arrow-up" size={20} color="#333" />
                </View>
              </View>
            }
          />
        )}
      </View>

      <AddClientModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onSuccess={() => {
          setIsModalVisible(false);
          fetchData();
          handleSync();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A0A' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 16,
  },
  title: { fontSize: 34, fontWeight: '800', color: '#FFF' },
  addButton: {
    flexDirection: 'row',
    backgroundColor: '#FFD700',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  addButtonText: { color: '#000', fontWeight: '700', fontSize: 16 },
  listContainer: { flex: 1 },
  listContent: { paddingHorizontal: 24, paddingBottom: 40 },
  clientCard: {
    backgroundColor: '#161616',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  clientInfo: { flex: 1 },
  clientName: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  clientGoal: { fontSize: 14, color: '#666', marginTop: 4 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  emptyTitle: { color: '#888', fontSize: 20, fontWeight: '700', marginTop: 16 },
  emptySub: { color: '#444', fontSize: 14, marginTop: 8, textAlign: 'center', paddingHorizontal: 40 },
  emptyIconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#222' },
  emptyPointer: { marginTop: 24, opacity: 0.3 },
});
