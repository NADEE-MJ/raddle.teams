import { renderHook, act } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { useDebounce } from '@/hooks/useDebounce';

describe('useDebounce Hook', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.runOnlyPendingTimers();
        vi.useRealTimers();
    });

    describe('Basic Functionality', () => {
        test('calls the callback after the specified delay', () => {
            const callback = vi.fn();
            const { result } = renderHook(() => useDebounce(callback, 200));

            act(() => {
                result.current();
            });

            expect(callback).not.toHaveBeenCalled();

            act(() => {
                vi.advanceTimersByTime(200);
            });

            expect(callback).toHaveBeenCalledTimes(1);
        });

        test('uses default delay of 200ms when not specified', () => {
            const callback = vi.fn();
            const { result } = renderHook(() => useDebounce(callback));

            act(() => {
                result.current();
            });

            expect(callback).not.toHaveBeenCalled();

            act(() => {
                vi.advanceTimersByTime(199);
            });

            expect(callback).not.toHaveBeenCalled();

            act(() => {
                vi.advanceTimersByTime(1);
            });

            expect(callback).toHaveBeenCalledTimes(1);
        });

        test('passes arguments to the callback', () => {
            const callback = vi.fn();
            const { result } = renderHook(() => useDebounce(callback, 100));

            act(() => {
                result.current('arg1', 'arg2', 123);
            });

            act(() => {
                vi.advanceTimersByTime(100);
            });

            expect(callback).toHaveBeenCalledWith('arg1', 'arg2', 123);
        });
    });

    describe('Debouncing Behavior', () => {
        test('prevents multiple calls when invoked rapidly', () => {
            const callback = vi.fn();
            const { result } = renderHook(() => useDebounce(callback, 200));

            // Call multiple times rapidly
            act(() => {
                result.current();
                result.current();
                result.current();
            });

            act(() => {
                vi.advanceTimersByTime(200);
            });

            // Should only be called once due to debouncing
            expect(callback).toHaveBeenCalledTimes(1);
        });

        test('ignores calls made while timeout is active', () => {
            const callback = vi.fn();
            const { result } = renderHook(() => useDebounce(callback, 200));

            act(() => {
                result.current();
            });

            // Try calling again before timeout expires
            act(() => {
                vi.advanceTimersByTime(100);
                result.current();
                result.current();
            });

            act(() => {
                vi.advanceTimersByTime(200);
            });

            // Should still only be called once from the first invocation
            expect(callback).toHaveBeenCalledTimes(1);
        });

        test('allows new calls after timeout completes', () => {
            const callback = vi.fn();
            const { result } = renderHook(() => useDebounce(callback, 100));

            // First call
            act(() => {
                result.current('first');
            });

            act(() => {
                vi.advanceTimersByTime(100);
            });

            expect(callback).toHaveBeenCalledTimes(1);
            expect(callback).toHaveBeenLastCalledWith('first');

            // Second call after timeout completes
            act(() => {
                result.current('second');
            });

            act(() => {
                vi.advanceTimersByTime(100);
            });

            expect(callback).toHaveBeenCalledTimes(2);
            expect(callback).toHaveBeenLastCalledWith('second');
        });
    });

    describe('Hook Dependencies', () => {
        test('updates when callback changes', () => {
            const callback1 = vi.fn();
            const callback2 = vi.fn();

            const { result, rerender } = renderHook(({ cb }) => useDebounce(cb, 100), {
                initialProps: { cb: callback1 },
            });

            act(() => {
                result.current();
            });

            act(() => {
                vi.advanceTimersByTime(100);
            });

            // Should call the first callback
            expect(callback1).toHaveBeenCalledTimes(1);
            expect(callback2).not.toHaveBeenCalled();

            // Clear call counts
            callback1.mockClear();
            callback2.mockClear();

            // Change the callback and test again
            rerender({ cb: callback2 });

            act(() => {
                result.current();
            });

            act(() => {
                vi.advanceTimersByTime(100);
            });

            // Should call the new callback
            expect(callback1).not.toHaveBeenCalled();
            expect(callback2).toHaveBeenCalledTimes(1);
        });

        test('updates when delay changes', () => {
            const callback = vi.fn();

            const { result, rerender } = renderHook(({ delay }) => useDebounce(callback, delay), {
                initialProps: { delay: 100 },
            });

            act(() => {
                result.current();
            });

            act(() => {
                vi.advanceTimersByTime(100);
            });

            // Should call with original delay
            expect(callback).toHaveBeenCalledTimes(1);

            // Clear and test new delay
            callback.mockClear();

            // Change the delay and test again
            rerender({ delay: 300 });

            act(() => {
                result.current();
            });

            // Original delay should not trigger
            act(() => {
                vi.advanceTimersByTime(100);
            });

            expect(callback).not.toHaveBeenCalled();

            // New delay should trigger
            act(() => {
                vi.advanceTimersByTime(200);
            });

            expect(callback).toHaveBeenCalledTimes(1);
        });
    });

    describe('Edge Cases', () => {
        test('handles zero delay', () => {
            const callback = vi.fn();
            const { result } = renderHook(() => useDebounce(callback, 0));

            act(() => {
                result.current();
            });

            act(() => {
                vi.advanceTimersByTime(0);
            });

            expect(callback).toHaveBeenCalledTimes(1);
        });

        test('handles very large delay', () => {
            const callback = vi.fn();
            const { result } = renderHook(() => useDebounce(callback, 10000));

            act(() => {
                result.current();
            });

            act(() => {
                vi.advanceTimersByTime(9999);
            });

            expect(callback).not.toHaveBeenCalled();

            act(() => {
                vi.advanceTimersByTime(1);
            });

            expect(callback).toHaveBeenCalledTimes(1);
        });

        test('maintains stable reference when dependencies do not change', () => {
            const callback = vi.fn();
            const { result, rerender } = renderHook(() => useDebounce(callback, 100));

            const firstReference = result.current;
            rerender();
            const secondReference = result.current;

            expect(firstReference).toBe(secondReference);
        });
    });
});
