import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Player, Team, Game, Puzzle, TeamProgress, GuessSubmissionRequest } from '@/types';
import { useGameContext } from '@/context/GameContext';
import GameLeaderboard from './GameLeaderboard';
import GameNotifications from './GameNotifications';
import GameProgress from './GameProgress';
import GameCompletion from './GameCompletion';

interface GameContentProps {
    gameId: string;
    player: Player;
    team: Team | null;
    game: Game;
    puzzle: Puzzle | null;
    teamProgress: TeamProgress | null;
}

export default function GameContent({ gameId, player, team, game, puzzle, teamProgress }: GameContentProps) {
    const navigate = useNavigate();
    const { submitGuess, isSubmittingGuess, leaderboard } = useGameContext();
    const [currentGuess, setCurrentGuess] = useState('');
    const [error, setError] = useState('');
    const [lastGuessResult, setLastGuessResult] = useState<string>('');
    const [notifications, setNotifications] = useState<Array<{
        id: string;
        type: 'success' | 'info' | 'warning';
        title: string;
        message: string;
        duration?: number;
    }>>([]);

    const addNotification = (notification: {
        type: 'success' | 'info' | 'warning';
        title: string;
        message: string;
        duration?: number;
    }) => {
        const id = Date.now().toString();
        setNotifications(prev => [...prev, { ...notification, id }]);
    };

    const dismissNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    // Add success notification when a correct guess is made
    useEffect(() => {
        if (lastGuessResult.startsWith('✅')) {
            addNotification({
                type: 'success',
                title: 'Correct!',
                message: 'Great guess! Your team made progress.',
                duration: 3000
            });
        }
    }, [lastGuessResult]);

    // Game state checks
    if (game.state !== 'active') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 p-4">
                <div className="mx-auto max-w-4xl">
                    <div className="rounded-lg bg-white p-8 shadow-xl">
                        <div className="text-center">
                            <h1 className="mb-4 text-3xl font-bold text-gray-900">
                                {game.state === 'lobby' && 'Waiting for Game Setup'}
                                {game.state === 'team_setup' && 'Setting Up Teams'}
                                {game.state === 'finished' && 'Game Completed'}
                            </h1>
                            <p className="mb-6 text-gray-600">
                                {game.state === 'lobby' && 'The admin is setting up the game. Please wait.'}
                                {game.state === 'team_setup' && 'Teams are being assigned. The game will start soon.'}
                                {game.state === 'finished' && 'This game has ended. Thanks for playing!'}
                            </p>
                            <button
                                onClick={() => navigate('/')}
                                className="rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700"
                            >
                                Back to Home
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!team) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-orange-500 to-red-600 p-4">
                <div className="mx-auto max-w-4xl">
                    <div className="rounded-lg bg-white p-8 shadow-xl">
                        <div className="text-center">
                            <h1 className="mb-4 text-3xl font-bold text-gray-900">Not Assigned to Team</h1>
                            <p className="mb-6 text-gray-600">
                                You haven&apos;t been assigned to a team yet. Please wait for the admin to assign you.
                            </p>
                            <button
                                onClick={() => navigate('/')}
                                className="rounded-lg bg-orange-600 px-6 py-3 text-white transition-colors hover:bg-orange-700"
                            >
                                Back to Home
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!puzzle) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-500 to-gray-600 p-4">
                <div className="mx-auto max-w-4xl">
                    <div className="rounded-lg bg-white p-8 shadow-xl">
                        <div className="text-center">
                            <h1 className="mb-4 text-3xl font-bold text-gray-900">Loading Puzzle...</h1>
                            <p className="mb-6 text-gray-600">
                                Please wait while the puzzle loads.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const currentWordIndex = teamProgress?.current_word_index || 0;
    const currentWord = puzzle.words.find(w => w.word_index === currentWordIndex);
    const isCompleted = teamProgress?.is_completed || false;
    const canGoForward = currentWordIndex < puzzle.total_words - 1;
    const canGoBackward = currentWordIndex > 0;

    const handleSubmitGuess = async (direction: 'forward' | 'backward') => {
        if (!currentGuess.trim() || isSubmittingGuess) return;

        const targetWordIndex = direction === 'forward' 
            ? currentWordIndex + 1 
            : currentWordIndex - 1;

        const guess: GuessSubmissionRequest = {
            word_index: targetWordIndex,
            direction,
            guess: currentGuess.trim().toLowerCase()
        };

        try {
            setError('');
            const result = await submitGuess(parseInt(gameId), guess);
            
            if (result.is_correct) {
                setLastGuessResult(`✅ Correct! "${result.correct_word}" was the right answer.`);
                setCurrentGuess('');
            } else {
                setLastGuessResult(`❌ "${currentGuess.trim()}" was incorrect. Try again!`);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to submit guess');
            setLastGuessResult('');
        }
    };

    return (
        <>
            <GameNotifications notifications={notifications} onDismiss={dismissNotification} />
            
            {/* Game Completion Modal */}
            {teamProgress?.is_completed && (
                <GameCompletion 
                    game={game}
                    currentTeam={team}
                    teamProgress={teamProgress}
                    leaderboard={leaderboard}
                    onPlayAgain={() => {
                        // Could implement play again logic here
                        navigate('/');
                    }}
                />
            )}
            
            <div className="min-h-screen bg-gradient-to-br from-green-500 to-blue-600 p-4">
                <div className="mx-auto max-w-6xl">
                {/* Game Header */}
                <div className="mb-6 rounded-lg bg-white p-6 shadow-xl">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                {puzzle.puzzle_name.charAt(0).toUpperCase() + puzzle.puzzle_name.slice(1)} Puzzle
                            </h1>
                            <p className="text-gray-600">Team: {team.name} | Player: {player.name}</p>
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-gray-600">Progress</div>
                            <div className="text-lg font-semibold">
                                {currentWordIndex + 1} / {puzzle.total_words}
                                {isCompleted && ' ✅'}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Main Game Area */}
                    <div className="lg:col-span-2">
                        <div className="rounded-lg bg-white p-6 shadow-xl">
                            <h2 className="mb-4 text-xl font-semibold">Word Chain</h2>
                            
                            {/* Word Chain Visualization */}
                            <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
                                {puzzle.words.map((word, index) => (
                                    <div key={word.word_index} className="flex items-center">
                                        <div
                                            className={`rounded-lg px-4 py-2 text-center ${
                                                index < currentWordIndex
                                                    ? 'bg-green-100 text-green-800'
                                                    : index === currentWordIndex
                                                    ? 'bg-blue-100 text-blue-800 ring-2 ring-blue-500'
                                                    : 'bg-gray-100 text-gray-600'
                                            }`}
                                        >
                                            <div className="text-sm font-medium">
                                                {index < currentWordIndex ? word.word : '???'}
                                            </div>
                                            <div className="text-xs text-gray-500">#{index + 1}</div>
                                        </div>
                                        {index < puzzle.words.length - 1 && (
                                            <div className="mx-1 text-gray-400">→</div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {!isCompleted && (
                                <>
                                    {/* Current Word Info */}
                                    {currentWord && (
                                        <div className="mb-6 rounded-lg bg-blue-50 p-4">
                                            <h3 className="mb-2 font-semibold text-blue-900">
                                                Current Position: #{currentWordIndex + 1}
                                            </h3>
                                            {currentWord.clue && (
                                                <p className="text-blue-800">
                                                    <strong>Clue:</strong> {currentWord.clue}
                                                </p>
                                            )}
                                            {currentWord.transform && (
                                                <p className="text-blue-700 text-sm mt-1">
                                                    <strong>Hint:</strong> {currentWord.transform}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* Guess Input */}
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Enter your guess:
                                            </label>
                                            <input
                                                type="text"
                                                value={currentGuess}
                                                onChange={(e) => setCurrentGuess(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && canGoForward) {
                                                        handleSubmitGuess('forward');
                                                    }
                                                }}
                                                placeholder="Type your guess here..."
                                                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-lg focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                disabled={isSubmittingGuess}
                                            />
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex space-x-3">
                                            <button
                                                onClick={() => handleSubmitGuess('backward')}
                                                disabled={!canGoBackward || !currentGuess.trim() || isSubmittingGuess}
                                                className="flex-1 rounded-lg bg-orange-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                {isSubmittingGuess ? 'Submitting...' : '← Guess Previous'}
                                            </button>
                                            <button
                                                onClick={() => handleSubmitGuess('forward')}
                                                disabled={!canGoForward || !currentGuess.trim() || isSubmittingGuess}
                                                className="flex-1 rounded-lg bg-green-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                {isSubmittingGuess ? 'Submitting...' : 'Guess Next →'}
                                            </button>
                                        </div>

                                        {/* Feedback Messages */}
                                        {error && (
                                            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-700">
                                                {error}
                                            </div>
                                        )}

                                        {lastGuessResult && (
                                            <div className={`rounded-lg border px-4 py-3 ${
                                                lastGuessResult.startsWith('✅')
                                                    ? 'bg-green-50 border-green-200 text-green-700'
                                                    : 'bg-yellow-50 border-yellow-200 text-yellow-700'
                                            }`}>
                                                {lastGuessResult}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            {isCompleted && (
                                <div className="rounded-lg bg-green-50 border border-green-200 p-6 text-center">
                                    <h3 className="text-2xl font-bold text-green-900 mb-2">🎉 Puzzle Complete!</h3>
                                    <p className="text-green-700 mb-4">
                                        Your team has successfully completed the word chain!
                                    </p>
                                    {teamProgress?.completed_at && (
                                        <p className="text-sm text-green-600">
                                            Completed at: {new Date(teamProgress.completed_at).toLocaleString()}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Enhanced Progress Visualization */}
                        <GameProgress puzzle={puzzle} teamProgress={teamProgress} showDetailedStats={true} />


                        {/* Leaderboard */}
                        <GameLeaderboard leaderboard={leaderboard} currentTeamId={team?.id} />

                        {/* Game Navigation */}
                        <div className="rounded-lg bg-white p-4 shadow-xl">
                            <h3 className="mb-3 text-lg font-semibold">Actions</h3>
                            <div className="space-y-2">
                                <button
                                    onClick={() => navigate('/')}
                                    className="w-full rounded-lg bg-gray-600 px-4 py-2 text-white transition-colors hover:bg-gray-700"
                                >
                                    Exit Game
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                </div>
            </div>
        </>
    );
}
