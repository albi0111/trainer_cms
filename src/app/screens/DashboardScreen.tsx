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
  ScrollView,
  TextInput,
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

  const filteredClients = clients.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const renderClientItem = ({ item }: { item: Client }) => {
    const clientState = stats.clientDataMap[item.id] || { status: 'active', nextSession: 'loading...' };
    const isActive = clientState.status === 'active';
    const isCompleted = clientState.status === 'completed';
    const initials = item.name.substring(0, 2).toUpperCase();

    return (
      <TouchableOpacity
        style={styles.clientCard}
        onPress={() => navigation.navigate('Client', { clientId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.clientAvatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.clientInfo}>
          <Text style={styles.clientName}>{item.name}</Text>
          <Text style={styles.clientGoal} numberOfLines={1}>{item.goal || 'General Fitness'}</Text>
          <View style={styles.nextSessionRow}>
            <Ionicons name="time-outline" size={12} color={isActive ? "#FFD700" : "#666"} />
            <Text style={styles.nextSessionText}>{clientState.nextSession}</Text>
          </View>
        </View>

        <View style={styles.clientRightActions}>
          <View style={[
            styles.statusBadge, 
            isActive ? styles.statusActive : (isCompleted ? {backgroundColor: '#1E3A8A'} : styles.statusOnHold)
          ]}>
            <Text style={[
              styles.statusText, 
              isActive ? styles.statusTextActive : (isCompleted ? {color: '#60A5FA'} : styles.statusTextOnHold)
            ]}>
              {isActive ? 'Active' : (isCompleted ? 'Completed' : 'On Hold')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#666" />
        </View>
      </TouchableOpacity>
    );
  };

  const currentDateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <SafeAreaView style={styles.root}>
      {/* ── Top Navigation Bar ── */}
      <View style={styles.topNav}>
        <View style={styles.topNavLeft}>
          <View style={styles.logoBox}>
            <Text style={styles.logoBoxText}>FIT</Text>
          </View>
          <Text style={styles.logoText}>FIT.PERSONA</Text>
          <SyncIndicator onTriggerSync={handleSync} />
        </View>
        <View style={styles.topNavRight}>
          <Text style={styles.navDate}>{currentDateStr}</Text>
          <View style={styles.navButtonGroup}>
            <TouchableOpacity style={styles.navBtnLight}>
              <Ionicons name="moon-outline" size={16} color="#FFE600" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.navBtnDark}>
              <Ionicons name="sunny-outline" size={16} color="#666" />
            </TouchableOpacity>
          </View>
          <View style={styles.userBadge}>
            <Text style={styles.userBadgeText}>Y</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.flex1} contentContainerStyle={styles.scrollContent}>
        {/* ── Page Header ── */}
        <View style={styles.pageHeader}>
          <Text style={styles.greeting}>{getGreeting()}, Ajith 👋</Text>
          <Text style={styles.dateText}>{currentDateStr}</Text>
        </View>

        <View style={[styles.mainLayout, isWide && styles.mainLayoutWide]}>
          {/* ── Left Column ── */}
          <View style={[styles.leftColumn, isWide && { flex: 0.35 }]}>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <View style={styles.statHeader}>
                  <Ionicons name="calendar-outline" size={14} color="#A3A3A3" />
                  <Text style={styles.statTitle}>TODAY</Text>
                </View>
                <Text style={styles.statValue}>{stats.todaySessions.length}</Text>
                <Text style={styles.statSub}>sessions</Text>
              </View>
              <View style={styles.statCard}>
                <View style={styles.statHeader}>
                  <Ionicons name="people-outline" size={14} color="#A3A3A3" />
                  <Text style={styles.statTitle}>ACTIVE</Text>
                </View>
                <Text style={styles.statValue}>{stats.activeClientCount}</Text>
                <Text style={styles.statSub}>clients</Text>
              </View>
            </View>

            <View style={styles.scheduleContainer}>
              <View style={styles.scheduleHeaderRow}>
                <Ionicons name="flash" size={14} color="#FFD700" />
                <Text style={styles.sectionTitle}>TODAY'S SCHEDULE</Text>
              </View>
              {stats.todaySessions.length === 0 ? (
                <View style={styles.emptySchedule}>
                  <Text style={styles.emptyScheduleText}>No sessions today</Text>
                </View>
              ) : (
                stats.todaySessions.map((s, idx) => (
                  <View key={s.id} style={styles.scheduleItem}>
                    <View style={styles.scheduleAvatar}>
                      <Text style={styles.scheduleAvatarText}>{s.client_name.substring(0, 2).toUpperCase()}</Text>
                    </View>
                    <View style={styles.scheduleInfo}>
                      <Text style={styles.scheduleClientName}>{s.client_name}</Text>
                      <Text style={styles.scheduleTime}>09:00 · {s.focus} · 60min</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>

          {/* ── Right Column ── */}
          <View style={[styles.rightColumn, isWide && { flex: 0.65 }]}>
            <View style={styles.searchRow}>
              <View style={styles.searchBar}>
                <Ionicons name="search" size={18} color="#666" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search clients..."
                  placeholderTextColor="#666"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
              <TouchableOpacity style={styles.addClientBtn} onPress={() => setIsModalVisible(true)}>
                <Ionicons name="add" size={18} color="#000" />
                <Text style={styles.addClientBtnText}>Add Client</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.clientCountText}>{filteredClients.length} clients</Text>

            {loading ? (
              <ActivityIndicator color="#FFD700" style={{ marginTop: 20 }} />
            ) : (
              <View style={styles.rosterContainer}>
                {filteredClients.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptySub}>No clients found.</Text>
                  </View>
                ) : (
                  filteredClients.map(c => (
                    <View key={c.id}>
                      {renderClientItem({ item: c })}
                    </View>
                  ))
                )}
              </View>
            )}
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

  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#161616',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  topNavLeft: { flexDirection: 'row', alignItems: 'center' },
  logoBox: { backgroundColor: '#FFD700', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 4, marginRight: 8 },
  logoBoxText: { color: '#000', fontSize: 10, fontWeight: '900', letterSpacing: -0.5 },
  logoText: { color: '#FFD700', fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },

  topNavRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  navDate: { color: '#888', fontSize: 14 },
  navButtonGroup: { flexDirection: 'row', backgroundColor: '#222', borderRadius: 20, padding: 2 },
  navBtnLight: { padding: 6, paddingHorizontal: 10, backgroundColor: '#FFE60020', borderRadius: 16 },
  navBtnDark: { padding: 6, paddingHorizontal: 10, borderRadius: 16 },
  userBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' },
  userBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  scrollContent: { padding: 24, paddingBottom: 60 },
  pageHeader: { marginBottom: 32 },
  greeting: { fontSize: 32, fontWeight: '800', color: '#FFF' },
  dateText: { fontSize: 16, color: '#888', marginTop: 8 },

  mainLayout: { flexDirection: 'column', gap: 24 },
  mainLayoutWide: { flexDirection: 'row', alignItems: 'flex-start' },

  leftColumn: { gap: 24, width: '100%' },
  rightColumn: { flex: 1, width: '100%' },

  statsRow: { flexDirection: 'row', gap: 16 },
  statCard: { flex: 1, backgroundColor: '#1A1A1A', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#262626' },
  statHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  statTitle: { fontSize: 11, fontWeight: '700', color: '#A3A3A3', letterSpacing: 1 },
  statValue: { fontSize: 36, fontWeight: '800', color: '#FFF', lineHeight: 40 },
  statSub: { fontSize: 13, color: '#666', marginTop: 4 },

  scheduleContainer: { backgroundColor: '#1A1A1A', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#262626' },
  scheduleHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: '#FFF', letterSpacing: 1 },
  emptySchedule: { padding: 20, alignItems: 'center' },
  emptyScheduleText: { color: '#666', fontSize: 14 },

  scheduleItem: { backgroundColor: '#262626', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 12 },
  scheduleAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFD700', justifyContent: 'center', alignItems: 'center' },
  scheduleAvatarText: { color: '#000', fontWeight: '800', fontSize: 14 },
  scheduleInfo: { flex: 1 },
  scheduleClientName: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  scheduleTime: { color: '#A3A3A3', fontSize: 13, marginTop: 4 },

  searchRow: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  searchBar: { flex: 1, backgroundColor: '#1A1A1A', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#2A2A2A' },
  searchInput: { flex: 1, color: '#FFF', fontSize: 15, marginLeft: 10 },
  addClientBtn: { backgroundColor: '#FFD700', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, borderRadius: 12, gap: 8 },
  addClientBtnText: { color: '#000', fontWeight: '700', fontSize: 15 },

  clientCountText: { color: '#888', fontSize: 14, marginBottom: 16, fontWeight: '500' },

  rosterContainer: { gap: 12 },
  clientCard: { backgroundColor: '#1A1A1A', borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16, borderWidth: 1, borderColor: '#2A2A2A' },
  clientAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#262626', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#FFD700' },
  avatarText: { color: '#FFD700', fontWeight: '700', fontSize: 16 },
  clientInfo: { flex: 1 },
  clientName: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  clientGoal: { fontSize: 14, color: '#A3A3A3', marginTop: 4 },
  nextSessionRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  nextSessionText: { color: '#A3A3A3', fontSize: 12 },

  clientRightActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusActive: { backgroundColor: '#064E3B' },
  statusOnHold: { backgroundColor: '#78350F' },
  statusText: { fontSize: 12, fontWeight: '700' },
  statusTextActive: { color: '#34D399' },
  statusTextOnHold: { color: '#FBBF24' },

  emptyState: { padding: 40, alignItems: 'center' },
  emptySub: { color: '#666', fontSize: 15 },
});
