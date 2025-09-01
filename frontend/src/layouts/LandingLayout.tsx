import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { api } from '@/services/api';

const LandingLayout: React.FC = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const redirectToLobby = async () => {
            const sessionId = localStorage.getItem('raddle_session_id');
            if (sessionId) {
                try {
                    const lobbyData = await api.player.lobby.getInfo(sessionId);
                    navigate(`/lobby/${lobbyData.code}`);
                } catch (error) {
                    console.error('Failed to get lobby info for session:', error);
                    localStorage.removeItem('raddle_session_id');
                }
            }
        };

        redirectToLobby();
    }, [navigate]);

    return (
        <Outlet />
    );
};

export default LandingLayout;
