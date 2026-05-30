import { useEffect, useRef } from 'react';
import AppRouter from './router';
import { useKeyboardHeight } from './hooks/useKeyboardHeight';
import { registerSessionAnimationOverlay } from './hooks/useSessionCompleteAnimation';
import { useAppStore } from './store/useAppStore';

export default function App() {
  const refreshSyncState = useAppStore((state) => state.refreshSyncState);
  const sessionAnimationOverlayRef = useRef<HTMLDivElement>(null);
  useKeyboardHeight();

  useEffect(() => {
    void refreshSyncState();
  }, [refreshSyncState]);

  useEffect(() => {
    try {
      if (navigator.storage?.persist) {
        void navigator.storage.persist();
      }
    } catch {
      // Silent fail when persistent storage is unavailable.
    }
  }, []);

  useEffect(() => {
    registerSessionAnimationOverlay(sessionAnimationOverlayRef.current);

    return () => {
      registerSessionAnimationOverlay(null);
    };
  }, []);

  return (
    <>
      <AppRouter />
      <div
        ref={sessionAnimationOverlayRef}
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 9999,
          opacity: 0,
        }}
      />
    </>
  );
}
