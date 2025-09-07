import { useEffect, useState } from 'react';
import JoinForm from './JoinForm';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import LoadingSpinner from "@/components/LoadingSpinner";
import { useGlobalOutletContext } from '@/hooks/useGlobalOutletContext';

export default function LandingPage() {
    const navigate = useNavigate();
    const { setSessionId, getSessionIdFromLocalStorage, setMainContentBordered } = useGlobalOutletContext();
    const [pageLoading, setPageLoading] = useState(true);

    useEffect(() => {
        setMainContentBordered(true);
        const redirectToLobby = async () => {
            const sessionId = getSessionIdFromLocalStorage();
            if (sessionId) {
                try {
                    const lobbyData = await api.player.lobby.getInfo(sessionId);
                    navigate(`/lobby/${lobbyData.code}`);
                } catch (error) {
                    console.error('Failed to get lobby info for session:', error);
                    setSessionId(null);
                }
            }
        };

        redirectToLobby();
        setPageLoading(false);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return pageLoading ? <LoadingSpinner /> : (
        <div className="text-center">
            <h1 className="text-3xl font-bold mb-6 text-tx-primary" data-testid="landing-page-title">Raddle Teams</h1>
            <p className="text-lg text-tx-secondary mb-8">Team up and solve word transformation puzzles together!</p>

            <div className="max-w-md mx-auto">
                <JoinForm />
            </div>
        </div>
    );
}
