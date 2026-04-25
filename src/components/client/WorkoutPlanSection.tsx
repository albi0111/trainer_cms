import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Plan, Session } from '../../types';
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
  onEditSession?: (session: Session) => void;
}

export default function WorkoutPlanSection(props: WorkoutPlanSectionProps) {
  const {
    monthlyPlans, standaloneWeeklyPlans, weeklyPlansByMonth,
    sessions, exercises, expandedWeeks,
    onToggleWeekExpand, onAddPlan, onEditPlan, onAddWeeklyToPlan, onDeletePlan, onEditWeeklyPlan, onEditSession
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
          <TouchableOpacity 
            key={day} 
            style={st.dayBlock}
            onLongPress={() => {
              if (ds.length > 0 && onEditSession) {
                onEditSession(ds[0]);
              }
            }}
            delayLongPress={500}
            activeOpacity={0.8}
          >
            <View style={st.dayHeaderRow}>
              <View style={st.dayDot} />
              <Text style={st.dayHeaderText}>{day}</Text>
              {ds[0]?.focus && <Text style={st.dayFocusText}>{ds[0].focus}</Text>}
            </View>
            {ds.map(session => {
              const sEx = exercises.filter(e => e.session_id === session.id);
              if (sEx.length === 0) return <Text key={session.id} style={st.muted}>No exercises defined for {session.focus || 'this session'}.</Text>;
              return sEx.map((ex: any, index: number) => {
                let valText = '';
                if (ex.target_sets > 0 && ex.target_reps && !isNaN(Number(ex.target_reps))) {
                  valText = `${ex.target_sets} × ${ex.target_reps}`;
                } else {
                  valText = ex.target_reps || ex.target_sets || '—';
                }

                const isLast = index === sEx.length - 1;

                return (
                  <View key={ex.id} style={[st.exerciseCard, isLast && { marginBottom: 0 }]}>
                    <View style={st.exerciseInfo}>
                      <Text style={st.exerciseName}>{ex.name || 'Unnamed Exercise'}</Text>
                      <Text style={st.exerciseNotes} numberOfLines={1}>{ex.notes || ''}</Text>
                    </View>
                    <View style={st.exerciseValuePill}>
                      <Text style={st.exerciseValueText}>{valText}</Text>
                    </View>
                  </View>
                );
              });
            })}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderWeek = (week: Plan, showDelete: boolean) => {
    const isExpanded = expandedWeeks.includes(week.id);
    return (
      <View key={week.id} style={st.weekContainer}>
        <View style={st.weekHeaderRow}>
          <View style={st.row}>
             <View style={st.weekPill}><Text style={st.weekPillText}>{week.title.toUpperCase()}</Text></View>
             <Text style={st.weekGoalText}>{week.goal ? week.goal.toUpperCase() : ''}</Text>
          </View>
          <View style={st.row}>
            <TouchableOpacity style={st.planningPill} onPress={() => onEditWeeklyPlan(week.id)}>
               <Ionicons name="calendar-outline" size={14} color="#888" style={{ marginRight: 6 }} />
               <Ionicons name="pencil" size={14} color="#888" />
            </TouchableOpacity>
            {showDelete && (
              <TouchableOpacity style={[st.smallCircleBtn, { marginLeft: 12 }]} onPress={() => onDeletePlan(week.id, week.title)}>
                 <Ionicons name="trash-outline" size={16} color="#888" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {isExpanded && renderWeekBreakdown(week.id)}

        <View style={st.expandBtnContainer}>
           <TouchableOpacity style={st.expandBtn} onPress={() => onToggleWeekExpand(week.id)}>
             <Ionicons name={isExpanded ? "arrow-up" : "arrow-down"} size={16} color="#888" />
           </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={st.container}>
      <View style={st.sectionHeader}>
        <View style={st.sectionHeaderLeft}>
          <Text style={st.sectionHeaderDash}>—</Text>
          <Text style={st.sectionHeaderTitle}>WORKOUT PLAN</Text>
        </View>
        <TouchableOpacity style={st.addBtn} onPress={onAddPlan}>
          <Text style={st.addBtnText}>+ Add Plan</Text>
        </TouchableOpacity>
      </View>

      {monthlyPlans.length === 0 && standaloneWeeklyPlans.length === 0 ? (
        <EmptyState message="No plans active. Tap Add Plan to map a new cycle." />
      ) : (
        <>
          {monthlyPlans.map(month => {
            const weeksCount = (weeklyPlansByMonth[month.id] || []).length;
            return (
              <View key={month.id} style={st.planCard}>
                <View style={st.planHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={st.planTitle}>{month.title}</Text>
                    <View style={st.tagsRow}>
                      {month.goal && (
                        <View style={st.tagYellow}>
                          <Text style={st.tagYellowText}>{month.goal}</Text>
                        </View>
                      )}
                      {month.type && month.type.toLowerCase() !== month.title.toLowerCase() && (
                         <View style={st.tagGray}>
                           <Text style={st.tagGrayText}>{month.type}</Text>
                         </View>
                      )}
                      <View style={st.tagGray}>
                        <Text style={st.tagGrayText}>{weeksCount} Weeks</Text>
                      </View>
                    </View>
                  </View>
                  <View style={st.planActions}>
                    <TouchableOpacity style={st.circleBtn} onPress={() => onEditPlan(month)}>
                      <Ionicons name="pencil" size={14} color="#888" />
                    </TouchableOpacity>
                    <TouchableOpacity style={st.circleBtn} onPress={() => onDeletePlan(month.id, month.title)}>
                      <Ionicons name="trash-outline" size={18} color="#888" />
                    </TouchableOpacity>
                  </View>
                </View>

                {(weeklyPlansByMonth[month.id] || []).length > 0 && (
                  <View style={st.divider} />
                )}

                {(weeklyPlansByMonth[month.id] || []).map(w => renderWeek(w, false))}
              </View>
            );
          })}
          
          {standaloneWeeklyPlans.map(w => (
            <View key={w.id} style={st.planCard}>
               {renderWeek(w, true)}
            </View>
          ))}
        </>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  container: {
    paddingVertical: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionHeaderDash: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: '700',
    marginRight: 8,
  },
  sectionHeaderTitle: {
    color: '#AAA',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  addBtnText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
  },
  
  planCard: {
    backgroundColor: '#161616',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  planTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagYellow: {
    backgroundColor: '#2A2400',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4A4000',
  },
  tagYellowText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '700',
  },
  tagGray: {
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  tagGrayText: {
    color: '#AAA',
    fontSize: 12,
    fontWeight: '600',
  },
  planActions: {
    flexDirection: 'row',
    gap: 8,
  },
  circleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallCircleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  planningPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 32,
    backgroundColor: '#111',
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  
  divider: {
    height: 1,
    backgroundColor: '#2A2A2A',
    marginVertical: 24,
  },
  
  weekContainer: {
    marginBottom: 8,
  },
  weekHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    padding: 4,
  },
  weekPill: {
    borderColor: '#FFD700',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 10,
  },
  weekPillText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  weekGoalText: {
    color: '#AAA',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  
  weekBlock: {
    marginBottom: 16,
  },
  dayBlock: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  dayHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dayDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF7D00',
    marginRight: 10,
  },
  dayHeaderText: {
    color: '#FF7D00',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  dayFocusText: {
    color: '#888',
    fontSize: 13,
    marginLeft: 8,
  },
  
  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1F1F1F',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  exerciseInfo: {
    flex: 1,
    marginRight: 16,
  },
  exerciseName: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  exerciseNotes: {
    color: '#888',
    fontSize: 13,
  },
  exerciseValuePill: {
    backgroundColor: '#111',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  exerciseValueText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '800',
  },
  
  expandBtnContainer: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  expandBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  muted: {
    color: '#666',
    fontSize: 13,
    fontStyle: 'italic',
    marginLeft: 18,
    marginBottom: 16,
  },
});
