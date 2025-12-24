import {
    Player,
    Lobby,
    LobbyInfo,
    ApiResponse,
    GeneratedNameResponse,
    AdminAuthAdminAuthenticatedResponse,
    GameState,
    Guess,
    GameStateResponse,
    StartGameRequest,
    StartGameResponse,
} from '@/types';
import type { Puzzle } from '@/types/game';

export class ApiError extends Error {
    status: number;
    data: unknown;

    constructor(status: number, message: string, data?: unknown) {
        super(message);
        this.status = status;
        this.data = data;
    }
}

const API_BASE = '/api';

const request = async <T>(endpoint: string, options?: RequestInit, bearerToken?: string): Promise<T> => {
    const url = `${API_BASE}${endpoint}`;
    console.log(`API Request: ${options?.method || 'GET'} ${url}`);
    const response = await fetch(url, {
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
            ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
        },
        ...options,
    });

    if (!response.ok) {
        let errorData: unknown = null;
        let errorMessage = `API error: ${response.status} ${response.statusText}`;

        try {
            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                errorData = await response.json();
                if (
                    typeof errorData === 'object' &&
                    errorData !== null &&
                    'detail' in errorData &&
                    typeof (errorData as { detail?: unknown }).detail === 'string'
                ) {
                    errorMessage = (errorData as { detail: string }).detail;
                }
            } else {
                const text = await response.text();
                if (text) {
                    errorMessage = text;
                    errorData = text;
                }
            }
        } catch (parseError) {
            console.warn('Failed to parse error response', parseError);
        }

        throw new ApiError(response.status, errorMessage, errorData);
    }

    return response.json();
};

export const api = {
    admin: {
        lobby: {
            async create(name: string, bearerToken: string): Promise<Lobby> {
                return request<Lobby>(
                    '/admin/lobby',
                    {
                        method: 'POST',
                        body: JSON.stringify({ name }),
                    },
                    bearerToken
                );
            },
            async getRandomName(bearerToken: string): Promise<GeneratedNameResponse> {
                return request<GeneratedNameResponse>('/admin/lobby/random-name', {}, bearerToken);
            },
            async getAll(bearerToken: string): Promise<Lobby[]> {
                return request<Lobby[]>('/admin/lobby', {}, bearerToken);
            },
            async delete(lobbyId: number, bearerToken: string): Promise<ApiResponse> {
                return request<ApiResponse>(
                    `/admin/lobby/${lobbyId}`,
                    {
                        method: 'DELETE',
                    },
                    bearerToken
                );
            },
            async getInfo(lobbyId: number, bearerToken: string): Promise<LobbyInfo> {
                return request<LobbyInfo>(`/admin/lobby/${lobbyId}`, {}, bearerToken);
            },
            team: {
                async create(lobbyId: number, numTeams: number, bearerToken: string): Promise<ApiResponse> {
                    return request<ApiResponse>(
                        `/admin/lobby/${lobbyId}/team`,
                        {
                            method: 'POST',
                            body: JSON.stringify({ num_teams: numTeams }),
                        },
                        bearerToken
                    );
                },
                async addOne(lobbyId: number, bearerToken: string): Promise<ApiResponse> {
                    return request<ApiResponse>(
                        `/admin/lobby/${lobbyId}/team/add-one`,
                        {
                            method: 'POST',
                        },
                        bearerToken
                    );
                },
                async remove(teamId: number, bearerToken: string): Promise<ApiResponse> {
                    return request<ApiResponse>(
                        `/admin/lobby/team/${teamId}`,
                        {
                            method: 'DELETE',
                        },
                        bearerToken
                    );
                },
                async move(playerId: number, teamId: number, bearerToken: string): Promise<ApiResponse> {
                    return request<ApiResponse>(
                        `/admin/lobby/team/${teamId}/player/${playerId}`,
                        {
                            method: 'PUT',
                        },
                        bearerToken
                    );
                },
                async updateName(teamId: number, name: string, bearerToken: string): Promise<ApiResponse> {
                    return request<ApiResponse>(
                        `/admin/lobby/team/${teamId}/name`,
                        {
                            method: 'PUT',
                            body: JSON.stringify({ name }),
                        },
                        bearerToken
                    );
                },
            },
            player: {
                async kick(playerId: number, bearerToken: string): Promise<ApiResponse> {
                    return request<ApiResponse>(
                        `/admin/lobby/player/${playerId}`,
                        {
                            method: 'DELETE',
                        },
                        bearerToken
                    );
                },
            },
            async startGame(
                lobbyId: number,
                difficulty: 'easy' | 'medium' | 'hard',
                puzzleMode: 'same' | 'different',
                wordCountMode: 'exact' | 'balanced',
                bearerToken: string,
                forceStart: boolean = false
            ): Promise<StartGameResponse> {
                const requestBody: StartGameRequest = {
                    difficulty,
                    puzzle_mode: puzzleMode,
                    word_count_mode: wordCountMode,
                    force_start: forceStart,
                };
                return request<StartGameResponse>(
                    `/admin/lobby/${lobbyId}/start`,
                    {
                        method: 'POST',
                        body: JSON.stringify(requestBody),
                    },
                    bearerToken
                );
            },
            async getGameState(lobbyId: number, bearerToken: string): Promise<GameStateResponse> {
                return request<GameStateResponse>(`/admin/lobby/${lobbyId}/game-state`, {}, bearerToken);
            },
            async endGame(lobbyId: number, bearerToken: string): Promise<StartGameResponse> {
                return request<StartGameResponse>(
                    `/admin/lobby/${lobbyId}/end`,
                    {
                        method: 'POST',
                    },
                    bearerToken
                );
            },
            async startTimer(
                lobbyId: number,
                durationMinutes: number,
                durationSeconds: number,
                bearerToken: string
            ): Promise<ApiResponse> {
                return request<ApiResponse>(
                    `/admin/lobby/${lobbyId}/start-timer`,
                    {
                        method: 'POST',
                        body: JSON.stringify({
                            duration_minutes: durationMinutes,
                            duration_seconds: durationSeconds,
                        }),
                    },
                    bearerToken
                );
            },
            async getTimerState(
                lobbyId: number,
                bearerToken: string
            ): Promise<{
                is_active: boolean;
                duration_seconds: number | null;
                started_at: string | null;
                expires_at: string | null;
            }> {
                return request<{
                    is_active: boolean;
                    duration_seconds: number | null;
                    started_at: string | null;
                    expires_at: string | null;
                }>(
                    `/admin/lobby/${lobbyId}/timer-state`,
                    {
                        method: 'GET',
                    },
                    bearerToken
                );
            },
            async getGameStats(
                gameId: number,
                bearerToken: string
            ): Promise<{
                game_id: number;
                round_number: number;
                started_at: string;
                teams: {
                    team_id: number;
                    team_name: string;
                    placement: number | null;
                    points_earned: number | null;
                    wrong_guesses: number;
                    wrong_guess_rate: number;
                    wrong_guess_label: string;
                    completed_at: string | null;
                    completion_percentage: number;
                    time_to_complete: number | null;
                    puzzle: {
                        title: string;
                        ladder: {
                            word: string;
                            clue: string | null;
                            transform: string | null;
                        }[];
                    };
                    revealed_steps: number[];
                    player_stats: {
                        player_id: number;
                        player_name: string;
                        correct_guesses: number;
                        total_guesses: number;
                        accuracy_rate: number;
                        words_solved: number[];
                        wrong_guesses: string[];
                        awards: {
                            key: string;
                            title: string;
                            emoji: string;
                            description: string;
                        }[];
                    }[];
                }[];
                last_round_winner_id: number | null;
            }> {
                return request(`/stats/game/${gameId}`, {}, bearerToken);
            },
            async getAllRounds(
                lobbyId: number,
                bearerToken: string
            ): Promise<{ round_number: number; game_id: number }[]> {
                return request(`/admin/lobby/${lobbyId}/rounds`, {}, bearerToken);
            },
            async getLeaderboard(
                lobbyId: number,
                bearerToken: string
            ): Promise<{
                teams: {
                    team_id: number;
                    team_name: string;
                    total_points: number;
                    rounds_won: number;
                    rounds_played: number;
                    placement_breakdown: {
                        first: number;
                        second: number;
                        third: number;
                        dnf: number;
                    };
                    last_round_winner: boolean;
                }[];
                current_round: number;
                total_rounds: number;
                last_round_game_id: number | null;
            }> {
                return request(`/lobby/${lobbyId}/leaderboard`, {}, bearerToken);
            },
        },
        async checkCredentials(bearerToken: string): Promise<AdminAuthAdminAuthenticatedResponse> {
            return request<AdminAuthAdminAuthenticatedResponse>('/admin/check', {}, bearerToken);
        },
    },
    player: {
        lobby: {
            async activeUser(sessionId: string): Promise<Player> {
                return request<Player>(`/lobby/active`, {}, sessionId);
            },
            async join(lobbyCode: string, name: string, sessionId?: string): Promise<Player> {
                return request<Player>(
                    `/lobby/${lobbyCode}`,
                    {
                        method: 'POST',
                        body: JSON.stringify({ name }),
                    },
                    sessionId
                );
            },
            async getInfo(sessionId: string): Promise<Lobby> {
                return request<Lobby>(`/lobby`, {}, sessionId);
            },
            async getLobbyInfo(lobbyId: number, sessionId: string): Promise<LobbyInfo> {
                return request<LobbyInfo>(`/lobby/${lobbyId}`, {}, sessionId);
            },
            async leave(sessionId: string): Promise<ApiResponse> {
                return request<ApiResponse>(
                    `/lobby`,
                    {
                        method: 'DELETE',
                    },
                    sessionId
                );
            },
            async toggleReady(sessionId: string): Promise<ApiResponse> {
                return request<ApiResponse>(
                    `/lobby/ready`,
                    {
                        method: 'PUT',
                    },
                    sessionId
                );
            },
            async getLeaderboard(
                lobbyId: number,
                sessionId: string
            ): Promise<{
                teams: {
                    team_id: number;
                    team_name: string;
                    total_points: number;
                    rounds_won: number;
                    rounds_played: number;
                    placement_breakdown: {
                        first: number;
                        second: number;
                        third: number;
                        dnf: number;
                    };
                    last_round_winner: boolean;
                }[];
                current_round: number;
                total_rounds: number;
                last_round_game_id: number | null;
            }> {
                return request(`/lobby/${lobbyId}/leaderboard`, {}, sessionId);
            },
        },
        game: {
            async getPuzzle(sessionId: string): Promise<{
                puzzle: Puzzle;
                team_id: number;
                team_name: string;
                lobby_id: number;
                state: GameState;
                guesses: Guess[];
            }> {
                return request<{
                    puzzle: Puzzle;
                    team_id: number;
                    team_name: string;
                    lobby_id: number;
                    state: GameState;
                    guesses: Guess[];
                }>(`/game/puzzle?player_session_id=${sessionId}`, {}, sessionId);
            },
            async getGameStats(
                gameId: number,
                sessionId: string
            ): Promise<{
                game_id: number;
                round_number: number;
                started_at: string;
                teams: {
                    team_id: number;
                    team_name: string;
                    placement: number | null;
                    points_earned: number | null;
                    wrong_guesses: number;
                    wrong_guess_rate: number;
                    wrong_guess_label: string;
                    completed_at: string | null;
                    completion_percentage: number;
                    time_to_complete: number | null;
                    player_stats: {
                        player_id: number;
                        player_name: string;
                        correct_guesses: number;
                        total_guesses: number;
                        accuracy_rate: number;
                        words_solved: number[];
                        wrong_guesses: string[];
                        awards: {
                            key: string;
                            title: string;
                            emoji: string;
                            description: string;
                        }[];
                    }[];
                }[];
                last_round_winner_id: number | null;
            }> {
                return request(`/stats/game/${gameId}`, {}, sessionId);
            },
            async getTimerState(sessionId: string): Promise<{
                is_active: boolean;
                duration_seconds: number | null;
                started_at: string | null;
                expires_at: string | null;
            }> {
                return request<{
                    is_active: boolean;
                    duration_seconds: number | null;
                    started_at: string | null;
                    expires_at: string | null;
                }>(`/game/timer-state?player_session_id=${sessionId}`, {}, sessionId);
            },
        },
    },
};
