import { Suspense, lazy } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

// Lazy load screens
const DashboardScreen = lazy(() => import('./screens/DashboardScreen'));
const ClientScreen = lazy(() => import('./screens/ClientScreen'));
const ScheduleScreen = lazy(() => import('./screens/ScheduleScreen'));
const SettingsScreen = lazy(() => import('./screens/SettingsScreen'));
const ComponentPreview = lazy(() => import('./components/ui/ComponentPreview'));

// Simple loading fallback
function PageLoader() {
  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: 'var(--color-bg)',
      color: 'var(--color-primary)'
    }}>
      <div className="spinner" />
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <Suspense fallback={<PageLoader />}>
        <DashboardScreen />
      </Suspense>
    ),
  },
  {
    path: '/client/:id',
    element: (
      <Suspense fallback={<PageLoader />}>
        <ClientScreen />
      </Suspense>
    ),
  },
  {
    path: '/schedule',
    element: (
      <Suspense fallback={<PageLoader />}>
        <ScheduleScreen />
      </Suspense>
    ),
  },
  {
    path: '/settings',
    element: (
      <Suspense fallback={<PageLoader />}>
        <SettingsScreen />
      </Suspense>
    ),
  },
  {
    path: '/preview',
    element: (
      <Suspense fallback={<PageLoader />}>
        <ComponentPreview />
      </Suspense>
    ),
  },
]);

export default function Router() {
  return <RouterProvider router={router} />;
}
