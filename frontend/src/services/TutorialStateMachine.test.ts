import { describe, it, expect, beforeEach } from 'vitest';
import { TutorialStateMachine } from './TutorialStateMachine';
import { Puzzle } from '@/types/game';

const TEST_PUZZLE: Puzzle = {
  title: 'Test Puzzle',
  ladder: [
    { word: 'DOWN', clue: 'First clue', transform: 'MEANS' },
    { word: 'SOUTH', clue: 'Second clue', transform: 'S->M' },
    { word: 'MOUTH', clue: 'Third clue', transform: 'CONTAINS THE' },
    { word: 'TONGUE', clue: 'Fourth clue', transform: 'IS ON A' },
    { word: 'SHOE', clue: 'Fifth clue', transform: 'CONTAINS A' },
    { word: 'SOLE', clue: 'Sixth clue', transform: 'SOUNDS LIKE' },
    { word: 'SOUL', clue: 'Seventh clue', transform: null },
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
      expect(state.revealedSteps.has(0)).toBe(true); // DOWN
      expect(state.revealedSteps.has(6)).toBe(true); // SOUL
      expect(state.revealedSteps.size).toBe(2);
    });

    it('sets initial question/answer pair', () => {
      const state = machine.getCurrentState();
      expect(state.currentQuestion).toBe(0); // DOWN
      expect(state.currentAnswer).toBe(1);   // SOUTH
    });

    it('is not completed initially', () => {
      const state = machine.getCurrentState();
      expect(state.isCompleted).toBe(false);
    });
  });

  describe('helper methods', () => {
    it('identifies active step correctly', () => {
      expect(machine.getActiveStepId()).toBe(1); // SOUTH (answer in downward)
    });

    it('checks if steps are revealed', () => {
      expect(machine.isStepRevealed(0)).toBe(true);  // DOWN (initially revealed)
      expect(machine.isStepRevealed(1)).toBe(false); // SOUTH (not revealed yet)
      expect(machine.isStepRevealed(6)).toBe(true);  // SOUL (initially revealed)
    });

    it('identifies current question and answer', () => {
      expect(machine.isCurrentQuestion(0)).toBe(true);  // DOWN
      expect(machine.isCurrentAnswer(1)).toBe(true);    // SOUTH
      expect(machine.isCurrentQuestion(2)).toBe(false); // MOUTH
    });

    it('allows direction switching initially', () => {
      expect(machine.canSwitchDirection()).toBe(true);
    });
  });

  describe('correct guess handling', () => {
    it('advances to next step on correct guess', () => {
      const newState = machine.dispatch({ type: 'CORRECT_GUESS', guess: 'SOUTH' });

      expect(newState.revealedSteps.has(1)).toBe(true); // SOUTH now revealed
      expect(newState.currentQuestion).toBe(1); // SOUTH becomes question
      expect(newState.currentAnswer).toBe(2);   // MOUTH becomes answer
    });

    it('ignores incorrect guesses', () => {
      const initialState = machine.getCurrentState();
      const newState = machine.dispatch({ type: 'CORRECT_GUESS', guess: 'WRONG' });

      expect(newState).toEqual(initialState);
    });

    it('is case insensitive', () => {
      const newState = machine.dispatch({ type: 'CORRECT_GUESS', guess: 'south' });
      expect(newState.revealedSteps.has(1)).toBe(true);
    });
  });

  describe('direction switching', () => {
    it('switches from downward to upward', () => {
      const newState = machine.dispatch({ type: 'SWITCH_DIRECTION' });

      expect(newState.phase).toBe('UPWARD');
      expect(newState.direction).toBe('up');
    });

    it('finds correct question/answer pair when switching to upward', () => {
      const newState = machine.dispatch({ type: 'SWITCH_DIRECTION' });

      // Should find the last unrevealed step and work backwards
      expect(newState.currentAnswer).toBe(5); // SOLE (last unrevealed)
      expect(newState.currentQuestion).toBe(4); // SHOE
    });

    it('switches back to downward from upward', () => {
      machine.dispatch({ type: 'SWITCH_DIRECTION' }); // Go upward first
      const newState = machine.dispatch({ type: 'SWITCH_DIRECTION' }); // Go back downward

      expect(newState.phase).toBe('DOWNWARD');
      expect(newState.direction).toBe('down');
    });
  });

  describe('direction locking', () => {
    it('locks direction when near the end going downward', () => {
      // Advance to near the end
      machine.dispatch({ type: 'CORRECT_GUESS', guess: 'SOUTH' });
      machine.dispatch({ type: 'CORRECT_GUESS', guess: 'MOUTH' });
      machine.dispatch({ type: 'CORRECT_GUESS', guess: 'TONGUE' });

      const newState = machine.dispatch({ type: 'CORRECT_GUESS', guess: 'SHOE' });

      expect(newState.phase).toBe('DIRECTION_LOCKED');
      expect(machine.canSwitchDirection()).toBe(false);
    });

    it('locks direction when near the beginning going upward', () => {
      // Switch to upward and advance to near beginning
      machine.dispatch({ type: 'SWITCH_DIRECTION' });
      machine.dispatch({ type: 'CORRECT_GUESS', guess: 'SOLE' });
      machine.dispatch({ type: 'CORRECT_GUESS', guess: 'SHOE' });

      const newState = machine.dispatch({ type: 'CORRECT_GUESS', guess: 'TONGUE' });

      expect(newState.phase).toBe('DIRECTION_LOCKED');
    });

    it('prevents direction switching when locked', () => {
      // Get to locked state
      machine.dispatch({ type: 'CORRECT_GUESS', guess: 'SOUTH' });
      machine.dispatch({ type: 'CORRECT_GUESS', guess: 'MOUTH' });
      machine.dispatch({ type: 'CORRECT_GUESS', guess: 'TONGUE' });
      machine.dispatch({ type: 'CORRECT_GUESS', guess: 'SHOE' });

      const lockedState = machine.getCurrentState();
      const attemptSwitchState = machine.dispatch({ type: 'SWITCH_DIRECTION' });

      expect(attemptSwitchState).toEqual(lockedState); // No change
    });
  });

  describe('puzzle completion', () => {
    it('completes puzzle when all steps are revealed', () => {
      // Solve all steps
      machine.dispatch({ type: 'CORRECT_GUESS', guess: 'SOUTH' });
      machine.dispatch({ type: 'CORRECT_GUESS', guess: 'MOUTH' });
      machine.dispatch({ type: 'CORRECT_GUESS', guess: 'TONGUE' });
      machine.dispatch({ type: 'CORRECT_GUESS', guess: 'SHOE' });
      machine.dispatch({ type: 'CORRECT_GUESS', guess: 'SOLE' });

      const completedState = machine.dispatch({ type: 'CORRECT_GUESS', guess: 'SOUL' });

      expect(completedState.phase).toBe('COMPLETED');
      expect(completedState.isCompleted).toBe(true);
      expect(completedState.revealedSteps.size).toBe(7); // All steps revealed
    });

    it('can be reset', () => {
      // Complete the puzzle first
      machine.dispatch({ type: 'CORRECT_GUESS', guess: 'SOUTH' });
      machine.dispatch({ type: 'CORRECT_GUESS', guess: 'MOUTH' });
      machine.dispatch({ type: 'CORRECT_GUESS', guess: 'TONGUE' });
      machine.dispatch({ type: 'CORRECT_GUESS', guess: 'SHOE' });
      machine.dispatch({ type: 'CORRECT_GUESS', guess: 'SOLE' });
      machine.dispatch({ type: 'CORRECT_GUESS', guess: 'SOUL' });

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
      const state2 = machine.dispatch({ type: 'CORRECT_GUESS', guess: 'SOUTH' });

      expect(state1).not.toBe(state2);
      expect(state1.revealedSteps).not.toBe(state2.revealedSteps);
    });

    it('does not mutate original state', () => {
      const state1 = machine.getCurrentState();
      const initialRevealedSize = state1.revealedSteps.size;

      machine.dispatch({ type: 'CORRECT_GUESS', guess: 'SOUTH' });

      expect(state1.revealedSteps.size).toBe(initialRevealedSize);
    });
  });
});