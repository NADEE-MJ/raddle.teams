import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useGlobalOutletContext } from '@/hooks/useGlobalOutletContext';
import { useDebounce } from '@/hooks/useDebounce';
import { WebSocketMessage, LobbyWebSocketEvents, GameWebSocketEvents, Player, LobbyInfo } from '@/types';
import { LoadingSpinner, CopyableCode, Button, ErrorMessage, StatusIndicator, Alert } from '@/components';

export default function LobbyPage() {
    const navigate = useNavigate();
    const { sessionId, setSessionId } = useGlobalOutletContext();

    const [player, setPlayer] = useState<Player | null>(null);
    const [lobbyInfo, setLobbyInfo] = useState<LobbyInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [wsError, setWsError] = useState<string | null>(null);

    useEffect(() => {
        if (!sessionId) {
            navigate('/');
            return;
        }
        refreshLobbyInfo();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const refreshLobbyInfo = useCallback(async () => {
        if (!sessionId) {
            setError('No session ID found. Please log in again.');
            console.error('No session ID found when trying to refresh lobby info');
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);
            const playerData = await api.player.lobby.activeUser(sessionId);
            setPlayer(playerData);

            const lobbyInfoData = await api.player.lobby.getLobbyInfo(playerData.lobby_id, sessionId);
            setLobbyInfo(lobbyInfoData);

            // Check if game is already started - if so, redirect to game page
            if (playerData.team_id) {
                try {
                    const puzzleData = await api.player.game.getPuzzle(sessionId);
                    if (puzzleData && puzzleData.puzzle) {
                        console.log('[LobbyPage] Game already in progress, redirecting to game page');
                        navigate('/game');
                        return;
                    }
                } catch (err) {
                    // No active game yet, stay on lobby page
                    console.log('[LobbyPage] No active game found, staying on lobby page');
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch lobby data');
        } finally {
            setIsLoading(false);
        }
    }, [sessionId, navigate]);

    const scheduleReload = useDebounce(refreshLobbyInfo);

    const onConnect = useCallback(() => {
        console.log('Lobby WebSocket connected');
        setWsError(null);
    }, []);

    const onDisconnect = useCallback(() => {
        console.log('Lobby WebSocket disconnected');
    }, []);

    const onError = useCallback((error: Event) => {
        console.error('Lobby WebSocket error:', error);
        setWsError('WebSocket connection failed');
    }, []);

    const onMessage = useCallback(
        (message: WebSocketMessage) => {
            console.log('Lobby WebSocket message received:', message);

            switch (message.type) {
                case LobbyWebSocketEvents.CONNECTION_CONFIRMED:
                    console.log('Connection confirmed to lobby');
                    scheduleReload();
                    break;
                case LobbyWebSocketEvents.TEAM_ASSIGNED:
                case LobbyWebSocketEvents.TEAM_CHANGED:
                    console.log('Team assignment changed');
                    scheduleReload();
                    break;
                case LobbyWebSocketEvents.DISCONNECTED:
                    console.log('Player disconnected');
                    scheduleReload();
                    break;
                case LobbyWebSocketEvents.PLAYER_KICKED:
                    // Check if it was us or another player
                    if (message.player_session_id === sessionId) {
                        // We were kicked
                        alert('You have been kicked from the lobby by an admin.');
                        setSessionId(null);
                        setPlayer(null);
                        setLobbyInfo(null);
                        navigate('/');
                        return;
                    } else {
                        // Another player was kicked, refresh lobby info
                        console.log('Another player was kicked, refreshing lobby');
                        scheduleReload();
                    }
                    break;
                case GameWebSocketEvents.GAME_STARTED:
                    console.log('Game started! Navigating to game page...');
                    // Navigate to game page
                    navigate('/game', {
                        state: {
                            player,
                            lobbyInfo,
                            gameStartedEvent: message,
                        },
                    });
                    return;
                default:
                    console.log('Unknown lobby WebSocket message type:', message.type);
                    scheduleReload();
            }
        },
        [scheduleReload, setSessionId, navigate, player, lobbyInfo]
    );

    const wsUrl = useMemo(
        () => (player?.lobby_id && sessionId ? `/ws/lobby/${player.lobby_id}/player/${sessionId}` : ''),
        [player?.lobby_id, sessionId]
    );

    const { isConnected } = useWebSocket(wsUrl, {
        onConnect,
        onDisconnect,
        onError,
        onMessage,
        autoReconnect: true,
    });

    if (isLoading) {
        return <LoadingSpinner />;
    }

    if (error || !lobbyInfo || !player) {
        return (
            <div className='text-center'>
                <h1 className='text-tx-primary mb-6 text-3xl font-bold'>Error</h1>
                <p className='text-red mb-6 text-lg'>{error || 'Failed to load lobby information'}</p>
                <Button
                    onClick={() => navigate('/')}
                    variant='primary'
                    size='lg'
                    className='px-6 py-3'
                    data-testid='lobby-error-back-to-home-button'
                >
                    Back to Home
                </Button>
            </div>
        );
    }

    return (
        <div>
            <div className='mb-6'>
                <div className='mb-2 flex items-center justify-between'>
                    <h1 className='text-tx-primary text-3xl font-bold'>{lobbyInfo.lobby.name}</h1>
                    <StatusIndicator isConnected={isConnected} className='ml-4' />
                </div>
                <p className='text-tx-secondary mt-1'>
                    Lobby Code:
                    <CopyableCode code={lobbyInfo.lobby.code} className='ml-2 text-lg' data-testid='lobby-code' />
                </p>
            </div>

            <ErrorMessage message={error} data-testid='lobby-error-message' />
            {wsError && <Alert variant='error'>{wsError}</Alert>}

            <div className='grid gap-6 md:grid-cols-2'>
                {/* Players List */}
                <div className='dark:bg-tertiary dark:border-border-light rounded-lg bg-gray-50 p-4 dark:border'>
                    <h2 className='dark:text-tx-primary mb-4 text-xl font-semibold text-gray-900'>
                        Players ({lobbyInfo.players.length})
                    </h2>
                    {lobbyInfo.players.length === 0 ? (
                        <p className='dark:text-tx-muted text-gray-500'>No players in lobby yet</p>
                    ) : (
                        <div className='max-h-64 space-y-2 overflow-y-auto'>
                            {lobbyInfo.players.map(playerItem => (
                                <div
                                    key={playerItem.id}
                                    data-testid={`player-list-row-${playerItem.name}`}
                                    className={`flex items-center justify-between rounded-lg p-3 ${
                                        playerItem.id === player.id
                                            ? 'dark:border-accent dark:bg-accent/20 border-2 border-blue-300 bg-blue-100'
                                            : 'dark:border-border-light dark:bg-secondary border border-gray-200 bg-white'
                                    }`}
                                >
                                    <div className='flex items-center gap-3'>
                                        <span
                                            className='dark:text-tx-primary font-medium text-gray-900'
                                            data-testid={`player-name-${playerItem.name}`}
                                        >
                                            {playerItem.name}
                                            {playerItem.id === player.id && ' (You)'}
                                        </span>
                                    </div>
                                    <div
                                        className='team-status-container'
                                        data-testid={`team-status-container-${playerItem.name}`}
                                    >
                                        <span
                                            className='dark:bg-elevated dark:text-tx-secondary rounded bg-gray-100 px-2 py-1 text-sm text-gray-500'
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

                {/* Teams List */}
                <div className='bg-tertiary border-border-light rounded-lg border p-4'>
                    <h2 className='text-tx-primary mb-4 text-xl font-semibold' data-testid='player-teams-heading'>
                        Teams ({lobbyInfo.teams && lobbyInfo.teams.length > 0 ? lobbyInfo.teams.length : 0})
                    </h2>
                    {lobbyInfo.teams && lobbyInfo.teams.length > 0 ? (
                        <div className='space-y-3'>
                            {lobbyInfo.teams.map(team => (
                                <div
                                    key={team.id}
                                    className='border-border-light bg-secondary rounded-lg border p-4'
                                    data-testid={`team-section-${team.name}`}
                                >
                                    <h3 className='text-tx-primary mb-2 text-lg font-semibold'>{team.name}</h3>
                                    <div className='text-tx-secondary mb-2 text-sm'>
                                        Progress: Word {team.current_word_index + 1}
                                    </div>
                                    {lobbyInfo.players_by_team && lobbyInfo.players_by_team[team.id] && (
                                        <div>
                                            <p className='text-tx-secondary mb-1 text-sm font-medium'>Members:</p>
                                            <div
                                                className='flex flex-wrap gap-1'
                                                data-testid={`team-members-${team.name}`}
                                            >
                                                {lobbyInfo.players_by_team[team.id].map(teamPlayer => (
                                                    <span
                                                        key={teamPlayer.id}
                                                        className={`inline-block rounded px-2 py-1 text-xs ${
                                                            teamPlayer.id === player.id
                                                                ? 'bg-accent/20 text-accent font-semibold'
                                                                : 'bg-elevated text-tx-secondary'
                                                        }`}
                                                        data-testid={`team-member-${teamPlayer.name}`}
                                                    >
                                                        {teamPlayer.name}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className='text-tx-muted'>No teams created yet. Waiting for admin to set up teams...</p>
                    )}
                </div>
            </div>

            {/* Game Status */}
            <div className='mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-700 dark:bg-blue-900/20'>
                <h3 className='mb-2 text-lg font-semibold text-blue-900 dark:text-blue-300'>Game Status</h3>
                <p className='text-blue-700 dark:text-blue-300'>Waiting for admin to start the game...</p>
                {player.team_id ? (
                    <p className='mt-2 text-blue-700 dark:text-blue-300'>You are assigned to Team {player.team_id}</p>
                ) : (
                    <p className='mt-2 text-blue-700 dark:text-blue-300'>You are not assigned to a team yet</p>
                )}
            </div>
        </div>
    );
}
