import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './ScheduleCalendarModal.css'; // Reusing modal styles
import { useHaptic } from '../../hooks/useHaptic';
import { useSoundFeedback } from '../../hooks/useSoundFeedback';
import { useModalVelocityDismiss } from '../../hooks/useSwipeGesture';

interface AddPlanModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: { type: 'monthly' | 'weekly', title: string, goal: string }) => Promise<void> | void;
}

export default function AddPlanModal({ visible, onClose, onSave }: AddPlanModalProps) {
  const [type, setType] = useState<'monthly' | 'weekly'>('monthly');
  const [title, setTitle] = useState('');
  const [goal, setGoal] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [titleInvalid, setTitleInvalid] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const haptic = useHaptic();
  const { playConfirm, playError } = useSoundFeedback();

  useModalVelocityDismiss({
    visible,
    onClose,
    overlayRef,
    sheetRef: modalRef,
  });

  useEffect(() => {
    if (!visible) {
      setSaveState('idle');
      setTitleInvalid(false);
    }
  }, [visible]);

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

  const handleSave = async () => {
    haptic.medium();

    if (!title.trim()) {
      setTitleInvalid(true);
      playError();
      return;
    }

    setTitleInvalid(false);
    setSaveState('saving');

    try {
      await onSave({ type, title, goal });
      playConfirm();
      setSaveState('saved');
      window.setTimeout(() => {
        setTitle('');
        setGoal('');
        setSaveState('idle');
        onClose();
      }, 1500);
    } catch {
      playError();
      setSaveState('idle');
    }
  };

  return createPortal(
    <div
      ref={overlayRef}
      className="uc-overlay"
      data-state={visible ? 'open' : 'closed'}
      data-opening={isOpening ? 'true' : 'false'}
      onClick={onClose}
    >
      <div ref={modalRef} className="uc-modal" onClick={e => e.stopPropagation()}>
        <div className="uc-header">
          <h2 className="uc-title">Add New Plan</h2>
          <button className="uc-close-btn" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div className="uc-body">
          <div className="uc-form-group">
            <label className="uc-label">Plan Frequency</label>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
              <button 
                type="button"
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: type === 'monthly' ? '#FFD700' : '#2A2A2A', color: type === 'monthly' ? '#000' : '#FFF', fontWeight: type === 'monthly' ? 'bold' : 'normal', cursor: 'pointer' }}
                onClick={() => setType('monthly')}
              >
                Monthly (Auto 4-Weeks)
              </button>
              <button 
                type="button"
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: type === 'weekly' ? '#FFD700' : '#2A2A2A', color: type === 'weekly' ? '#000' : '#FFF', fontWeight: type === 'weekly' ? 'bold' : 'normal', cursor: 'pointer' }}
                onClick={() => setType('weekly')}
              >
                Standalone Weekly
              </button>
            </div>
          </div>

          <div className="uc-form-group">
            <label className="uc-label">Title</label>
            <input 
              type="text"
              className={`uc-input ${titleInvalid ? 'input-shake' : ''}`}
              value={title} 
              onChange={e => {
                setTitle(e.target.value);
                if (titleInvalid && e.target.value.trim()) {
                  setTitleInvalid(false);
                }
              }}
              placeholder="e.g. Hypertrophy Phase 1"
            />
          </div>

          <div className="uc-form-group">
            <label className="uc-label">Primary Goal / Focus</label>
            <input 
              type="text" 
              className="uc-input" 
              value={goal} 
              onChange={e => setGoal(e.target.value)} 
              placeholder="e.g. Build mass, increase volume"
            />
          </div>
        </div>

        <div className="uc-footer">
          <button 
            className="uc-btn uc-btn--yellow" 
            style={{ width: '100%' }}
            onClick={() => void handleSave()}
            disabled={saveState === 'saving'}
          >
            {saveState === 'saving' ? 'Saving...' : saveState === 'saved' ? 'Saved ✓' : 'Create Plan'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
