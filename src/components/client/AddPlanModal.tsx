import { useState } from 'react';
import { createPortal } from 'react-dom';
import './ScheduleCalendarModal.css'; // Reusing modal styles

interface AddPlanModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: { type: 'monthly' | 'weekly', title: string, goal: string }) => void;
}

export default function AddPlanModal({ visible, onClose, onSave }: AddPlanModalProps) {
  const [type, setType] = useState<'monthly' | 'weekly'>('monthly');
  const [title, setTitle] = useState('');
  const [goal, setGoal] = useState('');

  if (!visible) return null;

  return createPortal(
    <div className="uc-overlay" onClick={onClose}>
      <div className="uc-modal" onClick={e => e.stopPropagation()}>
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
              className="uc-input" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
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
            onClick={() => {
              if (title.trim()) {
                onSave({ type, title, goal });
                setTitle('');
                setGoal('');
              }
            }}
          >
            Create Plan
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
