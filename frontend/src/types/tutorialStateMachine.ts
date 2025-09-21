import { Puzzle } from './game';

export type TutorialPhase =
    | 'DOWNWARD' // Solving from top to bottom
    | 'UPWARD' // Solving from bottom to top
    | 'DIRECTION_LOCKED' // Can only solve in one direction
    | 'COMPLETED';

export type Direction = 'down' | 'up';

export interface TutorialState {
    phase: TutorialPhase;

    direction: Direction;

    revealedSteps: Set<number>;

    currentQuestion: number;
    currentAnswer: number;

    isCompleted: boolean;

    puzzle: Puzzle;

    hintsUsed: Map<number, number>; // stepId -> number of hints used (max 2)
}

export type TutorialEvent =
    | { type: 'GUESS'; guess: string }
    | { type: 'SWITCH_DIRECTION' }
    | { type: 'RESET' }
    | { type: 'HINT' };

export interface ITutorialStateMachine {
    getCurrentState(): TutorialState;
    dispatch(event: TutorialEvent): TutorialState;
    canSwitchDirection(): boolean;
    getActiveStepId(): number;
    isActiveStep(stepId: number): boolean;
    isStepRevealed(stepId: number): boolean;
    isCurrentQuestion(stepId: number): boolean;
    isCurrentAnswer(stepId: number): boolean;
    getHintsUsedForStep(stepId: number): number;
}
