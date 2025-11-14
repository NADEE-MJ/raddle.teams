import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useGlobalOutletContext } from '@/hooks/useGlobalOutletContext';
import { useDebounce } from '@/hooks/useDebounce';
import { WebSocketMessage, LobbyWebSocketEvents, GameWebSocketEvents, Player, LobbyInfo } from '@/types';
import { LoadingSpinner, CopyableCode, Button, ErrorMessage, Alert, Card, ConnectionBadge } from '@/components';

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
            // But don't redirect if the game is already completed
            if (playerData.team_id) {
                try {
                    const puzzleData = await api.player.game.getPuzzle(sessionId);
                    if (puzzleData && puzzleData.puzzle && !puzzleData.state.is_completed) {
                        console.log('[LobbyPage] Game already in progress, redirecting to game page');
                        navigate('/game');
                        return;
                    } else if (puzzleData && puzzleData.state.is_completed) {
                        console.log('[LobbyPage] Game completed, staying on lobby page');
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

    const hasTeams = lobbyInfo.teams && lobbyInfo.teams.length > 0;
    const unassignedPlayers = lobbyInfo.players.filter(p => !p.team_id);
    const hasGameStarted = lobbyInfo.teams?.some(team => team.game_id);
    const playerTeamName = lobbyInfo.teams?.find(team => team.id === player.team_id)?.name;
    let gameStatus = {
        icon: '👥',
        title: 'Waiting for more players',
        description: 'Waiting for more players to join or for the admin to start the game.',
    };

    if (hasGameStarted) {
        gameStatus = {
            icon: '⚡️',
            title: 'Game in progress',
            description: player.team_id
                ? 'Hang tight while your team wraps up this round.'
                : 'A round is live. Ask the admin to assign you to a team so you can join in.',
        };
    } else if (hasTeams) {
        gameStatus = {
            icon: '🚦',
            title: 'Teams are ready',
            description: 'Waiting for the admin to start the game.',
        };
    }

    return (
        <div className='space-y-6'>
            {/* Header */}
            <div className='border-border bg-secondary/70 rounded-xl border p-4 shadow-lg'>
                <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
                    <div>
                        <p className='text-tx-muted text-xs font-semibold tracking-wide uppercase'>Lobby</p>
                        <h1 className='text-tx-primary text-3xl font-bold'>{lobbyInfo.lobby.name}</h1>
                        <div className='text-tx-secondary mt-2 flex flex-wrap items-center gap-2 text-sm'>
                            <span>Lobby Code:</span>
                            <CopyableCode code={lobbyInfo.lobby.code} className='text-lg' data-testid='lobby-code' />
                        </div>
                    </div>
                    <div className='flex flex-col items-start gap-2 md:items-end'>
                        <ConnectionBadge
                            isConnected={isConnected}
                            connectedText='Connected to lobby'
                            disconnectedText='Reconnecting...'
                        />
                        <div className='text-tx-muted flex flex-wrap gap-4 text-xs font-semibold tracking-wide uppercase'>
                            <span className='text-tx-secondary'>
                                Players{' '}
                                <span className='text-tx-primary text-base font-bold'>{lobbyInfo.players.length}</span>
                            </span>
                            <span className='text-tx-secondary'>
                                Teams{' '}
                                <span className='text-tx-primary text-base font-bold'>
                                    {lobbyInfo.teams?.length || 0}
                                </span>
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <ErrorMessage message={error} data-testid='lobby-error-message' />
            {wsError && <Alert variant='error'>{wsError}</Alert>}

            {/* Game Status Card */}
            <div>
                <Card className='bg-elevated/70 shadow-lg'>
                    <div className='flex items-start gap-4'>
                        <div className='text-3xl' aria-hidden='true'>
                            {gameStatus.icon}
                        </div>
                        <div>
                            <div className='text-tx-secondary text-xs font-semibold tracking-wide uppercase'>
                                Game Status
                            </div>
                            <p className='text-tx-primary text-lg font-semibold'>{gameStatus.title}</p>
                            <p className='text-tx-secondary text-sm'>{gameStatus.description}</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* No teams created yet - show all players */}
            {!hasTeams && (
                <div className='mb-6'>
                    <div className='text-tx-secondary mb-3 text-sm tracking-wide uppercase'>
                        Players ({lobbyInfo.players.length})
                    </div>
                    <Card className='bg-secondary/70'>
                        {lobbyInfo.players.length === 0 ? (
                            <p className='text-tx-muted text-center'>Waiting for players to join this lobby.</p>
                        ) : (
                            <div className='space-y-3'>
                                {lobbyInfo.players.map(playerItem => (
                                    <div
                                        key={playerItem.id}
                                        data-testid={`player-list-row-${playerItem.name}`}
                                        className={`bg-elevated/70 flex items-center justify-between rounded-xl border px-4 py-3 text-base font-semibold shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${
                                            playerItem.id === player.id
                                                ? 'border-accent/70 text-accent'
                                                : 'border-border/70 text-tx-primary'
                                        }`}
                                    >
                                        <span className='text-lg' data-testid={`player-name-${playerItem.name}`}>
                                            <span className='flex items-center gap-2'>
                                                {playerItem.name}
                                                {playerItem.id === player.id && (
                                                    <span className='border-accent/40 text-accent rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase'>
                                                        You
                                                    </span>
                                                )}
                                            </span>
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>
            )}

            {/* Teams created - show teams with players */}
            {hasTeams && (
                <>
                    <div className='mb-6'>
                        <div
                            className='text-tx-secondary mb-3 text-sm tracking-wide uppercase'
                            data-testid='player-teams-heading'
                        >
                            Teams ({lobbyInfo.teams.length})
                        </div>
                        <div className='grid gap-4 md:grid-cols-2'>
                            {lobbyInfo.teams.map(team => {
                                const teamPlayers = lobbyInfo.players_by_team?.[team.id] || [];
                                const isMyTeam = teamPlayers.some(p => p.id === player.id);
                                return (
                                    <Card
                                        key={team.id}
                                        className={`${isMyTeam ? 'border-accent border-2' : ''} transition-colors`}
                                        data-testid={`team-section-${team.name}`}
                                    >
                                        <div className='mb-3 flex items-center justify-between gap-2'>
                                            <div>
                                                <h3 className='text-tx-primary text-lg font-semibold'>{team.name}</h3>
                                                <p className='text-tx-secondary text-xs'>
                                                    {teamPlayers.length}{' '}
                                                    {teamPlayers.length === 1 ? 'player' : 'players'}
                                                </p>
                                            </div>
                                            {isMyTeam && (
                                                <span className='bg-accent/20 text-accent rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase'>
                                                    Your Team
                                                </span>
                                            )}
                                        </div>
                                        {teamPlayers.length === 0 ? (
                                            <p className='text-tx-muted text-center text-sm'>No players in this team</p>
                                        ) : (
                                            <div
                                                className='flex flex-wrap gap-2'
                                                data-testid={`team-members-${team.name}`}
                                            >
                                                {teamPlayers.map(teamPlayer => (
                                                    <span
                                                        key={teamPlayer.id}
                                                        className={`bg-elevated text-tx-primary flex items-center gap-2 rounded-full px-3 py-1 text-xs ${
                                                            teamPlayer.id === player.id
                                                                ? 'ring-accent font-semibold ring-2'
                                                                : ''
                                                        }`}
                                                        data-testid={`team-member-${teamPlayer.name}`}
                                                    >
                                                        <span>{teamPlayer.name}</span>
                                                        {teamPlayer.id === player.id && (
                                                            <span className='border-accent/40 text-accent rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase'>
                                                                You
                                                            </span>
                                                        )}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </Card>
                                );
                            })}
                        </div>
                    </div>

                    {/* Unassigned Players */}
                    {unassignedPlayers.length > 0 && (
                        <div className='mb-6'>
                            <div className='text-tx-secondary mb-3 text-sm tracking-wide uppercase'>
                                Unassigned Players ({unassignedPlayers.length})
                            </div>
                            <Card variant='warning'>
                                <p className='text-orange/80 text-xs'>
                                    These players still need teams. Ping the admin if you are waiting to join.
                                </p>
                                <div className='mt-3 space-y-2'>
                                    {unassignedPlayers.map(playerItem => (
                                        <div
                                            key={playerItem.id}
                                            data-testid={`unassigned-player-${playerItem.name}`}
                                            className='flex items-center justify-between'
                                        >
                                            <span className='text-orange text-sm font-medium'>
                                                <span className='flex items-center gap-2'>
                                                    {playerItem.name}
                                                    {playerItem.id === player.id && (
                                                        <span className='border-orange/60 text-orange rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase'>
                                                            You
                                                        </span>
                                                    )}
                                                </span>
                                            </span>
                                            <span className='text-orange text-xs'>Not assigned</span>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
