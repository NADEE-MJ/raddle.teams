import { useState, useMemo } from 'react';

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
}: LadderStepProps) {
    const [currentGuess, setCurrentGuess] = useState('');
    const wordSegments = useMemo(() => {
        const segments: Array<{ type: 'letters'; length: number } | { type: 'space'; length: number }> = [];
        let letterCount = 0;

        for (const char of word) {
            if (char === ' ') {
                if (letterCount > 0) {
                    segments.push({ type: 'letters', length: letterCount });
                    letterCount = 0;
                }
                const lastSegment = segments[segments.length - 1];
                if (lastSegment && lastSegment.type === 'space') {
                    lastSegment.length += 1;
                } else {
                    segments.push({ type: 'space', length: 1 });
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
        const counts = wordSegments.filter(segment => segment.type === 'letters').map(segment => segment.length);
        const formattedCounts = counts.length > 0 ? counts.join(' ') : '0';
        return `(${formattedCounts})`;
    }, [wordSegments]);

    const unrevealedPlaceholder = useMemo(() => {
        const pattern = wordSegments
            .map(segment => {
                if (segment.type === 'letters') {
                    return '◼️'.repeat(Math.max(segment.length, 1));
                }
                return ' '.repeat(segment.length);
            })
            .join('');

        return `${pattern} ${letterCountLabel}`;
    }, [wordSegments, letterCountLabel]);

    const color = useMemo(() => {
        if (isCurrentQuestion) return 'bg-green/50';
        if (isCurrentAnswer) return 'bg-yellow/80';
        if (isStepRevealed) return 'bg-grey';
        return 'bg-secondary';
    }, [isCurrentQuestion, isCurrentAnswer, isStepRevealed]);

    const renderEmptyTransformFn = () => {
        return (
            <span className='bg-secondary border-border text-tx-primary absolute bottom-0 left-1/2 z-50 w-[max-content] min-w-25 -translate-x-1/2 translate-y-1/2 rounded-sm border p-1 pb-[6px] font-mono text-xs leading-1 uppercase'>
                &nbsp;
            </span>
        );
    };

    const renderTransformFn = (transform: string) => {
        return (
            <span className='bg-secondary border-border text-tx-primary absolute bottom-0 left-1/2 z-50 -translate-x-1/2 translate-y-1/2 rounded-sm border px-2 py-1 font-mono text-xs whitespace-nowrap uppercase'>
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
                    className='bg-secondary border-border text-tx-primary absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg border p-0.5 text-sm md:text-base'
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

    return (
        <div
            className={`relative font-mono text-sm md:text-lg ${color}`}
            data-testid={`ladder-word-${word.toLowerCase()}`}
        >
            {renderStep(word, transform)}
        </div>
    );
}
