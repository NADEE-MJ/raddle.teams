import { useState, useMemo } from 'react';
import { LadderStep as LadderStepType, GameStateStep } from '@/types/game';


interface LadderStepProps {
    onGuessChange: (guess: string) => void;
    inputRef: React.RefObject<HTMLInputElement | null>;
    gameStateStep: GameStateStep;
    ladderStep: LadderStepType;
    ladderHeight: number;
}


export default function LadderStep({ onGuessChange, inputRef, gameStateStep, ladderStep, ladderHeight }: LadderStepProps) {
    const [currentGuess, setCurrentGuess] = useState('');

    const color = useMemo(() => {
        if (gameStateStep.status === 'question') return 'bg-green/50';
        if (gameStateStep.status === 'answer') return 'bg-yellow/80';
        if (gameStateStep.status === 'revealed') return 'bg-grey';
        return 'bg-secondary';
    }, [gameStateStep.status]);

    const renderEmptyTransformFn = () => {
        return (
            <span className='bg-secondary border-border text-tx-primary absolute bottom-0 left-1/2 z-50 w-[max-content] min-w-25 -translate-x-1/2 translate-y-1/2 rounded-sm border p-1 pb-[6px] font-mono text-xs leading-1 uppercase'>
                &nbsp;
            </span>
        )
    };

    const renderTransformFn = (transform: string) => {
        return (
            <span className='bg-secondary border-border text-tx-primary absolute bottom-0 left-1/2 z-50 -translate-x-1/2 translate-y-1/2 rounded-sm border px-2 py-1 font-mono text-xs whitespace-nowrap uppercase'>
                {transform}
            </span>
        );
    };

    const inputClassNames = useMemo(() => 'text-tx-primary w-full bg-transparent p-3 text-center text-[16px] tracking-wide uppercase focus:outline-none md:text-lg', []);

    const renderActiveStep = (wordLength: number, renderEmptyTransform: boolean) => {
        return (
            <div className='relative'>
                <span className='bg-secondary border-border text-tx-primary absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg border p-0.5 text-sm md:text-base'>
                    ({wordLength})
                </span>
                <input
                    ref={inputRef}
                    type='text'
                    value={currentGuess}
                    onChange={(e) => {
                        const guess = e.target.value.toUpperCase().trim();
                        setCurrentGuess(guess);
                        onGuessChange(guess);
                    }}
                    placeholder=''
                    className={inputClassNames}
                    // maxLength={step.word.length} TODO - enforce max length?
                    autoComplete='off'
                    autoCorrect='off'
                    autoCapitalize='off'
                    spellCheck='false'
                />
                <button className='bg-blue-500 border-blue-500 hover:bg-blue-600 transition-all duration-100 absolute top-1/2 right-0 flex h-8 w-8 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded border'>
                    💡
                </button>
                {renderEmptyTransform && renderEmptyTransformFn()}
            </div>);
    }

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
                />
                {renderEmptyTransform && renderEmptyTransformFn()}
            </div>);
    }

    const renderRevealedStep = (word: string, renderTransform: boolean, transform: string | null = null) => {
        return (
            <div className='relative'>
                <div className='text-tx-primary py-3 text-center tracking-wide uppercase'>{word}</div>
                {renderTransform && (transform !== null ? renderTransformFn(transform) : renderEmptyTransformFn())}
            </div>
        );
    }

    const renderStep = (gameStateStep: GameStateStep, currentLadderStep: LadderStepType) => {
        if (gameStateStep.active) {
            return renderActiveStep(currentLadderStep.word.length, currentLadderStep.transform !== null);
        }

        (currentLadderStep.transform);
        if (gameStateStep.status === 'revealed' || gameStateStep.status === 'question' || gameStateStep.status === 'answer') {
            return renderRevealedStep(currentLadderStep.word, currentLadderStep.transform !== null, gameStateStep.isRevealed ? currentLadderStep.transform : null);
        }

        return renderUnrevealedStep(currentLadderStep.word.length, currentLadderStep.transform !== null);
    };

    return (
        <div
            className={`relative font-mono text-sm md:text-lg ${color}`}
        >
            {renderStep(gameStateStep, ladderStep)}
        </div>
    );

}
