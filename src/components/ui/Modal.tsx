import { useEffect, useRef, useState } from 'react';
import './Modal.css';
import { useModalVelocityDismiss } from '../../hooks/useSwipeGesture';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

const MODAL_OPENING_MS = 200;
const MODAL_CLOSING_MS = 280;

export default function Modal({ open, onClose, title, children, footer, className }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<number | null>(null);
  const openingTimeoutRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);
  const [isActive, setIsActive] = useState(open);
  const [isOpening, setIsOpening] = useState(false);

  useModalVelocityDismiss({
    visible: open,
    onClose,
    overlayRef: dialogRef,
    sheetRef: contentRef,
    overlayMode: 'dialog-backdrop',
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }

    if (openingTimeoutRef.current !== null) {
      window.clearTimeout(openingTimeoutRef.current);
      openingTimeoutRef.current = null;
    }

    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    if (open) {
      if (!dialog.open) {
        dialog.showModal();
      }

      setIsOpening(true);
      frameRef.current = window.requestAnimationFrame(() => {
        setIsActive(true);
        frameRef.current = null;
      });
      openingTimeoutRef.current = window.setTimeout(() => {
        setIsOpening(false);
        openingTimeoutRef.current = null;
      }, MODAL_OPENING_MS);
      document.body.style.overflow = 'hidden';
    } else {
      setIsOpening(false);
      setIsActive(false);
      if (dialog.open) {
        closeTimeoutRef.current = window.setTimeout(() => {
          if (dialog.open) {
            dialog.close();
          }
          document.body.style.overflow = '';
          closeTimeoutRef.current = null;
        }, MODAL_CLOSING_MS);
      } else {
        document.body.style.overflow = '';
      }
    }

    return () => {
      if (closeTimeoutRef.current !== null) {
        window.clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }

      if (openingTimeoutRef.current !== null) {
        window.clearTimeout(openingTimeoutRef.current);
        openingTimeoutRef.current = null;
      }

      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }

      if (!open && dialog.open) {
        dialog.close();
      }
      document.body.style.overflow = '';
    };
  }, [open]);

  const handleBackdropClick = (event: React.MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className={`modal ${className || ''}`}
      data-state={isActive ? 'open' : 'closed'}
      data-opening={isOpening ? 'true' : 'false'}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={handleBackdropClick}
    >
      <div ref={contentRef} className="modal__content">
        {title && (
          <div className="modal__header">
            <h2 className="modal__title">{title}</h2>
            <button className="modal__close" onClick={onClose} aria-label="Close">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 2L14 14M14 2L2 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )}
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__footer">{footer}</div>}
      </div>
    </dialog>
  );
}
