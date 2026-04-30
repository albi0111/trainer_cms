// ─────────────────────────────────────────────────────────────────────────────
// ConfirmationModal — Type-aware confirmation dialog
// Reference: /reference/components/modals/ConfirmationModal.tsx
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect } from 'react';
import './ConfirmationModal.css';

export type ConfirmationType = 'danger' | 'warning' | 'info' | 'success';

interface ConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: ConfirmationType;
}

const TYPE_CONFIG: Record<ConfirmationType, { color: string; bg: string; border: string; icon: React.ReactNode }> = {
  danger: {
    color: '#FF5252',
    bg: 'rgba(255, 82, 82, 0.1)',
    border: 'rgba(255, 82, 82, 0.2)',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FF5252" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      </svg>
    ),
  },
  warning: {
    color: '#FFD700',
    bg: 'rgba(255, 215, 0, 0.1)',
    border: 'rgba(255, 215, 0, 0.2)',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
    ),
  },
  info: {
    color: '#3498db',
    bg: 'rgba(52, 152, 219, 0.1)',
    border: 'rgba(52, 152, 219, 0.2)',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3498db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
      </svg>
    ),
  },
  success: {
    color: '#3DCC88',
    bg: 'rgba(61, 204, 136, 0.1)',
    border: 'rgba(61, 204, 136, 0.2)',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3DCC88" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
    ),
  },
};

export default function ConfirmationModal({
  visible,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger',
}: ConfirmationModalProps) {
  const config = TYPE_CONFIG[type] || TYPE_CONFIG.danger;

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (visible) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [visible]);

  // Close on Escape
  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <div className="confirmation-modal__overlay" onClick={onClose}>
      <div className="confirmation-modal__container" onClick={e => e.stopPropagation()}>
        <div
          className="confirmation-modal__icon-circle"
          style={{ backgroundColor: config.bg, borderColor: config.border }}
        >
          {config.icon}
        </div>

        <h2 className="confirmation-modal__title">{title}</h2>
        <p className="confirmation-modal__message">{message}</p>

        <div className="confirmation-modal__footer">
          <button className="confirmation-modal__cancel-btn" onClick={onClose}>
            <span className="confirmation-modal__cancel-text">{cancelText}</span>
          </button>
          <button
            className="confirmation-modal__confirm-btn"
            style={{ backgroundColor: config.color }}
            onClick={onConfirm}
          >
            <span className="confirmation-modal__confirm-text">{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
