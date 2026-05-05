import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import LoginPage         from '@/pages/LoginPage';
import RegisterPage      from '@/pages/RegisterPage';
import OAuthCallbackPage from '@/pages/OAuthCallbackPage';
import DashboardPage from '@/pages/DashboardPage';
import ProfilePage   from '@/pages/ProfilePage';
import ChatPage      from '@/pages/ChatPage';
import RecordsPage   from '@/pages/RecordsPage';
import PlansPage     from '@/pages/PlansPage';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/auth/callback',
    element: <OAuthCallbackPage />,
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        element: <Layout />,
        children: [
          { index: true,       element: <DashboardPage /> },
          { path: 'profile',   element: <ProfilePage /> },
          { path: 'chat',      element: <ChatPage /> },
          { path: 'records',   element: <RecordsPage /> },
          { path: 'plans',     element: <PlansPage /> },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
