import { useState, useCallback, useEffect, useRef, type PointerEvent } from 'react';
import { createPortal } from 'react-dom';
import './NewSessionModal.css';
import AppDatePicker from '../shared/AppDatePicker';
import AppTimePicker from '../shared/AppTimePicker';
import AppAlert from '../shared/AppAlert';
import EmptyState from '../ui/EmptyState';
import { useHaptic } from '../../hooks/useHaptic';
import { useSoundFeedback } from '../../hooks/useSoundFeedback';
import { useModalVelocityDismiss } from '../../hooks/useSwipeGesture';
import { Session } from '../../types';
import { getSessionExercises } from '../../services/sessionService';

interface ExerciseDraft {
  id: string;
  name: string;
  reps: string;
}

interface SessionSaveDraft {
  id?: string;
  date: string;
  start_time: string;
  end_time: string;
  focus: string;
  postponed_note: string;
  exercises: ExerciseDraft[];
  measure_reminder: boolean;
}

interface NewSessionModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: SessionSaveDraft) => Promise<void> | void;
  onDelete?: (sessionId: string) => void;
  initialDate: string;
  initialTime: string;
  editingSession?: Session | null;
  sessions: Array<Session & { client_name?: string }>;
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
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [timeInvalid, setTimeInvalid] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [draggingExerciseId, setDraggingExerciseId] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<{
    pointerId: number;
    exerciseId: string;
    startY: number;
    active: boolean;
    timeoutId: number;
  } | null>(null);
  const haptic = useHaptic();
  const { playError } = useSoundFeedback();

  useModalVelocityDismiss({
    visible,
    onClose,
    overlayRef,
    sheetRef: dialogRef,
    enabled: false,
  });

  useEffect(() => {
    if (editingSession) {
      setDate(editingSession.date || '');
      setStartTime(editingSession.start_time || '');
      setEndTime(editingSession.end_time || '');
      setFocus(editingSession.focus || '');
      setPostponeReason(editingSession.postponed_note || '');
      setRemind(editingSession.measure_reminder || false);
      
      // Fetch exercises for this session
      void getSessionExercises(editingSession.id).then((exs) => {
        setExercises(exs.map(e => ({
          id: e.id,
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

    setError(null);
    setSaveState('idle');
    setTimeInvalid(false);
  }, [initialDate, initialTime, visible, editingSession]);

  useEffect(() => {
    if (!visible) {
      setIsOpening(false);
      return;
    }

    setIsOpening(true);
    const timeout = window.setTimeout(() => {
      setIsOpening(false);
    }, 200);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [visible]);

  const modalTitle = postponeMode
    ? 'Postpone Session'
    : editingSession
      ? 'Edit Session'
      : 'New Session';
  const modalSubtitle = postponeMode
    ? 'Move this session to a new slot and keep the reason attached.'
    : editingSession
      ? 'Update the time, focus, and exercise details.'
      : 'Schedule a session with the right time and workout focus.';

  const addExercise = () => {
    setExercises([...exercises, { id: Math.random().toString(), name: '', reps: '' }]);
  };

  const updateExercise = (id: string, field: keyof ExerciseDraft, value: string) => {
    setExercises(exercises.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const removeExercise = (id: string) => {
    setExercises(exercises.filter(e => e.id !== id));
  };

  const reorderExercise = useCallback((draggedId: string, targetId: string) => {
    if (draggedId === targetId) {
      return;
    }

    setExercises((current) => {
      const fromIndex = current.findIndex((exercise) => exercise.id === draggedId);
      const toIndex = current.findIndex((exercise) => exercise.id === targetId);

      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
        return current;
      }

      const next = [...current];
      const [dragged] = next.splice(fromIndex, 1);
      if (!dragged) {
        return current;
      }
      next.splice(toIndex, 0, dragged);
      return next;
    });
  }, []);

  const finishExerciseDrag = useCallback(() => {
    const dragState = dragHandleRef.current;
    if (dragState) {
      window.clearTimeout(dragState.timeoutId);
    }
    dragHandleRef.current = null;
    setDraggingExerciseId(null);
  }, []);

  const handleExerciseDragStart = useCallback((exerciseId: string, event: PointerEvent<HTMLButtonElement>) => {
    if (exercises.length < 2) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    const timeoutId = window.setTimeout(() => {
      if (dragHandleRef.current?.pointerId !== event.pointerId) {
        return;
      }

      dragHandleRef.current.active = true;
      setDraggingExerciseId(exerciseId);
      haptic.light();
    }, 140);

    dragHandleRef.current = {
      pointerId: event.pointerId,
      exerciseId,
      startY: event.clientY,
      active: false,
      timeoutId,
    };
  }, [exercises.length, haptic]);

  const handleExerciseDragMove = useCallback((event: PointerEvent<HTMLButtonElement>) => {
    const dragState = dragHandleRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    if (!dragState.active && Math.abs(event.clientY - dragState.startY) > 8) {
      window.clearTimeout(dragState.timeoutId);
      dragState.active = true;
      setDraggingExerciseId(dragState.exerciseId);
      haptic.light();
    }

    if (!dragState.active) {
      return;
    }

    const target = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>('[data-session-exercise-id]');
    const targetId = target?.dataset.sessionExerciseId;

    if (!targetId || targetId === dragState.exerciseId) {
      return;
    }

    reorderExercise(dragState.exerciseId, targetId);
  }, [haptic, reorderExercise]);


  const handleSave = async () => {
    haptic.medium();
    // Overlap validation
    const startTimeNum = parseInt(startTime.replace(':', ''));
    const endTimeNum = parseInt(endTime.replace(':', ''));

    const overlappingSession = sessions.find((session) => {
      if (session.date !== date) return false;
      if (editingSession && session.id === editingSession.id) return false;
      
      const sessionStart = parseInt((session.start_time || '00:00').replace(':', ''));
      const sessionEnd = parseInt((session.end_time || '00:00').replace(':', ''));
      
      return (startTimeNum < sessionEnd && endTimeNum > sessionStart);
    });

    if (overlappingSession) {
      playError();
      setTimeInvalid(true);
      setError(
        overlappingSession.client_name
          ? `This time overlaps with ${overlappingSession.client_name}'s session.`
          : 'This session overlaps with another scheduled session.',
      );
      return;
    }

    try {
      setTimeInvalid(false);
      setSaveState('saving');
      await onSave({
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
      setSaveState('saved');
    } catch (saveError) {
      playError();
      setSaveState('idle');
      setError(saveError instanceof Error ? saveError.message : 'Failed to save session.');
    }
  };

  return createPortal(
    <div
      ref={overlayRef}
      className="session-modal__overlay"
      data-state={visible ? 'open' : 'closed'}
      data-opening={isOpening ? 'true' : 'false'}
    >
      <div ref={dialogRef} className="session-modal__dialog" onClick={e => e.stopPropagation()}>
        <div className="session-modal__header">
          <div className="session-modal__title-group">
            <h2 className="session-modal__title">{modalTitle}</h2>
            <p className="session-modal__subtitle">{modalSubtitle}</p>
          </div>
          <button type="button" className="session-modal__close" onClick={onClose} aria-label="Close session editor">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {error && (
          <div className="session-modal__error" role="alert">
            {error}
          </div>
        )}

        <div className="session-modal__content">
          <div className="session-modal__form">
            <div className="session-modal__field">
              <AppDatePicker label="Date" value={date} onChange={setDate} />
            </div>

            <div className="session-modal__row">
              <div className="session-modal__field">
                <div className={timeInvalid ? 'input-shake' : ''}>
                  <AppTimePicker label="Start Time" value={startTime} onChange={setStartTime} />
                </div>
              </div>
              <div className="session-modal__field">
                <div className={timeInvalid ? 'input-shake' : ''}>
                  <AppTimePicker label="End Time" value={endTime} onChange={setEndTime} />
                </div>
              </div>
            </div>

            <div className="session-modal__field">
              <label className="session-modal__label" htmlFor="session-focus">Focus / Goal</label>
              <input
                id="session-focus"
                className="session-modal__input"
                type="text"
                value={focus}
                onChange={e => setFocus(e.target.value)}
                placeholder="e.g. Chest & Triceps"
              />
            </div>

            {postponeMode && (
              <div className="session-modal__field">
                <label className="session-modal__label" htmlFor="postpone-reason">Postpone Reason / Explanation</label>
                <textarea
                  id="postpone-reason"
                  className="session-modal__textarea"
                  value={postponeReason}
                  onChange={e => setPostponeReason(e.target.value)}
                  placeholder="Explain why this session is being postponed..."
                  rows={3}
                />
              </div>
            )}

            <section className="session-modal__section" aria-label="Exercises">
              <div className="session-modal__section-header">
                <label className="session-modal__section-title">Exercises</label>
                <button type="button" className="session-modal__add" onClick={addExercise}>
                  + Add
                </button>
              </div>

              <div className="session-modal__exercise-list">
                {exercises.length === 0 && (
                  <div className="session-modal__empty">
                    <EmptyState message="No exercises added yet." />
                  </div>
                )}
                {exercises.map(ex => (
                  <div
                    key={ex.id}
                    className={`session-modal__exercise-row ${draggingExerciseId === ex.id ? 'is-dragging' : ''}`}
                    data-session-exercise-id={ex.id}
                  >
                    <button
                      type="button"
                      className="session-modal__drag-handle"
                      aria-label={`Reorder ${ex.name || 'exercise'}`}
                      title="Reorder exercise"
                      onPointerDown={(event) => handleExerciseDragStart(ex.id, event)}
                      onPointerMove={handleExerciseDragMove}
                      onPointerUp={finishExerciseDrag}
                      onPointerCancel={finishExerciseDrag}
                    >
                      <span aria-hidden="true" />
                      <span aria-hidden="true" />
                      <span aria-hidden="true" />
                      <span aria-hidden="true" />
                      <span aria-hidden="true" />
                      <span aria-hidden="true" />
                    </button>
                    <input
                      className="session-modal__input session-modal__exercise-name"
                      type="text"
                      placeholder="Exercise name"
                      value={ex.name}
                      onChange={e => updateExercise(ex.id, 'name', e.target.value)}
                    />
                    <input
                      className="session-modal__input session-modal__exercise-reps"
                      type="text"
                      placeholder="3x10"
                      value={ex.reps}
                      onChange={e => updateExercise(ex.id, 'reps', e.target.value)}
                    />
                    <button
                      type="button"
                      className="session-modal__remove"
                      onClick={() => removeExercise(ex.id)}
                      aria-label={`Remove ${ex.name || 'exercise'}`}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <button
              type="button"
              className={`session-modal__checkbox ${remind ? 'is-active' : ''}`}
              onClick={() => setRemind(!remind)}
              aria-pressed={remind}
            >
              <span className="session-modal__checkbox-input" aria-hidden="true">
                {remind && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                )}
              </span>
              <span className="session-modal__checkbox-label">Remind me to take progress measurements</span>
            </button>
          </div>
        </div>

        <div className="session-modal__footer">
          {editingSession && onDelete && (
            <button
              type="button"
              className="session-modal__delete"
              onClick={() => setShowDeleteAlert(true)}
            >
              Delete
            </button>
          )}
          <button
            type="button"
            className="session-modal__save"
            onClick={() => void handleSave()}
            disabled={saveState === 'saving'}
          >
            {saveState === 'saving' ? 'Saving...' : saveState === 'saved' ? 'Saved ✓' : 'Save Session'}
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
