import { renderHook, act } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { useWebSocket } from '@/hooks/useWebSocket';

// Mock WebSocket
class MockWebSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;

    readyState = MockWebSocket.CONNECTING;
    onopen: ((event: Event) => void) | null = null;
    onclose: ((event: CloseEvent) => void) | null = null;
    onmessage: ((event: MessageEvent) => void) | null = null;
    onerror: ((event: Event) => void) | null = null;

    constructor(public url: string) {
        // Simulate async connection
        setTimeout(() => {
            this.readyState = WebSocket.OPEN;
            this.onopen?.(new Event('open'));
        }, 0);
    }

    send = vi.fn();
    close = vi.fn(() => {
        this.readyState = WebSocket.CLOSED;
        this.onclose?.(new CloseEvent('close'));
    });

    // Helper methods for testing
    simulateMessage(data: string) {
        if (this.onmessage) {
            this.onmessage(new MessageEvent('message', { data }));
        }
    }

    simulateError() {
        this.onerror?.(new Event('error'));
    }

    simulateClose() {
        this.readyState = WebSocket.CLOSED;
        this.onclose?.(new CloseEvent('close'));
    }
}

// Store original WebSocket
const OriginalWebSocket = global.WebSocket;

describe('useWebSocket Hook', () => {
    let mockWebSocket: MockWebSocket;

    beforeEach(() => {
        vi.useFakeTimers();
        // Mock WebSocket globally
        global.WebSocket = vi.fn().mockImplementation((url: string) => {
            mockWebSocket = new MockWebSocket(url);
            return mockWebSocket;
        }) as any;
    });

    afterEach(() => {
        vi.runOnlyPendingTimers();
        vi.useRealTimers();
        global.WebSocket = OriginalWebSocket;
        vi.clearAllMocks();
    });

    describe('Basic Connection', () => {
        test('establishes WebSocket connection on mount', async () => {
            const { result } = renderHook(() => useWebSocket('ws://localhost:8000'));

            expect(global.WebSocket).toHaveBeenCalledWith('ws://localhost:8000');
            expect(result.current.isConnected).toBe(false);

            // Simulate connection opening
            await act(async () => {
                await vi.runOnlyPendingTimersAsync();
            });

            expect(result.current.isConnected).toBe(true);
            expect(result.current.error).toBeNull();
        });

        test('does not connect when wsUrl is empty', () => {
            renderHook(() => useWebSocket(''));

            expect(global.WebSocket).not.toHaveBeenCalled();
        });

        test('calls onConnect callback when connection opens', async () => {
            const onConnect = vi.fn();
            renderHook(() => useWebSocket('ws://localhost:8000', { onConnect }));

            await act(async () => {
                await vi.runOnlyPendingTimersAsync();
            });

            expect(onConnect).toHaveBeenCalledTimes(1);
        });
    });

    describe('Message Handling', () => {
        test('calls onMessage callback when receiving valid JSON message', async () => {
            const onMessage = vi.fn();
            renderHook(() => useWebSocket('ws://localhost:8000', { onMessage }));

            await act(async () => {
                await vi.runOnlyPendingTimersAsync();
            });

            const testMessage = { type: 'test', data: 'hello' };
            act(() => {
                mockWebSocket.simulateMessage(JSON.stringify(testMessage));
            });

            expect(onMessage).toHaveBeenCalledWith(testMessage);
        });

        test('handles invalid JSON messages gracefully', async () => {
            const onMessage = vi.fn();
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            renderHook(() => useWebSocket('ws://localhost:8000', { onMessage }));

            await act(async () => {
                await vi.runOnlyPendingTimersAsync();
            });

            act(() => {
                mockWebSocket.simulateMessage('invalid json');
            });

            expect(onMessage).not.toHaveBeenCalled();
            expect(consoleSpy).toHaveBeenCalledWith('Failed to parse WebSocket message:', expect.any(Error));

            consoleSpy.mockRestore();
        });
    });

    describe('Sending Messages', () => {
        test('sends messages when connected', async () => {
            const { result } = renderHook(() => useWebSocket('ws://localhost:8000'));

            await act(async () => {
                await vi.runOnlyPendingTimersAsync();
            });

            // Verify the hook is connected
            expect(result.current.isConnected).toBe(true);

            const message = { type: 'test', data: 'hello' };
            act(() => {
                result.current.sendMessage(message);
            });

            expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify(message));
        });

        test('does not send messages when not connected', () => {
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            const { result } = renderHook(() => useWebSocket('ws://localhost:8000'));

            const message = { type: 'test', data: 'hello' };
            act(() => {
                result.current.sendMessage(message);
            });

            expect(mockWebSocket.send).not.toHaveBeenCalled();
            expect(consoleSpy).toHaveBeenCalledWith('Admin WebSocket is not connected, cannot send message:', message);

            consoleSpy.mockRestore();
        });
    });

    describe('Connection Events', () => {
        test('calls onDisconnect when connection closes', async () => {
            const onDisconnect = vi.fn();
            const { result } = renderHook(() => useWebSocket('ws://localhost:8000', { onDisconnect }));

            await act(async () => {
                await vi.runOnlyPendingTimersAsync();
            });

            expect(result.current.isConnected).toBe(true);

            act(() => {
                mockWebSocket.simulateClose();
            });

            expect(result.current.isConnected).toBe(false);
            expect(onDisconnect).toHaveBeenCalledTimes(1);
        });

        test('calls onError when connection errors', async () => {
            const onError = vi.fn();
            const { result } = renderHook(() => useWebSocket('ws://localhost:8000', { onError }));

            await act(async () => {
                await vi.runOnlyPendingTimersAsync();
            });

            act(() => {
                mockWebSocket.simulateError();
            });

            expect(result.current.error).toBe('WebSocket connection failed');
            expect(onError).toHaveBeenCalledTimes(1);
        });
    });

    describe('Auto Reconnection', () => {
        test('automatically reconnects when autoReconnect is true', async () => {
            const { result } = renderHook(() =>
                useWebSocket('ws://localhost:8000', { autoReconnect: true, reconnectInterval: 1000 })
            );

            await act(async () => {
                await vi.runOnlyPendingTimersAsync();
            });

            expect(result.current.isConnected).toBe(true);

            // Simulate connection close
            act(() => {
                mockWebSocket.simulateClose();
            });

            expect(result.current.isConnected).toBe(false);

            // Fast forward past reconnect interval
            await act(async () => {
                vi.advanceTimersByTime(1000);
                await vi.runOnlyPendingTimersAsync();
            });

            // Should attempt to reconnect
            expect(global.WebSocket).toHaveBeenCalledTimes(2);
        });

        test('does not reconnect when autoReconnect is false', async () => {
            renderHook(() => useWebSocket('ws://localhost:8000', { autoReconnect: false }));

            await act(async () => {
                await vi.runOnlyPendingTimersAsync();
            });

            act(() => {
                mockWebSocket.simulateClose();
            });

            await act(async () => {
                vi.advanceTimersByTime(5000);
                await vi.runOnlyPendingTimersAsync();
            });

            // Should only have been called once (initial connection)
            expect(global.WebSocket).toHaveBeenCalledTimes(1);
        });

        test('uses custom reconnect interval', async () => {
            vi.mocked(global.WebSocket).mockClear();

            const { unmount } = renderHook(() =>
                useWebSocket('ws://localhost:8000', { autoReconnect: true, reconnectInterval: 100 })
            );

            await act(async () => {
                await vi.runOnlyPendingTimersAsync();
            });

            // Should have been called once for initial connection
            expect(vi.mocked(global.WebSocket)).toHaveBeenCalledTimes(1);

            act(() => {
                mockWebSocket.simulateClose();
            });

            // Should reconnect after custom interval
            await act(async () => {
                vi.advanceTimersByTime(100);
                await vi.runOnlyPendingTimersAsync();
            });

            // Should have reconnected once
            expect(vi.mocked(global.WebSocket)).toHaveBeenCalledTimes(2);

            unmount();
        });
    });

    describe('Manual Disconnection', () => {
        test('disconnects manually and prevents reconnection', async () => {
            const { result } = renderHook(() => useWebSocket('ws://localhost:8000', { autoReconnect: true }));

            await act(async () => {
                await vi.runOnlyPendingTimersAsync();
            });

            expect(result.current.isConnected).toBe(true);

            act(() => {
                result.current.disconnect();
            });

            expect(result.current.isConnected).toBe(false);
            expect(mockWebSocket.close).toHaveBeenCalled();

            // Should not reconnect even with autoReconnect enabled
            await act(async () => {
                vi.advanceTimersByTime(5000);
                await vi.runOnlyPendingTimersAsync();
            });

            expect(global.WebSocket).toHaveBeenCalledTimes(1);
        });
    });

    describe('Cleanup', () => {
        test('cleans up on unmount', async () => {
            const { result, unmount } = renderHook(() => useWebSocket('ws://localhost:8000'));

            await act(async () => {
                await vi.runOnlyPendingTimersAsync();
            });

            expect(result.current.isConnected).toBe(true);

            unmount();

            expect(mockWebSocket.close).toHaveBeenCalled();
        });

        test('clears reconnect timeout on unmount', async () => {
            const { unmount } = renderHook(() => useWebSocket('ws://localhost:8000', { autoReconnect: true }));

            await act(async () => {
                await vi.runOnlyPendingTimersAsync();
            });

            // Close connection to trigger reconnect timeout
            act(() => {
                mockWebSocket.simulateClose();
            });

            // Unmount before reconnect timeout fires
            unmount();

            // Advance timers - should not reconnect
            await act(async () => {
                vi.advanceTimersByTime(5000);
                await vi.runOnlyPendingTimersAsync();
            });

            expect(global.WebSocket).toHaveBeenCalledTimes(1);
        });
    });

    describe('Callback Updates', () => {
        test('uses updated callbacks without reconnecting', async () => {
            const onMessage1 = vi.fn();
            const onMessage2 = vi.fn();

            const { rerender } = renderHook(
                ({ onMessage }) => useWebSocket('ws://localhost:8000', { onMessage }),
                { initialProps: { onMessage: onMessage1 } }
            );

            await act(async () => {
                await vi.runOnlyPendingTimersAsync();
            });

            // Send message with first callback
            act(() => {
                mockWebSocket.simulateMessage(JSON.stringify({ type: 'test1' }));
            });

            expect(onMessage1).toHaveBeenCalledWith({ type: 'test1' });
            expect(onMessage2).not.toHaveBeenCalled();

            // Update callback
            rerender({ onMessage: onMessage2 });

            // Send message with second callback
            act(() => {
                mockWebSocket.simulateMessage(JSON.stringify({ type: 'test2' }));
            });

            expect(onMessage1).toHaveBeenCalledTimes(1);
            expect(onMessage2).toHaveBeenCalledWith({ type: 'test2' });

            // Should not have reconnected
            expect(global.WebSocket).toHaveBeenCalledTimes(1);
        });
    });
});
