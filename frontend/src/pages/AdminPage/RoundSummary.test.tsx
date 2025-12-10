import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { RoundSummary } from './RoundSummary';
import { api } from '@/services/api';

// Mock the API
vi.mock('@/services/api', () => ({
    api: {
        tournament: {
            getGameStats: vi.fn(),
        },
    },
}));

describe('RoundSummary Component', () => {
    const mockOnClose = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Loading State', () => {
        test('shows loading message while fetching', () => {
            vi.mocked(api.tournament.getGameStats).mockImplementation(
                () => new Promise(() => {}) // Never resolves
            );

            render(<RoundSummary gameId={1} onClose={mockOnClose} />);

            expect(screen.getByText('Round Results')).toBeInTheDocument();
            expect(screen.getByText('Loading round results...')).toBeInTheDocument();
        });
    });

    describe('Error State', () => {
        test('shows error message when fetch fails', async () => {
            vi.mocked(api.tournament.getGameStats).mockRejectedValue(new Error('Failed to load stats'));

            render(<RoundSummary gameId={1} onClose={mockOnClose} />);

            await waitFor(() => {
                expect(screen.getByText('Failed to load stats')).toBeInTheDocument();
            });

            // Should show close button
            expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
        });

        test('closes modal when close button clicked in error state', async () => {
            const user = userEvent.setup();
            vi.mocked(api.tournament.getGameStats).mockRejectedValue(new Error('Error'));

            render(<RoundSummary gameId={1} onClose={mockOnClose} />);

            await waitFor(() => {
                expect(screen.getByText('Error')).toBeInTheDocument();
            });

            await user.click(screen.getByRole('button', { name: 'Close' }));

            expect(mockOnClose).toHaveBeenCalledTimes(1);
        });
    });

    describe('Round Metadata Display', () => {
        test('displays round number and start time', async () => {
            vi.mocked(api.tournament.getGameStats).mockResolvedValue({
                game_id: 1,
                round_number: 3,
                started_at: '2024-01-15T10:30:00Z',
                teams: [],
                last_round_winner_id: null,
            });

            render(<RoundSummary gameId={1} onClose={mockOnClose} />);

            await waitFor(() => {
                expect(screen.getByText('Round 3 Results')).toBeInTheDocument();
                expect(screen.getByText(/Started:/i)).toBeInTheDocument();
            });
        });

        test('displays team count', async () => {
            vi.mocked(api.tournament.getGameStats).mockResolvedValue({
                game_id: 1,
                round_number: 1,
                started_at: '2024-01-15T10:30:00Z',
                teams: [
                    {
                        team_id: 1,
                        team_name: 'Team A',
                        placement: 1,
                        points_earned: 5,
                        wrong_guesses: 2,
                        wrong_guess_rate: 0.1,
                        wrong_guess_label: 'Laser Focus',
                        completed_at: '2024-01-15T10:35:00Z',
                        completion_percentage: 1.0,
                        time_to_complete: 300,
                        player_stats: [],
                    },
                    {
                        team_id: 2,
                        team_name: 'Team B',
                        placement: 2,
                        points_earned: 4,
                        wrong_guesses: 5,
                        wrong_guess_rate: 0.2,
                        wrong_guess_label: 'Precision Mode',
                        completed_at: '2024-01-15T10:36:00Z',
                        completion_percentage: 1.0,
                        time_to_complete: 360,
                        player_stats: [],
                    },
                ],
                last_round_winner_id: 1,
            });

            render(<RoundSummary gameId={1} onClose={mockOnClose} />);

            await waitFor(() => {
                expect(screen.getByText('2 teams')).toBeInTheDocument();
            });
        });
    });

    describe('Team Rankings Table', () => {
        test('displays team rankings with all columns', async () => {
            vi.mocked(api.tournament.getGameStats).mockResolvedValue({
                game_id: 1,
                round_number: 1,
                started_at: '2024-01-15T10:30:00Z',
                teams: [
                    {
                        team_id: 1,
                        team_name: 'Alpha Team',
                        placement: 1,
                        points_earned: 5,
                        wrong_guesses: 2,
                        wrong_guess_rate: 0.1,
                        wrong_guess_label: 'Laser Focus',
                        completed_at: '2024-01-15T10:35:00Z',
                        completion_percentage: 1.0,
                        time_to_complete: 300,
                        player_stats: [],
                    },
                ],
                last_round_winner_id: 1,
            });

            render(<RoundSummary gameId={1} onClose={mockOnClose} />);

            await waitFor(() => {
                expect(screen.getByText('Rank')).toBeInTheDocument();
                expect(screen.getByText('Team')).toBeInTheDocument();
                expect(screen.getByText('Points')).toBeInTheDocument();
                expect(screen.getByText('Time')).toBeInTheDocument();
                expect(screen.getByText('Completion')).toBeInTheDocument();
                expect(screen.getByText('Wrong Guesses')).toBeInTheDocument();
                expect(screen.getByText('Details')).toBeInTheDocument();
            });
        });

        test('displays medals for top 3 teams', async () => {
            vi.mocked(api.tournament.getGameStats).mockResolvedValue({
                game_id: 1,
                round_number: 1,
                started_at: '2024-01-15T10:30:00Z',
                teams: [
                    {
                        team_id: 1,
                        team_name: 'First',
                        placement: 1,
                        points_earned: 5,
                        wrong_guesses: 0,
                        wrong_guess_rate: 0,
                        wrong_guess_label: 'Laser Focus',
                        completed_at: '2024-01-15T10:35:00Z',
                        completion_percentage: 1.0,
                        time_to_complete: 300,
                        player_stats: [],
                    },
                    {
                        team_id: 2,
                        team_name: 'Second',
                        placement: 2,
                        points_earned: 4,
                        wrong_guesses: 1,
                        wrong_guess_rate: 0.05,
                        wrong_guess_label: 'Laser Focus',
                        completed_at: '2024-01-15T10:36:00Z',
                        completion_percentage: 1.0,
                        time_to_complete: 360,
                        player_stats: [],
                    },
                    {
                        team_id: 3,
                        team_name: 'Third',
                        placement: 3,
                        points_earned: 3,
                        wrong_guesses: 3,
                        wrong_guess_rate: 0.15,
                        wrong_guess_label: 'Precision Mode',
                        completed_at: '2024-01-15T10:37:00Z',
                        completion_percentage: 1.0,
                        time_to_complete: 420,
                        player_stats: [],
                    },
                ],
                last_round_winner_id: 1,
            });

            render(<RoundSummary gameId={1} onClose={mockOnClose} />);

            await waitFor(() => {
                expect(screen.getByText('🥇')).toBeInTheDocument();
                expect(screen.getByText('🥈')).toBeInTheDocument();
                expect(screen.getByText('🥉')).toBeInTheDocument();
            });
        });

        test('displays crown on winner', async () => {
            vi.mocked(api.tournament.getGameStats).mockResolvedValue({
                game_id: 1,
                round_number: 1,
                started_at: '2024-01-15T10:30:00Z',
                teams: [
                    {
                        team_id: 1,
                        team_name: 'Winner',
                        placement: 1,
                        points_earned: 5,
                        wrong_guesses: 0,
                        wrong_guess_rate: 0,
                        wrong_guess_label: 'Laser Focus',
                        completed_at: '2024-01-15T10:35:00Z',
                        completion_percentage: 1.0,
                        time_to_complete: 300,
                        player_stats: [],
                    },
                ],
                last_round_winner_id: 1,
            });

            render(<RoundSummary gameId={1} onClose={mockOnClose} />);

            await waitFor(() => {
                expect(screen.getByText('👑')).toBeInTheDocument();
            });
        });

        test('formats time correctly', async () => {
            vi.mocked(api.tournament.getGameStats).mockResolvedValue({
                game_id: 1,
                round_number: 1,
                started_at: '2024-01-15T10:30:00Z',
                teams: [
                    {
                        team_id: 1,
                        team_name: 'Team A',
                        placement: 1,
                        points_earned: 5,
                        wrong_guesses: 0,
                        wrong_guess_rate: 0,
                        wrong_guess_label: 'Laser Focus',
                        completed_at: '2024-01-15T10:35:00Z',
                        completion_percentage: 1.0,
                        time_to_complete: 185, // 3 minutes 5 seconds
                        player_stats: [],
                    },
                ],
                last_round_winner_id: 1,
            });

            render(<RoundSummary gameId={1} onClose={mockOnClose} />);

            await waitFor(() => {
                expect(screen.getByText('3:05')).toBeInTheDocument();
            });
        });

        test('shows DNF for teams that did not finish', async () => {
            vi.mocked(api.tournament.getGameStats).mockResolvedValue({
                game_id: 1,
                round_number: 1,
                started_at: '2024-01-15T10:30:00Z',
                teams: [
                    {
                        team_id: 1,
                        team_name: 'DNF Team',
                        placement: 2,
                        points_earned: 2,
                        wrong_guesses: 10,
                        wrong_guess_rate: 0.5,
                        wrong_guess_label: 'Chaos Engine',
                        completed_at: null,
                        completion_percentage: 0.6,
                        time_to_complete: null,
                        player_stats: [],
                    },
                ],
                last_round_winner_id: null,
            });

            render(<RoundSummary gameId={1} onClose={mockOnClose} />);

            await waitFor(() => {
                expect(screen.getByText('DNF')).toBeInTheDocument();
                expect(screen.getByText('60%')).toBeInTheDocument();
            });
        });

        test('displays wrong guess labels', async () => {
            vi.mocked(api.tournament.getGameStats).mockResolvedValue({
                game_id: 1,
                round_number: 1,
                started_at: '2024-01-15T10:30:00Z',
                teams: [
                    {
                        team_id: 1,
                        team_name: 'Team A',
                        placement: 1,
                        points_earned: 5,
                        wrong_guesses: 8,
                        wrong_guess_rate: 0.3,
                        wrong_guess_label: 'Spice Rack',
                        completed_at: '2024-01-15T10:35:00Z',
                        completion_percentage: 1.0,
                        time_to_complete: 300,
                        player_stats: [],
                    },
                ],
                last_round_winner_id: 1,
            });

            render(<RoundSummary gameId={1} onClose={mockOnClose} />);

            await waitFor(() => {
                expect(screen.getByText('Spice Rack')).toBeInTheDocument();
            });
        });
    });

    describe('Player Stats Expansion', () => {
        test('shows/hides player stats when Details button clicked', async () => {
            const user = userEvent.setup();
            vi.mocked(api.tournament.getGameStats).mockResolvedValue({
                game_id: 1,
                round_number: 1,
                started_at: '2024-01-15T10:30:00Z',
                teams: [
                    {
                        team_id: 1,
                        team_name: 'Team A',
                        placement: 1,
                        points_earned: 5,
                        wrong_guesses: 2,
                        wrong_guess_rate: 0.1,
                        wrong_guess_label: 'Laser Focus',
                        completed_at: '2024-01-15T10:35:00Z',
                        completion_percentage: 1.0,
                        time_to_complete: 300,
                        player_stats: [
                            {
                                player_id: 1,
                                player_name: 'Alice',
                                correct_guesses: 10,
                                total_guesses: 12,
                                accuracy_rate: 0.83,
                                words_solved: [0, 1, 2],
                                wrong_guesses: ['cat', 'dog'],
                                awards: [
                                    {
                                        key: 'MVP',
                                        title: 'Most Valuable Player',
                                        emoji: '🏆',
                                        description: 'Most correct guesses',
                                    },
                                ],
                            },
                        ],
                    },
                ],
                last_round_winner_id: 1,
            });

            render(<RoundSummary gameId={1} onClose={mockOnClose} />);

            await waitFor(() => {
                expect(screen.getByText('Show')).toBeInTheDocument();
            });

            // Player stats should not be visible initially
            expect(screen.queryByText('Alice')).not.toBeInTheDocument();

            // Click Show button
            await user.click(screen.getByText('Show'));

            // Player stats should now be visible
            await waitFor(() => {
                expect(screen.getByText('Alice')).toBeInTheDocument();
                expect(screen.getByText('10/12 correct')).toBeInTheDocument();
                expect(screen.getByText('83% accuracy')).toBeInTheDocument();
            });

            // Button should now say Hide
            expect(screen.getByText('Hide')).toBeInTheDocument();

            // Click Hide button
            await user.click(screen.getByText('Hide'));

            // Player stats should be hidden again
            await waitFor(() => {
                expect(screen.queryByText('Alice')).not.toBeInTheDocument();
            });
        });

        test('displays player awards', async () => {
            const user = userEvent.setup();
            vi.mocked(api.tournament.getGameStats).mockResolvedValue({
                game_id: 1,
                round_number: 1,
                started_at: '2024-01-15T10:30:00Z',
                teams: [
                    {
                        team_id: 1,
                        team_name: 'Team A',
                        placement: 1,
                        points_earned: 5,
                        wrong_guesses: 2,
                        wrong_guess_rate: 0.1,
                        wrong_guess_label: 'Laser Focus',
                        completed_at: '2024-01-15T10:35:00Z',
                        completion_percentage: 1.0,
                        time_to_complete: 300,
                        player_stats: [
                            {
                                player_id: 1,
                                player_name: 'Alice',
                                correct_guesses: 10,
                                total_guesses: 12,
                                accuracy_rate: 0.83,
                                words_solved: [0, 1, 2],
                                wrong_guesses: ['cat', 'dog'],
                                awards: [
                                    {
                                        key: 'MVP',
                                        title: 'Most Valuable Player',
                                        emoji: '🏆',
                                        description: 'Most correct guesses',
                                    },
                                    {
                                        key: 'SHARPSHOOTER',
                                        title: 'Sharpshooter',
                                        emoji: '🎯',
                                        description: 'Highest accuracy',
                                    },
                                ],
                            },
                        ],
                    },
                ],
                last_round_winner_id: 1,
            });

            render(<RoundSummary gameId={1} onClose={mockOnClose} />);

            await user.click(await screen.findByText('Show'));

            await waitFor(() => {
                expect(screen.getByText('🏆')).toBeInTheDocument();
                expect(screen.getByText('Most Valuable Player')).toBeInTheDocument();
                expect(screen.getByText('🎯')).toBeInTheDocument();
                expect(screen.getByText('Sharpshooter')).toBeInTheDocument();
            });
        });

        test('displays words solved and wrong guesses', async () => {
            const user = userEvent.setup();
            vi.mocked(api.tournament.getGameStats).mockResolvedValue({
                game_id: 1,
                round_number: 1,
                started_at: '2024-01-15T10:30:00Z',
                teams: [
                    {
                        team_id: 1,
                        team_name: 'Team A',
                        placement: 1,
                        points_earned: 5,
                        wrong_guesses: 3,
                        wrong_guess_rate: 0.15,
                        wrong_guess_label: 'Precision Mode',
                        completed_at: '2024-01-15T10:35:00Z',
                        completion_percentage: 1.0,
                        time_to_complete: 300,
                        player_stats: [
                            {
                                player_id: 1,
                                player_name: 'Bob',
                                correct_guesses: 5,
                                total_guesses: 8,
                                accuracy_rate: 0.625,
                                words_solved: [0, 2, 4],
                                wrong_guesses: ['cat', 'dog', 'fish'],
                                awards: [],
                            },
                        ],
                    },
                ],
                last_round_winner_id: 1,
            });

            render(<RoundSummary gameId={1} onClose={mockOnClose} />);

            await user.click(await screen.findByText('Show'));

            await waitFor(() => {
                expect(screen.getByText('#1, #3, #5')).toBeInTheDocument();
                expect(screen.getByText('cat, dog, fish')).toBeInTheDocument();
            });
        });

        test('shows None for players with no wrong guesses or words solved', async () => {
            const user = userEvent.setup();
            vi.mocked(api.tournament.getGameStats).mockResolvedValue({
                game_id: 1,
                round_number: 1,
                started_at: '2024-01-15T10:30:00Z',
                teams: [
                    {
                        team_id: 1,
                        team_name: 'Team A',
                        placement: 1,
                        points_earned: 5,
                        wrong_guesses: 0,
                        wrong_guess_rate: 0,
                        wrong_guess_label: 'Laser Focus',
                        completed_at: '2024-01-15T10:35:00Z',
                        completion_percentage: 1.0,
                        time_to_complete: 300,
                        player_stats: [
                            {
                                player_id: 1,
                                player_name: 'Charlie',
                                correct_guesses: 0,
                                total_guesses: 0,
                                accuracy_rate: 0,
                                words_solved: [],
                                wrong_guesses: [],
                                awards: [],
                            },
                        ],
                    },
                ],
                last_round_winner_id: 1,
            });

            render(<RoundSummary gameId={1} onClose={mockOnClose} />);

            await user.click(await screen.findByText('Show'));

            await waitFor(() => {
                const noneTexts = screen.getAllByText('None');
                expect(noneTexts.length).toBeGreaterThanOrEqual(2);
            });
        });
    });

    describe('Modal Interaction', () => {
        test('closes modal when Close button clicked', async () => {
            const user = userEvent.setup();
            vi.mocked(api.tournament.getGameStats).mockResolvedValue({
                game_id: 1,
                round_number: 1,
                started_at: '2024-01-15T10:30:00Z',
                teams: [],
                last_round_winner_id: null,
            });

            render(<RoundSummary gameId={1} onClose={mockOnClose} />);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
            });

            await user.click(screen.getByRole('button', { name: 'Close' }));

            expect(mockOnClose).toHaveBeenCalledTimes(1);
        });
    });
});
