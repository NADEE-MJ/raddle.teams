import { Suspense, lazy } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import GlobalLayout from '@/layouts/GlobalLayout';
import { LoadingSpinner } from '@/components';

const LandingPage = lazy(() => import('@/pages/LandingPage'));
const TutorialPage = lazy(() => import('@/pages/TutorialPage'));
const LobbyPage = lazy(() => import('@/pages/LobbyPage'));
const AdminPage = lazy(() => import('@/pages/AdminPage'));
const AdminLoginPage = lazy(() => import('@/pages/AdminLoginPage'));
const ComponentShowcasePage = lazy(() => import('@/pages/ComponentShowcasePage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

const withSuspense = (element: React.ReactElement) => <Suspense fallback={<LoadingSpinner />}>{element}</Suspense>;

const router = createBrowserRouter([
    {
        path: '/',
        element: <GlobalLayout />,
        children: [
            { index: true, element: withSuspense(<LandingPage />) },
            { path: 'tutorial', element: withSuspense(<TutorialPage />) },
            { path: 'lobby/:lobbyCode', element: withSuspense(<LobbyPage />) },
            { path: 'admin', element: withSuspense(<AdminPage />) },
            { path: 'admin/login', element: withSuspense(<AdminLoginPage />) },
            { path: 'component-showcase', element: withSuspense(<ComponentShowcasePage />) },
            { path: '*', element: <NotFoundPage /> },
        ],
    },
]);

export default function AppRouter() {
    return <RouterProvider router={router} />;
}
