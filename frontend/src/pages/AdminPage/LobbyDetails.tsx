import { useState, useEffect, useCallback, useMemo } from 'react';
import { LobbyInfo, GameStateResponse, GameWebSocketEvents, WebSocketMessage } from '@/types';
import { Modal, CopyableCode, Button, TextInput, Select, ErrorMessage, Card, ConnectionBadge } from '@/components';
import { api, ApiError } from '@/services/api';
import { useGlobalOutletContext } from '@/hooks/useGlobalOutletContext';
import { useDebounce } from '@/hooks/useDebounce';
import { useWebSocket } from '@/hooks/useWebSocket';
import GameProgressView from './GameProgressView';

interface LobbyDetailsProps {
    lobbyId: number;
    onClose: () => void;
    onLobbyDeleted: () => void;
    refreshKey: number;
}

export default function LobbyDetails({ lobbyId, onClose, onLobbyDeleted, refreshKey }: LobbyDetailsProps) {
    const { adminApiToken, adminSessionId } = useGlobalOutletContext();

    const [selectedLobby, setSelectedLobby] = useState<LobbyInfo | null>(null);
    const [numTeams, setNumTeams] = useState<number>(2);
    const [isCreatingTeams, setIsCreatingTeams] = useState(false);
    const [movingPlayerId, setMovingPlayerId] = useState<number | null>(null);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
    const [puzzleMode, setPuzzleMode] = useState<'same' | 'different'>('different');
    const [wordCountMode, setWordCountMode] = useState<'exact' | 'balanced'>('balanced');
    const [isStartingGame, setIsStartingGame] = useState(false);
    const [isEndingGame, setIsEndingGame] = useState(false);
    const [editingTeamId, setEditingTeamId] = useState<number | null>(null);
    const [editingTeamName, setEditingTeamName] = useState('');

    // Game state
    const [gameState, setGameState] = useState<GameStateResponse | null>(null);

    const loadLobbyDetails = useCallback(async () => {
        if (!adminApiToken) {
            setError('Admin API token is required to load lobby details');
            setIsInitialLoad(false);
            return;
        }

        try {
            setIsRefreshing(true);
            setError('');
            const lobbyInfo = await api.admin.lobby.getInfo(lobbyId, adminApiToken);
            setSelectedLobby(lobbyInfo);
        } catch (err) {
            setError('Failed to load lobby details');
            console.error('Error loading lobby details:', err);
        } finally {
            setIsInitialLoad(false);
            setIsRefreshing(false);
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

    const reloadAll = useCallback(async () => {
        await loadLobbyDetails();
        await loadGameState();
    }, [loadLobbyDetails, loadGameState]);

    const scheduleReload = useDebounce(reloadAll);

    useEffect(() => {
        loadLobbyDetails();
        loadGameState();
    }, [loadLobbyDetails, loadGameState, refreshKey]);

    const onMessage = useCallback(
        (message: WebSocketMessage) => {
            console.log('[Admin] Received WebSocket message:', message);

            if (message.type === GameWebSocketEvents.STATE_UPDATE) {
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
                loadGameState();
            } else if (message.type === GameWebSocketEvents.GAME_WON) {
                console.log('[Admin] Game won, reloading game state');
                loadGameState();
            }
        },
        [loadGameState]
    );

    const onError = useCallback((event: Event) => {
        console.error('[Admin] WebSocket error:', event);
    }, []);

    const onDisconnect = useCallback(() => {
        console.log('[Admin] WebSocket disconnected');
    }, []);

    const onConnect = useCallback(() => {
        console.log('[Admin] WebSocket connected');
    }, []);

    const wsUrl = useMemo(
        () => (adminSessionId && adminApiToken ? `/ws/admin/${adminSessionId}?token=${adminApiToken}` : ''),
        [adminSessionId, adminApiToken]
    );

    const { isConnected: isWsConnected, sendMessage } = useWebSocket(wsUrl, {
        onMessage,
        onConnect,
        onDisconnect,
        onError,
        autoReconnect: true,
    });

    useEffect(() => {
        if (!sendMessage || !isWsConnected) return;

        sendMessage({ action: 'subscribe_lobby', lobby_id: lobbyId });

        return () => {
            sendMessage({ action: 'unsubscribe_lobby', lobby_id: lobbyId });
        };
    }, [isWsConnected, lobbyId, sendMessage]);

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

    const handleUpdateTeamName = useCallback(
        async (teamId: number) => {
            if (!adminApiToken || !selectedLobby || !editingTeamName.trim()) {
                setEditingTeamId(null);
                setEditingTeamName('');
                return;
            }

            try {
                setError('');
                await api.admin.lobby.team.updateName(teamId, editingTeamName.trim(), adminApiToken);
                setEditingTeamId(null);
                setEditingTeamName('');
                scheduleReload();
            } catch (err) {
                setError('Failed to update team name');
                console.error('Error updating team name:', err);
            }
        },
        [adminApiToken, selectedLobby, editingTeamName, scheduleReload]
    );

    const handleStartTeamNameEdit = (teamId: number, currentName: string) => {
        setEditingTeamId(teamId);
        setEditingTeamName(currentName);
    };

    const handleCancelTeamNameEdit = () => {
        setEditingTeamId(null);
        setEditingTeamName('');
    };

    const handleStartGame = useCallback(async () => {
        if (!adminApiToken || !selectedLobby) {
            setError(adminApiToken ? 'Lobby not selected' : 'Admin API token is required to start game');
            return;
        }

        if (!selectedLobby.teams || selectedLobby.teams.length < 2) {
            setError('Need at least 2 teams to start the game');
            return;
        }

        const puzzleModeLabel = puzzleMode === 'same' ? 'the same puzzle' : 'different puzzles';
        const wordCountLabel = wordCountMode === 'exact' ? 'exact word count' : 'balanced (±1 word)';
        const confirmMessage = `Start the game with ${difficulty} difficulty?\n\nPuzzles: ${puzzleModeLabel}\nWord count: ${wordCountLabel}`;

        if (confirm(confirmMessage)) {
            setIsStartingGame(true);
            try {
                setError('');
                const result = await api.admin.lobby.startGame(
                    selectedLobby.lobby.id,
                    difficulty,
                    puzzleMode,
                    wordCountMode,
                    adminApiToken
                );
                console.log('Game started:', result);
                // Load game state to show progress
                await loadGameState();
            } catch (err) {
                const message =
                    err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Failed to start game';
                setError(message);
                console.error('Error starting game:', err);
            } finally {
                setIsStartingGame(false);
            }
        }
    }, [adminApiToken, selectedLobby, difficulty, puzzleMode, wordCountMode, loadGameState]);

    const handleEndGame = useCallback(async () => {
        if (!adminApiToken || !selectedLobby) {
            setError(adminApiToken ? 'Lobby not selected' : 'Admin API token is required to end game');
            return;
        }

        if (!gameState?.is_game_active) {
            setError('No active game to end');
            return;
        }

        if (confirm('Are you sure you want to end the current game? This will reset all team progress.')) {
            setIsEndingGame(true);
            try {
                setError('');
                const result = await api.admin.lobby.endGame(selectedLobby.lobby.id, adminApiToken);
                console.log('Game ended:', result);
                // Reload lobby and game state
                await reloadAll();
            } catch (err) {
                const message =
                    err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Failed to end game';
                setError(message);
                console.error('Error ending game:', err);
            } finally {
                setIsEndingGame(false);
            }
        }
    }, [adminApiToken, selectedLobby, gameState, reloadAll]);

    if (isInitialLoad) {
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

                <div className='mb-6 flex flex-col gap-4'>
                    <div className='flex items-center justify-between'>
                        <div>
                            <h2 className='text-tx-primary mb-1 text-2xl font-semibold'>Lobby Details</h2>
                            <p className='text-tx-secondary'>{selectedLobby.lobby.name}</p>
                        </div>

                        <div className='flex items-center gap-3'>
                            <Button
                                onClick={scheduleReload}
                                disabled={isRefreshing}
                                variant='primary'
                                size='lg'
                                loading={isRefreshing}
                                data-testid='refresh-lobby-button'
                            >
                                {isRefreshing ? 'Refreshing...' : 'Refresh'}
                            </Button>
                            <Button
                                onClick={handleDeleteLobby}
                                variant='destructive'
                                size='lg'
                                data-testid='delete-lobby-button'
                            >
                                Delete Lobby
                            </Button>
                        </div>
                    </div>
                    <div className='flex justify-end'>
                        <ConnectionBadge
                            isConnected={isWsConnected}
                            connectedText='Connected to lobby'
                            disconnectedText='Reconnecting...'
                        />
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
                                const isEditing = editingTeamId === team.id;
                                return (
                                    <Card key={team.id}>
                                        <div className='mb-3 flex items-center justify-between gap-2'>
                                            {isEditing ? (
                                                <div className='flex flex-1 items-center gap-2'>
                                                    <TextInput
                                                        value={editingTeamName}
                                                        onChange={setEditingTeamName}
                                                        className='text-sm'
                                                        autoFocus
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') {
                                                                handleUpdateTeamName(team.id);
                                                            } else if (e.key === 'Escape') {
                                                                handleCancelTeamNameEdit();
                                                            }
                                                        }}
                                                        data-testid={`edit-team-name-input-${team.id}`}
                                                    />
                                                    <Button
                                                        onClick={() => handleUpdateTeamName(team.id)}
                                                        variant='primary'
                                                        size='sm'
                                                        className='text-xs'
                                                        data-testid={`save-team-name-button-${team.id}`}
                                                    >
                                                        Save
                                                    </Button>
                                                    <Button
                                                        onClick={handleCancelTeamNameEdit}
                                                        variant='secondary'
                                                        size='sm'
                                                        className='text-xs'
                                                        data-testid={`cancel-team-name-button-${team.id}`}
                                                    >
                                                        Cancel
                                                    </Button>
                                                </div>
                                            ) : (
                                                <>
                                                    <h4
                                                        className='text-tx-primary font-semibold'
                                                        data-testid={`team-name-${team.id}`}
                                                    >
                                                        {team.name}
                                                    </h4>
                                                    <Button
                                                        onClick={() => handleStartTeamNameEdit(team.id, team.name)}
                                                        variant='secondary'
                                                        size='sm'
                                                        className='text-xs'
                                                        data-testid={`edit-team-name-button-${team.id}`}
                                                    >
                                                        Edit
                                                    </Button>
                                                </>
                                            )}
                                        </div>
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
                            <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
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
                                <div className='flex items-center gap-3'>
                                    <label className='text-tx-primary text-sm font-medium'>Puzzle Mode:</label>
                                    <Select
                                        value={puzzleMode}
                                        onChange={value => setPuzzleMode(value as 'same' | 'different')}
                                        options={[
                                            { value: 'different', label: 'Different Puzzles' },
                                            { value: 'same', label: 'Same Puzzle' },
                                        ]}
                                        disabled={gameState?.is_game_active || isStartingGame}
                                        data-testid='puzzle-mode-select'
                                    />
                                </div>
                                <div className='flex items-center gap-3'>
                                    <label className='text-tx-primary text-sm font-medium'>Word Count:</label>
                                    <Select
                                        value={wordCountMode}
                                        onChange={value => setWordCountMode(value as 'exact' | 'balanced')}
                                        options={[
                                            { value: 'balanced', label: 'Balanced (±1)' },
                                            { value: 'exact', label: 'Exact Match' },
                                        ]}
                                        disabled={gameState?.is_game_active || isStartingGame || puzzleMode === 'same'}
                                        data-testid='word-count-mode-select'
                                    />
                                </div>
                            </div>
                            <div className='mt-4 flex justify-end'>
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
                                {puzzleMode === 'same'
                                    ? `All teams will receive the same ${difficulty} puzzle. First team to finish wins!`
                                    : `Each team will receive a different ${difficulty} puzzle with ${
                                          wordCountMode === 'exact' ? 'the exact same' : 'similar (±1)'
                                      } word count. First team to finish wins!`}
                            </p>
                        </Card>
                    </div>
                )}

                {/* Game Progress View */}
                {gameState && gameState.is_game_active && (
                    <div className='mb-6'>
                        <div className='mb-4 flex items-center justify-between'>
                            <div
                                className='text-tx-secondary text-sm tracking-wide uppercase'
                                data-testid='game-progress-heading'
                            >
                                Game In Progress
                            </div>
                            <Button
                                onClick={handleEndGame}
                                disabled={isEndingGame}
                                variant='destructive'
                                size='md'
                                loading={isEndingGame}
                                data-testid='end-game-button'
                            >
                                {isEndingGame ? 'Ending Game...' : 'End Game'}
                            </Button>
                        </div>
                        <GameProgressView teams={gameState.teams} />
                    </div>
                )}
            </div>
        </Modal>
    );
}
