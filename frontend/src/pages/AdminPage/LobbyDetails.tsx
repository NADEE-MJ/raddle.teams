import { useState, useEffect, useCallback, useRef } from 'react';
import { LobbyInfo, GameStateResponse, GameWebSocketEvents } from '@/types';
import { Modal, CopyableCode, Button, TextInput, Select, ErrorMessage, Card } from '@/components';
import { api } from '@/services/api';
import { useGlobalOutletContext } from '@/hooks/useGlobalOutletContext';
import { useDebounce } from '@/hooks/useDebounce';
import GameProgressView from './GameProgressView';

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
    const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
    const [isStartingGame, setIsStartingGame] = useState(false);

    // Game state
    const [gameState, setGameState] = useState<GameStateResponse | null>(null);
    const wsRef = useRef<WebSocket | null>(null);

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

    const loadGameState = useCallback(async () => {
        if (!adminApiToken) return;

        try {
            const state = await api.admin.lobby.getGameState(lobbyId, adminApiToken);
            setGameState(state);
        } catch (err) {
            console.error('Error loading game state:', err);
            // Don't set error - game might just not be started yet
        }
    }, [adminApiToken, lobbyId]);

    const scheduleReload = useDebounce(loadLobbyDetails);

    useEffect(() => {
        loadLobbyDetails();
        loadGameState();
    }, [loadLobbyDetails, loadGameState, refreshKey]);

    // WebSocket connection for real-time game updates
    useEffect(() => {
        if (!adminApiToken) return;

        // Connect to admin WebSocket
        const ws = new WebSocket(`/ws/admin/${adminApiToken}`);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log('[Admin] WebSocket connected');
            // Subscribe to this lobby
            ws.send(JSON.stringify({ action: 'subscribe_lobby', lobby_id: lobbyId }));
        };

        ws.onmessage = event => {
            try {
                const message = JSON.parse(event.data);
                console.log('[Admin] Received WebSocket message:', message);

                // Handle game events
                if (message.type === GameWebSocketEvents.STATE_UPDATE) {
                    // Update the specific team's progress
                    setGameState(prev => {
                        if (!prev || !prev.is_game_active) return prev;

                        const updatedTeams = prev.teams.map(team => {
                            if (team.team_id === message.team_id) {
                                return {
                                    ...team,
                                    revealed_steps: message.revealed_steps,
                                    is_completed: message.is_completed,
                                };
                            }
                            return team;
                        });

                        return {
                            ...prev,
                            teams: updatedTeams,
                        };
                    });
                } else if (message.type === GameWebSocketEvents.TEAM_COMPLETED) {
                    // Mark team as completed
                    setGameState(prev => {
                        if (!prev || !prev.is_game_active) return prev;

                        const updatedTeams = prev.teams.map(team => {
                            if (team.team_id === message.team_id) {
                                return {
                                    ...team,
                                    is_completed: true,
                                    completed_at: message.completed_at,
                                };
                            }
                            return team;
                        });

                        return {
                            ...prev,
                            teams: updatedTeams,
                        };
                    });
                } else if (message.type === GameWebSocketEvents.GAME_STARTED) {
                    // Game started, reload game state
                    loadGameState();
                } else if (message.type === GameWebSocketEvents.GAME_WON) {
                    // Game won, reload game state to mark it as inactive
                    console.log('[Admin] Game won, reloading game state');
                    loadGameState();
                }
            } catch (err) {
                console.error('[Admin] Error parsing WebSocket message:', err);
            }
        };

        ws.onerror = error => {
            console.error('[Admin] WebSocket error:', error);
        };

        ws.onclose = () => {
            console.log('[Admin] WebSocket disconnected');
        };

        return () => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ action: 'unsubscribe_lobby', lobby_id: lobbyId }));
            }
            ws.close();
            wsRef.current = null;
        };
    }, [adminApiToken, lobbyId, loadGameState]);

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

    const handleStartGame = useCallback(async () => {
        if (!adminApiToken || !selectedLobby) {
            setError(adminApiToken ? 'Lobby not selected' : 'Admin API token is required to start game');
            return;
        }

        if (!selectedLobby.teams || selectedLobby.teams.length < 2) {
            setError('Need at least 2 teams to start the game');
            return;
        }

        if (confirm(`Start the game with ${difficulty} difficulty?`)) {
            setIsStartingGame(true);
            try {
                setError('');
                const result = await api.admin.lobby.startGame(selectedLobby.lobby.id, difficulty, adminApiToken);
                console.log('Game started:', result);
                // Load game state to show progress
                await loadGameState();
            } catch (err) {
                setError('Failed to start game');
                console.error('Error starting game:', err);
            } finally {
                setIsStartingGame(false);
            }
        }
    }, [adminApiToken, selectedLobby, difficulty, loadGameState]);

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
                    </div>
                </div>

                <div className='mb-6'>
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
                            <p>
                                <strong>Total Players:</strong> {selectedLobby.players.length}
                            </p>
                        </div>
                    </Card>
                </div>

                {(!selectedLobby.teams || selectedLobby.teams.length === 0) && selectedLobby.players.length > 0 && (
                    <>
                        <div className='mb-6'>
                            <div
                                className='text-tx-secondary mb-3 text-sm tracking-wide uppercase'
                                data-testid='players-heading'
                            >
                                Players ({selectedLobby.players.length})
                            </div>
                            <Card>
                                <div className='space-y-2'>
                                    {selectedLobby.players.map(player => (
                                        <div
                                            key={player.id}
                                            data-testid={`player-row-${player.name}`}
                                            className='bg-secondary border-border flex items-center justify-between rounded border p-2'
                                        >
                                            <span className='text-tx-primary text-sm font-medium'>{player.name}</span>
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
                                    ))}
                                </div>
                            </Card>
                        </div>

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
                    </>
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
                            {selectedLobby.teams.map(team => {
                                const teamPlayers = selectedLobby.players_by_team?.[team.id] || [];
                                return (
                                    <Card key={team.id}>
                                        <h4 className='text-tx-primary mb-3 font-semibold'>{team.name}</h4>
                                        {teamPlayers.length === 0 ? (
                                            <div className='text-tx-muted py-4 text-center text-sm'>
                                                No players in this team
                                            </div>
                                        ) : (
                                            <div className='space-y-2'>
                                                {teamPlayers.map(player => (
                                                    <div
                                                        key={player.id}
                                                        data-testid={`team-player-row-${player.name}`}
                                                        className='bg-secondary border-border flex items-center justify-between rounded border p-2'
                                                    >
                                                        <span className='text-tx-primary text-sm font-medium'>
                                                            {player.name}
                                                        </span>
                                                        <div className='flex items-center gap-1'>
                                                            <Select
                                                                value={player.team_id || ''}
                                                                onChange={value =>
                                                                    handleMovePlayer(
                                                                        player.id!,
                                                                        value ? parseInt(value.toString()) : 0
                                                                    )
                                                                }
                                                                options={[
                                                                    { value: '', label: 'Unassign' },
                                                                    ...(selectedLobby.teams?.map(t => ({
                                                                        value: t.id,
                                                                        label: t.name,
                                                                    })) || []),
                                                                ]}
                                                                disabled={movingPlayerId === player.id}
                                                                data-testid={`team-move-dropdown-${player.name}`}
                                                            />
                                                            <Button
                                                                onClick={() => handleKickPlayer(player.id!)}
                                                                variant='destructive'
                                                                size='sm'
                                                                className='text-xs'
                                                                data-testid={`team-kick-button-${player.name}`}
                                                            >
                                                                Kick
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </Card>
                                );
                            })}
                        </div>
                    </div>
                )}

                {unassignedPlayers.length > 0 && selectedLobby.teams && selectedLobby.teams.length > 0 && (
                    <div className='mb-6'>
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

                {selectedLobby.teams && selectedLobby.teams.length >= 2 && !gameState?.is_game_active && (
                    <div className='mb-6'>
                        <div
                            className='text-tx-secondary mb-3 text-sm tracking-wide uppercase'
                            data-testid='start-game-heading'
                        >
                            Start Game
                        </div>
                        <Card>
                            <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
                                <div className='flex items-center gap-3'>
                                    <label className='text-tx-primary text-sm font-medium'>Difficulty:</label>
                                    <Select
                                        value={difficulty}
                                        onChange={value => setDifficulty(value as 'easy' | 'medium' | 'hard')}
                                        options={[
                                            { value: 'easy', label: 'Easy' },
                                            { value: 'medium', label: 'Medium' },
                                            { value: 'hard', label: 'Hard' },
                                        ]}
                                        disabled={gameState?.is_game_active || isStartingGame}
                                        data-testid='difficulty-select'
                                    />
                                </div>
                                <Button
                                    onClick={handleStartGame}
                                    disabled={isStartingGame || gameState?.is_game_active}
                                    variant='primary'
                                    size='md'
                                    loading={isStartingGame}
                                    data-testid='start-game-button'
                                >
                                    {isStartingGame ? 'Starting Game...' : 'Start Game'}
                                </Button>
                            </div>
                            <p className='text-tx-secondary mt-3 text-xs'>
                                Each team will receive a different word puzzle of {difficulty} difficulty. The first
                                team to complete their puzzle wins!
                            </p>
                        </Card>
                    </div>
                )}

                {/* Game Progress View */}
                {gameState && gameState.is_game_active && (
                    <div className='mb-6'>
                        <GameProgressView teams={gameState.teams} />
                    </div>
                )}
            </div>
        </Modal>
    );
}
