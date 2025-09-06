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
        <form onSubmit={handleJoinLobby} className='space-y-6'>
            <div>
                <label htmlFor='name' className='mb-2 block text-sm font-medium text-ayu-text-secondary'>
                    Your Name
                </label>
                <input
                    type='text'
                    id='name'
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className='w-full rounded-lg border border-ayu-border px-3 py-2 shadow-sm bg-ayu-bg-tertiary text-ayu-text-primary focus:border-ayu-accent focus:ring-2 focus:ring-ayu-accent focus:outline-none'
                    placeholder='Enter your name'
                    disabled={loading}
                    data-testid='name-input'
                />
            </div>

            <div>
                <label htmlFor='lobbyCode' className='mb-2 block text-sm font-medium text-ayu-text-secondary'>
                    Lobby Code
                </label>
                <input
                    type='text'
                    id='lobbyCode'
                    value={lobbyCode}
                    onChange={e => setLobbyCode(e.target.value.toUpperCase())}
                    className='w-full rounded-lg border border-ayu-border px-3 py-2 uppercase shadow-sm bg-ayu-bg-tertiary text-ayu-text-primary focus:border-ayu-accent focus:ring-2 focus:ring-ayu-accent focus:outline-none'
                    placeholder='ABCDEF'
                    maxLength={6}
                    disabled={loading}
                    data-testid='lobby-code-input'
                />
            </div>

            {error && <div className='text-center text-sm text-ayu-red' data-testid='join-form-error'>{error}</div>}

            <button
                type='submit'
                disabled={loading}
                className='w-full rounded-lg bg-ayu-accent px-4 py-2 font-medium text-ayu-bg-primary transition duration-200 hover:bg-ayu-accent-hover disabled:bg-ayu-text-muted'
                data-testid='join-lobby-button'
            >
                {loading ? 'Joining...' : 'Join Lobby'}
            </button>
        </form>
    );
}
