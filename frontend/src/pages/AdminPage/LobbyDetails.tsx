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
                                        <div className='flex items-center gap-3'>
                                            <span className='font-medium'>{player.name}</span>
                                            <span className='rounded bg-gray-100 px-2 py-1 text-sm text-gray-500'>
                                                {player.team_id ? `Team ${player.team_id}` : 'No team'}
                                            </span>
                                        </div>
                                        <div className='flex items-center gap-2'>
                                            {selectedLobby.teams && selectedLobby.teams.length > 0 && (
                                                <select
                                                    value={player.team_id || ''}
                                                    onChange={e =>
                                                        handleMovePlayer(
                                                            player.id!,
                                                            e.target.value ? parseInt(e.target.value) : 0
                                                        )
                                                    }
                                                    disabled={movingPlayerId === player.id}
                                                    className='rounded border px-2 py-1 text-sm'
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
                                                onClick={() => handleKickPlayer(player.id!)}
                                                className='rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700'
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
                    <div className='mb-6 rounded-lg bg-blue-50 p-4'>
                        <h3 className='mb-3 text-lg font-semibold'>Create Teams</h3>
                        <div className='flex items-center gap-4'>
                            <label className='text-sm font-medium'>Number of teams:</label>
                            <input
                                type='number'
                                min='2'
                                max={Math.min(10, selectedLobby.players.length)}
                                value={numTeams}
                                onChange={e => setNumTeams(parseInt(e.target.value))}
                                className='w-20 rounded border px-2 py-1'
                            />
                            <button
                                onClick={handleCreateTeams}
                                disabled={isCreatingTeams || numTeams < 2}
                                className='rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:bg-green-400'
                            >
                                {isCreatingTeams ? 'Creating...' : 'Create Teams'}
                            </button>
                        </div>
                        <p className='mt-2 text-sm text-gray-600'>
                            Players will be randomly assigned to {numTeams} teams
                        </p>
                    </div>
                )}

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

                {unassignedPlayers.length > 0 && selectedLobby.teams && selectedLobby.teams.length > 0 && (
                    <div className='mt-6'>
                        <h3 className='mb-4 text-lg font-semibold'>Unassigned Players ({unassignedPlayers.length})</h3>
                        <div className='space-y-2'>
                            {unassignedPlayers.map(player => (
                                <div
                                    key={player.id}
                                    className='flex items-center justify-between rounded border bg-yellow-50 p-2'
                                >
                                    <span className='font-medium'>{player.name}</span>
                                    <div className='flex items-center gap-2'>
                                        <select
                                            value=''
                                            onChange={e => handleMovePlayer(player.id!, parseInt(e.target.value))}
                                            disabled={movingPlayerId === player.id}
                                            className='rounded border px-2 py-1 text-sm'
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
                                            className='rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700'
                                            disabled={loading}
                                        >
                                            Kick
                                        </button>
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
