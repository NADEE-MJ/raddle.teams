import { describe, it, expect, beforeEach } from 'vitest';
import { TutorialStateMachine } from './TutorialStateMachine';
import { Puzzle } from '@/types/game';

const TEST_PUZZLE: Puzzle = {
    title: 'Test Puzzle',
    ladder: [
        { word: 'DOWN', clue: 'first clue', transform: 'MEANS' },
        { word: 'SOUTH', clue: 'second clue', transform: 'S->M' },
        { word: 'MOUTH', clue: 'third clue', transform: 'CONTAINS THE' },
        { word: 'TONGUE', clue: 'fourth clue', transform: 'IS ON A' },
        { word: 'SHOE', clue: 'fifth clue', transform: 'CONTAINS A' },
        { word: 'SOLE', clue: 'sixth clue', transform: 'SOUNDS LIKE' },
        { word: 'SOUL', clue: 'seventh clue', transform: 'IS' },
        { word: 'HEART', clue: 'eighth clue', transform: 'H -> END' },
        { word: 'EARTH', clue: null, transform: null },
    ],
};

describe('TutorialStateMachine', () => {
    let machine: TutorialStateMachine;

    beforeEach(() => {
        machine = new TutorialStateMachine(TEST_PUZZLE);
    });

    describe('initial state', () => {
        it('starts in DOWNWARD phase', () => {
            const state = machine.getCurrentState();
            expect(state.phase).toBe('DOWNWARD');
            expect(state.direction).toBe('down');
        });

        it('reveals first and last steps initially', () => {
            const state = machine.getCurrentState();
            expect(state.revealedSteps.has(0)).toBe(true);
            console.log(state.revealedSteps);
            expect(state.revealedSteps.has(8)).toBe(true);
            expect(state.revealedSteps.size).toBe(2);
        });

        it('sets initial question/answer pair', () => {
            const state = machine.getCurrentState();
            expect(state.currentQuestion).toBe(0); // DOWN
            expect(state.currentAnswer).toBe(1); // SOUTH
        });

        it('is not completed initially', () => {
            const state = machine.getCurrentState();
            expect(state.isCompleted).toBe(false);
        });
    });

    describe('helper methods', () => {
        it('identifies active step correctly', () => {
            expect(machine.getActiveStepId()).toBe(1);
        });

        it('checks if steps are revealed', () => {
            expect(machine.isStepRevealed(0)).toBe(true); // DOWN (initially revealed)
            expect(machine.isStepRevealed(1)).toBe(false); // SOUTH (not revealed yet)
            expect(machine.isStepRevealed(8)).toBe(true); // EARTH (initially revealed)
        });

        it('identifies current question and answer', () => {
            expect(machine.isCurrentQuestion(0)).toBe(true); // DOWN
            expect(machine.isCurrentAnswer(1)).toBe(true); // SOUTH
            expect(machine.isCurrentQuestion(2)).toBe(false); // MOUTH
            expect(machine.isCurrentAnswer(2)).toBe(false); // MOUTH
        });

        it('allows direction switching initially', () => {
            expect(machine.canSwitchDirection()).toBe(true);
        });
    });

    describe('guess handling', () => {
        it('advances to next step on correct guess', () => {
            const newState = machine.dispatch({ type: 'GUESS', guess: 'SOUTH' });

            expect(newState.revealedSteps.has(1)).toBe(true); // SOUTH now revealed
            expect(newState.currentQuestion).toBe(1); // SOUTH becomes question
            expect(newState.currentAnswer).toBe(2); // MOUTH becomes answer
            expect(newState.revealedSteps.size).toBe(3); // 0, 1, 8
            expect(newState.revealedSteps.has(0)).toBe(true); // DOWN
            expect(newState.revealedSteps.has(8)).toBe(true); // EARTH
        });

        it('ignores incorrect guesses', () => {
            const initialState = machine.getCurrentState();
            const newState = machine.dispatch({ type: 'GUESS', guess: 'WRONG' });

            expect(newState).toEqual(initialState);
            expect(newState.revealedSteps.size).toBe(2);
            expect(newState.revealedSteps.has(0)).toBe(true);
            expect(newState.revealedSteps.has(8)).toBe(true);
        });

        it('is case insensitive', () => {
            const newState = machine.dispatch({ type: 'GUESS', guess: 'south' });
            expect(newState.revealedSteps.has(1)).toBe(true);
            expect(newState.revealedSteps.size).toBe(3);
        });

        it('unreveals the last step when reaching second-to-last step going downward', () => {
            // Progress to second-to-last step (index 7)
            machine.dispatch({ type: 'GUESS', guess: 'SOUTH' });
            machine.dispatch({ type: 'GUESS', guess: 'MOUTH' });
            machine.dispatch({ type: 'GUESS', guess: 'TONGUE' });
            machine.dispatch({ type: 'GUESS', guess: 'SHOE' });
            machine.dispatch({ type: 'GUESS', guess: 'SOLE' });
            machine.dispatch({ type: 'GUESS', guess: 'SOUL' });

            const beforeLastGuess = machine.getCurrentState();
            expect(beforeLastGuess.revealedSteps.has(8)).toBe(true); // EARTH still revealed
            expect(beforeLastGuess.currentAnswer).toBe(7); // About to guess HEART (index 7)

            const afterLastGuess = machine.dispatch({ type: 'GUESS', guess: 'HEART' });
            expect(afterLastGuess.revealedSteps.has(8)).toBe(false); // EARTH now unrevealed
            expect(afterLastGuess.currentAnswer).toBe(8); // Now targeting EARTH
            expect(afterLastGuess.phase).toBe('DIRECTION_LOCKED');
        });

        it('unreveals the first step when reaching second step going upward', () => {
            machine.dispatch({ type: 'SWITCH_DIRECTION' });
            // Progress to second step (currentQuestion = 1)
            machine.dispatch({ type: 'GUESS', guess: 'HEART' });
            machine.dispatch({ type: 'GUESS', guess: 'SOUL' });
            machine.dispatch({ type: 'GUESS', guess: 'SOLE' });
            machine.dispatch({ type: 'GUESS', guess: 'SHOE' });
            machine.dispatch({ type: 'GUESS', guess: 'TONGUE' });
            machine.dispatch({ type: 'GUESS', guess: 'MOUTH' });

            const beforeLastGuess = machine.getCurrentState();
            expect(beforeLastGuess.revealedSteps.has(0)).toBe(true); // DOWN still revealed
            expect(beforeLastGuess.currentQuestion).toBe(1); // About to guess SOUTH (currentQuestion = 1)

            const afterLastGuess = machine.dispatch({ type: 'GUESS', guess: 'SOUTH' });
            expect(afterLastGuess.revealedSteps.has(0)).toBe(false); // DOWN now unrevealed
            expect(afterLastGuess.currentQuestion).toBe(0); // Now targeting DOWN
            expect(afterLastGuess.phase).toBe('DIRECTION_LOCKED'); // Now locked
        });
    });

    describe('direction switching', () => {
        it('switches from downward to upward', () => {
            const initialState = machine.getCurrentState();
            expect(initialState.phase).toBe('DOWNWARD');
            expect(initialState.direction).toBe('down');
            expect(initialState.revealedSteps).toEqual(new Set([0, 8]));

            const newState = machine.dispatch({ type: 'SWITCH_DIRECTION' });

            expect(newState.phase).toBe('UPWARD');
            expect(newState.direction).toBe('up');
            expect(newState.revealedSteps).toEqual(new Set([0, 8])); // Revealed steps unchanged
        });

        it('switches back to downward from upward', () => {
            machine.dispatch({ type: 'SWITCH_DIRECTION' }); // Go upward first
            const intermediateState = machine.getCurrentState();
            expect(intermediateState.phase).toBe('UPWARD');
            expect(intermediateState.direction).toBe('up');
            expect(intermediateState.revealedSteps).toEqual(new Set([0, 8]));

            const newState = machine.dispatch({ type: 'SWITCH_DIRECTION' }); // Go back downward
            expect(newState.phase).toBe('DOWNWARD');
            expect(newState.direction).toBe('down');
            expect(newState.revealedSteps).toEqual(new Set([0, 8])); // Revealed steps unchanged
        });

        it('finds correct question/answer pair when switching to upward', () => {
            const newState = machine.dispatch({ type: 'SWITCH_DIRECTION' });

            // Should find the last unrevealed step and work backwards
            expect(newState.currentAnswer).toBe(8);
            expect(newState.currentQuestion).toBe(7);
            expect(newState.revealedSteps).toEqual(new Set([0, 8]));
        });

        it('finds correct question/answer pair when switching back to downward', () => {
            machine.dispatch({ type: 'SWITCH_DIRECTION' }); // Upward
            const newState = machine.dispatch({ type: 'SWITCH_DIRECTION' }); // Back downward

            expect(newState.currentQuestion).toBe(0);
            expect(newState.currentAnswer).toBe(1);
            expect(newState.revealedSteps).toEqual(new Set([0, 8]));
        });

        it('switches direction correctly with some steps already revealed', () => {
            // Solve a few steps downward
            machine.dispatch({ type: 'GUESS', guess: 'SOUTH' });
            machine.dispatch({ type: 'GUESS', guess: 'MOUTH' });
            const midState = machine.getCurrentState();
            expect(midState.revealedSteps).toEqual(new Set([0, 1, 2, 8]));
            expect(midState.currentQuestion).toBe(2);
            expect(midState.currentAnswer).toBe(3);

            // Switch to upward
            const switchedState = machine.dispatch({ type: 'SWITCH_DIRECTION' });
            expect(switchedState.phase).toBe('UPWARD');
            expect(switchedState.direction).toBe('up');
            expect(switchedState.revealedSteps).toEqual(new Set([0, 1, 2, 8])); // Unchanged
            expect(switchedState.currentQuestion).toBe(7); // First unrevealed from top
            expect(switchedState.currentAnswer).toBe(8);
        });
    });

    describe('direction locking', () => {
        it('locks direction when near the end going downward', () => {
            // Advance to near the end
            machine.dispatch({ type: 'GUESS', guess: 'SOUTH' });
            machine.dispatch({ type: 'GUESS', guess: 'MOUTH' });
            machine.dispatch({ type: 'GUESS', guess: 'TONGUE' });
            machine.dispatch({ type: 'GUESS', guess: 'SHOE' });
            machine.dispatch({ type: 'GUESS', guess: 'SOLE' });
            const intermediateState = machine.dispatch({ type: 'GUESS', guess: 'SOUL' });
            expect(intermediateState.phase).toBe('DOWNWARD');
            expect(machine.canSwitchDirection()).toBe(true);

            const newState = machine.dispatch({ type: 'GUESS', guess: 'HEART' });

            expect(newState.phase).toBe('DIRECTION_LOCKED');
            expect(machine.canSwitchDirection()).toBe(false);
        });

        it('locks direction when near the beginning going upward', () => {
            machine.dispatch({ type: 'SWITCH_DIRECTION' });
            machine.dispatch({ type: 'GUESS', guess: 'HEART' });
            machine.dispatch({ type: 'GUESS', guess: 'SOUL' });
            machine.dispatch({ type: 'GUESS', guess: 'SOLE' });
            machine.dispatch({ type: 'GUESS', guess: 'SHOE' });
            machine.dispatch({ type: 'GUESS', guess: 'TONGUE' });
            const intermediateState = machine.dispatch({ type: 'GUESS', guess: 'MOUTH' });
            expect(intermediateState.phase).toBe('UPWARD');
            expect(machine.canSwitchDirection()).toBe(true);

            const newState = machine.dispatch({ type: 'GUESS', guess: 'SOUTH' });

            expect(newState.phase).toBe('DIRECTION_LOCKED');
            expect(machine.canSwitchDirection()).toBe(false);
        });

        it('prevents direction switching when locked', () => {
            machine.dispatch({ type: 'GUESS', guess: 'SOUTH' });
            machine.dispatch({ type: 'GUESS', guess: 'MOUTH' });
            machine.dispatch({ type: 'GUESS', guess: 'TONGUE' });
            machine.dispatch({ type: 'GUESS', guess: 'SHOE' });
            machine.dispatch({ type: 'GUESS', guess: 'SOLE' });
            machine.dispatch({ type: 'GUESS', guess: 'SOUL' });
            const intermediateState = machine.dispatch({ type: 'GUESS', guess: 'HEART' });
            expect(intermediateState.phase).toBe('DIRECTION_LOCKED');
            expect(machine.canSwitchDirection()).toBe(false);

            const lockedState = machine.getCurrentState();
            const attemptSwitchState = machine.dispatch({ type: 'SWITCH_DIRECTION' });

            expect(attemptSwitchState).toEqual(lockedState); // No change
        });
    });

    describe('puzzle completion', () => {
        it('completes puzzle when all steps are revealed', () => {
            // Solve all steps
            machine.dispatch({ type: 'GUESS', guess: 'SOUTH' });
            machine.dispatch({ type: 'GUESS', guess: 'MOUTH' });
            machine.dispatch({ type: 'GUESS', guess: 'TONGUE' });
            machine.dispatch({ type: 'GUESS', guess: 'SHOE' });
            machine.dispatch({ type: 'GUESS', guess: 'SOLE' });
            machine.dispatch({ type: 'GUESS', guess: 'SOUL' });
            const intermediateState = machine.dispatch({ type: 'GUESS', guess: 'HEART' });

            expect(intermediateState.phase).toBe('DIRECTION_LOCKED');
            expect(intermediateState.isCompleted).toBe(false);

            const completedState = machine.dispatch({ type: 'GUESS', guess: 'EARTH' });

            expect(completedState.phase).toBe('COMPLETED');
            expect(completedState.isCompleted).toBe(true);
            expect(completedState.revealedSteps.size).toBe(9); // All steps revealed
            expect(completedState.currentQuestion).toBe(-1);
            expect(completedState.currentAnswer).toBe(-1);
        });

        it('can be reset', () => {
            // Complete the puzzle first
            machine.dispatch({ type: 'GUESS', guess: 'SOUTH' });
            machine.dispatch({ type: 'GUESS', guess: 'MOUTH' });
            machine.dispatch({ type: 'GUESS', guess: 'TONGUE' });
            machine.dispatch({ type: 'GUESS', guess: 'SHOE' });
            machine.dispatch({ type: 'GUESS', guess: 'SOLE' });
            machine.dispatch({ type: 'GUESS', guess: 'SOUL' });
            machine.dispatch({ type: 'GUESS', guess: 'HEART' });
            machine.dispatch({ type: 'GUESS', guess: 'EARTH' });

            const completedState = machine.getCurrentState();
            expect(completedState.isCompleted).toBe(true);
            expect(completedState.phase).toBe('COMPLETED');

            // Reset
            const resetState = machine.dispatch({ type: 'RESET' });

            expect(resetState.phase).toBe('DOWNWARD');
            expect(resetState.isCompleted).toBe(false);
            expect(resetState.revealedSteps.size).toBe(2); // Back to initial state
        });
    });

    describe('state immutability', () => {
        it('returns new state objects', () => {
            const state1 = machine.getCurrentState();
            const state2 = machine.dispatch({ type: 'GUESS', guess: 'SOUTH' });

            expect(state1).not.toBe(state2);
            expect(state1.revealedSteps).not.toBe(state2.revealedSteps);
        });

        it('does not mutate original state', () => {
            const state1 = machine.getCurrentState();
            const initialRevealedSize = state1.revealedSteps.size;

            machine.dispatch({ type: 'GUESS', guess: 'SOUTH' });

            expect(state1.revealedSteps.size).toBe(initialRevealedSize);
        });
    });

    describe('edge cases', () => {
        describe('resetting', () => {
            // resetting when already at initial state (should be no-op)
            // resetting from various states (mid-puzzle, completed, locked)
            it('is a no-op when already at initial state', () => {
                const initialState = machine.getCurrentState();
                const resetState = machine.dispatch({ type: 'RESET' });

                expect(resetState).toEqual(initialState);
            });

            it('resets correctly from mid-puzzle state', () => {
                machine.dispatch({ type: 'GUESS', guess: 'SOUTH' });
                machine.dispatch({ type: 'GUESS', guess: 'MOUTH' });
                const midState = machine.getCurrentState();
                expect(midState.currentQuestion).toBe(2);
                expect(midState.currentAnswer).toBe(3);

                const resetState = machine.dispatch({ type: 'RESET' });

                expect(resetState.phase).toBe('DOWNWARD');
                expect(resetState.currentQuestion).toBe(0);
                expect(resetState.currentAnswer).toBe(1);
                expect(resetState.revealedSteps.size).toBe(2);
            });
        });

        describe('guessing', () => {
            // attempting to guess when completed (should be no-op)
            it('is a no-op when attempting to guess after completion', () => {
                // Complete the puzzle first
                machine.dispatch({ type: 'GUESS', guess: 'SOUTH' });
                machine.dispatch({ type: 'GUESS', guess: 'MOUTH' });
                machine.dispatch({ type: 'GUESS', guess: 'TONGUE' });
                machine.dispatch({ type: 'GUESS', guess: 'SHOE' });
                machine.dispatch({ type: 'GUESS', guess: 'SOLE' });
                machine.dispatch({ type: 'GUESS', guess: 'SOUL' });
                machine.dispatch({ type: 'GUESS', guess: 'HEART' });
                machine.dispatch({ type: 'GUESS', guess: 'EARTH' });

                const completedState = machine.getCurrentState();
                expect(completedState.isCompleted).toBe(true);

                const attemptGuessState = machine.dispatch({ type: 'GUESS', guess: 'DOWN' });

                expect(attemptGuessState).toEqual(completedState); // No change
            });
        });

        describe('switching direction', () => {
            it('is a no-op when attempting to switch direction while locked', () => {
                machine.dispatch({ type: 'GUESS', guess: 'SOUTH' });
                machine.dispatch({ type: 'GUESS', guess: 'MOUTH' });
                machine.dispatch({ type: 'GUESS', guess: 'TONGUE' });
                machine.dispatch({ type: 'GUESS', guess: 'SHOE' });
                machine.dispatch({ type: 'GUESS', guess: 'SOLE' });
                machine.dispatch({ type: 'GUESS', guess: 'SOUL' });
                const lockedState = machine.dispatch({ type: 'GUESS', guess: 'HEART' });
                expect(lockedState.phase).toBe('DIRECTION_LOCKED');
                expect(machine.canSwitchDirection()).toBe(false);

                const attemptSwitchState = machine.dispatch({ type: 'SWITCH_DIRECTION' });

                expect(attemptSwitchState).toEqual(lockedState); // No change
            });

            it('handles multiple direction switches correctly', () => {
                const state1 = machine.getCurrentState();
                expect(state1.phase).toBe('DOWNWARD');
                expect(state1.direction).toBe('down');
                expect(state1.currentQuestion).toBe(0);
                expect(state1.currentAnswer).toBe(1);

                const state2 = machine.dispatch({ type: 'SWITCH_DIRECTION' });
                expect(state2.phase).toBe('UPWARD');
                expect(state2.direction).toBe('up');
                expect(state2.currentQuestion).toBe(7);
                expect(state2.currentAnswer).toBe(8);

                const state3 = machine.dispatch({ type: 'SWITCH_DIRECTION' });
                expect(state3.phase).toBe('DOWNWARD');
                expect(state3.direction).toBe('down');
                expect(state3.currentQuestion).toBe(0);
                expect(state3.currentAnswer).toBe(1);

                const state4 = machine.dispatch({ type: 'SWITCH_DIRECTION' });
                expect(state4.phase).toBe('UPWARD');
                expect(state4.direction).toBe('up');
                expect(state4.currentQuestion).toBe(7);
                expect(state4.currentAnswer).toBe(8);

                // Ensure states are distinct
                expect(state1).not.toBe(state2);
                expect(state2).not.toBe(state3);
                expect(state3).not.toBe(state4);
            });

            it('is a no-op when attempting to switch direction after completion', () => {
                // Complete the puzzle first
                machine.dispatch({ type: 'GUESS', guess: 'SOUTH' });
                machine.dispatch({ type: 'GUESS', guess: 'MOUTH' });
                machine.dispatch({ type: 'GUESS', guess: 'TONGUE' });
                machine.dispatch({ type: 'GUESS', guess: 'SHOE' });
                machine.dispatch({ type: 'GUESS', guess: 'SOLE' });
                machine.dispatch({ type: 'GUESS', guess: 'SOUL' });
                machine.dispatch({ type: 'GUESS', guess: 'HEART' });
                machine.dispatch({ type: 'GUESS', guess: 'EARTH' });

                const completedState = machine.getCurrentState();
                expect(completedState.isCompleted).toBe(true);

                const attemptSwitchState = machine.dispatch({ type: 'SWITCH_DIRECTION' });
                expect(attemptSwitchState).toEqual(completedState); // No change
            });

            it('allows switching the direction back and forth when on the second to last step and the rest of the puzzle is solved', () => {
                machine.dispatch({ type: 'GUESS', guess: 'SOUTH' });
                machine.dispatch({ type: 'GUESS', guess: 'MOUTH' });
                machine.dispatch({ type: 'GUESS', guess: 'TONGUE' });
                machine.dispatch({ type: 'GUESS', guess: 'SHOE' });
                machine.dispatch({ type: 'GUESS', guess: 'SOLE' });
                const midState = machine.dispatch({ type: 'GUESS', guess: 'SOUL' });
                expect(midState.currentQuestion).toBe(6);
                expect(midState.currentAnswer).toBe(7);
                expect(midState.phase).toBe('DOWNWARD');
                expect(machine.canSwitchDirection()).toBe(true);

                const switchToUpward = machine.dispatch({ type: 'SWITCH_DIRECTION' });
                expect(switchToUpward.phase).toBe('UPWARD');
                expect(switchToUpward.currentQuestion).toBe(7);
                expect(switchToUpward.currentAnswer).toBe(8);

                const switchBackToDownward = machine.dispatch({ type: 'SWITCH_DIRECTION' });
                expect(switchBackToDownward.phase).toBe('DOWNWARD');
                expect(switchBackToDownward.currentQuestion).toBe(6);
                expect(switchBackToDownward.currentAnswer).toBe(7);

                const switchToUpwardAgain = machine.dispatch({ type: 'SWITCH_DIRECTION' });
                expect(switchToUpwardAgain.phase).toBe('UPWARD');
                expect(switchToUpwardAgain.currentQuestion).toBe(7);
                expect(switchToUpwardAgain.currentAnswer).toBe(8);
            });

            it('allows switching direction back and forth when on the second step and the rest of the puzzle is solved', () => {
                machine.dispatch({ type: 'SWITCH_DIRECTION' }); // Upward
                machine.dispatch({ type: 'GUESS', guess: 'HEART' });
                machine.dispatch({ type: 'GUESS', guess: 'SOUL' });
                machine.dispatch({ type: 'GUESS', guess: 'SOLE' });
                machine.dispatch({ type: 'GUESS', guess: 'SHOE' });
                machine.dispatch({ type: 'GUESS', guess: 'TONGUE' });
                const midState = machine.dispatch({ type: 'GUESS', guess: 'MOUTH' });
                expect(midState.currentQuestion).toBe(1);
                expect(midState.currentAnswer).toBe(2);
                expect(midState.phase).toBe('UPWARD');
                expect(machine.canSwitchDirection()).toBe(true);

                const switchToDownward = machine.dispatch({ type: 'SWITCH_DIRECTION' });
                expect(switchToDownward.phase).toBe('DOWNWARD');
                expect(switchToDownward.currentQuestion).toBe(0);
                expect(switchToDownward.currentAnswer).toBe(1);

                const switchBackToUpward = machine.dispatch({ type: 'SWITCH_DIRECTION' });
                expect(switchBackToUpward.phase).toBe('UPWARD');
                expect(switchBackToUpward.currentQuestion).toBe(1);
                expect(switchBackToUpward.currentAnswer).toBe(2);

                const switchToDownwardAgain = machine.dispatch({ type: 'SWITCH_DIRECTION' });
                expect(switchToDownwardAgain.phase).toBe('DOWNWARD');
                expect(switchToDownwardAgain.currentQuestion).toBe(0);
                expect(switchToDownwardAgain.currentAnswer).toBe(1);
            });
        });

        describe('revealed steps comprehensive validation', () => {
            it('maintains correct revealed steps when solving puzzle downward completely', () => {
                let state = machine.dispatch({ type: 'GUESS', guess: 'SOUTH' });
                expect(state.revealedSteps).toEqual(new Set([0, 1, 8]));

                state = machine.dispatch({ type: 'GUESS', guess: 'MOUTH' });
                expect(state.revealedSteps).toEqual(new Set([0, 1, 2, 8]));

                state = machine.dispatch({ type: 'GUESS', guess: 'TONGUE' });
                expect(state.revealedSteps).toEqual(new Set([0, 1, 2, 3, 8]));

                state = machine.dispatch({ type: 'GUESS', guess: 'SHOE' });
                expect(state.revealedSteps).toEqual(new Set([0, 1, 2, 3, 4, 8]));

                state = machine.dispatch({ type: 'GUESS', guess: 'SOLE' });
                expect(state.revealedSteps).toEqual(new Set([0, 1, 2, 3, 4, 5, 8]));

                state = machine.dispatch({ type: 'GUESS', guess: 'SOUL' });
                expect(state.revealedSteps).toEqual(new Set([0, 1, 2, 3, 4, 5, 6, 8]));

                // This is where the last step gets unrevealed
                state = machine.dispatch({ type: 'GUESS', guess: 'HEART' });
                expect(state.revealedSteps).toEqual(new Set([0, 1, 2, 3, 4, 5, 6, 7])); // 8 removed
                expect(state.phase).toBe('DIRECTION_LOCKED');

                state = machine.dispatch({ type: 'GUESS', guess: 'EARTH' });
                expect(state.revealedSteps).toEqual(new Set([0, 1, 2, 3, 4, 5, 6, 7, 8]));
                expect(state.phase).toBe('COMPLETED');
            });

            it('maintains correct revealed steps when solving puzzle upward completely', () => {
                machine.dispatch({ type: 'SWITCH_DIRECTION' });

                let state = machine.dispatch({ type: 'GUESS', guess: 'HEART' });
                expect(state.revealedSteps).toEqual(new Set([0, 7, 8]));

                state = machine.dispatch({ type: 'GUESS', guess: 'SOUL' });
                expect(state.revealedSteps).toEqual(new Set([0, 6, 7, 8]));

                state = machine.dispatch({ type: 'GUESS', guess: 'SOLE' });
                expect(state.revealedSteps).toEqual(new Set([0, 5, 6, 7, 8]));

                state = machine.dispatch({ type: 'GUESS', guess: 'SHOE' });
                expect(state.revealedSteps).toEqual(new Set([0, 4, 5, 6, 7, 8]));

                state = machine.dispatch({ type: 'GUESS', guess: 'TONGUE' });
                expect(state.revealedSteps).toEqual(new Set([0, 3, 4, 5, 6, 7, 8]));

                state = machine.dispatch({ type: 'GUESS', guess: 'MOUTH' });
                expect(state.revealedSteps).toEqual(new Set([0, 2, 3, 4, 5, 6, 7, 8])); // 0 still there
                expect(state.phase).toBe('UPWARD'); // Still upward, not locked yet

                // This is where the first step gets unrevealed (currentQuestion = 1)
                state = machine.dispatch({ type: 'GUESS', guess: 'SOUTH' });
                expect(state.revealedSteps).toEqual(new Set([1, 2, 3, 4, 5, 6, 7, 8])); // 0 removed
                expect(state.phase).toBe('DIRECTION_LOCKED'); // Now locked

                state = machine.dispatch({ type: 'GUESS', guess: 'DOWN' });
                expect(state.revealedSteps).toEqual(new Set([0, 1, 2, 3, 4, 5, 6, 7, 8]));
                expect(state.phase).toBe('COMPLETED');
            });

            it('maintains correct revealed steps with mixed direction solving', () => {
                // Solve a few downward
                machine.dispatch({ type: 'GUESS', guess: 'SOUTH' });
                machine.dispatch({ type: 'GUESS', guess: 'MOUTH' });
                let state = machine.getCurrentState();
                expect(state.revealedSteps).toEqual(new Set([0, 1, 2, 8]));

                // Switch to upward
                machine.dispatch({ type: 'SWITCH_DIRECTION' });
                state = machine.dispatch({ type: 'GUESS', guess: 'HEART' });
                expect(state.revealedSteps).toEqual(new Set([0, 1, 2, 7, 8]));

                state = machine.dispatch({ type: 'GUESS', guess: 'SOUL' });
                expect(state.revealedSteps).toEqual(new Set([0, 1, 2, 6, 7, 8]));

                // Switch back to downward
                machine.dispatch({ type: 'SWITCH_DIRECTION' });
                state = machine.dispatch({ type: 'GUESS', guess: 'TONGUE' });
                expect(state.revealedSteps).toEqual(new Set([0, 1, 2, 3, 6, 7, 8]));

                // Continue solving to completion
                state = machine.dispatch({ type: 'GUESS', guess: 'SHOE' });
                expect(state.revealedSteps).toEqual(new Set([0, 1, 2, 3, 4, 6, 7, 8]));

                state = machine.dispatch({ type: 'GUESS', guess: 'SOLE' });
                expect(state.revealedSteps).toEqual(new Set([0, 1, 2, 3, 4, 5, 6, 7, 8]));
                expect(state.phase).toBe('COMPLETED');
            });
        });

        describe('completing the puzzle', () => {
            it('completes the puzzle when solving downwards without switching', () => {
                machine.dispatch({ type: 'GUESS', guess: 'SOUTH' });
                machine.dispatch({ type: 'GUESS', guess: 'MOUTH' });
                machine.dispatch({ type: 'GUESS', guess: 'TONGUE' });
                machine.dispatch({ type: 'GUESS', guess: 'SHOE' });
                machine.dispatch({ type: 'GUESS', guess: 'SOLE' });
                const lastUnlockedGuessState = machine.dispatch({ type: 'GUESS', guess: 'SOUL' });

                expect(lastUnlockedGuessState.phase).toBe('DOWNWARD');
                expect(lastUnlockedGuessState.isCompleted).toBe(false);
                expect(machine.canSwitchDirection()).toBe(true);

                const lockedState = machine.dispatch({ type: 'GUESS', guess: 'HEART' });
                expect(lockedState.phase).toBe('DIRECTION_LOCKED');
                expect(lockedState.isCompleted).toBe(false);
                expect(machine.canSwitchDirection()).toBe(false);

                const completeState = machine.dispatch({ type: 'GUESS', guess: 'EARTH' });
                expect(completeState.phase).toBe('COMPLETED');
                expect(completeState.isCompleted).toBe(true);
            });

            it('completes the puzzle when solving upwards without switching', () => {
                machine.dispatch({ type: 'SWITCH_DIRECTION' });
                machine.dispatch({ type: 'GUESS', guess: 'HEART' });
                machine.dispatch({ type: 'GUESS', guess: 'SOUL' });
                machine.dispatch({ type: 'GUESS', guess: 'SOLE' });
                machine.dispatch({ type: 'GUESS', guess: 'SHOE' });
                machine.dispatch({ type: 'GUESS', guess: 'TONGUE' });
                const lastUnlockedGuessState = machine.dispatch({ type: 'GUESS', guess: 'MOUTH' });

                expect(lastUnlockedGuessState.phase).toBe('UPWARD');
                expect(lastUnlockedGuessState.isCompleted).toBe(false);
                expect(machine.canSwitchDirection()).toBe(true);

                const lockedState = machine.dispatch({ type: 'GUESS', guess: 'SOUTH' });
                expect(lockedState.phase).toBe('DIRECTION_LOCKED');
                expect(lockedState.isCompleted).toBe(false);
                expect(machine.canSwitchDirection()).toBe(false);

                const completeState = machine.dispatch({ type: 'GUESS', guess: 'DOWN' });
                expect(completeState.phase).toBe('COMPLETED');
                expect(completeState.isCompleted).toBe(true);
            });

            it('completes the puzzle when solving in the middle while solving upwards', () => {
                machine.dispatch({ type: 'GUESS', guess: 'SOUTH' });
                machine.dispatch({ type: 'GUESS', guess: 'MOUTH' });
                const midState = machine.getCurrentState();
                expect(midState.currentQuestion).toBe(2);
                expect(midState.currentAnswer).toBe(3);

                machine.dispatch({ type: 'SWITCH_DIRECTION' });
                // NOW SOLVE UPWARDS
                machine.dispatch({ type: 'GUESS', guess: 'HEART' });
                machine.dispatch({ type: 'GUESS', guess: 'SOUL' });
                machine.dispatch({ type: 'GUESS', guess: 'SOLE' });
                const lastStateBeforeCompletion = machine.dispatch({ type: 'GUESS', guess: 'SHOE' });
                expect(lastStateBeforeCompletion.isCompleted).toBe(false);
                expect(lastStateBeforeCompletion.phase).toBe('UPWARD');

                const completeState = machine.dispatch({ type: 'GUESS', guess: 'TONGUE' });
                expect(completeState.phase).toBe('COMPLETED');
                expect(completeState.isCompleted).toBe(true);
            });

            it('completes the puzzle when solving in the middle while solving downwards', () => {
                machine.dispatch({ type: 'SWITCH_DIRECTION' });
                // SOLVING UPWARDS FIRST
                machine.dispatch({ type: 'GUESS', guess: 'HEART' });
                machine.dispatch({ type: 'GUESS', guess: 'SOUL' });
                const midState = machine.getCurrentState();
                expect(midState.currentQuestion).toBe(5);
                expect(midState.currentAnswer).toBe(6);

                machine.dispatch({ type: 'SWITCH_DIRECTION' });
                // NOW SOLVE DOWNWARDS
                machine.dispatch({ type: 'GUESS', guess: 'SOUTH' });
                machine.dispatch({ type: 'GUESS', guess: 'MOUTH' });
                machine.dispatch({ type: 'GUESS', guess: 'TONGUE' });
                const lastStateBeforeCompletion = machine.dispatch({ type: 'GUESS', guess: 'SHOE' });
                expect(lastStateBeforeCompletion.isCompleted).toBe(false);
                expect(lastStateBeforeCompletion.phase).toBe('DOWNWARD');

                const completeState = machine.dispatch({ type: 'GUESS', guess: 'SOLE' });
                expect(completeState.phase).toBe('COMPLETED');
                expect(completeState.isCompleted).toBe(true);
            });

            it('solves the puzzle upwards when everything is solved except the second to last step', () => {
                machine.dispatch({ type: 'GUESS', guess: 'SOUTH' });
                machine.dispatch({ type: 'GUESS', guess: 'MOUTH' });
                machine.dispatch({ type: 'GUESS', guess: 'TONGUE' });
                machine.dispatch({ type: 'GUESS', guess: 'SHOE' });
                machine.dispatch({ type: 'GUESS', guess: 'SOLE' });
                const midState = machine.dispatch({ type: 'GUESS', guess: 'SOUL' });
                expect(midState.currentQuestion).toBe(6);
                expect(midState.currentAnswer).toBe(7);
                expect(midState.phase).toBe('DOWNWARD');
                expect(machine.canSwitchDirection()).toBe(true);

                const switchDirection = machine.dispatch({ type: 'SWITCH_DIRECTION' });
                expect(switchDirection.phase).toBe('UPWARD');
                expect(switchDirection.revealedSteps).toEqual(new Set([0, 1, 2, 3, 4, 5, 6, 8]));
                // NOW SOLVE UPWARDS
                const completeState = machine.dispatch({ type: 'GUESS', guess: 'HEART' });
                expect(completeState.phase).toBe('COMPLETED');
                expect(completeState.isCompleted).toBe(true);
            });

            it('solves the puzzle downwards when everything is solved except the second step', () => {
                machine.dispatch({ type: 'SWITCH_DIRECTION' });
                machine.dispatch({ type: 'GUESS', guess: 'HEART' });
                machine.dispatch({ type: 'GUESS', guess: 'SOUL' });
                machine.dispatch({ type: 'GUESS', guess: 'SOLE' });
                machine.dispatch({ type: 'GUESS', guess: 'SHOE' });
                machine.dispatch({ type: 'GUESS', guess: 'TONGUE' });
                const midState = machine.dispatch({ type: 'GUESS', guess: 'MOUTH' });
                expect(midState.currentQuestion).toBe(1);
                expect(midState.currentAnswer).toBe(2);
                expect(midState.phase).toBe('UPWARD');
                expect(machine.canSwitchDirection()).toBe(true);

                const switchDirection = machine.dispatch({ type: 'SWITCH_DIRECTION' });
                expect(switchDirection.phase).toBe('DOWNWARD');
                expect(switchDirection.revealedSteps).toEqual(new Set([0, 2, 3, 4, 5, 6, 7, 8]));
                // NOW SOLVE DOWNWARDS
                const completeState = machine.dispatch({ type: 'GUESS', guess: 'SOUTH' });
                expect(completeState.phase).toBe('COMPLETED');
                expect(completeState.isCompleted).toBe(true);
            });
        });

        describe('revealed steps', () => {
            it('does not un-reveal end step when not at second-to-last position', () => {
                machine.dispatch({ type: 'GUESS', guess: 'SOUTH' });
                const state = machine.getCurrentState();
                expect(state.revealedSteps.has(8)).toBe(true); // EARTH still revealed
                expect(state.currentAnswer).toBe(2); // Not second-to-last yet
            });

            it('does not un-reveal first step when not at second position upward', () => {
                machine.dispatch({ type: 'SWITCH_DIRECTION' });
                machine.dispatch({ type: 'GUESS', guess: 'HEART' });
                const state = machine.getCurrentState();
                expect(state.revealedSteps.has(0)).toBe(true); // DOWN still revealed
                expect(state.currentQuestion).toBe(6); // Not second step yet
            });
        });
    });
});
