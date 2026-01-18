import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { hostApi, roomApi } from '@/services/api';
import { useToast } from '@/hooks/useToast';

export default function LandingPage() {
    const navigate = useNavigate();
    const { addToast } = useToast();
    const [mode, setMode] = useState<'join' | null>(null);
    const [name, setName] = useState('');
    const [roomCode, setRoomCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleJoinRoom = async () => {
        if (!name || !roomCode) {
            addToast('Please enter your name and room code', 'error');
            return;
        }

        setIsLoading(true);
        try {
            await roomApi.join(name, roomCode.toUpperCase());
            navigate(`/play/${roomCode.toUpperCase()}`);
        } catch (error) {
            addToast(error instanceof Error ? error.message : 'Failed to join room', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateLobby = async () => {
        setIsLoading(true);
        try {
            const result = await hostApi.createLobby();
            // Immediately navigate to display view (for laptop connected to TV)
            navigate(`/display/${result.room_code}`);
        } catch (error) {
            addToast(error instanceof Error ? error.message : 'Failed to create lobby', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className='flex min-h-screen flex-col items-center justify-center p-4'>
            <div className='w-full max-w-md space-y-8'>
                <div className='text-center'>
                    <h1 className='text-5xl font-bold text-yellow-400'>Superlatives</h1>
                    <p className='mt-2 text-lg text-gray-300'>A party game about superlatives!</p>
                </div>

                {!mode && (
                    <div className='space-y-4'>
                        <button
                            onClick={handleCreateLobby}
                            disabled={isLoading}
                            className='w-full rounded-lg bg-green-600 px-6 py-4 text-xl font-semibold text-white transition hover:bg-green-700 disabled:opacity-50'
                        >
                            {isLoading ? 'Creating...' : 'Create Lobby'}
                        </button>
                        <button
                            onClick={() => setMode('join')}
                            className='w-full rounded-lg bg-blue-600 px-6 py-4 text-xl font-semibold text-white transition hover:bg-blue-700'
                        >
                            Join Lobby
                        </button>
                        <div className='text-center'>
                            <a href='/admin/login' className='text-sm text-gray-400 hover:text-gray-300'>
                                Admin Login
                            </a>
                        </div>
                    </div>
                )}

                {mode === 'join' && (
                    <div className='space-y-4 rounded-lg bg-gray-800 p-6'>
                        <button onClick={() => setMode(null)} className='text-sm text-gray-400 hover:text-gray-300'>
                            ← Back
                        </button>
                        <h2 className='text-2xl font-bold text-white'>Join Lobby</h2>
                        <input
                            type='text'
                            placeholder='Your Name'
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className='w-full rounded-lg bg-gray-700 px-4 py-3 text-white placeholder-gray-400'
                        />
                        <input
                            type='text'
                            placeholder='Room Code (e.g. ABC123)'
                            value={roomCode}
                            onChange={e => setRoomCode(e.target.value.toUpperCase())}
                            maxLength={6}
                            className='w-full rounded-lg bg-gray-700 px-4 py-3 font-mono text-white placeholder-gray-400'
                        />
                        <button
                            onClick={handleJoinRoom}
                            disabled={isLoading}
                            className='w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50'
                        >
                            {isLoading ? 'Joining...' : 'Join'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
