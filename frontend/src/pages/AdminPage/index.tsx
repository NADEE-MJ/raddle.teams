import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import LobbiesList from './LobbiesList';
import LobbyDetails from './LobbyDetails';
import { useGlobalOutletContext } from '@/hooks/useGlobalOutletContext';
import { useNavigate } from 'react-router-dom';
import { useWebSocket } from '@/hooks/useWebSocket';
import { WebSocketMessage, LobbyWebSocketEvents } from '@/types';
import StatusIndicator from '@/components/StatusIndicator';
import Alert from '@/components/Alert';

export default function AdminPage() {
    const { adminApiToken, adminSessionId } = useGlobalOutletContext();
    const navigate = useNavigate();
    const [selectedLobbyId, setSelectedLobbyId] = useState<number | null>(null);
    const [lobbyRefreshKey, setLobbyRefreshKey] = useState(0);
    const [allLobbiesRefreshKey, setAllLobbiesRefreshKey] = useState(0);
    const [wsError, setWsError] = useState<string | null>(null);

    const reloadDebounceRef = useRef<NodeJS.Timeout | null>(null);

    const scheduleReload = useCallback(() => {
        if (reloadDebounceRef.current) {
            return;
        }
        reloadDebounceRef.current = setTimeout(() => {
            setLobbyRefreshKey(prev => prev + 1);
            reloadDebounceRef.current = null;
        }, 200);
    }, []);

    const onConnect = useCallback(() => {
        console.log('Admin WebSocket connected');
        setWsError(null);
    }, []);

    const onDisconnect = useCallback(() => {
        console.log('Admin WebSocket disconnected');
    }, []);

    const onError = useCallback((error: Event) => {
        console.error('Admin WebSocket error:', error);
        setWsError('WebSocket connection failed');
    }, []);

    const onMessage = useCallback(
        (message: WebSocketMessage) => {
            console.log('Admin WebSocket message received:', message);

            switch (message.type) {
                case LobbyWebSocketEvents.CONNECTION_CONFIRMED:
                case LobbyWebSocketEvents.TEAM_ASSIGNED:
                case LobbyWebSocketEvents.TEAM_CHANGED:
                case LobbyWebSocketEvents.DISCONNECTED:
                case LobbyWebSocketEvents.PLAYER_KICKED:
                    scheduleReload();
                    break;
                default:
                    console.log('Unknown admin WebSocket message type:', message.type);
                    scheduleReload();
            }
        },
        [scheduleReload]
    );

    const wsUrl = useMemo(
        () => (adminSessionId ? `ws://localhost:8000/ws/admin/${adminSessionId}?token=${adminApiToken}` : ''),
        [adminSessionId, adminApiToken]
    );
    const { isConnected, sendMessage } = useWebSocket(wsUrl, {
        onConnect,
        onDisconnect,
        onError,
        onMessage,
        autoReconnect: false,
    });

    useEffect(() => {
        if (!adminApiToken || !adminSessionId) {
            navigate('/admin/login');
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleViewDetails = useCallback(
        (lobbyId: number) => {
            setSelectedLobbyId(lobbyId);

            if (sendMessage) {
                sendMessage({
                    action: 'subscribe_lobby',
                    lobby_id: lobbyId,
                });
            }
        },
        [setSelectedLobbyId, sendMessage]
    );

    const handleCloseLobbyDetails = useCallback(() => {
        if (selectedLobbyId && sendMessage) {
            sendMessage({
                action: 'unsubscribe_lobby',
                lobby_id: selectedLobbyId,
            });
        }
        setSelectedLobbyId(null);
    }, [setSelectedLobbyId, selectedLobbyId, sendMessage]);

    const handleLobbyDeleted = useCallback(() => {
        setAllLobbiesRefreshKey(prev => prev + 1); // Trigger refresh in LobbiesList
        setSelectedLobbyId(null); // Close the details modal
    }, [setAllLobbiesRefreshKey, setSelectedLobbyId]);

    return (
        <div>
            <div className='mb-6 text-left'>
                <div className='mb-2 flex items-center justify-between'>
                    <h1 className='text-tx-primary mb-1 text-2xl font-semibold md:text-3xl'>Admin Dashboard</h1>
                    <StatusIndicator isConnected={isConnected} />
                </div>
                <p className='text-tx-secondary'>Manage lobbies and monitor team games</p>
                {wsError && (
                    <Alert variant='error' className='mt-2'>
                        {wsError}
                    </Alert>
                )}
            </div>

            <LobbiesList onViewDetails={handleViewDetails} refreshKey={allLobbiesRefreshKey} />

            {selectedLobbyId && (
                <LobbyDetails
                    lobbyId={selectedLobbyId}
                    onClose={handleCloseLobbyDetails}
                    onLobbyDeleted={handleLobbyDeleted}
                    refreshKey={lobbyRefreshKey}
                />
            )}
        </div>
    );
}
