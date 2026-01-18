import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useToast } from '@/hooks/useToast';
import { roomApi, hostApi } from '@/services/api';
import type { Room, Player, PersonInPool, Question } from '@/types';

export default function HostView() {
    const { roomCode } = useParams<{ roomCode: string }>();
    const { addToast } = useToast();
    const [room, setRoom] = useState<Room | null>(null);
    const [players, setPlayers] = useState<Player[]>([]);
    const [peoplePool, setPeoplePool] = useState<PersonInPool[]>([]);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [newPersonName, setNewPersonName] = useState('');
    const sessionId = localStorage.getItem('session_token') || '';

    const loadRoomData = async () => {
        try {
            const info = await roomApi.getCurrent();
            setRoom(info.room);
            setPlayers(info.players);
            setPeoplePool(info.people_pool);
            setQuestions(info.questions);
        } catch (error) {
            console.error('Failed to load room:', error);
        }
    };

    useEffect(() => {
        if (sessionId) {
            loadRoomData();
        }
    }, [sessionId]);

    const { isConnected } = useWebSocket({
        roomId: room?.id || 0,
        sessionId,
        clientType: 'host',
        onMessage: event => {
            console.log('Host received:', event.data);
            loadRoomData(); // Reload on updates
        },
    });

    const handleAddPerson = async () => {
        if (!newPersonName.trim()) {
            addToast('Please enter a name', 'error');
            return;
        }

        try {
            await hostApi.addPersonToPool(newPersonName);
            addToast(`Added ${newPersonName} to pool`, 'success');
            setNewPersonName('');
            await loadRoomData();
        } catch (error) {
            addToast(error instanceof Error ? error.message : 'Failed to add person', 'error');
        }
    };

    const handleRemovePerson = async (name: string) => {
        try {
            await hostApi.removePersonFromPool(name);
            addToast(`Removed ${name}`, 'success');
            await loadRoomData();
        } catch (error) {
            addToast(error instanceof Error ? error.message : 'Failed to remove person', 'error');
        }
    };

    const handleStartGame = async () => {
        try {
            await hostApi.startGame();
            addToast('Game started!', 'success');
            await loadRoomData();
        } catch (error) {
            addToast(error instanceof Error ? error.message : 'Failed to start game', 'error');
        }
    };

    const handleStartVoting = async (questionId: number) => {
        try {
            await hostApi.startVoting(questionId);
            addToast('Voting started', 'success');
            await loadRoomData();
        } catch (error) {
            addToast(error instanceof Error ? error.message : 'Failed to start voting', 'error');
        }
    };

    const handleEndVoting = async (questionId: number) => {
        try {
            await hostApi.endVoting(questionId);
            addToast('Voting ended', 'success');
            await loadRoomData();
        } catch (error) {
            addToast(error instanceof Error ? error.message : 'Failed to end voting', 'error');
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
        <div className='min-h-screen p-6'>
            <div className='mx-auto max-w-6xl space-y-6'>
                {/* Header */}
                <div className='rounded-lg bg-gray-800 p-6'>
                    <h1 className='text-3xl font-bold text-yellow-400'>Host Controls</h1>
                    <div className='mt-2 flex items-center gap-4 text-white'>
                        <span className='font-mono text-xl'>Room: {roomCode}</span>
                        <span className='text-sm'>{isConnected ? '🟢 Connected' : '🔴 Disconnected'}</span>
                        <span className='text-sm'>
                            Status: <span className='font-semibold'>{room.status}</span>
                        </span>
                        <span className='text-sm'>Round: {room.current_round}</span>
                    </div>
                </div>

                {/* People Pool Management */}
                <div className='rounded-lg bg-gray-800 p-6'>
                    <h2 className='text-xl font-bold text-white'>People Pool</h2>
                    <div className='mt-4 flex gap-2'>
                        <input
                            type='text'
                            placeholder='Add person name'
                            value={newPersonName}
                            onChange={e => setNewPersonName(e.target.value)}
                            className='flex-1 rounded-lg bg-gray-700 px-4 py-2 text-white'
                        />
                        <button
                            onClick={handleAddPerson}
                            className='rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700'
                        >
                            Add
                        </button>
                    </div>
                    <div className='mt-4 grid grid-cols-3 gap-2'>
                        {peoplePool.map(person => (
                            <div
                                key={person.id}
                                className='flex items-center justify-between rounded-lg bg-gray-700 p-2 text-white'
                            >
                                <span>
                                    {person.name} {person.is_player && '👤'}
                                </span>
                                {!person.is_player && (
                                    <button
                                        onClick={() => handleRemovePerson(person.name)}
                                        className='text-red-400 hover:text-red-300'
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Players */}
                <div className='rounded-lg bg-gray-800 p-6'>
                    <h2 className='text-xl font-bold text-white'>Players ({players.length})</h2>
                    <div className='mt-4 grid grid-cols-4 gap-2'>
                        {players.map(player => (
                            <div key={player.id} className='rounded-lg bg-gray-700 p-2 text-center text-white'>
                                {player.name}
                                {player.is_host && ' 👑'}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Game Controls */}
                <div className='rounded-lg bg-gray-800 p-6'>
                    <h2 className='text-xl font-bold text-white'>Game Controls</h2>
                    <div className='mt-4 space-y-2'>
                        {room.status === 'lobby' && (
                            <button
                                onClick={handleStartGame}
                                className='w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700'
                            >
                                Start Game
                            </button>
                        )}

                        {room.status === 'question_submission' && (
                            <div>
                                <p className='text-white'>
                                    Questions submitted: {questions.filter(q => q.round_number === room.current_round).length} / {players.length}
                                </p>
                            </div>
                        )}

                        {room.status === 'results' && (
                            <div className='space-y-2'>
                                {questions
                                    .filter(q => q.round_number === room.current_round && !q.voting_completed)
                                    .map(question => (
                                        <div key={question.id} className='rounded-lg bg-gray-700 p-3'>
                                            <p className='text-white'>{question.question_text}</p>
                                            <button
                                                onClick={() => handleStartVoting(question.id)}
                                                className='mt-2 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700'
                                            >
                                                Start Voting
                                            </button>
                                        </div>
                                    ))}
                            </div>
                        )}

                        {room.status === 'voting' && room.current_question_id && (
                            <button
                                onClick={() => handleEndVoting(room.current_question_id!)}
                                className='w-full rounded-lg bg-orange-600 px-6 py-3 font-semibold text-white hover:bg-orange-700'
                            >
                                End Voting & Show Results
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
