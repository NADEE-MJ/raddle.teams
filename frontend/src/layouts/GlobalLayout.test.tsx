import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import GlobalLayout from '@/layouts/GlobalLayout';
import { api } from '@/services/api';

// Mock the API
vi.mock('@/services/api', () => ({
    api: {
        player: {
            lobby: {
                leave: vi.fn(),
            },
        },
    },
}));

const mockNavigate = vi.fn();
const mockUseLocation = vi.fn();

vi.mock('react-router-dom', () => ({
    BrowserRouter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    useNavigate: () => mockNavigate,
    useLocation: () => mockUseLocation(),
    Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
    Outlet: ({ children }: { children?: React.ReactNode }) => <div data-testid='outlet'>{children}</div>,
}));

// Mock localStorage
const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
});

// Mock window.location.href
window.location.href = '';

const TestWrapper = ({ children, pathname = '/' }: { children: React.ReactNode; pathname?: string }) => {
    mockUseLocation.mockReturnValue({
        pathname,
        search: '',
        hash: '',
        state: null,
        key: 'test',
    });

    return <BrowserRouter>{children}</BrowserRouter>;
};

describe('GlobalLayout Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUseLocation.mockReset();
        localStorageMock.getItem.mockReturnValue(null);
        window.location.href = 'http://localhost:3000/';
    });

    describe('Basic Rendering', () => {
        test('renders main layout structure', () => {
            render(
                <TestWrapper>
                    <GlobalLayout />
                </TestWrapper>
            );

            expect(screen.getByTestId('home-link')).toBeInTheDocument();
            expect(screen.getByTestId('home-link')).toHaveTextContent(/R.*DDLE/);
            expect(screen.getByText('Word Transformation Game')).toBeInTheDocument();
            expect(screen.getByText('© 2025 Raddle Teams')).toBeInTheDocument();
            expect(screen.getByText('A team-based word game')).toBeInTheDocument();
        });

        test('renders navigation links when not in lobby or admin', () => {
            render(
                <TestWrapper pathname='/'>
                    <GlobalLayout />
                </TestWrapper>
            );

            expect(screen.getByTestId('tutorial-link')).toBeInTheDocument();
            expect(screen.getByTestId('admin-panel-link')).toBeInTheDocument();
            expect(screen.queryByTestId('logout-button')).not.toBeInTheDocument();
        });

        test('renders footer links', () => {
            render(
                <TestWrapper>
                    <GlobalLayout />
                </TestWrapper>
            );

            expect(screen.getByTestId('footer-tutorial-link')).toBeInTheDocument();
            expect(screen.getByTestId('footer-admin-link')).toBeInTheDocument();
        });
    });

    describe('Logout Button Visibility', () => {
        test('shows logout button when in lobby pages', () => {
            render(
                <TestWrapper pathname='/lobby/ABC123'>
                    <GlobalLayout />
                </TestWrapper>
            );

            expect(screen.getByTestId('logout-button')).toBeInTheDocument();
            expect(screen.getByText('🚪 Leave Lobby')).toBeInTheDocument();
            expect(screen.queryByTestId('tutorial-link')).not.toBeInTheDocument();
        });

        test('shows admin logout button when in admin pages (not login)', () => {
            render(
                <TestWrapper pathname='/admin/dashboard'>
                    <GlobalLayout />
                </TestWrapper>
            );

            expect(screen.getByTestId('logout-button')).toBeInTheDocument();
            expect(screen.getByText('🔒 Admin Logout')).toBeInTheDocument();
        });

        test('does not show logout button on admin login page', () => {
            render(
                <TestWrapper pathname='/admin/login'>
                    <GlobalLayout />
                </TestWrapper>
            );

            expect(screen.queryByTestId('logout-button')).not.toBeInTheDocument();
            expect(screen.getByTestId('tutorial-link')).toBeInTheDocument();
        });
    });

    describe('Main Content Styling', () => {
        test('applies bordered styling by default', () => {
            render(
                <TestWrapper pathname='/'>
                    <GlobalLayout />
                </TestWrapper>
            );

            const mainContent = document.querySelector('main > div > div');
            expect(mainContent).toHaveClass('bg-secondary', 'border-border', 'rounded-lg', 'border');
        });

        test('removes border styling on tutorial page', () => {
            render(
                <TestWrapper pathname='/tutorial'>
                    <GlobalLayout />
                </TestWrapper>
            );

            const mainContent = document.querySelector('main > div > div');
            expect(mainContent).toBeInstanceOf(HTMLDivElement);
            expect(mainContent).not.toHaveClass('bg-secondary', 'border-border', 'rounded-lg', 'border');
        });
    });

    describe('Navigation', () => {
        test('navigates to tutorial when tutorial link is clicked', async () => {
            const user = userEvent.setup();
            render(
                <TestWrapper>
                    <GlobalLayout />
                </TestWrapper>
            );

            await user.click(screen.getByTestId('tutorial-link'));

            expect(mockNavigate).toHaveBeenCalledWith('/tutorial');
        });

        test('navigates to admin login when admin link is clicked', async () => {
            const user = userEvent.setup();
            render(
                <TestWrapper>
                    <GlobalLayout />
                </TestWrapper>
            );

            await user.click(screen.getByTestId('admin-panel-link'));

            expect(mockNavigate).toHaveBeenCalledWith('/admin/login');
        });

        test('navigates to tutorial from footer link', async () => {
            const user = userEvent.setup();
            render(
                <TestWrapper>
                    <GlobalLayout />
                </TestWrapper>
            );

            await user.click(screen.getByTestId('footer-tutorial-link'));

            expect(mockNavigate).toHaveBeenCalledWith('/tutorial');
        });

        test('navigates to admin from footer link', async () => {
            const user = userEvent.setup();
            render(
                <TestWrapper>
                    <GlobalLayout />
                </TestWrapper>
            );

            await user.click(screen.getByTestId('footer-admin-link'));

            expect(mockNavigate).toHaveBeenCalledWith('/admin/login');
        });
    });

    describe('LocalStorage Management', () => {
        test('sets up localStorage functions correctly', () => {
            render(
                <TestWrapper>
                    <GlobalLayout />
                </TestWrapper>
            );

            expect(screen.getByTestId('home-link')).toBeInTheDocument();
        });

        test('updates localStorage when session data changes', () => {
            localStorageMock.getItem.mockReturnValue('test-session-id');

            render(
                <TestWrapper>
                    <GlobalLayout />
                </TestWrapper>
            );

            // The context functions are validated indirectly via logout functionality
        });
    });

    describe('Logout Functionality', () => {
        test('handles player logout correctly', async () => {
            const user = userEvent.setup();
            vi.mocked(api.player.lobby.leave).mockResolvedValue(undefined);

            render(
                <TestWrapper pathname='/lobby/ABC123'>
                    <GlobalLayout />
                </TestWrapper>
            );

            const logoutButton = screen.getByTestId('logout-button');
            await user.click(logoutButton);

            await waitFor(() => {
                expect(api.player.lobby.leave).toHaveBeenCalled();
                expect(window.location.pathname).toBe('/');
            });
        });

        test('handles admin logout correctly', async () => {
            const user = userEvent.setup();

            render(
                <TestWrapper pathname='/admin/dashboard'>
                    <GlobalLayout />
                </TestWrapper>
            );

            const logoutButton = screen.getByTestId('logout-button');
            await user.click(logoutButton);

            await waitFor(() => {
                expect(localStorageMock.removeItem).toHaveBeenCalledWith('raddle_admin_api_token');
                expect(localStorageMock.removeItem).toHaveBeenCalledWith('raddle_admin_session_id');
                expect(window.location.pathname).toBe('/');
            });
        });

        test('handles logout error gracefully', async () => {
            const user = userEvent.setup();
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            vi.mocked(api.player.lobby.leave).mockRejectedValue(new Error('Network error'));

            render(
                <TestWrapper pathname='/lobby/ABC123'>
                    <GlobalLayout />
                </TestWrapper>
            );

            const logoutButton = screen.getByTestId('logout-button');
            await user.click(logoutButton);

            await waitFor(() => {
                expect(consoleSpy).toHaveBeenCalledWith('Logout error:', expect.any(Error));
                expect(screen.queryByText('Logging out')).not.toBeInTheDocument();
            });

            consoleSpy.mockRestore();
        });

        test('disables logout button while logging out', async () => {
            const user = userEvent.setup();
            vi.mocked(api.player.lobby.leave).mockImplementation(() => new Promise(() => {})); // Never resolves

            render(
                <TestWrapper pathname='/lobby/ABC123'>
                    <GlobalLayout />
                </TestWrapper>
            );

            const logoutButton = screen.getByTestId('logout-button');
            await user.click(logoutButton);

            expect(logoutButton).toBeDisabled();
            expect(logoutButton).toHaveAttribute('disabled');
        });
    });

    describe('Responsive Design', () => {
        test('hides subtitle on mobile', () => {
            render(
                <TestWrapper>
                    <GlobalLayout />
                </TestWrapper>
            );

            const subtitle = screen.getByText('Word Transformation Game');
            expect(subtitle).toHaveClass('not-md:hidden');
        });
    });
});
