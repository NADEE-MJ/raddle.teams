import { useGameOutletContext } from '@/hooks/useGameOutletContext';
import ErrorState from './ErrorState';
import LoadingState from './LoadingState';
import GameContent from './GameContent';

export default function GamePage() {
    const { gameId, player, sessionId, game, puzzle, teamProgress, isLoading, error } = useGameOutletContext();

    if (!sessionId || !player) {
        return <ErrorState message='No active session found' />;
    }

    if (error) {
        return <ErrorState message={error} />;
    }

    if (isLoading || !game) {
        return <LoadingState />;
    }

    // Find player's team from teamProgress
    const playerTeam = teamProgress && player.team_id 
        ? { id: player.team_id, name: teamProgress.team_name, game_id: game.id, lobby_id: game.lobby_id, current_word_index: teamProgress.current_word_index, created_at: '', completed_at: teamProgress.completed_at }
        : null;

    return <GameContent gameId={gameId} player={player} team={playerTeam} game={game} puzzle={puzzle} teamProgress={teamProgress} />;
}
