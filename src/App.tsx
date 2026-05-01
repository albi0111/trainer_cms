import { useEffect } from 'react';
import AppRouter from './router';
import { useAppStore } from './store/useAppStore';

export default function App() {
  const refreshSyncState = useAppStore((state) => state.refreshSyncState);

  useEffect(() => {
    void refreshSyncState();
  }, [refreshSyncState]);

  return <AppRouter />;
}
