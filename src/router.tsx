import { Suspense, lazy, type ReactNode } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import SwipeBackContainer from './components/SwipeBackContainer';
import SkeletonClientCard from './components/skeletons/SkeletonClientCard';
import SkeletonClientProfile from './components/skeletons/SkeletonClientProfile';
import SkeletonInfoCard from './components/skeletons/SkeletonInfoCard';
import SkeletonScheduleCard from './components/skeletons/SkeletonScheduleCard';
import SkeletonStatCard from './components/skeletons/SkeletonStatCard';
import DashboardScreen from './screens/DashboardScreen';

const ClientScreen = lazy(() => import('./screens/ClientScreen'));
const ScheduleScreen = lazy(() => import('./screens/ScheduleScreen'));
const SettingsScreen = lazy(() => import('./screens/SettingsScreen'));

function DashboardRouteFallback() {
  return (
    <div
      aria-hidden="true"
      style={{
        minHeight: '100vh',
        background: 'var(--color-bg)',
        padding: 'calc(env(safe-area-inset-top) + 88px) 20px 32px',
      }}
    >
      <div style={{ display: 'grid', gap: '16px', maxWidth: '1160px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
          <SkeletonStatCard />
          <SkeletonStatCard />
        </div>
        <SkeletonScheduleCard />
        <div style={{ display: 'grid', gap: '12px' }}>
          {Array.from({ length: 3 }).map((_, index) => (
            <SkeletonClientCard key={`dashboard-route-skeleton-${index}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ClientRouteFallback() {
  return (
    <div
      aria-hidden="true"
      style={{
        minHeight: '100vh',
        background: 'var(--color-bg)',
        padding: 'calc(env(safe-area-inset-top) + 88px) 20px 32px',
      }}
    >
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        <SkeletonClientProfile />
        <div style={{ display: 'grid', gap: '16px' }}>
          {Array.from({ length: 3 }).map((_, index) => (
            <SkeletonInfoCard key={`client-route-skeleton-${index}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SecondaryRouteFallback() {
  return (
    <div
      aria-hidden="true"
      style={{
        minHeight: '100vh',
        background: 'var(--color-bg)',
        padding: 'calc(env(safe-area-inset-top) + 88px) 20px 32px',
      }}
    >
      <div style={{ display: 'grid', gap: '16px', maxWidth: '960px', margin: '0 auto' }}>
        <SkeletonScheduleCard />
        <SkeletonInfoCard />
        <SkeletonInfoCard />
      </div>
    </div>
  );
}

function PageLoader() {
  const pathname = typeof window === 'undefined' ? '/' : window.location.pathname;

  if (pathname.startsWith('/client/')) {
    return <ClientRouteFallback />;
  }

  if (pathname === '/') {
    return <DashboardRouteFallback />;
  }

  return <SecondaryRouteFallback />;
}

function withSuspense(element: ReactNode) {
  return <Suspense fallback={<PageLoader />}>{element}</Suspense>;
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <SwipeBackContainer />,
    children: [
      {
        index: true,
        element: <DashboardScreen />,
      },
      {
        path: 'client/:id',
        element: withSuspense(<ClientScreen />),
      },
      {
        path: 'schedule',
        element: withSuspense(<ScheduleScreen />),
      },
      {
        path: 'settings',
        element: withSuspense(<SettingsScreen />),
      },
    ],
  },
]);

export default function Router() {
  return <RouterProvider router={router} />;
}
