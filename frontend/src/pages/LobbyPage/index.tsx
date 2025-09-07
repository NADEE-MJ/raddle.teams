import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useGlobalOutletContext } from '@/hooks/useGlobalOutletContext';
import { WebSocketMessage, LobbyWebSocketEvents, Player, LobbyInfo } from '@/types';

export default function LobbyPage() {
    const navigate = useNavigate();
    const { getSessionIdFromLocalStorage, setSessionId } = useGlobalOutletContext();

    const [sessionId, setSessionIdState] = useState<string | null>(null);
    const [player, setPlayer] = useState<Player | null>(null);
    const [lobbyInfo, setLobbyInfo] = useState<LobbyInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [wsError, setWsError] = useState<string | null>(null);

    const reloadDebounceRef = useRef<NodeJS.Timeout | null>(null);

    const refreshLobbyInfo = useCallback(async () => {
        if (!sessionId) return;

        try {
            setIsLoading(true);
            setError(null);
            const playerData = await api.player.lobby.activeUser(sessionId);
            setPlayer(playerData);

            const lobbyInfoData = await api.player.lobby.getLobbyInfo(playerData.lobby_id, sessionId);
            setLobbyInfo(lobbyInfoData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch lobby data');
        } finally {
            setIsLoading(false);
        }
    }, [sessionId]);

    const scheduleReload = useCallback(() => {
        if (reloadDebounceRef.current) {
            return;
        }
        reloadDebounceRef.current = setTimeout(() => {
            refreshLobbyInfo();
            reloadDebounceRef.current = null;
        }, 200);
    }, [refreshLobbyInfo]);

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

    const onMessage = useCallback((message: WebSocketMessage) => {
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
                alert('You have been kicked from the lobby by an admin.');
                setSessionId(null);
                setPlayer(null);
                setLobbyInfo(null);
                navigate('/');
                return;
            default:
                console.log('Unknown lobby WebSocket message type:', message.type);
                scheduleReload();
        }
    }, [scheduleReload, setSessionId, navigate]);

    const wsUrl = player?.lobby_id && sessionId
        ? `ws://localhost:8000/ws/lobby/${player.lobby_id}/player/${sessionId}`
        : '';

    const { isConnected, sendMessage } = useWebSocket(wsUrl, {
        onConnect,
        onDisconnect,
        onError,
        onMessage,
        autoReconnect: true,
    });

    useEffect(() => {
        const storedSessionId = getSessionIdFromLocalStorage();
        if (!storedSessionId) {
            navigate('/');
            return;
        }
        setSessionIdState(storedSessionId);
    }, [getSessionIdFromLocalStorage, navigate]);

    useEffect(() => {
        if (sessionId) {
            refreshLobbyInfo();
        }
    }, [sessionId, refreshLobbyInfo]);

    useEffect(() => {
        if (!isLoading && (!sessionId || !player)) {
            navigate('/');
            return;
        }
    }, [isLoading, sessionId, player, navigate]);

    if (isLoading) {
        return (
            <main className="bg-slate-100 dark:bg-primary pt-4 md:p-4">
                <div className="max-w-6xl mx-auto">
                    <div className="bg-white dark:bg-secondary dark:border dark:border-border rounded-lg shadow-sm p-4 md:p-8 text-center">
                        <h1 className='text-3xl font-bold mb-6 text-gray-900 dark:text-tx-primary'>Loading</h1>
                        <div className='mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600 mb-4'></div>
                        <p className='text-gray-600 dark:text-tx-secondary'>Loading lobby...</p>
                    </div>
                </div>
            </main>
        );
    }

    if (error || !lobbyInfo || !player) {
        return (
            <main className="bg-slate-100 dark:bg-primary pt-4 md:p-4">
                <div className="max-w-6xl mx-auto">
                    <div className="bg-white dark:bg-secondary dark:border dark:border-border rounded-lg shadow-sm p-4 md:p-8 text-center">
                        <h1 className='text-3xl font-bold mb-6 text-gray-900 dark:text-tx-primary'>Error</h1>
                        <p className='mb-6 text-red-600 dark:text-red text-lg'>
                            {error || 'Failed to load lobby information'}
                        </p>
                        <button
                            onClick={() => navigate('/')}
                            className='rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-accent dark:hover:bg-accent-hover dark:text-primary px-6 py-3 text-white font-medium transition duration-200'
                            data-testid='lobby-error-back-to-home-button'
                        >
                            Back to Home
                        </button>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <div>
            {/* Lobby Header */}
            <div className='mb-6 flex items-center justify-between'>
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <h1 className='text-3xl font-bold text-gray-900 dark:text-tx-primary'>{lobbyInfo.lobby.name}</h1>
                        <div className="flex items-center space-x-2 ml-4">
                            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            <span className={`text-sm ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                                {isConnected ? 'Connected' : 'Disconnected'}
                            </span>
                        </div>
                    </div>
                    <p className='mt-1 text-gray-600 dark:text-tx-secondary'>
                        Lobby Code: <span className='font-mono text-lg font-bold' data-testid="lobby-code">{lobbyInfo.lobby.code}</span>
                    </p>
                </div>
            </div>

            {error && (
                <div className='mb-6 rounded-lg border border-red bg-red/20 px-4 py-3 text-red' data-testid='lobby-error-message'>
                    {error}
                </div>
            )}
            {wsError && (
                <div className="mb-6 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                    {wsError}
                </div>
            )}

            <div className='grid gap-6 md:grid-cols-2'>
                {/* Players List */}
                <div className='rounded-lg bg-gray-50 dark:bg-tertiary dark:border dark:border-border-light p-4'>
                    <h2 className='mb-4 text-xl font-semibold text-gray-900 dark:text-tx-primary'>Players ({lobbyInfo.players.length})</h2>
                    {lobbyInfo.players.length === 0 ? (
                        <p className='text-gray-500 dark:text-tx-muted'>No players in lobby yet</p>
                    ) : (
                        <div className='max-h-64 space-y-2 overflow-y-auto'>
                            {lobbyInfo.players.map(playerItem => (
                                <div
                                    key={playerItem.id}
                                    data-testid={`player-list-row-${playerItem.name}`}
                                    className={`flex items-center justify-between rounded-lg p-3 ${playerItem.id === player.id
                                        ? 'border-2 border-blue-300 dark:border-accent bg-blue-100 dark:bg-accent/20'
                                        : 'border border-gray-200 dark:border-border-light bg-white dark:bg-secondary'
                                        }`}
                                >
                                    <div className='flex items-center gap-3'>
                                        <span className='font-medium text-gray-900 dark:text-tx-primary' data-testid={`player-name-${playerItem.name}`}>
                                            {playerItem.name}
                                            {playerItem.id === player.id && ' (You)'}
                                        </span>
                                    </div>
                                    <div className='team-status-container' data-testid={`team-status-container-${playerItem.name}`}>
                                        <span
                                            className='rounded bg-gray-100 dark:bg-elevated px-2 py-1 text-sm text-gray-500 dark:text-tx-secondary'
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
                <div className='rounded-lg bg-tertiary border border-border-light p-4'>
                    <h2 className='mb-4 text-xl font-semibold text-tx-primary' data-testid='player-teams-heading'>
                        Teams ({lobbyInfo.teams && lobbyInfo.teams.length > 0 ? lobbyInfo.teams.length : 0})
                    </h2>
                    {lobbyInfo.teams && lobbyInfo.teams.length > 0 ? (
                        <div className='space-y-3'>
                            {lobbyInfo.teams.map(team => (
                                <div key={team.id} className='rounded-lg border border-border-light bg-secondary p-4' data-testid={`team-section-${team.name}`}>
                                    <h3 className='mb-2 text-lg font-semibold text-tx-primary'>{team.name}</h3>
                                    <div className='mb-2 text-sm text-tx-secondary'>
                                        Progress: Word {team.current_word_index + 1}
                                    </div>
                                    {lobbyInfo.players_by_team && lobbyInfo.players_by_team[team.id] && (
                                        <div>
                                            <p className='mb-1 text-sm font-medium text-tx-secondary'>Members:</p>
                                            <div className='flex flex-wrap gap-1' data-testid={`team-members-${team.name}`}>
                                                {lobbyInfo.players_by_team[team.id].map(teamPlayer => (
                                                    <span
                                                        key={teamPlayer.id}
                                                        className={`inline-block rounded px-2 py-1 text-xs ${teamPlayer.id === player.id
                                                            ? 'bg-accent/20 font-semibold text-accent'
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
            <div className='mt-6 rounded-lg border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 p-4'>
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
