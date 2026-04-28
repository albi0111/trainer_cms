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
  AppState,
  AppStateStatus,
  Alert,
  ScrollView,
  SafeAreaView,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../RootNavigator';
import { Ionicons } from '@expo/vector-icons';

import { getAllClients } from '../../services/client/clientService';
import { runSync } from '../../services/sync/syncWorker';
import { getDashboardStats } from '../../services/analytics/analyticsService';
import { Client } from '../../types';

import AddClientModal from '../../components/modals/AddClientModal';
import SyncIndicator from '../../components/SyncIndicator';
import TopNavBar from '../../components/shared/TopNavBar';
import StatsCards from '../../components/dashboard/StatsCards';
import TodaySchedule from '../../components/dashboard/TodaySchedule';
import ClientRoster from '../../components/dashboard/ClientRoster';

type NavigationProp = StackNavigationProp<RootStackParamList, 'Dashboard'>;

export default function DashboardScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { width } = useWindowDimensions();
  const isWide = width >= 768; // Tablet & Desktop breakpoint

  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<{ todaySessions: any[], activeClientCount: number, clientDataMap: any }>({
    todaySessions: [],
    activeClientCount: 0,
    clientDataMap: {}
  });
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [clientList, dashboardStats] = await Promise.all([
        getAllClients(),
        getDashboardStats(),
      ]);
      setClients(clientList);
      setStats(dashboardStats);
    } catch (error) {
      console.error('[Dashboard] Fetch data failed:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const handleSync = useCallback(async () => {
    try {
      const result = await runSync() as any;
      if (result?.remoteUpdated) {
        Alert.alert('Cloud Update', 'Data from another device has been synced.');
      }
      fetchData();
    } catch (err) {
      console.error('[Dashboard] Sync error:', err);
    }
  }, [fetchData]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
      handleSync();
    }, [fetchData, handleSync])
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') handleSync();
    });

    return () => subscription.remove();
  }, [handleSync]);

  const currentDateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <SafeAreaView style={styles.root}>
      {/* ── Top Navigation Bar ── */}
      <TopNavBar
        rightContent={
          <View style={styles.topNavRight}>
            <Text style={styles.navDate}>{currentDateStr}</Text>
            <SyncIndicator onTriggerSync={handleSync} />
          </View>
        }
      />

      <ScrollView style={styles.flex1} contentContainerStyle={styles.scrollContent}>
        {/* ── Page Header ── */}
        <View style={styles.pageHeader}>
          <Text style={styles.greeting}>{getGreeting()}, Ajith 👋</Text>
          <Text style={styles.dateText}>{currentDateStr}</Text>
        </View>

        <View style={[styles.mainLayout, isWide && styles.mainLayoutWide]}>
          {/* ── Left Column ── */}
          <View style={[styles.leftColumn, isWide && { flex: 0.35 }]}>
            <StatsCards
              todaySessionCount={stats.todaySessions.length}
              activeClientCount={stats.activeClientCount}
            />
            <TodaySchedule sessions={stats.todaySessions} />
          </View>

          {/* ── Right Column ── */}
          <View style={[styles.rightColumn, isWide && { flex: 0.65 }]}>
            <ClientRoster
              clients={clients}
              clientDataMap={stats.clientDataMap}
              searchQuery={searchQuery}
              loading={loading}
              onSearchChange={setSearchQuery}
              onClientPress={(id) => navigation.navigate('Client', { clientId: id })}
              onAddClient={() => setIsModalVisible(true)}
            />
          </View>
        </View>
      </ScrollView>

      <AddClientModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onSuccess={() => { setIsModalVisible(false); fetchData(); handleSync(); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F0F0F' },
  flex1: { flex: 1 },

  topNavRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  navDate: { color: '#888', fontSize: 14 },

  scrollContent: { padding: 24, paddingBottom: 60 },
  pageHeader: { marginBottom: 32 },
  greeting: { fontSize: 32, fontWeight: '800', color: '#FFF' },
  dateText: { fontSize: 16, color: '#888', marginTop: 8 },

  mainLayout: { flexDirection: 'column', gap: 24 },
  mainLayoutWide: { flexDirection: 'row', alignItems: 'flex-start' },

  leftColumn: { gap: 24, width: '100%' },
  rightColumn: { flex: 1, width: '100%' },
});
