import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import { AdminOutletContext } from '../hooks/useAdminOutletContext';
import { useAdminWebSocket } from '@/hooks/useWebSocket';
import { api } from '@/services/api';
import { Lobby, WebSocketMessage } from '@/types';

const AdminLayout: React.FC = () => {
    const [adminToken, setAdminTokenState] = useState<string | null>(null);
    const [lobbies, setLobbies] = useState<Lobby[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const webSessionIdRef = useRef<string | null>(null);

    const setAdminToken = useCallback((token: string | null) => {
        if (token) {
            localStorage.setItem('raddle_admin_token', token);
            // Generate stable session ID when admin token is set
            if (!webSessionIdRef.current) {
                webSessionIdRef.current = `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            }
        } else {
            localStorage.removeItem('raddle_admin_token');
            // Clear session ID when logging out
            webSessionIdRef.current = null;
        }
        setAdminTokenState(token);
    }, []);

    const refreshLobbies = useCallback(async () => {
        if (!adminToken) return;
        
        try {
            setIsLoading(true);
            setError(null);
            const lobbiesData = await api.admin.lobby.getAll(adminToken);
            setLobbies(lobbiesData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch lobbies');
        } finally {
            setIsLoading(false);
        }
    }, [adminToken]);

    useEffect(() => {
        const token = localStorage.getItem('raddle_admin_token');
        if (token) {
            setAdminTokenState(token);
            // Generate stable session ID for existing token
            if (!webSessionIdRef.current) {
                webSessionIdRef.current = `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            }
        } else {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (adminToken) {
            refreshLobbies();
        }
    }, [adminToken, refreshLobbies]);

    const handleAdminWebSocketMessage = useCallback((message: WebSocketMessage) => {
        console.debug("Admin received WebSocket message:", message);
        refreshLobbies();
    }, [refreshLobbies]);

    const { sendMessage } = useAdminWebSocket(
        webSessionIdRef.current,
        adminToken,
        {
            onMessage: handleAdminWebSocketMessage,
        }
    );

    const context: AdminOutletContext = {
        isAdmin: !!adminToken,
        adminToken,
        setAdminToken,
        lobbies,
        refreshLobbies,
        isLoading,
        error,
        sendWebSocketMessage: sendMessage,
    };

    return (
        <div className="p-4">
            <h2 className="text-xl font-semibold mb-2">Admin</h2>
            <Outlet context={context} />
        </div>
    );
};

export default AdminLayout;
