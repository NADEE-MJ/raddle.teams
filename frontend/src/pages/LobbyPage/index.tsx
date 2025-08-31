import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLobbyOutletContext } from '@/hooks/useLobbyOutletContext';
import LoadingState from './LoadingState';
import ErrorState from './ErrorState';
import LobbyHeader from './LobbyHeader';
import PlayersList from './PlayersList';
import TeamsList from './TeamsList';
import GameStatus from './GameStatus';

export default function LobbyPage() {
    const {
        player,
        sessionId,
        setSessionId,
        lobbyInfo,
        isLoading: contextLoading,
        error: contextError,
    } = useLobbyOutletContext();

    const navigate = useNavigate();

    useEffect(() => {
        if (!sessionId || !player) {
            navigate('/');
            return;
        }
    }, [sessionId, player, navigate]);

    if (contextLoading) {
        return <LoadingState />;
    }

    if (!lobbyInfo || !player) {
        return <ErrorState />;
    }

    return (
        <div className='min-h-screen bg-gray-50 p-4'>
            <div className='mx-auto max-w-6xl'>
                <div className='mb-6 rounded-lg bg-white p-6 shadow-xl'>
                    <LobbyHeader
                        lobby={lobbyInfo.lobby}
                        player={player}
                        sessionId={sessionId!}
                        setSessionId={setSessionId}
                    />

                    {contextError && (
                        <div className='mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700'>
                            {contextError}
                        </div>
                    )}

                    <div className='grid gap-6 md:grid-cols-2'>
                        <PlayersList players={lobbyInfo.players} currentPlayer={player} />

                        <TeamsList
                            teams={lobbyInfo.teams}
                            playersByTeam={lobbyInfo.players_by_team}
                            currentPlayer={player}
                        />
                    </div>

                    <GameStatus player={player} />
                </div>
            </div>
        </div>
    );
}
