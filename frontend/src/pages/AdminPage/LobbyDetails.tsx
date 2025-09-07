import { useState, useEffect, useCallback } from 'react';
import { LobbyInfo } from '@/types';
import { Modal, CopyableCode, Button, TextInput, Select, ErrorMessage, Card } from '@/components';
import { api } from '@/services/api';
import { useGlobalOutletContext } from '@/hooks/useGlobalOutletContext';
import { useDebounce } from '@/hooks/useDebounce';

interface LobbyDetailsProps {
    lobbyId: number;
    onClose: () => void;
    onLobbyDeleted: () => void;
    refreshKey: number;
}

export default function LobbyDetails({ lobbyId, onClose, onLobbyDeleted, refreshKey }: LobbyDetailsProps) {
    const { adminApiToken } = useGlobalOutletContext();

    const [selectedLobby, setSelectedLobby] = useState<LobbyInfo | null>(null);
    const [numTeams, setNumTeams] = useState<number>(2);
    const [isCreatingTeams, setIsCreatingTeams] = useState(false);
    const [movingPlayerId, setMovingPlayerId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadLobbyDetails = useCallback(async () => {
        if (!adminApiToken) {
            setError('Admin API token is required to load lobby details');
            setLoading(false);
            return;
        }

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

    const scheduleReload = useDebounce(loadLobbyDetails);

    useEffect(() => {
        loadLobbyDetails();
    }, [loadLobbyDetails, refreshKey]);

    const handleCreateTeams = useCallback(async () => {
        if (!adminApiToken || !selectedLobby) {
            setError(adminApiToken ? 'Lobby not selected' : 'Admin API token is required to create teams');
            return;
        }

        setIsCreatingTeams(true);
        try {
            setError('');
            await api.admin.lobby.team.create(selectedLobby.lobby.id, numTeams, adminApiToken);
            scheduleReload();
        } catch (err) {
            setError('Failed to create teams');
            console.error('Error creating teams:', err);
        } finally {
            setIsCreatingTeams(false);
        }
    }, [adminApiToken, selectedLobby, numTeams, scheduleReload]);

    const handleMovePlayer = useCallback(
        async (playerId: number, teamId: number) => {
            if (!adminApiToken || !selectedLobby) {
                setError(adminApiToken ? 'Lobby not selected' : 'Admin API token is required to move player');
                return;
            }

            setMovingPlayerId(playerId);
            try {
                setError('');
                await api.admin.lobby.team.move(playerId, teamId, adminApiToken);
                scheduleReload();
            } catch (err) {
                setError('Failed to move player');
                console.error('Error moving player:', err);
            } finally {
                setMovingPlayerId(null);
            }
        },
        [adminApiToken, selectedLobby, scheduleReload]
    );

    const handleKickPlayer = async (playerId: number) => {
        if (!adminApiToken || !selectedLobby) {
            setError(adminApiToken ? 'Lobby not selected' : 'Admin API token is required to kick player');
            return;
        }

        if (confirm('Are you sure you want to kick this player?')) {
            try {
                setError('');
                await api.admin.lobby.player.kick(playerId, adminApiToken);
                scheduleReload();
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
        }

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

    if (loading) {
        return (
            <Modal isOpen={true} onClose={onClose} maxWidth='max-w-6xl' isLoading={true}>
                <div></div>
            </Modal>
        );
    }

    if (!selectedLobby) {
        return (
            <Modal isOpen={true} onClose={onClose} maxWidth='max-w-6xl'>
                <div className='p-6'>
                    <div className='text-tx-muted text-center'>{error || 'Lobby not found'}</div>
                </div>
            </Modal>
        );
    }

    const unassignedPlayers = selectedLobby.players.filter(player => !player.team_id);

    return (
        <Modal isOpen={true} onClose={onClose} maxWidth='max-w-6xl'>
            <div className='p-6'>
                <ErrorMessage message={error} data-testid='lobby-details-error-message' />

                <div className='mb-6 flex items-center justify-between'>
                    <div>
                        <h2 className='text-tx-primary mb-1 text-2xl font-semibold'>Lobby Details</h2>
                        <p className='text-tx-secondary'>{selectedLobby.lobby.name}</p>
                    </div>

                    <div className='grid grid-cols-2 items-center gap-2 md:grid-cols-3'>
                        <Button
                            onClick={scheduleReload}
                            disabled={loading}
                            variant='primary'
                            size='sm'
                            loading={loading}
                            data-testid='refresh-lobby-button'
                        >
                            {loading ? 'Refreshing' : 'Refresh'}
                        </Button>
                        <Button
                            onClick={handleDeleteLobby}
                            variant='destructive'
                            size='sm'
                            data-testid='delete-lobby-button'
                        >
                            Delete Lobby
                        </Button>
                        <div className='md:hidden'></div>
                        <Button
                            onClick={onClose}
                            variant='secondary'
                            size='sm'
                            data-testid='close-lobby-details-button'
                        >
                            Close
                        </Button>
                    </div>
                </div>

                <div className='mb-6 grid gap-6 md:grid-cols-2'>
                    <Card>
                        <div className='text-tx-secondary mb-3 text-sm tracking-wide uppercase'>Lobby Info</div>
                        <div className='text-tx-primary space-y-2 text-sm'>
                            <p className='flex items-center gap-2'>
                                <strong>Code:</strong>
                                <CopyableCode code={selectedLobby.lobby.code} />
                            </p>
                            <p>
                                <strong>Name:</strong> {selectedLobby.lobby.name}
                            </p>
                            <p>
                                <strong>Created:</strong>{' '}
                                {new Date(selectedLobby.lobby.created_at).toLocaleDateString()}
                            </p>
                        </div>
                    </Card>

                    <Card>
                        <div className='text-tx-secondary mb-3 text-sm tracking-wide uppercase'>
                            Players ({selectedLobby.players.length})
                        </div>
                        {selectedLobby.players.length === 0 ? (
                            <div className='text-tx-muted pt-4 pb-4 text-center'>No players in this lobby yet</div>
                        ) : (
                            <div className='max-h-48 space-y-2 overflow-y-auto'>
                                {selectedLobby.players.map(player => (
                                    <div
                                        key={player.id}
                                        data-testid={`player-row-${player.name}`}
                                        className='bg-secondary border-border flex items-center justify-between rounded border p-2'
                                    >
                                        <div className='flex items-center gap-2'>
                                            <span className='text-tx-primary text-sm font-medium'>{player.name}</span>
                                            <span
                                                className='bg-blue/20 text-blue rounded px-2 py-1 text-xs'
                                                data-testid={`team-status-${player.name}`}
                                            >
                                                {player.team_id ? `Team ${player.team_id}` : 'No team'}
                                            </span>
                                        </div>
                                        <div className='flex items-center gap-1'>
                                            {selectedLobby.teams && selectedLobby.teams.length > 0 && (
                                                <Select
                                                    value={player.team_id || ''}
                                                    onChange={value =>
                                                        handleMovePlayer(
                                                            player.id!,
                                                            value ? parseInt(value.toString()) : 0
                                                        )
                                                    }
                                                    options={[
                                                        { value: '', label: 'No team' },
                                                        ...(selectedLobby.teams?.map(team => ({
                                                            value: team.id,
                                                            label: team.name,
                                                        })) || []),
                                                    ]}
                                                    disabled={movingPlayerId === player.id}
                                                    data-testid={`team-dropdown-${player.name}`}
                                                />
                                            )}
                                            <Button
                                                onClick={() => handleKickPlayer(player.id!)}
                                                variant='destructive'
                                                size='sm'
                                                className='text-xs'
                                                data-testid={`kick-button-${player.name}`}
                                            >
                                                Kick
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>

                {(!selectedLobby.teams || selectedLobby.teams.length === 0) && selectedLobby.players.length > 0 && (
                    <div className='mb-6'>
                        <div
                            className='text-tx-secondary mb-3 text-sm tracking-wide uppercase'
                            data-testid='create-teams-heading'
                        >
                            Create Teams
                        </div>
                        <Card>
                            <div className='flex flex-col gap-3 md:flex-row md:items-center'>
                                <TextInput
                                    type='number'
                                    label='Number of teams:'
                                    value={numTeams.toString()}
                                    onChange={value => setNumTeams(parseInt(value) || 2)}
                                    className='w-20 text-sm'
                                    data-testid='num-teams-input'
                                />
                                <Button
                                    onClick={handleCreateTeams}
                                    disabled={isCreatingTeams || numTeams < 2}
                                    variant='secondary'
                                    size='sm'
                                    loading={isCreatingTeams}
                                    className='text-accent'
                                    data-testid='create-teams-button'
                                >
                                    {isCreatingTeams ? 'Creating' : 'Create Teams'}
                                </Button>
                            </div>
                            <p className='text-tx-secondary mt-2 text-xs'>
                                Players will be randomly assigned to {numTeams} teams
                            </p>
                        </Card>
                    </div>
                )}

                {selectedLobby.teams && selectedLobby.teams.length > 0 && (
                    <div className='mb-6'>
                        <div
                            className='text-tx-secondary mb-3 text-sm tracking-wide uppercase'
                            data-testid='teams-heading'
                        >
                            Teams ({selectedLobby.teams.length})
                        </div>
                        <div className='grid gap-4 md:grid-cols-2'>
                            {selectedLobby.teams.map(team => (
                                <Card key={team.id}>
                                    <h4 className='text-tx-primary mb-2 font-semibold'>{team.name}</h4>
                                    <p className='text-tx-secondary mb-3 text-xs'>
                                        Current word index:{' '}
                                        <span className='bg-accent/30 text-accent rounded px-1 font-mono'>
                                            {team.current_word_index}
                                        </span>
                                    </p>
                                    {selectedLobby.players_by_team && selectedLobby.players_by_team[team.id] && (
                                        <div>
                                            <p className='text-tx-secondary mb-2 text-xs font-medium tracking-wide uppercase'>
                                                Members:
                                            </p>
                                            <div className='flex flex-wrap gap-1'>
                                                {selectedLobby.players_by_team[team.id].map(player => (
                                                    <span
                                                        key={player.id}
                                                        className='bg-blue/20 text-blue inline-block rounded px-2 py-1 text-xs'
                                                    >
                                                        {player.name}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {unassignedPlayers.length > 0 && selectedLobby.teams && selectedLobby.teams.length > 0 && (
                    <div>
                        <div
                            className='text-tx-secondary mb-3 text-sm tracking-wide uppercase'
                            data-testid='unassigned-players-heading'
                        >
                            Unassigned Players ({unassignedPlayers.length})
                        </div>
                        <div className='space-y-2'>
                            {unassignedPlayers.map(player => (
                                <Card
                                    key={player.id}
                                    variant='warning'
                                    data-testid={`unassigned-player-row-${player.name}`}
                                >
                                    <div className='flex items-center justify-between'>
                                        <span className='text-orange font-medium'>{player.name}</span>
                                        <div className='flex items-center gap-2'>
                                            <Select
                                                value=''
                                                onChange={value =>
                                                    handleMovePlayer(player.id!, parseInt(value.toString()))
                                                }
                                                options={[
                                                    { value: '', label: 'Assign to team...' },
                                                    ...(selectedLobby.teams?.map(team => ({
                                                        value: team.id,
                                                        label: team.name,
                                                    })) || []),
                                                ]}
                                                disabled={movingPlayerId === player.id}
                                                className='text-sm'
                                                data-testid={`unassigned-team-dropdown-${player.name}`}
                                            />
                                            <Button
                                                onClick={() => handleKickPlayer(player.id!)}
                                                variant='destructive'
                                                size='sm'
                                                className='text-xs'
                                                data-testid={`unassigned-kick-button-${player.name}`}
                                            >
                                                Kick
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
