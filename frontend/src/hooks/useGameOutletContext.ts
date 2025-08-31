import { useOutletContext } from 'react-router-dom';
import { Player, Game, Puzzle, TeamProgress, LeaderboardEntry } from '@/types';

export type GameOutletContext = {
    gameId: string;
    player: Player | null;
    sessionId: string | null;
    setSessionId: (sessionId: string | null) => void;
    game: Game | null;
    puzzle: Puzzle | null;
    teamProgress: TeamProgress | null;
    leaderboard: LeaderboardEntry[];
    isLoading: boolean;
    error: string | null;
    refreshGameData: () => Promise<void>;
};

export function useGameOutletContext() {
    return useOutletContext<GameOutletContext>();
}
