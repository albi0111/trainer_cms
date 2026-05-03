import { StrictMode, useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import SplashScreen from './components/SplashScreen';
import { ensureDatabaseReady } from './db/db';
import './index.css';

registerSW({ immediate: true });

const SPLASH_STORAGE_KEY = 'fp_splashed';
const APP_READY_EVENT = 'fp:app-ready';

type GlobalWindowState = Window & {
  __fpAppReady?: boolean;
};

function getInitialSplashState(): boolean {
  if (typeof window === 'undefined') {
    return true;
  }

  try {
    return sessionStorage.getItem(SPLASH_STORAGE_KEY) !== 'true';
  } catch {
    return true;
  }
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

  return import('./screens/DashboardScreen');
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
  const [showSplash, setShowSplash] = useState(getInitialSplashState);

  useEffect(() => {
    let isCancelled = false;

    const bootstrap = async () => {
      try {
        await Promise.allSettled([
          ensureDatabaseReady(),
          preloadInitialRouteModule(window.location.pathname),
        ]);
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
    try {
      sessionStorage.setItem(SPLASH_STORAGE_KEY, 'true');
    } catch {
      // Silent fail when sessionStorage is unavailable.
    }

    setShowSplash(false);
  }, []);

  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  if (!isAppReady) {
    return null;
  }

  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BootstrapApp />
  </StrictMode>,
);
