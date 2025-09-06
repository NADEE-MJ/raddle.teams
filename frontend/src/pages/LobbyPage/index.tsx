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
        if (!contextLoading && (!sessionId || !player)) {
            navigate('/');
            return;
        }
    }, [contextLoading, sessionId, player, navigate]);

    if (contextLoading) {
        return <LoadingState />;
    }

    if (!lobbyInfo || !player) {
        return <ErrorState />;
    }

    return (
        <main className="bg-primary pt-4 md:p-4">
            <div className="max-w-6xl mx-auto">
                <div className="bg-secondary border border-border rounded-lg shadow-sm p-4 md:p-8 mb-6">
                    <LobbyHeader
                        lobby={lobbyInfo.lobby}
                        player={player}
                        sessionId={sessionId!}
                        setSessionId={setSessionId}
                    />

                    {contextError && (
                        <div className='mb-6 rounded-lg border border-red bg-red/20 px-4 py-3 text-red' data-testid='lobby-error-message'>
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
        </main>
    );
}
