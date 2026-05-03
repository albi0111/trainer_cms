// ─────────────────────────────────────────────────────────────────────────────
// MarkMissedModal — Reason pills + optional note + red confirm + Back
// Reference: user screenshots
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import './MarkMissedModal.css';
import { useSoundFeedback } from '../../hooks/useSoundFeedback';
import { useModalVelocityDismiss, usePrefersReducedMotion } from '../../hooks/useSwipeGesture';

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
  onConfirm: (data: MarkMissedData) => Promise<boolean>;
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
  const [isOpening, setIsOpening] = useState(false);
  const [submitState, setSubmitState] = useState<'idle' | 'saving' | 'success'>('idle');
  const overlayRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<number | null>(null);
  const { playError } = useSoundFeedback();
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
    enabled: canDismiss,
  });

  useEffect(() => {
    if (visible) {
      setReason('travel');
      setNote('');
      setNoteInvalid(false);
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
    if (!visible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && canDismiss) {
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [canDismiss, onClose, visible]);

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

  const canConfirm = reason !== 'other' || note.trim().length > 0;
  const handleDismiss = () => {
    if (canDismiss) {
      onClose();
    }
  };

  const handleBack = () => {
    if (canDismiss) {
      onBack();
    }
  };

  const handleConfirm = async () => {
    if (submitState !== 'idle') {
      return;
    }

    if (!canConfirm) {
      setNoteInvalid(true);
      playError();
      return;
    }

    setSubmitState('saving');
    const didMiss = await onConfirm({ reason, note });

    if (!didMiss) {
      setSubmitState('idle');
      return;
    }

    setSubmitState('success');
    closeTimeoutRef.current = window.setTimeout(() => {
      onClose();
    }, prefersReducedMotion ? 0 : 420);
  };

  return (
    <div
      ref={overlayRef}
      className="missed-modal__overlay"
      data-state={visible ? 'open' : 'closed'}
      data-opening={isOpening ? 'true' : 'false'}
      data-success-exit={submitState === 'success' ? 'true' : 'false'}
      onClick={handleDismiss}
    >
      <div ref={boxRef} className="missed-modal__box" onClick={e => e.stopPropagation()}>
        <div className="missed-modal__header">
          <span className="missed-modal__title">Mark Missed</span>
          <button className="missed-modal__close" onClick={handleDismiss} disabled={!canDismiss}>
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
          className={`missed-modal__confirm-btn missed-modal__confirm-btn--${submitState}`}
          onClick={() => {
            void handleConfirm();
          }}
          disabled={!canConfirm || submitState !== 'idle'}
          style={!canConfirm ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
        >
          <span className="missed-modal__confirm-btn-content">
            <span className="missed-modal__confirm-btn-label">
              {submitState === 'saving'
                ? 'Saving...'
                : submitState === 'success'
                  ? 'Missed Recorded'
                  : 'Confirm Missed'}
            </span>
            <span className="missed-modal__confirm-btn-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line className="missed-modal__confirm-btn-path" pathLength="100" x1="18" y1="6" x2="6" y2="18" />
                <line className="missed-modal__confirm-btn-path" pathLength="100" x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </span>
          </span>
          <span className="missed-modal__confirm-ring" aria-hidden="true" />
        </button>

        {/* Back */}
        <button className="missed-modal__back-btn" onClick={handleBack} disabled={!canDismiss}>
          Back
        </button>
      </div>
    </div>
  );
}
