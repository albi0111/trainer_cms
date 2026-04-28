import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StatsCardsProps {
  todaySessionCount: number;
  activeClientCount: number;
}

export default function StatsCards({ todaySessionCount, activeClientCount }: StatsCardsProps) {
  return (
    <View style={styles.statsRow}>
      <View style={styles.statCard}>
        <View style={styles.statHeader}>
          <Ionicons name="calendar-outline" size={14} color="#A3A3A3" />
          <Text style={styles.statTitle}>TODAY</Text>
        </View>
        <Text style={styles.statValue}>{todaySessionCount}</Text>
        <Text style={styles.statSub}>sessions</Text>
      </View>
      <View style={styles.statCard}>
        <View style={styles.statHeader}>
          <Ionicons name="people-outline" size={14} color="#A3A3A3" />
          <Text style={styles.statTitle}>ACTIVE</Text>
        </View>
        <Text style={styles.statValue}>{activeClientCount}</Text>
        <Text style={styles.statSub}>clients</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statsRow: { flexDirection: 'row', gap: 16 },
  statCard: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#262626',
  },
  statHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  statTitle: { fontSize: 11, fontWeight: '700', color: '#A3A3A3', letterSpacing: 1 },
  statValue: { fontSize: 36, fontWeight: '800', color: '#FFF', lineHeight: 40 },
  statSub: { fontSize: 13, color: '#666', marginTop: 4 },
});
