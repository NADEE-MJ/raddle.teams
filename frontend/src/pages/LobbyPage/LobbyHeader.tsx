import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { Player, Lobby } from '@/types';

interface LobbyHeaderProps {
    lobby: Lobby;
    player: Player;
    sessionId: string;
    setSessionId: (sessionId: string | null) => void;
}

export default function LobbyHeader({ lobby, player, sessionId, setSessionId }: LobbyHeaderProps) {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLeave = async () => {
        if (!sessionId) return;

        try {
            setLoading(true);
            await api.player.lobby.leave(sessionId);
        } catch (err) {
            console.error('Failed to leave lobby on server:', err);
        }

        setSessionId(null);
        navigate('/');
    };

    return (
        <div className='mb-6 flex items-center justify-between'>
            <div>
                <h1 className='text-3xl font-bold text-gray-900 dark:text-ayu-text-primary'>{lobby.name}</h1>
                <p className='mt-1 text-gray-600 dark:text-ayu-text-secondary'>
                    Lobby Code: <span className='font-mono text-lg font-bold' data-testid="lobby-code">{lobby.code}</span>
                </p>
            </div>
            <div className='text-right'>
                <p className='mb-2 text-sm text-gray-600 dark:text-ayu-text-secondary'>Welcome, {player.name}!</p>
                <button
                    onClick={handleLeave}
                    disabled={loading}
                    className='rounded-lg bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 px-4 py-2 text-white transition duration-200 disabled:bg-red-400 dark:disabled:bg-red-600'
                    data-testid='leave-lobby-button'
                >
                    {loading ? 'Leaving...' : 'Leave Lobby'}
                </button>
            </div>
        </div>
    );
}
