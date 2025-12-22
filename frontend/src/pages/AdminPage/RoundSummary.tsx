import { useState, useEffect, useMemo, useRef } from 'react';
import { api } from '@/services/api';
import { Card, Button, Modal } from '@/components';
import type { Puzzle } from '@/types/game';
import LadderStep from '@/pages/GamePage/LadderStep';
import Clues from '@/pages/GamePage/Clues';

interface PlayerAward {
    key: string;
    title: string;
    emoji: string;
    description: string;
}

interface PlayerGameStats {
    player_id: number;
    player_name: string;
    correct_guesses: number;
    total_guesses: number;
    accuracy_rate: number;
    words_solved: number[];
    wrong_guesses: string[];
    awards: PlayerAward[];
}

interface TeamGameStats {
    team_id: number;
    team_name: string;
    placement: number | null;
    points_earned: number | null;
    wrong_guesses: number;
    wrong_guess_rate: number;
    wrong_guess_label: string;
    completed_at: string | null;
    completion_percentage: number;
    time_to_complete: number | null;
    puzzle: Puzzle;
    revealed_steps: number[];
    player_stats: PlayerGameStats[];
}

interface GameStatsResponse {
    game_id: number;
    round_number: number;
    started_at: string;
    teams: TeamGameStats[];
    last_round_winner_id: number | null;
}

interface RoundSummaryProps {
    lobbyId: number;
    gameId: number;
    adminToken: string;
    onClose: () => void;
}

// Seeded random selection - ensures same awards are shown for a player across all views
function selectRandomAwards(awards: PlayerAward[], playerId: number, maxCount: number = 3): PlayerAward[] {
    if (awards.length <= maxCount) {
        return awards;
    }

    // Simple seeded shuffle using player ID as seed
    const seededRandom = (seed: number) => {
        let x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    };

    const shuffled = [...awards];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(seededRandom(playerId + i) * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled.slice(0, maxCount);
}

export function RoundSummary({ gameId, adminToken, onClose }: RoundSummaryProps) {
    const [stats, setStats] = useState<GameStatsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedTeams, setExpandedTeams] = useState<Set<number>>(new Set());
    const [activeAwardTooltip, setActiveAwardTooltip] = useState<string | null>(null);
    const [isPuzzlePreviewOpen, setIsPuzzlePreviewOpen] = useState(true);

    useEffect(() => {
        fetchStats();
    }, [gameId]);

    const fetchStats = async () => {
        try {
            setError(null);
            const data = await api.admin.lobby.getGameStats(gameId, adminToken);
            setStats(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load round stats');
        } finally {
            setLoading(false);
        }
    };

    const toggleTeamExpanded = (teamId: number) => {
        setExpandedTeams(prev => {
            const newSet = new Set(prev);
            if (newSet.has(teamId)) {
                newSet.delete(teamId);
            } else {
                newSet.add(teamId);
            }
            return newSet;
        });
    };

    const formatTime = (seconds: number | null): string => {
        if (seconds === null) return 'DNF';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getPlacementBadge = (placement: number | null) => {
        if (placement === null) return null;
        const badges: Record<number, string> = {
            1: '🥇',
            2: '🥈',
            3: '🥉',
        };
        return badges[placement] || `#${placement}`;
    };

    const resolveRevealedSteps = useMemo(() => {
        return (puzzle: Puzzle, revealedSteps: number[]) => {
            if (revealedSteps && revealedSteps.length > 0) {
                return new Set(revealedSteps);
            }
            return new Set(puzzle.ladder.map((_, index) => index));
        };
    }, []);

    const RoundPuzzlePreview = ({ puzzle, revealedSteps }: { puzzle: Puzzle; revealedSteps: number[] }) => {
        const inputRef = useRef<HTMLInputElement>(null);
        const revealedStepsSet = useMemo(() => resolveRevealedSteps(puzzle, revealedSteps), [puzzle, revealedSteps]);
        const safeAnswerIndex = puzzle.ladder.length > 1 ? 1 : 0;

        return (
            <div className='mx-auto max-w-6xl'>
                <div className='md:grid md:grid-cols-[2fr_3fr] md:gap-8'>
                    <div className='bg-primary py-3'>
                        <div className='border-ladder-rungs border-x-5'>
                            <div className='border-ladder-rungs border-b'>
                                <div className='hidden p-3 sm:hidden md:block'></div>
                            </div>
                            {puzzle.ladder.map((ladderStep, stepId) => {
                                const isStepRevealed = revealedStepsSet.has(stepId);
                                const shouldShowTransform =
                                    Boolean(ladderStep.transform) &&
                                    stepId < puzzle.ladder.length - 1 &&
                                    revealedStepsSet.has(stepId) &&
                                    revealedStepsSet.has(stepId + 1);

                                return (
                                    <div key={`round-puzzle-step-${stepId}`} className='border-ladder-rungs border-y'>
                                        <LadderStep
                                            onGuessChange={() => {}}
                                            inputRef={inputRef}
                                            word={ladderStep.word}
                                            transform={ladderStep.transform}
                                            isCurrentQuestion={false}
                                            isCurrentAnswer={false}
                                            isStepRevealed={isStepRevealed}
                                            isActive={false}
                                            isDisabled={true}
                                            shouldShowTransform={shouldShowTransform}
                                            shouldRenderTransform={true}
                                            isLocked={false}
                                            feedback={null}
                                            isMobileCollapsed={false}
                                        />
                                    </div>
                                );
                            })}
                            <div className='border-ladder-rungs border-t p-4' />
                        </div>
                    </div>

                    <Clues
                        puzzle={puzzle}
                        direction='down'
                        currentQuestion={0}
                        currentAnswer={safeAnswerIndex}
                        revealedSteps={revealedStepsSet}
                        isCompleted={true}
                    />
                </div>
            </div>
        );
    };

    const sortedTeams = stats ? [...stats.teams].sort((a, b) => (a.placement || 999) - (b.placement || 999)) : [];
    const completedTeams = stats ? stats.teams.filter(team => team.completed_at) : [];
    const dnfTeamsCount = stats ? stats.teams.length - completedTeams.length : 0;
    const fastestTime =
        completedTeams.length > 0
            ? Math.min(...completedTeams.map(team => team.time_to_complete ?? Number.POSITIVE_INFINITY))
            : null;
    const winnerTeam = sortedTeams.find(team => team.placement === 1) || null;

    const expandAllTeams = () => {
        setExpandedTeams(new Set(sortedTeams.map(team => team.team_id)));
    };

    const collapseAllTeams = () => {
        setExpandedTeams(new Set());
    };

    return (
        <Modal isOpen={true} onClose={onClose} maxWidth='max-w-6xl' isLoading={loading}>
            {error || !stats ? (
                <div className='p-6'>
                    <div className='text-red mb-4'>{error || 'Failed to load round stats'}</div>
                    <Button onClick={onClose} variant='secondary'>
                        Close
                    </Button>
                </div>
            ) : (
                <div className='flex h-[80vh] flex-col'>
                    <div className='border-border bg-elevated/40 flex flex-wrap items-center justify-between gap-4 border-b px-6 pt-4 pb-5'>
                        <div>
                            <p className='text-tx-muted text-xs font-semibold tracking-wide uppercase'>Round Summary</p>
                            <h2 className='text-tx-primary text-2xl font-bold'>Round {stats.round_number}</h2>
                            <p className='text-tx-muted text-sm'>
                                Game ID: {stats.game_id} • Started: {new Date(stats.started_at).toLocaleString()}
                            </p>
                        </div>
                        <div className='flex flex-wrap items-center gap-2'>
                            <Button onClick={expandAllTeams} variant='secondary' size='sm'>
                                Expand all
                            </Button>
                            <Button onClick={collapseAllTeams} variant='secondary' size='sm'>
                                Collapse all
                            </Button>
                            <Button onClick={onClose} variant='secondary' size='sm'>
                                Close
                            </Button>
                        </div>
                    </div>

                    <div className='flex-1 overflow-y-auto px-6 pt-5 pb-6'>
                        <div className='mb-6 grid gap-3 md:grid-cols-4'>
                            <div className='border-border bg-elevated/50 rounded-lg border p-4'>
                                <div className='text-tx-muted text-xs font-semibold uppercase'>Teams</div>
                                <div className='text-tx-primary text-xl font-semibold'>{stats.teams.length}</div>
                            </div>
                            <div className='border-border bg-elevated/50 rounded-lg border p-4'>
                                <div className='text-tx-muted text-xs font-semibold uppercase'>Finished</div>
                                <div className='text-tx-primary text-xl font-semibold'>
                                    {completedTeams.length} • DNF {dnfTeamsCount}
                                </div>
                            </div>
                            <div className='border-border bg-elevated/50 rounded-lg border p-4'>
                                <div className='text-tx-muted text-xs font-semibold uppercase'>Fastest Time</div>
                                <div className='text-tx-primary text-xl font-semibold'>
                                    {fastestTime ? formatTime(fastestTime) : '—'}
                                </div>
                            </div>
                            <div className='border-border bg-elevated/50 rounded-lg border p-4'>
                                <div className='text-tx-muted text-xs font-semibold uppercase'>Winner</div>
                                <div className='text-tx-primary text-xl font-semibold'>
                                    {winnerTeam ? winnerTeam.team_name : '—'}
                                </div>
                            </div>
                        </div>

                        <div className='mb-8'>
                            <div className='mb-3 flex flex-wrap items-center justify-between gap-2'>
                                <h3 className='text-tx-primary text-lg font-semibold'>Round Puzzle</h3>
                                <div className='flex items-center gap-3'>
                                    <Button
                                        onClick={() => setIsPuzzlePreviewOpen(prev => !prev)}
                                        variant='secondary'
                                        size='sm'
                                    >
                                        {isPuzzlePreviewOpen ? 'Hide puzzle' : 'Show puzzle'}
                                    </Button>
                                </div>
                            </div>
                            {sortedTeams[0] && (
                                <Card className='bg-elevated/50 p-4'>
                                    <div className='mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                                        <div>
                                            <div className='text-tx-secondary text-xs font-semibold uppercase'>
                                                Puzzle Preview
                                            </div>
                                            <div className='text-tx-primary text-lg font-semibold'>
                                                {sortedTeams[0].puzzle.title}
                                            </div>
                                            {new Set(sortedTeams.map(team => team.puzzle.title)).size > 1 && (
                                                <div className='text-tx-muted text-xs'>
                                                    Multiple puzzles used this round; showing {sortedTeams[0].team_name}
                                                    .
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {isPuzzlePreviewOpen && (
                                        <div className='bg-primary border-border/60 rounded-xl border p-4'>
                                            <RoundPuzzlePreview
                                                puzzle={sortedTeams[0].puzzle}
                                                revealedSteps={sortedTeams[0].revealed_steps}
                                            />
                                        </div>
                                    )}
                                </Card>
                            )}
                        </div>

                        <div className='space-y-4'>
                            {sortedTeams.map((team, index) => {
                                const isExpanded = expandedTeams.has(team.team_id);
                                const selectedPlayers = team.player_stats;
                                const placementBadge = getPlacementBadge(team.placement);
                                return (
                                    <Card key={team.team_id} className='bg-elevated/50'>
                                        <div className='flex flex-wrap items-center justify-between gap-4'>
                                            <div className='flex items-center gap-4'>
                                                <div className='bg-secondary/70 text-tx-primary flex h-12 w-12 items-center justify-center rounded-xl text-xl font-bold'>
                                                    {placementBadge || `${index + 1}`}
                                                </div>
                                                <div>
                                                    <div className='text-tx-primary flex items-center gap-2 text-lg font-semibold'>
                                                        {team.team_name}
                                                        {team.team_id === stats.last_round_winner_id && (
                                                            <span aria-label='Round winner'>👑</span>
                                                        )}
                                                    </div>
                                                    <div className='text-tx-muted text-sm'>
                                                        {team.completed_at ? 'Finished' : 'DNF'} •{' '}
                                                        {team.points_earned ?? 0} pts
                                                    </div>
                                                </div>
                                            </div>
                                            <div className='flex flex-wrap items-center gap-3 text-sm'>
                                                <div className='bg-secondary/60 rounded-lg px-3 py-2'>
                                                    <div className='text-tx-muted text-xs uppercase'>Time</div>
                                                    <div className='text-tx-primary font-semibold'>
                                                        {formatTime(team.time_to_complete)}
                                                    </div>
                                                </div>
                                                <div className='bg-secondary/60 rounded-lg px-3 py-2'>
                                                    <div className='text-tx-muted text-xs uppercase'>Completion</div>
                                                    <div className='text-tx-primary font-semibold'>
                                                        {(team.completion_percentage * 100).toFixed(0)}%
                                                    </div>
                                                </div>
                                                <div className='bg-secondary/60 rounded-lg px-3 py-2'>
                                                    <div className='text-tx-muted text-xs uppercase'>Wrong</div>
                                                    <div className='text-tx-primary font-semibold'>
                                                        {team.wrong_guesses} • {team.wrong_guess_label}
                                                    </div>
                                                </div>
                                                <Button
                                                    onClick={() => toggleTeamExpanded(team.team_id)}
                                                    variant='secondary'
                                                    size='sm'
                                                >
                                                    {isExpanded ? 'Hide players' : 'View players'}
                                                </Button>
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className='mt-4 grid gap-3 md:grid-cols-2'>
                                                {selectedPlayers.map(player => {
                                                    const selectedAwards = selectRandomAwards(
                                                        player.awards,
                                                        player.player_id,
                                                        3
                                                    );
                                                    return (
                                                        <div
                                                            key={player.player_id}
                                                            className='border-border bg-secondary/30 rounded-lg border p-4'
                                                        >
                                                            <div className='flex items-start justify-between gap-3'>
                                                                <div>
                                                                    <div className='text-tx-primary text-base font-semibold'>
                                                                        {player.player_name}
                                                                    </div>
                                                                    <div className='text-tx-muted text-sm'>
                                                                        {player.correct_guesses}/{player.total_guesses}{' '}
                                                                        correct (
                                                                        {(player.accuracy_rate * 100).toFixed(0)}%
                                                                        accuracy)
                                                                    </div>
                                                                </div>
                                                                {selectedAwards.length > 0 ? (
                                                                    <div className='flex flex-wrap justify-end gap-2'>
                                                                        {selectedAwards.map(award => {
                                                                            const tooltipKey = `${player.player_id}-${award.key}`;
                                                                            const isTooltipActive =
                                                                                activeAwardTooltip === tooltipKey;
                                                                            return (
                                                                                <div
                                                                                    key={award.key}
                                                                                    className='relative'
                                                                                >
                                                                                    <button
                                                                                        onClick={() =>
                                                                                            setActiveAwardTooltip(
                                                                                                isTooltipActive
                                                                                                    ? null
                                                                                                    : tooltipKey
                                                                                            )
                                                                                        }
                                                                                        className='border-border bg-elevated hover:bg-elevated/80 flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition'
                                                                                        type='button'
                                                                                    >
                                                                                        <span className='text-base'>
                                                                                            {award.emoji}
                                                                                        </span>
                                                                                        <span className='text-tx-primary'>
                                                                                            {award.title}
                                                                                        </span>
                                                                                    </button>
                                                                                    {isTooltipActive && (
                                                                                        <>
                                                                                            <div
                                                                                                className='fixed inset-0 z-10'
                                                                                                onClick={() =>
                                                                                                    setActiveAwardTooltip(
                                                                                                        null
                                                                                                    )
                                                                                                }
                                                                                            />
                                                                                            <div className='bg-elevated border-border text-tx-primary absolute top-full right-0 z-20 mt-2 w-64 rounded-lg border p-3 shadow-xl'>
                                                                                                <div className='text-xs font-semibold'>
                                                                                                    {award.emoji}{' '}
                                                                                                    {award.title}
                                                                                                </div>
                                                                                                <div className='text-tx-secondary mt-1 text-xs'>
                                                                                                    {award.description}
                                                                                                </div>
                                                                                            </div>
                                                                                        </>
                                                                                    )}
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                ) : (
                                                                    <span className='text-tx-muted text-xs'>
                                                                        No awards
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {player.words_solved.length > 0 && (
                                                                <div className='text-tx-muted mt-3 text-sm'>
                                                                    <span className='font-semibold'>Words solved:</span>{' '}
                                                                    {player.words_solved.join(', ')}
                                                                </div>
                                                            )}

                                                            {player.wrong_guesses.length > 0 && (
                                                                <div className='text-tx-muted mt-1 text-sm'>
                                                                    <span className='font-semibold'>
                                                                        Wrong guesses:
                                                                    </span>{' '}
                                                                    {player.wrong_guesses.join(', ')}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </Card>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </Modal>
    );
}
