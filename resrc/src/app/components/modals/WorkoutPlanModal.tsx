import React, { useState, useEffect } from 'react';
import { X, Check, Plus, Trash2, GripVertical } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useApp, WorkoutDay, Exercise } from '../../context/AppContext';

interface WorkoutPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const inputStyle = (t: any) => ({
  padding: '8px 12px',
  background: t.bgInput, border: `1px solid ${t.border}`,
  borderRadius: '6px', color: t.text, fontSize: '13px',
  outline: 'none', boxSizing: 'border-box' as const,
  fontFamily: 'Inter, sans-serif',
});

export function WorkoutPlanModal({ isOpen, onClose, clientId }: WorkoutPlanModalProps) {
  const { t } = useTheme();
  const { getClient, updateWorkoutPlan } = useApp();
  const client = getClient(clientId);
  const [plan, setPlan] = useState<WorkoutDay[]>([]);
  const [activeDay, setActiveDay] = useState<string>('Monday');

  useEffect(() => {
    if (client && isOpen) {
      setPlan(JSON.parse(JSON.stringify(client.workoutPlan)));
      if (client.workoutPlan.length > 0) {
        setActiveDay(client.workoutPlan[0].day);
      }
    }
  }, [client, isOpen]);

  if (!isOpen || !client) return null;

  const addDay = (day: string) => {
    if (plan.find(d => d.day === day)) return;
    setPlan(p => [...p, { day, exercises: [] }]);
    setActiveDay(day);
  };

  const removeDay = (day: string) => {
    setPlan(p => p.filter(d => d.day !== day));
    if (activeDay === day && plan.length > 1) {
      setActiveDay(plan.find(d => d.day !== day)?.day || '');
    }
  };

  const addExercise = (day: string) => {
    setPlan(p => p.map(d => d.day === day
      ? { ...d, exercises: [...d.exercises, { name: '', sets: 3, reps: '10' }] }
      : d
    ));
  };

  const updateExercise = (day: string, idx: number, field: keyof Exercise, value: any) => {
    setPlan(p => p.map(d => d.day === day
      ? { ...d, exercises: d.exercises.map((e, i) => i === idx ? { ...e, [field]: value } : e) }
      : d
    ));
  };

  const removeExercise = (day: string, idx: number) => {
    setPlan(p => p.map(d => d.day === day
      ? { ...d, exercises: d.exercises.filter((_, i) => i !== idx) }
      : d
    ));
  };

  const handleSave = () => {
    updateWorkoutPlan(clientId, plan);
    onClose();
  };

  const activeData = plan.find(d => d.day === activeDay);
  const usedDays = plan.map(d => d.day);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: t.bgOverlay, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
      onClick={onClose}>
      <div style={{ background: t.bgCard, borderRadius: '20px', border: `1px solid ${t.border}`, boxShadow: `0 24px 64px ${t.shadow}`, width: '100%', maxWidth: '620px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
          <span style={{ fontSize: '16px', fontWeight: 700, color: t.text }}>Edit Workout Plan</span>
          <button onClick={onClose} style={{ background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: t.textMuted }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Day sidebar */}
          <div style={{ width: '140px', borderRight: `1px solid ${t.border}`, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0, overflowY: 'auto' }}>
            <p style={{ fontSize: '10px', fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Days</p>
            {DAYS.map(day => {
              const hasDay = usedDays.includes(day);
              const isActive = activeDay === day && hasDay;
              return (
                <button key={day}
                  onClick={() => hasDay ? setActiveDay(day) : addDay(day)}
                  style={{
                    padding: '8px 10px', borderRadius: '8px', textAlign: 'left',
                    background: isActive ? t.accent : hasDay ? t.bgInput : 'transparent',
                    border: `1px solid ${isActive ? t.accent : hasDay ? t.border : 'transparent'}`,
                    color: isActive ? t.accentFg : hasDay ? t.text : t.textMuted,
                    cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                  <span>{day.slice(0, 3)}</span>
                  {!hasDay && <Plus size={10} />}
                </button>
              );
            })}
          </div>

          {/* Exercises */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            {!activeData ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', color: t.textMuted }}>
                <p style={{ fontSize: '14px' }}>Select or add a training day</p>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: t.text }}>{activeDay}</span>
                  <button onClick={() => removeDay(activeDay)} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', borderRadius: '6px', border: `1px solid ${t.border}`, background: t.bgInput, color: t.danger, cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}>
                    <Trash2 size={11} /> Remove Day
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* Header row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 80px 80px 32px', gap: '6px', padding: '0 4px' }}>
                    {['Exercise', 'Sets', 'Reps', 'Notes', ''].map((h, i) => (
                      <span key={i} style={{ fontSize: '10px', fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</span>
                    ))}
                  </div>

                  {activeData.exercises.map((ex, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 80px 80px 32px', gap: '6px', alignItems: 'center' }}>
                      <input style={inputStyle(t)} placeholder="Exercise name" value={ex.name}
                        onChange={e => updateExercise(activeDay, idx, 'name', e.target.value)} />
                      <input style={{ ...inputStyle(t), textAlign: 'center' }} type="number" value={ex.sets}
                        onChange={e => updateExercise(activeDay, idx, 'sets', parseInt(e.target.value) || 0)} />
                      <input style={inputStyle(t)} placeholder="10–12" value={ex.reps}
                        onChange={e => updateExercise(activeDay, idx, 'reps', e.target.value)} />
                      <input style={inputStyle(t)} placeholder="Note..." value={ex.notes || ''}
                        onChange={e => updateExercise(activeDay, idx, 'notes', e.target.value)} />
                      <button onClick={() => removeExercise(activeDay, idx)} style={{ width: '32px', height: '32px', borderRadius: '6px', border: `1px solid ${t.border}`, background: t.bgInput, color: t.danger, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}

                  <button onClick={() => addExercise(activeDay)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '8px', border: `1px dashed ${t.border}`, background: 'transparent', color: t.textMuted, cursor: 'pointer', fontSize: '13px', fontWeight: 600, marginTop: '4px' }}>
                    <Plus size={14} /> Add Exercise
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: '16px 24px', borderTop: `1px solid ${t.border}`, display: 'flex', gap: '12px', flexShrink: 0 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: `1px solid ${t.border}`, background: t.bgInput, color: t.text, cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
            Cancel
          </button>
          <button onClick={handleSave} style={{ flex: 2, padding: '12px', borderRadius: '10px', background: t.accent, color: t.accentFg, border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <Check size={16} /> Save Plan
          </button>
        </div>
      </div>
    </div>
  );
}
