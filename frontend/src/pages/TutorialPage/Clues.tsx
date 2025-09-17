import { JSX, useMemo } from 'react';
import { GameState, GameStateStep, Puzzle } from '@/types/game';

interface CluesProps {
    gameState: GameState;
    puzzle: Puzzle;
    isDownward: boolean;
    completed: boolean
}

export default function Clues({ gameState, puzzle, isDownward, completed }: CluesProps) {
    const unsolvedSteps = useMemo(() => {
        return gameState.filter(step => !step.isRevealed && step.id !== puzzle.ladder.length - 1);
    }, [gameState, puzzle.ladder.length]);

    const solvedSteps = useMemo(() => {
        return gameState.filter(step => (step.isRevealed && step.id !== puzzle.ladder.length - 1));
    }, [gameState, puzzle.ladder.length]);

    const questionWord = useMemo(() => {
        if (completed) return null;
        const questionStepId = gameState.find(step => step.status === 'question')?.id;
        if (questionStepId === undefined) throw new Error('No active question step found');
        const questionLadderStep = puzzle.ladder[questionStepId];
        if (!questionLadderStep) throw new Error('Hint ladder step not found for question step');
        const questionWord = questionLadderStep.word;
        return questionWord;
    }, [gameState, puzzle.ladder, completed]);

    const answerWord = useMemo(() => {
        if (completed) return null;
        const answerStepId = gameState.find(step => step.status === 'answer')?.id;
        if (answerStepId === undefined) throw new Error('No active answer step found');
        const answerLadderStep = puzzle.ladder[answerStepId];
        if (!answerLadderStep) throw new Error('Hint ladder step not found for answer step');
        const answerWord = answerLadderStep.word;
        return answerWord;
    }, [gameState, puzzle.ladder, completed]);

    const renderQuestionWord = (word: string) => {
        return (
            <span className='bg-green/30 text-green p-1 font-mono'
                data-testid={`question-word-${word.toLowerCase()}`}>{word}</span>
        )
    };

    const renderAnswerWord = (word: string) => {
        return (
            <span className='bg-yellow/30 text-yellow p-1 font-mono'
                data-testid={`answer-word-${word.toLowerCase()}`}>{word}</span>
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

    const renderSolvedClue = (gameStateStep: GameStateStep) => {
        const ladderStep = puzzle.ladder[gameStateStep.id];
        if (!ladderStep) throw new Error('Ladder step not found for revealed step');
        const answerLadderStep = puzzle.ladder[gameStateStep.id + 1];
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
                data-testid={`solved-clue-${gameStateStep.id}`}>
                {parts}
            </div>
        );
    };

    const renderDownwardClue = (gameStateStep: GameStateStep) => {
        const ladderStep = puzzle.ladder[gameStateStep.id];
        if (!ladderStep) throw new Error('Ladder step not found for revealed step');
        const clue = ladderStep.clue;
        if (!clue) throw new Error('Clue is null for revealed step');

        const questionWordRendered = renderQuestionWord(questionWord!)

        const parts = renderClueParts(clue, questionWordRendered, null);

        return <div className='text-tx-primary opacity-75 border-border bg-secondary mb-2 rounded-md border-1 px-2 py-1 pt-1 pb-0'
            data-testid={`unsolved-clue-${gameStateStep.id}`}>{parts}</div>;
    };

    const renderUpwardClue = (gameStateStep: GameStateStep) => {
        const ladderStep = puzzle.ladder[gameStateStep.id];
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
            data-testid={`unsolved-clue-${gameStateStep.id}`}>
            {parts}
        </div>;
    };

    return (
        <div className='mb-6 px-3 font-medium md:p-0'>
            <div className='text-sm leading-[24px] md:text-lg'>
                {unsolvedSteps.length > 0 && (
                    <div>
                        <h2 className='border-border text-tx-secondary mb-4 border-b-1 pt-4 text-sm font-bold uppercase'
                            data-testid='clues-out-of-order-heading'>
                            Clues, out of order
                        </h2>
                        {unsolvedSteps.map((step) => (
                            <div key={`unsolved-clue-${step.id}`} >
                                {!isDownward ? renderUpwardClue(step) : renderDownwardClue(step)}
                            </div>
                        ))}
                    </div>
                )}
                {solvedSteps.length > 0 && (
                    <div>
                        <h2 className='border-border text-tx-secondary mb-2 border-b-1 pt-4 text-sm font-bold uppercase'
                            data-testid='used-clues-heading'>
                            Used clues
                        </h2>
                        {solvedSteps.map((step) => (
                            <div key={`solved-clue-${step.id}`} >
                                {renderSolvedClue(step)}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

