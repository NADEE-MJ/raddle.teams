import { useCallback, useEffect, useRef, useState } from "react";
import { WebSocketMessage } from "../types";
import { apiService } from "../services/api";

interface UseAdminWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

export function useAdminWebSocket(
  webSessionId: string | null,
  options: UseAdminWebSocketOptions = {},
) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (!webSessionId) return;

    const adminToken = apiService.getAdminToken();
    if (!adminToken) return;

    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws/admin/${webSessionId}?token=${adminToken}`;

      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        setError(null);
        options.onConnect?.();
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          options.onMessage?.(message);
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
        options.onDisconnect?.();
      };

      wsRef.current.onerror = (error) => {
        setError("WebSocket connection error");
        options.onError?.(error);
      };
    } catch (error) {
      setError("Failed to create WebSocket connection");
      console.error("WebSocket connection error:", error);
    }
  }, [webSessionId, options]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket is not connected");
    }
  }, []);

  useEffect(() => {
    if (webSessionId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [webSessionId, connect, disconnect]);

  return {
    isConnected,
    error,
    connect,
    disconnect,
    sendMessage,
  };
}
