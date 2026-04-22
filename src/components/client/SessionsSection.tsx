import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Session } from '../../types';
import CardContainer from '../shared/CardContainer';
import EmptyState from '../shared/EmptyState';

interface SessionsSectionProps {
  upcoming: any[];
  pendingData: any[];
  completedSessions: Session[];
  onManageSession: (session: Session) => void;
}

export default function SessionsSection({
  upcoming,
  pendingData,
  completedSessions,
  onManageSession,
}: SessionsSectionProps) {
  return (
    <CardContainer
      headerIcon="calendar-outline"
      headerIconColor="#6699FF"
      headerTitle="Sessions"
    >
      {/* Upcoming */}
      <Text style={styles.subHeading}>UPCOMING</Text>
      {upcoming.length === 0 ? (
        <EmptyState message="No upcoming sessions." />
      ) : (
        upcoming.map((s: any) => (
          <TouchableOpacity
            key={s.id}
            style={styles.listItem}
            onPress={() => onManageSession(s)}
          >
            <View style={styles.flex1}>
              <View style={styles.row}>
                <Text style={styles.listItemTitle}>{s.date}</Text>
                <View style={[styles.badge, { backgroundColor: '#1A2A50' }]}>
                  <Text style={[styles.badgeText, { color: '#6699FF' }]}>
                    {(s.plan_title || s.type).toUpperCase()}
                    {s.plan_goal ? ` - ${s.plan_goal.toLowerCase()}` : ''}
                  </Text>
                </View>
              </View>
              <Text style={styles.listItemSub}>
                {s.start_time || '00:00'} - {s.duration_minutes || 60}min - {s.focus}
              </Text>
            </View>
            <Ionicons name="ellipsis-vertical" size={20} color="#AAA" />
          </TouchableOpacity>
        ))
      )}

      {/* Pending Data */}
      {pendingData.length > 0 && (
        <>
          <Text style={[styles.subHeading, { marginTop: 16 }]}>PENDING DATA</Text>
          {pendingData.map((s: any) => (
            <TouchableOpacity
              key={s.id}
              style={[styles.listItem, { borderColor: '#FFD700', borderWidth: 1 }]}
              onPress={() => onManageSession(s)}
            >
              <View style={styles.flex1}>
                <View style={styles.row}>
                  <Text style={styles.listItemTitle}>{s.date}</Text>
                  <View style={[styles.badge, { backgroundColor: '#FFD700' }]}>
                    <Text style={[styles.badgeText, { color: '#000' }]}>
                      {(s.plan_title || 'PENDING').toUpperCase()}
                      {s.plan_goal ? ` - ${s.plan_goal.toLowerCase()}` : ''}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.listItemSub, { color: '#FFD700' }]}>
                  {s.start_time || '00:00'} - {s.duration_minutes || 60}min - {s.focus}
                </Text>
              </View>
              <Ionicons name="ellipsis-vertical" size={20} color="#FFD700" />
            </TouchableOpacity>
          ))}
        </>
      )}

      {/* Completed */}
      <Text style={[styles.subHeading, { marginTop: 16 }]}>COMPLETED</Text>
      {completedSessions.length === 0 ? (
        <EmptyState message="No completed sessions." />
      ) : (
        completedSessions.map((s) => (
          <View key={s.id} style={styles.listItem}>
            <Ionicons name="checkmark" size={16} color="#3DCC88" />
            <View style={styles.flex1}>
              <Text style={[styles.listItemTitle, { color: '#AAA', marginLeft: 8 }]}>
                {s.date} - 09:00 - {s.type} - 60min
              </Text>
            </View>
            <TouchableOpacity onPress={() => Alert.alert('Delete Session', 'Feature coming soon')}>
              <Ionicons name="close" size={18} color="#FF5252" />
            </TouchableOpacity>
          </View>
        ))
      )}
    </CardContainer>
  );
}

const styles = StyleSheet.create({
  subHeading: {
    color: '#666',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161616',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  listItemTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  listItemSub: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 12,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flex1: {
    flex: 1,
  },
});
