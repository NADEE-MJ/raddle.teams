import { Card } from '@/components';
import type { TeamGameProgress } from '@/types';

interface GameProgressViewProps {
    teams: TeamGameProgress[];
}

export default function GameProgressView({ teams }: GameProgressViewProps) {
    if (!teams || teams.length === 0) {
        return (
            <div className='text-tx-muted py-8 text-center'>
                <p>No active game</p>
            </div>
        );
    }

    return (
        <div className='space-y-6'>
            <div className='text-tx-secondary mb-3 text-sm tracking-wide uppercase'>
                Game in Progress ({teams.length} Teams)
            </div>

            <div className='grid gap-6 md:grid-cols-2'>
                {teams.map(team => (
                    <TeamProgress key={team.team_id} team={team} />
                ))}
            </div>
        </div>
    );
}

interface TeamProgressProps {
    team: TeamGameProgress;
}

function TeamProgress({ team }: TeamProgressProps) {
    const revealedSet = new Set(team.revealed_steps);
    const totalSteps = team.puzzle.ladder.length;
    const progressPercent = Math.round((team.revealed_steps.length / totalSteps) * 100);

    // Helper to render forward clue (downward solving: show question, hide answer)
    const renderForwardClue = (clue: string, questionWord: string) => {
        const parts: (string | JSX.Element)[] = [];
        let keyCounter = 0;

        clue.split(/(<>|\{\})/).forEach(part => {
            if (part === '<>') {
                parts.push(
                    <span
                        key={`q-${keyCounter++}`}
                        className='mx-0.5 rounded bg-blue-100 px-1.5 py-0.5 font-mono font-semibold text-blue-900'
                    >
                        {questionWord}
                    </span>
                );
            } else if (part === '{}') {
                parts.push(
                    <span key={`blank-${keyCounter++}`} className='text-tx-muted font-mono'>
                        _____
                    </span>
                );
            } else if (part) {
                parts.push(part);
            }
        });

        return <>{parts}</>;
    };

    // Helper to render backward clue (upward solving: hide question, show answer)
    const renderBackwardClue = (clue: string, answerWord: string) => {
        const parts: (string | JSX.Element)[] = [];
        let keyCounter = 0;

        clue.split(/(<>|\{\})/).forEach(part => {
            if (part === '<>') {
                parts.push(
                    <span key={`blank-${keyCounter++}`} className='text-tx-muted font-mono'>
                        _____
                    </span>
                );
            } else if (part === '{}') {
                parts.push(
                    <span
                        key={`a-${keyCounter++}`}
                        className='mx-0.5 rounded bg-green-100 px-1.5 py-0.5 font-mono font-semibold text-green-900'
                    >
                        {answerWord}
                    </span>
                );
            } else if (part) {
                parts.push(part);
            }
        });

        // If clue doesn't contain {}, append the answer word
        if (!clue.includes('{}')) {
            parts.push(' → ');
            parts.push(
                <span
                    key={`a-${keyCounter++}`}
                    className='mx-0.5 rounded bg-green-100 px-1.5 py-0.5 font-mono font-semibold text-green-900'
                >
                    {answerWord}
                </span>
            );
        }

        return <>{parts}</>;
    };

    return (
        <Card>
            <div className='mb-4'>
                <div className='mb-2 flex items-center justify-between'>
                    <h3 className='text-tx-primary text-lg font-semibold'>{team.team_name}</h3>
                    {team.is_completed && (
                        <span className='rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800'>
                            ✓ Completed
                        </span>
                    )}
                </div>
                <p className='text-tx-secondary mb-2 text-sm'>{team.puzzle.title}</p>

                {/* Progress bar */}
                <div className='bg-secondary h-2 overflow-hidden rounded-full'>
                    <div
                        className='bg-accent h-full transition-all duration-300'
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
            </div>

            {/* Ladder display */}
            <div className='max-h-96 space-y-2 overflow-y-auto'>
                {team.puzzle.ladder.map((step, index) => {
                    const isRevealed = revealedSet.has(index);
                    const nextStep = team.puzzle.ladder[index + 1];
                    const hasNextStep = index < team.puzzle.ladder.length - 1;

                    return (
                        <div
                            key={index}
                            className={`border-border rounded border p-3 text-sm transition-all ${
                                isRevealed ? 'bg-accent/10 border-accent/30' : 'bg-secondary'
                            }`}
                        >
                            <div className='flex items-center justify-between'>
                                <div className='flex items-center gap-3'>
                                    <span
                                        className={`text-tx-secondary min-w-[2rem] font-mono text-xs ${
                                            isRevealed ? 'text-accent font-semibold' : ''
                                        }`}
                                    >
                                        #{index}
                                    </span>
                                    <span
                                        className={`font-mono text-base tracking-wider ${
                                            isRevealed ? 'text-accent font-bold' : 'text-tx-primary font-medium'
                                        }`}
                                    >
                                        {step.word}
                                    </span>
                                </div>
                                {isRevealed && <span className='text-accent text-xs'>✓</span>}
                            </div>
                            {step.clue && hasNextStep && nextStep && (
                                <div className='text-tx-secondary border-border/50 mt-2 space-y-2 border-t pt-2 text-xs'>
                                    <div>
                                        <span className='font-semibold'>Forward clue:</span>{' '}
                                        {renderForwardClue(step.clue, step.word)}
                                    </div>
                                    <div>
                                        <span className='font-semibold'>Backward clue:</span>{' '}
                                        {renderBackwardClue(step.clue, nextStep.word)}
                                    </div>
                                </div>
                            )}
                            {step.transform && (
                                <div className='text-tx-muted mt-1 text-xs'>
                                    <span className='font-semibold'>Transform:</span> {step.transform}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </Card>
    );
}
