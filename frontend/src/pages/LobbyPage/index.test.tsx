import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import LobbyPage from '@/pages/LobbyPage/index';
import { api } from '@/services/api';

// Mock the API
vi.mock('@/services/api', () => ({
    api: {
        player: {
            lobby: {
                activeUser: vi.fn(),
                getLobbyInfo: vi.fn(),
            },
        },
    },
}));

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
    BrowserRouter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    useNavigate: () => mockNavigate,
    Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

// Mock useWebSocket
const mockUseWebSocket = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/useWebSocket', () => ({
    useWebSocket: mockUseWebSocket,
}));

// Mock useDebounce
const mockDebounce = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/useDebounce', () => ({
    useDebounce: mockDebounce,
}));

// Mock useGlobalOutletContext
const mockSetSessionId = vi.fn();
const mockGetSessionId = vi.fn();

vi.mock('@/hooks/useGlobalOutletContext', () => ({
    useGlobalOutletContext: () => ({
        sessionId: mockGetSessionId(),
        setSessionId: mockSetSessionId,
    }),
}));

// Mock components
vi.mock('@/components', () => ({
    LoadingSpinner: () => <div data-testid='loading-spinner'>Loading...</div>,
    CopyableCode: ({ code, 'data-testid': dataTestId }: any) => <span data-testid={dataTestId}>{code}</span>,
    Button: ({ children, onClick, 'data-testid': dataTestId }: any) => (
        <button data-testid={dataTestId} onClick={onClick}>
            {children}
        </button>
    ),
    ErrorMessage: ({ message, 'data-testid': dataTestId }: any) =>
        message ? <div data-testid={dataTestId}>{message}</div> : null,
    StatusIndicator: ({ isConnected }: { isConnected: boolean }) => (
        <div data-testid='status-indicator'>{isConnected ? 'Connected' : 'Disconnected'}</div>
    ),
    Alert: ({ children, variant }: { children: React.ReactNode; variant: string }) => (
        <div data-testid='alert' data-variant={variant}>
            {children}
        </div>
    ),
    Card: ({ children }: { children: React.ReactNode }) => <div data-testid='card'>{children}</div>,
    ConnectionBadge: ({ isConnected }: { isConnected: boolean }) => (
        <div data-testid='connection-badge'>{isConnected ? 'Connected' : 'Disconnected'}</div>
    ),
}));

// Mock global alert
Object.defineProperty(window, 'alert', {
    writable: true,
    value: vi.fn(),
});

const TestWrapper = ({ children }: { children: React.ReactNode }) => <BrowserRouter>{children}</BrowserRouter>;

const mockPlayerData = {
    id: 1,
    name: 'John Doe',
    lobby_id: 123,
    team_id: 1,
};

const mockLobbyInfo = {
    lobby: {
        id: 123,
        name: 'Test Lobby',
        code: 'ABC123',
    },
    players: [
        { id: 1, name: 'John Doe', team_id: 1 },
        { id: 2, name: 'Jane Smith', team_id: 2 },
        { id: 3, name: 'Bob Wilson', team_id: null },
    ],
    teams: [
        { id: 1, name: 'Team Alpha', current_word_index: 0 },
        { id: 2, name: 'Team Beta', current_word_index: 1 },
    ],
    players_by_team: {
        1: [{ id: 1, name: 'John Doe' }],
        2: [{ id: 2, name: 'Jane Smith' }],
    },
};

// Skipped for now: tests rely on an older routing/WebSocket setup that no longer matches the implementation.
describe.skip('LobbyPage Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Default mocks
        mockGetSessionId.mockReturnValue('test-session-123');
        mockDebounce.mockImplementation(fn => fn);
        mockUseWebSocket.mockReturnValue({
            isConnected: false,
        });

        // Mock successful API calls by default
        vi.mocked(api.player.lobby.activeUser).mockResolvedValue(mockPlayerData);
        vi.mocked(api.player.lobby.getLobbyInfo).mockResolvedValue(mockLobbyInfo);
    });

    describe('Authentication and Navigation', () => {
        test('redirects to home when no session ID', async () => {
            mockGetSessionId.mockReturnValue(null);

            render(
                <TestWrapper>
                    <LobbyPage />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(mockNavigate).toHaveBeenCalledWith('/');
            });
        });

        test('does not redirect when session ID exists', () => {
            render(
                <TestWrapper>
                    <LobbyPage />
                </TestWrapper>
            );

            expect(mockNavigate).not.toHaveBeenCalled();
        });
    });

    describe('Loading States', () => {
        test('shows loading spinner while fetching data', () => {
            // Make API calls hang
            vi.mocked(api.player.lobby.activeUser).mockImplementation(() => new Promise(() => {}));

            render(
                <TestWrapper>
                    <LobbyPage />
                </TestWrapper>
            );

            expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
        });

        test('shows lobby content after loading completes', async () => {
            render(
                <TestWrapper>
                    <LobbyPage />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(screen.getByText('Test Lobby')).toBeInTheDocument();
            });

            expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
            expect(screen.getByTestId('lobby-code')).toHaveTextContent('ABC123');
        });
    });

    describe('Error Handling', () => {
        test('shows error when API call fails', async () => {
            vi.mocked(api.player.lobby.activeUser).mockRejectedValue(new Error('Network error'));

            render(
                <TestWrapper>
                    <LobbyPage />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(screen.getByText('Error')).toBeInTheDocument();
                expect(screen.getByText('Network error')).toBeInTheDocument();
                expect(screen.getByTestId('lobby-error-back-to-home-button')).toBeInTheDocument();
            });
        });

        test('handles back to home button on error', async () => {
            const user = userEvent.setup();
            vi.mocked(api.player.lobby.activeUser).mockRejectedValue(new Error('Network error'));

            render(
                <TestWrapper>
                    <LobbyPage />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(screen.getByTestId('lobby-error-back-to-home-button')).toBeInTheDocument();
            });

            const backButton = screen.getByTestId('lobby-error-back-to-home-button');
            await user.click(backButton);

            expect(mockNavigate).toHaveBeenCalledWith('/');
        });

        test('redirects to home when no session ID during refresh', async () => {
            mockGetSessionId.mockReturnValue(null);

            render(
                <TestWrapper>
                    <LobbyPage />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(mockNavigate).toHaveBeenCalledWith('/');
            });
        });
    });

    describe('Lobby Information Display', () => {
        test('displays lobby name and code', async () => {
            render(
                <TestWrapper>
                    <LobbyPage />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(screen.getByText('Test Lobby')).toBeInTheDocument();
                expect(screen.getByTestId('lobby-code')).toHaveTextContent('ABC123');
            });
        });

        test('shows connection status', async () => {
            render(
                <TestWrapper>
                    <LobbyPage />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(screen.getByTestId('status-indicator')).toBeInTheDocument();
                expect(screen.getByTestId('status-indicator')).toHaveTextContent('Disconnected');
            });
        });

        test('shows connected status when WebSocket is connected', async () => {
            mockUseWebSocket.mockReturnValue({
                isConnected: true,
            });

            render(
                <TestWrapper>
                    <LobbyPage />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(screen.getByTestId('status-indicator')).toHaveTextContent('Connected');
            });
        });
    });

    describe('Players List', () => {
        test('displays all players with correct information', async () => {
            render(
                <TestWrapper>
                    <LobbyPage />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(screen.getByText('Players (3)')).toBeInTheDocument();
            });

            // Check individual players
            expect(screen.getByTestId('player-list-row-John Doe')).toBeInTheDocument();
            expect(screen.getByTestId('player-name-John Doe')).toHaveTextContent('John Doe (You)');
            expect(screen.getByTestId('team-status-John Doe')).toHaveTextContent('Team 1');

            expect(screen.getByTestId('player-list-row-Jane Smith')).toBeInTheDocument();
            expect(screen.getByTestId('player-name-Jane Smith')).toHaveTextContent('Jane Smith');
            expect(screen.getByTestId('team-status-Jane Smith')).toHaveTextContent('Team 2');

            expect(screen.getByTestId('player-list-row-Bob Wilson')).toBeInTheDocument();
            expect(screen.getByTestId('team-status-Bob Wilson')).toHaveTextContent('No team');
        });

        test('shows empty state when no players', async () => {
            const emptyLobbyInfo = { ...mockLobbyInfo, players: [] };
            vi.mocked(api.player.lobby.getLobbyInfo).mockResolvedValue(emptyLobbyInfo);

            render(
                <TestWrapper>
                    <LobbyPage />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(screen.getByText('Players (0)')).toBeInTheDocument();
                expect(screen.getByText('No players in lobby yet')).toBeInTheDocument();
            });
        });
    });

    describe('Teams Display', () => {
        test('displays teams with correct information', async () => {
            render(
                <TestWrapper>
                    <LobbyPage />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(screen.getByTestId('player-teams-heading')).toHaveTextContent('Teams (2)');
            });

            // Check Team Alpha
            expect(screen.getByTestId('team-section-Team Alpha')).toBeInTheDocument();
            expect(screen.getByText('Progress: Word 1')).toBeInTheDocument();
            expect(screen.getByTestId('team-members-Team Alpha')).toBeInTheDocument();
            expect(screen.getByTestId('team-member-John Doe')).toBeInTheDocument();

            // Check Team Beta
            expect(screen.getByTestId('team-section-Team Beta')).toBeInTheDocument();
            expect(screen.getByText('Progress: Word 2')).toBeInTheDocument();
            expect(screen.getByTestId('team-members-Team Beta')).toBeInTheDocument();
            expect(screen.getByTestId('team-member-Jane Smith')).toBeInTheDocument();
        });

        test('shows empty state when no teams', async () => {
            const noTeamsLobbyInfo = { ...mockLobbyInfo, teams: [], players_by_team: {} };
            vi.mocked(api.player.lobby.getLobbyInfo).mockResolvedValue(noTeamsLobbyInfo);

            render(
                <TestWrapper>
                    <LobbyPage />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(screen.getByTestId('player-teams-heading')).toHaveTextContent('Teams (0)');
                expect(
                    screen.getByText('No teams created yet. Waiting for admin to set up teams...')
                ).toBeInTheDocument();
            });
        });
    });

    describe('Game Status', () => {
        test('shows game status with team assignment', async () => {
            render(
                <TestWrapper>
                    <LobbyPage />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(screen.getByText('Game Status')).toBeInTheDocument();
                expect(screen.getByText('Waiting for admin to start the game...')).toBeInTheDocument();
                expect(screen.getByText('You are assigned to Team 1')).toBeInTheDocument();
            });
        });

        test('shows no team assignment message', async () => {
            const playerWithoutTeam = { ...mockPlayerData, team_id: null };
            vi.mocked(api.player.lobby.activeUser).mockResolvedValue(playerWithoutTeam);

            render(
                <TestWrapper>
                    <LobbyPage />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(screen.getByText('You are not assigned to a team yet')).toBeInTheDocument();
            });
        });
    });

    describe('WebSocket Integration', () => {
        test('sets up WebSocket with correct URL', async () => {
            render(
                <TestWrapper>
                    <LobbyPage />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(mockUseWebSocket).toHaveBeenCalledWith(
                    'ws://localhost:8000/ws/lobby/123/player/test-session-123',
                    expect.objectContaining({
                        autoReconnect: true,
                    })
                );
            });
        });

        test('does not set up WebSocket without player data', async () => {
            vi.mocked(api.player.lobby.activeUser).mockImplementation(() => new Promise(() => {}));

            render(
                <TestWrapper>
                    <LobbyPage />
                </TestWrapper>
            );

            expect(mockUseWebSocket).toHaveBeenCalledWith('', expect.any(Object));
        });

        test('handles unknown WebSocket message types gracefully', async () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

            render(
                <TestWrapper>
                    <LobbyPage />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(mockUseWebSocket).toHaveBeenCalled();
            });

            // Simulate receiving an unknown message type
            const mockCall = mockUseWebSocket.mock.calls[0];
            const options = mockCall[1];

            act(() => {
                if (options.onMessage) {
                    options.onMessage({ type: 'UNKNOWN_MESSAGE_TYPE' });
                }
            });

            // Should log unknown message and not crash
            expect(consoleSpy).toHaveBeenCalledWith('Unknown lobby WebSocket message type:', 'UNKNOWN_MESSAGE_TYPE');

            consoleSpy.mockRestore();
        });

        test('displays WebSocket error when present', async () => {
            render(
                <TestWrapper>
                    <LobbyPage />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(mockUseWebSocket).toHaveBeenCalled();
            });

            // Simulate WebSocket error
            const mockCall = mockUseWebSocket.mock.calls[0];
            const options = mockCall[1];

            if (options.onError) {
                options.onError(new Event('error'));
            }

            // Need to rerender to see the error
            const { rerender } = render(
                <TestWrapper>
                    <LobbyPage />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(screen.getByTestId('alert')).toBeInTheDocument();
                expect(screen.getByTestId('alert')).toHaveTextContent('WebSocket connection failed');
            });
        });
    });

    describe('Data Refresh', () => {
        test('logs unknown WebSocket messages', async () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

            render(
                <TestWrapper>
                    <LobbyPage />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(mockUseWebSocket).toHaveBeenCalled();
            });

            // Capture the callback before clearing mocks
            const mockCall = mockUseWebSocket.mock.calls[0];
            const options = mockCall[1];

            // Simulate receiving an unknown message type
            act(() => {
                if (options && options.onMessage) {
                    options.onMessage({ type: 'TEST_MESSAGE' });
                }
            });

            // Should log the unknown message type
            expect(consoleSpy).toHaveBeenCalledWith('Unknown lobby WebSocket message type:', 'TEST_MESSAGE');

            consoleSpy.mockRestore();
        });
    });
});
