// ─────────────────────────────────────────────────────────────────────────────
// Router — React Router v7 with lazy-loaded screens
// All screens are code-split for minimal initial bundle.
// ─────────────────────────────────────────────────────────────────────────────

import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

// ── Lazy-loaded screens ─────────────────────────────────────────────────────
const DashboardScreen = lazy(() => import('./screens/DashboardScreen'));
const ClientScreen = lazy(() => import('./screens/ClientScreen'));
const AddClientScreen = lazy(() => import('./screens/AddClientScreen'));
const ScheduleScreen = lazy(() => import('./screens/ScheduleScreen'));
const SettingsScreen = lazy(() => import('./screens/SettingsScreen'));
const ComponentPreview = lazy(() => import('./components/ui/ComponentPreview'));

// ── Loading fallback ────────────────────────────────────────────────────────
function ScreenLoader() {
  return (
    <div className="app-loader">
      <div className="app-loader__spinner" />
      <span className="app-loader__text">Loading…</span>
    </div>
  );
}

function LazyScreen({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<ScreenLoader />}>{children}</Suspense>;
}

// ── Route definitions ───────────────────────────────────────────────────────
const router = createBrowserRouter([
  {
    path: '/',
    element: <LazyScreen><DashboardScreen /></LazyScreen>,
  },
  {
    path: '/client/:id',
    element: <LazyScreen><ClientScreen /></LazyScreen>,
  },
  {
    path: '/add-client',
    element: <LazyScreen><AddClientScreen /></LazyScreen>,
  },
  {
    path: '/schedule',
    element: <LazyScreen><ScheduleScreen /></LazyScreen>,
  },
  {
    path: '/settings',
    element: <LazyScreen><SettingsScreen /></LazyScreen>,
  },
  {
    path: '/preview',
    element: <LazyScreen><ComponentPreview /></LazyScreen>,
  },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
