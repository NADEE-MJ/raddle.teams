import { useEffect, useState, useCallback } from 'react';
import JoinForm from './JoinForm';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { LoadingSpinner } from '@/components';
import { useGlobalOutletContext } from '@/hooks/useGlobalOutletContext';

export default function LandingPage() {
    const navigate = useNavigate();
    const { setSessionId, getSessionIdFromLocalStorage } = useGlobalOutletContext();
    const [pageLoading, setPageLoading] = useState(true);

    const redirectToLobby = useCallback(async () => {
        const sessionId = getSessionIdFromLocalStorage();
        if (sessionId) {
            try {
                const lobbyData = await api.player.lobby.getInfo(sessionId);
                setSessionId(sessionId);
                navigate(`/lobby/${lobbyData.code}`);
            } catch (error) {
                console.error('Failed to get lobby info for session:', error);
                setSessionId(null);
            }
        }
    }, [getSessionIdFromLocalStorage, navigate, setSessionId]);

    useEffect(() => {
        redirectToLobby();
        setPageLoading(false);
    }, [redirectToLobby, setPageLoading]);

    return pageLoading ? (
        <LoadingSpinner />
    ) : (
        <div className='text-center'>
            <h1 className='text-tx-primary mb-6 text-3xl font-bold' data-testid='landing-page-title'>
                Raddle Teams
            </h1>
            <p className='text-tx-secondary mb-8 text-lg'>Team up and solve word transformation puzzles together!</p>

            <div className='mx-auto max-w-md'>
                <JoinForm />
            </div>
        </div>
    );
}
