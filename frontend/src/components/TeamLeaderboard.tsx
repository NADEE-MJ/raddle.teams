import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { LeaderboardResponse } from '@/types';

interface TeamLeaderboardProps {
    lobbyId: number;
    refreshTrigger?: number;
}

export function TeamLeaderboard({ lobbyId, refreshTrigger = 0 }: TeamLeaderboardProps) {
    const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchLeaderboard() {
            try {
                setLoading(true);
                setError(null);
                const data = await api.tournament.getLeaderboard(lobbyId);
                setLeaderboard(data);
            } catch (err) {
                console.error('Failed to fetch leaderboard:', err);
                setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
            } finally {
                setLoading(false);
            }
        }

        fetchLeaderboard();
    }, [lobbyId, refreshTrigger]);

    if (loading) {
        return (
            <div className='border-border bg-secondary/70 rounded-xl border p-4 shadow-lg'>
                <h2 className='text-tx-primary mb-3 text-lg font-bold'>🏆 Tournament Leaderboard</h2>
                <p className='text-tx-muted text-sm'>Loading...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className='border-border bg-secondary/70 rounded-xl border p-4 shadow-lg'>
                <h2 className='text-tx-primary mb-3 text-lg font-bold'>🏆 Tournament Leaderboard</h2>
                <p className='text-sm text-red-600'>{error}</p>
            </div>
        );
    }

    if (!leaderboard || leaderboard.teams.length === 0) {
        return (
            <div className='border-border bg-secondary/70 rounded-xl border p-4 shadow-lg'>
                <h2 className='text-tx-primary mb-3 text-lg font-bold'>🏆 Tournament Leaderboard</h2>
                <p className='text-tx-muted text-sm'>No teams yet. Create teams to start the tournament!</p>
            </div>
        );
    }

    const getMedalEmoji = (index: number) => {
        switch (index) {
            case 0:
                return '🥇';
            case 1:
                return '🥈';
            case 2:
                return '🥉';
            default:
                return '';
        }
    };

    return (
        <div className='border-border bg-secondary/70 rounded-xl border p-4 shadow-lg'>
            <div className='mb-3 flex items-center justify-between'>
                <h2 className='text-tx-primary text-lg font-bold'>🏆 Tournament Leaderboard</h2>
                {leaderboard.current_round > 0 && (
                    <span className='text-tx-secondary text-sm'>Round {leaderboard.current_round}</span>
                )}
            </div>

            <div className='space-y-2'>
                {leaderboard.teams.map((team, index) => {
                    const medal = getMedalEmoji(index);

                    return (
                        <div
                            key={team.team_id}
                            className={`border-border flex items-center justify-between rounded-lg border p-3 transition-colors ${
                                team.last_round_winner
                                    ? 'bg-accent/10 border-accent'
                                    : index < 3
                                      ? 'bg-elevated'
                                      : 'bg-secondary'
                            }`}
                        >
                            <div className='flex items-center gap-3'>
                                <span className='text-tx-secondary w-8 text-center text-lg font-bold'>
                                    {index + 1}.
                                </span>
                                <div className='flex items-center gap-2'>
                                    {medal && <span className='text-xl'>{medal}</span>}
                                    {team.last_round_winner && <span className='text-xl'>👑</span>}
                                    <div className='text-tx-primary font-semibold'>{team.team_name}</div>
                                </div>
                            </div>

                            <div className='text-right'>
                                <div className='text-tx-primary text-sm font-semibold'>
                                    {team.total_points} {team.total_points === 1 ? 'pt' : 'pts'}
                                </div>
                                <div className='text-tx-muted text-xs'>
                                    ({team.placement_breakdown.first}-{team.placement_breakdown.second}-
                                    {team.placement_breakdown.third}-{team.placement_breakdown.dnf}) 1st-2nd-3rd-DNF
                                </div>
                                {team.rounds_won > 0 && (
                                    <div className='text-tx-muted text-xs'>
                                        {team.rounds_won} {team.rounds_won === 1 ? 'win' : 'wins'}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {leaderboard.current_round === 0 && (
                <p className='text-tx-muted mt-3 text-center text-sm'>No rounds played yet. Start a game to begin!</p>
            )}
        </div>
    );
}
