import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Session } from '../../types';
import CardContainer from '../shared/CardContainer';
import EmptyState from '../shared/EmptyState';

interface SessionsSectionProps {
  upcoming: any[];
  pendingData: any[];
  onManageSession: (session: Session) => void;
}

export default React.memo(function SessionsSection({
  upcoming,
  pendingData,
  onManageSession,
}: SessionsSectionProps) {
  const displayedUpcoming = upcoming.slice(0, 3);

  return (
    <CardContainer
      headerIcon="calendar-outline"
      headerIconColor="#6699FF"
      headerTitle="Sessions"
    >
      {/* Pending Data */}
      {pendingData.length > 0 && (
        <>
          <Text style={styles.subHeading}>NEEDS LOGGING</Text>
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
                    </Text>
                  </View>
                </View>
                <Text style={[styles.listItemSub, { color: '#FFD700' }]}>
                  {s.start_time || '00:00'} - {s.duration_minutes || 60}min - {s.focus || 'No focus'}
                </Text>
              </View>
              <Ionicons name="ellipsis-vertical" size={20} color="#FFD700" />
            </TouchableOpacity>
          ))}
        </>
      )}

      {/* Upcoming */}
      <View style={[styles.sectionHeader, pendingData.length > 0 && { marginTop: 16 }]}>
        <Text style={styles.subHeading}>UPCOMING</Text>
      </View>
      
      {upcoming.length === 0 ? (
        <EmptyState message="No upcoming sessions." />
      ) : (
        <>
          {displayedUpcoming.map((s: any) => (
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
                      {(s.plan_title || s.focus || s.type).toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={styles.listItemSub}>
                  {s.start_time || '00:00'} - {s.duration_minutes || 60}min - {s.focus || 'No focus'}
                </Text>
              </View>
              <Ionicons name="ellipsis-vertical" size={20} color="#AAA" />
            </TouchableOpacity>
          ))}
        </>
      )}
    </CardContainer>
  );
});

const styles = StyleSheet.create({
  subHeading: {
    color: '#666',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  showMoreInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 4,
    backgroundColor: '#161616',
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  showMoreText: {
    color: '#6699FF',
    fontSize: 11,
    fontWeight: '700',
  }
});
