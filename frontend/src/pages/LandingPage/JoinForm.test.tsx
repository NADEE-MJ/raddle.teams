import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import JoinForm from '@/pages/LandingPage/JoinForm';
import { ApiError, api } from '@/services/api';

// Mock the API
vi.mock('@/services/api', () => ({
    ApiError: class ApiError extends Error {
        status: number;
        data: unknown;

        constructor(status: number, message: string, data?: unknown) {
            super(message);
            this.status = status;
            this.data = data;
        }
    },
    api: {
        player: {
            lobby: {
                join: vi.fn(),
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

// Mock useGlobalOutletContext
const mockSetSessionId = vi.fn();
vi.mock('@/hooks/useGlobalOutletContext', () => ({
    useGlobalOutletContext: () => ({
        setSessionId: mockSetSessionId,
    }),
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => <BrowserRouter>{children}</BrowserRouter>;

describe('JoinForm Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Basic Rendering', () => {
        test('renders form fields and submit button', () => {
            render(
                <TestWrapper>
                    <JoinForm />
                </TestWrapper>
            );

            expect(screen.getByTestId('name-input')).toBeInTheDocument();
            expect(screen.getByTestId('lobby-code-input')).toBeInTheDocument();
            expect(screen.getByTestId('join-lobby-button')).toBeInTheDocument();
            expect(screen.getByText('Join Lobby')).toBeInTheDocument();
        });

        test('has correct form labels and placeholders', () => {
            render(
                <TestWrapper>
                    <JoinForm />
                </TestWrapper>
            );

            expect(screen.getByLabelText('Your Name')).toBeInTheDocument();
            expect(screen.getByLabelText('Lobby Code')).toBeInTheDocument();
            expect(screen.getByPlaceholderText('Enter your name')).toBeInTheDocument();
            expect(screen.getByPlaceholderText('ABCDEF')).toBeInTheDocument();
        });
    });

    describe('Form Input Handling', () => {
        test('updates name input value', async () => {
            const user = userEvent.setup();
            render(
                <TestWrapper>
                    <JoinForm />
                </TestWrapper>
            );

            const nameInput = screen.getByTestId('name-input');
            await user.type(nameInput, 'John Doe');

            expect(nameInput).toHaveValue('John Doe');
        });

        test('converts lobby code to uppercase automatically', async () => {
            const user = userEvent.setup();
            render(
                <TestWrapper>
                    <JoinForm />
                </TestWrapper>
            );

            const lobbyCodeInput = screen.getByTestId('lobby-code-input');
            await user.type(lobbyCodeInput, 'abc123');

            expect(lobbyCodeInput).toHaveValue('ABC123');
        });

        test('limits lobby code to 6 characters', async () => {
            const user = userEvent.setup();
            render(
                <TestWrapper>
                    <JoinForm />
                </TestWrapper>
            );

            const lobbyCodeInput = screen.getByTestId('lobby-code-input');
            await user.type(lobbyCodeInput, 'ABCDEFGH');

            expect(lobbyCodeInput).toHaveValue('ABCDEF');
        });
    });

    describe('Form Validation', () => {
        test('shows error when name is empty', async () => {
            const user = userEvent.setup();
            render(
                <TestWrapper>
                    <JoinForm />
                </TestWrapper>
            );

            const submitButton = screen.getByTestId('join-lobby-button');
            await user.click(submitButton);

            expect(screen.getByTestId('join-form-error')).toBeInTheDocument();
            expect(screen.getByText('Please enter your name')).toBeInTheDocument();
        });

        test('shows error when lobby code is empty', async () => {
            const user = userEvent.setup();
            render(
                <TestWrapper>
                    <JoinForm />
                </TestWrapper>
            );

            const nameInput = screen.getByTestId('name-input');
            await user.type(nameInput, 'John Doe');

            const submitButton = screen.getByTestId('join-lobby-button');
            await user.click(submitButton);

            expect(screen.getByTestId('join-form-error')).toBeInTheDocument();
            expect(screen.getByText('Please enter a lobby code')).toBeInTheDocument();
        });

        test('trims whitespace from inputs during validation', async () => {
            const user = userEvent.setup();
            render(
                <TestWrapper>
                    <JoinForm />
                </TestWrapper>
            );

            const nameInput = screen.getByTestId('name-input');
            const lobbyCodeInput = screen.getByTestId('lobby-code-input');

            await user.type(nameInput, '   ');
            await user.type(lobbyCodeInput, '   ');

            const submitButton = screen.getByTestId('join-lobby-button');
            await user.click(submitButton);

            expect(screen.getByText('Please enter your name')).toBeInTheDocument();
        });
    });

    describe('Form Submission', () => {
        test('successfully joins lobby with valid inputs', async () => {
            const user = userEvent.setup();
            const mockPlayer = { session_id: 'test-session-123', name: 'John Doe' };
            vi.mocked(api.player.lobby.join).mockResolvedValue(mockPlayer);

            render(
                <TestWrapper>
                    <JoinForm />
                </TestWrapper>
            );

            const nameInput = screen.getByTestId('name-input');
            const lobbyCodeInput = screen.getByTestId('lobby-code-input');

            await user.type(nameInput, 'John Doe');
            await user.type(lobbyCodeInput, 'ABC123');

            const submitButton = screen.getByTestId('join-lobby-button');
            await user.click(submitButton);

            await waitFor(() => {
                expect(api.player.lobby.join).toHaveBeenCalledWith('ABC123', 'John Doe');
                expect(mockSetSessionId).toHaveBeenCalledWith('test-session-123');
                expect(mockNavigate).toHaveBeenCalledWith('/lobby/ABC123');
            });
        });

        test('trims and converts lobby code during submission', async () => {
            const user = userEvent.setup();
            const mockPlayer = { session_id: 'test-session-123', name: 'John Doe' };
            vi.mocked(api.player.lobby.join).mockResolvedValue(mockPlayer);

            render(
                <TestWrapper>
                    <JoinForm />
                </TestWrapper>
            );

            const nameInput = screen.getByTestId('name-input');
            const lobbyCodeInput = screen.getByTestId('lobby-code-input');

            // Clear inputs first
            await user.clear(nameInput);
            await user.clear(lobbyCodeInput);

            // Type with spaces
            await user.type(nameInput, '  John Doe  ');
            await user.type(lobbyCodeInput, 'abc123');

            const submitButton = screen.getByTestId('join-lobby-button');
            await user.click(submitButton);

            await waitFor(() => {
                expect(api.player.lobby.join).toHaveBeenCalledWith('ABC123', 'John Doe');
            });
        });

        test('handles API errors gracefully', async () => {
            const user = userEvent.setup();
            vi.mocked(api.player.lobby.join).mockRejectedValue(new Error('Lobby not found'));

            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            render(
                <TestWrapper>
                    <JoinForm />
                </TestWrapper>
            );

            const nameInput = screen.getByTestId('name-input');
            const lobbyCodeInput = screen.getByTestId('lobby-code-input');

            await user.type(nameInput, 'John Doe');
            await user.type(lobbyCodeInput, 'ABC123');

            const submitButton = screen.getByTestId('join-lobby-button');
            await user.click(submitButton);

            await waitFor(() => {
                expect(screen.getByTestId('join-form-error')).toBeInTheDocument();
                expect(
                    screen.getByText('Failed to join lobby. Please check the lobby code and try again.')
                ).toBeInTheDocument();
                expect(consoleSpy).toHaveBeenCalledWith('Error joining lobby:', expect.any(Error));
            });

            consoleSpy.mockRestore();
        });

        test('shows helpful message when name is already taken in lobby', async () => {
            const user = userEvent.setup();
            vi.mocked(api.player.lobby.join).mockRejectedValue(
                new ApiError(400, 'Player name already taken in this lobby')
            );

            render(
                <TestWrapper>
                    <JoinForm />
                </TestWrapper>
            );

            const nameInput = screen.getByTestId('name-input');
            const lobbyCodeInput = screen.getByTestId('lobby-code-input');

            await user.type(nameInput, 'John Doe');
            await user.type(lobbyCodeInput, 'ABC123');

            const submitButton = screen.getByTestId('join-lobby-button');
            await user.click(submitButton);

            await waitFor(() => {
                expect(
                    screen.getByText('Someone is already using that name in this lobby. Please choose another one.')
                ).toBeInTheDocument();
            });
        });
    });

    describe('Loading States', () => {
        test('shows loading state during form submission', async () => {
            const user = userEvent.setup();

            // Make the API call hang to test loading state
            vi.mocked(api.player.lobby.join).mockImplementation(() => new Promise(() => {}));

            render(
                <TestWrapper>
                    <JoinForm />
                </TestWrapper>
            );

            const nameInput = screen.getByTestId('name-input');
            const lobbyCodeInput = screen.getByTestId('lobby-code-input');

            await user.type(nameInput, 'John Doe');
            await user.type(lobbyCodeInput, 'ABC123');

            const submitButton = screen.getByTestId('join-lobby-button');
            await user.click(submitButton);

            expect(screen.getByText('Joining...')).toBeInTheDocument();
            expect(submitButton).toBeDisabled();
            expect(nameInput).toBeDisabled();
            expect(lobbyCodeInput).toBeDisabled();
        });

        test('resets loading state after successful submission', async () => {
            const user = userEvent.setup();
            const mockPlayer = { session_id: 'test-session-123', name: 'John Doe' };
            vi.mocked(api.player.lobby.join).mockResolvedValue(mockPlayer);

            render(
                <TestWrapper>
                    <JoinForm />
                </TestWrapper>
            );

            const nameInput = screen.getByTestId('name-input');
            const lobbyCodeInput = screen.getByTestId('lobby-code-input');

            await user.type(nameInput, 'John Doe');
            await user.type(lobbyCodeInput, 'ABC123');

            const submitButton = screen.getByTestId('join-lobby-button');
            await user.click(submitButton);

            await waitFor(() => {
                expect(api.player.lobby.join).toHaveBeenCalled();
            });

            // Form should not be in loading state after completion
            expect(screen.queryByText('Joining')).not.toBeInTheDocument();
        });

        test('resets loading state after API error', async () => {
            const user = userEvent.setup();
            vi.mocked(api.player.lobby.join).mockRejectedValue(new Error('Network error'));

            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            render(
                <TestWrapper>
                    <JoinForm />
                </TestWrapper>
            );

            const nameInput = screen.getByTestId('name-input');
            const lobbyCodeInput = screen.getByTestId('lobby-code-input');

            await user.type(nameInput, 'John Doe');
            await user.type(lobbyCodeInput, 'ABC123');

            const submitButton = screen.getByTestId('join-lobby-button');
            await user.click(submitButton);

            await waitFor(() => {
                expect(screen.getByTestId('join-form-error')).toBeInTheDocument();
            });

            expect(screen.queryByText('Joining')).not.toBeInTheDocument();
            expect(submitButton).not.toBeDisabled();
            expect(nameInput).not.toBeDisabled();
            expect(lobbyCodeInput).not.toBeDisabled();

            consoleSpy.mockRestore();
        });
    });

    describe('Error Display', () => {
        test('clears previous errors on new submission', async () => {
            const user = userEvent.setup();
            render(
                <TestWrapper>
                    <JoinForm />
                </TestWrapper>
            );

            // Trigger validation error
            const submitButton = screen.getByTestId('join-lobby-button');
            await user.click(submitButton);

            expect(screen.getByTestId('join-form-error')).toBeInTheDocument();

            // Fill in form and submit again
            const nameInput = screen.getByTestId('name-input');
            const lobbyCodeInput = screen.getByTestId('lobby-code-input');

            await user.type(nameInput, 'John Doe');
            await user.type(lobbyCodeInput, 'ABC123');

            const mockPlayer = { session_id: 'test-session-123', name: 'John Doe' };
            vi.mocked(api.player.lobby.join).mockResolvedValue(mockPlayer);

            await user.click(submitButton);

            // Error should be cleared during submission
            expect(screen.queryByTestId('join-form-error')).not.toBeInTheDocument();
        });
    });
});
