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
        return shuffledStepIds.filter(id => !isStepRevealed(id) || (isStepRevealed(id) && !isStepRevealed(id + 1)));
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
            <span
                className='bg-clue-question-word text-clue-text-word p-1 pb-0.5 font-mono'
                data-testid={`question-word-${word?.toLowerCase()}`}
            >
                {word}
            </span>
        );
    }, []);

    const renderQuestionWordSolved = useCallback((word: string) => {
        return (
            <span
                className='bg-clue-question-word-solved text-clue-text-muted-word p-1 pb-0.5 font-mono'
                data-testid={`question-word-${word?.toLowerCase()}`}
            >
                {word}
            </span>
        );
    }, []);

    const renderAnswerWord = useCallback((word: string) => {
        return (
            <span
                className='bg-clue-answer-word text-clue-text-word p-1 pb-0.5 font-mono'
                data-testid={`answer-word-${word?.toLowerCase()}`}
            >
                {word}
            </span>
        );
    }, []);

    const renderAnswerWordSolved = useCallback((word: string) => {
        return (
            <span
                className='bg-clue-answer-word-solved text-clue-text-muted-word p-1 pb-0.5 font-mono'
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

            const questionWordRendered = renderQuestionWordSolved(questionWord);
            const answerWordRendered = renderAnswerWordSolved(answerWord);

            const parts = renderClueParts(clue, questionWordRendered, answerWordRendered);

            if (clue.includes(questionPlaceholder) && !clue.includes(answerPlaceholder)) {
                parts.push(' -> ');
                parts.push(answerWordRendered);
            }

            return (
                <div className='text-clue-text-muted my-3 mb-2' data-testid={`solved-clue-${stepId}`}>
                    {parts}
                </div>
            );
        },
        [renderClueParts, renderQuestionWordSolved, renderAnswerWordSolved, ladder]
    );

    const renderDownwardClue = useCallback(
        (stepId: number) => {
            const ladderStep = ladder[stepId];
            if (!ladderStep) throw new Error('Ladder step not found for revealed step');
            const clue = ladderStep.clue;
            if (!clue) throw new Error('Clue is null for revealed step');

            const isActiveClue = stepId === gameState.currentQuestion;
            const hintUsed = gameState.hintsUsed.get(gameState.currentAnswer)
                ? gameState.hintsUsed.get(gameState.currentAnswer)! > 0
                : false;

            const shouldGreyOut = hintUsed && !isActiveClue;

            const questionWordRendered = shouldGreyOut ? (
                <span className='text-clue-text-muted p-1 font-mono'>_____</span>
            ) : (
                renderQuestionWord(questionWord!)
            );

            const parts = renderClueParts(clue, questionWordRendered, null);

            const configurableClassNames = shouldGreyOut ? 'text-clue-text-muted opacity-50' : 'text-clue-text';

            return (
                <div
                    className={`bg-clue-bg border-clue-border mb-2 rounded-md border px-2 pt-1.5 pb-1 ${configurableClassNames}`}
                    data-testid={`unsolved-clue-${stepId}`}
                >
                    {parts}
                </div>
            );
        },
        [
            renderClueParts,
            renderQuestionWord,
            ladder,
            questionWord,
            gameState.hintsUsed,
            gameState.currentQuestion,
            gameState.currentAnswer,
        ]
    );

    const renderUpwardClue = useCallback(
        (stepId: number) => {
            const ladderStep = ladder[stepId];
            if (!ladderStep) throw new Error('Ladder step not found for revealed step');
            const clue = ladderStep.clue;
            if (!clue) throw new Error('Clue is null for revealed step');

            const isActiveClue = stepId === gameState.currentQuestion;
            const hintUsed = gameState.hintsUsed.get(gameState.currentQuestion)
                ? gameState.hintsUsed.get(gameState.currentQuestion)! > 0
                : false;

            const shouldGreyOut = !isActiveClue && hintUsed;

            const answerWordRendered = shouldGreyOut ? (
                <span className='text-tx-muted p-1 font-mono'>_____</span>
            ) : (
                renderAnswerWord(answerWord!)
            );

            const parts = renderClueParts(clue, null, answerWordRendered);

            if (!clue.includes('{}')) {
                parts.push(' → ');
                parts.push(answerWordRendered);
            }

            const configurableClassNames = shouldGreyOut ? 'text-clue-text-muted opacity-50' : 'text-clue-text';

            return (
                <div
                    className={`bg-clue-bg border-clue-border mb-2 rounded-md border px-2 pt-1.5 pb-1 ${configurableClassNames}`}
                    data-testid={`unsolved-clue-${stepId}`}
                >
                    {parts}
                </div>
            );
        },
        [renderClueParts, renderAnswerWord, ladder, answerWord, gameState.hintsUsed, gameState.currentQuestion]
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
