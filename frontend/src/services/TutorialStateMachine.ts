import { Puzzle } from '@/types/game';
import {
    TutorialState,
    TutorialEvent,
    ITutorialStateMachine,
    TutorialPhase,
    Direction,
} from '@/types/tutorialStateMachine';

export class TutorialStateMachine implements ITutorialStateMachine {
    private state: TutorialState;

    constructor(puzzle: Puzzle) {
        this.state = this.getInitialState(puzzle);
    }

    getCurrentState(): TutorialState {
        // Return a copy to prevent external mutation
        return {
            ...this.state,
            revealedSteps: new Set(this.state.revealedSteps),
            hintsUsed: new Map(this.state.hintsUsed),
        };
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

    isActiveStep(stepId: number): boolean {
        return stepId === this.getActiveStepId();
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
        if (puzzle.ladder.length < 5) {
            throw new Error('Puzzle must have at least five steps in the ladder');
        }

        const revealedSteps = new Set<number>();
        revealedSteps.add(0);
        revealedSteps.add(puzzle.ladder.length - 1);

        return {
            phase: 'DOWNWARD',
            direction: 'down',
            revealedSteps,
            currentQuestion: 0,
            currentAnswer: 1,
            isCompleted: false,
            puzzle,
            hintsUsed: new Map<number, number>(),
        };
    }

    private transition(state: TutorialState, event: TutorialEvent): TutorialState {
        switch (event.type) {
            case 'GUESS':
                if (state.phase === 'COMPLETED') {
                    return state; // No changes if already completed
                }
                return this.handleGuess(state, event.guess);
            case 'SWITCH_DIRECTION':
                if (state.phase === 'COMPLETED') {
                    return state; // No changes if already completed
                }
                return this.handleSwitchDirection(state);
            case 'RESET':
                return this.getInitialState(state.puzzle);
            case 'HINT':
                if (state.phase === 'COMPLETED') {
                    return state; // No changes if already completed
                }
                return this.handleHint(state);
            default:
                return state;
        }
    }

    private handleGuess(state: TutorialState, guess: string): TutorialState {
        const expectedAnswer = state.puzzle.ladder[this.getActiveStepId()].word.toUpperCase();

        if (guess.toUpperCase() !== expectedAnswer) {
            return state; // Wrong guess, no state change
        }

        let newState: TutorialState = this.revealSteps(state);

        // Check if puzzle is completed
        if (this.checkCompletion(newState)) {
            return {
                ...newState,
                phase: 'COMPLETED',
                isCompleted: true,
                currentQuestion: -1,
                currentAnswer: -1,
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

    private revealSteps(state: TutorialState): TutorialState {
        const newRevealedSteps = new Set(state.revealedSteps);
        newRevealedSteps.add(state.currentAnswer);
        newRevealedSteps.add(state.currentQuestion);

        if (state.direction === 'down' && state.currentAnswer === state.puzzle.ladder.length - 2) {
            newRevealedSteps.delete(state.puzzle.ladder.length - 1);
        }

        if (state.direction === 'up' && state.currentQuestion === 1) {
            newRevealedSteps.delete(0);
        }

        return { ...state, revealedSteps: newRevealedSteps };
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
        if (state.direction === 'down' && state.currentAnswer === ladderLength - 1) {
            return { ...state, phase: 'DIRECTION_LOCKED' };
        }

        if (state.direction === 'up' && state.currentQuestion === 0) {
            return { ...state, phase: 'DIRECTION_LOCKED' };
        }

        return state;
    }

    private checkCompletion(state: TutorialState): boolean {
        // Puzzle is complete when all steps are revealed
        return state.revealedSteps.size === state.puzzle.ladder.length;
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
            newAnswer = this.findNextUnrevealedStep(state, 'down');
            newQuestion = newAnswer - 1;
        } else {
            // Find first unrevealed step from bottom
            newQuestion = this.findNextUnrevealedStep(state, 'up');
            newAnswer = newQuestion + 1;
        }

        return {
            ...state,
            phase: newPhase,
            direction: newDirection,
            currentQuestion: newQuestion,
            currentAnswer: newAnswer,
        };
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

    getHintsUsedForStep(stepId: number): number {
        return this.state.hintsUsed.get(stepId) || 0;
    }

    private canUseHint(): boolean {
        if (this.state.phase === 'COMPLETED') {
            return false;
        }
        const activeStepId = this.getActiveStepId();
        const hintsUsed = this.getHintsUsedForStep(activeStepId);
        return hintsUsed < 2;
    }

    private handleHint(state: TutorialState): TutorialState {
        if (!this.canUseHint()) {
            return state; // Cannot use hint
        }

        const activeStepId = this.getActiveStepId();
        const hintsUsed = this.getHintsUsedForStep(activeStepId);

        const newHintsUsed = new Map(state.hintsUsed);
        newHintsUsed.set(activeStepId, hintsUsed + 1);

        const newState = {
            ...state,
            hintsUsed: newHintsUsed,
        };

        // If this is the second hint, reveal the word (treat as correct guess)
        if (hintsUsed === 1) {
            const expectedAnswer = state.puzzle.ladder[activeStepId].word;
            return this.handleGuess(newState, expectedAnswer);
        }

        return newState;
    }
}
