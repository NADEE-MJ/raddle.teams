import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { useGlobalOutletContext } from '@/hooks/useGlobalOutletContext';
import TextInput from '@/components/TextInput';
import Button from '@/components/Button';

export default function JoinForm() {
    const { setSessionId } = useGlobalOutletContext();
    const [name, setName] = useState('');
    const [lobbyCode, setLobbyCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
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
            setSessionId(player.session_id);
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
            <TextInput
                id='name'
                label='Your Name'
                value={name}
                onChange={setName}
                placeholder='Enter your name'
                disabled={loading}
                data-testid='name-input'
            />

            <TextInput
                id='lobbyCode'
                label='Lobby Code'
                value={lobbyCode}
                onChange={value => setLobbyCode(value.toUpperCase())}
                className='uppercase'
                placeholder='ABCDEF'
                maxLength={6}
                disabled={loading}
                data-testid='lobby-code-input'
            />

            {error && (
                <div className='text-red text-center text-sm' data-testid='join-form-error'>
                    {error}
                </div>
            )}

            <Button
                type='submit'
                variant='primary'
                size='lg'
                disabled={loading}
                loading={loading}
                className='w-full'
                data-testid='join-lobby-button'
            >
                {loading ? 'Joining' : 'Join Lobby'}
            </Button>
        </form>
    );
}
