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
                        <h2 className='text-2xl font-semibold mb-1 text-tx-primary'>Lobby Details</h2>
                        <p className="text-tx-secondary">{selectedLobby.lobby.name}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className='px-3 py-1 bg-tertiary border border-border hover:bg-secondary text-tx-primary rounded-md cursor-pointer font-medium transition duration-200 text-lg'
                        data-testid='close-lobby-details-button'
                    >
                        ✕
                    </button>
                </div>

                <div className='grid gap-6 md:grid-cols-2 mb-6'>
                    <div className=" py-3 rounded-md border border-border bg-secondary px-4 py-3">
                        <div className="text-tx-muted text-sm uppercase tracking-wide mb-3">Lobby Info</div>
                        <div className='space-y-2 text-sm text-tx-primary'>
                            <p>
                                <strong>Code:</strong> <span className='font-mono bg-green/30 text-green px-1 rounded'>{selectedLobby.lobby.code}</span>
                            </p>
                            <p>
                                <strong>Name:</strong> {selectedLobby.lobby.name}
                            </p>
                            <p>
                                <strong>Created:</strong> {new Date(selectedLobby.lobby.created_at).toLocaleDateString()}
                            </p>
                        </div>
                    </div>

                    <div className=" py-3 rounded-md border border-border bg-secondary px-4 py-3">
                        <div className="text-tx-muted text-sm uppercase tracking-wide mb-3">Players ({selectedLobby.players.length})</div>
                        {selectedLobby.players.length === 0 ? (
                            <p className='text-tx-muted text-center py-4'>No players in this lobby yet</p>
                        ) : (
                            <div className='max-h-48 space-y-2 overflow-y-auto'>
                                {selectedLobby.players.map(player => (
                                    <div
                                        key={player.id}
                                        data-testid={`player-row-${player.name}`}
                                        className='flex items-center justify-between p-2 bg-tertiary rounded border border-gray-300 dark:border-border'
                                    >
                                        <div className='flex items-center gap-2'>
                                            <span className='font-medium text-sm text-tx-primary'>{player.name}</span>
                                            <span
                                                className='bg-blue/30 text-blue px-1 rounded text-xs'
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
                                                    className='px-2 py-1 border border-border bg-secondary text-tx-primary rounded text-xs'
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
                                                className='px-2 py-1 bg-red/20 border border-red hover:bg-red/30 text-red rounded cursor-pointer text-xs transition duration-200'
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
                    <div className=" mb-4 py-3 rounded-md border border-blue bg-blue/20 px-4 py-3">
                        <div className="text-blue text-sm uppercase tracking-wide mb-3" data-testid='create-teams-heading'>Create Teams</div>
                        <div className='flex flex-col md:flex-row md:items-center gap-3'>
                            <label className='text-sm font-medium text-blue'>Number of teams:</label>
                            <input
                                type='number'
                                min='2'
                                max={Math.min(10, selectedLobby.players.length)}
                                value={numTeams}
                                onChange={e => setNumTeams(parseInt(e.target.value))}
                                className='w-20 px-2 py-1 border border-blue bg-white dark:bg-secondary text-tx-primary rounded text-sm'
                                data-testid='num-teams-input'
                            />
                            <button
                                data-testid='create-teams-button'
                                onClick={handleCreateTeams}
                                disabled={isCreatingTeams || numTeams < 2}
                                className='px-4 py-2 bg-blue/20 border border-blue hover:bg-blue/30 text-blue rounded-md cursor-pointer font-medium transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm'
                            >
                                {isCreatingTeams ? 'Creating...' : 'Create Teams'}
                            </button>
                        </div>
                        <p className='mt-2 text-xs text-blue'>
                            Players will be randomly assigned to {numTeams} teams
                        </p>
                    </div>
                )}

                {selectedLobby.teams && selectedLobby.teams.length > 0 && (
                    <div>
                        <div className="text-tx-muted text-sm uppercase tracking-wide mb-3" data-testid='teams-heading'>Teams ({selectedLobby.teams.length})</div>
                        <div className='grid gap-4 md:grid-cols-2 mb-6'>
                            {selectedLobby.teams.map(team => (
                                <div key={team.id} className=" py-3 rounded-md border border-border bg-secondary px-4 py-3">
                                    <h4 className='mb-2 font-semibold text-tx-primary'>{team.name}</h4>
                                    <p className='mb-3 text-xs text-tx-secondary'>
                                        Current word index: <span className="font-mono bg-accent/30 text-accent px-1 rounded">{team.current_word_index}</span>
                                    </p>
                                    {selectedLobby.players_by_team && selectedLobby.players_by_team[team.id] && (
                                        <div>
                                            <p className='mb-2 text-xs font-medium text-tx-muted uppercase tracking-wide'>Members:</p>
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
                        <div className="text-orange text-sm uppercase tracking-wide mb-3" data-testid='unassigned-players-heading'>Unassigned Players ({unassignedPlayers.length})</div>
                        <div className='space-y-2'>
                            {unassignedPlayers.map(player => (
                                <div
                                    key={player.id}
                                    data-testid={`unassigned-player-row-${player.name}`}
                                    className=" mb-2 py-2 rounded-md border border-orange bg-orange/20 px-4 py-3"
                                >
                                    <div className='flex items-center justify-between'>
                                        <span className='font-medium text-orange'>{player.name}</span>
                                        <div className='flex items-center gap-2'>
                                            <select
                                                data-testid={`unassigned-team-dropdown-${player.name}`}
                                                value=''
                                                onChange={e => handleMovePlayer(player.id!, parseInt(e.target.value))}
                                                disabled={movingPlayerId === player.id}
                                                className='px-2 py-1 border border-orange-300 dark:border-orange rounded text-sm bg-white dark:bg-secondary text-tx-primary'
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
                                                className='px-2 py-1 bg-red/20 border border-red hover:bg-red/30 text-red rounded cursor-pointer text-xs transition duration-200'
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
