import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScheduledSession } from '../../services/schedule/scheduleService';

interface ScheduleCalendarGridProps {
  sessions: ScheduledSession[];
  activeClientId?: string;
  onSlotPress: (date: string, hour: number) => void;
  onSessionPress: (session: ScheduledSession) => void;
  /** When set, only this session is shown with full color; all others are grayed out */
  highlightSessionId?: string | null;
  /** When set, auto-scrolls to the week containing this date (ISO string) */
  scrollToDate?: string | null;
}

const HOURS = Array.from({ length: 19 }, (_, i) => i + 5); // 5 AM to 11 PM

export default function ScheduleCalendarGrid({
  sessions,
  activeClientId,
  onSlotPress,
  onSessionPress,
  highlightSessionId,
  scrollToDate,
}: ScheduleCalendarGridProps) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const CELL_WIDTH = isMobile ? 100 : 140;
  const DATE_COL_WIDTH = isMobile ? 80 : 120;
  const HEADER_HEIGHT = isMobile ? 50 : 60;
  const ROW_HEIGHT = isMobile ? 60 : 80;

  const [weekRange, setWeekRange] = useState<string[][]>([]);
  const [initialIndex, setInitialIndex] = useState<number | null>(null);

  const bodyListRef = useRef<FlatList>(null);
  const sideListRef = useRef<FlatList>(null);
  const horizontalScrollRef = useRef<ScrollView>(null);

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
    let targetIndex: number | null = null;

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
        // Check if this week contains the scrollToDate
        if (scrollToDate && formatted === scrollToDate) {
          targetIndex = w;
        }
      }
      weeks.push(weekDays);
    }

    setWeekRange(weeks);
    // If scrollToDate is set, scroll to that week instead of today's week
    setInitialIndex(targetIndex !== null ? targetIndex : currentIndex);
  }, [scrollToDate]);

  const sessionsByDate = useMemo(() => {
    const map: Record<string, ScheduledSession[]> = {};
    sessions.forEach(s => {
      if (!map[s.date]) map[s.date] = [];
      map[s.date].push(s);
    });
    return map;
  }, [sessions]);

  // Auto-scroll horizontally to the highlighted session's time
  useEffect(() => {
    if (highlightSessionId && sessions.length > 0) {
      const target = sessions.find(s => s.id === highlightSessionId);
      if (target?.start_time) {
        const [sh] = target.start_time.split(':').map(Number);
        if (sh >= 5) {
          // Scroll so session is roughly centered (offset by ~2 cells for context)
          const scrollX = Math.max(0, ((sh - 5) - 2) * CELL_WIDTH);
          setTimeout(() => {
            horizontalScrollRef.current?.scrollTo({ x: scrollX, animated: true });
          }, 300);
        }
      }
    }
  }, [highlightSessionId, sessions]);

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
            <View key={date} style={[styles.sideItem, isToday && styles.todaySideItem, { height: ROW_HEIGHT }]}>
              <Text style={[styles.sideDayText, isToday && styles.todayText, isMobile && { fontSize: 9 }]}>{dayName}</Text>
              <Text style={[styles.sideNumText, isToday && styles.todayText, isMobile && { fontSize: 16 }]}>{dayNum}</Text>
              <Text style={[styles.sideMonthText, isMobile && { fontSize: 8 }]}>{monthYear}</Text>
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
            <View key={date} style={[styles.gridRow, { height: ROW_HEIGHT }]}>
              {/* Background Empty Cells */}
              {HOURS.map(hour => (
                <TouchableOpacity
                  key={hour}
                  style={[styles.cell, { width: CELL_WIDTH, height: ROW_HEIGHT }]}
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
                const itemWidth = Math.max((duration / 60) * CELL_WIDTH, 30);

                const isActive = session.client_id === activeClientId;
                const isHighlighted = highlightSessionId ? session.id === highlightSessionId : false;
                const isDimmed = highlightSessionId ? session.id !== highlightSessionId : false;

                return (
                  <TouchableOpacity
                    key={session.id}
                    style={[
                      styles.sessionBadge,
                      { left: leftOffset, width: itemWidth, height: ROW_HEIGHT - 8 },
                      isActive ? styles.activeBadge : styles.otherBadge,
                      isDimmed && styles.dimmedBadge,
                      isHighlighted && styles.highlightedBadge,
                      isMobile && { padding: 4 }
                    ]}
                    onPress={() => onSessionPress(session)}
                    activeOpacity={0.8}
                  >
                    <Text style={[
                      styles.badgeText,
                      isActive && !isDimmed && styles.activeBadgeText,
                      isDimmed && styles.dimmedText,
                      isHighlighted && styles.highlightedText,
                      isMobile && { fontSize: 9 }
                    ]} numberOfLines={1}>
                      {isActive ? 'OWN' : session.client_name.substring(0, 8)}
                    </Text>
                    <Text style={[
                      styles.badgeFocus,
                      isActive && !isDimmed && styles.activeBadgeText,
                      isDimmed && styles.dimmedText,
                      isHighlighted && styles.highlightedFocusText,
                      isMobile && { fontSize: 8, marginTop: 2 }
                    ]} numberOfLines={1}>
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
    <View style={[
      styles.container, 
      { height: HEADER_HEIGHT + (ROW_HEIGHT * 7) }
    ]}>
      {/* 1. Static Sidebar (Vertical) */}
      <View style={[styles.sidebarContainer, { width: DATE_COL_WIDTH }]}>
        <View style={[styles.sidebarHeader, { height: HEADER_HEIGHT }]}>
          <Ionicons name="calendar-outline" size={isMobile ? 16 : 20} color="#444" />
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
          style={{ height: ROW_HEIGHT * 7 }}
        />
      </View>

      {/* 2. Main Content */}
      <ScrollView ref={horizontalScrollRef} horizontal directionalLockEnabled={false} showsHorizontalScrollIndicator={true}>
        <View style={{ height: HEADER_HEIGHT + (ROW_HEIGHT * 7) }}>
          {/* Hour Header */}
          <View style={[styles.headerRow, { height: HEADER_HEIGHT }]}>
            {HOURS.map(hour => {
              const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
              const ampm = hour >= 12 ? 'PM' : 'AM';
              return (
                <View key={hour} style={[styles.headerCell, { width: CELL_WIDTH }]}>
                  <Text style={[styles.headerHourText, isMobile && { fontSize: 9 }]}>{displayHour} {ampm}</Text>
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
            extraData={[sessions, highlightSessionId]}
            onScroll={onScrollBody}
            scrollEventThrottle={16}
            pagingEnabled={true} // ENABLES NATIVE WEEK SNAPPING
            showsVerticalScrollIndicator={false}
            initialScrollIndex={initialIndex}
            getItemLayout={(data, index) => ({ length: ROW_HEIGHT * 7, offset: ROW_HEIGHT * 7 * index, index })}
            removeClippedSubviews={true}
            style={{ height: ROW_HEIGHT * 7 }}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#000', flexDirection: 'row' },

  // Sidebar
  sidebarContainer: { borderRightWidth: 1, borderRightColor: '#222', backgroundColor: '#0A0A0A' },
  sidebarHeader: { justifyContent: 'center', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#222' },
  sideItem: { justifyContent: 'center', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#1A1A1A' },
  todaySideItem: { backgroundColor: '#332200' },
  sideDayText: { color: '#666', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  sideNumText: { color: '#FFF', fontSize: 18, fontWeight: '800', marginVertical: 2 },
  sideMonthText: { color: '#444', fontSize: 10, fontWeight: '600' },
  todayText: { color: '#FFD700' },

  // Header
  headerRow: { flexDirection: 'row', backgroundColor: '#111', borderBottomWidth: 1, borderBottomColor: '#222' },
  headerCell: { justifyContent: 'center', alignItems: 'center', borderRightWidth: 1, borderRightColor: '#222' },
  headerHourText: { color: '#AAA', fontSize: 11, fontWeight: '700' },

  // Grid
  gridRow: { flexDirection: 'row' },
  cell: { borderRightWidth: 1, borderRightColor: '#1A1A1A', padding: 6, borderBottomWidth: 1, borderBottomColor: '#1A1A1A' },

  // Badge overlay
  sessionBadge: {
    position: 'absolute',
    top: 4,
    borderRadius: 8,
    padding: 8,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  otherBadge: { backgroundColor: '#222', borderWidth: 1, borderColor: '#333' },
  activeBadge: { backgroundColor: '#FFD700' },
  dimmedBadge: { backgroundColor: '#1A1A1A', borderColor: '#2A2A2A', opacity: 0.4 },
  highlightedBadge: { backgroundColor: '#FFD700', borderWidth: 2, borderColor: '#FFF', shadowColor: '#FFD700', shadowOpacity: 0.6, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 8 },
  badgeText: { fontSize: 11, fontWeight: '800', color: '#888' },
  activeBadgeText: { color: '#000' },
  dimmedText: { color: '#555' },
  highlightedText: { color: '#000', fontWeight: '900' },
  highlightedFocusText: { color: '#333', fontWeight: '700' },
  badgeFocus: { fontSize: 9, color: '#666', marginTop: 4, fontWeight: '600' },
});

