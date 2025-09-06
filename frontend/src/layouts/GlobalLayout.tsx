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
        <div className="min-h-screen layout font-sans bg-ayu-bg-primary">
            <nav className="bg-ayu-bg-secondary shadow-md border-b border-ayu-border">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <div className="flex items-center gap-4">
                            <h1 className="text-2xl font-bold text-ayu-text-primary">
                                <Link to="/" className="flex items-center">
                                    R<span className="w-6 h-6 inline-block brightness-75 relative -top-[3px]">🪜</span>DDLE
                                </Link>
                            </h1>
                            <span className="hidden md:inline text-ayu-text-secondary">Word Transformation Game</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-ayu-text-secondary">
                                {showLogout ? (
                                    <button
                                        onClick={isAdminPage ? handleAdminLogout : handleLobbyLogout}
                                        className="text-ayu-red hover:text-ayu-red-bright"
                                        data-testid="logout-button"
                                    >
                                        Logout
                                    </button>
                                ) : (
                                    <>
                                        <Link to="/tutorial" className="text-ayu-blue hover:text-ayu-blue-bright">✌️ How to Play</Link>
                                        {' • '}
                                        <Link to="/admin" className="text-ayu-blue hover:text-ayu-blue-bright" data-testid="admin-panel-link">🔧 Admin</Link>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </nav>
            
            <main className="bg-ayu-bg-primary pt-4 md:p-4">
                <Outlet />
            </main>

            <footer className="mt-4 border-t border-ayu-border">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded bg-ayu-bg-secondary flex items-center justify-center text-2xl">🎲</div>
                            <div className="text-sm text-ayu-text-secondary">
                                <p className="mb-1">© 2025 Raddle Teams</p>
                                <p className="mb-1">A team-based word game</p>
                                <p>Built for collaborative fun</p>
                            </div>
                        </div>
                        <div className="flex gap-4 text-sm text-ayu-text-secondary">
                            <Link to="/tutorial" className="hover:text-ayu-text-primary">✌️ How to Play</Link>
                            <Link to="/admin" className="hover:text-ayu-text-primary" data-testid="footer-admin-link">🔧 Admin</Link>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default GlobalLayout;
