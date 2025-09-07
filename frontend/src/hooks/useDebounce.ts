import { useRef, useCallback } from 'react';

/**
 * A hook that provides debounced function execution
 * @param callback - The function to debounce
 * @param delay - The delay in milliseconds (default: 200)
 * @returns A debounced version of the callback function
 */
export function useDebounce<T extends (...args: unknown[]) => void>(
    callback: T,
    delay: number = 200
): (...args: Parameters<T>) => void {
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    return useCallback(
        (...args: Parameters<T>) => {
            if (timeoutRef.current) {
                return;
            }
            timeoutRef.current = setTimeout(() => {
                callback(...args);
                timeoutRef.current = null;
            }, delay);
        },
        [callback, delay]
    );
}
