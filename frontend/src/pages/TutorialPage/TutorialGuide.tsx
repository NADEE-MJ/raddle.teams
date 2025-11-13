import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TutorialState } from '@/types/tutorialStateMachine';
import { Button } from '@/components';

interface TutorialGuideProps {
    tutorialState: TutorialState;
    onNextStep?: (step: number) => void;
}

interface TutorialStep {
    id: number;
    content: string;
    autoAdvanceCondition?: (state: TutorialState, previousState: TutorialState | null) => boolean;
}

const tutorialSteps: TutorialStep[] = [
    {
        id: 1,
        content:
            "Welcome to Raddle! Let's learn how to play. Begin by solving the blue highlighted clue below, then type your answer in the yellow box. Note the (5) next to the yellow box indicates that the answer is 5 letters long.",
        autoAdvanceCondition: (state, prev) => {
            // Advance when first step is revealed (first answer correct)
            return state.revealedSteps.has(1) && (!prev || !prev.revealedSteps.has(1));
        },
    },
    {
        id: 2,
        content:
            "Correct! That clue has moved to the 'Used Clues' list below.\n\nNow you see all of the remaining clues. In Raddle, the clues are out of order, and you have to determine which clue is right for this step. Figure out which clue makes sense, then type your answer in the yellow box.",
        autoAdvanceCondition: (state, prev) => {
            // Advance when second step is revealed
            return state.revealedSteps.has(2) && (!prev || !prev.revealedSteps.has(2));
        },
    },
    {
        id: 3,
        content:
            "Great! If you're ever stuck, you can tap the lightbulb button next to the yellow box for a hint that will reveal which of the clues is correct. Do that now.",
        autoAdvanceCondition: (state, prev) => {
            // Advance when a hint is used
            const currentHints = Array.from(state.hintsUsed.values()).reduce((sum, hints) => sum + hints, 0);
            const prevHints = prev ? Array.from(prev.hintsUsed.values()).reduce((sum, hints) => sum + hints, 0) : 0;
            return currentHints > prevHints;
        },
    },
    {
        id: 4,
        content:
            'When you use a hint, the incorrect clues will fade out slightly. Read the highlighted clue, and then enter your answer.\n\nStill stuck? Tap the eye button to reveal the answer and continue.',
        autoAdvanceCondition: (state, prev) => {
            // Advance when third step is revealed or when multiple hints are used
            return state.revealedSteps.has(3) && (!prev || !prev.revealedSteps.has(3));
        },
    },
    {
        id: 5,
        content:
            "Nice. One final tip: if you're stuck moving down the ladder, you can switch direction and move up instead. Click the arrow (↑) button or the box that says 'Switch to solving upwards' at the bottom of the screen.",
        autoAdvanceCondition: (state, prev) => {
            // Advance when direction is switched to up
            return state.direction === 'up' && (!prev || prev.direction !== 'up');
        },
    },
    {
        id: 6,
        content:
            "When solving upwards, the clues flip around — now they show you the answer, and you need to figure out what word belongs in the green box (the question). This direction can be more challenging. If you're stuck, tap the lightbulb. Type your answer when you've figured it out.",
        autoAdvanceCondition: (state, prev) => {
            // Advance when solving upwards and a step is revealed
            const prevRevealedCount = prev?.revealedSteps.size || 0;
            return state.direction === 'up' && state.revealedSteps.size > prevRevealedCount;
        },
    },
    {
        id: 7,
        content: 'Keep going! Solve the remaining clues to complete the ladder.',
        autoAdvanceCondition: state => {
            // This is the final step, only advance when completed
            return state.isCompleted;
        },
    },
];

export default function TutorialGuide({ tutorialState }: TutorialGuideProps) {
    const [currentStep, setCurrentStep] = useState(1);
    const [previousState, setPreviousState] = useState<TutorialState | null>(null);
    const navigate = useNavigate();

    // Auto-advance logic
    useEffect(() => {
        const step = tutorialSteps.find(s => s.id === currentStep);
        if (step?.autoAdvanceCondition && step.autoAdvanceCondition(tutorialState, previousState)) {
            const nextStep = currentStep + 1;
            if (nextStep <= tutorialSteps.length) {
                setCurrentStep(nextStep);
            }
        }
        setPreviousState(tutorialState);
    }, [tutorialState, currentStep, previousState]);

    const step = useMemo(() => tutorialSteps.find(s => s.id === currentStep), [currentStep]);

    const progressPercentage = useMemo(
        () => Math.round(((currentStep - 1) / (tutorialSteps.length - 1)) * 100),
        [currentStep]
    );
    console.log('Progress percentage:', progressPercentage);

    return (
        <div
            className={`bg-tutorial-guide-bg border-tutorial-guide-border rounded-lg border p-6 ${tutorialState.isCompleted ? 'text-center' : ''}`}
        >
            <div className='mb-4'>
                <div className='h-2 w-full overflow-hidden rounded-full bg-gray-700'>
                    <div
                        className='bg-tutorial-guide-progress h-2 rounded-full transition-all duration-500 ease-out'
                        style={{ width: `${tutorialState.isCompleted ? '100%' : progressPercentage}%` }}
                    />
                </div>
            </div>
            {tutorialState.isCompleted ? (
                <div>
                    <div className='text-tx-primary mb-2 text-lg font-medium'>
                        Congratulations on completing the tutorial!
                    </div>
                    <Button onClick={() => navigate('/')} variant='primary' size='lg'>
                        Ready to Play with Teams!
                    </Button>
                </div>
            ) : (
                <div className='leading-relaxed whitespace-pre-line text-gray-300'>{step!.content}</div>
            )}
        </div>
    );
}
