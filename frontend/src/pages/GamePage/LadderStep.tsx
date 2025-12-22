import { useState, useMemo } from 'react';
import { CheckIcon, LockClosedIcon, XMarkIcon } from '@heroicons/react/24/solid';

export interface LadderStepFeedback {
    status: 'submitting' | 'correct' | 'incorrect';
    guess: string;
    wordIndex: number;
    playerId: number;
    isSelf: boolean;
    token: number;
}

interface LadderStepProps {
    onGuessChange: (guess: string) => void;
    inputRef: React.RefObject<HTMLInputElement | null>;
    word: string;
    transform: string | null;
    isCurrentQuestion: boolean;
    isCurrentAnswer: boolean;
    isStepRevealed: boolean;
    isActive: boolean;
    isDisabled?: boolean;
    shouldShowTransform: boolean;
    shouldRenderTransform: boolean;
    isLocked?: boolean;
    feedback?: LadderStepFeedback | null;
    isMobileCollapsed?: boolean;
}

export default function LadderStep({
    onGuessChange,
    inputRef,
    word,
    transform,
    isCurrentQuestion,
    isCurrentAnswer,
    isStepRevealed,
    isActive,
    isDisabled = false,
    shouldShowTransform,
    shouldRenderTransform,
    isLocked = false,
    feedback,
    isMobileCollapsed = false,
}: LadderStepProps) {
    const [currentGuess, setCurrentGuess] = useState('');
    const wordSegments = useMemo(() => {
        const segments: Array<
            { type: 'letters'; length: number } | { type: 'space'; length: number } | { type: 'hyphen'; length: number }
        > = [];
        let letterCount = 0;

        for (const char of word) {
            if (char === ' ' || char === '-') {
                if (letterCount > 0) {
                    segments.push({ type: 'letters', length: letterCount });
                    letterCount = 0;
                }
                const lastSegment = segments[segments.length - 1];
                const segmentType = char === ' ' ? 'space' : 'hyphen';
                if (lastSegment && lastSegment.type === segmentType) {
                    lastSegment.length += 1;
                } else {
                    segments.push({ type: segmentType, length: 1 });
                }
            } else {
                letterCount += 1;
            }
        }

        if (letterCount > 0) {
            segments.push({ type: 'letters', length: letterCount });
        }

        return segments.length > 0 ? segments : [{ type: 'letters', length: 0 }];
    }, [word]);

    const letterCountLabel = useMemo(() => {
        let result = '';
        for (let i = 0; i < wordSegments.length; i++) {
            const segment = wordSegments[i];
            if (segment.type === 'letters') {
                result += segment.length;
            } else if (segment.type === 'hyphen') {
                result += '-';
            } else if (segment.type === 'space') {
                result += ' ';
            }
        }
        return result ? `(${result})` : '(0)';
    }, [wordSegments]);

    const unrevealedPlaceholder = useMemo(() => {
        const pattern = wordSegments
            .map(segment => {
                if (segment.type === 'letters') {
                    return '◻️'.repeat(Math.max(segment.length, 1));
                } else if (segment.type === 'hyphen') {
                    return '-';
                } else {
                    return ' '.repeat(segment.length);
                }
            })
            .join('');

        return `${pattern} ${letterCountLabel}`;
    }, [wordSegments, letterCountLabel]);

    const color = useMemo(() => {
        if (isDisabled) return 'bg-revealed-step';
        if (isCurrentQuestion) return 'bg-question-step';
        if (isCurrentAnswer) return 'bg-answer-step';
        if (isStepRevealed) return 'bg-revealed-step';
        return 'bg-hidden-step';
    }, [isDisabled, isCurrentQuestion, isCurrentAnswer, isStepRevealed]);

    const renderEmptyTransformFn = () => {
        return (
            <span className='bg-transform-bg border-ladder-rungs text-tx-primary absolute bottom-0 left-1/2 z-50 w-[max-content] min-w-25 -translate-x-1/2 translate-y-1/2 rounded-sm border p-1 pb-[6px] font-mono text-xs leading-1 uppercase'>
                &nbsp;
            </span>
        );
    };

    const renderTransformFn = (transform: string) => {
        return (
            <span className='bg-transform-bg border-ladder-rungs text-tx-primary absolute bottom-0 left-1/2 z-50 -translate-x-1/2 translate-y-1/2 rounded-sm border px-2 py-1 font-mono text-xs whitespace-nowrap uppercase'>
                {transform}
            </span>
        );
    };

    const inputClassNames = useMemo(
        () =>
            'text-tx-primary w-full bg-transparent p-3 text-center text-[16px] tracking-wide uppercase focus:outline-none md:text-lg',
        []
    );

    const renderActiveStep = (lengthLabel: string, renderEmptyTransform: boolean) => {
        return (
            <div className='relative'>
                <span
                    className='bg-transform-bg border-ladder-rungs text-tx-primary absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg border-[0.5px] p-0.5 text-sm md:text-base'
                    data-testid='word-length-indicator'
                >
                    {lengthLabel}
                </span>
                <input
                    ref={inputRef}
                    type='text'
                    value={currentGuess}
                    onChange={e => {
                        const guess = e.target.value.toUpperCase();
                        setCurrentGuess(guess);
                        onGuessChange(guess);
                    }}
                    placeholder=''
                    className={inputClassNames}
                    autoComplete='off'
                    autoCorrect='off'
                    autoCapitalize='off'
                    spellCheck='false'
                    disabled={isLocked}
                    data-testid='active-step-input'
                />
                {renderEmptyTransform && renderEmptyTransformFn()}
            </div>
        );
    };

    const renderUnrevealedStep = (placeholderText: string, renderEmptyTransform: boolean) => {
        return (
            <div className='relative'>
                <input
                    type='text'
                    placeholder={placeholderText}
                    className={inputClassNames}
                    disabled
                    autoComplete='off'
                    autoCorrect='off'
                    autoCapitalize='off'
                    spellCheck='false'
                    data-testid='unrevealed-step-input'
                />
                {renderEmptyTransform && renderEmptyTransformFn()}
            </div>
        );
    };

    const renderRevealedStep = (word: string, renderTransform: boolean, transform: string | null = null) => {
        return (
            <div className='relative'>
                <div className='text-tx-primary py-3 text-center tracking-wide uppercase'>{word}</div>
                {renderTransform && (transform !== null ? renderTransformFn(transform) : renderEmptyTransformFn())}
            </div>
        );
    };

    const renderStep = (word: string, transform: string | null) => {
        // If disabled, always show as revealed (for game completion)
        if (isDisabled) {
            return renderRevealedStep(
                word,
                transform !== null && shouldRenderTransform,
                shouldShowTransform ? transform : null
            );
        }

        if (isActive) {
            return renderActiveStep(letterCountLabel, transform !== null && shouldRenderTransform);
        }

        if (isStepRevealed || isCurrentQuestion || isCurrentAnswer) {
            return renderRevealedStep(
                word,
                transform !== null && shouldRenderTransform,
                shouldShowTransform ? transform : null
            );
        }

        return renderUnrevealedStep(unrevealedPlaceholder, transform !== null && shouldRenderTransform);
    };

    const transitionClasses = 'transition-colors duration-200 ease-in-out';

    const renderFeedbackBadge = () => {
        if (!feedback) return null;

        const baseClasses =
            'flex items-center justify-center rounded-md border px-2 py-1 shadow-sm md:px-2.5 md:py-1.5';

        const statusClasses =
            feedback.status === 'submitting'
                ? 'border-blue-300/60 bg-blue-900/40 text-blue-50'
                : feedback.status === 'incorrect'
                  ? 'border-red-300/60 bg-red-900/40 text-red-50'
                  : 'border-green-300/70 bg-green-900/35 text-green-50';

        const Spinner = ({ className = '' }: { className?: string }) => (
            <span
                className={`h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent md:h-5 md:w-5 ${className}`}
            />
        );

        const Icon =
            feedback.status === 'submitting' ? Spinner : feedback.status === 'incorrect' ? XMarkIcon : CheckIcon;

        const ariaLabel =
            feedback.status === 'submitting'
                ? feedback.isSelf
                    ? 'Submitting guess'
                    : 'Teammate submitting guess'
                : feedback.status === 'incorrect'
                  ? feedback.isSelf
                      ? `Incorrect guess: ${feedback.guess}`
                      : `Teammate incorrect guess: ${feedback.guess}`
                  : feedback.isSelf
                    ? 'Correct guess'
                    : 'Teammate correct guess';

        return (
            <div className={`${isMobileCollapsed ? 'animate-ladder-slide-up' : ''}`} aria-live='polite'>
                <div className={`${baseClasses} ${statusClasses}`} role='status' aria-label={ariaLabel}>
                    <div className='flex items-center gap-1.5 md:gap-2'>
                        {isLocked && feedback.status === 'submitting' && (
                            <LockClosedIcon className='h-4 w-4 text-[var(--color-accent)] md:h-5 md:w-5' />
                        )}
                        <Icon className={feedback.status === 'submitting' ? '' : 'h-4 w-4 md:h-5 md:w-5'} />
                        {feedback.status === 'incorrect' && (
                            <span className='font-mono text-xs font-medium md:text-sm'>{feedback.guess}</span>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div
            className={`relative font-mono text-sm md:text-lg ${color} text-tx-primary ${transitionClasses}`}
            data-testid={`ladder-word-${word.toLowerCase()}`}
        >
            <div className='relative flex-1'>{renderStep(word, transform)}</div>
            {feedback && (
                <div className='pointer-events-none absolute top-1/2 right-2 max-w-[52vw] -translate-y-1/2 sm:max-w-[44vw] md:max-w-[280px]'>
                    {renderFeedbackBadge()}
                </div>
            )}
        </div>
    );
}
