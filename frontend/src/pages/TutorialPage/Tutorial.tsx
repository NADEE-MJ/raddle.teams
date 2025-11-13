import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Puzzle } from '@/types/game';
import { useTutorialStateMachine } from '@/hooks/useTutorialStateMachine';
import { HintConfirmationModal } from '@/components';
import LadderStep from './LadderStep';
import Clues from './Clues';
import TutorialGuide from './TutorialGuide';

interface TutorialProps {
    puzzle: Puzzle;
}

export default function Tutorial({ puzzle }: TutorialProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [showHintConfirmation, setShowHintConfirmation] = useState(false);
    const [showFullLadder, setShowFullLadder] = useState(false);

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

    useEffect(() => {
        // Run once on mount to show the first hint
        handleHint();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Update completion status when state changes
    useEffect(() => {
        if (state.isCompleted) {
            setShowFullLadder(true);
        }
    }, [state]);

    const focusInput = useCallback(() => {
        setTimeout(() => inputRef.current?.focus(), 100);
    }, []);

    // Focus input when state changes
    useEffect(() => {
        focusInput();
    }, [state, focusInput]);

    // if the viewport goes from sm to md or larger, show the full ladder
    useEffect(() => {
        const mediaQuery = window.matchMedia('(min-width: 768px)'); // md breakpoint

        const handleResize = (e: MediaQueryListEvent) => {
            if (e.matches) {
                setShowFullLadder(true);
            } else {
                setShowFullLadder(false);
            }
            focusInput();
        };

        mediaQuery.addEventListener('change', handleResize);

        // Set initial state based on current screen size
        if (mediaQuery.matches) {
            setShowFullLadder(true);
        } else {
            setShowFullLadder(false);
        }

        return () => {
            mediaQuery.removeEventListener('change', handleResize);
        };
    }, [focusInput]);

    const handleDirectionChange = useCallback(() => {
        handleSwitchDirection();
    }, [handleSwitchDirection]);

    const handleGuessChange = useCallback(
        (guess: string) => {
            handleGuess(guess);
        },
        [handleGuess]
    );

    const handleHintClick = useCallback(() => {
        const activeStepId = state.direction === 'down' ? state.currentAnswer : state.currentQuestion;
        const hintsUsed = getHintsUsedForStep(activeStepId);

        // If this is the first hint, use it immediately
        if (hintsUsed === 0) {
            setShowHintConfirmation(true);
        } else if (hintsUsed === 1) {
            // If this is the second hint, show confirmation modal
            setShowHintConfirmation(true);
        }
    }, [state, getHintsUsedForStep]);

    const handleHintConfirm = useCallback(() => {
        handleHint();
        setShowHintConfirmation(false);
    }, [handleHint]);

    const handleHintCancel = useCallback(() => {
        setShowHintConfirmation(false);
    }, []);

    const toggleFullLadder = useCallback(() => {
        setShowFullLadder(!showFullLadder);
        focusInput();
    }, [showFullLadder, focusInput]);

    const getVisibleStepsOnMobile = useCallback(() => {
        const activeStepId = getActiveStepId();
        const totalSteps = puzzle.ladder.length;

        // show a 3-step window centered around the active step
        const windowSize = 3;
        const halfWindow = Math.floor(windowSize / 2);

        let startIndex = Math.max(0, activeStepId - halfWindow);
        let endIndex = Math.min(totalSteps - 1, activeStepId + halfWindow);

        // Adjust window to always show exactly 3 steps when possible
        if (endIndex - startIndex + 1 < windowSize && totalSteps >= windowSize) {
            if (startIndex === 0) {
                endIndex = Math.min(totalSteps - 1, startIndex + windowSize - 1);
            } else if (endIndex === totalSteps - 1) {
                startIndex = Math.max(0, endIndex - windowSize + 1);
            }
        }

        const visibleSteps = [];
        for (let i = startIndex; i <= endIndex; i++) {
            visibleSteps.push(i);
        }

        return visibleSteps;
    }, [puzzle.ladder, getActiveStepId]);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const mobileVisibleSteps = useMemo(() => getVisibleStepsOnMobile(), [state, getVisibleStepsOnMobile]);

    return (
        <div className='mx-auto max-w-6xl'>
            <div id='game-area' className='md:grid md:grid-cols-[2fr_3fr] md:gap-8'>
                <div className={`${!showFullLadder ? 'sticky top-0 z-50' : ''} bg-primary py-3`}>
                    <div className={'border-ladder-rungs border-x-5'}>
                        <div className='border-ladder-rungs border-b'>
                            <div className='hidden p-3 sm:hidden md:block'></div>
                            {!state.isCompleted ? (
                                <button
                                    type='button'
                                    onClick={toggleFullLadder}
                                    className='text-tx-muted hover:bg-elevated w-full p-1 text-sm italic md:hidden'
                                >
                                    {showFullLadder ? 'Collapse full ladder' : 'Show full ladder'}
                                </button>
                            ) : (
                                <div className='p-3 sm:block md:hidden'></div>
                            )}
                        </div>

                        {puzzle.ladder.map((ladderStep, stepId) => {
                            const shouldRenderStepOnMobile = mobileVisibleSteps.includes(stepId);

                            if (!showFullLadder && !shouldRenderStepOnMobile) {
                                return null;
                            }
                            return (
                                <div key={`ladder-step-wrapper-${stepId}`} className={'border-ladder-rungs border-y'}>
                                    <LadderStep
                                        key={`ladder-step-${stepId}`}
                                        onGuessChange={handleGuessChange}
                                        inputRef={inputRef}
                                        word={ladderStep.word}
                                        transform={ladderStep.transform}
                                        isCurrentQuestion={isCurrentQuestion(stepId)}
                                        isCurrentAnswer={isCurrentAnswer(stepId)}
                                        isStepRevealed={isStepRevealed(stepId)}
                                        isActive={isActiveStep(stepId)}
                                        shouldShowTransform={isStepRevealed(stepId) && isStepRevealed(stepId + 1)}
                                        shouldRenderTransform={
                                            (stepId !== mobileVisibleSteps[mobileVisibleSteps.length - 1] &&
                                                !showFullLadder) ||
                                            showFullLadder
                                        } // don't show transform for the last visible step
                                        onHintClick={isActiveStep(stepId) ? handleHintClick : undefined}
                                        secondHint={getHintsUsedForStep(stepId) === 1}
                                    />
                                </div>
                            );
                        })}

                        {!state.isCompleted && canSwitchDirection ? (
                            <div className='border-ladder-rungs border-t'>
                                <button
                                    type='button'
                                    onClick={handleDirectionChange}
                                    className='text-tx-muted hover:bg-elevated w-full p-1 text-sm italic'
                                    data-testid='switch-direction-button'
                                >
                                    Switch to solving {state.direction === 'down' ? '↑ upwards' : '↓ downwards'}
                                </button>
                            </div>
                        ) : (
                            <div className='border-ladder-rungs border-t p-4' />
                        )}
                    </div>
                </div>

                <div>
                    <TutorialGuide tutorialState={state} />
                    <Clues gameState={state} shuffleWithSeed={shuffleWithSeed} />
                </div>
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
