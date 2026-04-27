import { useEffect, useRef, useCallback, useState } from 'react';
import { WebSocketMessage, ConnectionStatus } from '@/types';

interface UseWebSocketOptions {
    onMessage?: (message: WebSocketMessage) => void;
    onConnect?: () => void;
    onDisconnect?: () => void;
    onError?: (error: Event) => void;
    autoReconnect?: boolean;
    reconnectInterval?: number;
    maxRetries?: number;
    onMaxRetriesReached?: () => void;
    onReconnecting?: (attemptNumber: number) => void;
}

export function useWebSocket(wsUrl: string, options: UseWebSocketOptions = {}) {
    const {
        onMessage,
        onConnect,
        onDisconnect,
        onError,
        autoReconnect = true,
        reconnectInterval = 3000,
        maxRetries = 10,
        onMaxRetriesReached,
        onReconnecting,
    } = options;

    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
    const [retryCount, setRetryCount] = useState(0);
    const [hasEverConnected, setHasEverConnected] = useState(false);

    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const shouldConnectRef = useRef(true);
    const retryCountRef = useRef(0);
    const hasEverConnectedRef = useRef(false);

    // Store the latest callbacks in refs to avoid recreating connect function
    const onMessageRef = useRef(onMessage);
    const onConnectRef = useRef(onConnect);
    const onDisconnectRef = useRef(onDisconnect);
    const onErrorRef = useRef(onError);
    const onMaxRetriesReachedRef = useRef(onMaxRetriesReached);
    const onReconnectingRef = useRef(onReconnecting);

    // Update refs when callbacks change
    useEffect(() => {
        onMessageRef.current = onMessage;
        onConnectRef.current = onConnect;
        onDisconnectRef.current = onDisconnect;
        onErrorRef.current = onError;
        onMaxRetriesReachedRef.current = onMaxRetriesReached;
        onReconnectingRef.current = onReconnecting;
    }, [onMessage, onConnect, onDisconnect, onError, onMaxRetriesReached, onReconnecting]);

    const connect = useCallback(() => {
        if (!wsUrl || !shouldConnectRef.current) return;

        try {
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                setConnectionStatus('connected');
                setIsConnected(true);
                setError(null);
                setRetryCount(0);
                setHasEverConnected(true);

                retryCountRef.current = 0;
                hasEverConnectedRef.current = true;

                onConnectRef.current?.();
            };

            ws.onmessage = event => {
                try {
                    const message: WebSocketMessage = JSON.parse(event.data);
                    onMessageRef.current?.(message);
                } catch (err) {
                    console.error('Failed to parse WebSocket message:', err);
                }
            };

            ws.onclose = () => {
                setIsConnected(false);
                wsRef.current = null;
                onDisconnectRef.current?.();

                if (shouldConnectRef.current && autoReconnect) {
                    // Distinguish: initial failure vs connection lost
                    if (!hasEverConnectedRef.current) {
                        setConnectionStatus('failed');
                        setError('Unable to establish initial connection');
                    } else {
                        setConnectionStatus('reconnecting');
                    }

                    retryCountRef.current += 1;
                    setRetryCount(retryCountRef.current);

                    onReconnectingRef.current?.(retryCountRef.current);

                    if (maxRetries && retryCountRef.current >= maxRetries) {
                        setConnectionStatus('failed');
                        setError(`Connection failed after ${maxRetries} attempts`);
                        onMaxRetriesReachedRef.current?.();
                    } else {
                        reconnectTimeoutRef.current = setTimeout(connect, reconnectInterval);
                    }
                } else {
                    setConnectionStatus('disconnected');
                }
            };

            ws.onerror = error => {
                const errorMessage = hasEverConnectedRef.current ? 'Connection lost' : 'Failed to connect to server';
                setError(errorMessage);
                onErrorRef.current?.(error);
            };
        } catch (err) {
            setConnectionStatus('failed');
            setError('Failed to create WebSocket connection');
            console.error('WebSocket connection error:', err);
        }
    }, [wsUrl, autoReconnect, reconnectInterval, maxRetries]);

    const sendMessage = useCallback((message: object) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(message));
        } else {
            console.warn('websocket is not connected, cannot send message:', message);
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

    const manualReconnect = useCallback(() => {
        retryCountRef.current = 0;
        setRetryCount(0);
        setConnectionStatus('connecting');
        setError(null);
        shouldConnectRef.current = true;
        connect();
    }, [connect]);

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
        connectionStatus,
        retryCount,
        hasEverConnected,
        manualReconnect,
    };
}
