import { Outlet, Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';

const GlobalLayout: React.FC = () => {
    const location = useLocation();
    const [isLoggedInAdmin, setIsLoggedInAdmin] = useState(false);
    const [isLoggedInLobby, setIsLoggedInLobby] = useState(false);

    const isAdminPage = location.pathname.startsWith('/admin');
    const isLobbyPage = location.pathname.startsWith('/lobby');

    useEffect(() => {
        const adminToken = localStorage.getItem('raddle_admin_token');
        const sessionId = localStorage.getItem('raddle_session_id');
        setIsLoggedInAdmin(!!adminToken);
        setIsLoggedInLobby(!!sessionId);
    }, [location]);

    const showLogout = (isAdminPage && isLoggedInAdmin) || (isLobbyPage && isLoggedInLobby);

    const handleAdminLogout = () => {
        localStorage.removeItem('raddle_admin_token');
        window.location.href = '/';
    };

    const handleLobbyLogout = () => {
        localStorage.removeItem('raddle_session_id');
        window.location.href = '/';
    };

    return (
        <div className="min-h-screen layout font-sans bg-primary">
            <nav className="bg-secondary shadow-md border-b border-border">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <div className="flex items-center gap-4">
                            <h1 className="text-2xl font-bold text-tx-primary">
                                <Link to="/" className="flex items-center">
                                    R<span className="w-6 h-6 inline-block brightness-75 relative -top-[3px]">🪜</span>DDLE
                                </Link>
                            </h1>
                            <span className="hidden md:inline text-tx-secondary">Word Transformation Game</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-tx-secondary">
                                {showLogout ? (
                                    <button
                                        onClick={isAdminPage ? handleAdminLogout : handleLobbyLogout}
                                        className="text-red hover:text-red-bright"
                                        data-testid="logout-button"
                                    >
                                        Logout
                                    </button>
                                ) : (
                                    <>
                                        <Link to="/tutorial" className="text-blue hover:text-blue-bright">✌️ How to Play</Link>
                                        {' • '}
                                        <Link to="/admin" className="text-blue hover:text-blue-bright" data-testid="admin-panel-link">🔧 Admin</Link>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="bg-primary pt-4 md:p-4">
                <Outlet />
            </main>

            <footer className="mt-4 border-t border-border">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded bg-secondary flex items-center justify-center text-2xl">🎲</div>
                            <div className="text-sm text-tx-secondary">
                                <p className="mb-1">© 2025 Raddle Teams</p>
                                <p className="mb-1">A team-based word game</p>
                                <p>Built for collaborative fun</p>
                            </div>
                        </div>
                        <div className="flex gap-4 text-sm text-tx-secondary">
                            <Link to="/tutorial" className="hover:text-tx-primary">✌️ How to Play</Link>
                            <Link to="/admin" className="hover:text-tx-primary" data-testid="footer-admin-link">🔧 Admin</Link>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default GlobalLayout;
