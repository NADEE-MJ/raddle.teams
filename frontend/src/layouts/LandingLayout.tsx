import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { api } from '@/services/api';

const LandingLayout: React.FC = () => {
    const navigate = useNavigate();
    const [isRedirecting, setIsRedirecting] = useState(false);

    useEffect(() => {
        const redirectToLobby = async () => {
            const sessionId = localStorage.getItem('raddle_session_id');
            if (sessionId) {
                setIsRedirecting(true);
                try {
                    // Get lobby information using the session ID
                    const lobbyData = await api.player.lobby.getInfo(sessionId);
                    // Redirect to the lobby with the correct lobby code
                    navigate(`/lobby/${lobbyData.code}`);
                } catch (error) {
                    console.error('Failed to get lobby info for session:', error);
                    // If the session is invalid, remove it and let user start fresh
                    localStorage.removeItem('raddle_session_id');
                    setIsRedirecting(false);
                }
            }
        };

        redirectToLobby();
    }, [navigate]);

    if (isRedirecting) {
        return (
            <div className='flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 p-4'>
                <div className='text-center text-white'>
                    <div className='mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-white'></div>
                    <p className='mt-4'>Redirecting to your lobby...</p>
                </div>
            </div>
        );
    }

    return (
        <div className='flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 p-4'>
            <Outlet />
        </div>
    );
};

export default LandingLayout;
