import { useEffect, useCallback } from 'react';
import { Card } from '@/components';
import type { TeamGameProgress } from '@/types';

interface GameProgressViewProps {
    teams: TeamGameProgress[];
    onTeamUpdate?: (teamId: number, revealedSteps: number[]) => void;
}

export default function GameProgressView({ teams, onTeamUpdate }: GameProgressViewProps) {
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
                <p className='text-tx-secondary mt-1 text-xs'>
                    {team.revealed_steps.length} / {totalSteps} words solved ({progressPercent}%)
                </p>
            </div>

            {/* Ladder display */}
            <div className='max-h-96 space-y-1 overflow-y-auto'>
                {team.puzzle.ladder.map((step, index) => {
                    const isRevealed = revealedSet.has(index);
                    return (
                        <div
                            key={index}
                            className={`border-border flex items-center justify-between rounded border p-2 text-sm transition-all ${
                                isRevealed ? 'bg-accent/10 border-accent/30' : 'bg-secondary'
                            }`}
                        >
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
                    );
                })}
            </div>
        </Card>
    );
}
