import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';

interface JoinFormProps {
    loading: boolean;
    setLoading: (loading: boolean) => void;
}

export default function JoinForm({ loading, setLoading }: JoinFormProps) {
    const [name, setName] = useState('');
    const [lobbyCode, setLobbyCode] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleTutorial = () => {
        // For now, redirect to a tutorial lobby or create a special tutorial flow
        navigate('/tutorial');
    };

    const handleJoinLobby = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            setError('Please enter your name');
            return;
        }
        if (!lobbyCode.trim()) {
            setError('Please enter a lobby code');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const player = await api.player.lobby.join(lobbyCode.trim().toUpperCase(), name.trim());
            localStorage.setItem('raddle_session_id', player.session_id);
            navigate(`/lobby/${lobbyCode.trim().toUpperCase()}`);
        } catch (err) {
            setError('Failed to join lobby. Please check the lobby code and try again.');
            console.error('Error joining lobby:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className='space-y-6'>
            {/* Tutorial Button */}
            <button
                onClick={handleTutorial}
                className='w-full rounded-lg bg-blue-600 px-4 py-3 text-white font-medium transition duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
            >
                Play tutorial
            </button>

            <div className='relative'>
                <div className='absolute inset-0 flex items-center'>
                    <div className='w-full border-t border-gray-300' />
                </div>
                <div className='relative flex justify-center text-sm'>
                    <span className='bg-white px-2 text-gray-500'>Or skip it and go straight to multiplayer</span>
                </div>
            </div>

            {/* Join Lobby Form */}
            <form onSubmit={handleJoinLobby} className='space-y-4'>
                <div>
                    <label htmlFor='name' className='mb-2 block text-sm font-medium text-gray-700'>
                        Your Name
                    </label>
                    <input
                        type='text'
                        id='name'
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className='w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none'
                        placeholder='Enter your name'
                        disabled={loading}
                    />
                </div>

                <div>
                    <label htmlFor='lobbyCode' className='mb-2 block text-sm font-medium text-gray-700'>
                        Lobby Code
                    </label>
                    <input
                        type='text'
                        id='lobbyCode'
                        value={lobbyCode}
                        onChange={e => setLobbyCode(e.target.value.toUpperCase())}
                        className='w-full rounded-lg border border-gray-300 px-3 py-2 uppercase shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none'
                        placeholder='ABCDEF'
                        maxLength={6}
                        disabled={loading}
                    />
                </div>

                {error && <div className='text-center text-sm text-red-600'>{error}</div>}

                <button
                    type='submit'
                    disabled={loading}
                    className='w-full rounded-lg bg-green-600 px-4 py-3 font-medium text-white transition duration-200 hover:bg-green-700 disabled:bg-green-400'
                >
                    {loading ? 'Joining...' : 'Skip tutorial & join multiplayer lobby'}
                </button>
            </form>
        </div>
    );
}
