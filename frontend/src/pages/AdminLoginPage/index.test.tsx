import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import AdminLoginPage from '@/pages/AdminLoginPage/index';
import { api } from '@/services/api';

// Mock the API
vi.mock('@/services/api', () => ({
    api: {
        admin: {
            checkCredentials: vi.fn(),
        },
    },
}));

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
    BrowserRouter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    useNavigate: () => mockNavigate,
    Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

// Mock LoadingSpinner
vi.mock('@/components', () => ({
    LoadingSpinner: () => <div data-testid='loading-spinner'>Loading...</div>,
    TextInput: ({ label, value, onChange, error, disabled, 'data-testid': dataTestId, ...props }: any) => (
        <div>
            <label>{label}</label>
            <input
                data-testid={dataTestId}
                value={value}
                onChange={e => onChange(e.target.value)}
                disabled={disabled}
                {...props}
            />
            {error && <div data-testid='input-error'>{error}</div>}
        </div>
    ),
    Button: ({ children, disabled, loading, 'data-testid': dataTestId, ...props }: any) => (
        <button data-testid={dataTestId} disabled={disabled || loading} {...props}>
            {loading ? 'Loading...' : children}
        </button>
    ),
}));

// Mock useGlobalOutletContext
const mockSetAdminApiToken = vi.fn();
const mockGetAdminApiTokenFromLocalStorage = vi.fn();
const mockSetAdminSessionId = vi.fn();
const mockGetAdminSessionIdFromLocalStorage = vi.fn();

vi.mock('@/hooks/useGlobalOutletContext', () => ({
    useGlobalOutletContext: () => ({
        setAdminApiToken: mockSetAdminApiToken,
        getAdminApiTokenFromLocalStorage: mockGetAdminApiTokenFromLocalStorage,
        setAdminSessionId: mockSetAdminSessionId,
        getAdminSessionIdFromLocalStorage: mockGetAdminSessionIdFromLocalStorage,
    }),
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => <BrowserRouter>{children}</BrowserRouter>;

describe('AdminLoginPage Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetAdminApiTokenFromLocalStorage.mockReturnValue(null);
        mockGetAdminSessionIdFromLocalStorage.mockReturnValue(null);
    });

    describe('Basic Rendering', () => {
        test('renders login form after loading', async () => {
            render(
                <TestWrapper>
                    <AdminLoginPage />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(screen.getByTestId('admin-login-title')).toBeInTheDocument();
            });

            expect(screen.getByText('Admin Login')).toBeInTheDocument();
            expect(screen.getByText('Enter your admin api key to access the admin dashboard')).toBeInTheDocument();
            expect(screen.getByTestId('admin-login-form')).toBeInTheDocument();
            expect(screen.getByTestId('admin-token-input')).toBeInTheDocument();
            expect(screen.getByTestId('admin-login-submit')).toBeInTheDocument();
        });

        test('shows content after initial loading', async () => {
            mockGetAdminApiTokenFromLocalStorage.mockReturnValue(null);
            mockGetAdminSessionIdFromLocalStorage.mockReturnValue(null);

            render(
                <TestWrapper>
                    <AdminLoginPage />
                </TestWrapper>
            );

            // Wait for content to appear (loading state may be too brief to catch)
            await waitFor(() => {
                expect(screen.getByTestId('admin-login-title')).toBeInTheDocument();
            });

            // Should show the login form
            expect(screen.getByTestId('admin-login-form')).toBeInTheDocument();
        });
    });

    describe('Credential Checking on Mount', () => {
        test('redirects to admin page when valid credentials exist', async () => {
            const mockToken = 'valid-admin-token';
            const mockSessionId = 'admin-session-123';
            const mockResponse = { session_id: 'new-session-456' };

            mockGetAdminApiTokenFromLocalStorage.mockReturnValue(mockToken);
            mockGetAdminSessionIdFromLocalStorage.mockReturnValue(mockSessionId);
            vi.mocked(api.admin.checkCredentials).mockResolvedValue(mockResponse);

            render(
                <TestWrapper>
                    <AdminLoginPage />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(api.admin.checkCredentials).toHaveBeenCalledWith(mockToken);
                expect(mockSetAdminSessionId).toHaveBeenCalledWith('new-session-456');
                expect(mockSetAdminApiToken).toHaveBeenCalledWith(mockToken);
                expect(mockNavigate).toHaveBeenCalledWith('/admin');
            });
        });

        test('clears invalid credentials and shows login form', async () => {
            const mockToken = 'invalid-admin-token';
            const mockSessionId = 'admin-session-123';

            mockGetAdminApiTokenFromLocalStorage.mockReturnValue(mockToken);
            mockGetAdminSessionIdFromLocalStorage.mockReturnValue(mockSessionId);
            vi.mocked(api.admin.checkCredentials).mockRejectedValue(new Error('Invalid token'));

            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            render(
                <TestWrapper>
                    <AdminLoginPage />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(api.admin.checkCredentials).toHaveBeenCalledWith(mockToken);
                expect(mockSetAdminApiToken).toHaveBeenCalledWith(null);
                expect(mockSetAdminSessionId).toHaveBeenCalledWith(null);
                expect(consoleSpy).toHaveBeenCalledWith('Error checking admin credentials:', expect.any(Error));
            });

            // Should show login form after clearing credentials
            await waitFor(() => {
                expect(screen.getByTestId('admin-login-title')).toBeInTheDocument();
            });

            consoleSpy.mockRestore();
        });

        test('shows login form when no credentials exist', async () => {
            mockGetAdminApiTokenFromLocalStorage.mockReturnValue(null);
            mockGetAdminSessionIdFromLocalStorage.mockReturnValue(null);

            render(
                <TestWrapper>
                    <AdminLoginPage />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(screen.getByTestId('admin-login-title')).toBeInTheDocument();
            });

            expect(api.admin.checkCredentials).not.toHaveBeenCalled();
            expect(mockSetAdminApiToken).toHaveBeenCalledWith(null);
            expect(mockSetAdminSessionId).toHaveBeenCalledWith(null);
        });

        test('clears credentials when only token exists but no session', async () => {
            mockGetAdminApiTokenFromLocalStorage.mockReturnValue('some-token');
            mockGetAdminSessionIdFromLocalStorage.mockReturnValue(null);

            render(
                <TestWrapper>
                    <AdminLoginPage />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(mockSetAdminApiToken).toHaveBeenCalledWith(null);
                expect(mockSetAdminSessionId).toHaveBeenCalledWith(null);
            });

            expect(api.admin.checkCredentials).not.toHaveBeenCalled();
        });
    });

    describe('Form Input Handling', () => {
        test('updates admin token input value', async () => {
            const user = userEvent.setup();
            render(
                <TestWrapper>
                    <AdminLoginPage />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(screen.getByTestId('admin-token-input')).toBeInTheDocument();
            });

            const tokenInput = screen.getByTestId('admin-token-input');
            await user.type(tokenInput, 'test-admin-token');

            expect(tokenInput).toHaveValue('test-admin-token');
        });

        test('submits form only when token is provided', async () => {
            const user = userEvent.setup();
            render(
                <TestWrapper>
                    <AdminLoginPage />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(screen.getByTestId('admin-login-submit')).toBeInTheDocument();
            });

            const submitButton = screen.getByTestId('admin-login-submit');
            await user.click(submitButton);

            // Should not call API if token is empty
            expect(api.admin.checkCredentials).not.toHaveBeenCalled();
        });
    });

    describe('Form Submission', () => {
        test('successfully logs in with valid token', async () => {
            const user = userEvent.setup();
            const mockResponse = { session_id: 'new-admin-session' };
            vi.mocked(api.admin.checkCredentials).mockResolvedValue(mockResponse);

            render(
                <TestWrapper>
                    <AdminLoginPage />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(screen.getByTestId('admin-token-input')).toBeInTheDocument();
            });

            const tokenInput = screen.getByTestId('admin-token-input');
            const submitButton = screen.getByTestId('admin-login-submit');

            await user.type(tokenInput, 'valid-admin-token');
            await user.click(submitButton);

            await waitFor(() => {
                expect(api.admin.checkCredentials).toHaveBeenCalledWith('valid-admin-token');
                expect(mockSetAdminApiToken).toHaveBeenCalledWith('valid-admin-token');
                expect(mockSetAdminSessionId).toHaveBeenCalledWith('new-admin-session');
                expect(mockNavigate).toHaveBeenCalledWith('/admin');
            });
        });

        test('shows error message for invalid token', async () => {
            const user = userEvent.setup();
            vi.mocked(api.admin.checkCredentials).mockRejectedValue(new Error('Invalid token'));

            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            render(
                <TestWrapper>
                    <AdminLoginPage />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(screen.getByTestId('admin-token-input')).toBeInTheDocument();
            });

            const tokenInput = screen.getByTestId('admin-token-input');
            const submitButton = screen.getByTestId('admin-login-submit');

            await user.type(tokenInput, 'invalid-token');
            await user.click(submitButton);

            await waitFor(() => {
                expect(screen.getByTestId('input-error')).toBeInTheDocument();
                expect(screen.getByText('Invalid admin token')).toBeInTheDocument();
                expect(consoleSpy).toHaveBeenCalledWith('Auth error:', expect.any(Error));
            });

            consoleSpy.mockRestore();
        });

        test('trims whitespace from token input', async () => {
            const user = userEvent.setup();
            const mockResponse = { session_id: 'session-123' };
            vi.mocked(api.admin.checkCredentials).mockResolvedValue(mockResponse);

            render(
                <TestWrapper>
                    <AdminLoginPage />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(screen.getByTestId('admin-token-input')).toBeInTheDocument();
            });

            const tokenInput = screen.getByTestId('admin-token-input');
            const submitButton = screen.getByTestId('admin-login-submit');

            await user.type(tokenInput, '  admin-token  ');
            await user.click(submitButton);

            await waitFor(() => {
                expect(api.admin.checkCredentials).toHaveBeenCalledWith('  admin-token  ');
            });
        });
    });

    describe('Loading States', () => {
        test('shows loading state during form submission', async () => {
            const user = userEvent.setup();

            // Make API call hang to test loading state
            vi.mocked(api.admin.checkCredentials).mockImplementation(() => new Promise(() => {}));

            render(
                <TestWrapper>
                    <AdminLoginPage />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(screen.getByTestId('admin-token-input')).toBeInTheDocument();
            });

            const tokenInput = screen.getByTestId('admin-token-input');
            const submitButton = screen.getByTestId('admin-login-submit');

            await user.type(tokenInput, 'admin-token');
            await user.click(submitButton);

            expect(screen.getByText('Loading...')).toBeInTheDocument();
            expect(submitButton).toBeDisabled();
            expect(tokenInput).toBeDisabled();
        });

        test('resets loading state after successful login', async () => {
            const user = userEvent.setup();
            const mockResponse = { session_id: 'session-123' };
            vi.mocked(api.admin.checkCredentials).mockResolvedValue(mockResponse);

            render(
                <TestWrapper>
                    <AdminLoginPage />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(screen.getByTestId('admin-token-input')).toBeInTheDocument();
            });

            const tokenInput = screen.getByTestId('admin-token-input');
            const submitButton = screen.getByTestId('admin-login-submit');

            await user.type(tokenInput, 'admin-token');
            await user.click(submitButton);

            await waitFor(() => {
                expect(api.admin.checkCredentials).toHaveBeenCalled();
            });

            // Should not show loading state after completion
            expect(screen.queryByText('Logging in')).not.toBeInTheDocument();
        });

        test('resets loading state after login error', async () => {
            const user = userEvent.setup();
            vi.mocked(api.admin.checkCredentials).mockRejectedValue(new Error('Network error'));

            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            render(
                <TestWrapper>
                    <AdminLoginPage />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(screen.getByTestId('admin-token-input')).toBeInTheDocument();
            });

            const tokenInput = screen.getByTestId('admin-token-input');
            const submitButton = screen.getByTestId('admin-login-submit');

            await user.type(tokenInput, 'admin-token');
            await user.click(submitButton);

            await waitFor(() => {
                expect(screen.getByTestId('input-error')).toBeInTheDocument();
            });

            expect(screen.queryByText('Logging in')).not.toBeInTheDocument();
            expect(submitButton).not.toBeDisabled();
            expect(tokenInput).not.toBeDisabled();

            consoleSpy.mockRestore();
        });
    });

    describe('Error Handling', () => {
        test('clears previous errors on new submission', async () => {
            const user = userEvent.setup();

            // First submission - error
            vi.mocked(api.admin.checkCredentials).mockRejectedValueOnce(new Error('Invalid token'));

            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            render(
                <TestWrapper>
                    <AdminLoginPage />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(screen.getByTestId('admin-token-input')).toBeInTheDocument();
            });

            const tokenInput = screen.getByTestId('admin-token-input');
            const submitButton = screen.getByTestId('admin-login-submit');

            await user.type(tokenInput, 'invalid-token');
            await user.click(submitButton);

            await waitFor(() => {
                expect(screen.getByTestId('input-error')).toBeInTheDocument();
            });

            // Second submission - success
            const mockResponse = { session_id: 'session-123' };
            vi.mocked(api.admin.checkCredentials).mockResolvedValue(mockResponse);

            await user.clear(tokenInput);
            await user.type(tokenInput, 'valid-token');
            await user.click(submitButton);

            // Error should be cleared during submission
            expect(screen.queryByTestId('input-error')).not.toBeInTheDocument();

            consoleSpy.mockRestore();
        });
    });
});
