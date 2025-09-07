import { useState, useEffect, useCallback } from 'react';
import { LobbyInfo } from '@/types';
import Modal from '@/components/Modal';
import { api } from '@/services/api';
import { useGlobalOutletContext } from '@/hooks/useGlobalOutletContext';
import LoadingSpinner from '@/components/LoadingSpinner';

interface LobbyDetailsProps {
    lobbyId: number;
    onClose: () => void;
    onLobbyDeleted: () => void;
    refreshKey: number;
}

export default function LobbyDetails({
    lobbyId,
    onClose,
    onLobbyDeleted,
    refreshKey
}: LobbyDetailsProps) {
    const { adminApiToken } = useGlobalOutletContext();

    const [selectedLobby, setSelectedLobby] = useState<LobbyInfo | null>(null);
    const [numTeams, setNumTeams] = useState<number>(2);
    const [isCreatingTeams, setIsCreatingTeams] = useState(false);
    const [movingPlayerId, setMovingPlayerId] = useState<number | null>(null);
    const [copiedCode, setCopiedCode] = useState<boolean>(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadLobbyDetails = useCallback(async () => {
        if (!adminApiToken) {
            setError('Admin API token is required to load lobby details');
            setLoading(false);
            return;
        };

        try {
            setLoading(true);
            setError('');
            const lobbyInfo = await api.admin.lobby.getInfo(lobbyId, adminApiToken);
            setSelectedLobby(lobbyInfo);
        } catch (err) {
            setError('Failed to load lobby details');
            console.error('Error loading lobby details:', err);
        } finally {
            setLoading(false);
        }
    }, [adminApiToken, lobbyId]);

    useEffect(() => {
        loadLobbyDetails();
    }, [loadLobbyDetails, refreshKey]);

    const handleCreateTeams = useCallback(async () => {
        if (!adminApiToken || !selectedLobby) {
            setError(adminApiToken ? 'Lobby not selected' : 'Admin API token is required to create teams');
            return;
        };

        setIsCreatingTeams(true);
        try {
            setError('');
            await api.admin.lobby.team.create(selectedLobby.lobby.id, numTeams, adminApiToken);
            await loadLobbyDetails();
        } catch (err) {
            setError('Failed to create teams');
            console.error('Error creating teams:', err);
        } finally {
            setIsCreatingTeams(false);
        }
    }, [adminApiToken, selectedLobby, numTeams, loadLobbyDetails]);

    const handleMovePlayer = useCallback(async (playerId: number, teamId: number) => {
        if (!adminApiToken || !selectedLobby) {
            setError(adminApiToken ? 'Lobby not selected' : 'Admin API token is required to move player');
            return;
        }

        setMovingPlayerId(playerId);
        try {
            setError('');
            await api.admin.lobby.team.move(playerId, teamId, adminApiToken);
            await loadLobbyDetails();
        } catch (err) {
            setError('Failed to move player');
            console.error('Error moving player:', err);
        } finally {
            setMovingPlayerId(null);
        }
    }, [adminApiToken, selectedLobby, loadLobbyDetails]);

    const handleKickPlayer = async (playerId: number) => {
        if (!adminApiToken || !selectedLobby) {
            setError(adminApiToken ? 'Lobby not selected' : 'Admin API token is required to kick player');
            return;
        };

        if (confirm('Are you sure you want to kick this player?')) {
            try {
                setError('');
                await api.admin.lobby.player.kick(playerId, adminApiToken);
                await loadLobbyDetails();
            } catch (err) {
                setError('Failed to kick player');
                console.error('Error kicking player:', err);
            }
        }
    };

    const handleDeleteLobby = useCallback(async () => {
        if (!adminApiToken || !selectedLobby) {
            setError(adminApiToken ? 'Lobby not selected' : 'Admin API token is required to delete lobby');
            return;
        };

        if (confirm('Are you sure you want to delete this lobby? This action cannot be undone.')) {
            try {
                setError('');
                await api.admin.lobby.delete(selectedLobby.lobby.id, adminApiToken);
                onLobbyDeleted();
                onClose();
            } catch (err) {
                setError('Failed to delete lobby');
                console.error('Error deleting lobby:', err);
            }
        }
    }, [adminApiToken, selectedLobby, onLobbyDeleted, onClose]);

    const handleCopyCode = useCallback(async () => {
        if (!selectedLobby) {
            setError('No lobby selected to copy code from');
            return;
        };

        try {
            await navigator.clipboard.writeText(selectedLobby.lobby.code);
            setCopiedCode(true);
            setTimeout(() => setCopiedCode(false), 2000);
        } catch (err) {
            console.error('Failed to copy code:', err);
        }
    }, [selectedLobby]);

    if (loading) {
        return (
            <Modal isOpen={true} onClose={onClose} maxWidth='max-w-6xl'>
                <div className='p-6 flex justify-center'>
                    <LoadingSpinner />
                </div>
            </Modal>
        );
    }

    if (!selectedLobby) {
        return (
            <Modal isOpen={true} onClose={onClose} maxWidth='max-w-6xl'>
                <div className='p-6'>
                    <div className='text-center text-tx-muted'>
                        {error || 'Lobby not found'}
                    </div>
                </div>
            </Modal>
        );
    }

    const unassignedPlayers = selectedLobby.players.filter(player => !player.team_id);

    return (
        <Modal isOpen={true} onClose={onClose} maxWidth='max-w-6xl'>
            <div className='p-6'>
                {error && (
                    <div className='mb-6 rounded-lg border border-red bg-red/20 px-4 py-3 text-red' data-testid='lobby-details-error-message'>
                        {error}
                    </div>
                )}

                <div className='mb-6 flex items-center justify-between'>
                    <div>
                        <h2 className='text-2xl font-semibold mb-1 text-tx-primary'>Lobby Details</h2>
                        <p className="text-tx-secondary">{selectedLobby.lobby.name}</p>
                    </div>

                    <div className='grid grid-cols-2 items-center gap-2 md:grid-cols-3'>
                        <button
                            onClick={loadLobbyDetails}
                            disabled={loading}
                            className='px-3 py-1 bg-accent/20 border border-accent hover:bg-accent/30 text-accent rounded-md cursor-pointer font-medium transition duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed'
                            data-testid='refresh-lobby-button'
                        >
                            {loading ? 'Refreshing...' : 'Refresh'}
                        </button>
                        <button
                            onClick={handleDeleteLobby}
                            className='px-3 py-1 bg-red/20 border border-red hover:bg-red/30 text-red rounded-md cursor-pointer font-medium transition duration-200 text-sm'
                            data-testid='delete-lobby-button'
                        >
                            Delete Lobby
                        </button>
                        <div className='md:hidden'></div>
                        <button
                            onClick={onClose}
                            className='px-3 py-1 bg-secondary border border-border hover:bg-elevated hover:border-accent text-tx-primary rounded-md cursor-pointer font-medium transition duration-200 text-sm'
                            data-testid='close-lobby-details-button'
                        >
                            Close
                        </button>
                    </div>
                </div>

                <div className='grid gap-6 md:grid-cols-2 mb-6'>
                    <div className="rounded-md border border-border bg-tertiary px-4 py-3">
                        <div className="text-tx-secondary text-sm uppercase tracking-wide mb-3">Lobby Info</div>
                        <div className='space-y-2 text-sm text-tx-primary'>
                            <p className="flex items-center gap-2">
                                <strong>Code:</strong>
                                <button
                                    onClick={handleCopyCode}
                                    className='relative font-bold bg-green/20 text-green py-1 px-2 rounded hover:bg-green/30 transition-colors duration-200'
                                    title="Click to copy code"
                                >
                                    {selectedLobby.lobby.code}
                                    {copiedCode && (
                                        <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                                            Copied!
                                        </span>
                                    )}
                                </button>
                            </p>
                            <p>
                                <strong>Name:</strong> {selectedLobby.lobby.name}
                            </p>
                            <p>
                                <strong>Created:</strong> {new Date(selectedLobby.lobby.created_at).toLocaleDateString()}
                            </p>
                        </div>
                    </div>

                    <div className="rounded-md border border-border bg-tertiary px-4 py-3">
                        <div className="text-tx-secondary text-sm uppercase tracking-wide mb-3">Players ({selectedLobby.players.length})</div>
                        {selectedLobby.players.length === 0 ? (
                            <div className="pt-4 pb-4 text-center text-tx-muted">
                                No players in this lobby yet
                            </div>
                        ) : (
                            <div className='max-h-48 space-y-2 overflow-y-auto'>
                                {selectedLobby.players.map(player => (
                                    <div
                                        key={player.id}
                                        data-testid={`player-row-${player.name}`}
                                        className='flex items-center justify-between p-2 bg-secondary rounded border border-border'
                                    >
                                        <div className='flex items-center gap-2'>
                                            <span className='font-medium text-sm text-tx-primary'>{player.name}</span>
                                            <span
                                                className='bg-blue/20 text-blue py-1 px-2 rounded text-xs'
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
                                                    className='px-2 py-1 border border-border-light bg-secondary text-tx-primary rounded text-xs cursor-pointer transition duration-200 hover:bg-secondary-light hover:border-accent focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent'
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
                    <div className="mb-6">
                        <div className="text-tx-secondary text-sm uppercase tracking-wide mb-3" data-testid='create-teams-heading'>Create Teams</div>
                        <div className="rounded-md border border-border bg-tertiary px-4 py-3">
                            <div className='flex flex-col md:flex-row md:items-center gap-3'>
                                <label className='text-sm font-medium text-tx-primary'>Number of teams:</label>
                                <input
                                    type='number'
                                    min='2'
                                    max={Math.min(10, selectedLobby.players.length)}
                                    value={numTeams}
                                    onChange={e => setNumTeams(parseInt(e.target.value))}
                                    className='w-20 px-3 py-2 border border-border-light bg-secondary text-tx-primary rounded-md text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent'
                                    data-testid='num-teams-input'
                                />
                                <button
                                    data-testid='create-teams-button'
                                    onClick={handleCreateTeams}
                                    disabled={isCreatingTeams || numTeams < 2}
                                    className='px-4 py-2 bg-secondary border border-border hover:bg-elevated text-accent rounded-md cursor-pointer font-medium transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm'
                                >
                                    {isCreatingTeams ? 'Creating...' : 'Create Teams'}
                                </button>
                            </div>
                            <p className='mt-2 text-xs text-tx-secondary'>
                                Players will be randomly assigned to {numTeams} teams
                            </p>
                        </div>
                    </div>
                )}

                {selectedLobby.teams && selectedLobby.teams.length > 0 && (
                    <div className='mb-6'>
                        <div className="text-tx-secondary text-sm uppercase tracking-wide mb-3" data-testid='teams-heading'>Teams ({selectedLobby.teams.length})</div>
                        <div className='grid gap-4 md:grid-cols-2'>
                            {selectedLobby.teams.map(team => (
                                <div key={team.id} className="rounded-md border border-border bg-tertiary px-4 py-3">
                                    <h4 className='mb-2 font-semibold text-tx-primary'>{team.name}</h4>
                                    <p className='mb-3 text-xs text-tx-secondary'>
                                        Current word index: <span className="font-mono bg-accent/30 text-accent px-1 rounded">{team.current_word_index}</span>
                                    </p>
                                    {selectedLobby.players_by_team && selectedLobby.players_by_team[team.id] && (
                                        <div>
                                            <p className='mb-2 text-xs font-medium text-tx-secondary uppercase tracking-wide'>Members:</p>
                                            <div className='flex flex-wrap gap-1'>
                                                {selectedLobby.players_by_team[team.id].map(player => (
                                                    <span
                                                        key={player.id}
                                                        className='inline-block rounded bg-blue/20 text-blue px-2 py-1 text-xs'
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
                        <div className="text-tx-secondary text-sm uppercase tracking-wide mb-3" data-testid='unassigned-players-heading'>Unassigned Players ({unassignedPlayers.length})</div>
                        <div className='space-y-2'>
                            {unassignedPlayers.map(player => (
                                <div
                                    key={player.id}
                                    data-testid={`unassigned-player-row-${player.name}`}
                                    className="rounded-md border border-orange bg-orange/20 px-4 py-3"
                                >
                                    <div className='flex items-center justify-between'>
                                        <span className='font-medium text-orange'>{player.name}</span>
                                        <div className='flex items-center gap-2'>
                                            <select
                                                data-testid={`unassigned-team-dropdown-${player.name}`}
                                                value=''
                                                onChange={e => handleMovePlayer(player.id!, parseInt(e.target.value))}
                                                disabled={movingPlayerId === player.id}
                                                className='px-2 py-1 border border-border-light bg-secondary text-tx-primary rounded text-sm cursor-pointer transition duration-200 hover:bg-secondary-light hover:border-accent focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent'
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
