import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useGlobalOutletContext } from '@/hooks/useGlobalOutletContext';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/hooks/useToast';
import { WebSocketMessage, LobbyWebSocketEvents, GameWebSocketEvents, Player, LobbyInfo } from '@/types';
import { LoadingSpinner, CopyableCode, Button, ErrorMessage, Alert, Card, ConnectionBadge } from '@/components';
import { TeamLeaderboard } from '@/components/TeamLeaderboard';

interface PlayerAward {
    key: string;
    title: string;
    emoji: string;
    description: string;
}

interface PlayerGameStats {
    player_id: number;
    player_name: string;
    correct_guesses: number;
    total_guesses: number;
    accuracy_rate: number;
    words_solved: number[];
    wrong_guesses: string[];
    awards: PlayerAward[];
}

interface TeamGameStats {
    team_id: number;
    team_name: string;
    placement: number | null;
    points_earned: number | null;
    wrong_guesses: number;
    wrong_guess_rate: number;
    wrong_guess_label: string;
    completed_at: string | null;
    completion_percentage: number;
    time_to_complete: number | null;
    player_stats: PlayerGameStats[];
}

// Seeded random selection - ensures same awards are shown for a player across all views
function selectRandomAwards(awards: PlayerAward[], playerId: number, maxCount: number = 3): PlayerAward[] {
    if (awards.length <= maxCount) {
        return awards;
    }

    // Simple seeded shuffle using player ID as seed
    const seededRandom = (seed: number) => {
        let x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    };

    const shuffled = [...awards];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(seededRandom(playerId + i) * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled.slice(0, maxCount);
}

export default function LobbyPage() {
    const navigate = useNavigate();
    const { sessionId, setSessionId } = useGlobalOutletContext();
    const { addToast } = useToast();

    const [player, setPlayer] = useState<Player | null>(null);
    const [lobbyInfo, setLobbyInfo] = useState<LobbyInfo | null>(null);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [wsError, setWsError] = useState<string | null>(null);
    const [isTeamGameCompleted, setIsTeamGameCompleted] = useState<boolean | null>(null);
    const [isTogglingReady, setIsTogglingReady] = useState(false);
    const [leaderboardRefreshKey, setLeaderboardRefreshKey] = useState(0);
    const [teamRoundStats, setTeamRoundStats] = useState<TeamGameStats | null>(null);
    const [teamRoundNumber, setTeamRoundNumber] = useState<number | null>(null);
    const [teamRoundError, setTeamRoundError] = useState<string | null>(null);
    const [isTeamRoundLoading, setIsTeamRoundLoading] = useState(false);
    const [lastRoundGameId, setLastRoundGameId] = useState<number | null>(null);
    const [activeAwardTooltip, setActiveAwardTooltip] = useState<string | null>(null);
    const [isRoundResultsExpanded, setIsRoundResultsExpanded] = useState(false);

    // Timer state
    const [isTimerActive, setIsTimerActive] = useState(false);
    const [timerExpiresAt, setTimerExpiresAt] = useState<string | null>(null);
    const [timeRemaining, setTimeRemaining] = useState<number>(0); // seconds

    useEffect(() => {
        if (!sessionId) {
            navigate('/');
            return;
        }
        refreshLobbyInfo();
        loadTimerState();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const refreshLobbyInfo = useCallback(async () => {
        if (!sessionId) {
            setError('No session ID found. Please log in again.');
            console.error('No session ID found when trying to refresh lobby info');
            setIsInitialLoad(false);
            return;
        }

        try {
            setError(null);
            const playerData = await api.player.lobby.activeUser(sessionId);
            setPlayer(playerData);

            const lobbyInfoData = await api.player.lobby.getLobbyInfo(playerData.lobby_id, sessionId);
            setLobbyInfo(lobbyInfoData);

            // Increment refresh key to trigger leaderboard refresh
            setLeaderboardRefreshKey(prev => prev + 1);

            // Check if game is already started - if so, redirect to game page
            // But don't redirect if the game is already completed
            if (playerData.team_id) {
                try {
                    const puzzleData = await api.player.game.getPuzzle(sessionId);
                    if (puzzleData && puzzleData.puzzle && !puzzleData.state.is_completed) {
                        console.log('[LobbyPage] Game already in progress, redirecting to game page');
                        setIsTeamGameCompleted(false);
                        navigate('/game');
                        return;
                    } else if (puzzleData && puzzleData.state.is_completed) {
                        console.log('[LobbyPage] Game completed, staying on lobby page');
                        setIsTeamGameCompleted(true);
                    }
                } catch (err) {
                    // No active game yet, stay on lobby page
                    console.log('[LobbyPage] No active game found, staying on lobby page');
                    setIsTeamGameCompleted(null);
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch lobby data');
        } finally {
            setIsInitialLoad(false);
        }
    }, [sessionId, navigate]);

    const scheduleReload = useDebounce(refreshLobbyInfo);

    useEffect(() => {
        if (!sessionId || !lobbyInfo?.lobby.id) {
            setLastRoundGameId(null);
            return;
        }

        let isActive = true;
        const fetchLeaderboard = async () => {
            try {
                const data = await api.player.lobby.getLeaderboard(lobbyInfo.lobby.id, sessionId);
                if (!isActive) return;
                setLastRoundGameId(data.last_round_game_id);
            } catch {
                if (!isActive) return;
                setLastRoundGameId(null);
            }
        };

        fetchLeaderboard();
        return () => {
            isActive = false;
        };
    }, [sessionId, lobbyInfo?.lobby.id, leaderboardRefreshKey]);

    useEffect(() => {
        if (!sessionId || !player?.team_id || !lastRoundGameId) {
            setTeamRoundStats(null);
            setTeamRoundNumber(null);
            setTeamRoundError(null);
            return;
        }

        let isActive = true;
        const fetchTeamStats = async () => {
            setIsTeamRoundLoading(true);
            setTeamRoundError(null);
            try {
                const stats = await api.player.game.getGameStats(lastRoundGameId, sessionId);
                if (!isActive) return;
                const matchingTeam = stats.teams.find(teamEntry => teamEntry.team_id === player.team_id) || null;
                setTeamRoundStats(matchingTeam);
                setTeamRoundNumber(stats.round_number);
            } catch (error) {
                if (!isActive) return;
                setTeamRoundError(error instanceof Error ? error.message : 'Failed to load team results');
                setTeamRoundStats(null);
                setTeamRoundNumber(null);
            } finally {
                if (isActive) {
                    setIsTeamRoundLoading(false);
                }
            }
        };

        fetchTeamStats();
        return () => {
            isActive = false;
        };
    }, [sessionId, player?.team_id, lastRoundGameId]);

    const loadTimerState = useCallback(async () => {
        if (!sessionId) return;

        try {
            const timerState = await api.player.game.getTimerState(sessionId);
            if (timerState.is_active && timerState.expires_at) {
                setIsTimerActive(true);
                setTimerExpiresAt(timerState.expires_at);
            } else {
                setIsTimerActive(false);
                setTimerExpiresAt(null);
            }
        } catch (err) {
            console.error('Error loading timer state:', err);
            // Non-critical error, don't show to user
        }
    }, [sessionId]);

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
                case LobbyWebSocketEvents.PLAYER_JOINED:
                    console.log('Player joined lobby');
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
                        addToast('You have been kicked from the lobby by an admin.', 'error', 5000);
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
                case LobbyWebSocketEvents.READY_STATUS_CHANGED:
                    console.log('Player ready status changed');
                    scheduleReload();
                    break;
                case LobbyWebSocketEvents.LOBBY_DELETED:
                    addToast('This lobby was deleted by an admin.', 'error', 5000);
                    setSessionId(null);
                    setPlayer(null);
                    setLobbyInfo(null);
                    navigate('/');
                    return;
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
                case 'round_ended':
                    console.log('Round ended, refreshing lobby and leaderboard');
                    addToast("Time's up! The admin ended the round.", 'warning', 5000);
                    scheduleReload();
                    break;
                case 'new_round_started':
                    console.log('New round started, refreshing lobby');
                    // No toast notification - just reload silently
                    scheduleReload();
                    break;
                case 'game_ended':
                    console.log('Game ended by admin, refreshing lobby');
                    addToast('Game has been ended by admin.', 'info', 5000);
                    scheduleReload();
                    break;
                case 'timer_started':
                    console.log('Timer started on lobby page:', message);
                    setIsTimerActive(true);
                    setTimerExpiresAt(message.expires_at);
                    addToast(
                        `Round timer started: ${Math.floor(message.duration_seconds / 60)} minutes until auto-end`,
                        'warning',
                        5000
                    );
                    break;
                case 'timer_expired':
                    console.log('Timer expired on lobby page');
                    setIsTimerActive(false);
                    setTimerExpiresAt(null);
                    setTimeRemaining(0);
                    addToast("Time's up! The round has ended.", 'error', 5000);
                    break;
                default:
                    console.log('Unknown lobby WebSocket message type:', message.type);
                    scheduleReload();
            }
        },
        [scheduleReload, setSessionId, navigate, player, lobbyInfo, sessionId, addToast]
    );

    const handleToggleReady = useCallback(async () => {
        if (!sessionId) {
            setError('No session ID found');
            return;
        }

        setIsTogglingReady(true);
        try {
            setError(null);
            await api.player.lobby.toggleReady(sessionId);
            // State updated via WebSocket event
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to toggle ready status');
            console.error('Error toggling ready:', err);
        } finally {
            setIsTogglingReady(false);
        }
    }, [sessionId]);

    const formatTime = (seconds: number | null): string => {
        if (seconds === null) return 'DNF';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getPlacementBadge = (placement: number | null) => {
        if (placement === null) return '-';
        const badges: Record<number, string> = {
            1: '🥇',
            2: '🥈',
            3: '🥉',
        };
        return badges[placement] || `#${placement}`;
    };

    const wsUrl = useMemo(
        () => (player?.lobby_id && sessionId ? `/ws/lobby/${player.lobby_id}/player/${sessionId}` : ''),
        [player?.lobby_id, sessionId]
    );

    const { connectionStatus, retryCount, manualReconnect } = useWebSocket(wsUrl, {
        onConnect,
        onDisconnect,
        onError,
        onMessage,
        autoReconnect: true,
        maxRetries: 10,
        onMaxRetriesReached: () => {
            setWsError('Unable to connect to lobby. Please refresh the page or check your internet connection.');
        },
    });

    if (isInitialLoad) {
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

    return (
        <div className='space-y-6'>
            {/* Header */}
            <div className='border-border bg-secondary/70 rounded-xl border p-4 shadow-lg'>
                <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
                    <div className='min-w-0 flex-1'>
                        <h1 className='text-tx-primary text-2xl font-bold sm:text-3xl'>{lobbyInfo.lobby.name}</h1>
                        <div className='text-tx-secondary mt-1 flex flex-wrap items-center gap-2 text-sm'>
                            <CopyableCode code={lobbyInfo.lobby.code} data-testid='lobby-code' />
                            <span className='text-tx-muted text-xs'>•</span>
                            <span className='text-tx-muted text-xs'>
                                {lobbyInfo.players.length} {lobbyInfo.players.length === 1 ? 'player' : 'players'}
                            </span>
                            <span className='text-tx-muted text-xs'>•</span>
                            <span className='text-tx-muted text-xs'>
                                {lobbyInfo.teams?.length || 0} {lobbyInfo.teams?.length === 1 ? 'team' : 'teams'}
                            </span>
                        </div>
                    </div>
                    <div className='flex-shrink-0'>
                        <ConnectionBadge
                            connectionStatus={connectionStatus}
                            retryCount={retryCount}
                            onRetry={connectionStatus === 'failed' ? manualReconnect : undefined}
                            connectedText='Connected'
                        />
                    </div>
                </div>
            </div>

            <ErrorMessage message={error} data-testid='lobby-error-message' />
            {wsError && <Alert variant='error'>{wsError}</Alert>}

            {/* Round Timer */}
            {isTimerActive && (
                <div>
                    <Card className='bg-elevated/70 shadow-lg'>
                        <div className='flex items-center justify-center gap-4'>
                            <div>
                                <div className='text-tx-secondary text-center text-xs font-semibold uppercase'>
                                    Round Timer
                                </div>
                                <div
                                    className={`text-center text-3xl font-bold ${timeRemaining < 60 ? 'text-red' : 'text-orange'}`}
                                    data-testid='lobby-round-timer'
                                >
                                    {formatTime(timeRemaining)}
                                </div>
                            </div>
                        </div>
                        <div className='text-tx-muted mt-2 text-center text-xs'>Time remaining until round ends</div>
                    </Card>
                </div>
            )}

            {/* Team Results Card */}
            {player.team_id && lastRoundGameId && (
                <div>
                    <Card className='border-2 border-purple-500/30 bg-gradient-to-br from-purple-900/20 to-blue-900/20 shadow-xl'>
                        <div className='space-y-4'>
                            <button
                                onClick={() => setIsRoundResultsExpanded(!isRoundResultsExpanded)}
                                className='w-full text-left'
                            >
                                <div className='flex items-center justify-between'>
                                    <div className='flex items-center gap-2'>
                                        <span className='text-2xl'>📊</span>
                                        <div>
                                            <div className='text-tx-secondary text-xs font-semibold tracking-wide uppercase'>
                                                Latest Round Results
                                            </div>
                                            <div className='text-tx-primary text-lg font-bold'>
                                                {teamRoundNumber ? `Round ${teamRoundNumber}` : 'Previous Round'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className='flex items-center gap-3'>
                                        {!isTeamRoundLoading && !teamRoundError && teamRoundStats && (
                                            <div className='flex items-center gap-4 text-sm'>
                                                <div className='text-center'>
                                                    <div className='text-tx-primary text-lg font-bold'>
                                                        {getPlacementBadge(teamRoundStats.placement)}
                                                    </div>
                                                    <div className='text-tx-muted text-xs'>Place</div>
                                                </div>
                                                <div className='text-center'>
                                                    <div className='text-tx-primary text-lg font-bold'>
                                                        {teamRoundStats.points_earned ?? '-'}
                                                    </div>
                                                    <div className='text-tx-muted text-xs'>Points</div>
                                                </div>
                                            </div>
                                        )}
                                        <div className='text-tx-muted text-2xl'>
                                            {isRoundResultsExpanded ? '▼' : '▶'}
                                        </div>
                                    </div>
                                </div>
                            </button>

                            {isRoundResultsExpanded && (
                                <>
                                    {isTeamRoundLoading && (
                                        <div className='flex items-center gap-3'>
                                            <LoadingSpinner />
                                            <span className='text-tx-secondary text-sm'>Loading results…</span>
                                        </div>
                                    )}
                                    {teamRoundError && <Alert variant='error'>{teamRoundError}</Alert>}
                                    {!isTeamRoundLoading && !teamRoundError && teamRoundStats && (
                                        <div className='space-y-4'>
                                            <div className='grid grid-cols-2 gap-4 md:grid-cols-4'>
                                                <div className='bg-secondary/60 rounded-lg p-3'>
                                                    <div className='text-tx-muted text-xs font-semibold uppercase'>
                                                        Placement
                                                    </div>
                                                    <div className='text-tx-primary text-xl font-semibold'>
                                                        {getPlacementBadge(teamRoundStats.placement)}
                                                    </div>
                                                </div>
                                                <div className='bg-secondary/60 rounded-lg p-3'>
                                                    <div className='text-tx-muted text-xs font-semibold uppercase'>
                                                        Points
                                                    </div>
                                                    <div className='text-tx-primary text-xl font-semibold'>
                                                        {teamRoundStats.points_earned ?? '-'}
                                                    </div>
                                                </div>
                                                <div className='bg-secondary/60 rounded-lg p-3'>
                                                    <div className='text-tx-muted text-xs font-semibold uppercase'>
                                                        Time
                                                    </div>
                                                    <div className='text-tx-primary text-xl font-semibold'>
                                                        {formatTime(teamRoundStats.time_to_complete)}
                                                    </div>
                                                </div>
                                                <div className='bg-secondary/60 rounded-lg p-3'>
                                                    <div className='text-tx-muted text-xs font-semibold uppercase'>
                                                        Completion
                                                    </div>
                                                    <div className='text-tx-primary text-xl font-semibold'>
                                                        {(teamRoundStats.completion_percentage * 100).toFixed(0)}%
                                                    </div>
                                                </div>
                                            </div>

                                            <div className='text-tx-secondary text-sm'>
                                                Wrong guesses: {teamRoundStats.wrong_guesses}{' '}
                                                <span className='text-tx-muted'>
                                                    ({teamRoundStats.wrong_guess_label})
                                                </span>
                                            </div>

                                            <div className='space-y-4'>
                                                {teamRoundStats.player_stats.map(playerStat => {
                                                    const selectedAwards = selectRandomAwards(
                                                        playerStat.awards,
                                                        playerStat.player_id,
                                                        3
                                                    );
                                                    return (
                                                        <div
                                                            key={playerStat.player_id}
                                                            className='border-border rounded-lg border p-4'
                                                        >
                                                            <div className='flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4'>
                                                                <div className='flex-1'>
                                                                    <div className='text-tx-primary text-lg font-semibold'>
                                                                        {playerStat.player_name}
                                                                    </div>
                                                                    <div className='text-tx-muted text-sm'>
                                                                        {playerStat.correct_guesses}/
                                                                        {playerStat.total_guesses} correct (
                                                                        {(playerStat.accuracy_rate * 100).toFixed(0)}%
                                                                        accuracy)
                                                                    </div>
                                                                </div>
                                                                {selectedAwards.length > 0 && (
                                                                    <div className='flex flex-wrap gap-2'>
                                                                        {selectedAwards.map(award => {
                                                                            const tooltipKey = `${playerStat.player_id}-${award.key}`;
                                                                            const isTooltipActive =
                                                                                activeAwardTooltip === tooltipKey;
                                                                            return (
                                                                                <div
                                                                                    key={award.key}
                                                                                    className='relative'
                                                                                >
                                                                                    <button
                                                                                        onClick={e => {
                                                                                            e.stopPropagation();
                                                                                            setActiveAwardTooltip(
                                                                                                isTooltipActive
                                                                                                    ? null
                                                                                                    : tooltipKey
                                                                                            );
                                                                                        }}
                                                                                        className='flex cursor-pointer items-center gap-2 rounded-lg border-2 border-yellow-500/40 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 px-4 py-2.5 shadow-lg transition-all hover:scale-105 hover:from-yellow-500/30 hover:to-orange-500/30'
                                                                                        type='button'
                                                                                    >
                                                                                        <span className='text-2xl'>
                                                                                            {award.emoji}
                                                                                        </span>
                                                                                        <span className='text-tx-primary text-sm font-bold'>
                                                                                            {award.title}
                                                                                        </span>
                                                                                    </button>
                                                                                    {isTooltipActive && (
                                                                                        <>
                                                                                            <div
                                                                                                className='fixed inset-0 z-10'
                                                                                                onClick={() =>
                                                                                                    setActiveAwardTooltip(
                                                                                                        null
                                                                                                    )
                                                                                                }
                                                                                            />
                                                                                            <div className='bg-elevated border-border text-tx-primary absolute top-full right-0 z-20 mt-2 w-64 rounded-lg border p-3 shadow-xl'>
                                                                                                <div className='text-xs font-semibold'>
                                                                                                    {award.emoji}{' '}
                                                                                                    {award.title}
                                                                                                </div>
                                                                                                <div className='text-tx-secondary mt-1 text-xs'>
                                                                                                    {award.description}
                                                                                                </div>
                                                                                            </div>
                                                                                        </>
                                                                                    )}
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                    {!isTeamRoundLoading && !teamRoundError && !teamRoundStats && (
                                        <div className='text-tx-muted text-sm'>Team results are not available yet.</div>
                                    )}
                                </>
                            )}
                        </div>
                    </Card>
                </div>
            )}

            {/* Tournament Leaderboard */}
            {sessionId && (
                <TeamLeaderboard
                    lobbyId={lobbyInfo.lobby.id}
                    sessionId={sessionId}
                    refreshKey={leaderboardRefreshKey}
                    onViewLastRound={player.team_id ? () => navigate('/game') : undefined}
                />
            )}

            {/* Ready Button - Only show if player is on a team */}
            {player.team_id && (
                <div>
                    <button
                        onClick={handleToggleReady}
                        disabled={isTogglingReady}
                        className={`w-full rounded-xl border-2 p-6 text-left shadow-lg transition-all duration-200 ${
                            isTogglingReady
                                ? 'bg-elevated/70 border-border cursor-wait opacity-70'
                                : player.is_ready
                                  ? 'bg-green/10 border-green/40 hover:bg-green/20 hover:border-green/60 cursor-pointer hover:-translate-y-1 hover:shadow-xl active:scale-[0.98]'
                                  : 'bg-red/10 border-red/40 hover:bg-red/20 hover:border-red/60 cursor-pointer hover:-translate-y-1 hover:shadow-xl active:scale-[0.98]'
                        }`}
                    >
                        <div className='flex items-center justify-between'>
                            <div>
                                <div className='text-tx-secondary text-xs font-semibold tracking-wide uppercase'>
                                    Your Status
                                </div>
                                <p className='text-tx-primary text-xl font-bold'>
                                    {player.is_ready ? '✓ Ready' : 'Tap to Ready Up'}
                                </p>
                            </div>
                            <div className='text-4xl'>{player.is_ready ? '✅' : '❌'}</div>
                        </div>
                    </button>
                </div>
            )}

            {/* Message for unassigned players */}
            {!player.team_id && hasTeams && (
                <div>
                    <Alert variant='info'>You need to be assigned to a team before you can ready up.</Alert>
                </div>
            )}

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
                                                {playerItem.is_ready && (
                                                    <span className='text-green text-xs' title='Ready'>
                                                        ✓
                                                    </span>
                                                )}
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
                            Teams ({lobbyInfo.teams?.length})
                        </div>
                        <div className='grid gap-4 md:grid-cols-2'>
                            {lobbyInfo.teams?.map(team => {
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
                                                        {teamPlayer.is_ready && (
                                                            <span className='text-green text-xs' title='Ready'>
                                                                ✓
                                                            </span>
                                                        )}
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
                            <Card variant='warning' className='p-3'>
                                <div className='mb-2 flex items-center gap-2'>
                                    <span className='text-lg'>⚠️</span>
                                    <div className='text-orange text-xs font-semibold'>
                                        {unassignedPlayers.length}{' '}
                                        {unassignedPlayers.length === 1 ? 'player' : 'players'} waiting for team
                                        assignment
                                    </div>
                                </div>
                                <div className='flex flex-wrap gap-2'>
                                    {unassignedPlayers.map(playerItem => (
                                        <span
                                            key={playerItem.id}
                                            data-testid={`unassigned-player-${playerItem.name}`}
                                            className={`text-orange rounded-full border px-3 py-1 text-xs font-medium ${
                                                playerItem.id === player.id
                                                    ? 'border-orange bg-orange/20'
                                                    : 'border-orange/40 bg-orange/10'
                                            }`}
                                        >
                                            {playerItem.name}
                                            {playerItem.id === player.id && ' (you)'}
                                        </span>
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
