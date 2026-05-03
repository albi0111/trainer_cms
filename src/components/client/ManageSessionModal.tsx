// ─────────────────────────────────────────────────────────────────────────────
// ManageSessionModal — Mark Complete / Postpone / Mark as Missed
// Reference: user screenshots
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import './ManageSessionModal.css';
import { useModalVelocityDismiss } from '../../hooks/useSwipeGesture';

interface ManageSessionModalProps {
  visible: boolean;
  onClose: () => void;
  onMarkComplete: () => void;
  onPostpone: () => void;
  onMarkMissed: () => void;
}

export default function ManageSessionModal({
  visible,
  onClose,
  onMarkComplete,
  onPostpone,
  onMarkMissed,
}: ManageSessionModalProps) {
  const [loadingComplete, setLoadingComplete] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useModalVelocityDismiss({
    visible,
    onClose,
    overlayRef,
    sheetRef: boxRef,
  });

  useEffect(() => {
    if (!visible) setLoadingComplete(false);
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visible, onClose]);

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

  const handleComplete = () => {
    setLoadingComplete(true);
    setTimeout(() => {
      setLoadingComplete(false);
      onMarkComplete();
    }, 400);
  };

  return (
    <div
      ref={overlayRef}
      className="manage-modal__overlay"
      data-state={visible ? 'open' : 'closed'}
      data-opening={isOpening ? 'true' : 'false'}
      onClick={onClose}
    >
      <div ref={boxRef} className="manage-modal__box" onClick={e => e.stopPropagation()}>
        <div className="manage-modal__header">
          <span className="manage-modal__title">Manage Session</span>
          <button className="manage-modal__close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Mark Complete */}
        <button className="manage-modal__item" onClick={handleComplete}>
          <div className="manage-modal__item-icon manage-modal__item-icon--complete">
            {loadingComplete ? (
              <div style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: '#555' }} />
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            )}
          </div>
          <div className="manage-modal__item-text">
            <div className={`manage-modal__item-label manage-modal__item-label--default ${loadingComplete ? 'manage-modal__item-label--dimmed' : ''}`}
              style={loadingComplete ? { color: '#666' } : undefined}>
              Mark Complete
            </div>
            <div className="manage-modal__item-sublabel">Log sets, reps, and results</div>
          </div>
          {loadingComplete && <div className="manage-modal__spinner" />}
        </button>

        {/* Postpone Session */}
        <button className="manage-modal__item" onClick={onPostpone}>
          <div className="manage-modal__item-icon manage-modal__item-icon--postpone">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
          <div className="manage-modal__item-text">
            <div className="manage-modal__item-label manage-modal__item-label--default">Postpone Session</div>
            <div className="manage-modal__item-sublabel">Pick a new slot from calendar</div>
          </div>
        </button>

        {/* Mark as Missed */}
        <button className="manage-modal__item" onClick={onMarkMissed}>
          <div className="manage-modal__item-icon manage-modal__item-icon--missed">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FF5252" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
          </div>
          <div className="manage-modal__item-text">
            <div className="manage-modal__item-label manage-modal__item-label--missed">Mark as Missed</div>
            <div className="manage-modal__item-sublabel">Record absence or cancellation</div>
          </div>
        </button>
      </div>
    </div>
  );
}
