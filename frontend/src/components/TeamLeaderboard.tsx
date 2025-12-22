import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { Button, Card } from '@/components';

interface PlacementBreakdown {
    first: number;
    second: number;
    third: number;
    dnf: number;
}

interface TeamLeaderboardEntry {
    team_id: number;
    team_name: string;
    total_points: number;
    rounds_won: number;
    rounds_played: number;
    placement_breakdown: PlacementBreakdown;
    last_round_winner: boolean;
}

interface LeaderboardResponse {
    teams: TeamLeaderboardEntry[];
    current_round: number;
    total_rounds: number;
    last_round_game_id: number | null;
}

interface TeamLeaderboardProps {
    lobbyId: number;
    sessionId?: string;
    adminToken?: string;
    onViewLastRound?: (gameId: number) => void;
    refreshKey?: number;
}

export function TeamLeaderboard({ lobbyId, sessionId, adminToken, onViewLastRound, refreshKey }: TeamLeaderboardProps) {
    const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const isAdminView = Boolean(adminToken);

    useEffect(() => {
        fetchLeaderboard();
    }, [lobbyId, refreshKey]);

    const fetchLeaderboard = async () => {
        try {
            setError(null);
            let data;
            if (adminToken) {
                data = await api.admin.lobby.getLeaderboard(lobbyId, adminToken);
            } else if (sessionId) {
                data = await api.player.lobby.getLeaderboard(lobbyId, sessionId);
            } else {
                throw new Error('Either sessionId or adminToken is required');
            }
            setLeaderboard(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Card className='bg-elevated/70 shadow-lg'>
                <div className='text-tx-muted text-center'>Loading leaderboard...</div>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className='bg-elevated/70 shadow-lg'>
                <div className='text-red text-center'>{error}</div>
            </Card>
        );
    }

    if (!leaderboard || leaderboard.teams.length === 0) {
        return null; // Don't show leaderboard if no rounds have been played
    }

    const lastRoundWinner = leaderboard.teams.find(t => t.last_round_winner);

    return (
        <div className='space-y-4'>
            {/* Last Round Winner Card */}
            {lastRoundWinner && (
                <Card className='bg-gradient-to-r from-yellow-900/20 to-yellow-800/20 shadow-lg'>
                    <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-3'>
                            <div className='text-3xl' aria-label='Winner crown'>
                                👑
                            </div>
                            <div>
                                <div className='text-tx-secondary text-xs font-semibold tracking-wide uppercase'>
                                    Last Round Winner
                                </div>
                                <p className='text-tx-primary text-lg font-semibold'>{lastRoundWinner.team_name}</p>
                            </div>
                        </div>
                        {onViewLastRound && leaderboard.last_round_game_id && (
                            <Button
                                onClick={() => onViewLastRound(leaderboard.last_round_game_id!)}
                                variant='secondary'
                                size='sm'
                            >
                                View Results
                            </Button>
                        )}
                    </div>
                </Card>
            )}

            {/* Leaderboard Card */}
            <Card className='bg-elevated/70 shadow-lg'>
                <div className='mb-4 flex items-center justify-between'>
                    <div>
                        <h2 className='text-tx-primary flex items-center gap-2 text-xl font-bold'>
                            <span>🏆</span>
                            <span>Tournament Leaderboard</span>
                        </h2>
                        <p className='text-tx-muted text-sm'>
                            Round {leaderboard.current_round} of {leaderboard.total_rounds}
                        </p>
                    </div>
                </div>

                <div className='space-y-2'>
                    {leaderboard.teams.map((team, index) => {
                        const medals = ['🥇', '🥈', '🥉'];
                        const medal = medals[index] || null;

                        return (
                            <div
                                key={team.team_id}
                                className={`border-border/50 flex items-center justify-between rounded-lg border p-3 ${
                                    isAdminView ? 'hover:bg-elevated/30 transition-colors' : ''
                                } ${
                                    index === 0
                                        ? 'bg-yellow-500/15'
                                        : index === 1
                                          ? 'bg-slate-300/10'
                                          : index === 2
                                            ? 'bg-orange-500/15'
                                            : ''
                                }`}
                            >
                                <div className='flex items-center gap-3'>
                                    <div className='text-tx-muted flex w-8 items-center justify-center text-lg font-bold'>
                                        {medal || `${index + 1}.`}
                                    </div>
                                    <div>
                                        <div className='text-tx-primary font-semibold'>{team.team_name}</div>
                                    </div>
                                </div>
                                <div className='text-right'>
                                    <div className='text-tx-primary text-lg font-bold'>{team.total_points} pts</div>
                                    {isAdminView && (
                                        <div className='text-tx-muted text-xs'>
                                            {team.rounds_played} {team.rounds_played === 1 ? 'round' : 'rounds'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Card>
        </div>
    );
}
