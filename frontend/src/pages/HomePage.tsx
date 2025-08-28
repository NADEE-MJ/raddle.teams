import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlayer } from '../context/PlayerContext'
import { apiService } from '../services/api'

export default function HomePage() {
    const [name, setName] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const { sessionId, setPlayer } = usePlayer()
    const navigate = useNavigate()

    const handleJoinGame = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) {
            setError('Please enter your name')
            return
        }

        setLoading(true)
        setError('')

        try {
            const player = await apiService.createPlayer(name.trim(), sessionId)
            setPlayer(player)
            navigate('/lobby')
        } catch (err) {
            setError('Failed to join game. Please try again.')
            console.error('Error creating player:', err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
            <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Raddle Teams</h1>
                    <p className="text-gray-600">Join the word chain challenge!</p>
                </div>

                <form onSubmit={handleJoinGame} className="space-y-6">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                            Your Name
                        </label>
                        <input
                            type="text"
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter your name"
                            disabled={loading}
                            maxLength={50}
                        />
                    </div>

                    {error && (
                        <div className="text-red-600 text-sm text-center">{error}</div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !name.trim()}
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {loading ? 'Joining...' : 'Join Game'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => navigate('/admin')}
                        className="text-sm text-gray-500 hover:text-gray-700 underline"
                    >
                        Admin Panel
                    </button>
                </div>
            </div>
        </div>
    )
}
