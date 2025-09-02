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
        <main className="bg-slate-100 pt-4 md:p-4">
            <div className="max-w-6xl mx-auto">
                <div className="bg-white rounded-lg shadow-sm p-4 md:p-8 text-center">
                    <h1 className='text-3xl font-bold mb-6'>Game in Progress</h1>
                
                <div className="mb-6">
                    <p className='mb-2 text-lg text-gray-700'>Game ID: <span className="font-mono font-bold">{gameId}</span></p>
                    <p className='mb-2 text-lg text-gray-700'>Player: <span className="font-semibold">{player.name}</span></p>
                    {team && <p className='mb-2 text-lg text-gray-700'>Team: <span className="font-semibold text-blue-600">{team.name}</span></p>}
                </div>

                <div className='mb-8 rounded-lg border border-blue-300 bg-blue-50 p-6'>
                    <h2 className="text-xl font-semibold text-blue-800 mb-3">🚧 Under Construction</h2>
                    <p className='mb-2 text-blue-700'>The team gameplay functionality is not yet implemented.</p>
                    <p className='text-sm text-blue-600'>This feature is coming soon as part of Phase 2!</p>
                </div>

                <div className="flex flex-wrap justify-center gap-4">
                    <button
                        onClick={() => navigate('/')}
                        className='px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition duration-200'
                        data-testid='game-back-to-home-button'
                    >
                        ← Back to Home
                    </button>
                    
                    <button
                        onClick={() => navigate('/tutorial')}
                        className='px-6 py-3 bg-blue-50 border border-blue-300 text-blue-800 rounded-lg hover:bg-blue-200 font-medium transition duration-200'
                        data-testid='game-tutorial-button'
                    >
                        ✌️ Learn How to Play
                    </button>
                </div>
            </div>
        </div>
        </main>
    );
}
