import { useState, useEffect, useRef, JSX } from 'react';

interface LadderStep {
    word: string;
    clue: string | null;
    transform: string | null;
    solved: boolean;
}

interface GameStateStep {
    id: number;
    active: boolean;
    status: 'revealed' | 'unrevealed' | 'question' | 'answer';
    isRevealed: boolean;
    isClueShown: boolean;
    reveals: number;
}

interface GameState {
    ladder: GameStateStep[];
    movingDown: boolean;
    showFullLadder: boolean;
}

interface Puzzle {
    title: string;
    ladder: LadderStep[];
}

interface Clues {
    [word: string]: string;
}

interface WordChainGameProps {
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
            solved: false,
        },
        {
            word: 'SOUTH',
            clue: 'Change the first letter of <> to get a part of the body',
            transform: 'S->M',
            solved: false,
        },
        {
            word: 'MOUTH',
            clue: 'Organ that sits inside the <>',
            transform: 'CONTAINS THE',
            solved: false,
        },
        {
            word: 'TONGUE',
            clue: 'Piece of clothing that often has a <>',
            transform: 'IS ON A',
            solved: false,
        },
        {
            word: 'SHOE',
            clue: 'Rubber layer on the bottom of a <>',
            transform: 'CONTAINS A',
            solved: false,
        },
        {
            word: 'SOLE',
            clue: 'Kind of food or music that sounds like <>',
            transform: 'SOUNDS LIKE',
            solved: false,
        },
        {
            word: 'SOUL',
            clue: 'Popular piano duet "{} and <>"',
            transform: 'IS',
            solved: false,
        },
        {
            word: 'HEART',
            clue: 'Move the first letter of <> to the end to get where we are',
            transform: 'H -> END',
            solved: false,
        },
        {
            word: 'EARTH',
            clue: null,
            transform: null,
            solved: false,
        },
    ],
};

export default function Tutorial({ setCompleted, completed }: WordChainGameProps) {
    const [currentGuess, setCurrentGuess] = useState('');
    const [isDownward, setIsDownward] = useState(true);
    const inputRef = useRef<HTMLInputElement>(null);
    const [puzzle, setPuzzle] = useState<Puzzle>(TUTORIAL_PUZZLE);
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [clues, setClues] = useState<Clues>({});
    const [usedClues, setUsedClues] = useState<{ [key: string]: JSX.Element }>({});

    const initializeGameState = (puzzle: Puzzle): GameState => {
        const ladder: GameStateStep[] = puzzle.ladder.map((step, index) => ({
            id: index,
            active: index === 1, // Start solving at index 1
            status: index === 0 ? 'revealed' : 
                   index === puzzle.ladder.length - 1 ? 'revealed' : 
                   index === 1 ? 'answer' : 
                   index === 0 ? 'question' : 'unrevealed',
            isRevealed: index === 0 || index === puzzle.ladder.length - 1 || (index === 0),
            isClueShown: false,
            reveals: 0
        }));

        // When moving down, previous word (index 0) should be the question
        ladder[0].status = 'question';
        ladder[0].isRevealed = true;

        return {
            ladder,
            movingDown: true,
            showFullLadder: false
        };
    };

    useEffect(() => {
        const initialGameState = initializeGameState(puzzle);
        setGameState(initialGameState);
        setTimeout(() => inputRef.current?.focus(), 100);
    }, []);

    useEffect(() => {
        if (!gameState) return;
        
        const newClues: Clues = {};
        puzzle.ladder.forEach((step, index) => {
            const gameStateStep = gameState.ladder[index];
            if (step.clue && !step.solved && !gameStateStep.isClueShown) {
                newClues[step.word] = step.clue;
            }
        });
        setClues(newClues);
    }, [puzzle, gameState]);

    const getActiveStep = () => {
        if (!gameState) return null;
        return gameState.ladder.find(step => step.active);
    };

    const getHintWord = () => {
        const activeStep = getActiveStep();
        if (!activeStep) return '';
        
        if (gameState!.movingDown) {
            return puzzle.ladder[activeStep.id - 1]?.word || '';
        } else {
            return puzzle.ladder[activeStep.id + 1]?.word || '';
        }
    };

    const getAnswer = () => {
        const activeStep = getActiveStep();
        if (!activeStep) return '';
        return puzzle.ladder[activeStep.id].word;
    };

    const checkCompletion = (newPuzzle: Puzzle) => {
        const allSolved = newPuzzle.ladder.every(step => step.solved);
        setCompleted(allSolved);
        return allSolved;
    };

    const setActiveStep = (stepId: number) => {
        if (!gameState) return;
        
        setGameState(prev => {
            if (!prev) return prev;
            
            const newLadder = prev.ladder.map(step => {
                const newStep = { ...step, active: step.id === stepId };
                
                // Update status based on direction and position
                if (step.id === stepId) {
                    newStep.status = 'answer';
                } else if (prev.movingDown && step.id === stepId - 1) {
                    newStep.status = 'question';
                    newStep.isRevealed = true;
                } else if (!prev.movingDown && step.id === stepId + 1) {
                    newStep.status = 'question';  
                    newStep.isRevealed = true;
                } else if (step.id === 0 || step.id === prev.ladder.length - 1) {
                    newStep.status = 'revealed';
                    newStep.isRevealed = true;
                } else {
                    newStep.status = 'unrevealed';
                }
                
                return newStep;
            });
            
            return {
                ...prev,
                ladder: newLadder
            };
        });
        
        setCurrentGuess('');
        setTimeout(() => inputRef.current?.focus(), 100);
    };

    const handleDirectionChange = () => {
        if (!gameState) return;
        
        const newIsDownward = !isDownward;
        setIsDownward(newIsDownward);
        setCurrentGuess('');

        let newActiveStepId = -1;
        if (newIsDownward) {
            if (!puzzle.ladder[0].solved) {
                newActiveStepId = 1;
            } else {
                for (let i = 0; i < puzzle.ladder.length; i++) {
                    if (!puzzle.ladder[i].solved) {
                        newActiveStepId = i + 1;
                        break;
                    }
                }
            }
        } else {
            if (!puzzle.ladder[puzzle.ladder.length - 1].solved) {
                newActiveStepId = puzzle.ladder.length - 2;
            } else {
                for (let i = puzzle.ladder.length - 1; i >= 0; i--) {
                    if (!puzzle.ladder[i].solved) {
                        newActiveStepId = i;
                        break;
                    }
                }
            }
        }

        setGameState(prev => {
            if (!prev) return prev;
            
            const newLadder = prev.ladder.map(step => {
                const newStep = { ...step, active: step.id === newActiveStepId };
                
                // Update status based on new direction and position
                if (step.id === newActiveStepId) {
                    newStep.status = 'answer';
                } else if (newIsDownward && step.id === newActiveStepId - 1) {
                    newStep.status = 'question';
                    newStep.isRevealed = true;
                } else if (!newIsDownward && step.id === newActiveStepId + 1) {
                    newStep.status = 'question';  
                    newStep.isRevealed = true;
                } else if (step.id === 0 || step.id === prev.ladder.length - 1) {
                    newStep.status = 'revealed';
                    newStep.isRevealed = true;
                } else {
                    newStep.status = 'unrevealed';
                }
                
                return newStep;
            });
            
            return {
                ...prev,
                ladder: newLadder,
                movingDown: newIsDownward
            };
        });
        
        setTimeout(() => inputRef.current?.focus(), 100);
    };

    const renderClueParts = (
        clue: string,
        hintWordRendered: JSX.Element | null,
        answerWordRendered: JSX.Element | null
    ) => {
        const hintPlaceholder = '<>';
        const answerPlaceholder = '{}';

        const parts: (string | JSX.Element)[] = [];
        let remainingText = clue;

        while (remainingText.length > 0) {
            const hintIndex = remainingText.indexOf(hintPlaceholder);
            const answerIndex = remainingText.indexOf(answerPlaceholder);

            let nextPlaceholderIndex = -1;
            let isHintPlaceholder = false;

            if (hintIndex !== -1 && (answerIndex === -1 || hintIndex < answerIndex)) {
                nextPlaceholderIndex = hintIndex;
                isHintPlaceholder = true;
            } else if (answerIndex !== -1) {
                nextPlaceholderIndex = answerIndex;
            }

            if (nextPlaceholderIndex === -1) {
                if (remainingText) {
                    parts.push(remainingText);
                }
                break;
            }

            if (nextPlaceholderIndex > 0) {
                parts.push(remainingText.substring(0, nextPlaceholderIndex));
            }

            if (isHintPlaceholder && hintWordRendered) {
                parts.push(hintWordRendered);
            } else if (isHintPlaceholder) {
                const currentHintWord = getHintWord();
                parts.push('_'.repeat(currentHintWord.length));
            } else if (answerWordRendered) {
                parts.push(answerWordRendered);
            } else {
                const currentAnswer = getAnswer();
                parts.push('_'.repeat(currentAnswer.length));
            }
            remainingText = remainingText.substring(nextPlaceholderIndex + 2);
        }

        return parts;
    };

    const renderSolvedClue = (clue: string, hintWord: string, answerWord: string) => {
        const hintPlaceholder = '<>';
        const answerPlaceholder = '{}';

        const hintWordRendered = (
            <span className='bg-green/30 text-green px-1 pt-[6px] pb-[3px] font-mono'>{hintWord}</span>
        );
        const answerWordRendered = (
            <span className='bg-accent/30 text-accent px-1 pt-[6px] pb-[3px] font-mono'>{answerWord}</span>
        );

        const parts = renderClueParts(clue, hintWordRendered, answerWordRendered);

        if (clue.includes(hintPlaceholder) && clue.includes(answerPlaceholder)) {
            return <div className='text-tx-muted my-3 mb-2 opacity-75'>{parts}</div>;
        }

        return (
            <div className='text-tx-muted my-3 mb-2 opacity-75'>
                {parts} → {answerWordRendered}
            </div>
        );
    };

    const handleGuessChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const guess = e.target.value.toUpperCase().trim();
        setCurrentGuess(guess);
        
        if (!gameState) return;
        
        const activeStep = getActiveStep();
        if (!activeStep) return;
        
        const answer = getAnswer();
        const hintWord = getHintWord();

        if (guess === answer) {
            const clueToRemove = `${clues[hintWord]}`;

            setUsedClues(prev => ({
                ...prev,
                [hintWord]: renderSolvedClue(clueToRemove, hintWord, answer),
            }));

            setClues(prev => {
                const newClues = { ...prev };
                delete newClues[hintWord];
                return newClues;
            });

            // Update puzzle state
            const newPuzzle = { ...puzzle };
            const newLadder = newPuzzle.ladder.map((step, index) => {
                if (gameState.movingDown) {
                    if (index === activeStep.id - 1) {
                        return { ...step, solved: true };
                    } else if (index === activeStep.id && activeStep.id === puzzle.ladder.length - 1) {
                        return { ...step, solved: true };
                    }
                } else {
                    if (index === activeStep.id) {
                        return { ...step, solved: true };
                    } else if (activeStep.id === puzzle.ladder.length - 2 && index === puzzle.ladder.length - 1) {
                        return { ...step, solved: true };
                    }
                }
                return step;
            });
            newPuzzle.ladder = newLadder;
            setPuzzle(newPuzzle);
            
            // Update gameState to mark clue as used
            setGameState(prev => {
                if (!prev) return prev;
                
                const hintIndex = gameState.movingDown ? activeStep.id - 1 : activeStep.id + 1;
                const newLadder = prev.ladder.map(step => 
                    step.id === hintIndex 
                        ? { ...step, isClueShown: true }
                        : step
                );
                
                return {
                    ...prev,
                    ladder: newLadder
                };
            });
            
            if (checkCompletion(newPuzzle)) {
                return;
            }

            // Move to next step
            let newActiveStepId: number;
            if (gameState.movingDown) {
                newActiveStepId = activeStep.id + 1;
            } else {
                newActiveStepId = activeStep.id - 1;
            }

            setActiveStep(newActiveStepId);
        }
    };

    const renderDownwardClue = (clue: string) => {
        const hintWord = getHintWord();
        const hintWordRendered = (
            <span className='bg-green/50 text-green px-1 pt-[6px] pb-[3px] font-mono'>{hintWord}</span>
        );

        const parts = renderClueParts(clue, hintWordRendered, null);

        return <div className='text-tx-primary mb-2 opacity-75'>{parts}</div>;
    };

    const renderUpwardClue = (clue: string) => {
        const answer = getAnswer();
        const answerWordRendered = (
            <span className='bg-accent/50 text-accent px-1 pt-[6px] pb-[3px] font-mono'>{answer}</span>
        );

        const parts = renderClueParts(clue, null, answerWordRendered);

        return <div className='text-tx-muted my-3 mb-2 opacity-75'>{parts}</div>;
    };

    const renderLadderStep = (step: LadderStep, index: number) => {
        if (!gameState) return null;
        
        const gameStateStep = gameState.ladder[index];
        const isTarget = gameStateStep.active;
        const shouldReveal = gameStateStep.isRevealed || completed;
        
        let bgColor = 'bg-secondary';
        if (isTarget) {
            bgColor = 'bg-accent/50';
        } else if (gameStateStep.status === 'question') {
            bgColor = 'bg-green/40';
        } else if (gameStateStep.status === 'answer') {
            bgColor = 'bg-accent/50';
        }

        const isHidden = !gameState.showFullLadder && !completed && index > 1 && index < puzzle.ladder.length - 1 && !shouldReveal && !isTarget;

        return (
            <div
                key={index}
                data-active={isTarget}
                className={`${isHidden ? 'hidden md:block' : ''} relative font-mono text-sm md:text-lg ${bgColor}`}
            >
                {shouldReveal && !isTarget ? (
                    <div className='relative'>
                        <div className='text-tx-primary py-3 text-center tracking-wide uppercase'>{step.word}</div>
                        {index !== puzzle.ladder.length - 1 && step.solved ? (
                            <span className='bg-secondary border-border text-tx-primary absolute bottom-0 left-1/2 z-50 -translate-x-1/2 translate-y-1/2 rounded-sm border px-2 py-1 font-mono text-xs whitespace-nowrap uppercase'>
                                {step.transform}
                            </span>
                        ) : (
                            index < puzzle.ladder.length - 1 && (
                                <span className='bg-secondary border-border text-tx-primary absolute bottom-0 left-1/2 z-50 w-[max-content] min-w-25 -translate-x-1/2 translate-y-1/2 rounded-sm border p-1 pb-[6px] font-mono text-xs leading-1 uppercase'>
                                    &nbsp;
                                </span>
                            )
                        )}
                    </div>
                ) : isTarget ? (
                    <div className='relative'>
                        <span className='bg-secondary border-border text-tx-primary absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg border p-0.5 text-sm md:text-base'>
                            ({step.word.length})
                        </span>
                        <input
                            ref={inputRef}
                            type='text'
                            value={currentGuess}
                            onChange={handleGuessChange}
                            placeholder=''
                            className='text-tx-primary w-full bg-transparent p-3 text-center text-[16px] tracking-wide uppercase focus:outline-none md:text-lg'
                            // maxLength={step.word.length} TODO - enforce max length?
                            autoComplete='off'
                            autoCorrect='off'
                            autoCapitalize='off'
                            spellCheck='false'
                        />
                        <button className='bg-blue-500 border-blue-500 hover:bg-blue-600 transition-all duration-100 absolute top-1/2 right-0 flex h-8 w-8 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded border'>
                            💡
                        </button>
                        {index < puzzle.ladder.length - 1 && (
                            <span className='bg-secondary border-border text-tx-primary absolute bottom-0 left-1/2 z-50 w-[max-content] min-w-25 -translate-x-1/2 translate-y-1/2 rounded-sm border p-1 pb-[6px] font-mono text-xs leading-1 uppercase'>
                                &nbsp;
                            </span>
                        )}
                    </div>
                ) : (
                    <div className='relative'>
                        <input
                            type='text'
                            placeholder={'◼️'.repeat(step.word.length) + ` (${step.word.length})`}
                            className='text-tx-muted w-full bg-transparent p-3 text-center text-[16px] tracking-wide uppercase focus:outline-none md:text-lg'
                            disabled
                            autoComplete='off'
                            autoCorrect='off'
                            autoCapitalize='off'
                            spellCheck='false'
                        />
                        {index < puzzle.ladder.length - 1 && (
                            <span className='bg-secondary border-border text-tx-primary absolute bottom-0 left-1/2 z-50 w-[max-content] min-w-25 -translate-x-1/2 translate-y-1/2 rounded-sm border p-1 pb-[6px] font-mono text-xs leading-1 uppercase'>
                                &nbsp;
                            </span>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <>
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

                                {puzzle.ladder.map((step, index) => {
                                    return renderLadderStep(step, index);
                                })}

                                <div>
                                    <div className='hidden p-3'></div>
                                    {!completed && gameState && (
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

                    <div className='mb-6 px-3 text-left font-medium md:p-0 md:text-lg'>
                        <div className='text-sm leading-[24px] md:p-0 md:text-base lg:text-lg'>
                            {/* Current Clues Section */}
                            {Object.entries(clues).length > 0 && (
                                <>
                                    <h2 className='border-border text-tx-secondary mb-4 border-b-1 pt-4 text-sm font-bold uppercase'>
                                        Clues, out of order
                                    </h2>
                                    {Object.entries(clues).map(([word, clue]) => (
                                        <div
                                            key={word}
                                            className='border-border bg-secondary mb-2 rounded-md border-1 px-2 py-1 pt-1 pb-0'
                                        >
                                            {!isDownward ? renderUpwardClue(clue) : renderDownwardClue(clue)}
                                        </div>
                                    ))}
                                </>
                            )}

                            {/* Used Clues Section */}
                            {Object.entries(usedClues).length > 0 && (
                                <>
                                    <h2 className='border-border text-tx-secondary mb-2 border-b-1 pt-4 text-sm font-bold uppercase'>
                                        Used clues
                                    </h2>
                                    {Object.entries(usedClues).map(([word, renderedClue]) => (
                                        <div key={word} className='text-tx-muted my-3 mb-2 opacity-75'>
                                            {renderedClue}
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
