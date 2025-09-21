import { useState, useCallback, useMemo } from 'react';
import { Puzzle } from '@/types/game';
import { TutorialStateMachine } from '@/services/TutorialStateMachine';
import { TutorialState, TutorialEvent } from '@/types/tutorialStateMachine';

export interface IUseTutorialStateMachine {
    state: TutorialState;
    dispatch: (event: TutorialEvent) => void;
    canSwitchDirection: boolean;

    // Convenience methods for common operations
    handleGuess: (guess: string) => void;
    handleSwitchDirection: () => void;
    handleReset: () => void;

    // Helper methods
    isActiveStep: (stepId: number) => boolean;
    isStepRevealed: (stepId: number) => boolean;
    isCurrentQuestion: (stepId: number) => boolean;
    isCurrentAnswer: (stepId: number) => boolean;
}

export function useTutorialStateMachine(puzzle: Puzzle): IUseTutorialStateMachine {
    const [machine] = useState(() => new TutorialStateMachine(puzzle));
    const [state, setState] = useState<TutorialState>(() => machine.getCurrentState());
    const [canSwitchDirection, setCanSwitchDirection] = useState(() => machine.canSwitchDirection());

    const dispatch = useCallback(
        (event: TutorialEvent) => {
            const newState = machine.dispatch(event);
            setState(newState);
            setCanSwitchDirection(machine.canSwitchDirection());
        },
        [machine]
    );

    const handleGuess = useCallback(
        (guess: string) => {
            dispatch({ type: 'GUESS', guess });
        },
        [dispatch]
    );

    const handleSwitchDirection = useCallback(() => {
        dispatch({ type: 'SWITCH_DIRECTION' });
    }, [dispatch]);

    const handleReset = useCallback(() => {
        dispatch({ type: 'RESET' });
    }, [dispatch]);

    const isActiveStep = useCallback(
        (stepId: number) => {
            return machine.isActiveStep(stepId);
        },
        [machine]
    );

    const isStepRevealed = useCallback(
        (stepId: number) => {
            return machine.isStepRevealed(stepId);
        },
        [machine]
    );

    const isCurrentQuestion = useCallback(
        (stepId: number) => {
            return machine.isCurrentQuestion(stepId);
        },
        [machine]
    );

    const isCurrentAnswer = useCallback(
        (stepId: number) => {
            return machine.isCurrentAnswer(stepId);
        },
        [machine]
    );

    return {
        state,
        dispatch,
        handleGuess,
        handleSwitchDirection,
        handleReset,
        canSwitchDirection,
        isActiveStep,
        isStepRevealed,
        isCurrentQuestion,
        isCurrentAnswer,
    };
}
