import { useState } from 'react';
import { LobbyInfo } from '@/types';
import Modal from '@/components/Modal';

interface LobbyDetailsProps {
    selectedLobby: LobbyInfo;
    onClose: () => void;
    onCreateTeams: (lobbyId: number, numTeams: number) => Promise<void>;
    onMovePlayer: (playerId: number, teamId: number) => Promise<void>;
    onKickPlayer: (playerId: number) => Promise<void>;
    loading: boolean;
}

export default function LobbyDetails({
    selectedLobby,
    onClose,
    onCreateTeams,
    onMovePlayer,
    onKickPlayer,
    loading,
}: LobbyDetailsProps) {
    const [numTeams, setNumTeams] = useState<number>(2);
    const [isCreatingTeams, setIsCreatingTeams] = useState(false);
    const [movingPlayerId, setMovingPlayerId] = useState<number | null>(null);

    const handleCreateTeams = async () => {
        setIsCreatingTeams(true);
        try {
            await onCreateTeams(selectedLobby.lobby.id, numTeams);
        } finally {
            setIsCreatingTeams(false);
        }
    };

    const handleMovePlayer = async (playerId: number, teamId: number) => {
        setMovingPlayerId(playerId);
        try {
            await onMovePlayer(playerId, teamId);
        } finally {
            setMovingPlayerId(null);
        }
    };

    const handleKickPlayer = async (playerId: number) => {
        if (confirm('Are you sure you want to kick this player?')) {
            await onKickPlayer(playerId);
        }
    };

    const unassignedPlayers = selectedLobby.players.filter(player => !player.team_id);

    return (
        <Modal isOpen={true} onClose={onClose} maxWidth='max-w-6xl'>
            <div className='p-6'>
                <div className='mb-6 flex items-center justify-between'>
                    <div>
                        <h2 className='text-2xl font-semibold mb-1 text-gray-900 dark:text-white'>Lobby Details</h2>
                        <p className="text-gray-600 dark:text-gray-300">{selectedLobby.lobby.name}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className='px-3 py-1 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md cursor-pointer font-medium transition duration-200 text-lg'
                        data-testid='close-lobby-details-button'
                    >
                        ✕
                    </button>
                </div>

                <div className='grid gap-6 md:grid-cols-2 mb-6'>
                    <div className="mr-1 md:mr-0 pt-2 pb-2 md:pt-3 md:pb-3 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 px-4 py-3">
                        <div className="text-gray-500 dark:text-gray-400 text-sm uppercase tracking-wide mb-3">Lobby Info</div>
                        <div className='space-y-2 text-sm text-gray-900 dark:text-white'>
                            <p>
                                <strong>Code:</strong> <span className='font-mono bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1 rounded'>{selectedLobby.lobby.code}</span>
                            </p>
                            <p>
                                <strong>Name:</strong> {selectedLobby.lobby.name}
                            </p>
                            <p>
                                <strong>Created:</strong> {new Date(selectedLobby.lobby.created_at).toLocaleDateString()}
                            </p>
                        </div>
                    </div>

                    <div className="mr-1 md:mr-0 pt-2 pb-2 md:pt-3 md:pb-3 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 px-4 py-3">
                        <div className="text-gray-500 dark:text-gray-400 text-sm uppercase tracking-wide mb-3">Players ({selectedLobby.players.length})</div>
                        {selectedLobby.players.length === 0 ? (
                            <p className='text-gray-500 dark:text-gray-400 text-center py-4'>No players in this lobby yet</p>
                        ) : (
                            <div className='max-h-48 space-y-2 overflow-y-auto'>
                                {selectedLobby.players.map(player => (
                                    <div
                                        key={player.id}
                                        data-testid={`player-row-${player.name}`}
                                        className='flex items-center justify-between p-2 bg-gray-50 dark:bg-slate-600 rounded border border-gray-300 dark:border-gray-600'
                                    >
                                        <div className='flex items-center gap-2'>
                                            <span className='font-medium text-sm text-gray-900 dark:text-white'>{player.name}</span>
                                            <span 
                                                className='bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1 rounded text-xs'
                                                data-testid={`team-status-${player.name}`}
                                            >
                                                {player.team_id ? `Team ${player.team_id}` : 'No team'}
                                            </span>
                                        </div>
                                        <div className='flex items-center gap-1'>
                                            {selectedLobby.teams && selectedLobby.teams.length > 0 && (
                                                <select
                                                    data-testid={`team-dropdown-${player.name}`}
                                                    value={player.team_id || ''}
                                                    onChange={e =>
                                                        handleMovePlayer(
                                                            player.id!,
                                                            e.target.value ? parseInt(e.target.value) : 0
                                                        )
                                                    }
                                                    disabled={movingPlayerId === player.id}
                                                    className='px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-600 text-gray-900 dark:text-white rounded text-xs'
                                                >
                                                    <option value=''>No team</option>
                                                    {selectedLobby.teams?.map(team => (
                                                        <option key={team.id} value={team.id}>
                                                            {team.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            )}
                                            <button
                                                data-testid={`kick-button-${player.name}`}
                                                onClick={() => handleKickPlayer(player.id!)}
                                                className='px-2 py-1 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 hover:bg-red-200 dark:hover:bg-red-800/30 text-red-800 dark:text-red-300 rounded cursor-pointer text-xs transition duration-200'
                                                disabled={loading}
                                            >
                                                Kick
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {(!selectedLobby.teams || selectedLobby.teams.length === 0) && selectedLobby.players.length > 0 && (
                    <div className="mr-1 md:mr-0 mb-4 pt-2 pb-2 md:pt-3 md:pb-3 rounded-md border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 px-4 py-3">
                        <div className="text-blue-700 dark:text-blue-300 text-sm uppercase tracking-wide mb-3" data-testid='create-teams-heading'>Create Teams</div>
                        <div className='flex flex-col md:flex-row md:items-center gap-3'>
                            <label className='text-sm font-medium text-blue-800 dark:text-blue-300'>Number of teams:</label>
                            <input
                                type='number'
                                min='2'
                                max={Math.min(10, selectedLobby.players.length)}
                                value={numTeams}
                                onChange={e => setNumTeams(parseInt(e.target.value))}
                                className='w-20 px-2 py-1 border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-600 text-gray-900 dark:text-white rounded text-sm'
                                data-testid='num-teams-input'
                            />
                            <button
                                data-testid='create-teams-button'
                                onClick={handleCreateTeams}
                                disabled={isCreatingTeams || numTeams < 2}
                                className='px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 hover:bg-blue-200 dark:hover:bg-blue-800/30 text-blue-800 dark:text-blue-300 rounded-md cursor-pointer font-medium transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm'
                            >
                                {isCreatingTeams ? 'Creating...' : 'Create Teams'}
                            </button>
                        </div>
                        <p className='mt-2 text-xs text-blue-700 dark:text-blue-300'>
                            Players will be randomly assigned to {numTeams} teams
                        </p>
                    </div>
                )}

                {selectedLobby.teams && selectedLobby.teams.length > 0 && (
                    <div>
                        <div className="text-gray-500 dark:text-gray-400 text-sm uppercase tracking-wide mb-3" data-testid='teams-heading'>Teams ({selectedLobby.teams.length})</div>
                        <div className='grid gap-4 md:grid-cols-2 mb-6'>
                            {selectedLobby.teams.map(team => (
                                <div key={team.id} className="mr-1 md:mr-0 pt-2 pb-2 md:pt-3 md:pb-3 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 px-4 py-3">
                                    <h4 className='mb-2 font-semibold text-gray-900 dark:text-white'>{team.name}</h4>
                                    <p className='mb-3 text-xs text-gray-600 dark:text-gray-300'>
                                        Current word index: <span className="font-mono bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 px-1 rounded">{team.current_word_index}</span>
                                    </p>
                                    {selectedLobby.players_by_team && selectedLobby.players_by_team[team.id] && (
                                        <div>
                                            <p className='mb-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide'>Members:</p>
                                            <div className='flex flex-wrap gap-1'>
                                                {selectedLobby.players_by_team[team.id].map(player => (
                                                    <span
                                                        key={player.id}
                                                        className='inline-block rounded bg-blue-100 dark:bg-blue-900/30 px-2 py-1 text-xs text-blue-800 dark:text-blue-300'
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

                {unassignedPlayers.length > 0 && selectedLobby.teams && selectedLobby.teams.length > 0 && (
                    <div>
                        <div className="text-orange-600 dark:text-orange-400 text-sm uppercase tracking-wide mb-3" data-testid='unassigned-players-heading'>Unassigned Players ({unassignedPlayers.length})</div>
                        <div className='space-y-2'>
                            {unassignedPlayers.map(player => (
                                <div
                                    key={player.id}
                                    data-testid={`unassigned-player-row-${player.name}`}
                                    className="mr-1 md:mr-0 mb-2 pt-1 pb-0 md:pt-2 md:pb-1 rounded-md border border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20 px-4 py-3"
                                >
                                    <div className='flex items-center justify-between'>
                                        <span className='font-medium text-orange-900 dark:text-orange-300'>{player.name}</span>
                                        <div className='flex items-center gap-2'>
                                            <select
                                                data-testid={`unassigned-team-dropdown-${player.name}`}
                                                value=''
                                                onChange={e => handleMovePlayer(player.id!, parseInt(e.target.value))}
                                                disabled={movingPlayerId === player.id}
                                                className='px-2 py-1 border border-orange-300 dark:border-orange-700 rounded text-sm bg-white dark:bg-slate-600 text-gray-900 dark:text-white'
                                            >
                                                <option value=''>Assign to team...</option>
                                                {selectedLobby.teams?.map(team => (
                                                    <option key={team.id} value={team.id}>
                                                        {team.name}
                                                    </option>
                                                ))}
                                            </select>
                                            <button
                                                onClick={() => handleKickPlayer(player.id!)}
                                                className='px-2 py-1 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 hover:bg-red-200 dark:hover:bg-red-800/30 text-red-800 dark:text-red-300 rounded cursor-pointer text-xs transition duration-200'
                                                disabled={loading}
                                                data-testid={`unassigned-kick-button-${player.name}`}
                                            >
                                                Kick
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
