import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { 
    Game, 
    Puzzle, 
    TeamProgress, 
    LeaderboardEntry, 
    GuessSubmissionRequest, 
    GuessSubmissionResult,
    Player,
    GameWebSocketEvent,
    WordSolvedEvent,
    TeamProgressUpdateEvent,
    TeamCompletedEvent,
    LeaderboardUpdateEvent,
    GameStartedEvent,
    GameFinishedEvent
} from '@/types';
import { api } from '@/services/api';

interface GameContextType {
    // Game state
    currentGame: Game | null;
    puzzle: Puzzle | null;
    teamProgress: TeamProgress | null;
    leaderboard: LeaderboardEntry[];
    
    // Loading states
    isLoading: boolean;
    isSubmittingGuess: boolean;
    error: string | null;
    
    // Actions
    loadCurrentGame: () => Promise<void>;
    loadPuzzle: (gameId: number) => Promise<void>;
    loadTeamProgress: (gameId: number) => Promise<void>;
    loadLeaderboard: (gameId: number) => Promise<void>;
    submitGuess: (gameId: number, guess: GuessSubmissionRequest) => Promise<GuessSubmissionResult>;
    
    // WebSocket events
    onGameEvent: (event: GameWebSocketEvent) => void;
    
    // Refresh methods
    refreshAll: () => Promise<void>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const useGameContext = () => {
    const context = useContext(GameContext);
    if (!context) {
        throw new Error('useGameContext must be used within a GameProvider');
    }
    return context;
};

interface GameProviderProps {
    children: React.ReactNode;
    player: Player | null;
    sessionId: string | null;
}

export const GameProvider: React.FC<GameProviderProps> = ({ children, player, sessionId }) => {
    const [currentGame, setCurrentGame] = useState<Game | null>(null);
    const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
    const [teamProgress, setTeamProgress] = useState<TeamProgress | null>(null);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmittingGuess, setIsSubmittingGuess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Ref to prevent multiple simultaneous refreshes
    const refreshingRef = useRef(false);

    const loadCurrentGame = useCallback(async () => {
        if (!sessionId) return;
        
        try {
            setIsLoading(true);
            setError(null);
            const game = await api.player.game.getCurrentGame(sessionId);
            setCurrentGame(game);
        } catch (err) {
            console.error('Failed to load current game:', err);
            setError('Failed to load game');
        } finally {
            setIsLoading(false);
        }
    }, [sessionId]);

    const loadPuzzle = useCallback(async (gameId: number) => {
        if (!sessionId) return;
        
        try {
            const puzzleData = await api.player.game.getPuzzle(gameId, sessionId);
            setPuzzle(puzzleData);
        } catch (err) {
            console.error('Failed to load puzzle:', err);
            setError('Failed to load puzzle');
        }
    }, [sessionId]);

    const loadTeamProgress = useCallback(async (gameId: number) => {
        if (!sessionId || !player?.team_id) return;
        
        try {
            const progress = await api.player.game.getTeamProgress(gameId, sessionId);
            setTeamProgress(progress);
        } catch (err) {
            console.error('Failed to load team progress:', err);
            // Don't set error here as player might not be assigned to team yet
        }
    }, [sessionId, player?.team_id]);

    const loadLeaderboard = useCallback(async (gameId: number) => {
        if (!sessionId) return;
        
        try {
            const leaderboardData = await api.player.game.getLeaderboard(gameId, sessionId);
            setLeaderboard(leaderboardData);
        } catch (err) {
            console.error('Failed to load leaderboard:', err);
        }
    }, [sessionId]);

    const submitGuess = useCallback(async (
        gameId: number, 
        guess: GuessSubmissionRequest
    ): Promise<GuessSubmissionResult> => {
        if (!sessionId) {
            throw new Error('No session ID');
        }
        
        try {
            setIsSubmittingGuess(true);
            setError(null);
            const result = await api.player.game.submitGuess(gameId, guess, sessionId);
            
            // Refresh team progress after successful submission
            if (result.is_correct || result.progress_updated) {
                await loadTeamProgress(gameId);
                await loadLeaderboard(gameId);
            }
            
            return result;
        } catch (err) {
            console.error('Failed to submit guess:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to submit guess';
            setError(errorMessage);
            throw err;
        } finally {
            setIsSubmittingGuess(false);
        }
    }, [sessionId, loadTeamProgress, loadLeaderboard]);

    const refreshAll = useCallback(async () => {
        if (!currentGame || refreshingRef.current) return;
        
        refreshingRef.current = true;
        try {
            await Promise.all([
                loadTeamProgress(currentGame.id),
                loadLeaderboard(currentGame.id)
            ]);
        } finally {
            refreshingRef.current = false;
        }
    }, [currentGame, loadTeamProgress, loadLeaderboard]);

    // Handle WebSocket game events
    const onGameEvent = useCallback((event: GameWebSocketEvent) => {
        console.debug('Game event received:', event);
        
        switch (event.type) {
            case 'guess_submitted':
                // Refresh team progress and leaderboard for any guess
                if (currentGame) {
                    refreshAll();
                }
                break;
                
            case 'word_solved': {
                const wordSolvedEvent = event as WordSolvedEvent;
                if (currentGame && currentGame.id === wordSolvedEvent.game_id) {
                    refreshAll();
                }
                break;
            }
                
            case 'team_progress_update': {
                const progressEvent = event as TeamProgressUpdateEvent;
                // Update team progress if it's for current player's team
                if (player?.team_id === progressEvent.team_id) {
                    loadTeamProgress(progressEvent.game_id);
                }
                loadLeaderboard(progressEvent.game_id);
                break;
            }
                
            case 'team_completed': {
                const completedEvent = event as TeamCompletedEvent;
                if (currentGame && currentGame.id === completedEvent.game_id) {
                    refreshAll();
                }
                break;
            }
                
            case 'leaderboard_update': {
                const leaderboardEvent = event as LeaderboardUpdateEvent;
                setLeaderboard(leaderboardEvent.leaderboard);
                break;
            }
                
            case 'game_started': {
                const startedEvent = event as GameStartedEvent;
                // Reload game data when game starts
                if (currentGame?.id === startedEvent.game_id) {
                    loadCurrentGame();
                    if (puzzle) {
                        refreshAll();
                    }
                }
                break;
            }
                
            case 'game_finished': {
                const finishedEvent = event as GameFinishedEvent;
                // Update game state when finished
                if (currentGame?.id === finishedEvent.game_id) {
                    setCurrentGame(prev => prev ? { ...prev, state: 'finished' } : null);
                    refreshAll();
                }
                break;
            }
        }
    }, [currentGame, player?.team_id, loadCurrentGame, loadTeamProgress, loadLeaderboard, refreshAll, puzzle]);

    // Load initial game data
    useEffect(() => {
        if (sessionId) {
            loadCurrentGame();
        }
    }, [sessionId, loadCurrentGame]);

    // Load puzzle and related data when game changes
    useEffect(() => {
        if (currentGame) {
            loadPuzzle(currentGame.id);
            if (currentGame.state === 'active') {
                refreshAll();
            }
        }
    }, [currentGame, loadPuzzle, refreshAll]);

    const contextValue: GameContextType = {
        currentGame,
        puzzle,
        teamProgress,
        leaderboard,
        isLoading,
        isSubmittingGuess,
        error,
        loadCurrentGame,
        loadPuzzle,
        loadTeamProgress,
        loadLeaderboard,
        submitGuess,
        onGameEvent,
        refreshAll,
    };

    return (
        <GameContext.Provider value={contextValue}>
            {children}
        </GameContext.Provider>
    );
};