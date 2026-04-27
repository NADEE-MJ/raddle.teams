import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useGameState } from './useGameState';
import type { Puzzle } from '@/types/game';

// Mock useWebSocket
vi.mock('./useWebSocket', () => ({
    useWebSocket: vi.fn((url, options) => {
        // Store the options globally so we can trigger callbacks in tests
        (globalThis as any).__mockWebSocketOptions = options;
        return {
            isConnected: true,
            sendMessage: vi.fn(),
        };
    }),
}));

describe('useGameState', () => {
    const mockPuzzle: Puzzle = {
        meta: {
            title: 'Test Puzzle',
            difficulty: 'easy',
        },
        ladder: [
            { word: 'START', clue: 'Begin', transform: '' },
            { word: 'STARE', clue: 'Look', transform: 'T->E' },
            { word: 'SHARE', clue: 'Give', transform: 'T->H' },
            { word: 'FINAL', clue: 'End', transform: '' },
        ],
    };

    const mockInitialState = {
        revealed_steps: [0, 3],
        is_completed: false,
        last_updated_at: '2025-01-01T00:00:00Z',
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (globalThis as any).__mockWebSocketOptions = null;
    });

    afterEach(() => {
        delete (globalThis as any).__mockWebSocketOptions;
    });

    describe('Initialization', () => {
        it('should initialize with initial state', () => {
            const { result } = renderHook(() =>
                useGameState({
                    puzzle: mockPuzzle,
                    initialState: mockInitialState,
                    websocketUrl: 'ws://test',
                })
            );

            expect(result.current.revealedSteps).toEqual([0, 3]);
            expect(result.current.isCompleted).toBe(false);
            expect(result.current.direction).toBe('down');
        });

        it('should have isConnected status from WebSocket', () => {
            const { result } = renderHook(() =>
                useGameState({
                    puzzle: mockPuzzle,
                    initialState: mockInitialState,
                    websocketUrl: 'ws://test',
                })
            );

            expect(result.current.isConnected).toBe(true);
        });
    });

    describe('Direction Management', () => {
        it('should switch direction from down to up', () => {
            const { result } = renderHook(() =>
                useGameState({
                    puzzle: mockPuzzle,
                    initialState: mockInitialState,
                    websocketUrl: 'ws://test',
                })
            );

            expect(result.current.direction).toBe('down');

            act(() => {
                result.current.switchDirection();
            });

            expect(result.current.direction).toBe('up');
        });

        it('should switch direction from up to down', () => {
            const { result } = renderHook(() =>
                useGameState({
                    puzzle: mockPuzzle,
                    initialState: mockInitialState,
                    websocketUrl: 'ws://test',
                })
            );

            act(() => {
                result.current.switchDirection();
                result.current.switchDirection();
            });

            expect(result.current.direction).toBe('down');
        });

        it('should not allow direction switch when completed', () => {
            const completedState = { ...mockInitialState, is_completed: true };
            const { result } = renderHook(() =>
                useGameState({
                    puzzle: mockPuzzle,
                    initialState: completedState,
                    websocketUrl: 'ws://test',
                })
            );

            const initialDirection = result.current.direction;

            act(() => {
                result.current.switchDirection();
            });

            expect(result.current.direction).toBe(initialDirection);
        });
    });

    describe('Active Step Calculation', () => {
        it('should calculate correct active step going down', () => {
            const { result } = renderHook(() =>
                useGameState({
                    puzzle: mockPuzzle,
                    initialState: mockInitialState,
                    websocketUrl: 'ws://test',
                })
            );

            expect(result.current.direction).toBe('down');
            expect(result.current.activeStepId).toBe(1); // First unrevealed step going down
        });

        it('should calculate correct active step going up', () => {
            const { result } = renderHook(() =>
                useGameState({
                    puzzle: mockPuzzle,
                    initialState: mockInitialState,
                    websocketUrl: 'ws://test',
                })
            );

            act(() => {
                result.current.switchDirection();
            });

            expect(result.current.direction).toBe('up');
            expect(result.current.activeStepId).toBe(2); // First unrevealed step going up
        });
    });

    describe('WebSocket Message Handling', () => {
        it('should handle state_update message', async () => {
            const { result } = renderHook(() =>
                useGameState({
                    puzzle: mockPuzzle,
                    initialState: mockInitialState,
                    websocketUrl: 'ws://test',
                })
            );

            const options = (globalThis as any).__mockWebSocketOptions;

            act(() => {
                options.onMessage({
                    type: 'state_update',
                    revealed_steps: [0, 1, 3],
                    is_completed: false,
                });
            });

            await waitFor(() => {
                expect(result.current.revealedSteps).toEqual([0, 1, 3]);
            });
        });

        it('should handle already_solved message', async () => {
            vi.useFakeTimers();

            try {
                const { result } = renderHook(() =>
                    useGameState({
                        puzzle: mockPuzzle,
                        initialState: mockInitialState,
                        websocketUrl: 'ws://test',
                    })
                );

                const options = (globalThis as any).__mockWebSocketOptions;

                act(() => {
                    options.onMessage({
                        type: 'already_solved',
                    });
                });

                expect(result.current.error).toBe('This word was just solved by a teammate!');

                await act(async () => {
                    await vi.runAllTimersAsync();
                });

                expect(result.current.error).toBeNull();
            } finally {
                vi.useRealTimers();
            }
        });

        it('should call onTeamCompleted when team_completed message received', () => {
            const onTeamCompleted = vi.fn();

            renderHook(() =>
                useGameState({
                    puzzle: mockPuzzle,
                    initialState: mockInitialState,
                    websocketUrl: 'ws://test',
                    onTeamCompleted,
                })
            );

            const options = (globalThis as any).__mockWebSocketOptions;

            act(() => {
                options.onMessage({
                    type: 'team_completed',
                });
            });

            expect(onTeamCompleted).toHaveBeenCalledTimes(1);
        });

        it('should call onGameWon when game_won message received', () => {
            const onGameWon = vi.fn();

            renderHook(() =>
                useGameState({
                    puzzle: mockPuzzle,
                    initialState: mockInitialState,
                    websocketUrl: 'ws://test',
                    onGameWon,
                })
            );

            const options = (globalThis as any).__mockWebSocketOptions;
            const gameWonEvent = {
                type: 'game_won',
                winning_team_id: 1,
                winning_team_name: 'Team A',
            };

            act(() => {
                options.onMessage(gameWonEvent);
            });

            expect(onGameWon).toHaveBeenCalledWith(gameWonEvent);
        });
    });
});
