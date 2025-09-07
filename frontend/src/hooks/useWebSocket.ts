import { useEffect, useRef, useCallback, useState } from 'react';
import { WebSocketMessage } from '@/types';

interface UseWebSocketOptions {
    onMessage?: (message: WebSocketMessage) => void;
    onConnect?: () => void;
    onDisconnect?: () => void;
    onError?: (error: Event) => void;
    autoReconnect?: boolean;
    reconnectInterval?: number;
}

export function useWebSocket(wsUrl: string, options: UseWebSocketOptions = {}) {
    const { onMessage, onConnect, onDisconnect, onError, autoReconnect = true, reconnectInterval = 3000 } = options;

    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const shouldConnectRef = useRef(true);

    const connect = useCallback(() => {
        if (!wsUrl || !shouldConnectRef.current) return;

        try {
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                setIsConnected(true);
                setError(null);
                onConnect?.();
            };

            ws.onmessage = event => {
                try {
                    const message: WebSocketMessage = JSON.parse(event.data);
                    onMessage?.(message);
                } catch (err) {
                    console.error('Failed to parse WebSocket message:', err);
                }
            };

            ws.onclose = () => {
                setIsConnected(false);
                wsRef.current = null;
                onDisconnect?.();

                if (shouldConnectRef.current && autoReconnect) {
                    reconnectTimeoutRef.current = setTimeout(connect, reconnectInterval);
                }
            };

            ws.onerror = error => {
                setError('WebSocket connection failed');
                onError?.(error);
            };
        } catch (err) {
            setError('Failed to create WebSocket connection');
            console.error('WebSocket connection error:', err);
        }
    }, [wsUrl, onMessage, onConnect, onDisconnect, onError, autoReconnect, reconnectInterval]);

    const sendMessage = useCallback((message: object) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(message));
        } else {
            console.warn('Admin WebSocket is not connected, cannot send message:', message);
        }
    }, []);

    const disconnect = useCallback(() => {
        shouldConnectRef.current = false;

        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        setIsConnected(false);
    }, []);

    useEffect(() => {
        shouldConnectRef.current = true;
        connect();

        return () => {
            disconnect();
        };
    }, [connect, disconnect]);

    return {
        isConnected,
        error,
        disconnect,
        sendMessage,
    };
}
