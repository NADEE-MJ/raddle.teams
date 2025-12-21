import { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { Card, Button, Modal } from '@/components';

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

export function RoundSummary({ gameId, adminToken, onClose }: RoundSummaryProps) {
    const [stats, setStats] = useState<GameStatsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedTeams, setExpandedTeams] = useState<Set<number>>(new Set());

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
                    {/* Header */}
                    <div className='border-border flex items-center justify-between border-b px-6 pt-2 pb-4'>
                        <div>
                            <h2 className='text-tx-primary text-2xl font-bold'>Round {stats.round_number} Summary</h2>
                            <p className='text-tx-muted text-sm'>
                                Game ID: {stats.game_id} • Started: {new Date(stats.started_at).toLocaleString()}
                            </p>
                        </div>
                        <Button onClick={onClose} variant='secondary'>
                            Close
                        </Button>
                    </div>

                    {/* Content */}
                    <div className='flex-1 overflow-y-auto px-6 pt-4 pb-6'>
                        {/* Team Rankings Table */}
                        <div className='mb-6'>
                            <h3 className='text-tx-primary mb-3 text-lg font-semibold'>Team Rankings</h3>
                            <div className='border-border overflow-hidden rounded-lg border'>
                                <table className='w-full'>
                                    <thead className='bg-elevated'>
                                        <tr>
                                            <th className='text-tx-secondary p-3 text-left text-xs font-semibold uppercase'>
                                                Rank
                                            </th>
                                            <th className='text-tx-secondary p-3 text-left text-xs font-semibold uppercase'>
                                                Team
                                            </th>
                                            <th className='text-tx-secondary p-3 text-right text-xs font-semibold uppercase'>
                                                Points
                                            </th>
                                            <th className='text-tx-secondary p-3 text-right text-xs font-semibold uppercase'>
                                                Time
                                            </th>
                                            <th className='text-tx-secondary p-3 text-right text-xs font-semibold uppercase'>
                                                Completion
                                            </th>
                                            <th className='text-tx-secondary p-3 text-right text-xs font-semibold uppercase'>
                                                Wrong Guesses
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stats.teams
                                            .sort((a, b) => (a.placement || 999) - (b.placement || 999))
                                            .map(team => (
                                                <tr
                                                    key={team.team_id}
                                                    className='border-border hover:bg-elevated/50 cursor-pointer border-t'
                                                    onClick={() => toggleTeamExpanded(team.team_id)}
                                                >
                                                    <td className='text-tx-primary p-3 font-semibold'>
                                                        {getPlacementBadge(team.placement)}
                                                    </td>
                                                    <td className='text-tx-primary p-3'>
                                                        {team.team_name}
                                                        {team.team_id === stats.last_round_winner_id && (
                                                            <span className='ml-2'>👑</span>
                                                        )}
                                                    </td>
                                                    <td className='text-tx-primary p-3 text-right font-semibold'>
                                                        {team.points_earned ?? '-'}
                                                    </td>
                                                    <td className='text-tx-primary p-3 text-right'>
                                                        {formatTime(team.time_to_complete)}
                                                    </td>
                                                    <td className='text-tx-primary p-3 text-right'>
                                                        {(team.completion_percentage * 100).toFixed(0)}%
                                                    </td>
                                                    <td className='text-tx-primary p-3 text-right'>
                                                        {team.wrong_guesses}{' '}
                                                        <span className='text-tx-muted text-xs'>
                                                            ({team.wrong_guess_label})
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Expandable Team Details */}
                        {stats.teams
                            .sort((a, b) => (a.placement || 999) - (b.placement || 999))
                            .map(team => (
                                <div key={team.team_id} className='mb-4'>
                                    {expandedTeams.has(team.team_id) && (
                                        <Card className='bg-elevated/50'>
                                            <div className='mb-4'>
                                                <h4 className='text-tx-primary text-lg font-semibold'>
                                                    {team.team_name} - Player Breakdown
                                                </h4>
                                            </div>

                                            <div className='space-y-3'>
                                                {team.player_stats.map(player => (
                                                    <div
                                                        key={player.player_id}
                                                        className='border-border rounded-lg border p-4'
                                                    >
                                                        <div className='mb-2 flex items-start justify-between'>
                                                            <div>
                                                                <div className='text-tx-primary font-semibold'>
                                                                    {player.player_name}
                                                                </div>
                                                                <div className='text-tx-muted text-sm'>
                                                                    {player.correct_guesses}/{player.total_guesses}{' '}
                                                                    correct ({(player.accuracy_rate * 100).toFixed(0)}%
                                                                    accuracy)
                                                                </div>
                                                            </div>
                                                            {player.awards.length > 0 && (
                                                                <div className='flex flex-wrap gap-1'>
                                                                    {player.awards.map(award => (
                                                                        <span
                                                                            key={award.key}
                                                                            className='bg-elevated rounded px-2 py-1 text-xs'
                                                                            title={award.description}
                                                                        >
                                                                            {award.emoji} {award.title}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {player.words_solved.length > 0 && (
                                                            <div className='text-tx-muted mb-1 text-sm'>
                                                                <span className='font-semibold'>Words solved:</span>{' '}
                                                                {player.words_solved.join(', ')}
                                                            </div>
                                                        )}

                                                        {player.wrong_guesses.length > 0 && (
                                                            <div className='text-tx-muted text-sm'>
                                                                <span className='font-semibold'>Wrong guesses:</span>{' '}
                                                                {player.wrong_guesses.join(', ')}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </Card>
                                    )}
                                </div>
                            ))}
                    </div>
                </div>
            )}
        </Modal>
    );
}
