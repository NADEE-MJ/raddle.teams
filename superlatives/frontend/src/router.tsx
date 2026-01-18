import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';

// Lazy load pages
const LandingPage = lazy(() => import('@/pages/LandingPage'));
const DisplayView = lazy(() => import('@/pages/DisplayView'));
const PlayerView = lazy(() => import('@/pages/PlayerView'));
const HostView = lazy(() => import('@/pages/HostView'));
const AdminPage = lazy(() => import('@/pages/AdminPage'));
const AdminLoginPage = lazy(() => import('@/pages/AdminLoginPage'));

function LoadingFallback() {
    return (
        <div className='flex min-h-screen items-center justify-center'>
            <div className='text-2xl text-white'>Loading...</div>
        </div>
    );
}

export default function AppRouter() {
    return (
        <BrowserRouter>
            <Suspense fallback={<LoadingFallback />}>
                <Routes>
                    <Route path='/' element={<LandingPage />} />
                    <Route path='/display/:roomCode' element={<DisplayView />} />
                    <Route path='/play/:roomCode' element={<PlayerView />} />
                    <Route path='/host/:roomCode' element={<HostView />} />
                    <Route path='/admin' element={<AdminPage />} />
                    <Route path='/admin/login' element={<AdminLoginPage />} />
                </Routes>
            </Suspense>
        </BrowserRouter>
    );
}
