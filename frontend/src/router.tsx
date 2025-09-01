import { Suspense, lazy } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import { AdminLayout, GameLayout, GlobalLayout, LandingLayout, LobbyLayout } from '@/layouts';
import LoadingSpinner from "@/components/LoadingSpinner";

const LandingPage = lazy(() => import('@/pages/LandingPage'));
const TutorialPage = lazy(() => import('@/pages/TutorialPage'));
const LobbyPage = lazy(() => import('@/pages/LobbyPage'));
const AdminPage = lazy(() => import('@/pages/AdminPage'));
const GamePage = lazy(() => import('@/pages/GamePage'));
const InvalidLobbyPage = lazy(() => import('@/pages/InvalidLobbyPage'));
const InvalidGamePage = lazy(() => import('@/pages/InvalidGamePage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));


const withSuspense = (element: React.ReactElement) => <Suspense fallback={<LoadingSpinner />}>{element}</Suspense>;

const router = createBrowserRouter([
    {
        path: '/',
        element: <GlobalLayout />,
        children: [
            {
                path: '',
                element: <LandingLayout />,
                children: [
                    { index: true, element: withSuspense(<LandingPage />) },
                    { path: 'tutorial', element: withSuspense(<TutorialPage />) },
                ],
            },
            {
                path: 'lobby',
                element: <LobbyLayout />,
                children: [
                    {
                        index: true,
                        element: withSuspense(<InvalidLobbyPage />),
                    },
                    { path: ':lobbyCode', element: withSuspense(<LobbyPage />) },
                ],
            },
            {
                path: 'admin',
                element: <AdminLayout />,
                children: [{ index: true, element: withSuspense(<AdminPage />) }],
            },
            {
                path: 'game',
                element: <GameLayout />,
                children: [
                    {
                        index: true,
                        element: withSuspense(<InvalidGamePage />),
                    },
                    { path: ':gameId', element: withSuspense(<GamePage />) },
                ],
            },
            { path: '*', element: <NotFoundPage /> },
        ],
    },
]);

export default function AppRouter() {
    return <RouterProvider router={router} />;
}
