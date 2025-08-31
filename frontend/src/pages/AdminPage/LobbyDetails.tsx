import { LobbyInfo } from '@/types';

interface LobbyDetailsProps {
    selectedLobby: LobbyInfo;
    onClose: () => void;
}

export default function LobbyDetails({ selectedLobby, onClose }: LobbyDetailsProps) {
    return (
        <div className='rounded-lg bg-white p-6 shadow-xl'>
            <div className='mb-6 flex items-center justify-between'>
                <h2 className='text-2xl font-semibold text-gray-900'>Lobby Details: {selectedLobby.lobby.name}</h2>
                <button
                    onClick={onClose}
                    className='rounded-lg px-3 py-1 text-xl font-bold text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700'
                >
                    ✕
                </button>
            </div>

            <div className='grid gap-6 md:grid-cols-2'>
                <div className='rounded-lg bg-gray-50 p-4'>
                    <h3 className='mb-3 text-lg font-semibold'>Lobby Info</h3>
                    <div className='space-y-2'>
                        <p>
                            <strong>Code:</strong> <span className='font-mono'>{selectedLobby.lobby.code}</span>
                        </p>
                        <p>
                            <strong>Name:</strong> {selectedLobby.lobby.name}
                        </p>
                        <p>
                            <strong>Created:</strong> {new Date(selectedLobby.lobby.created_at).toLocaleString()}
                        </p>
                    </div>
                </div>

                <div className='rounded-lg bg-gray-50 p-4'>
                    <h3 className='mb-3 text-lg font-semibold'>Players ({selectedLobby.players.length})</h3>
                    {selectedLobby.players.length === 0 ? (
                        <p className='text-gray-500'>No players in this lobby yet</p>
                    ) : (
                        <div className='max-h-48 space-y-2 overflow-y-auto'>
                            {selectedLobby.players.map(player => (
                                <div
                                    key={player.id}
                                    className='flex items-center justify-between rounded border bg-white p-2'
                                >
                                    <span className='font-medium'>{player.name}</span>
                                    <span className='rounded bg-gray-100 px-2 py-1 text-sm text-gray-500'>
                                        {player.team_id ? `Team ${player.team_id}` : 'No team'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {selectedLobby.teams && selectedLobby.teams.length > 0 && (
                <div className='mt-6'>
                    <h3 className='mb-4 text-lg font-semibold'>Teams ({selectedLobby.teams.length})</h3>
                    <div className='grid gap-4 md:grid-cols-2'>
                        {selectedLobby.teams.map(team => (
                            <div key={team.id} className='rounded-lg border border-gray-200 bg-gray-50 p-4'>
                                <h4 className='mb-2 text-lg font-semibold'>{team.name}</h4>
                                <p className='mb-3 text-sm text-gray-600'>
                                    Current word index: {team.current_word_index}
                                </p>
                                {selectedLobby.players_by_team && selectedLobby.players_by_team[team.id] && (
                                    <div>
                                        <p className='mb-2 text-sm font-medium'>Members:</p>
                                        <div className='flex flex-wrap gap-1'>
                                            {selectedLobby.players_by_team[team.id].map(player => (
                                                <span
                                                    key={player.id}
                                                    className='inline-block rounded bg-blue-100 px-2 py-1 text-xs text-blue-800'
                                                >
                                                    {player.name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
