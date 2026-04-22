import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Client } from '../../types';
import AvatarCircle from '../shared/AvatarCircle';

interface ClientRosterProps {
  clients: Client[];
  clientDataMap: any;
  searchQuery: string;
  loading: boolean;
  onSearchChange: (query: string) => void;
  onClientPress: (clientId: string) => void;
  onAddClient: () => void;
}

export default function ClientRoster({
  clients,
  clientDataMap,
  searchQuery,
  loading,
  onSearchChange,
  onClientPress,
  onAddClient,
}: ClientRosterProps) {
  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderClientItem = (item: Client) => {
    const state = clientDataMap[item.id] || { status: 'active', nextSession: 'loading...' };
    const isActive = state.status === 'active';
    const isCompleted = state.status === 'completed';

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.clientCard}
        onPress={() => onClientPress(item.id)}
        activeOpacity={0.7}
      >
        <AvatarCircle name={item.name} size={48} bgColor="#262626" textColor="#FFD700" borderColor="#FFD700" />
        <View style={styles.clientInfo}>
          <Text style={styles.clientName}>{item.name}</Text>
          <Text style={styles.clientGoal} numberOfLines={1}>{item.goal || 'General Fitness'}</Text>
          <View style={styles.nextSessionRow}>
            <Ionicons name="time-outline" size={12} color={isActive ? '#FFD700' : '#666'} />
            <Text style={styles.nextSessionText}>{state.nextSession}</Text>
          </View>
        </View>
        <View style={styles.rightActions}>
          <View style={[
            styles.statusBadge,
            isActive ? styles.statusActive : (isCompleted ? { backgroundColor: '#1E3A8A' } : styles.statusOnHold),
          ]}>
            <Text style={[
              styles.statusText,
              isActive ? styles.statusTextActive : (isCompleted ? { color: '#60A5FA' } : styles.statusTextOnHold),
            ]}>
              {isActive ? 'Active' : (isCompleted ? 'Completed' : 'On Hold')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#666" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View>
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search clients..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={onSearchChange}
          />
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={onAddClient}>
          <Ionicons name="add" size={18} color="#000" />
          <Text style={styles.addBtnText}>Add Client</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.countText}>{filtered.length} clients</Text>

      {loading ? (
        <ActivityIndicator color="#FFD700" style={{ marginTop: 20 }} />
      ) : (
        <View style={styles.roster}>
          {filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptySub}>No clients found.</Text>
            </View>
          ) : (
            filtered.map(c => renderClientItem(c))
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  searchRow: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  searchBar: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  searchInput: { flex: 1, color: '#FFF', fontSize: 15, marginLeft: 10 },
  addBtn: {
    backgroundColor: '#FFD700',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  addBtnText: { color: '#000', fontWeight: '700', fontSize: 15 },
  countText: { color: '#888', fontSize: 14, marginBottom: 16, fontWeight: '500' },
  roster: { gap: 12 },
  clientCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  clientInfo: { flex: 1 },
  clientName: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  clientGoal: { fontSize: 14, color: '#A3A3A3', marginTop: 4 },
  nextSessionRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  nextSessionText: { color: '#A3A3A3', fontSize: 12 },
  rightActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusActive: { backgroundColor: '#064E3B' },
  statusOnHold: { backgroundColor: '#78350F' },
  statusText: { fontSize: 12, fontWeight: '700' },
  statusTextActive: { color: '#34D399' },
  statusTextOnHold: { color: '#FBBF24' },
  emptyState: { padding: 40, alignItems: 'center' },
  emptySub: { color: '#666', fontSize: 15 },
});
