import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScheduledSession } from '../../services/schedule/scheduleService';

interface ScheduleCalendarGridProps {
  sessions: ScheduledSession[];
  activeClientId?: string;
  onSlotPress: (date: string, hour: number) => void;
  onSessionPress: (session: ScheduledSession) => void;
}

const HOURS = Array.from({ length: 19 }, (_, i) => i + 5); // 5 AM to 11 PM
const CELL_WIDTH = 140;
const DATE_COL_WIDTH = 120;
const HEADER_HEIGHT = 60;
const ROW_HEIGHT = 80;

export default function ScheduleCalendarGrid({
  sessions,
  activeClientId,
  onSlotPress,
  onSessionPress,
}: ScheduleCalendarGridProps) {
  const [weekRange, setWeekRange] = useState<string[][]>([]);
  const [initialIndex, setInitialIndex] = useState<number | null>(null);

  const bodyListRef = useRef<FlatList>(null);
  const sideListRef = useRef<FlatList>(null);

  useEffect(() => {
    // Generate 52 weeks (Sunday to Saturday)
    const yearStart = new Date(new Date().getFullYear(), 0, 1);
    while (yearStart.getDay() !== 0) { // Align to Sunday
      yearStart.setDate(yearStart.getDate() - 1);
    }

    const weeks: string[][] = [];
    const _now = new Date();
    const todayStr = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}-${String(_now.getDate()).padStart(2, '0')}`;
    let currentIndex = 0;

    for (let w = 0; w < 52; w++) {
      const weekDays = [];
      for (let d = 0; d < 7; d++) {
        const dateObj = new Date(yearStart);
        dateObj.setDate(yearStart.getDate() + (w * 7) + d);
        
        // Reconstruct string locally
        const y = dateObj.getFullYear();
        const m = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        const formatted = `${y}-${m}-${day}`;
        
        weekDays.push(formatted);

        if (formatted === todayStr) {
          currentIndex = w;
        }
      }
      weeks.push(weekDays);
    }

    setWeekRange(weeks);
    setInitialIndex(currentIndex);
  }, []);

  const sessionsByDate = useMemo(() => {
    const map: Record<string, ScheduledSession[]> = {};
    sessions.forEach(s => {
      if (!map[s.date]) map[s.date] = [];
      map[s.date].push(s);
    });
    return map;
  }, [sessions]);

  // Sync Vertical Scrolling
  const onScrollBody = (event: any) => {
    const y = event.nativeEvent.contentOffset.y;
    sideListRef.current?.scrollToOffset({ offset: y, animated: false });
  };

  const renderSidebarWeek = ({ item: weekDates }: { item: string[] }) => {
    return (
      <View style={{ height: ROW_HEIGHT * 7 }}>
        {weekDates.map(date => {
          const dateObj = new Date(date);
          const isToday = new Date().toISOString().split('T')[0] === date;
          const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
          const dayNum = dateObj.getDate();
          const monthYear = dateObj.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }).replace(',', "'");

          return (
            <View key={date} style={[styles.sideItem, isToday && styles.todaySideItem]}>
              <Text style={[styles.sideDayText, isToday && styles.todayText]}>{dayName}</Text>
              <Text style={[styles.sideNumText, isToday && styles.todayText]}>{dayNum}</Text>
              <Text style={styles.sideMonthText}>{monthYear}</Text>
            </View>
          );
        })}
      </View>
    );
  };

  const renderGridWeek = ({ item: weekDates }: { item: string[] }) => {
    return (
      <View style={{ height: ROW_HEIGHT * 7 }}>
        {weekDates.map(date => {
          const daySessions = sessionsByDate[date] || [];

          return (
            <View key={date} style={styles.gridRow}>
              {/* Background Empty Cells */}
              {HOURS.map(hour => (
                <TouchableOpacity
                  key={hour}
                  style={styles.cell}
                  onPress={() => onSlotPress(date, hour)}
                  activeOpacity={0.6}
                />
              ))}

              {/* Absolute Positioned Sessions overlays */}
              {daySessions.map(session => {
                if (!session.start_time) return null;
                const [sh, sm] = session.start_time.split(':').map(Number);
                const duration = session.duration_minutes || 60;

                if (sh < 5 || sh >= 24) return null;

                const leftOffset = ((sh - 5) + (sm / 60)) * CELL_WIDTH;
                const itemWidth = Math.max((duration / 60) * CELL_WIDTH, 40);

                const isActive = session.client_id === activeClientId;

                return (
                  <TouchableOpacity
                    key={session.id}
                    style={[
                      styles.sessionBadge,
                      { left: leftOffset, width: itemWidth },
                      isActive ? styles.activeBadge : styles.otherBadge
                    ]}
                    onPress={() => onSessionPress(session)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.badgeText, isActive && styles.activeBadgeText]} numberOfLines={1}>
                      {isActive ? 'OWN' : session.client_name.substring(0, 8)}
                    </Text>
                    <Text style={[styles.badgeFocus, isActive && styles.activeBadgeText]} numberOfLines={1}>
                      {session.focus || 'Workout'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })}
      </View>
    );
  };

  if (initialIndex === null || weekRange.length === 0) {
    return <View style={styles.container} />; // Loading state
  }

  return (
    <View style={styles.container}>
      {/* 1. Static Sidebar (Vertical) */}
      <View style={styles.sidebarContainer}>
        <View style={styles.sidebarHeader}>
          <Ionicons name="calendar-outline" size={20} color="#444" />
        </View>
        <FlatList
          ref={sideListRef}
          data={weekRange}
          renderItem={renderSidebarWeek}
          keyExtractor={(item, index) => 'side-week-' + index}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
          getItemLayout={(data, index) => ({ length: ROW_HEIGHT * 7, offset: ROW_HEIGHT * 7 * index, index })}
          initialScrollIndex={initialIndex}
          style={{ height: ROW_HEIGHT * 7 }} // Locks exactly to 7 days
        />
      </View>

      {/* 2. Main Content */}
      <ScrollView horizontal directionalLockEnabled={false} showsHorizontalScrollIndicator={true}>
        <View>
          {/* Hour Header */}
          <View style={styles.headerRow}>
            {HOURS.map(hour => {
              const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
              const ampm = hour >= 12 ? 'PM' : 'AM';
              return (
                <View key={hour} style={styles.headerCell}>
                  <Text style={styles.headerHourText}>{displayHour} {ampm}</Text>
                </View>
              );
            })}
          </View>

          {/* Grid Rows (Locked to Header) */}
          <FlatList
            ref={bodyListRef}
            data={weekRange}
            renderItem={renderGridWeek}
            keyExtractor={(item, index) => 'grid-week-' + index}
            extraData={sessions}
            onScroll={onScrollBody}
            scrollEventThrottle={16}
            pagingEnabled={true} // ENABLES NATIVE WEEK SNAPPING
            showsVerticalScrollIndicator={false}
            initialScrollIndex={initialIndex}
            getItemLayout={(data, index) => ({ length: ROW_HEIGHT * 7, offset: ROW_HEIGHT * 7 * index, index })}
            removeClippedSubviews={true}
            style={{ height: ROW_HEIGHT * 7 }} // Locks exactly to 7 days
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: HEADER_HEIGHT + (ROW_HEIGHT * 7), backgroundColor: '#000', flexDirection: 'row' },

  // Sidebar
  sidebarContainer: { width: DATE_COL_WIDTH, borderRightWidth: 1, borderRightColor: '#222', backgroundColor: '#0A0A0A' },
  sidebarHeader: { height: HEADER_HEIGHT, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#222' },
  sideItem: { height: ROW_HEIGHT, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#1A1A1A' },
  todaySideItem: { backgroundColor: '#332200' },
  sideDayText: { color: '#666', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  sideNumText: { color: '#FFF', fontSize: 18, fontWeight: '800', marginVertical: 2 },
  sideMonthText: { color: '#444', fontSize: 10, fontWeight: '600' },
  todayText: { color: '#FFD700' },

  // Header
  headerRow: { flexDirection: 'row', height: HEADER_HEIGHT, backgroundColor: '#111', borderBottomWidth: 1, borderBottomColor: '#222' },
  headerCell: { width: CELL_WIDTH, justifyContent: 'center', alignItems: 'center', borderRightWidth: 1, borderRightColor: '#222' },
  headerHourText: { color: '#AAA', fontSize: 11, fontWeight: '700' },

  // Grid
  gridRow: { flexDirection: 'row', height: ROW_HEIGHT },
  cell: { width: CELL_WIDTH, height: ROW_HEIGHT, borderRightWidth: 1, borderRightColor: '#1A1A1A', padding: 6, borderBottomWidth: 1, borderBottomColor: '#1A1A1A' },

  // Badge overlay
  sessionBadge: {
    position: 'absolute',
    top: 4,
    height: ROW_HEIGHT - 8,
    borderRadius: 8,
    padding: 8,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3
  },
  otherBadge: { backgroundColor: '#222', borderWidth: 1, borderColor: '#333' },
  activeBadge: { backgroundColor: '#FFD700' },
  badgeText: { fontSize: 11, fontWeight: '800', color: '#888' },
  activeBadgeText: { color: '#000' },
  badgeFocus: { fontSize: 9, color: '#666', marginTop: 4, fontWeight: '600' },
});

