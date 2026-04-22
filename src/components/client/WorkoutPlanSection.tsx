import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Plan, Session } from '../../types';
import CardContainer from '../shared/CardContainer';
import EmptyState from '../shared/EmptyState';

interface WorkoutPlanSectionProps {
  monthlyPlans: Plan[];
  standaloneWeeklyPlans: Plan[];
  weeklyPlansByMonth: Record<string, Plan[]>;
  sessions: Session[];
  exercises: any[];
  expandedWeeks: string[];
  onToggleWeekExpand: (weekId: string) => void;
  onAddPlan: () => void;
  onEditPlan: (plan: Plan) => void;
  onAddWeeklyToPlan: (parentId: string) => void;
  onDeletePlan: (id: string, title: string) => void;
  onEditWeeklyPlan: (weekId: string) => void;
}

export default function WorkoutPlanSection(props: WorkoutPlanSectionProps) {
  const {
    monthlyPlans, standaloneWeeklyPlans, weeklyPlansByMonth,
    sessions, exercises, expandedWeeks,
    onToggleWeekExpand, onAddPlan, onEditPlan, onAddWeeklyToPlan, onDeletePlan, onEditWeeklyPlan,
  } = props;

  const renderWeekBreakdown = (weekId: string) => {
    const weekSessions = sessions.filter(s => s.plan_id === weekId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const map = new Map<string, typeof weekSessions>();
    weekSessions.forEach(s => {
      const day = s.day_name.toUpperCase();
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(s);
    });
    if (map.size === 0) return <Text style={st.muted}>No exercises mapped to this week yet.</Text>;
    return (
      <View style={st.weekBlock}>
        {Array.from(map.entries()).map(([day, ds]) => (
          <View key={day} style={st.dayBlock}>
            <Text style={st.dayHeader}>{day}{ds[0]?.focus ? ` - ${ds[0].focus.toLowerCase()}` : ''}</Text>
            {ds.map(session => {
              const sEx = exercises.filter(e => e.session_id === session.id);
              if (sEx.length === 0) return <Text key={session.id} style={st.muted}>No exercises defined for {session.focus || 'this session'}.</Text>;
              return sEx.map((ex: any) => (
                <View key={ex.id} style={st.exRow}>
                  <Text style={st.exName}>{ex.name || 'Unnamed Exercise'}</Text>
                  <Text style={st.exSets}>{ex.target_sets||0}x{ex.target_reps||0}</Text>
                  <Text style={st.exNotes} numberOfLines={1}>{ex.notes||''}</Text>
                </View>
              ));
            })}
          </View>
        ))}
      </View>
    );
  };

  const renderWeek = (week: Plan, showDelete: boolean) => {
    const isExpanded = expandedWeeks.includes(week.id);
    return (
      <View key={week.id} style={st.weekGroup}>
        <View style={[st.row, { justifyContent: 'space-between', marginBottom: 8 }]}>
          <TouchableOpacity style={st.row} onPress={() => onToggleWeekExpand(week.id)} activeOpacity={0.8}>
            <Ionicons name={isExpanded ? 'chevron-down' : 'chevron-forward'} size={16} color="#FFD700" style={{ marginRight: 6 }} />
            <Text style={st.sub}>{week.title.toUpperCase()}{week.goal ? ` - ${week.goal.toLowerCase()}` : ''}</Text>
          </TouchableOpacity>
          <View style={st.row}>
            <TouchableOpacity onPress={() => onEditWeeklyPlan(week.id)}><Ionicons name="pencil" size={16} color="#FFD700" /></TouchableOpacity>
            {showDelete && <TouchableOpacity style={{ marginLeft: 10 }} onPress={() => onDeletePlan(week.id, week.title)}><Ionicons name="trash" size={16} color="#666" /></TouchableOpacity>}
          </View>
        </View>
        {isExpanded && renderWeekBreakdown(week.id)}
      </View>
    );
  };

  return (
    <CardContainer headerIcon="barbell" headerIconColor="#FFD700" headerTitle="Workout Plan" actionIcon="add" actionLabel="Add Plan" onAction={onAddPlan}>
      {monthlyPlans.length === 0 && standaloneWeeklyPlans.length === 0 ? (
        <EmptyState message="No plans active. Tap Add Plan to map a new cycle." />
      ) : (
        <>
          {monthlyPlans.map(month => (
            <View key={month.id} style={{ marginBottom: 20 }}>
              <View style={[st.row, { justifyContent: 'space-between', marginBottom: 4 }]}>
                <Text style={[st.title, { color: '#FFD700' }]}>{month.title.toUpperCase()}{month.goal ? ` - ${month.goal.toLowerCase()}` : ''}</Text>
                <View style={st.row}>
                  <TouchableOpacity style={{ marginRight: 10 }} onPress={() => onEditPlan(month)}><Ionicons name="pencil" size={18} color="#FFD700" /></TouchableOpacity>
                  <TouchableOpacity style={{ marginRight: 10 }} onPress={() => onAddWeeklyToPlan(month.id)}><Ionicons name="add-circle" size={18} color="#FFD700" /></TouchableOpacity>
                  <TouchableOpacity onPress={() => onDeletePlan(month.id, month.title)}><Ionicons name="trash" size={18} color="#666" /></TouchableOpacity>
                </View>
              </View>
              {(weeklyPlansByMonth[month.id] || []).map(w => renderWeek(w, false))}
            </View>
          ))}
          {standaloneWeeklyPlans.map(w => renderWeek(w, true))}
        </>
      )}
    </CardContainer>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  sub: { color: '#666', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
  title: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  weekGroup: { marginBottom: 16, paddingLeft: 8 },
  weekBlock: { paddingLeft: 4, marginTop: 12, marginBottom: 16 },
  dayBlock: { marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#1F1F1F' },
  dayHeader: { color: '#FF7D00', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 12 },
  exRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, paddingHorizontal: 4 },
  exName: { flex: 2, color: '#FFF', fontSize: 13, fontWeight: '600' },
  exSets: { flex: 1, color: '#FFF', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  exNotes: { flex: 2, color: '#666', fontSize: 11, textAlign: 'right', fontStyle: 'italic' },
  muted: { color: '#444', fontSize: 12, fontStyle: 'italic', marginLeft: 12, marginBottom: 12 },
});
