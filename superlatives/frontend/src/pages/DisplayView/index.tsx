import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useWebSocket } from '@/hooks/useWebSocket';
import { roomApi } from '@/services/api';
import type { Room, Player, PersonInPool, Question } from '@/types';

export default function DisplayView() {
    const { roomCode } = useParams<{ roomCode: string }>();
    const [room, setRoom] = useState<Room | null>(null);
    const [players, setPlayers] = useState<Player[]>([]);
    const [peoplePool, setPeoplePool] = useState<PersonInPool[]>([]);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
    const [voteProgress, setVoteProgress] = useState({ voted: 0, total: 0 });
    const [questionProgress, setQuestionProgress] = useState({ submitted: 0, total: 0 });

    // Load initial room data
    useEffect(() => {
        const loadRoom = async () => {
            if (!roomCode) return;

            try {
                const info = await roomApi.getByCode(roomCode);
                setRoom(info.room);
                setPlayers(info.players);
                setPeoplePool(info.people_pool);
                setQuestions(info.questions);
                setQuestionProgress({ submitted: info.questions.filter(q => q.round_number === info.room.current_round).length, total: info.players.length });
            } catch (error) {
                console.error('Failed to load room:', error);
            }
        };

        loadRoom();
    }, [roomCode]);

    // WebSocket connection (use room ID as session for display)
    const { isConnected } = useWebSocket({
        roomId: room?.id || 0,
        sessionId: `display_${room?.id || 0}`,
        clientType: 'display',
        onMessage: event => {
            const data = JSON.parse(event.data);
            console.log('Display received:', data);

            switch (data.type) {
                case 'player_joined':
                    // Refresh room data
                    if (roomCode) {
                        roomApi.getByCode(roomCode).then(info => {
                            setPlayers(info.players);
                            setPeoplePool(info.people_pool);
                        });
                    }
                    break;

                case 'game_started':
                    if (room) {
                        setRoom({ ...room, status: 'question_submission', current_round: data.round_number });
                    }
                    break;

                case 'question_submission_started':
                    if (room) {
                        setRoom({ ...room, status: 'question_submission', current_round: data.round_number });
                        setQuestionProgress({ submitted: 0, total: players.length });
                    }
                    break;

                case 'question_submitted':
                    setQuestionProgress({ submitted: data.total_submitted, total: data.total_players });
                    break;

                case 'voting_started':
                    if (room) {
                        const question = questions.find(q => q.id === data.question_id);
                        setCurrentQuestion(question || { id: data.question_id, question_text: data.question_text } as Question);
                        setRoom({ ...room, status: 'voting' });
                        setVoteProgress({ voted: 0, total: players.length });
                    }
                    break;

                case 'vote_submitted':
                    setVoteProgress({ voted: data.total_voted, total: data.total_voters });
                    break;

                case 'results_ready':
                    if (room) {
                        setRoom({ ...room, status: 'results' });
                    }
                    break;

                case 'person_added_to_pool':
                case 'person_removed_from_pool':
                case 'person_nickname_updated':
                    // Refresh people pool
                    if (roomCode) {
                        roomApi.getByCode(roomCode).then(info => {
                            setPeoplePool(info.people_pool);
                        });
                    }
                    break;
            }
        },
    });

    if (!room) {
        return (
            <div className='flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900'>
                <div className='text-2xl text-white'>Loading room...</div>
            </div>
        );
    }

    return (
        <div className='min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-8'>
            <div className='mx-auto max-w-6xl'>
                {/* Header - Always visible */}
                <div className='mb-8 text-center'>
                    <h1 className='text-6xl font-bold text-yellow-400'>Superlatives</h1>
                    <div className='mt-4 rounded-lg bg-black/30 px-8 py-4 inline-block'>
                        <p className='text-lg text-gray-300'>Join at:</p>
                        <p className='text-6xl font-mono font-bold text-white tracking-widest'>{roomCode}</p>
                    </div>
                    <div className='mt-2 text-lg text-gray-300'>
                        {isConnected ? '🟢 Live' : '🔴 Disconnected'}
                    </div>
                </div>

                {/* Content based on room status */}
                {room.status === 'lobby' && (
                    <div className='space-y-8'>
                        <h2 className='text-center text-4xl font-bold text-white'>Waiting for game to start...</h2>
                        <div className='text-center text-2xl text-gray-300'>
                            {players.length} player{players.length !== 1 ? 's' : ''} joined
                        </div>
                        <div className='grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4'>
                            {players.map(player => (
                                <div
                                    key={player.id}
                                    className='rounded-lg bg-white/10 backdrop-blur-sm p-6 text-center text-2xl text-white border border-white/20'
                                >
                                    {player.name}
                                    {player.is_host && ' 👑'}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {room.status === 'question_submission' && (
                    <div className='text-center space-y-8'>
                        <h2 className='text-6xl font-bold text-yellow-400'>Round {room.current_round}</h2>
                        <div className='rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 p-12'>
                            <p className='text-5xl font-bold text-white mb-6'>📱 Look at your phones!</p>
                            <p className='text-3xl text-gray-200'>
                                Submit your superlative question
                            </p>
                            <p className='mt-4 text-2xl text-gray-400'>
                                (e.g., "Most likely to become famous")
                            </p>
                        </div>
                        <div className='text-3xl text-white'>
                            {questionProgress.submitted} / {questionProgress.total} questions submitted
                        </div>
                        <div className='w-full bg-gray-700 rounded-full h-4'>
                            <div
                                className='bg-yellow-400 h-4 rounded-full transition-all duration-500'
                                style={{ width: `${(questionProgress.submitted / questionProgress.total) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                )}

                {room.status === 'voting' && currentQuestion && (
                    <div className='space-y-8'>
                        <div className='text-center rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 p-12'>
                            <h2 className='text-5xl font-bold text-yellow-400 mb-6'>Vote Now!</h2>
                            <p className='text-4xl font-bold text-white'>{currentQuestion.question_text}</p>
                        </div>
                        <div className='text-center text-3xl text-white'>
                            {voteProgress.voted} / {voteProgress.total} votes cast
                        </div>
                        <div className='w-full bg-gray-700 rounded-full h-4'>
                            <div
                                className='bg-green-400 h-4 rounded-full transition-all duration-500'
                                style={{ width: `${(voteProgress.voted / voteProgress.total) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                )}

                {room.status === 'results' && (
                    <div className='text-center'>
                        <h2 className='text-5xl font-bold text-white mb-8'>Results</h2>
                        <div className='rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 p-12'>
                            <p className='text-3xl text-gray-200'>Showing results...</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
