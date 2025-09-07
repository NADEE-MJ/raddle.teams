import { useState, useEffect, useCallback, useRef } from 'react';
import { Outlet, useParams, useNavigate } from 'react-router-dom';
import { LobbyOutletContext } from '@/hooks/useLobbyOutletContext';
import { useWebSocket } from '@/hooks/useWebSocket';
import { api } from '@/services/api';
import { Player, Lobby, LobbyInfo, WebSocketMessage, LobbyWebSocketEvents } from '@/types';

const LobbyLayout: React.FC = () => {
    const { lobbyCode } = useParams<{ lobbyCode: string }>();
    const navigate = useNavigate();
    const [sessionId, setSessionIdState] = useState<string | null>(null);
    const [player, setPlayer] = useState<Player | null>(null);
    const [lobby, setLobby] = useState<Lobby | null>(null);
    const [lobbyInfo, setLobbyInfo] = useState<LobbyInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lobbyIdForWebSocket, setLobbyIdForWebSocket] = useState<number | null>(null);

    const setSessionId = useCallback((id: string | null) => {
        setSessionIdState(id);
    }, []);

    const reloadDebounceRef = useRef<NodeJS.Timeout | null>(null);

    const refreshLobbyInfo = useCallback(async () => {
        if (!sessionId) return;

        try {
            setIsLoading(true);
            setError(null);
            const playerData = await api.player.lobby.activeUser(sessionId);
            setPlayer(playerData);

            const lobbyData = await api.player.lobby.getInfo(sessionId);
            setLobby(lobbyData);

            setLobbyIdForWebSocket(playerData.lobby_id);

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
            clearTimeout(reloadDebounceRef.current);
        }
        reloadDebounceRef.current = setTimeout(() => {
            refreshLobbyInfo();
            reloadDebounceRef.current = null;
        }, 200);
    }, [refreshLobbyInfo]);

    const handleWebSocketMessage = useCallback(
        (message: WebSocketMessage) => {
            console.debug('Received WebSocket message:', message);

            if (message.type === LobbyWebSocketEvents.PLAYER_KICKED) {
                alert('You have been kicked from the lobby by an admin.');
                // Clear session and redirect to home
                setSessionId(null);
                setPlayer(null);
                setLobby(null);
                setLobbyInfo(null);
                navigate('/');
                return;
            }

            scheduleReload();
        },
        [scheduleReload, setSessionId, navigate]
    );

    useEffect(() => {
    }, []);

    useEffect(() => {
        if (sessionId) {
            refreshLobbyInfo();
        }
    }, [sessionId, refreshLobbyInfo]);

    useWebSocket(lobbyIdForWebSocket, sessionId, {
        onMessage: handleWebSocketMessage,
    });

    const context: LobbyOutletContext = {
        lobbyCode: lobbyCode || '',
        player,
        sessionId,
        setSessionId,
        lobby,
        lobbyInfo,
        refreshLobbyInfo,
        isLoading,
        error,
    };

    return <Outlet context={context} />;
};

export default LobbyLayout;
