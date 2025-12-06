/**
 * RoundSummary component
 * Shows detailed round results for admin
 */

import React, { useEffect, useState } from 'react';
import Card from '../../components/Card';
import Button from '../../components/Button';

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
    placement: number;
    points_earned: number;
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
    onClose: () => void;
}

const formatTime = (seconds: number | null): string => {
    if (seconds === null) return 'DNF';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const RoundSummary: React.FC<RoundSummaryProps> = ({ gameId, onClose }) => {
    const [stats, setStats] = useState<GameStatsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedTeams, setExpandedTeams] = useState<Set<number>>(new Set());

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await fetch(`/api/stats/game/${gameId}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch game stats');
                }
                const data = await response.json();
                setStats(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [gameId]);

    const toggleTeam = (teamId: number) => {
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

    if (loading) {
        return (
            <div className='bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black'>
                <Card className='mx-4 w-full max-w-2xl'>
                    <div className='py-8 text-center'>Loading round results...</div>
                </Card>
            </div>
        );
    }

    if (error || !stats) {
        return (
            <div className='bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black'>
                <Card className='mx-4 w-full max-w-2xl'>
                    <div className='py-8 text-center text-red-500'>Error: {error || 'No data'}</div>
                    <div className='text-center'>
                        <Button onClick={onClose}>Close</Button>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className='bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black'>
            <div className='mx-4 my-8 w-full max-w-4xl'>
                <Card className='space-y-4'>
                    {/* Header */}
                    <div className='flex items-center justify-between border-b pb-3'>
                        <div>
                            <h2 className='text-2xl font-bold'>Round {stats.round_number} Results</h2>
                            <p className='text-sm text-gray-500'>
                                Started: {new Date(stats.started_at).toLocaleString()}
                            </p>
                        </div>
                        <Button onClick={onClose} variant='secondary'>
                            Close
                        </Button>
                    </div>

                    {/* Team Rankings Table */}
                    <div className='space-y-2'>
                        <h3 className='text-lg font-bold'>Team Rankings</h3>
                        <div className='overflow-x-auto'>
                            <table className='w-full border-collapse'>
                                <thead>
                                    <tr className='bg-gray-100'>
                                        <th className='border p-2 text-left'>Rank</th>
                                        <th className='border p-2 text-left'>Team</th>
                                        <th className='border p-2 text-center'>Points</th>
                                        <th className='border p-2 text-center'>Time</th>
                                        <th className='border p-2 text-center'>Completion</th>
                                        <th className='border p-2 text-left'>Wrong Guesses</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.teams.map(team => (
                                        <tr
                                            key={team.team_id}
                                            className={`${
                                                team.placement === 1
                                                    ? 'bg-yellow-50'
                                                    : team.placement === 2
                                                      ? 'bg-gray-50'
                                                      : team.placement === 3
                                                        ? 'bg-orange-50'
                                                        : ''
                                            } cursor-pointer hover:bg-blue-50`}
                                            onClick={() => toggleTeam(team.team_id)}
                                        >
                                            <td className='border p-2'>
                                                {team.placement === 1
                                                    ? '🥇'
                                                    : team.placement === 2
                                                      ? '🥈'
                                                      : team.placement === 3
                                                        ? '🥉'
                                                        : team.placement}
                                            </td>
                                            <td className='border p-2 font-semibold'>
                                                {team.team_name}
                                                {stats.last_round_winner_id === team.team_id && ' 👑'}
                                            </td>
                                            <td className='border p-2 text-center'>{team.points_earned}</td>
                                            <td className='border p-2 text-center'>
                                                {formatTime(team.time_to_complete)}
                                            </td>
                                            <td className='border p-2 text-center'>
                                                {(team.completion_percentage * 100).toFixed(0)}%
                                            </td>
                                            <td className='border p-2'>
                                                {team.wrong_guess_label} ({team.wrong_guesses})
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Expandable Team Details */}
                    {stats.teams.map(team =>
                        expandedTeams.has(team.team_id) ? (
                            <Card key={`details-${team.team_id}`} className='bg-gray-50'>
                                <h4 className='mb-3 text-lg font-bold'>{team.team_name} - Player Breakdown</h4>
                                <div className='space-y-3'>
                                    {team.player_stats.map(player => (
                                        <div key={player.player_id} className='rounded border bg-white p-3'>
                                            <div className='mb-2 flex items-start justify-between'>
                                                <div>
                                                    <div className='font-semibold'>{player.player_name}</div>
                                                    <div className='text-sm text-gray-600'>
                                                        {player.correct_guesses}/{player.total_guesses} correct (
                                                        {(player.accuracy_rate * 100).toFixed(0)}% accuracy)
                                                    </div>
                                                </div>
                                                <div className='flex gap-1'>
                                                    {player.awards.map(award => (
                                                        <span
                                                            key={award.key}
                                                            title={`${award.title}: ${award.description}`}
                                                            className='text-xl'
                                                        >
                                                            {award.emoji}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            {player.words_solved.length > 0 && (
                                                <div className='text-sm'>
                                                    <span className='font-medium'>Words Solved:</span>{' '}
                                                    {player.words_solved.join(', ')}
                                                </div>
                                            )}
                                            {player.wrong_guesses.length > 0 && (
                                                <div className='text-sm text-red-600'>
                                                    <span className='font-medium'>Wrong Guesses:</span>{' '}
                                                    {player.wrong_guesses.join(', ')}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        ) : null
                    )}

                    {/* Footer */}
                    <div className='border-t pt-3 text-center'>
                        <Button onClick={onClose}>Close</Button>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default RoundSummary;
