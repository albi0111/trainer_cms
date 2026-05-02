import { useEffect } from 'react';
import AppRouter from './router';
import { useKeyboardHeight } from './hooks/useKeyboardHeight';
import { useAppStore } from './store/useAppStore';

export default function App() {
  const refreshSyncState = useAppStore((state) => state.refreshSyncState);
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

  return <AppRouter />;
}
