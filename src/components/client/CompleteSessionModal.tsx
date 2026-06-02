// ─────────────────────────────────────────────────────────────────────────────
// CompleteSessionModal — Difficulty + Energy + Performance Notes
// Reference: user screenshots
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './CompleteSessionModal.css';
import { useModalVelocityDismiss, usePrefersReducedMotion } from '../../hooks/useSwipeGesture';

export interface CompleteSessionData {
  difficulty: number;
  energy: number;
  performanceNotes: string;
}

interface CompleteSessionModalProps {
  visible: boolean;
  sessionFocus?: string;
  onClose: () => void;
  onConfirm: (data: CompleteSessionData) => Promise<boolean>;
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
  const [isOpening, setIsOpening] = useState(false);
  const [submitState, setSubmitState] = useState<'idle' | 'saving' | 'success'>('idle');
  const overlayRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<number | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  const canDismiss = submitState === 'idle';

  useModalVelocityDismiss({
    visible,
    onClose: () => {
      if (canDismiss) {
        onClose();
      }
    },
    overlayRef,
    sheetRef: boxRef,
    enabled: false,
  });

  // Reset on open
  useEffect(() => {
    if (visible) {
      setDifficulty('1');
      setEnergy('3');
      setNotes('');
      setSubmitState('idle');
      return;
    }

    if (closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, [visible]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current !== null) {
        window.clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

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

  const handleDismiss = () => {
    if (canDismiss) {
      onClose();
    }
  };

  const handleConfirm = async () => {
    if (submitState !== 'idle') {
      return;
    }

    setSubmitState('saving');
    const didComplete = await onConfirm({
      difficulty: Math.min(10, Math.max(1, Number.parseInt(difficulty, 10) || 1)),
      energy: Math.min(10, Math.max(1, Number.parseInt(energy, 10) || 1)),
      performanceNotes: notes.trim(),
    });

    if (!didComplete) {
      setSubmitState('idle');
      return;
    }

    setSubmitState('success');
    closeTimeoutRef.current = window.setTimeout(() => {
      onClose();
    }, prefersReducedMotion ? 0 : 600);
  };

  const modal = (
    <div
      ref={overlayRef}
      className="complete-modal__overlay"
      data-state={visible ? 'open' : 'closed'}
      data-opening={isOpening ? 'true' : 'false'}
      data-success-exit={submitState === 'success' ? 'true' : 'false'}
    >
      <div ref={boxRef} className="complete-modal__box" onClick={e => e.stopPropagation()}>
        <div className="complete-modal__header">
          <span className="complete-modal__title">
            {sessionFocus ? `Complete Session` : 'Complete Session'}
          </span>
          <button
            className="complete-modal__close"
            onClick={handleDismiss}
            disabled={!canDismiss}
            aria-label="Close complete session dialog"
          >
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
        <button
          className={`complete-modal__confirm-btn complete-modal__confirm-btn--${submitState}`}
          onClick={() => {
            void handleConfirm();
          }}
          disabled={submitState !== 'idle'}
        >
          <span className="complete-modal__confirm-btn-content">
            <span className="complete-modal__confirm-btn-label">
              {submitState === 'saving'
                ? 'Saving...'
                : submitState === 'success'
                  ? 'Completed'
                  : 'Confirm Completion'}
            </span>
            <span className="complete-modal__confirm-btn-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline className="complete-modal__confirm-btn-path" pathLength="100" points="20 6 9 17 4 12" />
              </svg>
            </span>
          </span>
          <span className="complete-modal__confirm-ring" aria-hidden="true" />
        </button>
      </div>
    </div>
  );

  if (typeof document === 'undefined') {
    return modal;
  }

  return createPortal(modal, document.body);
}
