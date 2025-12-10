import { render, screen, waitFor } from '@testing-library/react';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { TeamLeaderboard } from '@/components/TeamLeaderboard';
import { api } from '@/services/api';

// Mock the API
vi.mock('@/services/api', () => ({
    api: {
        tournament: {
            getLeaderboard: vi.fn(),
        },
    },
}));

describe('TeamLeaderboard Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Loading State', () => {
        test('shows loading message while fetching', () => {
            vi.mocked(api.tournament.getLeaderboard).mockImplementation(
                () => new Promise(() => {}) // Never resolves
            );

            render(<TeamLeaderboard lobbyId={1} />);

            expect(screen.getByText('🏆 Tournament Leaderboard')).toBeInTheDocument();
            expect(screen.getByText('Loading...')).toBeInTheDocument();
        });
    });

    describe('Error State', () => {
        test('shows error message when fetch fails', async () => {
            vi.mocked(api.tournament.getLeaderboard).mockRejectedValue(new Error('Network error'));

            render(<TeamLeaderboard lobbyId={1} />);

            await waitFor(() => {
                expect(screen.getByText('🏆 Tournament Leaderboard')).toBeInTheDocument();
                expect(screen.getByText('Network error')).toBeInTheDocument();
            });
        });
    });

    describe('Empty State', () => {
        test('shows message when no teams exist', async () => {
            vi.mocked(api.tournament.getLeaderboard).mockResolvedValue({
                teams: [],
                current_round: 0,
                total_rounds: 0,
                last_round_game_id: null,
            });

            render(<TeamLeaderboard lobbyId={1} />);

            await waitFor(() => {
                expect(screen.getByText('No teams yet. Create teams to start the tournament!')).toBeInTheDocument();
            });
        });
    });

    describe('Leaderboard Display', () => {
        test('renders teams in order with correct placements', async () => {
            vi.mocked(api.tournament.getLeaderboard).mockResolvedValue({
                teams: [
                    {
                        team_id: 1,
                        team_name: 'Alpha Team',
                        total_points: 100,
                        rounds_won: 3,
                        rounds_played: 5,
                        placement_breakdown: { first: 3, second: 1, third: 1, dnf: 0 },
                        last_round_winner: false,
                    },
                    {
                        team_id: 2,
                        team_name: 'Beta Team',
                        total_points: 80,
                        rounds_won: 2,
                        rounds_played: 5,
                        placement_breakdown: { first: 2, second: 2, third: 1, dnf: 0 },
                        last_round_winner: false,
                    },
                    {
                        team_id: 3,
                        team_name: 'Gamma Team',
                        total_points: 60,
                        rounds_won: 0,
                        rounds_played: 5,
                        placement_breakdown: { first: 0, second: 2, third: 3, dnf: 0 },
                        last_round_winner: false,
                    },
                ],
                current_round: 5,
                total_rounds: 5,
                last_round_game_id: 10,
            });

            render(<TeamLeaderboard lobbyId={1} />);

            await waitFor(() => {
                expect(screen.getByText('Alpha Team')).toBeInTheDocument();
                expect(screen.getByText('Beta Team')).toBeInTheDocument();
                expect(screen.getByText('Gamma Team')).toBeInTheDocument();
            });

            // Check placement numbers
            expect(screen.getByText('1.')).toBeInTheDocument();
            expect(screen.getByText('2.')).toBeInTheDocument();
            expect(screen.getByText('3.')).toBeInTheDocument();

            // Check points display
            expect(screen.getByText('100 pts')).toBeInTheDocument();
            expect(screen.getByText('(3-1-1-0) 1st-2nd-3rd-DNF')).toBeInTheDocument();
            expect(screen.getByText('80 pts')).toBeInTheDocument();
            expect(screen.getByText('(2-2-1-0) 1st-2nd-3rd-DNF')).toBeInTheDocument();
            expect(screen.getByText('60 pts')).toBeInTheDocument();
            expect(screen.getByText('(0-2-3-0) 1st-2nd-3rd-DNF')).toBeInTheDocument();
        });

        test('displays medals for top 3 teams', async () => {
            vi.mocked(api.tournament.getLeaderboard).mockResolvedValue({
                teams: [
                    {
                        team_id: 1,
                        team_name: 'First Place',
                        total_points: 100,
                        rounds_won: 3,
                        rounds_played: 5,
                        placement_breakdown: { first: 3, second: 1, third: 1, dnf: 0 },
                        last_round_winner: false,
                    },
                    {
                        team_id: 2,
                        team_name: 'Second Place',
                        total_points: 80,
                        rounds_won: 2,
                        rounds_played: 5,
                        placement_breakdown: { first: 2, second: 2, third: 1, dnf: 0 },
                        last_round_winner: false,
                    },
                    {
                        team_id: 3,
                        team_name: 'Third Place',
                        total_points: 60,
                        rounds_won: 0,
                        rounds_played: 5,
                        placement_breakdown: { first: 0, second: 2, third: 3, dnf: 0 },
                        last_round_winner: false,
                    },
                    {
                        team_id: 4,
                        team_name: 'Fourth Place',
                        total_points: 40,
                        rounds_won: 0,
                        rounds_played: 5,
                        placement_breakdown: { first: 0, second: 0, third: 0, dnf: 5 },
                        last_round_winner: false,
                    },
                ],
                current_round: 5,
                total_rounds: 5,
                last_round_game_id: 10,
            });

            render(<TeamLeaderboard lobbyId={1} />);

            await waitFor(() => {
                expect(screen.getByText('🥇')).toBeInTheDocument();
                expect(screen.getByText('🥈')).toBeInTheDocument();
                expect(screen.getByText('🥉')).toBeInTheDocument();
            });
        });

        test('displays crown on last round winner', async () => {
            vi.mocked(api.tournament.getLeaderboard).mockResolvedValue({
                teams: [
                    {
                        team_id: 1,
                        team_name: 'Winner Team',
                        total_points: 100,
                        rounds_won: 3,
                        rounds_played: 5,
                        placement_breakdown: { first: 3, second: 1, third: 1, dnf: 0 },
                        last_round_winner: true,
                    },
                    {
                        team_id: 2,
                        team_name: 'Other Team',
                        total_points: 80,
                        rounds_won: 2,
                        rounds_played: 5,
                        placement_breakdown: { first: 2, second: 2, third: 1, dnf: 0 },
                        last_round_winner: false,
                    },
                ],
                current_round: 5,
                total_rounds: 5,
                last_round_game_id: 10,
            });

            render(<TeamLeaderboard lobbyId={1} />);

            await waitFor(() => {
                expect(screen.getByText('👑')).toBeInTheDocument();
            });
        });

        test('shows wins and rounds played', async () => {
            vi.mocked(api.tournament.getLeaderboard).mockResolvedValue({
                teams: [
                    {
                        team_id: 1,
                        team_name: 'Team A',
                        total_points: 100,
                        rounds_won: 3,
                        rounds_played: 5,
                        placement_breakdown: { first: 3, second: 1, third: 1, dnf: 0 },
                        last_round_winner: false,
                    },
                ],
                current_round: 5,
                total_rounds: 5,
                last_round_game_id: 10,
            });

            render(<TeamLeaderboard lobbyId={1} />);

            await waitFor(() => {
                expect(screen.getByText('3 wins')).toBeInTheDocument();
                expect(screen.getByText('5 rounds')).toBeInTheDocument();
            });
        });

        test('uses singular form for 1 win/round', async () => {
            vi.mocked(api.tournament.getLeaderboard).mockResolvedValue({
                teams: [
                    {
                        team_id: 1,
                        team_name: 'Team A',
                        total_points: 10,
                        rounds_won: 1,
                        rounds_played: 1,
                        placement_breakdown: { first: 1, second: 0, third: 0, dnf: 0 },
                        last_round_winner: false,
                    },
                ],
                current_round: 1,
                total_rounds: 1,
                last_round_game_id: 10,
            });

            render(<TeamLeaderboard lobbyId={1} />);

            await waitFor(() => {
                expect(screen.getByText('1 win')).toBeInTheDocument();
                expect(screen.getByText('1 round')).toBeInTheDocument();
            });
        });

        test('shows current round number', async () => {
            vi.mocked(api.tournament.getLeaderboard).mockResolvedValue({
                teams: [
                    {
                        team_id: 1,
                        team_name: 'Team A',
                        total_points: 100,
                        rounds_won: 3,
                        rounds_played: 5,
                        placement_breakdown: { first: 3, second: 1, third: 1, dnf: 0 },
                        last_round_winner: false,
                    },
                ],
                current_round: 5,
                total_rounds: 5,
                last_round_game_id: 10,
            });

            render(<TeamLeaderboard lobbyId={1} />);

            await waitFor(() => {
                expect(screen.getByText('Round 5')).toBeInTheDocument();
            });
        });

        test('shows message when no rounds played', async () => {
            vi.mocked(api.tournament.getLeaderboard).mockResolvedValue({
                teams: [
                    {
                        team_id: 1,
                        team_name: 'Team A',
                        total_points: 0,
                        rounds_won: 0,
                        rounds_played: 0,
                        placement_breakdown: { first: 0, second: 0, third: 0, dnf: 0 },
                        last_round_winner: false,
                    },
                ],
                current_round: 0,
                total_rounds: 0,
                last_round_game_id: null,
            });

            render(<TeamLeaderboard lobbyId={1} />);

            await waitFor(() => {
                expect(screen.getByText('No rounds played yet. Start a game to begin!')).toBeInTheDocument();
            });
        });
    });

    describe('Refresh Trigger', () => {
        test('refetches data when refresh trigger changes', async () => {
            const mockGetLeaderboard = vi.mocked(api.tournament.getLeaderboard);

            mockGetLeaderboard.mockResolvedValue({
                teams: [],
                current_round: 0,
                total_rounds: 0,
                last_round_game_id: null,
            });

            const { rerender } = render(<TeamLeaderboard lobbyId={1} refreshTrigger={0} />);

            await waitFor(() => {
                expect(mockGetLeaderboard).toHaveBeenCalledTimes(1);
            });

            mockGetLeaderboard.mockClear();

            // Trigger refresh
            rerender(<TeamLeaderboard lobbyId={1} refreshTrigger={1} />);

            await waitFor(() => {
                expect(mockGetLeaderboard).toHaveBeenCalledTimes(1);
            });
        });
    });

    describe('Styling', () => {
        test('highlights last round winner with special styling', async () => {
            vi.mocked(api.tournament.getLeaderboard).mockResolvedValue({
                teams: [
                    {
                        team_id: 1,
                        team_name: 'Winner Team',
                        total_points: 100,
                        rounds_won: 3,
                        rounds_played: 5,
                        placement_breakdown: { first: 3, second: 1, third: 1, dnf: 0 },
                        last_round_winner: true,
                    },
                ],
                current_round: 5,
                total_rounds: 5,
                last_round_game_id: 10,
            });

            const { container } = render(<TeamLeaderboard lobbyId={1} />);

            await waitFor(() => {
                const winnerRow = container.querySelector('.border-yellow-400');
                expect(winnerRow).toBeInTheDocument();
            });
        });

        test('applies special styling to top 3 teams', async () => {
            vi.mocked(api.tournament.getLeaderboard).mockResolvedValue({
                teams: [
                    {
                        team_id: 1,
                        team_name: 'First',
                        total_points: 100,
                        rounds_won: 3,
                        rounds_played: 5,
                        placement_breakdown: { first: 3, second: 1, third: 1, dnf: 0 },
                        last_round_winner: false,
                    },
                    {
                        team_id: 2,
                        team_name: 'Second',
                        total_points: 80,
                        rounds_won: 2,
                        rounds_played: 5,
                        placement_breakdown: { first: 2, second: 2, third: 1, dnf: 0 },
                        last_round_winner: false,
                    },
                    {
                        team_id: 3,
                        team_name: 'Third',
                        total_points: 60,
                        rounds_won: 0,
                        rounds_played: 5,
                        placement_breakdown: { first: 0, second: 2, third: 3, dnf: 0 },
                        last_round_winner: false,
                    },
                    {
                        team_id: 4,
                        team_name: 'Fourth',
                        total_points: 40,
                        rounds_won: 0,
                        rounds_played: 5,
                        placement_breakdown: { first: 0, second: 0, third: 0, dnf: 5 },
                        last_round_winner: false,
                    },
                ],
                current_round: 5,
                total_rounds: 5,
                last_round_game_id: 10,
            });

            const { container } = render(<TeamLeaderboard lobbyId={1} />);

            await waitFor(() => {
                const grayBgRows = container.querySelectorAll('.bg-gray-50');
                expect(grayBgRows.length).toBe(3); // Top 3 teams
            });
        });
    });
});
