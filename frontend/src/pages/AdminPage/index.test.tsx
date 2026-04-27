import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import AdminPage from '@/pages/AdminPage/index';

// Mock useWebSocket
const mockSendMessage = vi.hoisted(() => vi.fn());
const mockUseWebSocket = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/useWebSocket', () => ({
    useWebSocket: mockUseWebSocket,
}));

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
    BrowserRouter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    useNavigate: () => mockNavigate,
    Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

// Mock useGlobalOutletContext
const mockAdminApiToken = 'test-admin-token';
const mockAdminSessionId = 'admin-session-123';
const mockGetAdminContext = vi.fn();

vi.mock('@/hooks/useGlobalOutletContext', () => ({
    useGlobalOutletContext: () => mockGetAdminContext(),
}));

// Mock child components
vi.mock('@/pages/AdminPage/LobbiesList', () => ({
    default: ({ onViewDetails, refreshKey, onDebouncedRefresh }: any) => (
        <div data-testid='lobbies-list'>
            <div>Lobbies List Component</div>
            <button data-testid='view-details-button' onClick={() => onViewDetails(123)}>
                View Details
            </button>
            <div data-testid='refresh-key'>{refreshKey}</div>
        </div>
    ),
}));

vi.mock('@/pages/AdminPage/LobbyDetails', () => ({
    default: ({ lobbyId, onClose, onLobbyDeleted, refreshKey }: any) => (
        <div data-testid='lobby-details'>
            <div>Lobby Details for ID: {lobbyId}</div>
            <button data-testid='close-details-button' onClick={onClose}>
                Close
            </button>
            <button data-testid='delete-lobby-button' onClick={onLobbyDeleted}>
                Delete Lobby
            </button>
            <div data-testid='lobby-refresh-key'>{refreshKey}</div>
        </div>
    ),
}));

// Mock components
vi.mock('@/components', () => ({
    StatusIndicator: ({ isConnected }: { isConnected: boolean }) => (
        <div data-testid='status-indicator'>Status: {isConnected ? 'Connected' : 'Disconnected'}</div>
    ),
    Alert: ({ children, variant }: { children: React.ReactNode; variant: string }) => (
        <div data-testid='alert' data-variant={variant}>
            {children}
        </div>
    ),
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => <BrowserRouter>{children}</BrowserRouter>;

describe('AdminPage Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Default mock values
        mockGetAdminContext.mockReturnValue({
            adminApiToken: mockAdminApiToken,
            adminSessionId: mockAdminSessionId,
        });

        // Set up default useWebSocket mock
        mockUseWebSocket.mockReturnValue({
            isConnected: false,
            sendMessage: mockSendMessage,
        });
    });

    describe('Basic Rendering', () => {
        test('renders admin dashboard content', () => {
            render(
                <TestWrapper>
                    <AdminPage />
                </TestWrapper>
            );

            expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
            expect(screen.getByText('Manage lobbies and monitor team games')).toBeInTheDocument();
            expect(screen.getByTestId('status-indicator')).toBeInTheDocument();
            expect(screen.getByTestId('lobbies-list')).toBeInTheDocument();
        });

        test('displays connection status', () => {
            mockUseWebSocket.mockReturnValue({
                isConnected: true,
                sendMessage: mockSendMessage,
            });

            render(
                <TestWrapper>
                    <AdminPage />
                </TestWrapper>
            );

            expect(screen.getByTestId('status-indicator')).toHaveTextContent('Status: Connected');
        });

        test('shows disconnected status by default', () => {
            render(
                <TestWrapper>
                    <AdminPage />
                </TestWrapper>
            );

            expect(screen.getByTestId('status-indicator')).toHaveTextContent('Status: Disconnected');
        });
    });

    describe('Authentication Check', () => {
        test('redirects to login when no admin token', async () => {
            mockGetAdminContext.mockReturnValue({
                adminApiToken: null,
                adminSessionId: mockAdminSessionId,
            });

            render(
                <TestWrapper>
                    <AdminPage />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(mockNavigate).toHaveBeenCalledWith('/admin/login');
            });
        });

        test('redirects to login when no admin session', async () => {
            mockGetAdminContext.mockReturnValue({
                adminApiToken: mockAdminApiToken,
                adminSessionId: null,
            });

            render(
                <TestWrapper>
                    <AdminPage />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(mockNavigate).toHaveBeenCalledWith('/admin/login');
            });
        });

        test('does not redirect when both token and session exist', () => {
            render(
                <TestWrapper>
                    <AdminPage />
                </TestWrapper>
            );

            expect(mockNavigate).not.toHaveBeenCalled();
        });
    });

    describe('WebSocket Integration', () => {
        test('sets up WebSocket with correct URL', async () => {
            render(
                <TestWrapper>
                    <AdminPage />
                </TestWrapper>
            );

            expect(mockUseWebSocket).toHaveBeenCalledWith(
                `/ws/admin/${mockAdminSessionId}?token=${mockAdminApiToken}`,
                expect.objectContaining({
                    autoReconnect: false,
                })
            );
        });

        test('does not set up WebSocket without credentials', async () => {
            mockGetAdminContext.mockReturnValue({
                adminApiToken: null,
                adminSessionId: null,
            });

            render(
                <TestWrapper>
                    <AdminPage />
                </TestWrapper>
            );

            expect(mockUseWebSocket).toHaveBeenCalledWith('', expect.any(Object));
        });

        test('displays WebSocket error when present', async () => {
            const { rerender } = render(
                <TestWrapper>
                    <AdminPage />
                </TestWrapper>
            );

            // Initially no error
            expect(screen.queryByTestId('alert')).not.toBeInTheDocument();

            // Simulate WebSocket error by calling the onError callback
            const mockCall = mockUseWebSocket.mock.calls[0];
            const options = mockCall[1];
            if (options.onError) {
                options.onError(new Event('error'));
            }

            rerender(
                <TestWrapper>
                    <AdminPage />
                </TestWrapper>
            );

            expect(screen.getByTestId('alert')).toBeInTheDocument();
            expect(screen.getByTestId('alert')).toHaveTextContent('WebSocket connection failed');
            expect(screen.getByTestId('alert')).toHaveAttribute('data-variant', 'error');
        });
    });

    describe('Lobby Management', () => {
        test('handles viewing lobby details', async () => {
            const user = userEvent.setup();

            render(
                <TestWrapper>
                    <AdminPage />
                </TestWrapper>
            );

            const viewDetailsButton = screen.getByTestId('view-details-button');
            await user.click(viewDetailsButton);

            // Should show lobby details modal
            expect(screen.getByTestId('lobby-details')).toBeInTheDocument();
            expect(screen.getByText('Lobby Details for ID: 123')).toBeInTheDocument();

            // Should send WebSocket subscription message
            expect(mockSendMessage).toHaveBeenCalledWith({
                action: 'subscribe_lobby',
                lobby_id: 123,
            });
        });

        test('handles closing lobby details', async () => {
            const user = userEvent.setup();

            render(
                <TestWrapper>
                    <AdminPage />
                </TestWrapper>
            );

            // First open details
            const viewDetailsButton = screen.getByTestId('view-details-button');
            await user.click(viewDetailsButton);

            expect(screen.getByTestId('lobby-details')).toBeInTheDocument();

            // Clear previous calls
            mockSendMessage.mockClear();

            // Then close details
            const closeButton = screen.getByTestId('close-details-button');
            await user.click(closeButton);

            // Should hide lobby details modal
            expect(screen.queryByTestId('lobby-details')).not.toBeInTheDocument();

            // Should send WebSocket unsubscription message
            expect(mockSendMessage).toHaveBeenCalledWith({
                action: 'unsubscribe_lobby',
                lobby_id: 123,
            });
        });

        test('handles lobby deletion', async () => {
            const user = userEvent.setup();

            render(
                <TestWrapper>
                    <AdminPage />
                </TestWrapper>
            );

            // Open details first
            const viewDetailsButton = screen.getByTestId('view-details-button');
            await user.click(viewDetailsButton);

            // Get initial refresh key
            const initialRefreshKey = screen.getByTestId('refresh-key').textContent;

            // Delete lobby
            const deleteButton = screen.getByTestId('delete-lobby-button');
            await user.click(deleteButton);

            // Should close details modal
            expect(screen.queryByTestId('lobby-details')).not.toBeInTheDocument();

            // Should trigger lobbies list refresh
            await waitFor(() => {
                const newRefreshKey = screen.getByTestId('refresh-key').textContent;
                expect(newRefreshKey).not.toBe(initialRefreshKey);
            });
        });
    });

    describe('Component Integration', () => {
        test('passes correct props to LobbiesList', () => {
            render(
                <TestWrapper>
                    <AdminPage />
                </TestWrapper>
            );

            expect(screen.getByTestId('lobbies-list')).toBeInTheDocument();
            expect(screen.getByText('Lobbies List Component')).toBeInTheDocument();

            // Check that refresh key starts at 0
            expect(screen.getByTestId('refresh-key')).toHaveTextContent('0');
        });

        test('passes correct props to LobbyDetails when selected', async () => {
            const user = userEvent.setup();

            render(
                <TestWrapper>
                    <AdminPage />
                </TestWrapper>
            );

            // Select a lobby
            const viewDetailsButton = screen.getByTestId('view-details-button');
            await user.click(viewDetailsButton);

            expect(screen.getByTestId('lobby-details')).toBeInTheDocument();
            expect(screen.getByText('Lobby Details for ID: 123')).toBeInTheDocument();

            // Check that refresh key starts at 0
            expect(screen.getByTestId('lobby-refresh-key')).toHaveTextContent('0');
        });
    });

    describe('Error Handling', () => {
        test('handles missing sendMessage gracefully', async () => {
            const user = userEvent.setup();

            mockUseWebSocket.mockReturnValue({
                isConnected: false,
                sendMessage: null,
            });

            render(
                <TestWrapper>
                    <AdminPage />
                </TestWrapper>
            );

            // Should not crash when sendMessage is null
            const viewDetailsButton = screen.getByTestId('view-details-button');
            await user.click(viewDetailsButton);

            expect(screen.getByTestId('lobby-details')).toBeInTheDocument();
            // No WebSocket message should be sent
            expect(mockSendMessage).not.toHaveBeenCalled();
        });

        test('handles WebSocket connection changes', async () => {
            const { rerender } = render(
                <TestWrapper>
                    <AdminPage />
                </TestWrapper>
            );

            expect(screen.getByTestId('status-indicator')).toHaveTextContent('Status: Disconnected');

            // Update WebSocket to connected
            mockUseWebSocket.mockReturnValue({
                isConnected: true,
                sendMessage: mockSendMessage,
            });

            rerender(
                <TestWrapper>
                    <AdminPage />
                </TestWrapper>
            );

            expect(screen.getByTestId('status-indicator')).toHaveTextContent('Status: Connected');
        });
    });
});
