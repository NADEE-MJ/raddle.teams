/**
 * Simplified game state hook - fully authoritative server model.
 *
 * The server is the single source of truth. This hook just:
 * 1. Maintains revealed_steps from server
 * 2. Maintains direction locally (per-client)
 * 3. Calculates which step to show as active
 * 4. Sends guesses to server and waits for response
 * 5. Updates when server broadcasts state changes
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Puzzle } from '@/types/game';
import type { GameWonEvent } from '@/types';

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
}

export function useGameState({ puzzle, initialState, websocketUrl, onGameWon, onTeamCompleted }: UseGameStateProps) {
    // Server state
    const [revealedSteps, setRevealedSteps] = useState<Set<number>>(new Set(initialState.revealed_steps));
    const [isCompleted, setIsCompleted] = useState(initialState.is_completed);

    // Client-only state
    const [direction, setDirection] = useState<'down' | 'up'>('down');
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const wsRef = useRef<WebSocket | null>(null);

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

    // Can switch direction if there are unrevealed steps in both directions
    const canSwitchDirection = !isCompleted && revealedSteps.size < puzzle.ladder.length;

    // WebSocket connection
    useEffect(() => {
        const ws = new WebSocket(websocketUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log('[SimpleGameState] WebSocket connected');
            setIsConnected(true);
        };

        ws.onclose = () => {
            console.log('[SimpleGameState] WebSocket disconnected');
            setIsConnected(false);
        };

        ws.onerror = error => {
            console.error('[SimpleGameState] WebSocket error:', error);
            setError('Connection error');
        };

        ws.onmessage = event => {
            try {
                const message = JSON.parse(event.data);
                handleServerMessage(message);
            } catch (err) {
                console.error('[SimpleGameState] Failed to parse message:', err);
            }
        };

        return () => {
            ws.close();
            wsRef.current = null;
        };
    }, [websocketUrl]);

    const handleServerMessage = useCallback(
        (message: any) => {
            console.log('[SimpleGameState] Received message:', message.type, message);

            switch (message.type) {
                case 'state_update':
                    // Server updated state - sync our revealed steps
                    setRevealedSteps(new Set(message.revealed_steps));
                    setIsCompleted(message.is_completed);
                    setError(null);
                    break;

                case 'already_solved':
                    // Word was already solved by someone else
                    setError('This word was just solved by a teammate!');
                    setTimeout(() => setError(null), 3000);
                    break;

                case 'guess_submitted':
                    // Someone submitted a guess - we'll get state_update if correct
                    break;

                case 'word_solved':
                    // Someone solved a word - we'll get state_update
                    break;

                case 'team_completed':
                    console.log('[SimpleGameState] Team completed!');
                    onTeamCompleted?.();
                    break;

                case 'game_won':
                    console.log('[SimpleGameState] Game won!', message);
                    onGameWon?.(message);
                    break;

                default:
                    console.warn('[SimpleGameState] Unknown message type:', message.type);
            }
        },
        [onGameWon, onTeamCompleted]
    );

    // Submit guess - just send to server and wait for response
    const submitGuess = useCallback(
        (guess: string) => {
            if (!wsRef.current || !isConnected) {
                setError('Not connected to server');
                return;
            }

            if (isCompleted) {
                return;
            }

            const message = {
                action: 'submit_guess',
                guess: guess.toUpperCase(),
                word_index: activeStepId,
            };

            console.log('[SimpleGameState] Submitting guess:', message);
            wsRef.current.send(JSON.stringify(message));
        },
        [isConnected, isCompleted, activeStepId]
    );

    // Switch direction - purely local, no server communication
    const switchDirection = useCallback(() => {
        if (!canSwitchDirection) {
            return;
        }
        setDirection(prev => (prev === 'down' ? 'up' : 'down'));
    }, [canSwitchDirection]);

    return {
        // Server state
        revealedSteps: Array.from(revealedSteps),
        isCompleted,

        // Client state
        direction,
        currentQuestion,
        currentAnswer,
        activeStepId,
        canSwitchDirection,

        // Connection
        isConnected,
        error,

        // Actions
        submitGuess,
        switchDirection,
    };
}
