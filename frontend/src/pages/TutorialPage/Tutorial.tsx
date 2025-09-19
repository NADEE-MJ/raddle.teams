import { useRef, useMemo, useEffect } from 'react';
import { Puzzle } from '@/types/game';
import { useTutorialStateMachine } from '@/hooks/useTutorialStateMachine';
import LadderStep from './LadderStep';
import Clues from './Clues';

interface TutorialProps {
    setCompleted: (completed: boolean) => void;
    completed: boolean;
}

const TUTORIAL_PUZZLE: Puzzle = {
    title: 'From DOWN to EARTH',
    ladder: [
        {
            word: 'DOWN',
            clue: "Cardinal direction that's <> on a map, most of the time",
            transform: 'MEANS',
        },
        {
            word: 'SOUTH',
            clue: 'Change the first letter of <> to get a part of the body',
            transform: 'S->M',
        },
        {
            word: 'MOUTH',
            clue: 'Organ that sits inside the <>',
            transform: 'CONTAINS THE',
        },
        {
            word: 'TONGUE',
            clue: 'Piece of clothing that often has a <>',
            transform: 'IS ON A',
        },
        {
            word: 'SHOE',
            clue: 'Rubber layer on the bottom of a <>',
            transform: 'CONTAINS A',
        },
        {
            word: 'SOLE',
            clue: 'Kind of food or music that sounds like <>',
            transform: 'SOUNDS LIKE',
        },
        {
            word: 'SOUL',
            clue: 'Popular piano duet "{} and <>"',
            transform: 'IS',
        },
        {
            word: 'HEART',
            clue: 'Move the first letter of <> to the end to get where we are',
            transform: 'H -> END',
        },
        {
            word: 'EARTH',
            clue: null,
            transform: null,
        },
    ],
};

export default function Tutorial({ setCompleted, completed }: TutorialProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const puzzle = useMemo<Puzzle>(() => TUTORIAL_PUZZLE, []);

    // Use our new state machine hook
    const {
        state,
        handleCorrectGuess,
        handleSwitchDirection,
        canSwitchDirection,
        getActiveStepId,
        isStepRevealed,
        isCurrentQuestion,
        isCurrentAnswer,
    } = useTutorialStateMachine(puzzle);

    // Derived values
    const activeStepId = getActiveStepId();
    const isDownward = state.direction === 'down';
    const disableDirectionToggle = !canSwitchDirection();

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
        handleCorrectGuess(guess);
    };

    // Get current question and answer words for Clues component
    const currentQuestionWord = useMemo(() => {
        if (state.isCompleted) return null;
        return puzzle.ladder[state.currentQuestion]?.word || null;
    }, [state.isCompleted, state.currentQuestion, puzzle.ladder]);

    const currentAnswerWord = useMemo(() => {
        if (state.isCompleted) return null;
        return puzzle.ladder[state.currentAnswer]?.word || null;
    }, [state.isCompleted, state.currentAnswer, puzzle.ladder]);

    return (
        <div className='mx-auto max-w-6xl'>
            <div id='game-area' className='md:grid md:grid-cols-[2fr_3fr] md:gap-8'>
                <div className='divide-border border-border divide-y-2 border-x-5 '>
                    <div>
                        <div className='hidden p-4 sm:hidden md:block'></div>
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
                            isActive={stepId === activeStepId}
                        />
                    ))}

                    {(!completed && !disableDirectionToggle) ? (
                        <button
                            type='button'
                            onClick={handleDirectionChange}
                            className='text-tx-muted hover:bg-elevated w-full p-1 text-xs italic'
                            data-testid="switch-direction-button"
                        >
                            Switch to solving {isDownward ? '↑ upward' : '↓ downward'}
                        </button>
                    ) : (
                        <div className='p-4' />
                    )}
                </div>

                <Clues
                    puzzle={puzzle}
                    isDownward={isDownward}
                    completed={completed}
                    isStepRevealed={isStepRevealed}
                    isCurrentQuestion={isCurrentQuestion}
                    isCurrentAnswer={isCurrentAnswer}
                    questionWord={currentQuestionWord}
                    answerWord={currentAnswerWord}
                />
            </div>
        </div>
    );
}
