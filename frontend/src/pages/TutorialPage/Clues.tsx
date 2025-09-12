import { useState, useEffect, useRef, JSX, useMemo, useCallback, act } from 'react';
import { GameState, GameStateStep, Puzzle } from '@/types/game';




interface CluesProps {
    gameState: GameState;
    puzzle: Puzzle;
    isDownward: boolean;
}


export default function Clues({ gameState, puzzle, isDownward }: CluesProps) {
    const unsolvedSteps = useMemo(() => {
        return gameState.filter(step => !step.isRevealed && step.id !== puzzle.ladder.length - 1);
    }, [gameState, puzzle.ladder.length]);

    const solvedSteps = useMemo(() => {
        return gameState.filter(step => (step.isRevealed && step.id !== puzzle.ladder.length - 1));
    }, [gameState, puzzle.ladder.length]);

    const renderClueParts = (
        clue: string,
        questionWordRendered: JSX.Element | null,
        answerWordRendered: JSX.Element | null
    ) => {
        const parts: (string | JSX.Element)[] = [];
        let index = 0;

        clue.split(/(<>|\{\})/).forEach((part, i) => {
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

        const questionWordRendered = (
            <span className='bg-green/30 text-green px-1 pt-[6px] pb-[3px] font-mono'>{questionWord}</span>
        );
        const answerWordRendered = (
            <span className='bg-yellow/30 text-yellow px-1 pt-[6px] pb-[3px] font-mono'>{answerWord}</span>
        );

        const parts = renderClueParts(clue, questionWordRendered, answerWordRendered);

        if (clue.includes(questionPlaceholder) && clue.includes(answerPlaceholder)) {
            return <div className='text-tx-muted my-3 mb-2 opacity-75'>{parts}</div>;
        }

        return (
            <div className='text-tx-muted my-3 mb-2 opacity-75'>
                {parts} → {answerWordRendered}
            </div>
        );
    };

    const questionWord = useMemo(() => {
        const questionStepId = gameState.find(step => step.status === 'question')?.id;
        if (questionStepId === undefined) throw new Error('No active question step found');
        const questionLadderStep = puzzle.ladder[questionStepId];
        if (!questionLadderStep) throw new Error('Hint ladder step not found for question step');
        const questionWord = questionLadderStep.word;
        return questionWord;
    }, [gameState, puzzle.ladder]);

    const renderDownwardClue = (gameStateStep: GameStateStep) => {
        const ladderStep = puzzle.ladder[gameStateStep.id];
        if (!ladderStep) throw new Error('Ladder step not found for revealed step');
        const clue = ladderStep.clue;
        if (!clue) throw new Error('Clue is null for revealed step');

        const questionWordRendered = (
            <span className='bg-green/50 text-green px-1 pt-[6px] pb-[3px] font-mono'>{questionWord}</span>
        );

        const parts = renderClueParts(clue, questionWordRendered, null);

        return <div className='text-tx-primary opacity-75'>{parts}</div>;
    };

    const answerWord = useMemo(() => {
        const answerStepId = gameState.find(step => step.status === 'answer')?.id;
        if (answerStepId === undefined) throw new Error('No active answer step found');
        const answerLadderStep = puzzle.ladder[answerStepId];
        if (!answerLadderStep) throw new Error('Hint ladder step not found for answer step');
        const answerWord = answerLadderStep.word;
        return answerWord;
    }, [gameState, puzzle.ladder]);

    const renderUpwardClue = (gameStateStep: GameStateStep) => {
        const ladderStep = puzzle.ladder[gameStateStep.id];
        if (!ladderStep) throw new Error('Ladder step not found for revealed step');
        const clue = ladderStep.clue;
        if (!clue) throw new Error('Clue is null for revealed step');

        const answerWordRendered = (
            <span className='bg-yellow/50 text-yellow p-1 font-mono'>{answerWord}</span>
        );

        const parts = renderClueParts(clue, null, answerWordRendered);

        if (clue.includes('{}')) {
            return <div className='text-tx-primary opacity-75'>{parts}</div>;
        }
        return <div className='text-tx-primary opacity-75'>
            {parts} → {answerWordRendered}
        </div>;
    };

    return (
        <div className='mb-6 px-3 text-left font-medium md:p-0 md:text-lg'>
            <div className='text-sm leading-[24px] md:p-0 md:text-base lg:text-lg'>
                {unsolvedSteps.length > 0 && (
                    <div>
                        <h2 className='border-border text-tx-secondary mb-4 border-b-1 pt-4 text-sm font-bold uppercase'>
                            Clues, out of order
                        </h2>
                        {unsolvedSteps.map((step) => (
                            <div
                                key={step.id}
                                className='border-border bg-secondary mb-2 rounded-md border-1 px-2 py-1 pt-1 pb-0'
                            >
                                {!isDownward ? renderUpwardClue(step) : renderDownwardClue(step)}
                            </div>
                        ))}
                    </div>
                )}
                {solvedSteps.length > 0 && (
                    <div>
                        <h2 className='border-border text-tx-secondary mb-2 border-b-1 pt-4 text-sm font-bold uppercase'>
                            Used clues
                        </h2>
                        {solvedSteps.map((step) => (
                            <div key={step.id} className='text-tx-muted my-3 mb-2 opacity-75'>
                                {renderSolvedClue(step)}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

