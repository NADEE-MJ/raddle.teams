import { useCallback } from 'react';
import { useWebSocket } from './useWebSocket';
import { useGameContext } from '@/context/GameContext';
import { GameWebSocketEvent } from '@/types';

interface UseGameWebSocketOptions {
    lobbyId?: number | null;
    sessionId?: string | null;
    enabled?: boolean;
}

export function useGameWebSocket(options: UseGameWebSocketOptions = {}) {
    const { lobbyId, sessionId, enabled = true } = options;
    const { onGameEvent } = useGameContext();

    const handleWebSocketMessage = useCallback((message: any) => {
        // Check if this is a game-related event
        const gameEvents = [
            'game_created',
            'game_started', 
            'game_finished',
            'guess_submitted',
            'word_solved',
            'team_progress_update',
            'team_completed',
            'leaderboard_update'
        ];

        if (message && typeof message === 'object' && gameEvents.includes(message.type)) {
            onGameEvent(message as GameWebSocketEvent);
        }
    }, [onGameEvent]);

    const { isConnected, error } = useWebSocket(
        enabled && lobbyId ? lobbyId : null, 
        enabled && sessionId ? sessionId : null, 
        {
            onMessage: handleWebSocketMessage,
        }
    );

    return {
        isConnected,
        error,
    };
}