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
}

export type TutorialEvent = { type: 'GUESS'; guess: string } | { type: 'SWITCH_DIRECTION' } | { type: 'RESET' };

export interface TutorialStateMachine {
    getCurrentState(): TutorialState;
    dispatch(event: TutorialEvent): TutorialState;
    canSwitchDirection(): boolean;
    getActiveStepId(): number;
    isStepRevealed(stepId: number): boolean;
    isCurrentQuestion(stepId: number): boolean;
    isCurrentAnswer(stepId: number): boolean;
}
