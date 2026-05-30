import { useEffect, useMemo, useState } from 'react';
import './WorkoutPlanSection.css';
import SectionHeader from '../ui/SectionHeader';
import Card from '../ui/Card';
import Tag from '../ui/Tag';
import IconButton from '../ui/IconButton';
import EmptyState from '../ui/EmptyState';
import AddPlanModal from './AddPlanModal';
import EditPlanModal from './EditPlanModal';
import AppAlert from '../shared/AppAlert';
import useStaggeredEntrance from '../../hooks/useStaggeredEntrance';

import { Plan, Session, Exercise } from '../../types';
import { useLongPress } from '../../hooks/useLongPress';
import { useHaptic } from '../../hooks/useHaptic';
import { useSoundFeedback } from '../../hooks/useSoundFeedback';
import { createMonthlyPlan, createWeeklyPlan, deletePlan, updatePlan } from '../../services/plan/planService';
import { toDayName, todayLocalIso } from '../../services/shared/date';

interface WorkoutPlanSectionProps {
  clientId: string;
  plans: Plan[];
  sessions: Session[];
  exercises: Exercise[];
  onOpenCalendar: (plan: Plan) => void;
  onEditSession: (session: Session) => void;
  onPlansChange: () => Promise<void>;
}

interface PlanTitlePressAreaProps {
  title: string;
  goal?: string;
  type?: string;
  weekCount: number;
  onLongPress: () => void;
}

interface DayBlockPressAreaProps {
  dayName: string;
  focus?: string;
  exercises: Exercise[];
  onLongPress: () => void;
}

let hasPlayedWorkoutPlansEntrance = false;

function PlanTitlePressArea({
  title,
  goal,
  type,
  weekCount,
  onLongPress,
}: PlanTitlePressAreaProps) {
  const { handlers, progress, isHolding } = useLongPress({ onLongPress });

  const titleStyle = useMemo(() => {
    if (!(progress > 0 || isHolding)) {
      return undefined;
    }

    return {
      transform: `scale(${1 - (progress * 0.028)})`,
      opacity: 1 - (progress * 0.16),
      filter: `brightness(${1 - (progress * 0.12)})`,
    };
  }, [isHolding, progress]);

  return (
    <div
      className={[
        'plan-card__info',
        isHolding ? 'plan-card__info--holding' : '',
      ].filter(Boolean).join(' ')}
      {...handlers}
    >
      <h3
        className={[
          'plan-card__title',
          isHolding ? 'plan-card__title--holding' : '',
        ].filter(Boolean).join(' ')}
        style={titleStyle}
      >
        {title}
      </h3>
      <div className="plan-card__tags">
        {goal && <Tag variant="yellow">{goal}</Tag>}
        {type && <Tag variant="gray">{type}</Tag>}
        {type === 'monthly' && <Tag variant="gray">{weekCount} Weeks</Tag>}
      </div>
    </div>
  );
}

function DayBlockPressArea({
  dayName,
  focus,
  exercises,
  onLongPress,
}: DayBlockPressAreaProps) {
  const { handlers, progress, isHolding } = useLongPress({ onLongPress });

  const style = useMemo(() => {
    if (!(progress > 0 || isHolding)) {
      return undefined;
    }

    const borderOpacity = 0.18 + (progress * 0.34);
    const glowOpacity = 0.08 + (progress * 0.12);

    return {
      transform: `scale(${1 - (progress * 0.014)})`,
      borderColor: `rgba(var(--color-primary-rgb), ${borderOpacity})`,
      boxShadow: `0 0 0 ${1.5 * progress}px rgba(var(--color-primary-rgb), ${glowOpacity}), 0 0 18px ${3 * progress}px rgba(var(--color-primary-rgb), ${glowOpacity * 0.75})`,
      backgroundColor: `rgba(16, 16, 16, ${1 - (progress * 0.08)})`,
    };
  }, [isHolding, progress]);

  return (
    <div
      className={[
        'day-block',
        isHolding ? 'day-block--holding' : '',
      ].filter(Boolean).join(' ')}
      style={style}
      {...handlers}
    >
      <div className="day-block__header">
        <span className="day-block__dot"></span>
        <span className="day-block__name">{dayName}</span>
        {focus ? <span className="day-block__focus">{focus}</span> : null}
      </div>

      <div className="day-block__exercises">
        {exercises.map((exercise) => (
          <div key={exercise.id} className="exercise-card">
            <div className="exercise-card__info">
              <span className="exercise-card__name">{exercise.name}</span>
            </div>
            <div className="exercise-card__value-pill">
              <span className="exercise-card__value">
                {exercise.target_sets && exercise.target_reps
                  ? `${exercise.target_sets}x${exercise.target_reps}`
                  : (exercise.target_reps || exercise.target_sets)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
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
  const haptic = useHaptic();
  const { playDelete } = useSoundFeedback();
  
  // Modal states
  const [isAddPlanModalOpen, setIsAddPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [planToDelete, setPlanToDelete] = useState<Plan | null>(null);
  const topLevelPlans = plans.filter(p => p.type === 'monthly' || (p.type === 'weekly' && !p.parent_plan_id));
  const planEntrance = useStaggeredEntrance({
    itemCount: hasPlayedWorkoutPlansEntrance ? 0 : topLevelPlans.length,
  });

  useEffect(() => {
    if (topLevelPlans.length > 0) {
      hasPlayedWorkoutPlansEntrance = true;
    }
  }, [topLevelPlans.length]);

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
                  const dayName = toDayName(session.date);

                  return (
                    <DayBlockPressArea
                      key={session.id} 
                      dayName={dayName.toUpperCase()}
                      focus={session.focus}
                      exercises={sessionExercises}
                      onLongPress={() => onEditSession(session)}
                    />
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
          {topLevelPlans.map((plan, index) => {
            const childWeeks = plans.filter(p => p.parent_plan_id === plan.id).sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
            const itemProps = planEntrance.getItemProps(index);
            return (
              <div key={plan.id} className={itemProps.className} style={itemProps.style}>
                <Card padding="md" className="plan-card">
                  <div className="plan-card__header">
                    <PlanTitlePressArea
                      title={plan.title}
                      goal={plan.goal}
                      type={plan.type}
                      weekCount={childWeeks.length}
                      onLongPress={() => setEditingPlan(plan)}
                    />
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
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <AddPlanModal 
        visible={isAddPlanModalOpen}
        onClose={() => setIsAddPlanModalOpen(false)}
        onSave={async (data) => {
          const startDate = todayLocalIso();
          
          if (data.type === 'monthly') {
            await createMonthlyPlan(clientId, data.title, data.goal, startDate);
          } else {
            await createWeeklyPlan(clientId, data.title, data.goal, startDate);
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
          await updatePlan(id, clientId, data);
          await onPlansChange();
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
            await deletePlan(planToDelete.id, clientId);
            playDelete();
            haptic.error();
            setPlanToDelete(null);
            await onPlansChange();
          }
        }}
        onCancel={() => setPlanToDelete(null)}
      />
    </div>
  );
}
