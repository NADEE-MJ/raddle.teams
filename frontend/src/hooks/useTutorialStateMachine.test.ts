import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTutorialStateMachine } from './useTutorialStateMachine';
import { Puzzle } from '@/types/game';

const TUTORIAL_PUZZLE: Puzzle = {
    title: 'From DOWN to EARTH',
    ladder: [
        {
            word: 'DOWN',
            clue: "Cardinal direction that's <> on a map, most of the time",
            transform: 'MEANS',
        },
        {
            word: 'SOUTH',
            clue: 'Change the first letter of <> to get a part of the body',
            transform: 'S->M',
        },
        {
            word: 'MOUTH',
            clue: 'Organ that sits inside the <>',
            transform: 'CONTAINS THE',
        },
        {
            word: 'TONGUE',
            clue: 'Piece of clothing that often has a <>',
            transform: 'IS ON A',
        },
        {
            word: 'SHOE',
            clue: 'Rubber layer on the bottom of a <>',
            transform: 'CONTAINS A',
        },
        {
            word: 'SOLE',
            clue: 'Kind of food or music that sounds like <>',
            transform: 'SOUNDS LIKE',
        },
        {
            word: 'SOUL',
            clue: 'Popular piano duet "{} and <>"',
            transform: 'IS',
        },
        {
            word: 'HEART',
            clue: 'Move the first letter of <> to the end to get where we are',
            transform: 'H -> END',
        },
        {
            word: 'EARTH',
            clue: null,
            transform: null,
        },
    ],
};

describe('useTutorialStateMachine', () => {
    let hookResult: ReturnType<typeof renderHook<ReturnType<typeof useTutorialStateMachine>, unknown>>;

    beforeEach(() => {
        hookResult = renderHook(() => useTutorialStateMachine(TUTORIAL_PUZZLE));
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

            expect(result.current.isActiveStep(1)).toBe(true); // SOUTH
            expect(result.current.canSwitchDirection).toBe(true);
            expect(result.current.isStepRevealed(0)).toBe(true); // DOWN (initially revealed)
            expect(result.current.isStepRevealed(8)).toBe(true); // EARTH (initially revealed)
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
            expect(result.current.isActiveStep(2)).toBe(true);
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
            expect(result.current.state.revealedSteps.size).toBe(2); // DOWN and EARTH revealed initially
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
            expect(result.current.isActiveStep(1)).toBe(true);
            expect(result.current.isCurrentAnswer(1)).toBe(true);

            // Make a change and test consistency
            act(() => {
                result.current.handleGuess('SOUTH');
            });

            expect(result.current.isCurrentAnswer(2)).toBe(true); // MOUTH is now the current answer
            expect(result.current.isActiveStep(2)).toBe(true); // MOUTH is now the active step
            expect(result.current.isStepRevealed(1)).toBe(true); // SOUTH is now revealed
        });

        it('canSwitchDirection updates correctly', () => {
            const { result } = hookResult;

            expect(result.current.canSwitchDirection).toBe(true);

            // Advance to near the end to trigger direction locking
            act(() => {
                result.current.handleGuess('SOUTH');
                result.current.handleGuess('MOUTH');
                result.current.handleGuess('TONGUE');
                result.current.handleGuess('SHOE');
                result.current.handleGuess('SOLE');
                result.current.handleGuess('SOUL');
                result.current.handleGuess('HEART');
            });

            expect(result.current.canSwitchDirection).toBe(false);
        });
    });

    describe('completion flow', () => {
        it('handles complete puzzle workflow', () => {
            const { result } = hookResult;

            // Solve all steps step by step to see the progression
            act(() => {
                result.current.handleGuess('SOUTH'); // 0->1, should reveal SOUTH
            });
            expect(result.current.state.revealedSteps.size).toBe(3); // DOWN, SOUTH, EARTH

            act(() => {
                result.current.handleGuess('MOUTH'); // 1->2, should reveal MOUTH
            });
            expect(result.current.state.revealedSteps.size).toBe(4); // DOWN, SOUTH, MOUTH, EARTH

            act(() => {
                result.current.handleGuess('TONGUE'); // 2->3, should reveal TONGUE
            });
            expect(result.current.state.revealedSteps.size).toBe(5); // DOWN, SOUTH, MOUTH, TONGUE, EARTH

            act(() => {
                result.current.handleGuess('SHOE'); // 3->4, should reveal SHOE
            });
            expect(result.current.state.revealedSteps.size).toBe(6); // DOWN, SOUTH, MOUTH, TONGUE, SHOE, EARTH

            act(() => {
                result.current.handleGuess('SOLE'); // 4->5, should reveal SOLE
            });
            expect(result.current.state.revealedSteps.size).toBe(7); // DOWN, SOUTH, MOUTH, TONGUE, SHOE, SOLE, EARTH

            act(() => {
                result.current.handleGuess('SOUL'); // 5->6, should reveal SOUL
            });
            expect(result.current.state.revealedSteps.size).toBe(8); // DOWN, SOUTH, MOUTH, TONGUE, SHOE, SOLE, SOUL, EARTH

            act(() => {
                result.current.handleGuess('HEART'); // 6->7, should reveal HEART and lock direction
            });

            expect(result.current.state.phase).toBe('DIRECTION_LOCKED');
            expect(result.current.state.isCompleted).toBe(false);
            expect(result.current.state.revealedSteps.size).toBe(8); // All except EARTH (which gets unrevealed)

            act(() => {
                result.current.handleGuess('EARTH'); // 7->8, should complete the puzzle
            });

            expect(result.current.state.phase).toBe('COMPLETED');
            expect(result.current.state.isCompleted).toBe(true);
            expect(result.current.state.revealedSteps.size).toBe(9); // All steps revealed
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
            // When switching to upward, it should find the next unrevealed step from the bottom
            expect(result.current.state.currentQuestion).toBe(7); // HEART
            expect(result.current.state.currentAnswer).toBe(8); // EARTH
            expect(result.current.isActiveStep(7)).toBe(true);
        });
    });
});
