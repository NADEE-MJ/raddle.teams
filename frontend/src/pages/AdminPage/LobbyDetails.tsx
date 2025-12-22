import { useState, useEffect, useCallback, useMemo } from 'react';
import { LobbyInfo, GameStateResponse, GameWebSocketEvents, LobbyWebSocketEvents, WebSocketMessage } from '@/types';
import { Modal, CopyableCode, Button, TextInput, Select, ErrorMessage, Card, ConnectionBadge } from '@/components';
import { TeamLeaderboard } from '@/components/TeamLeaderboard';
import { api, ApiError } from '@/services/api';
import { useGlobalOutletContext } from '@/hooks/useGlobalOutletContext';
import { useDebounce } from '@/hooks/useDebounce';
import { useWebSocket } from '@/hooks/useWebSocket';
import GameProgressView from './GameProgressView';
import { RoundSummary } from './RoundSummary';

const MIN_TEAMS = 2;
const MAX_TEAMS = 10;

interface LobbyDetailsProps {
    lobbyId: number;
    onClose: () => void;
    onLobbyDeleted: () => void;
    refreshKey: number;
}

export default function LobbyDetails({ lobbyId, onClose, onLobbyDeleted, refreshKey }: LobbyDetailsProps) {
    const { adminApiToken, adminSessionId } = useGlobalOutletContext();

    const [selectedLobby, setSelectedLobby] = useState<LobbyInfo | null>(null);
    const [numTeams, setNumTeams] = useState<number>(MIN_TEAMS);
    const [isCreatingTeams, setIsCreatingTeams] = useState(false);
    const [movingPlayerId, setMovingPlayerId] = useState<number | null>(null);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
    const [puzzleMode, setPuzzleMode] = useState<'same' | 'different'>('same');
    const [wordCountMode, setWordCountMode] = useState<'exact' | 'balanced'>('balanced');
    const [isStartingGame, setIsStartingGame] = useState(false);
    const [isEndingGame, setIsEndingGame] = useState(false);
    const [isAddingTeam, setIsAddingTeam] = useState(false);
    const [removingTeamId, setRemovingTeamId] = useState<number | null>(null);
    const [editingTeamId, setEditingTeamId] = useState<number | null>(null);
    const [editingTeamName, setEditingTeamName] = useState('');
    const [viewingRoundGameId, setViewingRoundGameId] = useState<number | null>(null);
    const [allRounds, setAllRounds] = useState<{ round_number: number; game_id: number }[]>([]);
    const [leaderboardRefreshKey, setLeaderboardRefreshKey] = useState(0);

    // Game state
    const [gameState, setGameState] = useState<GameStateResponse | null>(null);

    // Timer state
    const [timerMinutes, setTimerMinutes] = useState<number>(3); // Default 3 minutes
    const [timerSeconds, setTimerSeconds] = useState<number>(0); // Default 0 seconds
    const [isTimerActive, setIsTimerActive] = useState(false);
    const [timerExpiresAt, setTimerExpiresAt] = useState<string | null>(null);
    const [timeRemaining, setTimeRemaining] = useState<number>(0); // seconds
    const [isStartingTimer, setIsStartingTimer] = useState(false);

    const maxTeamsAllowed = useMemo(() => {
        if (!selectedLobby) return MAX_TEAMS;
        const playerCount = selectedLobby.players.length;
        const currentTeams = selectedLobby.teams?.length || MIN_TEAMS;
        const playerBound = playerCount >= MIN_TEAMS ? playerCount : MIN_TEAMS;
        return Math.min(Math.max(currentTeams, playerBound), MAX_TEAMS);
    }, [selectedLobby]);

    const clampTeamCount = useCallback(
        (value: number) => {
            const sanitized = Number.isFinite(value) ? value : MIN_TEAMS;
            const lowerBounded = Math.max(MIN_TEAMS, sanitized);
            return Math.min(lowerBounded, maxTeamsAllowed);
        },
        [maxTeamsAllowed]
    );

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

    const loadAllRounds = useCallback(async () => {
        if (!adminApiToken) return;

        try {
            const rounds = await api.admin.lobby.getAllRounds(lobbyId, adminApiToken);
            setAllRounds(rounds);
        } catch (err) {
            console.error('Error loading rounds:', err);
            // Don't set error - might not have any rounds yet
        }
    }, [adminApiToken, lobbyId]);

    const loadTimerState = useCallback(async () => {
        if (!adminApiToken) return;

        try {
            const timerState = await api.admin.lobby.getTimerState(lobbyId, adminApiToken);
            if (timerState.is_active && timerState.expires_at) {
                setIsTimerActive(true);
                setTimerExpiresAt(timerState.expires_at);
            } else {
                setIsTimerActive(false);
                setTimerExpiresAt(null);
            }
        } catch (err) {
            console.error('Error loading timer state:', err);
            // Don't set error - timer might not be active
        }
    }, [adminApiToken, lobbyId]);

    const reloadAll = useCallback(async () => {
        await loadLobbyDetails();
        await loadGameState();
        await loadAllRounds();
        await loadTimerState();
        setLeaderboardRefreshKey(prev => prev + 1);
    }, [loadLobbyDetails, loadGameState, loadAllRounds, loadTimerState]);

    const scheduleReload = useDebounce(reloadAll);

    useEffect(() => {
        loadLobbyDetails();
        loadGameState();
        loadAllRounds();
        loadTimerState();
    }, [loadLobbyDetails, loadGameState, loadAllRounds, loadTimerState, refreshKey]);

    useEffect(() => {
        setNumTeams(prev => clampTeamCount(prev));
    }, [clampTeamCount]);

    // Timer countdown effect
    useEffect(() => {
        if (!isTimerActive || !timerExpiresAt) {
            setTimeRemaining(0);
            return;
        }

        const updateTimer = () => {
            const now = new Date().getTime();
            const expiry = new Date(timerExpiresAt).getTime();
            const remaining = Math.max(0, Math.floor((expiry - now) / 1000));

            setTimeRemaining(remaining);

            if (remaining <= 0) {
                setIsTimerActive(false);
                setTimerExpiresAt(null);
            }
        };

        // Update immediately
        updateTimer();

        // Then update every second
        const interval = setInterval(updateTimer, 1000);

        return () => clearInterval(interval);
    }, [isTimerActive, timerExpiresAt]);

    const onMessage = useCallback(
        (message: WebSocketMessage) => {
            console.log('[Admin] Received WebSocket message:', message);

            switch (message.type) {
                case GameWebSocketEvents.STATE_UPDATE:
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
                    break;
                case GameWebSocketEvents.TEAM_COMPLETED:
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
                    break;
                case GameWebSocketEvents.TEAM_PLACED:
                    // Log placement for now - UI will be added in Phase 7
                    console.log('[Admin] Team placed:', {
                        team_name: message.team_name,
                        placement: message.placement,
                        points_earned: message.points_earned,
                        first_place_team_name: message.first_place_team_name,
                    });
                    break;
                case 'timer_started':
                    console.log('[Admin] Timer started:', message);
                    setIsTimerActive(true);
                    setTimerExpiresAt(message.expires_at);
                    break;
                case 'timer_expired':
                    console.log('[Admin] Timer expired');
                    setIsTimerActive(false);
                    setTimerExpiresAt(null);
                    setTimeRemaining(0);
                    break;
                case GameWebSocketEvents.GAME_STARTED:
                case GameWebSocketEvents.GAME_WON:
                    loadGameState();
                    break;
                case 'round_ended':
                case 'new_round_started':
                    // Reload everything when a round ends or starts
                    reloadAll();
                    break;
                case LobbyWebSocketEvents.CONNECTION_CONFIRMED:
                case LobbyWebSocketEvents.PLAYER_JOINED:
                case LobbyWebSocketEvents.TEAM_ASSIGNED:
                case LobbyWebSocketEvents.TEAM_CHANGED:
                case LobbyWebSocketEvents.DISCONNECTED:
                case LobbyWebSocketEvents.PLAYER_KICKED:
                case LobbyWebSocketEvents.READY_STATUS_CHANGED:
                    // Keep lobby details in sync when players join/leave or teams change
                    scheduleReload();
                    break;
                default:
                    console.log('[Admin] Unhandled WebSocket message:', message.type);
                    break;
            }
        },
        [loadGameState, scheduleReload, reloadAll]
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

    const {
        isConnected: isWsConnected,
        connectionStatus,
        sendMessage,
    } = useWebSocket(wsUrl, {
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

    const handleStepTeams = useCallback(
        (delta: number) => {
            setNumTeams(prev => clampTeamCount(prev + delta));
        },
        [clampTeamCount]
    );

    const hasActiveGame = useMemo(() => Boolean(gameState?.is_game_active), [gameState]);

    const anyTeamCompleted = useMemo(() => {
        if (!gameState?.teams) return false;
        return gameState.teams.some(team => team.is_completed);
    }, [gameState]);

    const formatTimer = useCallback((seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }, []);

    const handleAddTeam = useCallback(async () => {
        if (!adminApiToken || !selectedLobby) {
            setError(adminApiToken ? 'Lobby not selected' : 'Admin API token is required to add teams');
            return;
        }

        const existingTeams = selectedLobby.teams?.length ?? 0;
        if (existingTeams >= maxTeamsAllowed) {
            setError(`Maximum of ${maxTeamsAllowed} teams reached`);
            return;
        }

        if (hasActiveGame) {
            setError('Cannot modify teams while a game is active');
            return;
        }

        setIsAddingTeam(true);
        try {
            setError('');
            await api.admin.lobby.team.addOne(selectedLobby.lobby.id, adminApiToken);
            await reloadAll();
        } catch (err) {
            const message = err instanceof ApiError ? err.message : 'Failed to add team';
            setError(message);
            console.error('Error adding team:', err);
        } finally {
            setIsAddingTeam(false);
        }
    }, [adminApiToken, selectedLobby, maxTeamsAllowed, hasActiveGame, reloadAll]);

    const handleRemoveTeam = useCallback(
        async (teamId: number, teamName: string) => {
            if (!adminApiToken || !selectedLobby) {
                setError(adminApiToken ? 'Lobby not selected' : 'Admin API token is required to remove team');
                return;
            }

            if (hasActiveGame) {
                setError('Cannot modify teams while a game is active');
                return;
            }

            const currentTeams = selectedLobby.teams?.length ?? 0;
            if (currentTeams <= MIN_TEAMS) {
                setError(`Need at least ${MIN_TEAMS} teams to keep the game running`);
                return;
            }

            if (
                !confirm(`Remove ${teamName}? Players on this team will be unassigned so you can place them elsewhere.`)
            ) {
                return;
            }

            setRemovingTeamId(teamId);
            try {
                setError('');
                await api.admin.lobby.team.remove(teamId, adminApiToken);
                await reloadAll();
            } catch (err) {
                const message = err instanceof ApiError ? err.message : 'Failed to remove team';
                setError(message);
                console.error('Error removing team:', err);
            } finally {
                setRemovingTeamId(null);
            }
        },
        [adminApiToken, selectedLobby, hasActiveGame, reloadAll]
    );

    const allPlayersReady = useMemo(() => {
        if (!selectedLobby?.players) return false;
        const playersWithTeams = selectedLobby.players.filter(p => p.team_id !== null);
        if (playersWithTeams.length === 0) return false;
        return playersWithTeams.every(p => p.is_ready);
    }, [selectedLobby]);

    const notReadyPlayers = useMemo(() => {
        if (!selectedLobby?.players) return [];
        return selectedLobby.players.filter(p => p.team_id !== null && !p.is_ready).map(p => p.name);
    }, [selectedLobby]);

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
                // Clear timer state when manually ending game
                setIsTimerActive(false);
                setTimerExpiresAt(null);
                setTimeRemaining(0);
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

    const handleStartTimer = useCallback(async () => {
        if (!adminApiToken || !selectedLobby) {
            setError(adminApiToken ? 'Lobby not selected' : 'Admin API token is required to start timer');
            return;
        }

        if (!gameState?.is_game_active) {
            setError('No active game to start timer for');
            return;
        }

        if (isTimerActive) {
            setError('Timer is already running');
            return;
        }

        setIsStartingTimer(true);
        try {
            setError('');
            const result = await api.admin.lobby.startTimer(
                selectedLobby.lobby.id,
                timerMinutes,
                timerSeconds,
                adminApiToken
            );
            console.log('Timer started:', result);
        } catch (err) {
            const message =
                err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Failed to start timer';
            setError(message);
            console.error('Error starting timer:', err);
        } finally {
            setIsStartingTimer(false);
        }
    }, [adminApiToken, selectedLobby, gameState, isTimerActive, timerMinutes, timerSeconds]);

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
    const teamCount = selectedLobby.teams?.length || 0;
    const teamLimitReached = teamCount >= maxTeamsAllowed;
    const atMinimumTeams = teamCount <= MIN_TEAMS;

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
                                loadingIndicatorPlacement='left'
                                data-testid='refresh-lobby-button'
                            >
                                Refresh
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
                        <ConnectionBadge connectionStatus={connectionStatus} connectedText='Connected to lobby' />
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

                {/* Tournament Leaderboard */}
                {adminApiToken && allRounds.length > 0 && (
                    <div className='mb-6'>
                        <div className='mb-3 flex items-center justify-between'>
                            <div className='text-tx-secondary text-sm tracking-wide uppercase'>
                                Tournament Standings
                            </div>
                            {allRounds.length > 0 && (
                                <div className='flex items-center gap-3'>
                                    <label className='text-tx-primary text-sm font-medium'>View Round:</label>
                                    <Select
                                        value=''
                                        onChange={value => {
                                            if (value) {
                                                setViewingRoundGameId(parseInt(value.toString()));
                                            }
                                        }}
                                        options={[
                                            { value: '', label: 'Select a round...' },
                                            ...allRounds.map(r => ({
                                                value: r.game_id,
                                                label: `Round ${r.round_number}`,
                                            })),
                                        ]}
                                        data-testid='round-select'
                                    />
                                </div>
                            )}
                        </div>
                        <TeamLeaderboard
                            lobbyId={lobbyId}
                            adminToken={adminApiToken}
                            onViewLastRound={gameId => setViewingRoundGameId(gameId)}
                            refreshKey={leaderboardRefreshKey}
                        />
                    </div>
                )}

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
                                <div className='flex flex-col gap-4'>
                                    <div className='flex flex-wrap items-center justify-between gap-3'>
                                        <div className='flex items-center gap-3'>
                                            <span className='text-tx-primary text-sm font-medium'>Number of teams</span>
                                            <div className='bg-tertiary border-border flex items-center gap-1 rounded-md border px-2 py-1'>
                                                <Button
                                                    onClick={() => handleStepTeams(-1)}
                                                    disabled={isCreatingTeams || numTeams <= MIN_TEAMS}
                                                    variant='secondary'
                                                    size='sm'
                                                    className='text-xs'
                                                    data-testid='decrease-num-teams'
                                                >
                                                    -
                                                </Button>
                                                <div
                                                    className='text-tx-primary w-12 text-center text-sm font-semibold'
                                                    data-testid='num-teams-display'
                                                >
                                                    {numTeams}
                                                </div>
                                                <Button
                                                    onClick={() => handleStepTeams(1)}
                                                    disabled={isCreatingTeams || numTeams >= maxTeamsAllowed}
                                                    variant='secondary'
                                                    size='sm'
                                                    className='text-xs'
                                                    data-testid='increase-num-teams'
                                                >
                                                    +
                                                </Button>
                                            </div>
                                            <span className='text-tx-secondary text-xs'>
                                                Min {MIN_TEAMS} · Max {maxTeamsAllowed}
                                            </span>
                                        </div>
                                        <Button
                                            onClick={handleCreateTeams}
                                            disabled={isCreatingTeams || numTeams < MIN_TEAMS}
                                            variant='primary'
                                            size='sm'
                                            loading={isCreatingTeams}
                                            className='text-accent'
                                            data-testid='create-teams-button'
                                        >
                                            Create Teams
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </>
                )}

                {selectedLobby.teams && selectedLobby.teams.length > 0 && (
                    <div className='mb-6'>
                        <div className='mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                            <div
                                className='text-tx-secondary text-sm tracking-wide uppercase'
                                data-testid='teams-heading'
                            >
                                Teams ({selectedLobby.teams.length})
                            </div>
                            <div className='flex flex-wrap items-center gap-2'>
                                <Button
                                    onClick={handleAddTeam}
                                    disabled={isAddingTeam || teamLimitReached || hasActiveGame}
                                    variant='primary'
                                    size='sm'
                                    loading={isAddingTeam}
                                    loadingIndicatorPlacement='left'
                                    data-testid='add-team-button'
                                >
                                    Add Team
                                </Button>
                                <div className='text-tx-secondary text-xs'>
                                    Max {maxTeamsAllowed} teams · min {MIN_TEAMS} teams
                                </div>
                            </div>
                        </div>
                        <div className='grid gap-4 md:grid-cols-2'>
                            {selectedLobby.teams.map(team => {
                                const teamPlayers = selectedLobby.players_by_team?.[team.id] || [];
                                const isEditing = editingTeamId === team.id;
                                return (
                                    <Card key={team.id}>
                                        <div className='mb-3 flex flex-wrap items-center justify-between gap-2'>
                                            <div className='flex flex-1 items-center gap-2'>
                                                {isEditing ? (
                                                    <>
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
                                                    </>
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
                                            <Button
                                                onClick={() => handleRemoveTeam(team.id, team.name)}
                                                disabled={removingTeamId === team.id || atMinimumTeams || hasActiveGame}
                                                variant='destructive'
                                                size='sm'
                                                loading={removingTeamId === team.id}
                                                loadingIndicatorPlacement='left'
                                                className='text-xs'
                                                data-testid={`remove-team-button-${team.id}`}
                                            >
                                                Remove
                                            </Button>
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
                                                        <div className='flex items-center gap-2'>
                                                            <span className='text-tx-primary text-sm font-medium'>
                                                                {player.name}
                                                            </span>
                                                            {player.is_ready ? (
                                                                <span
                                                                    className='text-green text-xs font-semibold'
                                                                    title='Ready'
                                                                >
                                                                    ✓ Ready
                                                                </span>
                                                            ) : (
                                                                <span className='text-tx-muted text-xs'>Not ready</span>
                                                            )}
                                                        </div>
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
                            <div className='mt-4 flex flex-col items-end gap-2'>
                                <Button
                                    onClick={handleStartGame}
                                    disabled={isStartingGame || gameState?.is_game_active || !allPlayersReady}
                                    variant='primary'
                                    size='md'
                                    loading={isStartingGame}
                                    loadingIndicatorPlacement='left'
                                    data-testid='start-game-button'
                                >
                                    Start Game
                                </Button>
                                {!allPlayersReady && notReadyPlayers.length > 0 && (
                                    <p className='text-orange text-xs'>
                                        Waiting for players to ready up: {notReadyPlayers.join(', ')}
                                    </p>
                                )}
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
                            <div className='flex gap-2'>
                                <Button
                                    onClick={handleEndGame}
                                    disabled={isEndingGame}
                                    variant='destructive'
                                    size='md'
                                    loading={isEndingGame}
                                    loadingIndicatorPlacement='left'
                                    data-testid='end-game-button'
                                >
                                    End Game
                                </Button>
                            </div>
                        </div>

                        {/* Timer Controls */}
                        {anyTeamCompleted && (
                            <Card className='mb-4'>
                                <div className='flex flex-wrap items-center justify-between gap-4'>
                                    <div className='flex items-center gap-3'>
                                        <div className='text-tx-secondary text-sm font-semibold'>Round Timer</div>
                                        {isTimerActive ? (
                                            <div
                                                className={`text-lg font-bold ${timeRemaining < 60 ? 'text-red' : 'text-orange'}`}
                                            >
                                                {formatTimer(timeRemaining)}
                                            </div>
                                        ) : (
                                            <>
                                                <div className='flex items-center gap-2'>
                                                    <TextInput
                                                        type='number'
                                                        value={timerMinutes.toString()}
                                                        onChange={e => {
                                                            const val = parseInt(e.target.value) || 0;
                                                            setTimerMinutes(Math.max(0, Math.min(60, val)));
                                                        }}
                                                        min={0}
                                                        max={60}
                                                        disabled={isTimerActive || isStartingTimer}
                                                        placeholder='Min'
                                                        className='w-20'
                                                        data-testid='timer-minutes-input'
                                                    />
                                                    <span className='text-tx-secondary text-sm'>min</span>
                                                    <TextInput
                                                        type='number'
                                                        value={timerSeconds.toString()}
                                                        onChange={e => {
                                                            const val = parseInt(e.target.value) || 0;
                                                            setTimerSeconds(Math.max(0, Math.min(59, val)));
                                                        }}
                                                        min={0}
                                                        max={59}
                                                        disabled={isTimerActive || isStartingTimer}
                                                        placeholder='Sec'
                                                        className='w-20'
                                                        data-testid='timer-seconds-input'
                                                    />
                                                    <span className='text-tx-secondary text-sm'>sec</span>
                                                </div>
                                                <Button
                                                    onClick={handleStartTimer}
                                                    disabled={
                                                        isTimerActive ||
                                                        isStartingTimer ||
                                                        (timerMinutes === 0 && timerSeconds === 0)
                                                    }
                                                    variant='primary'
                                                    size='sm'
                                                    loading={isStartingTimer}
                                                    loadingIndicatorPlacement='left'
                                                    data-testid='start-timer-button'
                                                >
                                                    Start Timer
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                    {isTimerActive && (
                                        <div className='text-tx-muted text-xs'>
                                            Game will auto-end when timer expires
                                        </div>
                                    )}
                                </div>
                            </Card>
                        )}

                        <GameProgressView teams={gameState.teams} />
                    </div>
                )}
            </div>

            {/* Round Summary Modal */}
            {viewingRoundGameId && adminApiToken && (
                <RoundSummary
                    lobbyId={lobbyId}
                    gameId={viewingRoundGameId}
                    adminToken={adminApiToken}
                    onClose={() => setViewingRoundGameId(null)}
                />
            )}
        </Modal>
    );
}
