import { useState, useEffect, useRef, JSX, useMemo, useCallback } from 'react';
import { GameState, GameStateStep, Puzzle } from '@/types/game';




interface CluesProps {
    gameState: GameState;
    puzzle: Puzzle;
    isDownward: boolean;
}


export default function Clues({ gameState, puzzle, isDownward }: CluesProps) {
    const solvedSteps = useMemo(() => {
        return gameState.filter(step => step.isRevealed && step.status === 'revealed');
    }, [gameState]);


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
                parts.push('_____');
            } else if (answerWordRendered) {
                parts.push(answerWordRendered);
            } else {
                parts.push('_____');
            }
            remainingText = remainingText.substring(nextPlaceholderIndex + 2);
        }

        return parts;
    };

    const renderSolvedClue = (gameStateStep: GameStateStep) => {
        const ladderStep = puzzle.ladder[gameStateStep.id];
        if (!ladderStep) throw new Error('Ladder step not found for revealed step');
        const answerLadderStep = puzzle.ladder[gameStateStep.id + 1];
        if (!answerLadderStep) throw new Error('Answer ladder step not found for revealed step');
        const clue = ladderStep.clue;
        if (!clue) throw new Error('Clue is null for revealed step');

        const hintWord = ladderStep.word;
        const answerWord = answerLadderStep.word;

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


    // const renderDownwardClue = (clue: string) => {
    //     const hintWordRendered = (
    //         <span className='bg-green/50 text-green px-1 pt-[6px] pb-[3px] font-mono'>{hintWord}</span>
    //     );

    //     const parts = renderClueParts(clue, hintWordRendered, null);

    //     return <div className='text-tx-primary mb-2 opacity-75'>{parts}</div>;
    // };

    // const renderUpwardClue = (clue: string) => {
    //     const answerWordRendered = (
    //         <span className='bg-accent/50 text-accent px-1 pt-[6px] pb-[3px] font-mono'>{answer}</span>
    //     );

    //     const parts = renderClueParts(clue, null, answerWordRendered);

    //     return <div className='text-tx-muted my-3 mb-2 opacity-75'>{parts}</div>;
    // };

    return (
        <div className='mb-6 px-3 text-left font-medium md:p-0 md:text-lg'>
            <div className='text-sm leading-[24px] md:p-0 md:text-base lg:text-lg'>
                {/* {Object.entries(clues).length > 0 && (
                    <div>
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
                    </div>
                )} */}

                {/* <div>
                    {gameState.map((step) => (<p key={step.id} className='text-white'>aasasdasdfasd</p>))}
                </div> */}



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

