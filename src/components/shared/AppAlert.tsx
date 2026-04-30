import { createPortal } from 'react-dom';
import './AppAlert.css';

interface AppAlertProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'info';
}

export default function AppAlert({
  visible,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'danger'
}: AppAlertProps) {
  if (!visible) return null;

  return createPortal(
    <div className="aa-overlay" onClick={onCancel}>
      <div className="aa-modal" onClick={e => e.stopPropagation()}>
        <div className="aa-icon-container">
          <div className={`aa-icon-circle ${variant}`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </div>
        </div>

        <h2 className="aa-title">{title}</h2>
        <p className="aa-message">{message}</p>

        <div className="aa-actions">
          <button className="aa-btn aa-btn--secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className={`aa-btn aa-btn--primary ${variant}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
