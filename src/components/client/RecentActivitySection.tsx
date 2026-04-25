import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, Platform, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CardContainer from '../shared/CardContainer';
import { commonStyles } from '../../theme/theme';

interface RecentActivitySectionProps {
  activities: any[];
  onRevertSession: (sessionId: string) => void;
}

const ActivityNote = ({ note }: { note: string }) => {
  const [expanded, setExpanded] = useState(false);
  const lines = note.split('\n').length;
  const isLong = note.length > 100 || lines > 3;

  return (
    <View style={styles.highlightNoteBox}>
      <View style={styles.noteIndicator} />
      <View style={styles.noteContent}>
        <Text 
          style={styles.notesText} 
          numberOfLines={expanded ? undefined : 3}
        >
          {note}
        </Text>
        {isLong && (
          <TouchableOpacity 
            onPress={() => setExpanded(!expanded)}
            style={styles.expandBtn}
          >
            <Text style={styles.expandText}>{expanded ? 'Show Less' : 'See More'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default React.memo(function RecentActivitySection({ activities, onRevertSession }: RecentActivitySectionProps) {
  const [showAll, setShowAll] = useState(false);

  // ⚠️ All hooks MUST be before any conditional returns (React Rules of Hooks)
  const handleRevert = useCallback((sessionId: string) => {
    onRevertSession(sessionId);
  }, [onRevertSession]);

  if (!activities || activities.length === 0) return null;

  const displayedActivities = showAll ? activities : activities.slice(0, 2);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'completed':
        return { color: '#3DCC88', icon: 'checkmark-circle', label: 'Completed' };
      case 'missed':
        return { color: '#FF5252', icon: 'close-circle', label: 'Missed' };
      case 'postponed':
        return { color: '#FFD700', icon: 'time', label: 'Postponed' };
      default:
        return { color: '#888', icon: 'help-circle', label: status };
    }
  };

  const getHighlightNote = (activity: any) => {
    if (activity.status === 'completed') {
      return activity.performance_notes || activity.notes;
    }
    if (activity.status === 'missed') {
      const reason = activity.missed_reason;
      const note = activity.missed_note;
      if (reason && reason !== 'other' && note) return `${reason.toUpperCase()} + ${note}`;
      if (reason && reason !== 'other') return reason.toUpperCase();
      return note;
    }
    if (activity.status === 'postponed') {
      return activity.postponed_note;
    }
    return null;
  };

  const formatTimeDuration = (activity: any) => {
    const time = activity.start_time || '--:--';
    const duration = activity.duration_minutes || 60;
    return `${time} · ${duration}min`;
  };

  return (
    <CardContainer
      headerIcon="analytics"
      headerIconColor="#FFD700"
      headerTitle="Recent Activity"
    >
      <View style={styles.container}>
        {displayedActivities.map((activity, index) => {
          const config = getStatusConfig(activity.status);
          const note = getHighlightNote(activity);
          
          return (
            <View key={activity.id} style={[styles.activityItem, index === displayedActivities.length - 1 && styles.noBorder]}>
              <View style={styles.statusRow}>
                <Ionicons name={config.icon as any} size={14} color={config.color} />
                <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
                <Text style={styles.dateText}>• {activity.date}</Text>
              </View>

              <View style={styles.headerRow}>
                <View style={styles.titleGroup}>
                  <Text style={styles.focusText} numberOfLines={1}>{activity.focus || 'General Session'}</Text>
                  <Text style={styles.timeText}>{formatTimeDuration(activity)}</Text>
                </View>
                
                <View style={styles.actionsRow}>
                  {activity.status === 'completed' && (
                    <View style={styles.quickStats}>
                      <View style={styles.statItem}>
                        <Ionicons name="flash" size={10} color="#FFD700" />
                        <Text style={styles.statValue}>{activity.energy_level || '—'}/10</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Ionicons name="barbell" size={10} color="#FFD700" />
                        <Text style={styles.statValue}>{activity.perceived_difficulty || '—'}/10</Text>
                      </View>
                    </View>
                  )}

                  {(activity.status === 'completed' || activity.status === 'missed') && (
                    <TouchableOpacity 
                      style={styles.revertBtn} 
                      onPress={() => handleRevert(activity.id)}
                    >
                      <Ionicons name="refresh-outline" size={16} color="#FFD700" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {note && <ActivityNote note={note} />}
            </View>
          );
        })}

        {activities.length > 2 && (
          <TouchableOpacity style={styles.showMoreBtn} onPress={() => setShowAll(!showAll)}>
            <Text style={styles.showMoreText}>{showAll ? 'Show Less' : `Show All Activity (${activities.length})`}</Text>
            <Ionicons name={showAll ? 'chevron-up' : 'chevron-down'} size={16} color="#FFD700" />
          </TouchableOpacity>
        )}
      </View>
    </CardContainer>
  );
});

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
  },
  activityItem: {
    paddingBottom: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1F1F1F',
  },
  noBorder: {
    borderBottomWidth: 0,
    marginBottom: 0,
    paddingBottom: 0,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '900',
    marginLeft: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateText: {
    color: '#555',
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 6,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleGroup: {
    flex: 1,
    marginRight: 12,
  },
  focusText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '800',
  },
  timeText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quickStats: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
    gap: 12,
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '700',
  },
  revertBtn: {
    ...commonStyles.circularButton,
    backgroundColor: '#1A1A1A',
  },
  highlightNoteBox: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  noteIndicator: {
    width: 4,
    backgroundColor: '#FFD700',
  },
  noteContent: {
    flex: 1,
    padding: 12,
  },
  notesText: {
    color: '#CCC',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  expandBtn: {
    marginTop: 8,
  },
  expandText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '700',
  },
  showMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
    backgroundColor: '#161616',
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#222',
  },
  showMoreText: {
    color: '#FFD700',
    fontSize: 13,
    fontWeight: '700',
  },
});
