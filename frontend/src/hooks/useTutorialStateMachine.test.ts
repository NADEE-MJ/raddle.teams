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
            expect(result.current.getHintsUsedForStep(1)).toBe(0); // No hints used initially
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
        it('handleGuess calls dispatch with correct event', () => {
            const { result } = hookResult;

            act(() => {
                result.current.handleGuess('SOUTH');
            });

            expect(result.current.state.revealedSteps.has(1)).toBe(true);
        });

        it('handleSwitchDirection calls dispatch with correct event', () => {
            const { result } = hookResult;

            act(() => {
                result.current.handleSwitchDirection();
            });

            expect(result.current.state.phase).toBe('UPWARD');
        });

        it('handleReset calls dispatch with correct event', () => {
            const { result } = hookResult;

            act(() => {
                result.current.handleGuess('SOUTH');
                result.current.handleReset();
            });

            expect(result.current.state.phase).toBe('DOWNWARD');
            expect(result.current.state.currentQuestion).toBe(0);
        });

        it('handleHint calls dispatch with correct event', () => {
            const { result } = hookResult;
            const activeStepId = result.current.getActiveStepId();

            act(() => {
                result.current.handleHint();
            });

            expect(result.current.getHintsUsedForStep(activeStepId)).toBe(1);
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

        it('canSwitchDirection stays in sync with state machine', () => {
            const { result } = hookResult;

            expect(result.current.canSwitchDirection).toBe(true);

            act(() => {
                result.current.handleSwitchDirection();
            });

            expect(result.current.canSwitchDirection).toBe(true);
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
        it('handles multiple actions in single act() correctly', () => {
            const { result } = hookResult;

            act(() => {
                result.current.handleGuess('SOUTH');
                result.current.handleSwitchDirection();
            });

            expect(result.current.state.phase).toBe('UPWARD');
            expect(result.current.state.revealedSteps.has(1)).toBe(true);
        });
    });

    describe('hook stability', () => {
        it('maintains stable references for callback functions', () => {
            const { result, rerender } = hookResult;

            const initialHandleGuess = result.current.handleGuess;
            const initialHandleSwitchDirection = result.current.handleSwitchDirection;
            const initialHandleReset = result.current.handleReset;
            const initialDispatch = result.current.dispatch;

            rerender();

            expect(result.current.handleGuess).toBe(initialHandleGuess);
            expect(result.current.handleSwitchDirection).toBe(initialHandleSwitchDirection);
            expect(result.current.handleReset).toBe(initialHandleReset);
            expect(result.current.dispatch).toBe(initialDispatch);
        });

        it('maintains stable references for helper functions', () => {
            const { result, rerender } = hookResult;

            const initialIsActiveStep = result.current.isActiveStep;
            const initialIsStepRevealed = result.current.isStepRevealed;
            const initialIsCurrentQuestion = result.current.isCurrentQuestion;
            const initialIsCurrentAnswer = result.current.isCurrentAnswer;

            rerender();

            expect(result.current.isActiveStep).toBe(initialIsActiveStep);
            expect(result.current.isStepRevealed).toBe(initialIsStepRevealed);
            expect(result.current.isCurrentQuestion).toBe(initialIsCurrentQuestion);
            expect(result.current.isCurrentAnswer).toBe(initialIsCurrentAnswer);
        });

        it('creates new state machine instance only once', () => {
            const { result, rerender } = hookResult;

            const firstMachineRef = result.current.dispatch;

            rerender();

            const secondMachineRef = result.current.dispatch;

            expect(firstMachineRef).toBe(secondMachineRef);
        });
    });

    describe('shuffleWithSeed', () => {
        it('returns a shuffled array', () => {
            const { result } = hookResult;
            const originalArray = [1, 2, 3, 4, 5];
            const shuffled = result.current.shuffleWithSeed(originalArray, 'test-seed');

            expect(shuffled).toHaveLength(originalArray.length);
            expect(shuffled).not.toBe(originalArray); // Different reference
            expect(shuffled.sort()).toEqual(originalArray.sort()); // Same elements
        });

        it('produces deterministic results with same seed', () => {
            const { result } = hookResult;
            const originalArray = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
            const seed = 'consistent-seed';

            const shuffle1 = result.current.shuffleWithSeed(originalArray, seed);
            const shuffle2 = result.current.shuffleWithSeed(originalArray, seed);

            expect(shuffle1).toEqual(shuffle2);
        });

        it('produces different results with different seeds', () => {
            const { result } = hookResult;
            const originalArray = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

            const shuffle1 = result.current.shuffleWithSeed(originalArray, 'seed-1');
            const shuffle2 = result.current.shuffleWithSeed(originalArray, 'seed-2');

            expect(shuffle1).not.toEqual(shuffle2);
        });

        it('does not mutate the original array', () => {
            const { result } = hookResult;
            const originalArray = [1, 2, 3, 4, 5];
            const originalCopy = [...originalArray];

            result.current.shuffleWithSeed(originalArray, 'test-seed');

            expect(originalArray).toEqual(originalCopy);
        });

        it('handles empty arrays', () => {
            const { result } = hookResult;
            const emptyArray: number[] = [];
            const shuffled = result.current.shuffleWithSeed(emptyArray, 'test-seed');

            expect(shuffled).toEqual([]);
        });

        it('handles single-element arrays', () => {
            const { result } = hookResult;
            const singleArray = [42];
            const shuffled = result.current.shuffleWithSeed(singleArray, 'test-seed');

            expect(shuffled).toEqual([42]);
        });

        it('properly converts string to numeric seed', () => {
            const { result } = hookResult;
            const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

            // Test with different seeds that should produce different results
            const shuffle1 = result.current.shuffleWithSeed(array, 'a');
            const shuffle2 = result.current.shuffleWithSeed(array, 'b');
            const shuffle3 = result.current.shuffleWithSeed(array, 'aa');

            // All should be different due to different seed conversion
            expect(shuffle1).not.toEqual(shuffle2);
            expect(shuffle1).not.toEqual(shuffle3);
            expect(shuffle2).not.toEqual(shuffle3);
        });
    });

    describe('hint functionality', () => {
        it('tracks hints used for specific steps', () => {
            const { result } = hookResult;
            const activeStepId = result.current.getActiveStepId();

            act(() => {
                result.current.handleHint();
            });

            expect(result.current.getHintsUsedForStep(activeStepId)).toBe(1);
            expect(result.current.getHintsUsedForStep(activeStepId + 1)).toBe(0);
        });

        it('persists hint count when switching directions', () => {
            const { result } = hookResult;
            const initialActiveStepId = result.current.getActiveStepId();

            act(() => {
                result.current.handleHint();
                result.current.handleSwitchDirection();
            });

            expect(result.current.getHintsUsedForStep(initialActiveStepId)).toBe(1);
        });

        it('resets hints when resetting game', () => {
            const { result } = hookResult;
            const activeStepId = result.current.getActiveStepId();

            act(() => {
                result.current.handleHint();
                result.current.handleReset();
            });

            expect(result.current.getHintsUsedForStep(activeStepId)).toBe(0);
        });
    });
});
