import { Puzzle } from '@/types/game';
import {
  TutorialState,
  TutorialEvent,
  TutorialStateMachine as ITutorialStateMachine,
  TutorialPhase,
  Direction,
} from '@/types/tutorialStateMachine';

export class TutorialStateMachine implements ITutorialStateMachine {
  private state: TutorialState;

  constructor(puzzle: Puzzle) {
    this.state = this.getInitialState(puzzle);
  }

  getCurrentState(): TutorialState {
    return { ...this.state, revealedSteps: new Set(this.state.revealedSteps) };
  }

  dispatch(event: TutorialEvent): TutorialState {
    const newState = this.transition(this.state, event);
    this.state = newState;
    return this.getCurrentState();
  }

  canSwitchDirection(): boolean {
    return this.state.phase === 'DOWNWARD' || this.state.phase === 'UPWARD';
  }

  getActiveStepId(): number {
    return this.state.direction === 'down' ? this.state.currentAnswer : this.state.currentQuestion;
  }

  isStepRevealed(stepId: number): boolean {
    return this.state.revealedSteps.has(stepId);
  }

  isCurrentQuestion(stepId: number): boolean {
    return stepId === this.state.currentQuestion;
  }

  isCurrentAnswer(stepId: number): boolean {
    return stepId === this.state.currentAnswer;
  }

  private getInitialState(puzzle: Puzzle): TutorialState {
    const revealedSteps = new Set<number>();
    // Initially reveal the first and last steps
    revealedSteps.add(0);
    revealedSteps.add(puzzle.ladder.length - 1);

    return {
      phase: 'DOWNWARD',
      direction: 'down',
      revealedSteps,
      currentQuestion: 0,     // DOWN (first step)
      currentAnswer: 1,       // SOUTH (second step) - this is what player guesses
      isCompleted: false,
      puzzle,
    };
  }

  private transition(state: TutorialState, event: TutorialEvent): TutorialState {
    switch (event.type) {
      case 'CORRECT_GUESS':
        return this.handleCorrectGuess(state, event.guess);
      case 'SWITCH_DIRECTION':
        return this.handleSwitchDirection(state);
      case 'RESET':
        return this.getInitialState(state.puzzle);
      default:
        return state;
    }
  }

  private handleCorrectGuess(state: TutorialState, guess: string): TutorialState {
    const expectedAnswer = state.puzzle.ladder[this.getActiveStepId()].word.toUpperCase();

    if (guess.toUpperCase() !== expectedAnswer) {
      return state; // Wrong guess, no state change
    }

    // Mark the current answer step as revealed
    const newRevealedSteps = new Set(state.revealedSteps);
    newRevealedSteps.add(state.currentAnswer);
    newRevealedSteps.add(state.currentQuestion);

    let newState: TutorialState = {
      ...state,
      revealedSteps: newRevealedSteps,
    };

    // Check if puzzle is completed
    if (this.checkCompletion(newState)) {
      return {
        ...newState,
        phase: 'COMPLETED',
        isCompleted: true,
      };
    }

    // Advance to next pair
    if (state.direction === 'down') {
      newState = this.advanceDownward(newState);
    } else {
      newState = this.advanceUpward(newState);
    }

    // Check for direction locking
    newState = this.checkDirectionLocking(newState);

    return newState;
  }

  private handleSwitchDirection(state: TutorialState): TutorialState {
    if (!this.canSwitchDirection()) {
      return state; // Can't switch when locked or completed
    }

    const newDirection: Direction = state.direction === 'down' ? 'up' : 'down';
    const newPhase: TutorialPhase = newDirection === 'down' ? 'DOWNWARD' : 'UPWARD';

    // Find the next unrevealed pair in the opposite direction
    let newQuestion: number;
    let newAnswer: number;

    if (newDirection === 'down') {
      // Find first unrevealed step from top
      newQuestion = this.findNextUnrevealedStep(state, 'down');
      newAnswer = newQuestion + 1;
    } else {
      // Find first unrevealed step from bottom
      newAnswer = this.findNextUnrevealedStep(state, 'up');
      newQuestion = newAnswer - 1;
    }

    return {
      ...state,
      phase: newPhase,
      direction: newDirection,
      currentQuestion: newQuestion,
      currentAnswer: newAnswer,
    };
  }

  private advanceDownward(state: TutorialState): TutorialState {
    const nextAnswer = state.currentAnswer + 1;

    if (nextAnswer >= state.puzzle.ladder.length) {
      return state; // Reached the end
    }

    return {
      ...state,
      currentQuestion: state.currentAnswer,
      currentAnswer: nextAnswer,
    };
  }

  private advanceUpward(state: TutorialState): TutorialState {
    const nextQuestion = state.currentQuestion - 1;

    if (nextQuestion < 0) {
      return state; // Reached the beginning
    }

    return {
      ...state,
      currentQuestion: nextQuestion,
      currentAnswer: state.currentQuestion,
    };
  }

  private checkDirectionLocking(state: TutorialState): TutorialState {
    const ladderLength = state.puzzle.ladder.length;

    // Lock direction when getting close to the end/beginning
    if (state.direction === 'down' && state.currentAnswer >= ladderLength - 2) {
      return { ...state, phase: 'DIRECTION_LOCKED' };
    }

    if (state.direction === 'up' && state.currentQuestion <= 2) {
      return { ...state, phase: 'DIRECTION_LOCKED' };
    }

    return state;
  }

  private checkCompletion(state: TutorialState): boolean {
    // Puzzle is complete when all steps are revealed
    return state.revealedSteps.size === state.puzzle.ladder.length;
  }

  private findNextUnrevealedStep(state: TutorialState, direction: Direction): number {
    const ladderLength = state.puzzle.ladder.length;

    if (direction === 'down') {
      for (let i = 0; i < ladderLength - 1; i++) {
        if (!state.revealedSteps.has(i)) {
          return i;
        }
      }
    } else {
      for (let i = ladderLength - 1; i > 0; i--) {
        if (!state.revealedSteps.has(i)) {
          return i;
        }
      }
    }

    throw new Error(`No unrevealed steps found in ${direction} direction`);
  }
}