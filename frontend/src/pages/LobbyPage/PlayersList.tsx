import { Player } from '@/types';

interface PlayersListProps {
    players: Player[];
    currentPlayer: Player;
}

export default function PlayersList({ players, currentPlayer }: PlayersListProps) {
    return (
        <div className='rounded-lg bg-gray-50 dark:bg-slate-700 p-4'>
            <h2 className='mb-4 text-xl font-semibold text-gray-900 dark:text-white'>Players ({players.length})</h2>
            {players.length === 0 ? (
                <p className='text-gray-500 dark:text-gray-400'>No players in lobby yet</p>
            ) : (
                <div className='max-h-64 space-y-2 overflow-y-auto'>
                    {players.map(playerItem => (
                        <div
                            key={playerItem.id}
                            data-testid={`player-list-row-${playerItem.name}`}
                            className={`flex items-center justify-between rounded-lg p-3 ${playerItem.id === currentPlayer.id
                                    ? 'border-2 border-blue-300 dark:border-blue-600 bg-blue-100 dark:bg-blue-900/30'
                                    : 'border border-gray-200 dark:border-gray-600 bg-white dark:bg-slate-600'
                                }`}
                        >
                            <div className='flex items-center gap-3'>
                                <span className='font-medium text-gray-900 dark:text-white' data-testid={`player-name-${playerItem.name}`}>
                                    {playerItem.name}
                                    {playerItem.id === currentPlayer.id && ' (You)'}
                                </span>
                            </div>
                            <div className='team-status-container' data-testid={`team-status-container-${playerItem.name}`}>
                                <span
                                    className='rounded bg-gray-100 dark:bg-gray-600 px-2 py-1 text-sm text-gray-500 dark:text-gray-300'
                                    data-testid={`team-status-${playerItem.name}`}
                                >
                                    {playerItem.team_id ? `Team ${playerItem.team_id}` : 'No team'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
