import { JSX, useCallback, useMemo } from 'react';
import { Puzzle } from '@/types/game';

interface CluesProps {
    puzzle: Puzzle;
    direction: 'down' | 'up';
    currentQuestion: number;
    currentAnswer: number;
    revealedSteps: Set<number>;
    isCompleted: boolean;
}

export default function Clues({
    puzzle,
    direction,
    currentQuestion,
    currentAnswer,
    revealedSteps,
    isCompleted,
}: CluesProps) {
    const ladder = useMemo(() => puzzle.ladder, [puzzle.ladder]);
    const isDownward = useMemo(() => direction === 'down', [direction]);
    const questionWord = useMemo(() => {
        if (currentQuestion === -1) return null;
        return ladder[currentQuestion]?.word || null;
    }, [currentQuestion, ladder]);

    const answerWord = useMemo(() => {
        if (currentAnswer === -1) return null;
        return ladder[currentAnswer]?.word || null;
    }, [currentAnswer, ladder]);

    const isStepRevealed = useCallback(
        (stepId: number) => {
            return revealedSteps.has(stepId);
        },
        [revealedSteps]
    );

    const baseChipClasses = 'p-1 pb-0.5 font-mono';
    const neutralChipClass = `${baseChipClasses} bg-border/40 text-tx-secondary`;
    const solvedClueTextClass = isCompleted ? 'text-tx-secondary' : 'text-clue-text-muted';

    const questionChipClass = isCompleted
        ? neutralChipClass
        : `${baseChipClasses} bg-clue-question-word text-clue-text-word`;
    const questionSolvedChipClass = isCompleted
        ? neutralChipClass
        : `${baseChipClasses} bg-clue-question-word-solved text-clue-text-muted-word`;
    const answerChipClass = isCompleted
        ? neutralChipClass
        : `${baseChipClasses} bg-clue-answer-word text-clue-text-word`;
    const answerSolvedChipClass = isCompleted
        ? neutralChipClass
        : `${baseChipClasses} bg-clue-answer-word-solved text-clue-text-muted-word`;

    // Shuffle with a consistent seed based on puzzle title
    const shuffleWithSeed = useCallback(<T,>(array: T[], seedStr: string): T[] => {
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

    const unsolvedStepIds = useMemo(() => {
        const allStepIds = Array.from({ length: ladder.length - 1 }, (_, i) => i);
        const shuffledStepIds = shuffleWithSeed(allStepIds, puzzle.title);
        return shuffledStepIds.filter(id => !isStepRevealed(id) || (isStepRevealed(id) && !isStepRevealed(id + 1)));
    }, [ladder.length, isStepRevealed, puzzle.title, shuffleWithSeed]);

    const solvedStepIds = useMemo(() => {
        const stepIds = [];
        for (let i = 0; i < ladder.length - 1; i++) {
            if (isStepRevealed(i) && isStepRevealed(i + 1)) {
                stepIds.push(i);
            }
        }
        return stepIds;
    }, [ladder.length, isStepRevealed]);

    const renderQuestionWord = useCallback(
        (word: string) => {
            return (
                <span className={questionChipClass} data-testid={`question-word-${word?.toLowerCase()}`}>
                    {word}
                </span>
            );
        },
        [questionChipClass]
    );

    const renderQuestionWordSolved = useCallback(
        (word: string) => {
            return (
                <span className={questionSolvedChipClass} data-testid={`question-word-${word?.toLowerCase()}`}>
                    {word}
                </span>
            );
        },
        [questionSolvedChipClass]
    );

    const renderAnswerWord = useCallback(
        (word: string) => {
            return (
                <span className={answerChipClass} data-testid={`answer-word-${word?.toLowerCase()}`}>
                    {word}
                </span>
            );
        },
        [answerChipClass]
    );

    const renderAnswerWordSolved = useCallback(
        (word: string) => {
            return (
                <span className={answerSolvedChipClass} data-testid={`answer-word-${word?.toLowerCase()}`}>
                    {word}
                </span>
            );
        },
        [answerSolvedChipClass]
    );

    const renderClueParts = useCallback(
        (clue: string, questionWordRendered: JSX.Element | null, answerWordRendered: JSX.Element | null) => {
            const parts: (string | JSX.Element)[] = [];

            clue.split(/(<>|\{\})/).forEach(part => {
                if (part === '<>') {
                    parts.push(questionWordRendered || '_____');
                } else if (part === '{}') {
                    parts.push(answerWordRendered || '_____');
                } else if (part) {
                    parts.push(part);
                }
            });

            return parts;
        },
        []
    );

    const renderSolvedClue = useCallback(
        (stepId: number) => {
            const ladderStep = ladder[stepId];
            if (!ladderStep) throw new Error('Ladder step not found for revealed step');
            const answerLadderStep = ladder[stepId + 1];
            if (!answerLadderStep) throw new Error('Answer ladder step not found for revealed step');
            const clue = ladderStep.clue;
            if (!clue) throw new Error('Clue is null for revealed step');

            const questionWord = ladderStep.word;
            const answerWord = answerLadderStep.word;

            const questionPlaceholder = '<>';
            const answerPlaceholder = '{}';

            const questionWordRendered = renderQuestionWordSolved(questionWord);
            const answerWordRendered = renderAnswerWordSolved(answerWord);

            const parts = renderClueParts(clue, questionWordRendered, answerWordRendered);

            if (clue.includes(questionPlaceholder) && !clue.includes(answerPlaceholder)) {
                parts.push(' -> ');
                parts.push(answerWordRendered);
            }

            return (
                <div className={`${solvedClueTextClass} my-3 mb-2`} data-testid={`solved-clue-${stepId}`}>
                    {parts}
                </div>
            );
        },
        [renderClueParts, renderQuestionWordSolved, renderAnswerWordSolved, ladder, solvedClueTextClass]
    );

    const renderDownwardClue = useCallback(
        (stepId: number) => {
            const ladderStep = ladder[stepId];
            if (!ladderStep) throw new Error('Ladder step not found for revealed step');
            const clue = ladderStep.clue;
            if (!clue) throw new Error('Clue is null for revealed step');

            const questionWordRendered = renderQuestionWord(questionWord!);

            const parts = renderClueParts(clue, questionWordRendered, null);

            const configurableClassNames = 'text-clue-text';

            return (
                <div
                    className={`bg-clue-bg border-clue-border mb-2 rounded-md border px-2 pt-1.5 pb-1 ${configurableClassNames}`}
                    data-testid={`unsolved-clue-${stepId}`}
                >
                    {parts}
                </div>
            );
        },
        [renderClueParts, renderQuestionWord, ladder, questionWord]
    );

    const renderUpwardClue = useCallback(
        (stepId: number) => {
            const ladderStep = ladder[stepId];
            if (!ladderStep) throw new Error('Ladder step not found for revealed step');
            const clue = ladderStep.clue;
            if (!clue) throw new Error('Clue is null for revealed step');

            if (!answerWord) throw new Error('Answer word not found for upward clue');
            const answerWordRendered = renderAnswerWord(answerWord);

            const parts = renderClueParts(clue, null, answerWordRendered);

            if (!clue.includes('{}')) {
                parts.push(' → ');
                parts.push(answerWordRendered);
            }

            const configurableClassNames = 'text-clue-text';

            return (
                <div
                    className={`bg-clue-bg border-clue-border mb-2 rounded-md border px-2 pt-1.5 pb-1 ${configurableClassNames}`}
                    data-testid={`unsolved-clue-${stepId}`}
                >
                    {parts}
                </div>
            );
        },
        [renderClueParts, renderAnswerWord, ladder, answerWord]
    );

    return (
        <div className='mb-6 px-3 md:p-0'>
            <div className='text-sm leading-[24px] md:text-lg'>
                {unsolvedStepIds.length > 0 && (
                    <div>
                        <h2
                            className='border-clue-header text-clue-header mb-4 border-b-1 pt-4 text-sm font-extrabold uppercase'
                            data-testid='clues-out-of-order-heading'
                        >
                            Clues, out of order
                        </h2>
                        {unsolvedStepIds.map(stepId => (
                            <div key={`unsolved-clue-${stepId}`}>
                                {!isDownward ? renderUpwardClue(stepId) : renderDownwardClue(stepId)}
                            </div>
                        ))}
                    </div>
                )}
                {solvedStepIds.length > 0 && (
                    <div>
                        <h2
                            className='border-clue-header text-clue-header mb-2 border-b-1 pt-4 text-sm font-extrabold uppercase'
                            data-testid='used-clues-heading'
                        >
                            Used clues
                        </h2>
                        {solvedStepIds.map(stepId => (
                            <div key={`solved-clue-${stepId}`}>{renderSolvedClue(stepId)}</div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
