import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { GameStatsResponse } from '@/types';
import { Button, Card, Modal } from '@/components';

interface RoundSummaryProps {
    gameId: number;
    onClose: () => void;
}

function formatTime(seconds: number | null): string {
    if (seconds === null) return 'DNF';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatPercentage(pct: number): string {
    return `${(pct * 100).toFixed(0)}%`;
}

export function RoundSummary({ gameId, onClose }: RoundSummaryProps) {
    const [stats, setStats] = useState<GameStatsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedTeams, setExpandedTeams] = useState<Set<number>>(new Set());

    useEffect(() => {
        async function fetchStats() {
            try {
                setLoading(true);
                setError(null);
                const data = await api.tournament.getGameStats(gameId);
                setStats(data);
            } catch (err) {
                console.error('Failed to fetch game stats:', err);
                setError(err instanceof Error ? err.message : 'Failed to load round results');
            } finally {
                setLoading(false);
            }
        }

        fetchStats();
    }, [gameId]);

    const toggleTeamExpanded = (teamId: number) => {
        setExpandedTeams(prev => {
            const next = new Set(prev);
            if (next.has(teamId)) {
                next.delete(teamId);
            } else {
                next.add(teamId);
            }
            return next;
        });
    };

    if (loading) {
        return (
            <Modal isOpen={true} onClose={onClose} maxWidth='max-w-6xl'>
                <div className='p-8 text-center'>
                    <h2 className='text-tx-primary mb-3 text-2xl font-semibold'>Round Results</h2>
                    <p className='text-tx-secondary text-sm'>Loading round results...</p>
                </div>
            </Modal>
        );
    }

    if (error || !stats) {
        return (
            <Modal isOpen={true} onClose={onClose} maxWidth='max-w-6xl'>
                <div className='p-8 text-center'>
                    <h2 className='text-tx-primary mb-3 text-2xl font-semibold'>Round Results</h2>
                    <p className='text-sm text-red-600'>{error || 'Failed to load results'}</p>
                    <Button onClick={onClose} className='mt-4' variant='secondary'>
                        Close
                    </Button>
                </div>
            </Modal>
        );
    }

    const getMedalEmoji = (placement: number) => {
        switch (placement) {
            case 1:
                return '🥇';
            case 2:
                return '🥈';
            case 3:
                return '🥉';
            default:
                return '';
        }
    };

    return (
        <Modal isOpen={true} onClose={onClose} maxWidth='max-w-6xl'>
            <div className='max-h-[80vh] space-y-5 overflow-y-auto p-6'>
                <div className='flex flex-wrap items-start justify-between gap-4'>
                    <div>
                        <div className='text-tx-secondary text-xs font-semibold tracking-wide uppercase'>
                            Round Results
                        </div>
                        <h2 className='text-tx-primary text-2xl font-semibold'>Round {stats.round_number} Results</h2>
                        <p className='text-tx-secondary text-sm'>
                            Started: {new Date(stats.started_at).toLocaleString()}
                        </p>
                    </div>
                    <Button variant='secondary' size='sm' onClick={onClose}>
                        Close
                    </Button>
                </div>

                <Card>
                    <div className='flex flex-wrap items-center justify-between gap-3'>
                        <div className='text-tx-primary text-sm'>
                            Started: {new Date(stats.started_at).toLocaleString()}
                        </div>
                        <div className='text-tx-secondary text-sm'>{stats.teams.length} teams</div>
                    </div>
                </Card>

                <Card>
                    <h3 className='text-tx-primary mb-3 text-lg font-semibold'>Team Rankings</h3>
                    <div className='border-border overflow-hidden rounded-md border'>
                        <table className='divide-border min-w-full divide-y'>
                            <thead className='bg-secondary text-tx-secondary text-left text-xs font-semibold uppercase'>
                                <tr>
                                    <th className='px-4 py-3'>Rank</th>
                                    <th className='px-4 py-3'>Team</th>
                                    <th className='px-4 py-3 text-center'>Points</th>
                                    <th className='px-4 py-3 text-center'>Time</th>
                                    <th className='px-4 py-3 text-center'>Completion</th>
                                    <th className='px-4 py-3 text-center'>Wrong Guesses</th>
                                    <th className='px-4 py-3 text-center'>Details</th>
                                </tr>
                            </thead>
                            <tbody className='divide-border bg-primary divide-y'>
                                {stats.teams.map(team => {
                                    const isExpanded = expandedTeams.has(team.team_id);
                                    const medal = getMedalEmoji(team.placement);

                                    return (
                                        <tr key={team.team_id} className='hover:bg-tertiary/60'>
                                            <td className='text-tx-primary px-4 py-3 text-sm font-semibold'>
                                                <div className='flex items-center gap-2'>
                                                    <span>{team.placement}.</span>
                                                    {medal && <span>{medal}</span>}
                                                    {team.placement === 1 && <span>👑</span>}
                                                </div>
                                            </td>
                                            <td className='text-tx-primary px-4 py-3 text-sm font-semibold'>
                                                {team.team_name}
                                            </td>
                                            <td className='text-tx-secondary px-4 py-3 text-center text-sm'>
                                                {team.points_earned} pts
                                            </td>
                                            <td className='text-tx-secondary px-4 py-3 text-center text-sm'>
                                                {formatTime(team.time_to_complete)}
                                            </td>
                                            <td className='text-tx-secondary px-4 py-3 text-center text-sm'>
                                                {formatPercentage(team.completion_percentage)}
                                            </td>
                                            <td className='text-tx-secondary px-4 py-3 text-center text-sm'>
                                                <div>
                                                    <span className='text-tx-primary font-medium'>
                                                        {team.wrong_guesses}
                                                    </span>
                                                    <div className='text-tx-muted text-xs'>
                                                        {team.wrong_guess_label}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className='px-4 py-3 text-center'>
                                                <Button
                                                    onClick={() => toggleTeamExpanded(team.team_id)}
                                                    variant='link'
                                                    size='sm'
                                                    className='font-semibold'
                                                >
                                                    {isExpanded ? 'Hide' : 'Show'}
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {stats.teams.map(team => {
                    if (!expandedTeams.has(team.team_id)) return null;

                    return (
                        <Card key={`expanded-${team.team_id}`} className='space-y-3'>
                            <div className='flex flex-wrap items-center justify-between gap-3'>
                                <h4 className='text-tx-primary text-lg font-semibold'>
                                    {team.team_name} - Player Stats
                                </h4>
                                <div className='text-tx-secondary text-sm'>Placement: #{team.placement}</div>
                            </div>
                            <div className='space-y-3'>
                                {team.player_stats.map(player => (
                                    <div
                                        key={player.player_id}
                                        className='border-border bg-tertiary rounded-md border p-4'
                                    >
                                        <div className='mb-2 flex items-start justify-between gap-3'>
                                            <div className='space-y-1'>
                                                <h5 className='text-tx-primary font-semibold'>{player.player_name}</h5>
                                                {player.awards.length > 0 && (
                                                    <div className='flex flex-wrap gap-2'>
                                                        {player.awards.map(award => (
                                                            <span
                                                                key={award.key}
                                                                className='inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800'
                                                                title={award.description}
                                                            >
                                                                <span>{award.emoji}</span>
                                                                <span>{award.title}</span>
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div className='text-right'>
                                                <div className='text-tx-primary text-sm font-semibold'>
                                                    {player.correct_guesses}/{player.total_guesses} correct
                                                </div>
                                                <div className='text-tx-secondary text-xs'>
                                                    {(player.accuracy_rate * 100).toFixed(0)}% accuracy
                                                </div>
                                            </div>
                                        </div>

                                        <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                                            <div>
                                                <p className='text-tx-primary text-sm font-medium'>Words Solved:</p>
                                                <p className='text-tx-secondary text-sm'>
                                                    {player.words_solved.length > 0
                                                        ? player.words_solved.map(idx => `#${idx + 1}`).join(', ')
                                                        : 'None'}
                                                </p>
                                            </div>
                                            <div>
                                                <p className='text-tx-primary text-sm font-medium'>Wrong Guesses:</p>
                                                <p className='text-tx-secondary text-sm'>
                                                    {player.wrong_guesses.length > 0
                                                        ? player.wrong_guesses.join(', ')
                                                        : 'None'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    );
                })}

                <div className='flex justify-end'>
                    <Button variant='secondary' onClick={onClose}>
                        Close
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
