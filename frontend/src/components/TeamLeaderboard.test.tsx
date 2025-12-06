import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import TeamLeaderboard from './TeamLeaderboard';
import { api } from '@/services/api';

vi.mock('@/services/api', () => ({
    api: {
        leaderboard: {
            getLobbyLeaderboard: vi.fn(),
        },
    },
}));

describe('TeamLeaderboard', () => {
    const mockLeaderboardData = {
        teams: [
            {
                team_id: 1,
                team_name: 'Team Alpha',
                total_points: 15,
                rounds_won: 2,
                rounds_played: 3,
                placement_breakdown: { first: 2, second: 1, third: 0, dnf: 0 },
                last_round_winner: true,
            },
            {
                team_id: 2,
                team_name: 'Team Beta',
                total_points: 12,
                rounds_won: 1,
                rounds_played: 3,
                placement_breakdown: { first: 1, second: 1, third: 1, dnf: 0 },
                last_round_winner: false,
            },
            {
                team_id: 3,
                team_name: 'Team Gamma',
                total_points: 9,
                rounds_won: 0,
                rounds_played: 3,
                placement_breakdown: { first: 0, second: 1, third: 1, dnf: 1 },
                last_round_winner: false,
            },
        ],
        current_round: 3,
        total_rounds: 3,
        last_round_game_id: 123,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders loading state initially', () => {
        vi.mocked(api.leaderboard.getLobbyLeaderboard).mockImplementation(
            () => new Promise(() => {}) // Never resolves
        );

        render(<TeamLeaderboard lobbyId={1} />);

        expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('fetches and displays leaderboard data', async () => {
        vi.mocked(api.leaderboard.getLobbyLeaderboard).mockResolvedValue(mockLeaderboardData);

        render(<TeamLeaderboard lobbyId={1} />);

        await waitFor(() => {
            expect(screen.getByText('Team Alpha')).toBeInTheDocument();
            expect(screen.getByText('Team Beta')).toBeInTheDocument();
            expect(screen.getByText('Team Gamma')).toBeInTheDocument();
        });

        expect(api.leaderboard.getLobbyLeaderboard).toHaveBeenCalledWith(1);
    });

    it('displays crown icon for last round winner', async () => {
        vi.mocked(api.leaderboard.getLobbyLeaderboard).mockResolvedValue(mockLeaderboardData);

        render(<TeamLeaderboard lobbyId={1} />);

        await waitFor(() => {
            expect(screen.getByText('👑')).toBeInTheDocument();
        });
    });

    it('displays correct points for each team', async () => {
        vi.mocked(api.leaderboard.getLobbyLeaderboard).mockResolvedValue(mockLeaderboardData);

        render(<TeamLeaderboard lobbyId={1} />);

        await waitFor(() => {
            expect(screen.getByText(/15 pts/i)).toBeInTheDocument();
            expect(screen.getByText(/12 pts/i)).toBeInTheDocument();
            expect(screen.getByText(/9 pts/i)).toBeInTheDocument();
        });
    });

    it('displays placement breakdown in correct format', async () => {
        vi.mocked(api.leaderboard.getLobbyLeaderboard).mockResolvedValue(mockLeaderboardData);

        render(<TeamLeaderboard lobbyId={1} />);

        await waitFor(() => {
            // Team Alpha: 2-1-0-0 (2 firsts, 1 second, 0 thirds, 0 DNFs)
            expect(screen.getByText(/2-1-0-0/i)).toBeInTheDocument();
            // Team Beta: 1-1-1-0
            expect(screen.getByText(/1-1-1-0/i)).toBeInTheDocument();
            // Team Gamma: 0-1-1-1
            expect(screen.getByText(/0-1-1-1/i)).toBeInTheDocument();
        });
    });

    it('applies gold styling to first place team', async () => {
        vi.mocked(api.leaderboard.getLobbyLeaderboard).mockResolvedValue(mockLeaderboardData);

        const { container } = render(<TeamLeaderboard lobbyId={1} />);

        await waitFor(() => {
            const firstPlaceRow = container.querySelector('.bg-yellow-500\\/5');
            expect(firstPlaceRow).toBeInTheDocument();
        });
    });

    it('applies silver styling to second place team', async () => {
        vi.mocked(api.leaderboard.getLobbyLeaderboard).mockResolvedValue(mockLeaderboardData);

        const { container } = render(<TeamLeaderboard lobbyId={1} />);

        await waitFor(() => {
            const secondPlaceRow = container.querySelector('.bg-gray-400\\/5');
            expect(secondPlaceRow).toBeInTheDocument();
        });
    });

    it('applies bronze styling to third place team', async () => {
        vi.mocked(api.leaderboard.getLobbyLeaderboard).mockResolvedValue(mockLeaderboardData);

        const { container } = render(<TeamLeaderboard lobbyId={1} />);

        await waitFor(() => {
            const thirdPlaceRow = container.querySelector('.bg-orange-600\\/5');
            expect(thirdPlaceRow).toBeInTheDocument();
        });
    });

    it('displays error message when API call fails', async () => {
        vi.mocked(api.leaderboard.getLobbyLeaderboard).mockRejectedValue(new Error('Network error'));

        render(<TeamLeaderboard lobbyId={1} />);

        await waitFor(() => {
            expect(screen.getByText(/failed to load leaderboard/i)).toBeInTheDocument();
        });
    });

    it('shows empty state when no teams exist', async () => {
        vi.mocked(api.leaderboard.getLobbyLeaderboard).mockResolvedValue({
            teams: [],
            current_round: 0,
            total_rounds: 0,
            last_round_game_id: null,
        });

        render(<TeamLeaderboard lobbyId={1} />);

        await waitFor(() => {
            expect(screen.getByText(/no teams yet/i)).toBeInTheDocument();
        });
    });

    it('refetches data when lobbyId changes', async () => {
        vi.mocked(api.leaderboard.getLobbyLeaderboard).mockResolvedValue(mockLeaderboardData);

        const { rerender } = render(<TeamLeaderboard lobbyId={1} />);

        await waitFor(() => {
            expect(api.leaderboard.getLobbyLeaderboard).toHaveBeenCalledWith(1);
        });

        rerender(<TeamLeaderboard lobbyId={2} />);

        await waitFor(() => {
            expect(api.leaderboard.getLobbyLeaderboard).toHaveBeenCalledWith(2);
        });

        expect(api.leaderboard.getLobbyLeaderboard).toHaveBeenCalledTimes(2);
    });

    it('refetches data when refreshTrigger changes', async () => {
        vi.mocked(api.leaderboard.getLobbyLeaderboard).mockResolvedValue(mockLeaderboardData);

        const { rerender } = render(<TeamLeaderboard lobbyId={1} refreshTrigger={0} />);

        await waitFor(() => {
            expect(api.leaderboard.getLobbyLeaderboard).toHaveBeenCalledTimes(1);
        });

        rerender(<TeamLeaderboard lobbyId={1} refreshTrigger={1} />);

        await waitFor(() => {
            expect(api.leaderboard.getLobbyLeaderboard).toHaveBeenCalledTimes(2);
        });
    });

    it('displays current round information', async () => {
        vi.mocked(api.leaderboard.getLobbyLeaderboard).mockResolvedValue(mockLeaderboardData);

        render(<TeamLeaderboard lobbyId={1} />);

        await waitFor(() => {
            expect(screen.getByText(/round 3/i)).toBeInTheDocument();
        });
    });

    it('handles teams with same points correctly', async () => {
        const tiedData = {
            teams: [
                {
                    team_id: 1,
                    team_name: 'Team A',
                    total_points: 10,
                    rounds_won: 1,
                    rounds_played: 2,
                    placement_breakdown: { first: 1, second: 1, third: 0, dnf: 0 },
                    last_round_winner: false,
                },
                {
                    team_id: 2,
                    team_name: 'Team B',
                    total_points: 10,
                    rounds_won: 1,
                    rounds_played: 2,
                    placement_breakdown: { first: 1, second: 1, third: 0, dnf: 0 },
                    last_round_winner: true,
                },
            ],
            current_round: 2,
            total_rounds: 2,
            last_round_game_id: 456,
        };

        vi.mocked(api.leaderboard.getLobbyLeaderboard).mockResolvedValue(tiedData);

        render(<TeamLeaderboard lobbyId={1} />);

        await waitFor(() => {
            expect(screen.getByText('Team A')).toBeInTheDocument();
            expect(screen.getByText('Team B')).toBeInTheDocument();
        });
    });
});
