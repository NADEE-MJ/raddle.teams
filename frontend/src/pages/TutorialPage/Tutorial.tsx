import { useState, useEffect, useRef, JSX } from 'react';

interface LadderStep {
    word: string;
    clue: string | null;
    transform: string | null;
    solved: boolean;
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
    const [direction, setDirection] = useState<'downward' | 'upward'>('downward');
    const inputRef = useRef<HTMLInputElement>(null);
    const [puzzle, setPuzzle] = useState<Puzzle>(TUTORIAL_PUZZLE);
    const [solvingIndex, setSolvingIndex] = useState(-1);
    const [clues, setClues] = useState<Clues>({});
    const [usedClues, setUsedClues] = useState<{ [key: string]: JSX.Element }>({});
    const [answer, setAnswer] = useState('');
    const [hintWord, setHintWord] = useState('');

    useEffect(() => {
        setTimeout(() => inputRef.current?.focus(), 100);
    }, []);

    useEffect(() => {
        const newClues: Clues = {};
        puzzle.ladder.forEach(step => {
            if (step.clue && !step.solved) {
                newClues[step.word] = step.clue;
            }
        });
        setClues(newClues);
    }, [puzzle]);

    const getHintWord = (newSolvingIndex: number) => {
        if (direction === 'downward') {
            return puzzle.ladder[newSolvingIndex - 1].word;
        } else {
            return puzzle.ladder[newSolvingIndex + 1].word;
        }
    };

    const getAnswer = (newSolvingIndex: number) => {
        return puzzle.ladder[newSolvingIndex].word;
    };

    const checkCompletion = (newPuzzle: Puzzle) => {
        const allSolved = newPuzzle.ladder.every(step => step.solved);
        setCompleted(allSolved);
        return allSolved;
    };

    const updatePuzzleState = (newSolvingIndex: number) => {
        if (newSolvingIndex === -1) {
            // does it make sense to throw an error here?
            console.error('Invalid solving index');
            return;
        }
        setSolvingIndex(newSolvingIndex);
        setHintWord(getHintWord(newSolvingIndex));
        setAnswer(getAnswer(newSolvingIndex));
        setCurrentGuess('');

        // Focus the input field after updating state
        setTimeout(() => inputRef.current?.focus(), 100);
    };

    useEffect(() => {
        // start the puzzle off at the second word in the puzzle
        updatePuzzleState(1);
    }, []); // eslint-disable-line

    const handleDirectionChange = (newDirection: 'downward' | 'upward') => {
        setDirection(newDirection);
        setCurrentGuess('');

        let newSolvingIndex = -1;
        if (newDirection === 'downward') {
            if (!puzzle.ladder[0].solved) {
                newSolvingIndex = 1;
            } else {
                for (let i = 0; i < puzzle.ladder.length; i++) {
                    if (!puzzle.ladder[i].solved) {
                        newSolvingIndex = i;
                        break;
                    }
                }
            }
        } else {
            if (!puzzle.ladder[puzzle.ladder.length - 1].solved) {
                newSolvingIndex = puzzle.ladder.length - 2;
            } else {
                for (let i = puzzle.ladder.length - 1; i >= 0; i--) {
                    if (!puzzle.ladder[i].solved) {
                        newSolvingIndex = i;
                        break;
                    }
                }
            }
        }

        updatePuzzleState(newSolvingIndex);
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
                parts.push('_'.repeat(hintWord.length));
            } else if (answerWordRendered) {
                parts.push(answerWordRendered);
            } else {
                parts.push('_'.repeat(answer.length));
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

            const newPuzzle = { ...puzzle };
            const newLadder = newPuzzle.ladder.map((step, index) => {
                if (direction === 'downward') {
                    if (index === solvingIndex - 1) {
                        return { ...step, solved: true };
                    } else if (index === solvingIndex && solvingIndex === puzzle.ladder.length - 1) {
                        return { ...step, solved: true };
                    }
                } else {
                    if (index === solvingIndex) {
                        return { ...step, solved: true };
                    } else if (solvingIndex === puzzle.ladder.length - 2 && index === puzzle.ladder.length - 1) {
                        return { ...step, solved: true };
                    }
                }
                return step;
            });
            newPuzzle.ladder = newLadder;
            setPuzzle(newPuzzle);
            if (checkCompletion(newPuzzle)) {
                return;
            }

            let newSolvingIndex = -1;
            if (direction === 'downward') {
                newSolvingIndex = solvingIndex + 1;
            } else {
                newSolvingIndex = solvingIndex - 1;
            }

            updatePuzzleState(newSolvingIndex);
        }
    };

    const renderDownwardClue = (clue: string) => {
        const hintWordRendered = (
            <span className='bg-green/30 text-green px-1 pt-[6px] pb-[3px] font-mono'>{hintWord}</span>
        );

        const parts = renderClueParts(clue, hintWordRendered, null);

        return <div className='text-tx-primary mb-2 opacity-75'>{parts}</div>;
    };

    const renderUpwardClue = (clue: string) => {
        const answerWordRendered = (
            <span className='bg-accent/30 text-accent px-1 pt-[6px] pb-[3px] font-mono'>{answer}</span>
        );

        const parts = renderClueParts(clue, null, answerWordRendered);

        return <div className='text-tx-muted my-3 mb-2 opacity-75'>{parts}</div>;
    };

    const renderLadderStep = (step: LadderStep, index: number) => {
        let isTarget = false;
        let shouldReveal = false;
        let bgColor = 'bg-secondary';

        if (completed) {
            shouldReveal = true;
        } else {
            isTarget = index === solvingIndex;
            if (isTarget) {
                bgColor = 'bg-accent/20';
            } else if (direction === 'downward') {
                if (index === solvingIndex - 1) {
                    shouldReveal = true;
                    bgColor = 'bg-green/30';
                } else if (step.solved) {
                    shouldReveal = true;
                } else if (index === puzzle.ladder.length - 1 && solvingIndex !== puzzle.ladder.length - 2) {
                    shouldReveal = true;
                }
            } else {
                if (index === solvingIndex + 1) {
                    shouldReveal = true;
                    bgColor = 'bg-green/30';
                } else if (step.solved) {
                    shouldReveal = true;
                } else if (index === 0 && solvingIndex !== 1) {
                    shouldReveal = true;
                }
            }
        }

        const isHidden = !completed && index > 1 && index < puzzle.ladder.length - 1 && !shouldReveal && !isTarget;

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
                        <span className='bg-secondary border-border text-tx-primary absolute top-1/2 left-0 -translate-x-2/5 -translate-y-1/2 rounded-r-lg border border-l-0 py-1 pr-1 text-sm md:text-base'>
                            ({step.word.length})
                        </span>
                        <input
                            ref={inputRef}
                            type='text'
                            value={currentGuess}
                            onChange={handleGuessChange}
                            placeholder=''
                            className='text-tx-primary w-full bg-transparent p-3 text-center text-[16px] tracking-wide uppercase focus:outline-none md:text-lg'
                            maxLength={step.word.length}
                            autoComplete='off'
                            autoCorrect='off'
                            autoCapitalize='off'
                            spellCheck='false'
                        />
                        <button className='bg-blue/20 border-blue hover:bg-blue/30 absolute top-1/2 right-2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded border'>
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
                                    {!completed &&
                                        !(
                                            direction === 'downward' &&
                                            (solvingIndex === puzzle.ladder.length - 2 ||
                                                solvingIndex === puzzle.ladder.length - 1)
                                        ) &&
                                        !(direction === 'upward' && (solvingIndex === 0 || solvingIndex === 1)) && (
                                            <button
                                                type='button'
                                                onClick={() =>
                                                    handleDirectionChange(
                                                        direction === 'downward' ? 'upward' : 'downward'
                                                    )
                                                }
                                                className='text-tx-muted hover:bg-tertiary w-full p-2 text-xs italic'
                                            >
                                                Switch to solving {direction === 'downward' ? '↑ upward' : '↓ downward'}
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
                                            {direction === 'upward' ? renderUpwardClue(clue) : renderDownwardClue(clue)}
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
