import { JSX, useCallback, useMemo } from 'react';
import { TutorialState } from '@/types/tutorialStateMachine';

interface CluesProps {
    gameState: TutorialState;
    shuffleWithSeed: <T>(array: T[], seedStr: string) => T[];
}

export default function Clues({ gameState, shuffleWithSeed }: CluesProps) {
    const ladder = useMemo(() => gameState.puzzle.ladder, [gameState.puzzle.ladder]);
    const isDownward = useMemo(() => gameState.direction === 'down', [gameState.direction]);
    const questionWord = useMemo(() => {
        if (gameState.currentQuestion === -1) return null;
        return ladder[gameState.currentQuestion]?.word || null;
    }, [gameState.currentQuestion, ladder]);

    const answerWord = useMemo(() => {
        if (gameState.currentAnswer === -1) return null;
        return ladder[gameState.currentAnswer]?.word || null;
    }, [gameState.currentAnswer, ladder]);

    const isStepRevealed = useCallback(
        (stepId: number) => {
            return gameState.revealedSteps.has(stepId);
        },
        [gameState.revealedSteps]
    );

    const unsolvedStepIds = useMemo(() => {
        const allStepIds = Array.from({ length: ladder.length - 1 }, (_, i) => i);
        const shuffledStepIds = shuffleWithSeed(allStepIds, gameState.puzzle.title);
        return shuffledStepIds.filter((id) => !isStepRevealed(id) || (isStepRevealed(id) && !isStepRevealed(id + 1)));
    }, [ladder.length, isStepRevealed, gameState.puzzle.title, shuffleWithSeed]);

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
            <span className='bg-green/30 text-green p-1 pb-0.5 font-mono'
                data-testid={`question-word-${word?.toLowerCase()}`}>{word}</span>
        )
    }, []);

    const renderAnswerWord = useCallback((word: string) => {
        return (
            <span className='bg-yellow/30 text-yellow p-1 pb-0.5 font-mono'
                data-testid={`answer-word-${word?.toLowerCase()}`}>{word}</span>
        )
    }, []);

    const renderClueParts = useCallback((
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
    }, []);

    const renderSolvedClue = useCallback((stepId: number) => {
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
            parts.push(' -> ')
            parts.push(answerWordRendered)
        }

        return (
            <div className='text-tx-muted my-3 mb-2 opacity-75'
                data-testid={`solved-clue-${stepId}`}>
                {parts}
            </div>
        );
    }, [renderClueParts, renderQuestionWord, renderAnswerWord, ladder]);

    const renderDownwardClue = useCallback((stepId: number) => {
        const ladderStep = ladder[stepId];
        if (!ladderStep) throw new Error('Ladder step not found for revealed step');
        const clue = ladderStep.clue;
        if (!clue) throw new Error('Clue is null for revealed step');

        const isActiveClue = stepId === gameState.currentQuestion;
        const hintUsed = gameState.hintsUsed.get(gameState.currentAnswer) ? gameState.hintsUsed.get(gameState.currentAnswer)! > 0 : false;

        const shouldGreyOut = hintUsed && !isActiveClue;

        const questionWordRendered = shouldGreyOut
            ? <span className='text-tx-muted p-1 font-mono'>_____</span>
            : renderQuestionWord(questionWord!)

        const parts = renderClueParts(clue, questionWordRendered, null);

        const configurableClassNames = shouldGreyOut
            ? 'text-tx-muted opacity-50'
            : hintUsed
                ? 'text-tx-primary opacity-75 border-blue-500'
                : 'text-tx-primary opacity-75 ';

        return <div className={`bg-secondary rounded-md mb-2 border-1 px-2 py-1 pt-1 pb-0 ${configurableClassNames}`}
            data-testid={`unsolved-clue-${stepId}`}>{parts}</div>;
    }, [renderClueParts, renderQuestionWord, ladder, questionWord, gameState.hintsUsed, gameState.currentQuestion, gameState.currentAnswer]);

    const renderUpwardClue = useCallback((stepId: number) => {
        const ladderStep = ladder[stepId];
        if (!ladderStep) throw new Error('Ladder step not found for revealed step');
        const clue = ladderStep.clue;
        if (!clue) throw new Error('Clue is null for revealed step');

        const isActiveClue = stepId === gameState.currentQuestion;
        const hintUsed = gameState.hintsUsed.get(gameState.currentQuestion) ? gameState.hintsUsed.get(gameState.currentQuestion)! > 0 : false;

        const shouldGreyOut = !isActiveClue && hintUsed;

        const answerWordRendered = shouldGreyOut
            ? <span className='text-tx-muted p-1 font-mono'>_____</span>
            : renderAnswerWord(answerWord!)

        const parts = renderClueParts(clue, null, answerWordRendered);

        if (!clue.includes('{}')) {
            parts.push(' → ')
            parts.push(answerWordRendered)
        }

        const configurableClassNames = shouldGreyOut
            ? 'text-tx-muted opacity-50'
            : hintUsed
                ? 'text-tx-primary opacity-75 border-blue-500'
                : 'text-tx-primary opacity-75';

        return <div className={`bg-secondary rounded-md mb-2 border-1 px-2 py-1 pt-1 pb-0 ${configurableClassNames}`}
            data-testid={`unsolved-clue-${stepId}`}>
            {parts}
        </div>;
    }, [renderClueParts, renderAnswerWord, ladder, answerWord, gameState.hintsUsed, gameState.currentQuestion]);

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

