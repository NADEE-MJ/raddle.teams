/**
 * TeamLeaderboard component
 * Shows persistent tournament standings in lobby
 */

import React, { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { LeaderboardResponse } from '@/types';
import Card from './Card';

interface TeamLeaderboardProps {
    lobbyId: number;
    onViewRoundResults?: (gameId: number) => void;
    refreshTrigger?: number;
}

const TeamLeaderboard: React.FC<TeamLeaderboardProps> = ({ lobbyId, onViewRoundResults, refreshTrigger }) => {
    const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                setLoading(true);
                const data = await api.leaderboard.getLobbyLeaderboard(lobbyId);
                setLeaderboard(data);
                setError(null);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboard();
    }, [lobbyId, refreshTrigger]);

    if (loading) {
        return (
            <Card>
                <div className='py-4 text-center'>Loading leaderboard...</div>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <div className='py-4 text-center text-red-500'>Error: {error}</div>
            </Card>
        );
    }

    if (!leaderboard || leaderboard.teams.length === 0) {
        return (
            <Card>
                <div className='py-4 text-center'>No tournament data yet</div>
            </Card>
        );
    }

    const lastRoundWinner = leaderboard.teams.find(t => t.last_round_winner);

    return (
        <div className='space-y-4'>
            {/* Last Round Winner Card */}
            {lastRoundWinner && leaderboard.last_round_game_id && (
                <Card>
                    <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-2'>
                            <span className='text-2xl'>👑</span>
                            <div>
                                <div className='text-sm text-gray-500'>Last Round Winner</div>
                                <div className='text-lg font-bold'>{lastRoundWinner.team_name}</div>
                            </div>
                        </div>
                        {onViewRoundResults && (
                            <button
                                onClick={() => onViewRoundResults(leaderboard.last_round_game_id!)}
                                className='rounded bg-blue-500 px-3 py-1 text-sm text-white hover:bg-blue-600'
                            >
                                View Results
                            </button>
                        )}
                    </div>
                </Card>
            )}

            {/* Leaderboard */}
            <Card>
                <div className='space-y-3'>
                    <div className='flex items-center justify-between border-b pb-2'>
                        <h3 className='text-xl font-bold'>🏆 Tournament Leaderboard</h3>
                        <div className='text-sm text-gray-500'>Round {leaderboard.current_round}</div>
                    </div>

                    <div className='space-y-2'>
                        {leaderboard.teams.map((team, index) => (
                            <div
                                key={team.team_id}
                                className={`flex items-center justify-between rounded p-3 ${
                                    index === 0
                                        ? 'border-2 border-yellow-400 bg-yellow-50'
                                        : index === 1
                                          ? 'border-2 border-gray-400 bg-gray-50'
                                          : index === 2
                                            ? 'border-2 border-orange-400 bg-orange-50'
                                            : 'border border-gray-200 bg-gray-50'
                                }`}
                            >
                                <div className='flex flex-1 items-center gap-3'>
                                    <div className='w-8 text-center text-lg font-bold'>
                                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                                    </div>
                                    <div className='flex-1'>
                                        <div className='font-semibold'>{team.team_name}</div>
                                        <div className='text-xs text-gray-600'>
                                            ({team.placement_breakdown.first}-{team.placement_breakdown.second}-
                                            {team.placement_breakdown.third}-{team.placement_breakdown.dnf})
                                        </div>
                                    </div>
                                </div>
                                <div className='text-right'>
                                    <div className='text-lg font-bold'>{team.total_points} pts</div>
                                    <div className='text-xs text-gray-600'>{team.rounds_played} rounds</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className='border-t pt-2 text-xs text-gray-500'>
                        Format: (1st-2nd-3rd-DNF) across all rounds
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default TeamLeaderboard;
