import { useMemo, useState } from 'react';
import { Button, Card } from '@/components';
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

    const [collapsedTeams, setCollapsedTeams] = useState<Record<number, boolean>>({});
    const teamStates = useMemo(
        () =>
            teams.map(team => ({
                team,
                solving: calculateSolvingContext(team),
                isCollapsed: Boolean(collapsedTeams[team.team_id]),
            })),
        [teams, collapsedTeams]
    );

    const stuckHints = useMemo(() => deriveStuckHints(teamStates), [teamStates]);
    const [dismissedHintSignatures, setDismissedHintSignatures] = useState<Set<string>>(new Set());

    const toggleTeamCollapse = (teamId: number) => {
        setCollapsedTeams(prev => ({ ...prev, [teamId]: !prev[teamId] }));
    };

    const dismissHint = (signature: string) => {
        setDismissedHintSignatures(prev => new Set(prev).add(signature));
    };

    return (
        <div className='space-y-4'>
            {stuckHints.forward && !dismissedHintSignatures.has(stuckHints.forward.signature) && (
                <Card
                    variant='warning'
                    className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'
                    data-testid='stuck-clue-alert-forward'
                >
                    <div className='flex-1 space-y-1 text-sm'>
                        <div className='text-tx-primary font-semibold'>
                            All teams are stuck on the {stuckHints.forward.directionLabel} clue
                        </div>
                        <div className='text-tx-primary'>
                            <span className='font-semibold'>Solve:</span>{' '}
                            <span className='font-mono font-bold'>{stuckHints.forward.word}</span>
                        </div>
                        <div className='text-tx-secondary text-xs leading-relaxed'>
                            <span className='font-semibold'>Clue:</span>{' '}
                            {renderForwardClue(stuckHints.forward.clue, stuckHints.forward.knownWord)}
                        </div>
                    </div>
                    <Button
                        variant='secondary'
                        size='sm'
                        className='text-xs'
                        onClick={() => dismissHint(stuckHints.forward!.signature)}
                        data-testid='dismiss-stuck-clue-alert-forward'
                    >
                        Dismiss
                    </Button>
                </Card>
            )}

            {stuckHints.backward && !dismissedHintSignatures.has(stuckHints.backward.signature) && (
                <Card
                    variant='warning'
                    className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'
                    data-testid='stuck-clue-alert-backward'
                >
                    <div className='flex-1 space-y-1 text-sm'>
                        <div className='text-tx-primary font-semibold'>
                            All teams are stuck on the {stuckHints.backward.directionLabel} clue
                        </div>
                        <div className='text-tx-primary'>
                            <span className='font-semibold'>Solve:</span>{' '}
                            <span className='font-mono font-bold'>{stuckHints.backward.word}</span>
                        </div>
                        <div className='text-tx-secondary text-xs leading-relaxed'>
                            <span className='font-semibold'>Clue:</span>{' '}
                            {renderBackwardClue(stuckHints.backward.clue, stuckHints.backward.knownWord)}
                        </div>
                    </div>
                    <Button
                        variant='secondary'
                        size='sm'
                        className='text-xs'
                        onClick={() => dismissHint(stuckHints.backward!.signature)}
                        data-testid='dismiss-stuck-clue-alert-backward'
                    >
                        Dismiss
                    </Button>
                </Card>
            )}

            <div className='grid gap-6 md:grid-cols-2'>
                {teamStates.map(({ team, solving, isCollapsed }) => (
                    <TeamProgress
                        key={team.team_id}
                        team={team}
                        solving={solving}
                        isCollapsed={isCollapsed}
                        onToggleCollapse={() => toggleTeamCollapse(team.team_id)}
                    />
                ))}
            </div>
        </div>
    );
}

interface TeamProgressProps {
    team: TeamGameProgress;
    solving: SolvingContext;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
}

function TeamProgress({ team, solving, isCollapsed, onToggleCollapse }: TeamProgressProps) {
    const {
        revealedSet,
        progressPercent,
        currentDownQuestionIndex,
        currentDownAnswerIndex,
        currentUpQuestionIndex,
        currentUpAnswerIndex,
        downQuestion,
        downAnswer,
        upQuestion,
        upAnswer,
    } = solving;

    return (
        <Card>
            <div className='mb-4'>
                <div className='mb-2 flex items-center justify-between'>
                    <h3 className='text-tx-primary text-lg font-semibold'>{team.team_name}</h3>
                    <div className='flex items-center gap-2'>
                        {team.is_completed && (
                            <span className='rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800'>
                                ✓ Completed
                            </span>
                        )}
                    </div>
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

            {/* Current solving positions */}
            {!team.is_completed && (
                <div className='border-border/60 bg-secondary/60 mb-4 space-y-3 rounded-lg border p-4'>
                    <div className='text-tx-secondary mb-2 text-xs font-semibold tracking-wide uppercase'>
                        Current Solving Positions
                    </div>

                    {/* Down (forward) solving */}
                    <div className='border-border/70 bg-tertiary/40 rounded-lg border p-3'>
                        <div className='mb-2 flex items-center gap-2'>
                            <span className='text-xs font-semibold text-blue-700'>↓ SOLVING DOWN</span>
                            <span className='text-tx-muted text-xs'>
                                (Step #{currentDownQuestionIndex} → #{currentDownAnswerIndex})
                            </span>
                        </div>
                        <div className='text-tx-primary mb-1 text-sm'>
                            <span className='font-semibold'>Known:</span>{' '}
                            <span className='font-mono font-bold'>{downQuestion.word}</span>
                        </div>
                        {downQuestion.clue && (
                            <div className='text-tx-secondary mb-2 text-sm'>
                                <span className='font-semibold'>Clue:</span>{' '}
                                {renderForwardClue(downQuestion.clue ?? '', downQuestion.word)}
                            </div>
                        )}
                        <div className='text-tx-primary text-sm'>
                            <span className='font-semibold'>Solving for:</span>{' '}
                            <span className='border-accent/40 bg-accent/15 text-accent ml-1 inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-sm font-bold'>
                                {downAnswer.word}
                                {revealedSet.has(currentDownAnswerIndex) && (
                                    <span className='text-green text-[11px] font-semibold'>Solved ✓</span>
                                )}
                            </span>
                        </div>
                    </div>

                    {/* Up (backward) solving */}
                    <div className='border-border/70 bg-tertiary/40 rounded-lg border p-3'>
                        <div className='mb-2 flex items-center gap-2'>
                            <span className='text-xs font-semibold text-green-700'>↑ SOLVING UP</span>
                            <span className='text-tx-muted text-xs'>
                                (Step #{currentUpQuestionIndex} → #{currentUpAnswerIndex})
                            </span>
                        </div>
                        <div className='text-tx-primary mb-1 text-sm'>
                            <span className='font-semibold'>Known:</span>{' '}
                            <span className='font-mono font-bold'>{upAnswer.word}</span>
                        </div>
                        {upQuestion.clue && (
                            <div className='text-tx-secondary mb-2 text-sm'>
                                <span className='font-semibold'>Clue:</span>{' '}
                                {renderBackwardClue(upQuestion.clue ?? '', upAnswer.word)}
                            </div>
                        )}
                        <div className='text-tx-primary text-sm'>
                            <span className='font-semibold'>Solving for:</span>{' '}
                            <span className='border-accent/40 bg-accent/15 text-accent ml-1 inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-sm font-bold'>
                                {upQuestion.word}
                                {revealedSet.has(currentUpQuestionIndex) && (
                                    <span className='text-green text-[11px] font-semibold'>Solved ✓</span>
                                )}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Ladder display */}
            <div className='mb-2 flex items-center justify-between'>
                <span className='text-tx-secondary text-xs font-semibold uppercase'>Ladder</span>
                <Button
                    variant='secondary'
                    size='sm'
                    className='text-xs'
                    onClick={onToggleCollapse}
                    data-testid={`toggle-ladder-${team.team_id}`}
                >
                    {isCollapsed ? '▼ Expand' : '▲ Collapse'}
                </Button>
            </div>
            {isCollapsed ? (
                <div className='bg-secondary border-border text-tx-secondary flex items-center justify-between rounded border p-3 text-xs'>
                    <span>Full ladder hidden</span>
                    <span className='text-tx-primary font-mono'>
                        Next ↓ #{currentDownAnswerIndex} · Next ↑ #{currentUpQuestionIndex}
                    </span>
                </div>
            ) : (
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
            )}
        </Card>
    );
}

type LadderStep = TeamGameProgress['puzzle']['ladder'][number];

interface SolvingContext {
    revealedSet: Set<number>;
    totalSteps: number;
    progressPercent: number;
    currentDownQuestionIndex: number;
    currentDownAnswerIndex: number;
    currentUpQuestionIndex: number;
    currentUpAnswerIndex: number;
    downQuestion: LadderStep;
    downAnswer: LadderStep;
    upQuestion: LadderStep;
    upAnswer: LadderStep;
}

function calculateSolvingContext(team: TeamGameProgress): SolvingContext {
    const revealedSet = new Set(team.revealed_steps);
    const totalSteps = team.puzzle.ladder.length;
    const progressPercent = totalSteps > 0 ? Math.round((team.revealed_steps.length / totalSteps) * 100) : 0;

    const getNextUnrevealedIndex = (fromStart: boolean): number => {
        if (totalSteps === 0) return 0;

        if (fromStart) {
            for (let i = 1; i < totalSteps; i++) {
                if (!revealedSet.has(i)) {
                    return i;
                }
            }
            return totalSteps - 1;
        }

        for (let i = totalSteps - 2; i >= 0; i--) {
            if (!revealedSet.has(i)) {
                return i;
            }
        }
        return 0;
    };

    const currentDownAnswerIndex = getNextUnrevealedIndex(true);
    const currentDownQuestionIndex = Math.max(0, currentDownAnswerIndex - 1);
    const currentUpQuestionIndex = getNextUnrevealedIndex(false);
    const currentUpAnswerIndex = Math.min(Math.max(totalSteps - 1, 0), currentUpQuestionIndex + 1);

    const downQuestion = team.puzzle.ladder[currentDownQuestionIndex] ?? { word: '', clue: '', transform: '' };
    const downAnswer = team.puzzle.ladder[currentDownAnswerIndex] ?? { word: '', clue: '', transform: '' };
    const upQuestion = team.puzzle.ladder[currentUpQuestionIndex] ?? { word: '', clue: '', transform: '' };
    const upAnswer = team.puzzle.ladder[currentUpAnswerIndex] ?? { word: '', clue: '', transform: '' };

    return {
        revealedSet,
        totalSteps,
        progressPercent,
        currentDownQuestionIndex,
        currentDownAnswerIndex,
        currentUpQuestionIndex,
        currentUpAnswerIndex,
        downQuestion,
        downAnswer,
        upQuestion,
        upAnswer,
    };
}

// Helper to render forward clue (downward solving: show question, hide answer)
function renderForwardClue(clue: string, questionWord: string) {
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
}

// Helper to render backward clue (upward solving: hide question, show answer)
function renderBackwardClue(clue: string, answerWord: string) {
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
}

function deriveStuckHints(teamStates: Array<{ team: TeamGameProgress; solving: SolvingContext }>) {
    const activeTeams = teamStates.filter(({ team }) => !team.is_completed);
    if (activeTeams.length < 2) {
        return { forward: null, backward: null };
    }

    const forwardTargets = activeTeams.map(({ solving }) => ({
        word: solving.downAnswer.word,
        clue: solving.downQuestion.clue ?? '',
        knownWord: solving.downQuestion.word,
        isSolved: solving.revealedSet.has(solving.currentDownAnswerIndex),
    }));
    const backwardTargets = activeTeams.map(({ solving }) => ({
        word: solving.upQuestion.word,
        clue: solving.upQuestion.clue ?? '',
        knownWord: solving.upAnswer.word,
        isSolved: solving.revealedSet.has(solving.currentUpQuestionIndex),
    }));

    const allForwardStuck =
        forwardTargets.every(t => !t.isSolved && t.word && t.clue) &&
        new Set(forwardTargets.map(t => t.word)).size === 1 &&
        new Set(forwardTargets.map(t => t.clue)).size === 1;

    const allBackwardStuck =
        backwardTargets.every(t => !t.isSolved && t.word && t.clue) &&
        new Set(backwardTargets.map(t => t.word)).size === 1 &&
        new Set(backwardTargets.map(t => t.clue)).size === 1;

    return {
        forward: allForwardStuck
            ? {
                  direction: 'forward' as const,
                  directionLabel: 'forward',
                  word: forwardTargets[0].word,
                  clue: forwardTargets[0].clue,
                  knownWord: forwardTargets[0].knownWord,
                  signature: `forward:${forwardTargets[0].word}:${forwardTargets[0].clue}`,
              }
            : null,
        backward: allBackwardStuck
            ? {
                  direction: 'backward' as const,
                  directionLabel: 'backward',
                  word: backwardTargets[0].word,
                  clue: backwardTargets[0].clue,
                  knownWord: backwardTargets[0].knownWord,
                  signature: `backward:${backwardTargets[0].word}:${backwardTargets[0].clue}`,
              }
            : null,
    };
}
