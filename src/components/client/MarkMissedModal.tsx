// ─────────────────────────────────────────────────────────────────────────────
// MarkMissedModal — Reason pills + optional note + red confirm + Back
// Reference: user screenshots
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import './MarkMissedModal.css';
import { useHaptic } from '../../hooks/useHaptic';
import { useSoundFeedback } from '../../hooks/useSoundFeedback';

const REASONS = ['sick', 'travel', 'busy', 'no_show', 'other'] as const;
type Reason = typeof REASONS[number];

export interface MarkMissedData {
  reason: Reason;
  note: string;
}

interface MarkMissedModalProps {
  visible: boolean;
  onClose: () => void;
  onBack: () => void;
  onConfirm: (data: MarkMissedData) => void;
}

export default function MarkMissedModal({
  visible,
  onClose,
  onBack,
  onConfirm,
}: MarkMissedModalProps) {
  const [reason, setReason] = useState<Reason>('travel');
  const [note, setNote] = useState('');
  const [noteInvalid, setNoteInvalid] = useState(false);
  const haptic = useHaptic();
  const { playError } = useSoundFeedback();

  useEffect(() => {
    if (visible) {
      setReason('travel');
      setNote('');
      setNoteInvalid(false);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visible, onClose]);

  if (!visible) return null;

  const canConfirm = reason !== 'other' || note.trim().length > 0;
  const handleConfirm = () => {
    if (!canConfirm) {
      setNoteInvalid(true);
      playError();
      return;
    }

    haptic.medium();
    onConfirm({ reason, note });
  };

  return (
    <div className="missed-modal__overlay" onClick={onClose}>
      <div className="missed-modal__box" onClick={e => e.stopPropagation()}>
        <div className="missed-modal__header">
          <span className="missed-modal__title">Mark Missed</span>
          <button className="missed-modal__close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Reason */}
        <div className="missed-modal__label">Reason</div>
        <div className="missed-modal__pills">
          {REASONS.map(r => (
            <button
              key={r}
              className={`missed-modal__pill ${reason === r ? 'missed-modal__pill--active' : ''}`}
              onClick={() => setReason(r)}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Note */}
        <div className="missed-modal__note-label">Note (Required if 'other')</div>
        <textarea
          className={`missed-modal__textarea ${noteInvalid ? 'input-shake' : ''}`}
          value={note}
          onChange={e => {
            setNote(e.target.value);
            if (noteInvalid && e.target.value.trim()) {
              setNoteInvalid(false);
            }
          }}
          placeholder="Add a note..."
        />

        {/* Red Confirm */}
        <button
          className="missed-modal__confirm-btn"
          onClick={handleConfirm}
          style={!canConfirm ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
        >
          Confirm Missed
        </button>

        {/* Back */}
        <button className="missed-modal__back-btn" onClick={onBack}>
          Back
        </button>
      </div>
    </div>
  );
}
