import { StrictMode, useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import SplashScreen from './components/SplashScreen';
import { ensureDatabaseReady } from './db/db';
import { useAppStore } from './store/useAppStore';
import './index.css';

registerSW({ immediate: true });

const APP_READY_EVENT = 'fp:app-ready';

type GlobalWindowState = Window & {
  __fpAppReady?: boolean;
};

function getCurrentMonthRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const format = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  return {
    startDate: format(start),
    endDate: format(end),
  };
}

function preloadInitialRouteModule(pathname: string): Promise<unknown> {
  if (pathname.startsWith('/client/')) {
    return import('./screens/ClientScreen');
  }

  if (pathname.startsWith('/schedule')) {
    return import('./screens/ScheduleScreen');
  }

  if (pathname.startsWith('/settings')) {
    return import('./screens/SettingsScreen');
  }

  return Promise.resolve();
}

async function hydrateInitialRouteData(pathname: string): Promise<void> {
  const store = useAppStore.getState();

  if (pathname === '/') {
    await store.hydrateDashboard();
    return;
  }

  if (pathname.startsWith('/client/')) {
    const clientId = pathname.split('/client/')[1]?.split('/')[0];
    if (clientId) {
      await store.hydrateClientDetail(decodeURIComponent(clientId));
    }
    return;
  }

  if (pathname.startsWith('/schedule')) {
    const { startDate, endDate } = getCurrentMonthRange();
    await store.hydrateSchedule(startDate, endDate);
    return;
  }

  if (pathname.startsWith('/settings')) {
    await store.refreshSyncState();
  }
}

function canRunLocalDemoSeed(): boolean {
  if (!import.meta.env.DEV) {
    return false;
  }

  return ['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname);
}

async function maybeSeedDemoData(): Promise<void> {
  const params = new URLSearchParams(window.location.search);
  if (params.get('seed') !== 'demo' || !canRunLocalDemoSeed()) {
    return;
  }

  const { seedDemoData } = await import('./services/dev/demoSeedService');
  const result = await seedDemoData();
  params.delete('seed');
  const nextSearch = params.toString();
  const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash}`;
  window.history.replaceState(window.history.state, '', nextUrl);
  useAppStore.getState().invalidateDashboard();
  console.info('Seeded Fit Persona demo data', result);
}

function signalAppReady(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    (window as GlobalWindowState).__fpAppReady = true;
    window.dispatchEvent(new Event(APP_READY_EVENT));
  } catch {
    // Silent fail when browser events are unavailable.
  }
}

function BootstrapApp() {
  const [isAppReady, setIsAppReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    const bootstrap = async () => {
      const pathname = window.location.pathname;

      try {
        await Promise.all([
          ensureDatabaseReady(),
          preloadInitialRouteModule(pathname),
        ]);
        await maybeSeedDemoData();
        await hydrateInitialRouteData(pathname);
      } catch (error) {
        console.error('Failed to initialize app', error);
      } finally {
        if (isCancelled) {
          return;
        }

        setIsAppReady(true);
        signalAppReady();
      }
    };

    void bootstrap();

    return () => {
      isCancelled = true;
    };
  }, []);

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
  }, []);

  if (showSplash || !isAppReady) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BootstrapApp />
  </StrictMode>,
);
