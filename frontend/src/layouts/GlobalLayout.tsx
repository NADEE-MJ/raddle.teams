import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { GlobalOutletContext } from '@/hooks/useGlobalOutletContext';
import { Button } from '@/components';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { api } from '@/services/api';

const GlobalLayout: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [showLogout, setShowLogout] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [adminApiToken, setAdminApiToken] = useState<string | null>(null);
    const [adminSessionId, setAdminSessionId] = useState<string | null>(null);
    const [mainContentBordered, setMainContentBordered] = useState(true);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    useEffect(() => {
        if (
            location.pathname.startsWith('/lobby') ||
            (location.pathname.startsWith('/admin') && !location.pathname.includes('login'))
        ) {
            setShowLogout(true);
        } else {
            setShowLogout(false);
        }

        if (location.pathname === '/tutorial') {
            setMainContentBordered(false);
        } else {
            setMainContentBordered(true);
        }
    }, [location]);

    const updateAdminApiToken = useCallback((token: string | null) => {
        setAdminApiToken(token);
        if (token) {
            localStorage.setItem('raddle_admin_api_token', token);
        } else {
            localStorage.removeItem('raddle_admin_api_token');
        }
    }, []);

    const getAdminApiTokenFromLocalStorage = useCallback(() => {
        return localStorage.getItem('raddle_admin_api_token');
    }, []);

    const updateAdminSessionId = useCallback((id: string | null) => {
        setAdminSessionId(id);
        if (id) {
            localStorage.setItem('raddle_admin_session_id', id);
        } else {
            localStorage.removeItem('raddle_admin_session_id');
        }
    }, []);

    const getAdminSessionIdFromLocalStorage = useCallback(() => {
        return localStorage.getItem('raddle_admin_session_id');
    }, []);

    const updateSessionId = useCallback((id: string | null) => {
        setSessionId(id);
        if (id) {
            localStorage.setItem('raddle_session_id', id);
        } else {
            localStorage.removeItem('raddle_session_id');
        }
    }, []);

    const getSessionIdFromLocalStorage = useCallback(() => {
        return localStorage.getItem('raddle_session_id');
    }, []);

    const handleLogout = useCallback(async () => {
        setIsLoggingOut(true);
        try {
            if (location.pathname.startsWith('/admin')) {
                updateAdminApiToken(null);
                updateAdminSessionId(null);
                window.location.href = '/';
            } else {
                await api.player.lobby.leave(sessionId!);
                updateSessionId(null);
                window.location.href = '/';
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            setIsLoggingOut(false);
        }
    }, [location.pathname, sessionId, updateAdminApiToken, updateAdminSessionId, updateSessionId]);

    const context: GlobalOutletContext = useMemo(
        () => ({
            sessionId,
            setSessionId: updateSessionId,
            getSessionIdFromLocalStorage,
            adminApiToken,
            setAdminApiToken: updateAdminApiToken,
            getAdminApiTokenFromLocalStorage,
            adminSessionId,
            setAdminSessionId: updateAdminSessionId,
            getAdminSessionIdFromLocalStorage,
        }),
        [
            sessionId,
            updateSessionId,
            getSessionIdFromLocalStorage,
            adminApiToken,
            updateAdminApiToken,
            getAdminApiTokenFromLocalStorage,
            adminSessionId,
            updateAdminSessionId,
            getAdminSessionIdFromLocalStorage,
        ]
    );

    return (
        <div className='bg-primary grid min-h-screen grid-rows-[auto_auto_1fr]'>
            <nav className='bg-secondary border-border border-b'>
                <div className='mx-auto max-w-6xl px-8'>
                    <div className='flex h-16 items-center justify-between'>
                        <div className='flex items-center gap-4'>
                            <h1 className='text-tx-primary text-2xl font-bold'>
                                <Link to='/' className='flex items-center transition-all duration-50 active:scale-90 hover:scale-105' data-testid='home-link'>
                                    R
                                    <img src='/img/ladder.svg' alt='A' className='inline-block h-6 w-6 brightness-75' />
                                    DDLE
                                </Link>
                            </h1>
                            <span className='text-tx-secondary not-md:hidden'>Word Transformation Game</span>
                        </div>
                        <div className='flex items-center gap-4'>
                            <div className='text-tx-secondary'>
                                {showLogout ? (
                                    <Button
                                        onClick={handleLogout}
                                        disabled={isLoggingOut}
                                        loading={isLoggingOut}
                                        variant='destructive'
                                        className='bg-red-700 text-white hover:bg-red-800 disabled:bg-red-950'
                                        data-testid='logout-button'
                                    >
                                        {isLoggingOut
                                            ? 'Logging out'
                                            : location.pathname.startsWith('/admin')
                                                ? '🔒 Admin Logout'
                                                : '🚪 Leave Lobby'}
                                    </Button>
                                ) : (
                                    <div className='flex gap-1'>
                                        <Button
                                            onClick={() => navigate('/tutorial')}
                                            variant='link'
                                            size='md'
                                            data-testid='tutorial-link'
                                        >
                                            ✌️ How to Play
                                        </Button>
                                        {'•'}
                                        <Button
                                            onClick={() => navigate('/admin/login')}
                                            variant='link'
                                            size='md'
                                            data-testid='admin-panel-link'
                                        >
                                            🔧 Admin
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            <main className='bg-primary p-4 md:p-8'>
                <div className='mx-auto max-w-6xl'>
                    {mainContentBordered ? (
                        <div className='bg-secondary border-border rounded-lg border p-4 shadow-sm md:p-8'>
                            <Outlet context={context} />
                        </div>
                    ) : (
                        <Outlet context={context} />
                    )}
                </div>
            </main>

            <footer className='bg-primary'>
                <div className='border-border-light mx-auto max-w-6xl border-t p-6'>
                    <div className='flex flex-col items-center justify-between gap-4 md:flex-row'>
                        <div className='flex items-center gap-1'>
                            <img src='/img/ladder.svg' alt='A' className='inline-block h-12 w-15 brightness-75' />
                            <div className='text-tx-secondary text-sm'>
                                <p className='mb-1'>© 2025 Raddle Teams</p>
                                <p className='mb-1'>A team-based word game</p>
                                <p>Built for collaborative fun</p>
                            </div>
                        </div>
                        <div className='text-tx-secondary flex gap-4 text-sm'>
                            <Button
                                onClick={() => navigate('/tutorial')}
                                variant='link'
                                size='lg'
                                data-testid='footer-tutorial-link'
                            >
                                ✌️ How to Play
                            </Button>
                            <Button
                                onClick={() => navigate('/admin/login')}
                                variant='link'
                                size='lg'
                                data-testid='footer-admin-link'
                            >
                                🔧 Admin
                            </Button>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default GlobalLayout;
