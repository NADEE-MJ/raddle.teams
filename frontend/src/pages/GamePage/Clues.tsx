import { JSX, useCallback, useMemo } from 'react';
import { Puzzle } from '@/types/game';

interface CluesProps {
    puzzle: Puzzle;
    direction: 'down' | 'up';
    currentQuestion: number;
    currentAnswer: number;
    revealedSteps: Set<number>;
}

export default function Clues({ puzzle, direction, currentQuestion, currentAnswer, revealedSteps }: CluesProps) {
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

    // Shuffle with a consistent seed based on puzzle title
    const shuffleWithSeed = useCallback(<T,>(array: T[], seedStr: string): T[] => {
        const arr = [...array];
        let seed = 0;
        for (let i = 0; i < seedStr.length; i++) {
            seed = (seed << 5) - seed + seedStr.charCodeAt(i);
            seed = seed & seed;
        }

        const random = (max: number) => {
            seed = (seed * 9301 + 49297) % 233280;
            return (seed / 233280) * max;
        };

        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(random(i + 1));
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

    const renderQuestionWord = useCallback((word: string) => {
        return (
            <span
                className='bg-green/30 text-green p-1 pb-0.5 font-mono'
                data-testid={`question-word-${word?.toLowerCase()}`}
            >
                {word}
            </span>
        );
    }, []);

    const renderAnswerWord = useCallback((word: string) => {
        return (
            <span
                className='bg-yellow/30 text-yellow p-1 pb-0.5 font-mono'
                data-testid={`answer-word-${word?.toLowerCase()}`}
            >
                {word}
            </span>
        );
    }, []);

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

            const questionWordRendered = renderQuestionWord(questionWord);
            const answerWordRendered = renderAnswerWord(answerWord);

            const parts = renderClueParts(clue, questionWordRendered, answerWordRendered);

            if (clue.includes(questionPlaceholder) && !clue.includes(answerPlaceholder)) {
                parts.push(' -> ');
                parts.push(answerWordRendered);
            }

            return (
                <div className='text-tx-muted my-3 mb-2 opacity-75' data-testid={`solved-clue-${stepId}`}>
                    {parts}
                </div>
            );
        },
        [renderClueParts, renderQuestionWord, renderAnswerWord, ladder]
    );

    const renderDownwardClue = useCallback(
        (stepId: number) => {
            const ladderStep = ladder[stepId];
            if (!ladderStep) throw new Error('Ladder step not found for revealed step');
            const clue = ladderStep.clue;
            if (!clue) throw new Error('Clue is null for revealed step');

            const isActiveClue = stepId === currentQuestion;

            const questionWordRendered = renderQuestionWord(questionWord!);

            const parts = renderClueParts(clue, questionWordRendered, null);

            const configurableClassNames = 'text-tx-primary opacity-75';

            return (
                <div
                    className={`bg-secondary mb-2 rounded-md border-1 px-2 py-1 pt-1 pb-0 ${configurableClassNames}`}
                    data-testid={`unsolved-clue-${stepId}`}
                >
                    {parts}
                </div>
            );
        },
        [renderClueParts, renderQuestionWord, ladder, questionWord, currentQuestion]
    );

    const renderUpwardClue = useCallback(
        (stepId: number) => {
            const ladderStep = ladder[stepId];
            if (!ladderStep) throw new Error('Ladder step not found for revealed step');
            const clue = ladderStep.clue;
            if (!clue) throw new Error('Clue is null for revealed step');

            const isActiveClue = stepId === currentQuestion;

            const answerWordRendered = renderAnswerWord(answerWord!);

            const parts = renderClueParts(clue, null, answerWordRendered);

            if (!clue.includes('{}')) {
                parts.push(' → ');
                parts.push(answerWordRendered);
            }

            const configurableClassNames = 'text-tx-primary opacity-75';

            return (
                <div
                    className={`bg-secondary mb-2 rounded-md border-1 px-2 py-1 pt-1 pb-0 ${configurableClassNames}`}
                    data-testid={`unsolved-clue-${stepId}`}
                >
                    {parts}
                </div>
            );
        },
        [renderClueParts, renderAnswerWord, ladder, answerWord, currentQuestion]
    );

    return (
        <div className='mb-6 px-3 font-medium md:p-0'>
            <div className='text-sm leading-[24px] md:text-lg'>
                {unsolvedStepIds.length > 0 && (
                    <div>
                        <h2
                            className='border-border text-tx-secondary mb-4 border-b-1 pt-4 text-sm font-bold uppercase'
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
                            className='border-border text-tx-secondary mb-2 border-b-1 pt-4 text-sm font-bold uppercase'
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
