import { Suspense, lazy, type ReactNode } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import SwipeBackContainer from './components/SwipeBackContainer';

const DashboardScreen = lazy(() => import('./screens/DashboardScreen'));
const ClientScreen = lazy(() => import('./screens/ClientScreen'));
const ScheduleScreen = lazy(() => import('./screens/ScheduleScreen'));
const SettingsScreen = lazy(() => import('./screens/SettingsScreen'));

function PageLoader() {
  return (
    <div className="app-loader">
      <div className="app-loader__spinner" aria-hidden="true" />
      <p className="app-loader__text">Loading workspace…</p>
    </div>
  );
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
        element: withSuspense(<DashboardScreen />),
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
