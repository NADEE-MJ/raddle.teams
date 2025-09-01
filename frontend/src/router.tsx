import React, { Suspense, lazy } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import { AdminLayout, GameLayout, GlobalLayout, LandingLayout, LobbyLayout } from '@/layouts';

const LandingPage = lazy(() => import('@/pages/LandingPage'));
const LobbyPage = lazy(() => import('@/pages/LobbyPage'));
const AdminPage = lazy(() => import('@/pages/AdminPage'));
const GamePage = lazy(() => import('@/pages/GamePage'));
const InvalidLobbyPage = lazy(() => import('@/pages/InvalidLobbyPage'));
const InvalidGamePage = lazy(() => import('@/pages/InvalidGamePage'));

const NotFound: React.FC = () => (
    <div className='flex min-h-screen items-center justify-center bg-gray-50'>
        <div className='text-center'>
            <h1 className='mb-4 text-3xl font-bold text-gray-900'>Page Not Found</h1>
            <p className='mb-6 text-gray-600'>The page you&apos;re looking for doesn&apos;t exist.</p>
            <a
                href='/'
                className='rounded-lg bg-blue-600 px-4 py-2 text-white transition duration-200 hover:bg-blue-700'
            >
                Back to Home
            </a>
        </div>
    </div>
);

const LoadingSpinner: React.FC = () => (
    <div className='flex h-64 items-center justify-center'>
        <div className='rounded-lg bg-white p-6 shadow-lg'>
            <div className='text-center'>
                <div className='mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600'></div>
                <p className='mt-3 text-sm text-gray-600'>Loading...</p>
            </div>
        </div>
    </div>
);

const withSuspense = (element: React.ReactElement) => <Suspense fallback={<LoadingSpinner />}>{element}</Suspense>;

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
            { path: '*', element: <NotFound /> },
        ],
    },
]);

export default function AppRouter() {
    return <RouterProvider router={router} />;
}
