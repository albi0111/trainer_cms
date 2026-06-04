import { useEffect, useRef } from 'react';
import AppRouter from './router';
import { useKeyboardHeight } from './hooks/useKeyboardHeight';
import { registerSessionAnimationOverlay } from './hooks/useSessionCompleteAnimation';
import { useAppStore } from './store/useAppStore';

export default function App() {
  const refreshSyncState = useAppStore((state) => state.refreshSyncState);
  const runSync = useAppStore((state) => state.runSync);
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

  useEffect(() => {
    const runReminderCheck = () => {
      void import('./services/notification/sessionNotificationService')
        .then(({ notifyScheduledMeasurementReminders }) => notifyScheduledMeasurementReminders())
        .catch(() => undefined);
      void runSync();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        runReminderCheck();
      }
    };

    runReminderCheck();
    const intervalId = window.setInterval(runReminderCheck, 15 * 60 * 1000);
    window.addEventListener('focus', runReminderCheck);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', runReminderCheck);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [runSync]);

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
