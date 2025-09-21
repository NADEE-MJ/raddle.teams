import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTutorialStateMachine } from './useTutorialStateMachine';
import { Puzzle } from '@/types/game';

const TEST_PUZZLE: Puzzle = {
    title: 'Test Puzzle',
    ladder: [
        { word: 'DOWN', clue: 'First clue', transform: 'MEANS' },
        { word: 'SOUTH', clue: 'Second clue', transform: 'S->M' },
        { word: 'MOUTH', clue: 'Third clue', transform: 'CONTAINS THE' },
        { word: 'TONGUE', clue: 'Fourth clue', transform: 'IS ON A' },
        { word: 'SHOE', clue: 'Fifth clue', transform: null },
    ],
};

describe('useTutorialStateMachine', () => {
    let hookResult: ReturnType<typeof renderHook<ReturnType<typeof useTutorialStateMachine>, unknown>>;

    beforeEach(() => {
        hookResult = renderHook(() => useTutorialStateMachine(TEST_PUZZLE));
    });

    describe('initial state', () => {
        it('returns initial state correctly', () => {
            const { result } = hookResult;

            expect(result.current.state.phase).toBe('DOWNWARD');
            expect(result.current.state.direction).toBe('down');
            expect(result.current.state.isCompleted).toBe(false);
            expect(result.current.state.currentQuestion).toBe(0);
            expect(result.current.state.currentAnswer).toBe(1);
        });

        it('provides helper methods with correct initial values', () => {
            const { result } = hookResult;

            expect(result.current.isActiveStepId(1)).toBe(true); // SOUTH
            expect(result.current.canSwitchDirection()).toBe(true);
            expect(result.current.isStepRevealed(0)).toBe(true); // DOWN (initially revealed)
            expect(result.current.isStepRevealed(1)).toBe(false); // SOUTH (not revealed yet)
            expect(result.current.isCurrentQuestion(0)).toBe(true);
            expect(result.current.isCurrentAnswer(1)).toBe(true);
        });
    });

    describe('state updates', () => {
        it('updates state when dispatching correct guess', () => {
            const { result } = hookResult;

            act(() => {
                result.current.handleGuess('SOUTH');
            });

            expect(result.current.state.revealedSteps.has(1)).toBe(true);
            expect(result.current.state.currentQuestion).toBe(1); // SOUTH becomes question
            expect(result.current.state.currentAnswer).toBe(2); // MOUTH becomes answer
            expect(result.current.isActiveStepId(2)).toBe(true);
        });

        it('updates state when switching direction', () => {
            const { result } = hookResult;

            act(() => {
                result.current.handleSwitchDirection();
            });

            expect(result.current.state.phase).toBe('UPWARD');
            expect(result.current.state.direction).toBe('up');
        });

        it('updates state when resetting', () => {
            const { result } = hookResult;

            // Make some changes first
            act(() => {
                result.current.handleGuess('SOUTH');
                result.current.handleSwitchDirection();
            });

            // Then reset
            act(() => {
                result.current.handleReset();
            });

            expect(result.current.state.phase).toBe('DOWNWARD');
            expect(result.current.state.direction).toBe('down');
            expect(result.current.state.currentQuestion).toBe(0);
            expect(result.current.state.currentAnswer).toBe(1);
            expect(result.current.state.revealedSteps.size).toBe(2); // Back to initial
        });
    });

    describe('convenience handlers', () => {
        it('handleGuess works with valid guess', () => {
            const { result } = hookResult;
            const initialRevealedCount = result.current.state.revealedSteps.size;

            act(() => {
                result.current.handleGuess('SOUTH');
            });

            expect(result.current.state.revealedSteps.size).toBe(initialRevealedCount + 1);
        });

        it('handleGuess ignores invalid guess', () => {
            const { result } = hookResult;
            const initialState = result.current.state;

            act(() => {
                result.current.handleGuess('WRONG');
            });

            expect(result.current.state).toEqual(initialState);
        });

        it('handleSwitchDirection changes phase and direction', () => {
            const { result } = hookResult;

            expect(result.current.state.phase).toBe('DOWNWARD');

            act(() => {
                result.current.handleSwitchDirection();
            });

            expect(result.current.state.phase).toBe('UPWARD');
            expect(result.current.state.direction).toBe('up');
        });
    });

    describe('helper method consistency', () => {
        it('helper methods stay consistent with state machine', () => {
            const { result } = hookResult;

            // Test initial state
            expect(result.current.isActiveStepId(1)).toBe(true);
            expect(result.current.isCurrentAnswer(1)).toBe(true);

            // Make a change and test consistency
            act(() => {
                result.current.handleGuess('SOUTH');
            });

            expect(result.current.isCurrentAnswer(1)).toBe(true);
            expect(result.current.isActiveStepId(1)).toBe(true);
            expect(result.current.isStepRevealed(1)).toBe(true); // Previous answer now revealed
        });

        it('canSwitchDirection updates correctly', () => {
            const { result } = hookResult;

            expect(result.current.canSwitchDirection()).toBe(true);

            // Advance to near the end to trigger direction locking
            act(() => {
                result.current.handleGuess('SOUTH');
                result.current.handleGuess('MOUTH');
                result.current.handleGuess('TONGUE');
            });

            expect(result.current.canSwitchDirection()).toBe(false);
        });
    });

    describe('completion flow', () => {
        it('handles complete puzzle workflow', () => {
            const { result } = hookResult;

            // Solve all steps
            act(() => {
                result.current.handleGuess('SOUTH');
                result.current.handleGuess('MOUTH');
                result.current.handleGuess('TONGUE');
                result.current.handleGuess('SHOE');
            });

            expect(result.current.state.phase).toBe('COMPLETED');
            expect(result.current.state.isCompleted).toBe(true);
            expect(result.current.state.revealedSteps.size).toBe(5); // All steps revealed
        });
    });

    describe('state immutability', () => {
        it('returns new state objects on updates', () => {
            const { result } = hookResult;
            const initialState = result.current.state;

            act(() => {
                result.current.handleGuess('SOUTH');
            });

            expect(result.current.state).not.toBe(initialState);
            expect(result.current.state.revealedSteps).not.toBe(initialState.revealedSteps);
        });
    });

    describe('multiple dispatches', () => {
        it('handles rapid state changes correctly', () => {
            const { result } = hookResult;

            act(() => {
                result.current.handleGuess('SOUTH'); // Reveals SOUTH (step 1)
                result.current.handleSwitchDirection(); // Switch to upward
            });

            // Check that direction switching worked and we have the right state
            expect(result.current.state.phase).toBe('UPWARD');
            expect(result.current.state.direction).toBe('up');
            expect(result.current.state.revealedSteps.has(1)).toBe(true); // SOUTH is revealed

            // The active step should be different after direction switch
            const activeStepAfterSwitch = result.current.getActiveStepId();
            expect(activeStepAfterSwitch).not.toBe(1); // Should not be SOUTH anymore
        });
    });
});
