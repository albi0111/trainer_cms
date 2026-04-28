import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AvatarCircle from '../shared/AvatarCircle';

interface TodayScheduleProps {
  sessions: any[];
}

export default function TodaySchedule({ sessions }: TodayScheduleProps) {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Ionicons name="flash" size={14} color="#FFD700" />
        <Text style={styles.sectionTitle}>TODAY'S SCHEDULE</Text>
      </View>
      {sessions.length === 0 ? (
        <View style={styles.emptySchedule}>
          <Text style={styles.emptyText}>No sessions today</Text>
        </View>
      ) : (
        sessions.map((s) => (
          <View key={s.id} style={styles.scheduleItem}>
            <AvatarCircle name={s.client_name} size={40} />
            <View style={styles.scheduleInfo}>
              <Text style={styles.clientName}>{s.client_name}</Text>
              <Text style={styles.time}>
                {s.start_time || '--:--'} · {s.focus} · {s.duration_minutes || 60}min
              </Text>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1A1A1A',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#262626',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: '#FFF', letterSpacing: 1 },
  emptySchedule: { padding: 20, alignItems: 'center' },
  emptyText: { color: '#666', fontSize: 14 },
  scheduleItem: {
    backgroundColor: '#262626',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  scheduleInfo: { flex: 1 },
  clientName: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  time: { color: '#A3A3A3', fontSize: 13, marginTop: 4 },
});
