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

        const hintWordRendered = <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-mono px-1 pt-[6px] pb-[3px]">{hintWord}</span>;
        const answerWordRendered = <span className="bg-yellow-50 dark:bg-yellow-900/30 text-gray-900 dark:text-yellow-300 font-mono px-1 pt-[6px] pb-[3px]">{answerWord}</span>;

        const parts = renderClueParts(clue, hintWordRendered, answerWordRendered);

        if (clue.includes(hintPlaceholder) && clue.includes(answerPlaceholder)) {
            return (
                <div className="mr-1 md:mr-0 mb-2 opacity-75 text-gray-500 dark:text-tx-muted my-3">
                    {parts}
                </div>
            );
        }

        return (
            <div className="mr-1 md:mr-0 mb-2 opacity-75 text-gray-500 dark:text-tx-muted my-3">
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
        const hintWordRendered = <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-mono px-1 pt-[6px] pb-[3px]">{hintWord}</span>;

        const parts = renderClueParts(clue, hintWordRendered, null);

        return (
            <div className="mr-1 md:mr-0 mb-2 opacity-75 text-gray-500 dark:text-tx-muted my-3">
                {parts}
            </div>
        );
    };

    const renderUpwardClue = (clue: string) => {
        const answerWordRendered = <span className="bg-yellow-50 dark:bg-yellow-900/30 text-gray-900 dark:text-yellow-300 font-mono px-1 pt-[6px] pb-[3px]">{answer}</span>;

        const parts = renderClueParts(clue, null, answerWordRendered);

        return (
            <div className="mr-1 md:mr-0 mb-2 opacity-75 text-gray-500 dark:text-tx-muted my-3">
                {parts}
            </div>
        );
    };

    const renderLadderStep = (step: LadderStep, index: number) => {
        let isTarget = false;
        let shouldReveal = false;
        let bgColor = 'bg-white dark:bg-secondary';

        if (completed) {
            shouldReveal = true;
        } else {
            isTarget = index === solvingIndex;
            if (isTarget) {
                bgColor = 'bg-yellow-50 dark:bg-yellow-900/20';
            } else if (direction === 'downward') {
                if (index === solvingIndex - 1) {
                    shouldReveal = true;
                    bgColor = 'bg-green-100 dark:bg-green-900/30';
                } else if (step.solved) {
                    shouldReveal = true;
                } else if (index === puzzle.ladder.length - 1 && solvingIndex !== puzzle.ladder.length - 2) {
                    shouldReveal = true;
                }
            } else {
                if (index === solvingIndex + 1) {
                    shouldReveal = true;
                    bgColor = 'bg-green-100 dark:bg-green-900/30';
                } else if (step.solved) {
                    shouldReveal = true;
                } else if (index === 0 && solvingIndex !== 1) {
                    shouldReveal = true;
                }
            }
        }

        return (
            <div key={index} className={`relative font-mono text-sm md:text-lg ${bgColor}`}>
                {shouldReveal && !isTarget ? (
                    <div className="relative">
                        <div className="py-3 tracking-wide text-center uppercase text-gray-900 dark:text-tx-primary">
                            {step.word}
                        </div>
                        {
                            index !== puzzle.ladder.length - 1 &&
                                step.solved ? (
                                <span className="px-2 py-1 absolute bottom-0 translate-y-1/2 left-1/2 -translate-x-1/2 font-mono text-xs uppercase bg-white dark:bg-secondary rounded-sm border border-gray-200 dark:border-border text-gray-900 dark:text-tx-primary whitespace-nowrap z-50">
                                    {step.transform}
                                </span>
                            ) : (
                                index < puzzle.ladder.length - 1 && (
                                    <span className="z-50 p-1 pb-[6px] absolute bottom-0 translate-y-1/2 left-1/2 -translate-x-1/2 w-[max-content] font-mono text-xs uppercase bg-white rounded-sm border border-gray-200 leading-1 min-w-25">
                                        &nbsp;
                                    </span>
                                )
                            )
                        }
                    </div>
                ) : isTarget ? (
                    <div className="relative">
                        <span className="rounded-r-lg bg-slate-100 dark:bg-secondary border border-slate-300 dark:border-border border-l-0 py-1 pr-1 absolute top-1/2 -translate-y-1/2 left-0 text-sm md:text-base -translate-x-2/5 text-gray-900 dark:text-tx-primary">
                            ({step.word.length})
                        </span>
                        <input
                            ref={inputRef}
                            type="text"
                            value={currentGuess}
                            onChange={handleGuessChange}
                            placeholder=""
                            className="w-full p-3 uppercase tracking-wide text-[16px] text-center md:text-lg focus:outline-none bg-transparent text-gray-900 dark:text-tx-primary"
                            maxLength={step.word.length}
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="off"
                            spellCheck="false"
                        />
                        <button className="absolute top-1/2 -translate-y-1/2 right-2 w-8 h-8 bg-blue-100 dark:bg-blue/20 border border-blue-300 dark:border-blue rounded flex items-center justify-center hover:bg-blue-200 dark:hover:bg-blue/30">
                            💡
                        </button>
                        {index < puzzle.ladder.length - 1 && (
                            <span className="z-50 p-1 pb-[6px] absolute bottom-0 translate-y-1/2 left-1/2 -translate-x-1/2 w-[max-content] font-mono text-xs uppercase bg-white rounded-sm border border-gray-200 leading-1 min-w-25">
                                &nbsp;
                            </span>
                        )}
                    </div>
                ) : (
                    <div className="relative">
                        <input
                            type="text"
                            placeholder={'◼️'.repeat(step.word.length) + ` (${step.word.length})`}
                            className="w-full p-3 uppercase tracking-wide text-[16px] text-center md:text-lg focus:outline-none bg-transparent text-gray-500 dark:text-tx-muted"
                            disabled
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="off"
                            spellCheck="false"
                        />
                        {index < puzzle.ladder.length - 1 && (
                            <span className="z-50 p-1 pb-[6px] absolute bottom-0 translate-y-1/2 left-1/2 -translate-x-1/2 w-[max-content] font-mono text-xs uppercase bg-white rounded-sm border border-gray-200 leading-1 min-w-25">
                                &nbsp;
                            </span>
                        )}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div>
            <div className="mb-6 bg-slate-100 dark:bg-secondary">
                <h3 className="text-lg font-semibold mb-4 text-center text-gray-900 dark:text-tx-primary">{TUTORIAL_PUZZLE.title}</h3>
                <div className="divide-y-2 divide-slate-400 dark:divide-border border-x-4 border-slate-400 dark:border-border bg-transparent max-w-md mx-auto">
                    <div>
                        <div className="hidden md:block p-3"></div>
                    </div>
                    {puzzle.ladder.map((step, index) => {
                        return renderLadderStep(step, index);
                    })}

                    {completed || (direction === 'downward' && (solvingIndex === puzzle.ladder.length - 2 || solvingIndex === puzzle.ladder.length - 1)) || (direction === 'upward' && (solvingIndex === 0 || solvingIndex === 1)) ?
                        (<div>
                            <div className="hidden md:block p-3"></div>
                        </div>)
                        :
                        <button
                            onClick={() => handleDirectionChange(direction === 'downward' ? 'upward' : 'downward')}
                            className="w-full text-xs text-gray-400 dark:text-tx-muted italic transition duration-200 hover:bg-white dark:hover:bg-secondary"
                        >
                            Switch to solving {direction === 'downward' ? '↑ upward' : '↓ downward'}
                        </button>}
                </div>
            </div>

            <div className="leading-[24px] text-sm md:text-base lg:text-lg md:p-0">
                <div className="text-gray-500 dark:text-tx-muted text-sm uppercase tracking-wide mb-3">Clues, out of order</div>

                {Object.entries(clues).map(([word, clue]) => (
                    <div key={word} className="mr-1 md:mr-0 mb-2 pt-1 pb-0 md:pt-2 md:pb-1 rounded-md border border-gray-300 dark:border-border bg-white dark:bg-secondary px-2 py-1">
                        {direction === 'upward' ?
                            renderUpwardClue(clue) :
                            renderDownwardClue(clue)
                        }
                    </div>
                ))}

                {Object.entries(usedClues).length > 0 && (
                    <div className="mt-6">
                        <h4 className="text-gray-500 dark:text-tx-muted text-sm uppercase tracking-wide mb-3">Used Clues</h4>
                        {Object.entries(usedClues).map(([word, renderedClue]) => (
                            <div key={word} className="mr-1 md:mr-0 mb-2 pt-1 pb-0 md:pt-2 md:pb-1 rounded-md border border-gray-300 dark:border-border bg-gray-50 dark:bg-tertiary px-2 py-1 text-gray-500 dark:text-tx-muted">
                                {renderedClue}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// const renderProgressBar = () => {
//     const totalSteps = 7;
//     const currentStep = Math.min(solvedWords.size - 1, totalSteps);
//     const isCompleted = completed || currentStep >= 7;

//     return (
//         <div className="bg-blue-100 p-4 mb-4 rounded-lg border border-blue-300 text-blue-800">
//             <div className="flex mb-3 h-2">
//                 {Array.from({ length: totalSteps }, (_, index) => (
//                     <div
//                         key={index}
//                         className={`flex-1 h-full mr-0.5 last:mr-0 last:rounded-r-full first:rounded-l-full transition-colors duration-500 ${index < currentStep ? 'bg-blue-600' : 'bg-blue-200'
//                             }`}
//                     />
//                 ))}
//             </div>
//             <div className="whitespace-pre-line">
//                 {getTutorialMessage()}
//             </div>
//             {isCompleted && (
//                 <div className="mt-4 space-y-2">
//                     <button className="w-full p-2 text-blue-600 bg-white border border-blue-300 rounded hover:bg-blue-50">
//                         📧 Sign up for TUTORIAL_PUZZLE alerts
//                     </button>
//                     <button className="w-full p-2 text-white bg-blue-600 rounded hover:bg-blue-700">
//                         Play today&apos;s Raddle →
//                     </button>
//                 </div>
//             )}
//         </div>
//     );
// };


// const getTutorialMessage = () => {
//     const currentStep = Math.min(solvedWords.size - 1, 7);
//     const nextTargetIndex = getNextTargetIndex();
//     const wordLength = nextTargetIndex !== null ? TUTORIAL_PUZZLE.ladder[nextTargetIndex].word.length : 5;

//     if (completed || currentStep >= 7) {
//         return "All done! You&apos;re ready to play.";
//     }

//     if (currentStep === 1) {
//         return `Welcome to Raddle! Let&apos;s learn how to play. Begin by solving the first clue below, then type your answer in the yellow box. Note the (5) next to the yellow box indicates that the answer is 5 letters long.`;
//     }

//     if (currentStep === 2) {
//         return "Correct! That clue has moved to the 'Used Clues' list below.\n\nNow you see all of the remaining clues. In Raddle, the clues are out of order, and you have to determine which clue is right for this step. Figure out which clue makes sense, then type your answer in the yellow box.";
//     }

//     if (currentStep === 3) {
//         return "Great! If you&apos;re ever stuck, you can tap the lightbulb button next to the yellow box for a hint that will reveal which of the clues is correct. Do that now.";
//     }

//     if (currentStep === 4) {
//         return "When you use a hint, the incorrect clues will fade out slightly. Read the highlighted clue, and then enter your answer.\n\nStill stuck? Tap the eye button to reveal the answer and continue.";
//     }

//     if (currentStep === 5) {
//         return "Nice. One final tip: if you&apos;re stuck moving down the ladder, you can switch direction and move up instead. Click the arrow (↑) button on the box next to it.";
//     }

//     if (currentStep === 6) {
//         return "When solving upward, the clues flip around — now they show you the answer, and you need to figure out what word belongs in the green box. This direction can be more challenging. If you&apos;re stuck, tap the lightbulb. Type your answer when you&apos;ve figured it out.";
//     }

//     return "Keep going! Solve the remaining clues to complete the ladder.";
// };
