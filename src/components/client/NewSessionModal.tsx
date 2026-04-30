import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './ScheduleCalendarModal.css';
import AppDatePicker from '../shared/AppDatePicker';
import AppTimePicker from '../shared/AppTimePicker';
import AppAlert from '../shared/AppAlert';
import { Session } from '../../types';
import { db } from '../../db/db';

interface ExerciseDraft {
  id: string;
  name: string;
  reps: string;
}

interface NewSessionModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  onDelete?: (sessionId: string) => void;
  initialDate: string;
  initialTime: string;
  editingSession?: Session | null;
  sessions: Session[];
  postponeMode?: boolean;
}

export default function NewSessionModal({ 
  visible, 
  onClose, 
  onSave, 
  onDelete,
  initialDate, 
  initialTime,
  editingSession,
  sessions,
  postponeMode = false,
}: NewSessionModalProps) {
  const [date, setDate] = useState(initialDate);
  const [startTime, setStartTime] = useState(initialTime);
  const [endTime, setEndTime] = useState('');
  const [focus, setFocus] = useState('');
  const [postponeReason, setPostponeReason] = useState('');
  const [exercises, setExercises] = useState<ExerciseDraft[]>([]);
  const [remind, setRemind] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  useEffect(() => {
    if (editingSession) {
      setDate(editingSession.date || '');
      setStartTime(editingSession.start_time || '');
      setEndTime(editingSession.end_time || '');
      setFocus(editingSession.focus || '');
      setPostponeReason(editingSession.postponed_note || '');
      setRemind(editingSession.measure_reminder || false);
      
      // Fetch exercises for this session
      db.exercises.where('session_id').equals(editingSession.id!).toArray().then(exs => {
        setExercises(exs.map(e => ({
          id: e.id!,
          name: e.name,
          reps: e.target_reps || ''
        })));
      });
    } else {
      setDate(initialDate);
      setStartTime(initialTime);
      if (initialTime) {
        const h = parseInt(initialTime.split(':')[0] || '0');
        setEndTime(`${((h + 1) % 24).toString().padStart(2, '0')}:00`);
      } else {
        setEndTime('');
      }
      setFocus('');
      setPostponeReason('');
      setExercises([]);
      setRemind(false);
    }
  }, [initialDate, initialTime, visible, editingSession]);

  if (!visible) return null;

  const addExercise = () => {
    setExercises([...exercises, { id: Math.random().toString(), name: '', reps: '' }]);
  };

  const updateExercise = (id: string, field: keyof ExerciseDraft, value: string) => {
    setExercises(exercises.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const removeExercise = (id: string) => {
    setExercises(exercises.filter(e => e.id !== id));
  };


  const handleSave = () => {
    // Overlap validation
    const startTimeNum = parseInt(startTime.replace(':', ''));
    const endTimeNum = parseInt(endTime.replace(':', ''));

    const isOverlapping = sessions.some(s => {
      if (s.date !== date) return false;
      if (editingSession && s.id === editingSession.id) return false;
      
      const sStart = parseInt((s.start_time || '00:00').replace(':', ''));
      const sEnd = parseInt((s.end_time || '00:00').replace(':', ''));
      
      return (startTimeNum < sEnd && endTimeNum > sStart);
    });

    if (isOverlapping) {
      setError('This session overlaps with another scheduled session.');
      return;
    }

    onSave({
      id: editingSession?.id,
      date,
      start_time: startTime,
      end_time: endTime,
      focus,
      postponed_note: postponeReason.trim(),
      exercises,
      measure_reminder: remind
    });
    setError(null);
  };

  return createPortal(
    <div className="uc-overlay" onClick={onClose} style={{ zIndex: 200, backgroundColor: 'rgba(0,0,0,0.85)' }}>
      <div 
        className="uc-modal" 
        onClick={e => e.stopPropagation()} 
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ color: '#FFF', fontSize: '20px', fontWeight: '800', margin: 0 }}>{editingSession ? 'Edit Session' : 'New Session'}</h2>
          <button 
            onClick={onClose}
            style={{ 
              background: '#1A1A1A', border: '1px solid #333', 
              borderRadius: '50%', width: '32px', height: '32px', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' 
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        {error && (
          <div style={{ backgroundColor: 'rgba(255, 68, 68, 0.1)', border: '1px solid #FF4444', borderRadius: '12px', padding: '12px', marginBottom: '16px', color: '#FF4444', fontSize: '13px', fontWeight: '600', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Date Picker */}
          <AppDatePicker label="Date" value={date} onChange={setDate} />

          {/* Time Pickers */}
          <div style={{ display: 'flex', gap: '16px' }}>
            <AppTimePicker label="Start Time" value={startTime} onChange={setStartTime} />
            <AppTimePicker label="End Time" value={endTime} onChange={setEndTime} />
          </div>

          {/* Focus / Goal */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ color: '#888', fontSize: '12px', fontWeight: '600' }}>Focus / Goal</label>
            <input 
              type="text" 
              value={focus} 
              onChange={e => setFocus(e.target.value)} 
              placeholder="e.g. Chest & Triceps" 
              style={{ 
                backgroundColor: '#1A1A1A', borderRadius: '12px', border: '1px solid #333', 
                color: '#FFF', padding: '14px', fontSize: '15px', outline: 'none' 
              }}
            />
          </div>

          {postponeMode && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ color: '#888', fontSize: '12px', fontWeight: '600' }}>Postpone Reason / Explanation</label>
              <textarea
                value={postponeReason}
                onChange={e => setPostponeReason(e.target.value)}
                placeholder="Explain why this session is being postponed..."
                rows={3}
                style={{
                  backgroundColor: '#1A1A1A',
                  borderRadius: '12px',
                  border: '1px solid #333',
                  color: '#FFF',
                  padding: '14px',
                  fontSize: '14px',
                  outline: 'none',
                  resize: 'vertical',
                  minHeight: '88px',
                }}
              />
            </div>
          )}

          {/* Exercises */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ color: '#444', fontSize: '11px', fontWeight: '800', letterSpacing: '0.5px' }}>EXERCISES</label>
              <button 
                type="button" 
                onClick={addExercise}
                style={{ 
                  background: 'transparent', border: 'none', color: '#FFD700', 
                  fontSize: '11px', fontWeight: '800', cursor: 'pointer' 
                }}
              >
                + ADD
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
              {exercises.length === 0 && (
                <div style={{ padding: '16px', border: '1px dashed #222', borderRadius: '12px', textAlign: 'center' }}>
                  <span style={{ color: '#444', fontSize: '12px' }}>No exercises added yet</span>
                </div>
              )}
              {exercises.map(ex => (
                <div key={ex.id} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input 
                    type="text" 
                    placeholder="Exercise name" 
                    value={ex.name} 
                    onChange={e => updateExercise(ex.id, 'name', e.target.value)} 
                    style={{ 
                      flex: 1, backgroundColor: '#1A1A1A', borderRadius: '10px', border: '1px solid #333', 
                      color: '#FFF', padding: '10px 12px', fontSize: '13px', outline: 'none' 
                    }}
                  />
                  <input 
                    type="text" 
                    placeholder="3x10" 
                    value={ex.reps} 
                    onChange={e => updateExercise(ex.id, 'reps', e.target.value)} 
                    style={{ 
                      width: '80px', backgroundColor: '#1A1A1A', borderRadius: '10px', border: '1px solid #333', 
                      color: '#FFF', padding: '10px 12px', fontSize: '13px', outline: 'none', textAlign: 'center' 
                    }}
                  />
                  <button 
                    onClick={() => removeExercise(ex.id)}
                    style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', padding: '4px' }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Reminder Toggle */}
          <div 
            onClick={() => setRemind(!remind)}
            style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', marginTop: '4px' }}
          >
            <div style={{ 
              width: '20px', height: '20px', borderRadius: '6px', 
              border: '2px solid #333', backgroundColor: remind ? '#FFD700' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {remind && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="4"><polyline points="20 6 9 17 4 12"></polyline></svg>}
            </div>
            <label style={{ margin: 0, fontSize: '12px', color: '#888', cursor: 'pointer' }}>Remind me to take progress measurements</label>
          </div>
        </div>

        {/* Footer Buttons */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
          {editingSession && onDelete && (
            <button 
              onClick={() => setShowDeleteAlert(true)}
              style={{ 
                flex: '0 0 100px', backgroundColor: '#331111', padding: '16px', 
                borderRadius: '16px', border: '1px solid #552222', color: '#FF4444', 
                fontWeight: '800', fontSize: '14px', cursor: 'pointer'
              }}
            >
              Delete
            </button>
          )}
          <button 
            onClick={handleSave}
            style={{ 
              flex: 1, backgroundColor: '#FFD700', padding: '16px', 
              borderRadius: '16px', border: 'none', color: '#000', 
              fontWeight: '900', fontSize: '16px', cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(255,215,0,0.2)'
            }}
          >
            Save Session
          </button>
        </div>
      </div>
      <AppAlert
        visible={showDeleteAlert}
        title="Delete Session"
        message="Are you sure you want to delete this session? This action cannot be undone."
        onConfirm={() => {
          if (editingSession?.id) {
            onDelete!(editingSession.id);
            setShowDeleteAlert(false);
          }
        }}
        onCancel={() => setShowDeleteAlert(false)}
      />
    </div>,
    document.body
  );
}
