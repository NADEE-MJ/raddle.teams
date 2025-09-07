import { useState, useEffect, useCallback } from 'react';
import LobbiesList from './LobbiesList';
import LobbyDetails from './LobbyDetails';
import { useGlobalOutletContext } from '@/hooks/useGlobalOutletContext';
import { useNavigate } from 'react-router-dom';
import { useWebSocket } from '@/hooks/useWebSocket';
import { WebSocketMessage, LobbyWebSocketEvents } from '@/types';

export default function AdminPage() {
    const { adminApiToken, adminSessionId } = useGlobalOutletContext();
    const navigate = useNavigate();
    const [selectedLobbyId, setSelectedLobbyId] = useState<number | null>(null);
    const [lobbyRefreshKey, setLobbyRefreshKey] = useState(0);
    const [allLobbiesRefreshKey, setAllLobbiesRefreshKey] = useState(0);
    const [wsError, setWsError] = useState<string | null>(null);

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

    const onMessage = useCallback((message: WebSocketMessage) => {
        console.log('Admin WebSocket message received:', message);

        switch (message.type) {
            case LobbyWebSocketEvents.CONNECTION_CONFIRMED:
            case LobbyWebSocketEvents.TEAM_ASSIGNED:
            case LobbyWebSocketEvents.TEAM_CHANGED:
            case LobbyWebSocketEvents.DISCONNECTED:
            case LobbyWebSocketEvents.PLAYER_KICKED:
                setLobbyRefreshKey(prev => prev + 1);
                break;
            default:
                console.log('Unknown admin WebSocket message type:', message.type);
        }
    }, []);

    const wsUrl = adminSessionId ? `ws://localhost:8000/ws/admin/${adminSessionId}?token=${adminApiToken}` : '';
    const { isConnected, sendMessage } = useWebSocket(wsUrl, {
        onConnect,
        onDisconnect,
        onError,
        onMessage,
        autoReconnect: true,
    });

    useEffect(() => {
        if (!adminApiToken || !adminSessionId) {
            navigate('/admin/login');
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleViewDetails = useCallback((lobbyId: number) => {
        setSelectedLobbyId(lobbyId);

        if (sendMessage) {
            sendMessage({
                action: 'subscribe_lobby',
                lobby_id: lobbyId
            });
        }
    }, [setSelectedLobbyId, sendMessage]);

    const handleCloseLobbyDetails = useCallback(() => {
        if (selectedLobbyId && sendMessage) {
            sendMessage({
                action: 'unsubscribe_lobby',
                lobby_id: selectedLobbyId
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
            <div className='text-left mb-6'>
                <div className="flex items-center justify-between mb-2">
                    <h1 className='text-2xl md:text-3xl font-semibold mb-1 text-tx-primary'>Admin Dashboard</h1>
                    <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className={`text-sm ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                            {isConnected ? 'Connected' : 'Disconnected'}
                        </span>
                    </div>
                </div>
                <p className="text-tx-secondary">Manage lobbies and monitor team games</p>
                {wsError && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                        {wsError}
                    </div>
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
