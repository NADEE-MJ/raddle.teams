import { Player } from '@/types';

interface PlayersListProps {
    players: Player[];
    currentPlayer: Player;
}

export default function PlayersList({ players, currentPlayer }: PlayersListProps) {
    return (
        <div className='rounded-lg bg-gray-50 p-4'>
            <h2 className='mb-4 text-xl font-semibold text-gray-900'>Players ({players.length})</h2>
            {players.length === 0 ? (
                <p className='text-gray-500'>No players in lobby yet</p>
            ) : (
                <div className='max-h-64 space-y-2 overflow-y-auto'>
                    {players.map(playerItem => (
                        <div
                            key={playerItem.id}
                            className={`flex items-center justify-between rounded-lg p-3 ${
                                playerItem.id === currentPlayer.id
                                    ? 'border-2 border-blue-300 bg-blue-100'
                                    : 'border border-gray-200 bg-white'
                            }`}
                        >
                            <div className='flex items-center gap-3'>
                                <span className='font-medium'>
                                    {playerItem.name}
                                    {playerItem.id === currentPlayer.id && ' (You)'}
                                </span>
                            </div>
                            <div className='rounded bg-gray-100 px-2 py-1 text-sm text-gray-500'>
                                {playerItem.team_id ? `Team ${playerItem.team_id}` : 'No team'}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
