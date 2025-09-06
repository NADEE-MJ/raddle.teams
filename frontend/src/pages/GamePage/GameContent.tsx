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
        <main className="bg-ayu-bg-primary pt-4 md:p-4">
            <div className="max-w-6xl mx-auto">
                <div className="bg-ayu-bg-secondary border border-ayu-border rounded-lg shadow-sm p-4 md:p-8 text-center">
                    <h1 className='text-3xl font-bold mb-6 text-ayu-text-primary'>Game in Progress</h1>
                
                <div className="mb-6">
                    <p className='mb-2 text-lg text-ayu-text-secondary'>Game ID: <span className="font-mono font-bold">{gameId}</span></p>
                    <p className='mb-2 text-lg text-ayu-text-secondary'>Player: <span className="font-semibold">{player.name}</span></p>
                    {team && <p className='mb-2 text-lg text-ayu-text-secondary'>Team: <span className="font-semibold text-ayu-blue">{team.name}</span></p>}
                </div>

                <div className='mb-8 rounded-lg border border-ayu-blue bg-ayu-blue/20 p-6'>
                    <h2 className="text-xl font-semibold text-ayu-blue mb-3">🚧 Under Construction</h2>
                    <p className='mb-2 text-ayu-blue'>The team gameplay functionality is not yet implemented.</p>
                    <p className='text-sm text-ayu-blue'>This feature is coming soon as part of Phase 2!</p>
                </div>

                <div className="flex flex-wrap justify-center gap-4">
                    <button
                        onClick={() => navigate('/')}
                        className='px-6 py-3 bg-ayu-accent hover:bg-ayu-accent-hover text-ayu-bg-primary rounded-lg font-medium transition duration-200'
                        data-testid='game-back-to-home-button'
                    >
                        ← Back to Home
                    </button>
                    
                    <button
                        onClick={() => navigate('/tutorial')}
                        className='px-6 py-3 bg-ayu-bg-secondary border border-ayu-border text-ayu-blue rounded-lg hover:bg-ayu-bg-elevated font-medium transition duration-200'
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
