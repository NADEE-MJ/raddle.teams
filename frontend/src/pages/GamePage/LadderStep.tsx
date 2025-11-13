import { useState, useMemo } from 'react';
import Button from '@/components/Button';

interface LadderStepProps {
    onGuessChange: (guess: string) => void;
    inputRef: React.RefObject<HTMLInputElement | null>;
    word: string;
    transform: string | null;
    isCurrentQuestion: boolean;
    isCurrentAnswer: boolean;
    isStepRevealed: boolean;
    isActive: boolean;
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
    shouldShowTransform,
    shouldRenderTransform,
}: LadderStepProps) {
    const [currentGuess, setCurrentGuess] = useState('');

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

    const renderActiveStep = (wordLength: number, renderEmptyTransform: boolean) => {
        return (
            <div className='relative'>
                <span
                    className='bg-secondary border-border text-tx-primary absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg border p-0.5 text-sm md:text-base'
                    data-testid='word-length-indicator'
                >
                    ({wordLength})
                </span>
                <input
                    ref={inputRef}
                    type='text'
                    value={currentGuess}
                    onChange={e => {
                        const guess = e.target.value.toUpperCase().trim();
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

    const renderUnrevealedStep = (wordLength: number, renderEmptyTransform: boolean) => {
        return (
            <div className='relative'>
                <input
                    type='text'
                    placeholder={'◼️'.repeat(wordLength) + ` (${wordLength})`}
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
        if (isActive) {
            return renderActiveStep(word.length, transform !== null && shouldRenderTransform);
        }

        if (isStepRevealed || isCurrentQuestion || isCurrentAnswer) {
            return renderRevealedStep(
                word,
                transform !== null && shouldRenderTransform,
                shouldShowTransform ? transform : null
            );
        }

        return renderUnrevealedStep(word.length, transform !== null && shouldRenderTransform);
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
