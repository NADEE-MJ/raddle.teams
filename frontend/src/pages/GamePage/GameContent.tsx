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
        <main className="bg-primary pt-4 md:p-4">
            <div className="max-w-6xl mx-auto">
                <div className="bg-secondary border border-border rounded-lg shadow-sm p-4 md:p-8 text-center">
                    <h1 className='text-3xl font-bold mb-6 text-tx-primary'>Game in Progress</h1>

                    <div className="mb-6">
                        <p className='mb-2 text-lg text-tx-secondary'>Game ID: <span className="font-mono font-bold">{gameId}</span></p>
                        <p className='mb-2 text-lg text-tx-secondary'>Player: <span className="font-semibold">{player.name}</span></p>
                        {team && <p className='mb-2 text-lg text-tx-secondary'>Team: <span className="font-semibold text-blue">{team.name}</span></p>}
                    </div>

                    <div className='mb-8 rounded-lg border border-blue bg-blue/20 p-6'>
                        <h2 className="text-xl font-semibold text-blue mb-3">🚧 Under Construction</h2>
                        <p className='mb-2 text-blue'>The team gameplay functionality is not yet implemented.</p>
                        <p className='text-sm text-blue'>This feature is coming soon as part of Phase 2!</p>
                    </div>

                    <div className="flex flex-wrap justify-center gap-4">
                        <button
                            onClick={() => navigate('/')}
                            className='px-6 py-3 bg-accent hover:bg-accent-hover text-primary rounded-lg font-medium transition duration-200'
                            data-testid='game-back-to-home-button'
                        >
                            ← Back to Home
                        </button>

                        <button
                            onClick={() => navigate('/tutorial')}
                            className='px-6 py-3 bg-secondary border border-border text-blue rounded-lg hover:bg-elevated font-medium transition duration-200'
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
