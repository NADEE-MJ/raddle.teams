import { useCallback, useEffect, useRef, useState } from "react";
import { WebSocketMessage } from "../types";

interface UseWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

export function useWebSocket(
  lobbyId: number | null,
  playerSessionId: string | null,
  options: UseWebSocketOptions = {}
) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const optionsRef = useRef(options);
  const shouldReconnectRef = useRef(true);
  const reconnectTimerRef = useRef<number | null>(null);
  const retryCountRef = useRef(0);

  // Update options ref when options change
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const connect = useCallback(() => {
    if (!lobbyId || !playerSessionId) return;

    // don't create a new connection if one is already open or connecting
    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING)
    ) {
      console.debug("WebSocket already open/connecting, skipping connect");
      return;
    }

    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws/lobby/${lobbyId}/player/${playerSessionId}`;

      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        // Reset retry state on successful connect
        retryCountRef.current = 0;
        setIsConnected(true);
        setError(null);
        console.debug("WebSocket connected:", { lobbyId, playerSessionId, url: wsUrl });
        optionsRef.current.onConnect?.();
      };

      wsRef.current.onmessage = (event) => {
        try {
          console.debug("WebSocket raw message:", event.data);
          const message: WebSocketMessage = JSON.parse(event.data);
          console.debug("WebSocket parsed message:", message);
          optionsRef.current.onMessage?.(message);
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error, "raw:", event.data);
        }
      };

      wsRef.current.onclose = (ev) => {
        setIsConnected(false);
        console.debug("WebSocket closed:", {
          lobbyId,
          playerSessionId,
          code: ev?.code,
          reason: ev?.reason,
        });
        optionsRef.current.onDisconnect?.();

        // schedule reconnect if allowed
        if (shouldReconnectRef.current) {
          // exponential backoff with cap
          const retry = retryCountRef.current ?? 0;
          const delay = Math.min(30000, 1000 * Math.pow(2, retry));
          console.debug(`Scheduling websocket reconnect in ${delay}ms (retry=${retry})`);
          if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current);
          }
          reconnectTimerRef.current = window.setTimeout(() => {
            retryCountRef.current = (retryCountRef.current ?? 0) + 1;
            connect();
          }, delay) as unknown as number;
        }
      };

      wsRef.current.onerror = (error) => {
        setError("WebSocket connection error");
        console.error("WebSocket error event:", error);
        optionsRef.current.onError?.(error);
      };
    } catch (error) {
      console.error("Failed to create WebSocket connection:", error);
      setError("Failed to create WebSocket connection");
    }
  }, [lobbyId, playerSessionId]);

  const disconnect = () => {
    // Stop reconnection attempts and close socket
    shouldReconnectRef.current = false;
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        /* ignore */
      }
      wsRef.current = null;
    }
  };

  const sendMessage = (message: Record<string, unknown>) => {
    if (wsRef.current && isConnected) {
      wsRef.current.send(JSON.stringify(message));
    }
  };

  useEffect(() => {
    if (lobbyId && playerSessionId) {
      // allow reconnections when lobbyId/playerSessionId are provided
      shouldReconnectRef.current = true;
      connect();
    }
    return () => {
      // cleanup on unmount or when lobby/player changes
      shouldReconnectRef.current = false;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      disconnect();
    };
  }, [lobbyId, playerSessionId, connect]);

  return {
    isConnected,
    error,
    sendMessage,
    connect,
    disconnect,
  };
}
