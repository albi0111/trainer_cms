import { useState } from 'react';
import './WorkoutPlanSection.css';
import SectionHeader from '../ui/SectionHeader';
import Card from '../ui/Card';
import Tag from '../ui/Tag';
import IconButton from '../ui/IconButton';
import EmptyState from '../ui/EmptyState';
import AddPlanModal from './AddPlanModal';
import EditPlanModal from './EditPlanModal';
import AppAlert from '../shared/AppAlert';
import { db } from '../../db/db';

import { Plan, Session, Exercise } from '../../types';

interface WorkoutPlanSectionProps {
  clientId: string;
  plans: Plan[];
  sessions: Session[];
  allSessions: Session[];
  exercises: Exercise[];
  onOpenCalendar: (plan: Plan) => void;
  onEditSession: (session: Session) => void;
  onPlansChange: () => Promise<void>;
}

export default function WorkoutPlanSection({
  clientId,
  plans,
  sessions,
  exercises,
  onOpenCalendar,
  onEditSession,
  onPlansChange,
}: WorkoutPlanSectionProps) {
  const [expandedWeeks, setExpandedWeeks] = useState<string[]>([]);
  
  // Modal states
  const [isAddPlanModalOpen, setIsAddPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [planToDelete, setPlanToDelete] = useState<Plan | null>(null);

  const toggleWeek = (id: string) => {
    setExpandedWeeks(prev => 
      prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id]
    );
  };


  const trashIcon = (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 4H14M5 4V2H11V4M6 7V12M10 7V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 4L4 14H12L13 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  const calendarPencilIcon = (
    <div style={{ display: 'flex', gap: '4px' }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line></svg>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
    </div>
  );

  const renderWeekBreakdown = (week: Plan) => {
    const isExpanded = expandedWeeks.includes(week.id);
    const weekSessions = sessions.filter(s => s.plan_id === week.id).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    return (
      <>
        {isExpanded && (
          <div className="week-breakdown">
            {weekSessions.length === 0 ? (
              <p className="week-breakdown__empty">No exercises mapped to this week yet.</p>
            ) : (
              <div className="week-sessions-list">
                {weekSessions.map(session => {
                  const sessionExercises = exercises.filter(e => e.session_id === session.id).sort((a, b) => a.order_index - b.order_index);
                  const dayName = session.day_name || new Date(session.date).toLocaleDateString('en-US', { weekday: 'long' });
                  
                  let longPressTimer: any;

                  const triggerEdit = () => {
                    if (window.navigator.vibrate) {
                      window.navigator.vibrate(20);
                    }
                    onEditSession(session);
                  };

                  return (
                    <div 
                      key={session.id} 
                      className="day-block"
                      onMouseDown={() => {
                        longPressTimer = setTimeout(triggerEdit, 600); // 600ms hold
                      }}
                      onMouseUp={() => clearTimeout(longPressTimer)}
                      onMouseLeave={() => clearTimeout(longPressTimer)}
                      onTouchStart={() => {
                        longPressTimer = setTimeout(triggerEdit, 600);
                      }}
                      onTouchEnd={() => clearTimeout(longPressTimer)}
                    >
                      <div className="day-block__header">
                        <span className="day-block__dot"></span>
                        <span className="day-block__name">{dayName.toUpperCase()}</span>
                        {session.focus && <span className="day-block__focus">{session.focus}</span>}
                      </div>
                      
                      <div className="day-block__exercises">
                        {sessionExercises.map(ex => (
                          <div key={ex.id} className="exercise-card">
                            <div className="exercise-card__info">
                              <span className="exercise-card__name">{ex.name}</span>
                            </div>
                            <div className="exercise-card__value-pill">
                              <span className="exercise-card__value">
                                {ex.target_sets && ex.target_reps ? `${ex.target_sets}x${ex.target_reps}` : (ex.target_reps || ex.target_sets)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="week-expand-container">
          <button className="week-expand-btn" onClick={() => toggleWeek(week.id)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points={isExpanded ? "18 15 12 9 6 15" : "6 9 12 15 18 9"}></polyline>
            </svg>
          </button>
        </div>
      </>
    );
  };

  return (
    <div className="workout-plan-section">
      <SectionHeader title="WORKOUT PLAN" actionLabel="+ Add Plan" onAction={() => setIsAddPlanModalOpen(true)} />

      {plans.length === 0 ? (
        <EmptyState message="No plans active. Tap Add Plan to map a new cycle." />
      ) : (
        <div className="plans-list">
          {plans.filter(p => p.type === 'monthly' || (p.type === 'weekly' && !p.parent_plan_id)).map(plan => {
            const childWeeks = plans.filter(p => p.parent_plan_id === plan.id).sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
            return (
              <Card key={plan.id} padding="md" className="plan-card">
                <div className="plan-card__header">
                  <div 
                    className="plan-card__info"
                    onMouseDown={() => {
                      const timer = setTimeout(() => {
                        if (window.navigator.vibrate) window.navigator.vibrate(20);
                        setEditingPlan(plan);
                      }, 700);
                      (window as any)._planTimer = timer;
                    }}
                    onMouseUp={() => clearTimeout((window as any)._planTimer)}
                    onMouseLeave={() => clearTimeout((window as any)._planTimer)}
                    onTouchStart={() => {
                      const timer = setTimeout(() => {
                        if (window.navigator.vibrate) window.navigator.vibrate(20);
                        setEditingPlan(plan);
                      }, 700);
                      (window as any)._planTimer = timer;
                    }}
                    onTouchEnd={() => clearTimeout((window as any)._planTimer)}
                    style={{ cursor: 'pointer' }}
                  >
                    <h3 className="plan-card__title">{plan.title}</h3>
                    <div className="plan-card__tags">
                      {plan.goal && <Tag variant="yellow">{plan.goal}</Tag>}
                      {plan.type && <Tag variant="gray">{plan.type}</Tag>}
                      {plan.type === 'monthly' && <Tag variant="gray">{childWeeks.length} Weeks</Tag>}
                    </div>
                  </div>
                  <div className="plan-card__actions">
                    {plan.type === 'weekly' && (
                      <div className="planning-pill" onClick={() => onOpenCalendar(plan)} style={{ marginRight: '8px' }}>
                        {calendarPencilIcon}
                      </div>
                    )}
                    <IconButton 
                      icon={trashIcon} 
                      onClick={() => setPlanToDelete(plan)} 
                      variant="dark" 
                    />
                  </div>
                </div>

                {childWeeks.length > 0 && (
                  <div className="plan-card__divider" />
                )}

                {plan.type === 'weekly' && (
                  <div className="standalone-week-content">
                    <div className="plan-card__divider" />
                    {renderWeekBreakdown(plan)}
                  </div>
                )}

                <div className="weeks-list">
                  {childWeeks.map((week) => (
                    <div key={week.id} className="week-item">
                      <div className="week-item__header">
                        <div className="week-item__title-row">
                          <span className="week-badge">{week.title.toUpperCase()}</span>
                          {week.goal && <span className="week-goal">{week.goal.toUpperCase()}</span>}
                        </div>
                        <div className="week-item__actions">
                          <div className="planning-pill" onClick={() => onOpenCalendar(week)}>
                            {calendarPencilIcon}
                          </div>
                        </div>
                      </div>
                      {renderWeekBreakdown(week)}
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <AddPlanModal 
        visible={isAddPlanModalOpen}
        onClose={() => setIsAddPlanModalOpen(false)}
        onSave={async (data) => {
          setIsAddPlanModalOpen(false);
          const now = new Date().toISOString();
          const pId = 'p' + Date.now();
          const startDate = new Date().toISOString().split('T')[0] || '';
          
          if (data.type === 'monthly') {
            const endDate = new Date(new Date(startDate).getTime() + 28 * 24 * 3600 * 1000).toISOString().split('T')[0] || '';
            await db.plans.put({
              id: pId, client_id: clientId, type: 'monthly', title: data.title, goal: data.goal, start_date: startDate, end_date: endDate,
              parent_plan_id: null, order_index: null, status: 'upcoming', created_at: now, updated_at: now
            });
            // Auto generate 4 weeks
            const startObj = new Date(startDate || '');
            for (let i = 1; i <= 4; i++) {
              const weekStart = new Date(startObj.getTime() + (i - 1) * 7 * 24 * 3600 * 1000).toISOString().split('T')[0] || '';
              const weekEnd = new Date(startObj.getTime() + (i * 7 - 1) * 24 * 3600 * 1000).toISOString().split('T')[0] || '';
              await db.plans.put({
                id: pId + '-w' + i, client_id: clientId, type: 'weekly', title: `Week ${i}`, goal: '', start_date: weekStart, end_date: weekEnd,
                parent_plan_id: pId, order_index: i, status: 'upcoming', created_at: now, updated_at: now
              });
            }
          } else {
            const endDate = new Date(new Date(startDate || '').getTime() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0] || '';
            await db.plans.put({
              id: pId, client_id: clientId, type: 'weekly', title: data.title, goal: data.goal, start_date: startDate, end_date: endDate,
              parent_plan_id: null, order_index: null, status: 'upcoming', created_at: now, updated_at: now
            });
          }
          await onPlansChange();
        }}
      />

      {/* Add Plan Modal */}
      {/* Edit Plan Modal */}
      <EditPlanModal
        visible={!!editingPlan}
        plan={editingPlan}
        onClose={() => setEditingPlan(null)}
        onSave={async (id: string, data: { title: string, goal: string }) => {
          await db.plans.update(id, { ...data, updated_at: new Date().toISOString() });
          onPlansChange();
        }}
      />
      {/* Delete Plan Alert */}
      <AppAlert
        visible={!!planToDelete}
        title="Delete Plan"
        message={`Are you sure you want to delete "${planToDelete?.title}"? This will remove the plan and its associated schedule.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={async () => {
          if (planToDelete) {
            await db.plans.delete(planToDelete.id);
            const ss = await db.sessions.where('plan_id').equals(planToDelete.id).toArray();
            await db.sessions.bulkDelete(ss.map(s => s.id));
            setPlanToDelete(null);
            onPlansChange();
          }
        }}
        onCancel={() => setPlanToDelete(null)}
      />
    </div>
  );
}
