import { Puzzle, TeamProgress } from '@/types';
import ProgressRing from './ProgressRing';

interface GameProgressProps {
    puzzle: Puzzle;
    teamProgress: TeamProgress | null;
    showDetailedStats?: boolean;
}

export default function GameProgress({ puzzle, teamProgress, showDetailedStats = false }: GameProgressProps) {
    const currentWordIndex = teamProgress?.current_word_index || 0;
    const isCompleted = teamProgress?.is_completed || false;
    const completionPercentage = puzzle.total_words > 0 
        ? Math.round((currentWordIndex / puzzle.total_words) * 100) 
        : 0;

    const getWordStatus = (index: number) => {
        if (index < currentWordIndex) return 'completed';
        if (index === currentWordIndex) return 'current';
        return 'upcoming';
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-green-500';
            case 'current': return 'bg-blue-500';
            default: return 'bg-gray-300';
        }
    };

    const getTextColor = (status: string) => {
        switch (status) {
            case 'completed': return 'text-green-800';
            case 'current': return 'text-blue-800';
            default: return 'text-gray-600';
        }
    };

    return (
        <div className="space-y-6">
            {/* Overall Progress */}
            <div className="rounded-lg bg-white p-4 shadow-xl">
                <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Progress Overview</h3>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        isCompleted 
                            ? 'bg-green-100 text-green-800'
                            : completionPercentage > 75 
                            ? 'bg-yellow-100 text-yellow-800'
                            : completionPercentage > 25
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                    }`}>
                        {isCompleted ? 'Complete!' : `${completionPercentage}%`}
                    </span>
                </div>

                {/* Progress Ring and Bar */}
                <div className="mb-4 flex items-center space-x-4">
                    <ProgressRing percentage={isCompleted ? 100 : completionPercentage} size={80} />
                    <div className="flex-1">
                        <div className="flex justify-between text-sm text-gray-600 mb-2">
                            <span>Word {currentWordIndex + 1}</span>
                            <span>{puzzle.total_words} words total</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                                className={`h-3 rounded-full transition-all duration-500 ${
                                    isCompleted 
                                        ? 'bg-green-500' 
                                        : 'bg-gradient-to-r from-blue-500 to-purple-500'
                                }`}
                                style={{
                                    width: `${isCompleted ? 100 : completionPercentage}%`
                                }}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* Completion Status */}
                {isCompleted && teamProgress?.completed_at && (
                    <div className="rounded-lg bg-green-50 border border-green-200 p-3">
                        <div className="text-center">
                            <div className="text-2xl mb-1">🏆</div>
                            <div className="font-semibold text-green-900">Puzzle Complete!</div>
                            <div className="text-sm text-green-700">
                                Finished at {new Date(teamProgress.completed_at).toLocaleString()}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Detailed Word Progress */}
            <div className="rounded-lg bg-white p-4 shadow-xl">
                <h3 className="mb-3 text-lg font-semibold">Word Chain Progress</h3>
                
                {/* Compact Progress Dots */}
                <div className="mb-4 flex flex-wrap justify-center gap-2">
                    {puzzle.words.map((word, index) => {
                        const status = getWordStatus(index);
                        return (
                            <div key={word.word_index} className="flex flex-col items-center">
                                <div
                                    className={`w-4 h-4 rounded-full transition-all duration-300 ${getStatusColor(status)} ${
                                        status === 'current' ? 'ring-2 ring-blue-300 ring-offset-2' : ''
                                    }`}
                                    title={`Word ${index + 1}${status === 'completed' ? `: ${word.word}` : ''}`}
                                />
                                <div className={`text-xs mt-1 ${getTextColor(status)}`}>
                                    {index + 1}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {showDetailedStats && (
                    <>
                        {/* Detailed Stats */}
                        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-green-600">
                                    {currentWordIndex}
                                </div>
                                <div className="text-sm text-gray-600">Words Solved</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-blue-600">
                                    {puzzle.total_words - currentWordIndex}
                                </div>
                                <div className="text-sm text-gray-600">Words Remaining</div>
                            </div>
                        </div>

                        {/* Recent Activity */}
                        {teamProgress?.recent_guesses && teamProgress.recent_guesses.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                                <h4 className="font-medium text-gray-900 mb-2">Recent Activity</h4>
                                <div className="space-y-1">
                                    {teamProgress.recent_guesses.slice(0, 3).map((guess) => (
                                        <div
                                            key={guess.id}
                                            className={`text-xs p-2 rounded ${
                                                guess.is_correct
                                                    ? 'bg-green-50 text-green-700'
                                                    : 'bg-red-50 text-red-700'
                                            }`}
                                        >
                                            <span className="font-medium">
                                                {guess.is_correct ? '✅' : '❌'} {guess.guess}
                                            </span>
                                            <span className="text-gray-500 ml-2">
                                                by {guess.player_name}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Time-based Stats (if available) */}
            {teamProgress && (
                <div className="rounded-lg bg-white p-4 shadow-xl">
                    <h3 className="mb-3 text-lg font-semibold">Performance</h3>
                    <div className="grid grid-cols-1 gap-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Total Guesses:</span>
                            <span className="font-medium">
                                {teamProgress.recent_guesses?.length || 0}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Correct Guesses:</span>
                            <span className="font-medium text-green-600">
                                {teamProgress.recent_guesses?.filter(g => g.is_correct).length || 0}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Success Rate:</span>
                            <span className="font-medium">
                                {teamProgress.recent_guesses?.length 
                                    ? Math.round((teamProgress.recent_guesses.filter(g => g.is_correct).length / teamProgress.recent_guesses.length) * 100)
                                    : 0}%
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}