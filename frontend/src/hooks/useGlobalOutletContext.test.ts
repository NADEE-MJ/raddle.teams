import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useGlobalOutletContext, GlobalOutletContext } from './useGlobalOutletContext';
import { useOutletContext } from 'react-router-dom';

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
    useOutletContext: vi.fn(),
}));

describe('useGlobalOutletContext', () => {
    it('should return outlet context', () => {
        const mockContext: GlobalOutletContext = {
            sessionId: 'test-session',
            setSessionId: vi.fn(),
            getSessionIdFromLocalStorage: vi.fn(),
            adminApiToken: 'test-token',
            setAdminApiToken: vi.fn(),
            getAdminApiTokenFromLocalStorage: vi.fn(),
            adminSessionId: 'admin-session',
            setAdminSessionId: vi.fn(),
            getAdminSessionIdFromLocalStorage: vi.fn(),
        };

        (useOutletContext as any).mockReturnValue(mockContext);

        const { result } = renderHook(() => useGlobalOutletContext());

        expect(result.current).toBe(mockContext);
        expect(result.current.sessionId).toBe('test-session');
        expect(result.current.adminApiToken).toBe('test-token');
    });

    it('should have all required context properties', () => {
        const mockContext: GlobalOutletContext = {
            sessionId: null,
            setSessionId: vi.fn(),
            getSessionIdFromLocalStorage: vi.fn(),
            adminApiToken: null,
            setAdminApiToken: vi.fn(),
            getAdminApiTokenFromLocalStorage: vi.fn(),
            adminSessionId: null,
            setAdminSessionId: vi.fn(),
            getAdminSessionIdFromLocalStorage: vi.fn(),
        };

        (useOutletContext as any).mockReturnValue(mockContext);

        const { result } = renderHook(() => useGlobalOutletContext());

        expect(result.current).toHaveProperty('sessionId');
        expect(result.current).toHaveProperty('setSessionId');
        expect(result.current).toHaveProperty('getSessionIdFromLocalStorage');
        expect(result.current).toHaveProperty('adminApiToken');
        expect(result.current).toHaveProperty('setAdminApiToken');
        expect(result.current).toHaveProperty('getAdminApiTokenFromLocalStorage');
        expect(result.current).toHaveProperty('adminSessionId');
        expect(result.current).toHaveProperty('setAdminSessionId');
        expect(result.current).toHaveProperty('getAdminSessionIdFromLocalStorage');
    });
});
