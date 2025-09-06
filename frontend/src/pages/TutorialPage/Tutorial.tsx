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
    "title": "From DOWN to EARTH",
    "ladder": [
        {
            "word": "DOWN",
            "clue": "Cardinal direction that's <> on a map, most of the time",
            "transform": "MEANS",
            "solved": false
        },
        {
            "word": "SOUTH",
            "clue": "Change the first letter of <> to get a part of the body",
            "transform": "S->M",
            "solved": false
        },
        {
            "word": "MOUTH",
            "clue": "Organ that sits inside the <>",
            "transform": "CONTAINS THE",
            "solved": false
        },
        {
            "word": "TONGUE",
            "clue": "Piece of clothing that often has a <>",
            "transform": "IS ON A",
            "solved": false
        },
        {
            "word": "SHOE",
            "clue": "Rubber layer on the bottom of a <>",
            "transform": "CONTAINS A",
            "solved": false
        },
        {
            "word": "SOLE",
            "clue": "Kind of food or music that sounds like <>",
            "transform": "SOUNDS LIKE",
            "solved": false
        },
        {
            "word": "SOUL",
            "clue": "Popular piano duet \"{} and <>\"",
            "transform": "IS",
            "solved": false
        },
        {
            "word": "HEART",
            "clue": "Move the first letter of <> to the end to get where we are",
            "transform": "H -> END",
            "solved": false
        },
        {
            "word": "EARTH",
            "clue": null,
            "transform": null,
            "solved": false
        }
    ]
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
        puzzle.ladder.forEach((step) => {
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
        const allSolved = newPuzzle.ladder.every((step) => step.solved);
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

    const renderClueParts = (clue: string, hintWordRendered: JSX.Element | null, answerWordRendered: JSX.Element | null) => {
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

        const hintWordRendered = <span className="bg-ayu-green/30 text-ayu-green font-mono px-1 pt-[6px] pb-[3px]">{hintWord}</span>;
        const answerWordRendered = <span className="bg-ayu-accent/30 text-ayu-accent font-mono px-1 pt-[6px] pb-[3px]">{answerWord}</span>;

        const parts = renderClueParts(clue, hintWordRendered, answerWordRendered);

        if (clue.includes(hintPlaceholder) && clue.includes(answerPlaceholder)) {
            return (
                <div className=" mb-2 opacity-75 text-ayu-text-muted my-3">
                    {parts}
                </div>
            );
        }

        return (
            <div className=" mb-2 opacity-75 text-ayu-text-muted my-3">
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
                [hintWord]: renderSolvedClue(clueToRemove, hintWord, answer)
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
        const hintWordRendered = <span className="bg-ayu-green/30 text-ayu-green font-mono px-1 pt-[6px] pb-[3px]">{hintWord}</span>;

        const parts = renderClueParts(clue, hintWordRendered, null);

        return (
            <div className=" mb-2 opacity-75 text-ayu-text-primary">
                {parts}
            </div>
        );
    };

    const renderUpwardClue = (clue: string) => {
        const answerWordRendered = <span className="bg-ayu-accent/30 text-ayu-accent font-mono px-1 pt-[6px] pb-[3px]">{answer}</span>;

        const parts = renderClueParts(clue, null, answerWordRendered);

        return (
            <div className=" mb-2 opacity-75 text-ayu-text-muted my-3">
                {parts}
            </div>
        );
    };

    const renderLadderStep = (step: LadderStep, index: number) => {
        let isTarget = false;
        let shouldReveal = false;
        let bgColor = 'bg-ayu-bg-secondary';

        if (completed) {
            shouldReveal = true;
        } else {
            isTarget = index === solvingIndex;
            if (isTarget) {
                bgColor = 'bg-ayu-accent/20';
            } else if (direction === 'downward') {
                if (index === solvingIndex - 1) {
                    shouldReveal = true;
                    bgColor = 'bg-ayu-green/30';
                } else if (step.solved) {
                    shouldReveal = true;
                } else if (index === puzzle.ladder.length - 1 && solvingIndex !== puzzle.ladder.length - 2) {
                    shouldReveal = true;
                }
            } else {
                if (index === solvingIndex + 1) {
                    shouldReveal = true;
                    bgColor = 'bg-ayu-green/30';
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
                    <div className="relative">
                        <div className="py-3 tracking-wide text-center uppercase text-ayu-text-primary">
                            {step.word}
                        </div>
                        {
                            index !== puzzle.ladder.length - 1 &&
                                step.solved ? (
                                <span className="px-2 py-1 absolute bottom-0 translate-y-1/2 left-1/2 -translate-x-1/2 font-mono text-xs uppercase bg-ayu-bg-secondary rounded-sm border border-ayu-border text-ayu-text-primary whitespace-nowrap z-50">
                                    {step.transform}
                                </span>
                            ) : (
                                index < puzzle.ladder.length - 1 && (
                                    <span className="z-50 p-1 pb-[6px] absolute bottom-0 translate-y-1/2 left-1/2 -translate-x-1/2 w-[max-content] font-mono text-xs uppercase bg-ayu-bg-secondary rounded-sm border border-ayu-border text-ayu-text-primary leading-1 min-w-25">
                                        &nbsp;
                                    </span>
                                )
                            )
                        }
                    </div>
                ) : isTarget ? (
                    <div className="relative">
                        <span className="rounded-r-lg bg-ayu-bg-secondary border border-ayu-border border-l-0 py-1 pr-1 absolute top-1/2 -translate-y-1/2 left-0 text-sm md:text-base -translate-x-2/5 text-ayu-text-primary">
                            ({step.word.length})
                        </span>
                        <input
                            ref={inputRef}
                            type="text"
                            value={currentGuess}
                            onChange={handleGuessChange}
                            placeholder=""
                            className="w-full p-3 uppercase tracking-wide text-[16px] text-center md:text-lg focus:outline-none bg-transparent text-ayu-text-primary"
                            maxLength={step.word.length}
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="off"
                            spellCheck="false"
                        />
                        <button className="absolute top-1/2 -translate-y-1/2 right-2 w-8 h-8 bg-ayu-blue/20 border border-ayu-blue rounded flex items-center justify-center hover:bg-ayu-blue/30">
                            💡
                        </button>
                        {index < puzzle.ladder.length - 1 && (
                            <span className="z-50 p-1 pb-[6px] absolute bottom-0 translate-y-1/2 left-1/2 -translate-x-1/2 w-[max-content] font-mono text-xs uppercase bg-ayu-bg-secondary rounded-sm border border-ayu-border text-ayu-text-primary leading-1 min-w-25">
                                &nbsp;
                            </span>
                        )}
                    </div>
                ) : (
                    <div className="relative">
                        <input
                            type="text"
                            placeholder={'◼️'.repeat(step.word.length) + ` (${step.word.length})`}
                            className="w-full p-3 uppercase tracking-wide text-[16px] text-center md:text-lg focus:outline-none bg-transparent text-ayu-text-muted"
                            disabled
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="off"
                            spellCheck="false"
                        />
                        {index < puzzle.ladder.length - 1 && (
                            <span className="z-50 p-1 pb-[6px] absolute bottom-0 translate-y-1/2 left-1/2 -translate-x-1/2 w-[max-content] font-mono text-xs uppercase bg-ayu-bg-secondary rounded-sm border border-ayu-border text-ayu-text-primary leading-1 min-w-25">
                                &nbsp;
                            </span>
                        )}
                    </div>
                )}
            </div>
        );
    }

    return (
        <>
            <div className="max-w-6xl mx-auto">
                <div id="game-area" className="md:grid md:grid-cols-[2fr_3fr] md:gap-8">
                    <div className="py-4 md:py-0 bg-ayu-bg-secondary sticky md:static z-10 top-0">
                        <div className="mx-4 md:mx-0 text-center">
                            <div className="divide-y-2 divide-ayu-border border-x-5 border-ayu-border bg-transparent">
                                <div>
                                    <div className="hidden md:block p-3"></div>
                                    <button type="button" className="md:hidden p-2 w-full text-xs text-ayu-text-muted italic hover:bg-ayu-bg-tertiary">
                                        Show full ladder
                                    </button>
                                </div>

                                {puzzle.ladder.map((step, index) => {
                                    return renderLadderStep(step, index);
                                })}

                                <div>
                                    <div className="p-3 hidden"></div>
                                    {!completed && !(direction === 'downward' && (solvingIndex === puzzle.ladder.length - 2 || solvingIndex === puzzle.ladder.length - 1)) && !(direction === 'upward' && (solvingIndex === 0 || solvingIndex === 1)) && (
                                        <button
                                            type="button"
                                            onClick={() => handleDirectionChange(direction === 'downward' ? 'upward' : 'downward')}
                                            className="p-2 w-full text-xs text-ayu-text-muted italic hover:bg-ayu-bg-tertiary"
                                        >
                                            Switch to solving {direction === 'downward' ? '↑ upward' : '↓ downward'}
                                        </button>)}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mb-6 px-3 md:p-0 font-medium md:text-lg text-left">
                        <div className="leading-[24px] text-sm md:text-base lg:text-lg md:p-0">
                            {/* Current Clues Section */}
                            {Object.entries(clues).length > 0 && (
                                <>
                                    <h2 className="uppercase text-sm pt-4 mb-4 border-b-1 border-ayu-border text-ayu-text-secondary font-bold">Clues, out of order</h2>
                                    {Object.entries(clues).map(([word, clue]) => (
                                        <div key={word} className=" mb-2 pt-1 pb-0 rounded-md border-1 border-ayu-border bg-ayu-bg-secondary px-2 py-1">
                                            {direction === 'upward' ?
                                                renderUpwardClue(clue) :
                                                renderDownwardClue(clue)
                                            }
                                        </div>
                                    ))}
                                </>
                            )}


                            {/* Used Clues Section */}
                            {Object.entries(usedClues).length > 0 && (
                                <>
                                    <h2 className="uppercase text-sm pt-4 mb-2 border-b-1 border-ayu-border text-ayu-text-secondary font-bold">Used clues</h2>
                                    {Object.entries(usedClues).map(([word, renderedClue]) => (
                                        <div key={word} className=" mb-2 opacity-75 text-ayu-text-muted my-3">
                                            {renderedClue}
                                        </div>
                                    ))}
                                </>
                            )}

                        </div>
                    </div>
                </div>
            </div>
        </>);
}

