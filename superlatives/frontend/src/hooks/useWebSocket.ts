import { useEffect, useRef, useState } from 'react';
import type { ClientType } from '@/types';

interface UseWebSocketOptions {
    roomId: number;
    sessionId: string;
    clientType: ClientType;
    onMessage?: (event: MessageEvent) => void;
}

export function useWebSocket({ roomId, sessionId, clientType, onMessage }: UseWebSocketOptions) {
    const wsRef = useRef<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const onMessageRef = useRef(onMessage);

    // Update the ref when onMessage changes
    useEffect(() => {
        onMessageRef.current = onMessage;
    }, [onMessage]);

    useEffect(() => {
        // Don't connect if roomId is invalid
        if (!roomId || !sessionId) {
            return;
        }

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/room/${roomId}?session_id=${sessionId}&client_type=${clientType}`;

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log('WebSocket connected');
            setIsConnected(true);
        };

        ws.onmessage = event => {
            console.log('WebSocket message:', event.data);
            if (onMessageRef.current) {
                onMessageRef.current(event);
            }
        };

        ws.onerror = error => {
            console.error('WebSocket error:', error);
        };

        ws.onclose = () => {
            console.log('WebSocket disconnected');
            setIsConnected(false);
        };

        return () => {
            ws.close();
        };
    }, [roomId, sessionId, clientType]);

    const sendMessage = (message: unknown) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(message));
        }
    };

    return { isConnected, sendMessage };
}
