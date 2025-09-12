import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Puzzle, GameState, GameStateStep } from '@/types/game';
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
    const [isDownward, setIsDownward] = useState(true);
    const [disableDirectionToggle, setDisableDirectionToggle] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const [gameState, setGameState] = useState<GameState | null>(null);

    const puzzle = useMemo<Puzzle>(() => TUTORIAL_PUZZLE, []);

    const getActiveStep = useCallback((gameState: GameState) => {
        return gameState.find(step => step.active);
    }, []);

    const activeStep = useMemo<GameStateStep | null>(() => {
        if (!gameState) return null;
        return getActiveStep(gameState) || null;
    }, [gameState, getActiveStep]);

    const answer = useMemo<string>(() => {
        if (!activeStep) return '';
        return puzzle.ladder[activeStep.id].word.toUpperCase();
    }, [puzzle, activeStep]);

    const initializeGameState = (puzzle: Puzzle): GameState => {
        const ladder: GameStateStep[] = puzzle.ladder.map((_, index) => ({
            id: index,
            active: false,
            status: 'unrevealed',
            isRevealed: false,
            isClueShown: false,
            reveals: 0
        }));

        // Initial setup: first step is question, second is answer, last is revealed
        ladder[0].status = 'question';
        ladder[0].isRevealed = true;
        ladder[1].status = 'answer';
        ladder[1].active = true;
        ladder[puzzle.ladder.length - 1].status = 'revealed';
        ladder[puzzle.ladder.length - 1].isRevealed = true;

        return ladder;
    };

    const updateGameState = useCallback((newGameState: GameState) => {
        setGameState(newGameState);
        setTimeout(() => inputRef.current?.focus(), 100);
    }, []);

    useEffect(() => {
        setIsDownward(true);
        updateGameState(initializeGameState(puzzle));
    }, [puzzle, updateGameState]);

    const checkCompletion = (gameState: GameState) => {
        const allSolved = gameState.every(step => step.isRevealed);
        setCompleted(allSolved);
        return allSolved;
    };

    const handleDirectionChange = () => {
        if (!gameState) return;
        if (!activeStep) return;

        const newGameState = [...gameState];
        if (isDownward) {
            newGameState[activeStep.id].active = false;
            newGameState[activeStep.id].status = "unrevealed";
            newGameState[activeStep.id - 1].status = "revealed";

            // find the next unrevealed step starting from the end of the list
            const nextUnrevealedStep = newGameState.slice().reverse().find(step => !step.isRevealed);
            if (nextUnrevealedStep) {
                newGameState[nextUnrevealedStep.id].active = true;
                newGameState[nextUnrevealedStep.id].status = "question";
                newGameState[nextUnrevealedStep.id + 1].status = "answer";
            } else {
                throw new Error("Could not find next unrevealed step when switching direction.");
            }
            setIsDownward(false);
            updateGameState(newGameState);
            return;
        }

        newGameState[activeStep.id].active = false;
        newGameState[activeStep.id].status = "unrevealed";
        newGameState[activeStep.id + 1].status = "revealed";

        // find the next unrevealed step starting from the beginning of the list
        const nextUnrevealedStep = newGameState.find(step => !step.isRevealed);
        if (nextUnrevealedStep) {
            newGameState[nextUnrevealedStep.id].active = true;
            newGameState[nextUnrevealedStep.id].status = "answer";
            newGameState[nextUnrevealedStep.id - 1].status = "question";
        } else {
            throw new Error("Could not find next unrevealed step when switching direction.");
        }
        updateGameState(newGameState);
        setIsDownward(true);
    };

    const handleGuessChange = (guess: string) => {
        if (!gameState) return;

        if (!activeStep) return;

        if (guess === answer) {
            const newGameState = [...gameState];
            newGameState[activeStep.id].isRevealed = true;
            newGameState[activeStep.id].active = false;

            const activeStepStatus = newGameState[activeStep.id].status;
            let hintStep: GameStateStep | null = null;
            let hintStepId: number | undefined;

            if (activeStepStatus === 'question') {
                hintStepId = newGameState.find(step => step.status === 'answer')?.id;
            } else if (activeStepStatus === 'answer') {
                hintStepId = newGameState.find(step => step.status === 'question')?.id;
            } else {
                throw new Error("Active step is neither question nor answer when trying to find hint step.");
            }

            if (hintStepId === undefined) throw new Error("Could not find hint step ID.");
            hintStep = newGameState[hintStepId];

            newGameState[hintStep.id].status = 'revealed';
            newGameState[activeStep.id].status = 'revealed';

            if (isDownward && activeStep.id === newGameState.length - 3) {
                // If we're at the second to last step and moving downward, unset revealed on the last step
                newGameState[newGameState.length - 1].status = 'unrevealed';
                newGameState[newGameState.length - 1].isRevealed = false;
                setDisableDirectionToggle(true);
            } else if (!isDownward && activeStep.id === 2) {
                // If we're at the second step and moving upward, unset revealed on the first step
                newGameState[0].status = 'unrevealed';
                newGameState[0].isRevealed = false;
                setDisableDirectionToggle(true);
            }

            if (checkCompletion(newGameState)) {
                setGameState(newGameState);
                return;
            }

            if (isDownward) {
                newGameState[activeStep.id + 1].active = true;
                newGameState[activeStep.id + 1].status = 'answer';
                newGameState[activeStep.id].status = 'question';
            } else {
                newGameState[activeStep.id - 1].active = true;
                newGameState[activeStep.id - 1].status = 'question';
                newGameState[activeStep.id].status = 'answer';
            }

            updateGameState(newGameState);
        }
    };

    return (
        <div className='mx-auto max-w-6xl'>
            <div id='game-area' className='md:grid md:grid-cols-[2fr_3fr] md:gap-8'>
                <div className='bg-secondary sticky top-0 z-10 py-4 md:static md:py-0'>
                    <div className='mx-4 text-center md:mx-0'>
                        <div className='divide-border border-border divide-y-2 border-x-5 bg-transparent'>
                            <div>
                                <div className='hidden p-3 md:block'></div>
                                <button
                                    type='button'
                                    className='text-tx-muted hover:bg-tertiary w-full p-2 text-xs italic md:hidden'
                                >
                                    Show full ladder
                                </button>
                            </div>

                            {gameState && gameState.map((step) => (
                                <LadderStep
                                    key={step.id}
                                    onGuessChange={handleGuessChange}
                                    inputRef={inputRef}
                                    gameStateStep={step}
                                    ladderStep={puzzle.ladder[step.id]}
                                />
                            ))}



                            <div>
                                <div className='hidden p-3'></div>
                                {!completed && !disableDirectionToggle && (
                                    <button
                                        type='button'
                                        onClick={handleDirectionChange}
                                        className='text-tx-muted hover:bg-tertiary w-full p-2 text-xs italic'
                                    >
                                        Switch to solving {isDownward ? '↑ upward' : '↓ downward'}
                                    </button>
                                )}
                            </div>

                        </div>
                    </div>
                </div>

                {gameState && (
                    <Clues
                        gameState={gameState}
                        puzzle={puzzle}
                        isDownward={isDownward}
                    />
                )}
            </div>
        </div>
    );
}
