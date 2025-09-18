import { Puzzle } from './game';

export type TutorialPhase =
  | 'DOWNWARD'     // Solving from top to bottom
  | 'UPWARD'       // Solving from bottom to top
  | 'DIRECTION_LOCKED'  // Can only solve in one direction
  | 'COMPLETED';   // All words revealed

export type Direction = 'down' | 'up';

export interface TutorialState {
  // Current phase of the tutorial
  phase: TutorialPhase;

  // Which direction we're solving
  direction: Direction;

  // Which steps have been revealed/completed
  revealedSteps: Set<number>;

  // Current active pair (question step + answer step)
  currentQuestion: number;
  currentAnswer: number;

  // Completion status
  isCompleted: boolean;

  // Reference to the puzzle being solved
  puzzle: Puzzle;
}

export type TutorialEvent =
  | { type: 'CORRECT_GUESS'; guess: string; }
  | { type: 'SWITCH_DIRECTION'; }
  | { type: 'RESET'; };

export interface TutorialStateMachine {
  getCurrentState(): TutorialState;
  dispatch(event: TutorialEvent): TutorialState;
  canSwitchDirection(): boolean;
  getActiveStepId(): number;
  isStepRevealed(stepId: number): boolean;
  isCurrentQuestion(stepId: number): boolean;
  isCurrentAnswer(stepId: number): boolean;
}