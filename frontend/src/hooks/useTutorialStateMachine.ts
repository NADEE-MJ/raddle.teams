import { useState, useCallback } from 'react';
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
    handleHint: () => void;

    // Helper methods
    getActiveStepId: () => number;
    isActiveStep: (stepId: number) => boolean;
    isStepRevealed: (stepId: number) => boolean;
    isCurrentQuestion: (stepId: number) => boolean;
    isCurrentAnswer: (stepId: number) => boolean;
    getHintsUsedForStep: (stepId: number) => number;
    shuffleWithSeed<T>(array: T[], seedStr: string): T[];
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

    const handleHint = useCallback(() => {
        dispatch({ type: 'HINT' });
    }, [dispatch]);

    const getActiveStepId = useCallback(() => {
        return machine.getActiveStepId();
    }, [machine]);

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

    const getHintsUsedForStep = useCallback(
        (stepId: number) => {
            return machine.getHintsUsedForStep(stepId);
        },
        [machine]
    );

    const shuffleWithSeed = useCallback(<T>(array: T[], seedStr: string): T[] => {
        // Convert string to numeric seed
        let seed = 0;
        for (let i = 0; i < seedStr.length; i++) {
            seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
        }

        // Simple LCG (linear congruential generator)
        function random(): number {
            seed = (seed * 1664525 + 1013904223) >>> 0;
            return seed / 0x100000000;
        }

        // Fisher–Yates shuffle
        const arr = array.slice();
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }, []);

    return {
        state,
        dispatch,
        handleGuess,
        handleSwitchDirection,
        handleReset,
        handleHint,
        canSwitchDirection,
        getActiveStepId,
        isActiveStep,
        isStepRevealed,
        isCurrentQuestion,
        isCurrentAnswer,
        getHintsUsedForStep,
        shuffleWithSeed,
    };
}
