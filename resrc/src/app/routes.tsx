import { createBrowserRouter, Outlet } from 'react-router';
import { Dashboard } from './components/Dashboard';
import { ClientScreen } from './components/ClientScreen';

function Root() {
  return <Outlet />;
}

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Root,
    children: [
      { index: true, Component: Dashboard },
      { path: 'client/:id', Component: ClientScreen },
    ],
  },
]);
