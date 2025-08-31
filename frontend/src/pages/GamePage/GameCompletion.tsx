import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Game, TeamProgress, LeaderboardEntry, Team } from '@/types';

interface GameCompletionProps {
    game: Game;
    currentTeam: Team | null;
    teamProgress: TeamProgress | null;
    leaderboard: LeaderboardEntry[];
    onPlayAgain?: () => void;
}

export default function GameCompletion({ 
    game, 
    currentTeam, 
    teamProgress, 
    leaderboard,
    onPlayAgain 
}: GameCompletionProps) {
    const navigate = useNavigate();
    const [showConfetti, setShowConfetti] = useState(false);
    const [currentTeamRank, setCurrentTeamRank] = useState<number | null>(null);
    
    const isTeamCompleted = teamProgress?.is_completed || false;
    const isGameFinished = game.state === 'finished';
    const winnerEntry = leaderboard.find(entry => entry.rank === 1 && entry.is_completed);
    const isWinner = currentTeam && winnerEntry?.team_id === currentTeam.id;

    useEffect(() => {
        if (isTeamCompleted && currentTeam) {
            const teamEntry = leaderboard.find(entry => entry.team_id === currentTeam.id);
            setCurrentTeamRank(teamEntry?.rank || null);
            
            // Show confetti for top 3 teams
            if (teamEntry?.rank && teamEntry.rank <= 3) {
                setShowConfetti(true);
                setTimeout(() => setShowConfetti(false), 5000);
            }
        }
    }, [isTeamCompleted, currentTeam, leaderboard]);

    if (!isTeamCompleted && !isGameFinished) {
        return null;
    }

    const getCompletionMessage = () => {
        if (isGameFinished) {
            if (isWinner) {
                return {
                    title: '🏆 Congratulations!',
                    subtitle: 'Your team won the game!',
                    message: `Amazing work! You completed the puzzle first and claimed victory.`,
                    bgColor: 'bg-gradient-to-br from-yellow-400 to-orange-500',
                    textColor: 'text-white'
                };
            } else if (isTeamCompleted) {
                return {
                    title: '🎉 Well Done!',
                    subtitle: `You finished in ${currentTeamRank ? `${currentTeamRank}${getRankSuffix(currentTeamRank)} place` : 'the game'}!`,
                    message: 'Great teamwork! You successfully completed the word chain puzzle.',
                    bgColor: 'bg-gradient-to-br from-green-500 to-blue-500',
                    textColor: 'text-white'
                };
            } else {
                return {
                    title: '⏰ Game Over',
                    subtitle: 'The game has ended',
                    message: 'Thanks for playing! Better luck next time.',
                    bgColor: 'bg-gradient-to-br from-gray-500 to-gray-600',
                    textColor: 'text-white'
                };
            }
        } else {
            return {
                title: '🎯 Puzzle Complete!',
                subtitle: 'Your team finished the word chain!',
                message: 'Excellent work! You solved all the words. Waiting for other teams to finish...',
                bgColor: 'bg-gradient-to-br from-green-500 to-blue-500',
                textColor: 'text-white'
            };
        }
    };

    const getRankSuffix = (rank: number) => {
        if (rank === 1) return 'st';
        if (rank === 2) return 'nd';
        if (rank === 3) return 'rd';
        return 'th';
    };

    const getCompletionStats = () => {
        if (!teamProgress) return null;

        const completionTime = teamProgress.completed_at 
            ? new Date(teamProgress.completed_at).toLocaleString()
            : null;
        
        const totalGuesses = teamProgress.recent_guesses?.length || 0;
        const correctGuesses = teamProgress.recent_guesses?.filter(g => g.is_correct).length || 0;
        const accuracy = totalGuesses > 0 ? Math.round((correctGuesses / totalGuesses) * 100) : 0;

        return {
            completionTime,
            totalGuesses,
            correctGuesses,
            accuracy
        };
    };

    const completionInfo = getCompletionMessage();
    const stats = getCompletionStats();

    return (
        <>
            {showConfetti && (
                <div className="fixed inset-0 pointer-events-none z-50">
                    <div className="absolute inset-0 overflow-hidden">
                        {[...Array(50)].map((_, i) => (
                            <div
                                key={i}
                                className="absolute animate-bounce"
                                style={{
                                    left: `${Math.random() * 100}%`,
                                    top: `${Math.random() * 100}%`,
                                    animationDelay: `${Math.random() * 2}s`,
                                    animationDuration: `${2 + Math.random() * 3}s`,
                                }}
                            >
                                <span className="text-2xl">
                                    {['🎉', '🎊', '⭐', '🏆', '🎈'][Math.floor(Math.random() * 5)]}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-40">
                <div className={`${completionInfo.bgColor} rounded-2xl p-8 max-w-2xl w-full mx-auto shadow-2xl transform transition-all duration-500 scale-100`}>
                    <div className={`text-center ${completionInfo.textColor}`}>
                        {/* Header */}
                        <div className="mb-6">
                            <h1 className="text-4xl font-bold mb-2">{completionInfo.title}</h1>
                            <h2 className="text-xl opacity-90">{completionInfo.subtitle}</h2>
                        </div>

                        {/* Message */}
                        <p className="text-lg mb-8 opacity-90">
                            {completionInfo.message}
                        </p>

                        {/* Stats */}
                        {stats && (
                            <div className="bg-white bg-opacity-20 rounded-xl p-6 mb-8">
                                <h3 className="text-lg font-semibold mb-4">Game Statistics</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    {stats.completionTime && (
                                        <div>
                                            <div className="text-2xl font-bold">{stats.completionTime}</div>
                                            <div className="opacity-80">Completed At</div>
                                        </div>
                                    )}
                                    <div>
                                        <div className="text-2xl font-bold">{stats.totalGuesses}</div>
                                        <div className="opacity-80">Total Guesses</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold">{stats.correctGuesses}</div>
                                        <div className="opacity-80">Correct Guesses</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold">{stats.accuracy}%</div>
                                        <div className="opacity-80">Accuracy</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Leaderboard */}
                        {isGameFinished && leaderboard.length > 0 && (
                            <div className="bg-white bg-opacity-20 rounded-xl p-6 mb-8">
                                <h3 className="text-lg font-semibold mb-4">Final Rankings</h3>
                                <div className="space-y-2">
                                    {leaderboard.slice(0, 5).map((entry) => (
                                        <div 
                                            key={entry.team_id} 
                                            className={`flex items-center justify-between p-3 rounded-lg ${
                                                entry.team_id === currentTeam?.id 
                                                    ? 'bg-white bg-opacity-40' 
                                                    : 'bg-white bg-opacity-20'
                                            }`}
                                        >
                                            <div className="flex items-center space-x-3">
                                                <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                                                    entry.rank === 1 ? 'bg-yellow-400 text-yellow-900' :
                                                    entry.rank === 2 ? 'bg-gray-300 text-gray-800' :
                                                    entry.rank === 3 ? 'bg-amber-600 text-white' :
                                                    'bg-white bg-opacity-30'
                                                }`}>
                                                    {entry.rank}
                                                </span>
                                                <span className="font-medium">
                                                    {entry.team_name}
                                                    {entry.team_id === currentTeam?.id && ' (You)'}
                                                </span>
                                            </div>
                                            <div className="text-sm opacity-80">
                                                {entry.is_completed ? (
                                                    <>✅ Completed</>
                                                ) : (
                                                    <>Word {entry.current_word_index}</>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            {onPlayAgain && isGameFinished && (
                                <button
                                    onClick={onPlayAgain}
                                    className="px-8 py-3 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg font-semibold transition-colors"
                                >
                                    Play Again
                                </button>
                            )}
                            <button
                                onClick={() => navigate('/')}
                                className="px-8 py-3 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg font-semibold transition-colors"
                            >
                                Return Home
                            </button>
                            {!isGameFinished && (
                                <button
                                    onClick={() => {/* Close modal but stay on game page */}}
                                    className="px-8 py-3 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg font-semibold transition-colors"
                                >
                                    Continue Watching
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}