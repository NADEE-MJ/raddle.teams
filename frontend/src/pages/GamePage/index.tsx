import { useGameOutletContext } from '@/hooks/useGameOutletContext';
import ErrorState from './ErrorState';
import LoadingState from './LoadingState';
import GameContent from './GameContent';

export default function GamePage() {
    const { gameId, player, sessionId, team, isLoading } = useGameOutletContext();

    if (!sessionId || !player) {
        return <ErrorState message='No active session found' />;
    }

    if (isLoading) {
        return <LoadingState />;
    }

    return <GameContent gameId={gameId} player={player} team={team} />;
}
