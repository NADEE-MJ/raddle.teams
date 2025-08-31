import { LeaderboardEntry } from '@/types';

interface GameLeaderboardProps {
    leaderboard: LeaderboardEntry[];
    currentTeamId?: number;
}

export default function GameLeaderboard({ leaderboard, currentTeamId }: GameLeaderboardProps) {
    if (leaderboard.length === 0) {
        return (
            <div className="rounded-lg bg-white p-4 shadow-xl">
                <h3 className="mb-3 text-lg font-semibold">Leaderboard</h3>
                <p className="text-gray-500 text-sm">No teams have made progress yet.</p>
            </div>
        );
    }

    return (
        <div className="rounded-lg bg-white p-4 shadow-xl">
            <h3 className="mb-3 text-lg font-semibold">Leaderboard</h3>
            <div className="space-y-2">
                {leaderboard.map((entry) => (
                    <div
                        key={entry.team_id}
                        className={`rounded border p-3 transition-colors ${
                            entry.team_id === currentTeamId
                                ? 'bg-blue-50 border-blue-200'
                                : 'bg-gray-50 border-gray-200'
                        }`}
                    >
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center space-x-2">
                                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                                    entry.rank === 1 ? 'bg-yellow-500 text-white' :
                                    entry.rank === 2 ? 'bg-gray-400 text-white' :
                                    entry.rank === 3 ? 'bg-amber-600 text-white' :
                                    'bg-gray-300 text-gray-700'
                                }`}>
                                    {entry.rank}
                                </span>
                                <span className={`font-medium ${
                                    entry.team_id === currentTeamId ? 'text-blue-900' : 'text-gray-900'
                                }`}>
                                    {entry.team_name}
                                    {entry.team_id === currentTeamId && ' (You)'}
                                </span>
                                {entry.is_completed && (
                                    <span className="text-green-600 text-sm">✅</span>
                                )}
                            </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm text-gray-600">
                            <span>
                                Progress: {entry.current_word_index}/∞
                            </span>
                            <span>
                                {entry.player_count} player{entry.player_count !== 1 ? 's' : ''}
                            </span>
                        </div>
                        
                        {entry.completed_at && (
                            <div className="text-xs text-green-600 mt-1">
                                Completed: {new Date(entry.completed_at).toLocaleTimeString()}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}