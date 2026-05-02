import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './ScheduleCalendarModal.css';
import { useHaptic } from '../../hooks/useHaptic';
import { useSoundFeedback } from '../../hooks/useSoundFeedback';

type EditablePlan = {
  id: string;
  title: string;
  goal: string;
};

interface EditPlanModalProps {
  visible: boolean;
  onClose: () => void;
  plan: EditablePlan | null;
  onSave: (id: string, data: { title: string, goal: string }) => Promise<void> | void;
}

export default function EditPlanModal({ visible, onClose, plan, onSave }: EditPlanModalProps) {
  const [title, setTitle] = useState('');
  const [goal, setGoal] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [titleInvalid, setTitleInvalid] = useState(false);
  const haptic = useHaptic();
  const { playConfirm, playError } = useSoundFeedback();

  useEffect(() => {
    if (plan) {
      setTitle(plan.title || '');
      setGoal(plan.goal || '');
    }
  }, [plan]);

  useEffect(() => {
    if (!visible) {
      setSaveState('idle');
      setTitleInvalid(false);
    }
  }, [visible]);

  const handleSave = async () => {
    if (!plan) {
      return;
    }

    haptic.medium();

    if (!title.trim()) {
      setTitleInvalid(true);
      playError();
      return;
    }

    setTitleInvalid(false);
    setSaveState('saving');

    try {
      await onSave(plan.id, { title, goal });
      playConfirm();
      setSaveState('saved');
      window.setTimeout(() => {
        setSaveState('idle');
        onClose();
      }, 1500);
    } catch {
      playError();
      setSaveState('idle');
    }
  };

  if (!visible || !plan) return null;

  return createPortal(
    <div className="uc-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div className="uc-modal" onClick={e => e.stopPropagation()}>
        <div className="uc-header">
          <div>
            <h2 className="uc-title" style={{ color: '#FFD700' }}>Edit Plan Details</h2>
          </div>
          <button className="uc-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div className="uc-body">
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
              placeholder="Plan Title"
            />
          </div>

          <div className="uc-form-group" style={{ marginTop: '28px' }}>
            <label className="uc-label">Primary Goal / Focus</label>
            <textarea 
              className="uc-textarea" 
              value={goal} 
              onChange={e => setGoal(e.target.value)} 
              placeholder="Describe the main goal for this plan"
              rows={4}
            />
          </div>
        </div>

        <div className="uc-footer" style={{ marginTop: '32px' }}>
          <button 
            className="uc-btn uc-btn--yellow" 
            style={{ width: '100%' }}
            onClick={() => void handleSave()}
            disabled={saveState === 'saving'}
          >
            {saveState === 'saving' ? 'Saving...' : saveState === 'saved' ? 'Saved ✓' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
