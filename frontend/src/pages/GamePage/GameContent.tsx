import { useNavigate } from 'react-router-dom';
import { Player, Team } from '@/types';

interface GameContentProps {
    gameId: string;
    player: Player;
    team: Team | null;
}

export default function GameContent({ gameId, player, team }: GameContentProps) {
    const navigate = useNavigate();

    return (
        <div className='flex min-h-screen items-center justify-center bg-gradient-to-br from-green-500 to-blue-600 p-4'>
            <div className='w-full max-w-md'>
                <div className='rounded-lg bg-white p-8 text-center shadow-xl'>
                    <h1 className='mb-4 text-3xl font-bold text-gray-900'>Game Page</h1>
                    <p className='mb-4 text-gray-600'>Game ID: {gameId}</p>
                    <p className='mb-4 text-gray-600'>Player: {player.name}</p>
                    {team && <p className='mb-4 text-gray-600'>Team: {team.name}</p>}
                    <div className='mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4'>
                        <p className='mb-2 text-gray-600'>The game functionality is not yet implemented.</p>
                        <p className='text-sm text-gray-500'>This is part of Phase 2 of the development plan.</p>
                    </div>
                    <button
                        onClick={() => navigate('/')}
                        className='rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700'
                    >
                        Back to Home
                    </button>
                </div>
            </div>
        </div>
    );
}
