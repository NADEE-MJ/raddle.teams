import { useRef, useEffect, useState } from 'react';
import { Puzzle } from '@/types/game';
import { useTutorialStateMachine } from '@/hooks/useTutorialStateMachine';
import { HintConfirmationModal } from '@/components';
import LadderStep from './LadderStep';
import Clues from './Clues';

interface TutorialProps {
    setCompleted: (completed: boolean) => void;
    puzzle: Puzzle;
}

export default function Tutorial({ setCompleted, puzzle }: TutorialProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [showHintConfirmation, setShowHintConfirmation] = useState(false);

    const {
        state,
        handleGuess,
        handleSwitchDirection,
        handleHint,
        canSwitchDirection,
        getActiveStepId,
        isActiveStep,
        isStepRevealed,
        isCurrentQuestion,
        isCurrentAnswer,
        getHintsUsedForStep,
        shuffleWithSeed,
    } = useTutorialStateMachine(puzzle);

    // Update completion status when state changes
    useEffect(() => {
        setCompleted(state.isCompleted);
    }, [state.isCompleted, setCompleted]);

    // Focus input when state changes
    useEffect(() => {
        setTimeout(() => inputRef.current?.focus(), 100);
    }, [state]);

    const handleDirectionChange = () => {
        handleSwitchDirection();
    };

    const handleGuessChange = (guess: string) => {
        handleGuess(guess);
    };

    const handleHintClick = () => {
        const activeStepId = state.direction === 'down' ? state.currentAnswer : state.currentQuestion;
        const hintsUsed = getHintsUsedForStep(activeStepId);

        // If this is the first hint, use it immediately
        if (hintsUsed === 0) {
            setShowHintConfirmation(true);
        } else if (hintsUsed === 1) {
            // If this is the second hint, show confirmation modal
            setShowHintConfirmation(true);
        }
    };

    const handleHintConfirm = () => {
        handleHint();
        setShowHintConfirmation(false);
    };

    const handleHintCancel = () => {
        setShowHintConfirmation(false);
    };

    return (
        <div className='mx-auto max-w-6xl'>
            <div id='game-area' className='md:grid md:grid-cols-[2fr_3fr] md:gap-8'>
                <div className='divide-border border-border divide-y-2 border-x-5 '>
                    <div>
                        <div className='hidden p-4 sm:hidden md:block'></div>
                        {/* TODO implement show full ladder functionality */}
                        <button
                            type='button'
                            className='text-tx-muted hover:bg-elevated w-full p-1 text-xs italic md:hidden'
                        >
                            Show full ladder
                        </button>
                    </div>

                    {puzzle.ladder.map((ladderStep, stepId) => (
                        <LadderStep
                            key={`ladder-step-${stepId}`}
                            onGuessChange={handleGuessChange}
                            inputRef={inputRef}
                            ladderStep={ladderStep}
                            isCurrentQuestion={isCurrentQuestion(stepId)}
                            isCurrentAnswer={isCurrentAnswer(stepId)}
                            isStepRevealed={isStepRevealed(stepId)}
                            isActive={isActiveStep(stepId)}
                            shouldShowTransform={isStepRevealed(stepId) && isStepRevealed(stepId + 1)}
                            onHintClick={isActiveStep(stepId) ? handleHintClick : undefined}
                            secondHint={getHintsUsedForStep(stepId) === 1}
                        />
                    ))}

                    {(!state.isCompleted && canSwitchDirection) ? (
                        <button
                            type='button'
                            onClick={handleDirectionChange}
                            className='text-tx-muted hover:bg-elevated w-full p-1 text-xs italic'
                            data-testid="switch-direction-button"
                        >
                            Switch to solving {state.direction === 'down' ? '↑ upward' : '↓ downward'}
                        </button>
                    ) : (
                        <div className='p-4' />
                    )}
                </div>

                <Clues
                    gameState={state}
                    shuffleWithSeed={shuffleWithSeed}
                />
            </div>

            <HintConfirmationModal
                isOpen={showHintConfirmation}
                onConfirm={handleHintConfirm}
                onCancel={handleHintCancel}
                secondHint={getHintsUsedForStep(getActiveStepId()) === 1}
            />
        </div>
    );
}
