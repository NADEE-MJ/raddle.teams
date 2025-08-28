import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlayer } from '../context/PlayerContext'
import { useGame } from '../context/GameContext'
import { useWebSocket } from '../hooks/useWebSocket'
import { apiService } from '../services/api'
import { Guess, WebSocketMessage } from '../types'

export default function GamePage() {
    const [guess, setGuess] = useState('')
    const [direction, setDirection] = useState<'forward' | 'backward'>('forward')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [recentGuesses, setRecentGuesses] = useState<Guess[]>([])

    const { player } = usePlayer()
    const { game, teamProgress, setTeamProgress } = useGame()
    const navigate = useNavigate()

    const { isConnected } = useWebSocket(
        player?.team_id || null,
        player?.session_id || null,
        {
            onMessage: handleWebSocketMessage,
            onConnect: () => console.log('Connected to team chat'),
            onDisconnect: () => console.log('Disconnected from team chat'),
        }
    )

    useEffect(() => {
        if (!player || !player.team_id) {
            navigate('/lobby')
            return
        }

        if (!game || game.state !== 'active') {
            navigate('/lobby')
            return
        }

        loadTeamProgress()
    }, [player, game, navigate])

    const loadTeamProgress = async () => {
        if (!player?.team_id) return

        try {
            const progress = await apiService.getTeamProgress(player.team_id)
            setTeamProgress(progress)
            setRecentGuesses(progress.recent_guesses || [])
        } catch (err) {
            setError('Failed to load team progress')
            console.error('Error loading team progress:', err)
        }
    }

    function handleWebSocketMessage(message: WebSocketMessage) {
        switch (message.type) {
            case 'new_guess':
                if (message.data) {
                    setRecentGuesses(prev => [message.data, ...prev.slice(0, 9)])
                    if (message.data.is_correct) {
                        loadTeamProgress() // Reload progress on correct guess
                    }
                }
                break
            case 'progress_update':
                if (message.data) {
                    setTeamProgress(message.data)
                }
                break
            case 'team_message':
                // Handle team chat messages if needed
                break
        }
    }

    const handleSubmitGuess = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!guess.trim() || !player?.session_id) return

        setLoading(true)
        setError('')

        try {
            const result = await apiService.submitGuess(
                player.session_id,
                guess.trim().toUpperCase(),
                direction
            )

            // Add to recent guesses immediately
            setRecentGuesses(prev => [result, ...prev.slice(0, 9)])

            // Clear the guess input
            setGuess('')

            // Reload progress if correct
            if (result.is_correct) {
                await loadTeamProgress()
            }
        } catch (err) {
            setError('Failed to submit guess')
            console.error('Error submitting guess:', err)
        } finally {
            setLoading(false)
        }
    }

    if (!teamProgress) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading game...</p>
                </div>
            </div>
        )
    }

    const currentClue = direction === 'forward' ? teamProgress.forward_clue : teamProgress.backward_clue
    const nextWordLength = direction === 'forward' ? teamProgress.forward_next_length : teamProgress.backward_next_length

    return (
        <div className="min-h-screen bg-gray-100 p-4">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-lg shadow-lg p-6">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                {teamProgress.team_name}
                            </h1>
                            <p className="text-gray-600">
                                Progress: {teamProgress.current_word_index + 1} / {teamProgress.total_words}
                            </p>
                        </div>
                        <div className="text-right">
                            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${isConnected
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'
                                    }`}></div>
                                {isConnected ? 'Connected' : 'Disconnected'}
                            </div>
                        </div>
                    </div>

                    {teamProgress.completed ? (
                        <div className="text-center py-8">
                            <div className="text-green-600 text-6xl mb-4">🎉</div>
                            <h2 className="text-3xl font-bold text-green-600 mb-2">
                                Puzzle Completed!
                            </h2>
                            <p className="text-gray-600">
                                Your team finished at {new Date(teamProgress.completed_at!).toLocaleTimeString()}
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Current Word */}
                            <div className="text-center mb-8">
                                <div className="text-4xl font-bold text-blue-600 mb-2">
                                    {teamProgress.current_word}
                                </div>
                                <div className="text-gray-600">
                                    Current word in the chain
                                </div>
                            </div>

                            {/* Direction Toggle */}
                            <div className="flex justify-center mb-6">
                                <div className="bg-gray-100 p-1 rounded-lg flex">
                                    <button
                                        onClick={() => setDirection('forward')}
                                        className={`px-4 py-2 rounded-md transition-colors ${direction === 'forward'
                                                ? 'bg-white text-blue-600 shadow-sm'
                                                : 'text-gray-600 hover:text-gray-900'
                                            }`}
                                    >
                                        Forward ➡️
                                    </button>
                                    <button
                                        onClick={() => setDirection('backward')}
                                        className={`px-4 py-2 rounded-md transition-colors ${direction === 'backward'
                                                ? 'bg-white text-blue-600 shadow-sm'
                                                : 'text-gray-600 hover:text-gray-900'
                                            }`}
                                    >
                                        ⬅️ Backward
                                    </button>
                                </div>
                            </div>

                            {/* Clue */}
                            {currentClue && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                                    <h3 className="font-semibold text-blue-900 mb-2">Clue:</h3>
                                    <p className="text-blue-800">{currentClue}</p>
                                    {nextWordLength && (
                                        <p className="text-blue-600 text-sm mt-2">
                                            Next word has {nextWordLength} letters
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Guess Form */}
                            <form onSubmit={handleSubmitGuess} className="mb-6">
                                <div className="flex space-x-2">
                                    <input
                                        type="text"
                                        value={guess}
                                        onChange={(e) => setGuess(e.target.value.toUpperCase())}
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Enter your guess..."
                                        disabled={loading}
                                        maxLength={50}
                                    />
                                    <button
                                        type="submit"
                                        disabled={loading || !guess.trim()}
                                        className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {loading ? 'Submitting...' : 'Submit'}
                                    </button>
                                </div>
                            </form>

                            {error && (
                                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
                                    {error}
                                </div>
                            )}

                            {/* Recent Guesses */}
                            <div>
                                <h3 className="font-semibold text-gray-900 mb-3">Recent Guesses</h3>
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {recentGuesses.length === 0 ? (
                                        <p className="text-gray-500 text-center py-4">No guesses yet</p>
                                    ) : (
                                        recentGuesses.map((g) => (
                                            <div
                                                key={g.id}
                                                className={`p-3 rounded-lg border ${g.is_correct
                                                        ? 'bg-green-50 border-green-200'
                                                        : 'bg-gray-50 border-gray-200'
                                                    }`}
                                            >
                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center space-x-2">
                                                        <span className="font-medium">{g.guess}</span>
                                                        <span className="text-sm text-gray-500">
                                                            ({g.direction})
                                                        </span>
                                                        {g.is_correct && (
                                                            <span className="text-green-600">✓</span>
                                                        )}
                                                    </div>
                                                    <span className="text-xs text-gray-400">
                                                        {new Date(g.submitted_at).toLocaleTimeString()}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
