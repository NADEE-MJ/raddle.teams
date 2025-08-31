import React, { Suspense, lazy } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import { AdminLayout, GameLayout, GlobalLayout, LandingLayout, LobbyLayout } from '@/layouts';

const LandingPage = lazy(() => import('@/pages/LandingPage'));
const LobbyPage = lazy(() => import('@/pages/LobbyPage'));
const AdminPage = lazy(() => import('@/pages/AdminPage'));
const GamePage = lazy(() => import('@/pages/GamePage'));

const NotFound: React.FC = () => <div style={{ padding: 20 }}>Page not found</div>;

const withSuspense = (element: React.ReactElement) => (
    // TODO make this better somehow
    <Suspense fallback={<div style={{ padding: 20 }}>Loading...</div>}>
        {element}
    </Suspense>
);

const router = createBrowserRouter([
    {
        path: '/',
        element: <GlobalLayout />,
        children: [
            {
                path: '',
                element: <LandingLayout />,
                children: [{ index: true, element: withSuspense(<LandingPage />) }],
            },
            {
                path: 'lobby',
                element: <LobbyLayout />,
                children: [
                    { path: ':lobbyCode', element: withSuspense(<LobbyPage />) },
                ],
            },
            {
                path: 'admin',
                element: <AdminLayout />,
                children: [
                    { index: true, element: withSuspense(<AdminPage />) },
                ],
            },
            {
                path: 'game',
                element: <GameLayout />,
                children: [
                    { path: ':gameId', element: withSuspense(<GamePage />) },
                ],
            },
            { path: '*', element: <NotFound /> },
        ],
    },
]);

export default function AppRouter() {
    return <RouterProvider router={router} />;
}

