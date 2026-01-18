import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useToast } from '@/hooks/useToast';
import { roomApi, gameApi, hostApi } from '@/services/api';
import type { Room, PersonInPool, Player } from '@/types';

export default function PlayerView() {
    const { roomCode } = useParams<{ roomCode: string }>();
    const { addToast } = useToast();
    const [room, setRoom] = useState<Room | null>(null);
    const [peoplePool, setPeoplePool] = useState<PersonInPool[]>([]);
    const [players, setPlayers] = useState<Player[]>([]);
    const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
    const [questionText, setQuestionText] = useState('');
    const [hasSubmittedQuestion, setHasSubmittedQuestion] = useState(false);
    const sessionId = localStorage.getItem('session_token') || '';

    useEffect(() => {
        const loadRoom = async () => {
            try {
                const info = await roomApi.getCurrent();
                setRoom(info.room);
                setPeoplePool(info.people_pool);
                setPlayers(info.players);
                // Find current player by session_id
                const player = info.players.find(p => p.session_id === sessionId);
                setCurrentPlayer(player || null);
            } catch (error) {
                console.error('Failed to load room:', error);
            }
        };

        if (sessionId) {
            loadRoom();
        }
    }, [sessionId]);

    const { isConnected } = useWebSocket({
        roomId: room?.id || 0,
        sessionId,
        clientType: 'player',
        onMessage: event => {
            console.log('Player received:', event.data);
        },
    });

    const handleSubmitQuestion = async () => {
        if (!questionText.trim()) {
            addToast('Please enter a question', 'error');
            return;
        }

        try {
            await gameApi.submitQuestion(questionText);
            addToast('Question submitted!', 'success');
            setQuestionText('');
            setHasSubmittedQuestion(true);
        } catch (error) {
            addToast(error instanceof Error ? error.message : 'Failed to submit question', 'error');
        }
    };

    // Reset submission status when round changes
    useEffect(() => {
        if (room && room.status === 'question_submission') {
            // Check if this is a new round - reset if so
            const currentRoundKey = `submitted_round_${room.current_round}`;
            const lastSubmittedRound = localStorage.getItem(currentRoundKey);
            if (!lastSubmittedRound) {
                setHasSubmittedQuestion(false);
            }
        }
    }, [room?.current_round, room?.status]);

    const handleVote = async (personName: string) => {
        if (!room?.current_question_id) return;

        try {
            await gameApi.submitVote(room.current_question_id, personName);
            addToast('Vote submitted!', 'success');
        } catch (error) {
            addToast(error instanceof Error ? error.message : 'Failed to submit vote', 'error');
        }
    };

    const handleStartGame = async () => {
        try {
            await hostApi.startGame();
            addToast('Game started!', 'success');
        } catch (error) {
            addToast(error instanceof Error ? error.message : 'Failed to start game', 'error');
        }
    };

    if (!room) {
        return (
            <div className='flex min-h-screen items-center justify-center'>
                <div className='text-white'>Loading...</div>
            </div>
        );
    }

    return (
        <div className='min-h-screen p-4'>
            <div className='mx-auto max-w-md space-y-4'>
                {/* Header */}
                <div className='text-center'>
                    <div className='text-2xl font-bold text-yellow-400'>Superlatives</div>
                    <div className='text-sm text-gray-400'>{isConnected ? '🟢 Connected' : '🔴 Disconnected'}</div>
                </div>

                {/* Content based on status */}
                {room.status === 'lobby' && (
                    <div className='space-y-4'>
                        <div className='rounded-lg bg-gray-800 p-4'>
                            <h3 className='text-sm font-semibold text-gray-400'>Players ({players.length})</h3>
                            <div className='mt-2 space-y-2'>
                                {players.map(player => (
                                    <div key={player.id} className='flex items-center justify-between text-white'>
                                        <span>
                                            {player.name}
                                            {player.is_host && ' 👑'}
                                            {player.id === currentPlayer?.id && ' (You)'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {currentPlayer?.is_host ? (
                            <div className='space-y-3'>
                                <div className='rounded-lg bg-green-900/30 border border-green-600 p-4 text-center'>
                                    <p className='text-sm font-semibold text-green-400'>👑 You are the host</p>
                                </div>
                                <button
                                    onClick={handleStartGame}
                                    disabled={players.length < 3}
                                    className='w-full rounded-lg bg-green-600 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed'
                                >
                                    {players.length < 3
                                        ? `Waiting for players (${players.length}/3)`
                                        : 'Start Game'}
                                </button>
                                {players.length < 3 && (
                                    <p className='text-center text-xs text-gray-400'>Need at least 3 players to start</p>
                                )}
                            </div>
                        ) : (
                            <div className='rounded-lg bg-gray-800 p-6 text-center'>
                                <p className='text-xl text-white'>Waiting for host to start...</p>
                            </div>
                        )}
                    </div>
                )}

                {room.status === 'question_submission' && !hasSubmittedQuestion && (
                    <div className='space-y-4 rounded-lg bg-gray-800 p-6'>
                        <h2 className='text-xl font-bold text-white'>Submit Your Question</h2>
                        <p className='text-sm text-gray-300'>Ask a superlative question (e.g., "Most likely to...")</p>
                        <textarea
                            value={questionText}
                            onChange={e => setQuestionText(e.target.value)}
                            maxLength={200}
                            rows={4}
                            placeholder='Most likely to...'
                            className='w-full rounded-lg bg-gray-700 p-3 text-white placeholder-gray-400'
                        />
                        <div className='text-right text-sm text-gray-400'>{questionText.length}/200</div>
                        <button
                            onClick={handleSubmitQuestion}
                            className='w-full rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700'
                        >
                            Submit Question
                        </button>
                    </div>
                )}

                {room.status === 'question_submission' && hasSubmittedQuestion && (
                    <div className='rounded-lg bg-gray-800 p-6 text-center'>
                        <div className='mb-4 text-4xl'>⏳</div>
                        <h2 className='text-xl font-bold text-white'>Question Submitted!</h2>
                        <p className='mt-2 text-sm text-gray-300'>
                            Waiting for other players to submit their questions...
                        </p>
                    </div>
                )}

                {room.status === 'voting' && (
                    <div className='space-y-4 rounded-lg bg-gray-800 p-6'>
                        <h2 className='text-xl font-bold text-white'>Vote!</h2>
                        <p className='text-sm text-gray-300'>Select a person from the pool</p>
                        <div className='grid grid-cols-2 gap-2'>
                            {peoplePool.map(person => (
                                <button
                                    key={person.id}
                                    onClick={() => handleVote(person.name)}
                                    className='rounded-lg bg-gray-700 p-3 text-white hover:bg-gray-600'
                                >
                                    {person.name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {room.status === 'results' && (
                    <div className='rounded-lg bg-gray-800 p-6 text-center'>
                        <p className='text-xl text-white'>Viewing results...</p>
                    </div>
                )}
            </div>
        </div>
    );
}
