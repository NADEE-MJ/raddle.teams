import { useState, useCallback } from 'react';
import { Puzzle } from '@/types/game';
import { TutorialStateMachine } from '@/services/TutorialStateMachine';
import { TutorialState, TutorialEvent } from '@/types/tutorialStateMachine';

export interface UseTutorialStateMachineReturn {
    state: TutorialState;
    dispatch: (event: TutorialEvent) => void;

    // Convenience methods for common operations
    handleGuess: (guess: string) => void;
    handleSwitchDirection: () => void;
    handleReset: () => void;

    // Helper methods
    canSwitchDirection: () => boolean;
    getActiveStepId: () => number;
    isStepRevealed: (stepId: number) => boolean;
    isCurrentQuestion: (stepId: number) => boolean;
    isCurrentAnswer: (stepId: number) => boolean;
}

export function useTutorialStateMachine(puzzle: Puzzle): UseTutorialStateMachineReturn {
    // Initialize the state machine once
    const [machine] = useState(() => new TutorialStateMachine(puzzle));

    // Track the current state for React re-renders
    const [state, setState] = useState<TutorialState>(() => machine.getCurrentState());

    // Main dispatch function that updates React state
    const dispatch = useCallback(
        (event: TutorialEvent) => {
            const newState = machine.dispatch(event);
            setState(newState);
        },
        [machine]
    );

    // Convenience handlers for common operations
    const handleGuess = useCallback(
        (guess: string) => {
            dispatch({ type: 'CORRECT_GUESS', guess });
        },
        [dispatch]
    );

    const handleSwitchDirection = useCallback(() => {
        dispatch({ type: 'SWITCH_DIRECTION' });
    }, [dispatch]);

    const handleReset = useCallback(() => {
        dispatch({ type: 'RESET' });
    }, [dispatch]);

    // Helper methods that delegate to the state machine
    const canSwitchDirection = useCallback(() => {
        return machine.canSwitchDirection();
    }, [machine]);

    const getActiveStepId = useCallback(() => {
        return machine.getActiveStepId();
    }, [machine]);

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
        getActiveStepId,
        isStepRevealed,
        isCurrentQuestion,
        isCurrentAnswer,
    };
}
