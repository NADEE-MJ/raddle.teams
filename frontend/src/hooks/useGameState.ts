/**
 * Simplified game state hook - fully authoritative server model.
 */

import { useCallback, useState } from 'react';
import { useWebSocket } from './useWebSocket';
import type { Puzzle } from '@/types/game';
import type { GameWonEvent, GuessSubmittedEvent, WebSocketMessage } from '@/types';

interface GameState {
    revealed_steps: number[];
    is_completed: boolean;
    last_updated_at: string;
}

interface UseGameStateProps {
    puzzle: Puzzle;
    initialState: GameState;
    websocketUrl: string;
    onGameWon?: (event: GameWonEvent) => void;
    onTeamCompleted?: () => void;
    onPlayerKicked?: () => void;
    onTeamChanged?: () => void;
    onGameEnded?: () => void;
    onGameStarted?: () => void;
    sessionId?: string;
    maxRetries?: number;
    onMaxRetriesReached?: () => void;
    onReconnecting?: (attemptNumber: number) => void;
}

export function useGameState({
    puzzle,
    initialState,
    websocketUrl,
    onGameWon,
    onTeamCompleted,
    onPlayerKicked,
    onTeamChanged,
    onGameEnded,
    onGameStarted,
    sessionId,
    maxRetries,
    onMaxRetriesReached,
    onReconnecting,
}: UseGameStateProps) {
    const [revealedSteps, setRevealedSteps] = useState<Set<number>>(new Set(initialState.revealed_steps));
    const [isCompleted, setIsCompleted] = useState(initialState.is_completed);
    const [direction, setDirection] = useState<'down' | 'up'>('down');
    const [error, setError] = useState<string | null>(null);
    const [lastGuessResult, setLastGuessResult] = useState<GuessSubmittedEvent | null>(null);

    const handleServerMessage = useCallback(
        (message: WebSocketMessage) => {
            console.log('[GameState] Received message:', message.type, message);

            switch (message.type) {
                case 'state_update':
                    if ('revealed_steps' in message && 'is_completed' in message) {
                        setRevealedSteps(new Set(message.revealed_steps as number[]));
                        setIsCompleted(message.is_completed as boolean);
                        setError(null);
                    }
                    break;

                case 'already_solved':
                    setError('This word was just solved by a teammate!');
                    setTimeout(() => setError(null), 3000);
                    break;

                case 'guess_submitted':
                    setLastGuessResult(message as GuessSubmittedEvent);
                    break;

                case 'team_completed':
                    console.log('[GameState] Team completed!');
                    onTeamCompleted?.();
                    break;

                case 'game_won':
                    console.log('[GameState] Game won!', message);
                    onGameWon?.(message as GameWonEvent);
                    break;

                case 'player_kicked':
                    console.log('[GameState] Player kicked event received');
                    // Check if it was us
                    if (sessionId && message.player_session_id === sessionId) {
                        onPlayerKicked?.();
                    }
                    break;

                case 'team_changed':
                    console.log('[GameState] Team changed event received');
                    // Check if it was us
                    if (sessionId && message.player_session_id === sessionId) {
                        onTeamChanged?.();
                    }
                    break;

                case 'game_ended':
                    console.log('[GameState] Game ended by admin');
                    onGameEnded?.();
                    break;

                case 'game_started':
                    console.log('[GameState] New game started');
                    onGameStarted?.();
                    break;

                default:
                    break;
            }
        },
        [onGameWon, onTeamCompleted, onPlayerKicked, onTeamChanged, onGameEnded, onGameStarted, sessionId]
    );

    const { isConnected, sendMessage, connectionStatus, retryCount, manualReconnect } = useWebSocket(websocketUrl, {
        onMessage: handleServerMessage,
        autoReconnect: true,
        maxRetries,
        onMaxRetriesReached,
        onReconnecting,
    });

    // Calculate current solving positions based on direction
    const getNextUnrevealedIndex = useCallback(
        (fromStart: boolean): number => {
            const ladderLength = puzzle.ladder.length;
            if (fromStart) {
                for (let i = 1; i < ladderLength; i++) {
                    if (!revealedSteps.has(i)) {
                        return i;
                    }
                }
                return ladderLength - 1;
            }

            for (let i = ladderLength - 2; i >= 0; i--) {
                if (!revealedSteps.has(i)) {
                    return i;
                }
            }
            return 0;
        },
        [puzzle.ladder.length, revealedSteps]
    );

    let currentQuestion: number;
    let currentAnswer: number;
    let activeStepId: number;

    if (direction === 'down') {
        currentAnswer = getNextUnrevealedIndex(true);
        currentQuestion = Math.max(0, currentAnswer - 1);
        activeStepId = currentAnswer;
    } else {
        currentQuestion = getNextUnrevealedIndex(false);
        currentAnswer = Math.min(puzzle.ladder.length - 1, currentQuestion + 1);
        activeStepId = currentQuestion;
    }

    const canSwitchDirection = !isCompleted && revealedSteps.size < puzzle.ladder.length;

    const submitGuess = useCallback(
        (guess: string) => {
            if (!isConnected) {
                setError('Not connected to server');
                return false;
            }

            if (isCompleted) {
                return false;
            }

            const message = {
                action: 'submit_guess',
                guess: guess.toUpperCase(),
                word_index: activeStepId,
            };

            console.log('[GameState] Submitting guess:', message);
            sendMessage(message);
            return true;
        },
        [isConnected, isCompleted, activeStepId, sendMessage]
    );

    const switchDirection = useCallback(() => {
        if (!canSwitchDirection) {
            return;
        }
        setDirection(prev => (prev === 'down' ? 'up' : 'down'));
    }, [canSwitchDirection]);

    return {
        revealedSteps: Array.from(revealedSteps),
        isCompleted,
        direction,
        currentQuestion,
        currentAnswer,
        activeStepId,
        canSwitchDirection,
        isConnected,
        error,
        submitGuess,
        switchDirection,
        connectionStatus,
        retryCount,
        manualReconnect,
        lastGuessResult,
    };
}
