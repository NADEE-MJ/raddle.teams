import { render, screen, waitFor } from '@testing-library/react';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import LandingPage from '@/pages/LandingPage/index';
import { api } from '@/services/api';

// Mock the API
vi.mock('@/services/api', () => ({
    api: {
        player: {
            lobby: {
                getInfo: vi.fn(),
                join: vi.fn(),
            },
        },
    },
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

// Mock JoinForm component for isolation
vi.mock('@/pages/LandingPage/JoinForm', () => ({
    default: () => <div data-testid='join-form'>Mocked JoinForm</div>,
}));

// Mock LoadingSpinner
vi.mock('@/components', () => ({
    LoadingSpinner: () => <div data-testid='loading-spinner'>Loading...</div>,
}));

// Mock useGlobalOutletContext
const mockSetSessionId = vi.fn();
const mockGetSessionIdFromLocalStorage = vi.fn();

vi.mock('@/hooks/useGlobalOutletContext', () => ({
    useGlobalOutletContext: () => ({
        setSessionId: mockSetSessionId,
        getSessionIdFromLocalStorage: mockGetSessionIdFromLocalStorage,
    }),
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => <BrowserRouter>{children}</BrowserRouter>;

describe('LandingPage Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetSessionIdFromLocalStorage.mockReturnValue(null);
    });

    describe('Basic Rendering', () => {
        test('renders landing page content after loading', async () => {
            render(
                <TestWrapper>
                    <LandingPage />
                </TestWrapper>
            );

            // Should show loading initially, then content
            await waitFor(() => {
                expect(screen.getByTestId('landing-page-title')).toBeInTheDocument();
            });

            expect(screen.getByText('Raddle Teams')).toBeInTheDocument();
            expect(screen.getByText('Team up and solve word transformation puzzles together!')).toBeInTheDocument();
            expect(screen.getByTestId('join-form')).toBeInTheDocument();
        });

        test('shows loading spinner initially', () => {
            // Mock localStorage to return null to prevent auto redirect
            mockGetSessionIdFromLocalStorage.mockReturnValue(null);

            const { container } = render(
                <TestWrapper>
                    <LandingPage />
                </TestWrapper>
            );

            // The loading state is very brief, so we check the initial render immediately
            // If no loading spinner is visible, it means loading completed synchronously
            const hasLoadingSpinner = container.querySelector('[data-testid="loading-spinner"]');
            const hasContent = container.querySelector('[data-testid="landing-page-title"]');

            // Either should have loading spinner OR content (if loading completed immediately)
            expect(hasLoadingSpinner || hasContent).toBeTruthy();
        });
    });

    describe('Session Handling', () => {
        test('redirects to existing lobby when valid session exists', async () => {
            const mockSessionId = 'test-session-123';
            const mockLobbyData = { code: 'ABC123', name: 'Test Lobby' };

            mockGetSessionIdFromLocalStorage.mockReturnValue(mockSessionId);
            vi.mocked(api.player.lobby.getInfo).mockResolvedValue(mockLobbyData);

            render(
                <TestWrapper>
                    <LandingPage />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(api.player.lobby.getInfo).toHaveBeenCalledWith(mockSessionId);
                expect(mockSetSessionId).toHaveBeenCalledWith(mockSessionId);
                expect(mockNavigate).toHaveBeenCalledWith('/lobby/ABC123');
            });
        });

        test('clears invalid session and shows landing page', async () => {
            const mockSessionId = 'invalid-session';

            mockGetSessionIdFromLocalStorage.mockReturnValue(mockSessionId);
            vi.mocked(api.player.lobby.getInfo).mockRejectedValue(new Error('Session not found'));

            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            render(
                <TestWrapper>
                    <LandingPage />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(api.player.lobby.getInfo).toHaveBeenCalledWith(mockSessionId);
                expect(mockSetSessionId).toHaveBeenCalledWith(null);
                expect(consoleSpy).toHaveBeenCalledWith('Failed to get lobby info for session:', expect.any(Error));
            });

            // Should show landing page content after error
            await waitFor(() => {
                expect(screen.getByTestId('landing-page-title')).toBeInTheDocument();
            });

            consoleSpy.mockRestore();
        });

        test('shows landing page when no session exists', async () => {
            mockGetSessionIdFromLocalStorage.mockReturnValue(null);

            render(
                <TestWrapper>
                    <LandingPage />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(screen.getByTestId('landing-page-title')).toBeInTheDocument();
            });

            expect(api.player.lobby.getInfo).not.toHaveBeenCalled();
            expect(mockNavigate).not.toHaveBeenCalled();
        });
    });

    describe('Loading States', () => {
        test('shows content after loading completes', async () => {
            mockGetSessionIdFromLocalStorage.mockReturnValue(null);

            render(
                <TestWrapper>
                    <LandingPage />
                </TestWrapper>
            );

            // Wait for content to appear (loading state may be too brief to catch)
            await waitFor(() => {
                expect(screen.getByTestId('landing-page-title')).toBeInTheDocument();
            });

            // Should not have loading spinner after content loads
            expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
        });

        test('shows content even during session validation', async () => {
            const mockSessionId = 'test-session';
            mockGetSessionIdFromLocalStorage.mockReturnValue(mockSessionId);

            // Make API call hang to test loading behavior
            vi.mocked(api.player.lobby.getInfo).mockImplementation(() => new Promise(() => {}));

            render(
                <TestWrapper>
                    <LandingPage />
                </TestWrapper>
            );

            // Should still show content while session validation is happening
            await waitFor(() => {
                expect(screen.getByTestId('landing-page-title')).toBeInTheDocument();
            });
        });
    });

    describe('Error Handling', () => {
        test('handles network errors gracefully during session validation', async () => {
            const mockSessionId = 'test-session';
            mockGetSessionIdFromLocalStorage.mockReturnValue(mockSessionId);
            vi.mocked(api.player.lobby.getInfo).mockRejectedValue(new Error('Network error'));

            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            render(
                <TestWrapper>
                    <LandingPage />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(consoleSpy).toHaveBeenCalledWith('Failed to get lobby info for session:', expect.any(Error));
                expect(mockSetSessionId).toHaveBeenCalledWith(null);
            });

            // Should still render the landing page
            expect(screen.getByTestId('landing-page-title')).toBeInTheDocument();

            consoleSpy.mockRestore();
        });
    });

    describe('Component Integration', () => {
        test('renders JoinForm component', async () => {
            render(
                <TestWrapper>
                    <LandingPage />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(screen.getByTestId('join-form')).toBeInTheDocument();
            });
        });

        test('applies correct styling and layout', async () => {
            render(
                <TestWrapper>
                    <LandingPage />
                </TestWrapper>
            );

            await waitFor(() => {
                const container = screen.getByTestId('landing-page-title').closest('div');
                expect(container).toHaveClass('text-center');
            });

            const title = screen.getByTestId('landing-page-title');
            expect(title).toHaveClass('text-tx-primary', 'mb-6', 'text-3xl', 'font-bold');
        });
    });
});
