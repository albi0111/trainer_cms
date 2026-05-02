// ─────────────────────────────────────────────────────────────────────────────
// CompleteSessionModal — Difficulty + Energy + Performance Notes
// Reference: user screenshots
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import './CompleteSessionModal.css';
import { useHaptic } from '../../hooks/useHaptic';

export interface CompleteSessionData {
  difficulty: number;
  energy: number;
  performanceNotes: string;
}

interface CompleteSessionModalProps {
  visible: boolean;
  sessionFocus?: string;
  onClose: () => void;
  onConfirm: (data: CompleteSessionData) => void;
}

export default function CompleteSessionModal({
  visible,
  sessionFocus,
  onClose,
  onConfirm,
}: CompleteSessionModalProps) {
  const [difficulty, setDifficulty] = useState('1');
  const [energy, setEnergy] = useState('3');
  const [notes, setNotes] = useState('');
  const haptic = useHaptic();

  // Reset on open
  useEffect(() => {
    if (visible) {
      setDifficulty('1');
      setEnergy('3');
      setNotes('');
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visible, onClose]);

  if (!visible) return null;

  const handleConfirm = () => {
    haptic.medium();
    onConfirm({
      difficulty: Math.min(10, Math.max(1, parseInt(difficulty) || 1)),
      energy: Math.min(10, Math.max(1, parseInt(energy) || 1)),
      performanceNotes: notes.trim(),
    });
  };

  return (
    <div className="complete-modal__overlay" onClick={onClose}>
      <div className="complete-modal__box" onClick={e => e.stopPropagation()}>
        <div className="complete-modal__header">
          <span className="complete-modal__title">
            {sessionFocus ? `Complete Session` : 'Complete Session'}
          </span>
          <button className="complete-modal__close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Difficulty + Energy inputs side by side */}
        <div className="complete-modal__row">
          <div className="complete-modal__field">
            <label className="complete-modal__label">Difficulty (1-10)</label>
            <input
              className="complete-modal__input"
              type="number"
              min="1"
              max="10"
              value={difficulty}
              onChange={e => setDifficulty(e.target.value)}
              inputMode="numeric"
            />
          </div>
          <div className="complete-modal__field">
            <label className="complete-modal__label">Energy (1-10)</label>
            <input
              className="complete-modal__input"
              type="number"
              min="1"
              max="10"
              value={energy}
              onChange={e => setEnergy(e.target.value)}
              inputMode="numeric"
            />
          </div>
        </div>

        {/* Performance Notes */}
        <div className="complete-modal__notes-label">Performance Notes</div>
        <textarea
          className="complete-modal__textarea"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="performance good&#10;dead lift - 3x(8, 10, 12)&#10;push up - 3x15"
        />

        {/* Green Confirm Button */}
        <button className="complete-modal__confirm-btn" onClick={handleConfirm}>
          Confirm Completion
        </button>
      </div>
    </div>
  );
}
