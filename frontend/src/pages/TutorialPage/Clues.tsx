import { JSX, useMemo } from 'react';
import { Puzzle } from '@/types/game';

interface CluesProps {
    puzzle: Puzzle;
    isDownward: boolean;
    completed: boolean;
    isStepRevealed: (stepId: number) => boolean;
    isCurrentQuestion: (stepId: number) => boolean;
    isCurrentAnswer: (stepId: number) => boolean;
    questionWord: string | null;
    answerWord: string | null;
}

export default function Clues({ puzzle, isDownward, completed, isStepRevealed, isCurrentQuestion, isCurrentAnswer, questionWord, answerWord }: CluesProps) {
    const unsolvedStepIds = useMemo(() => {
        const stepIds = [];
        for (let i = 0; i < puzzle.ladder.length - 1; i++) {
            if (!isStepRevealed(i)) {
                stepIds.push(i);
            }
        }
        return stepIds;
    }, [puzzle.ladder.length, isStepRevealed]);

    const solvedStepIds = useMemo(() => {
        const stepIds = [];
        for (let i = 0; i < puzzle.ladder.length - 1; i++) {
            if (isStepRevealed(i)) {
                stepIds.push(i);
            }
        }
        return stepIds;
    }, [puzzle.ladder.length, isStepRevealed]);

    const renderQuestionWord = (word: string) => {
        return (
            <span className='bg-green/30 text-green p-1 font-mono'
                data-testid={`question-word-${word?.toLowerCase()}`}>{word}</span>
        )
    };

    const renderAnswerWord = (word: string) => {
        return (
            <span className='bg-yellow/30 text-yellow p-1 font-mono'
                data-testid={`answer-word-${word?.toLowerCase()}`}>{word}</span>
        )
    };

    const renderClueParts = (
        clue: string,
        questionWordRendered: JSX.Element | null,
        answerWordRendered: JSX.Element | null
    ) => {
        const parts: (string | JSX.Element)[] = [];

        clue.split(/(<>|\{\})/).forEach((part) => {
            if (part === '<>') {
                parts.push(questionWordRendered || '_____');
            } else if (part === '{}') {
                parts.push(answerWordRendered || '_____');
            } else if (part) {
                parts.push(part);
            }
        });

        return parts;
    };

    const renderSolvedClue = (stepId: number) => {
        const ladderStep = puzzle.ladder[stepId];
        if (!ladderStep) throw new Error('Ladder step not found for revealed step');
        const answerLadderStep = puzzle.ladder[stepId + 1];
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
            parts.push(' -> ')
            parts.push(answerWordRendered)
        }

        return (
            <div className='text-tx-muted my-3 mb-2 opacity-75'
                data-testid={`solved-clue-${stepId}`}>
                {parts}
            </div>
        );
    };

    const renderDownwardClue = (stepId: number) => {
        const ladderStep = puzzle.ladder[stepId];
        if (!ladderStep) throw new Error('Ladder step not found for revealed step');
        const clue = ladderStep.clue;
        if (!clue) throw new Error('Clue is null for revealed step');

        const questionWordRendered = renderQuestionWord(questionWord!)

        const parts = renderClueParts(clue, questionWordRendered, null);

        return <div className='text-tx-primary opacity-75 border-border bg-secondary mb-2 rounded-md border-1 px-2 py-1 pt-1 pb-0'
            data-testid={`unsolved-clue-${stepId}`}>{parts}</div>;
    };

    const renderUpwardClue = (stepId: number) => {
        const ladderStep = puzzle.ladder[stepId];
        if (!ladderStep) throw new Error('Ladder step not found for revealed step');
        const clue = ladderStep.clue;
        if (!clue) throw new Error('Clue is null for revealed step');

        const answerWordRendered = renderAnswerWord(answerWord!)

        const parts = renderClueParts(clue, null, answerWordRendered);

        if (!clue.includes('{}')) {
            parts.push(' → ')
            parts.push(answerWordRendered)
        }
        return <div className='text-tx-primary opacity-75 border-border bg-secondary mb-2 rounded-md border-1 px-2 py-1 pt-1 pb-0'
            data-testid={`unsolved-clue-${stepId}`}>
            {parts}
        </div>;
    };

    return (
        <div className='mb-6 px-3 font-medium md:p-0'>
            <div className='text-sm leading-[24px] md:text-lg'>
                {unsolvedStepIds.length > 0 && (
                    <div>
                        <h2 className='border-border text-tx-secondary mb-4 border-b-1 pt-4 text-sm font-bold uppercase'
                            data-testid='clues-out-of-order-heading'>
                            Clues, out of order
                        </h2>
                        {unsolvedStepIds.map((stepId) => (
                            <div key={`unsolved-clue-${stepId}`} >
                                {!isDownward ? renderUpwardClue(stepId) : renderDownwardClue(stepId)}
                            </div>
                        ))}
                    </div>
                )}
                {solvedStepIds.length > 0 && (
                    <div>
                        <h2 className='border-border text-tx-secondary mb-2 border-b-1 pt-4 text-sm font-bold uppercase'
                            data-testid='used-clues-heading'>
                            Used clues
                        </h2>
                        {solvedStepIds.map((stepId) => (
                            <div key={`solved-clue-${stepId}`} >
                                {renderSolvedClue(stepId)}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

