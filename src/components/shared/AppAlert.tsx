import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import './AppAlert.css';

type AppAlertVariant = 'danger' | 'info' | 'warning' | 'success';

interface AppAlertProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: AppAlertVariant;
  icon?: React.ReactNode;
  confirmLoading?: boolean;
  confirmDisabled?: boolean;
  preventClose?: boolean;
  children?: React.ReactNode;
}

const APP_ALERT_OPENING_MS = 200;

const DEFAULT_ICONS: Record<AppAlertVariant, React.ReactNode> = {
  danger: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      <line x1="10" y1="11" x2="10" y2="17"></line>
      <line x1="14" y1="11" x2="14" y2="17"></line>
    </svg>
  ),
  info: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="16" x2="12" y2="12"></line>
      <line x1="12" y1="8" x2="12.01" y2="8"></line>
    </svg>
  ),
  warning: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 18a4 4 0 1 1 .8-7.92A5.5 5.5 0 0 1 18.5 12a3.5 3.5 0 1 1 .5 6H7z"></path>
      <path d="M12 8v4"></path>
      <path d="M12 16h.01"></path>
    </svg>
  ),
  success: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
  ),
};

export default function AppAlert({
  visible,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'danger',
  icon,
  confirmLoading = false,
  confirmDisabled = false,
  preventClose = false,
  children,
}: AppAlertProps) {
  const [isOpening, setIsOpening] = useState(false);

  const resolvedIcon = icon || DEFAULT_ICONS[variant];
  const handleCancel = () => {
    if (preventClose || confirmLoading) {
      return;
    }
    onCancel();
  };

  useEffect(() => {
    if (!visible) {
      setIsOpening(false);
      return;
    }

    setIsOpening(true);
    const timeout = window.setTimeout(() => {
      setIsOpening(false);
    }, APP_ALERT_OPENING_MS);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [visible]);

  return createPortal(
    <div
      className="aa-overlay"
      data-state={visible ? 'open' : 'closed'}
      data-opening={isOpening ? 'true' : 'false'}
      onClick={handleCancel}
    >
      <div className="aa-modal" onClick={e => e.stopPropagation()}>
        <div className="aa-icon-container">
          <div className={`aa-icon-circle ${variant}`}>
            {resolvedIcon}
          </div>
        </div>

        <h2 className="aa-title">{title}</h2>
        <p className="aa-message">{message}</p>
        {children ? <div className="aa-content">{children}</div> : null}

        <div className="aa-actions">
          <button className="aa-btn aa-btn--secondary" onClick={handleCancel} disabled={confirmLoading}>
            {cancelLabel}
          </button>
          <button
            className={`aa-btn aa-btn--primary ${variant}`}
            onClick={onConfirm}
            disabled={confirmLoading || confirmDisabled}
          >
            {confirmLoading ? <span className="aa-btn__spinner" aria-hidden="true" /> : null}
            <span className={confirmLoading ? 'aa-btn__label aa-btn__label--hidden' : 'aa-btn__label'}>
              {confirmLabel}
            </span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
