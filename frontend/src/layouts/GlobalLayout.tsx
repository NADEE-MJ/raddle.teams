import { Outlet, Link, useLocation } from 'react-router-dom';
import { GlobalOutletContext } from '@/hooks/useGlobalOutletContext';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { api } from '@/services/api';

const GlobalLayout: React.FC = () => {
    const location = useLocation();
    const [showLogout, setShowLogout] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [adminApiToken, setAdminApiToken] = useState<string | null>(null);
    const [adminSessionId, setAdminSessionId] = useState<string | null>(null);
    const [mainContentBordered, setMainContentBordered] = useState(true);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    useEffect(() => {
        if (location.pathname.startsWith('/lobby') || (location.pathname.startsWith('/admin') && !location.pathname.includes('login'))) {
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

    const context: GlobalOutletContext = useMemo(() => ({
        sessionId,
        setSessionId: updateSessionId,
        getSessionIdFromLocalStorage,
        adminApiToken,
        setAdminApiToken: updateAdminApiToken,
        getAdminApiTokenFromLocalStorage,
        adminSessionId,
        setAdminSessionId: updateAdminSessionId,
        getAdminSessionIdFromLocalStorage,
    }), [
        sessionId,
        updateSessionId,
        getSessionIdFromLocalStorage,
        adminApiToken,
        updateAdminApiToken,
        getAdminApiTokenFromLocalStorage,
        adminSessionId,
        updateAdminSessionId,
        getAdminSessionIdFromLocalStorage,
    ]);

    return (
        <div className="min-h-screen bg-primary grid grid-rows-[auto_auto_1fr]">
            <nav className="bg-secondary border-b border-border">
                <div className="max-w-6xl mx-auto px-8 ">
                    <div className="flex justify-between h-16 items-center">
                        <div className="flex items-center gap-4">
                            <h1 className="text-2xl font-bold text-tx-primary">
                                <Link to="/" className="flex items-center" data-testid="home-link">
                                    R<img src="/img/ladder.svg" alt="A" className="w-6 h-6 inline-block brightness-75 " />DDLE
                                </Link>
                            </h1>
                            <span className="not-md:hidden text-tx-secondary">Word Transformation Game</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-tx-secondary">
                                {showLogout ? (
                                    <button
                                        onClick={handleLogout}
                                        disabled={isLoggingOut}
                                        className="rounded-lg bg-red-700 hover:bg-red-800 px-4 py-2 text-white transition duration-200 disabled:bg-red-950"
                                        data-testid="logout-button"
                                    >
                                        {isLoggingOut ? 'Logging out...' : (location.pathname.startsWith('/admin') ? '🔒 Admin Logout' : '🚪 Leave Lobby')}
                                    </button>
                                ) : (
                                    <div className="flex gap-1">
                                        <Link to="/tutorial" className="text-tx-secondary hover:text-tx-primary transition duration-200" data-testid="tutorial-link">✌️ How to Play</Link>
                                        {'•'}
                                        <Link to="/admin/login" className="text-tx-secondary hover:text-tx-primary transition duration-200" data-testid="admin-panel-link">🔧 Admin</Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </nav >

            <main className="bg-primary p-4 md:p-8">
                <div className="max-w-6xl mx-auto">
                    {mainContentBordered ? (
                        <div className="bg-secondary border border-border rounded-lg shadow-sm p-4 md:p-8">
                            <Outlet context={context} />
                        </div>
                    ) : (
                        <Outlet context={context} />
                    )}
                </div>
            </main>

            <footer className="bg-primary">
                <div className="max-w-6xl mx-auto p-6 border-t border-border-light">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-1">
                            <img src="/img/ladder.svg" alt="A" className="w-15 h-12 inline-block brightness-75 " />
                            <div className="text-sm text-tx-secondary">
                                <p className="mb-1">© 2025 Raddle Teams</p>
                                <p className="mb-1">A team-based word game</p>
                                <p>Built for collaborative fun</p>
                            </div>
                        </div>
                        <div className="flex gap-4 text-sm text-tx-secondary">
                            <Link to="/tutorial" className="hover:text-tx-primary transition duration-200" data-testid="footer-tutorial-link">✌️ How to Play</Link>
                            <Link to="/admin/login" className="hover:text-tx-primary transition duration-200" data-testid="footer-admin-link">🔧 Admin</Link>
                        </div>
                    </div>
                </div>
            </footer>
        </div >
    );
};

export default GlobalLayout;
