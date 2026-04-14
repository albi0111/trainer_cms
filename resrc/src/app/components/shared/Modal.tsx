import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { motion } from 'motion/react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: string;
  hideHeader?: boolean;
}

export function Modal({ isOpen, onClose, title, children, maxWidth = '540px', hideHeader = false }: ModalProps) {
  const { t } = useTheme();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: t.bgOverlay,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        style={{
          background: t.bgCard,
          borderRadius: '16px',
          border: `1px solid ${t.border}`,
          boxShadow: `0 24px 64px ${t.shadow}`,
          width: '100%',
          maxWidth,
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        {!hideHeader && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '20px 24px 0',
          }}>
            {title && (
              <span style={{ fontSize: '16px', fontWeight: 600, color: t.text }}>{title}</span>
            )}
            <button
              onClick={onClose}
              style={{
                marginLeft: 'auto',
                background: t.bgInput,
                border: `1px solid ${t.border}`,
                borderRadius: '8px',
                width: '32px', height: '32px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
                color: t.textMuted,
              }}
            >
              <X size={16} />
            </button>
          </div>
        )}
        <div style={{ padding: hideHeader ? '24px' : '16px 24px 24px' }}>
          {children}
        </div>
      </motion.div>
    </div>
  );
}
