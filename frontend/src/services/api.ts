import { 
    Player, 
    Lobby, 
    LobbyInfo, 
    ApiResponse, 
    Game, 
    Puzzle, 
    TeamProgress, 
    LeaderboardEntry, 
    GuessSubmissionRequest, 
    GuessSubmissionResult, 
    TutorialResponse,
} from '@/types';

const API_BASE = '/api';

const request = async <T>(endpoint: string, options?: RequestInit, bearerToken?: string): Promise<T> => {
    const url = `${API_BASE}${endpoint}`;
    const response = await fetch(url, {
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
            ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
        },
        ...options,
    });

    if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
};

export const api = {
    general: {
        async getTutorial(): Promise<TutorialResponse> {
            return request<TutorialResponse>('/tutorial');
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
        },
        game: {
            async getCurrentGame(sessionId: string): Promise<Game | null> {
                return request<Game | null>(`/game`, {}, sessionId);
            },
            async getPuzzle(gameId: number, sessionId: string): Promise<Puzzle> {
                return request<Puzzle>(`/game/${gameId}/puzzle`, {}, sessionId);
            },
            async getTeamProgress(gameId: number, sessionId: string): Promise<TeamProgress> {
                return request<TeamProgress>(`/game/${gameId}/team-progress`, {}, sessionId);
            },
            async submitGuess(
                gameId: number, 
                guess: GuessSubmissionRequest, 
                sessionId: string
            ): Promise<GuessSubmissionResult> {
                return request<GuessSubmissionResult>(
                    `/game/${gameId}/guess`,
                    {
                        method: 'POST',
                        body: JSON.stringify(guess),
                    },
                    sessionId
                );
            },
            async getLeaderboard(gameId: number, sessionId: string): Promise<LeaderboardEntry[]> {
                return request<LeaderboardEntry[]>(`/game/${gameId}/leaderboard`, {}, sessionId);
            },
        },
    },
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
        },
        game: {
            async create(
                lobbyId: number, 
                puzzleName: string, 
                bearerToken: string
            ): Promise<Game> {
                return request<Game>(
                    '/admin/game',
                    {
                        method: 'POST',
                        body: JSON.stringify({ lobby_id: lobbyId, puzzle_name: puzzleName }),
                    },
                    bearerToken
                );
            },
            async get(gameId: number, bearerToken: string): Promise<Game> {
                return request<Game>(`/admin/game/${gameId}`, {}, bearerToken);
            },
            async start(gameId: number, bearerToken: string): Promise<ApiResponse> {
                return request<ApiResponse>(
                    `/admin/game/${gameId}/start`,
                    { method: 'POST' },
                    bearerToken
                );
            },
            async finish(gameId: number, bearerToken: string): Promise<ApiResponse> {
                return request<ApiResponse>(
                    `/admin/game/${gameId}/finish`,
                    { method: 'POST' },
                    bearerToken
                );
            },
            async getPuzzles(bearerToken: string): Promise<string[]> {
                return request<string[]>('/admin/puzzles', {}, bearerToken);
            },
            async getTeams(gameId: number, bearerToken: string): Promise<any[]> {
                return request<any[]>(`/admin/game/${gameId}/teams`, {}, bearerToken);
            },
        },
        teams: {
            async create(name: string, gameId: number, bearerToken: string): Promise<any> {
                return request<any>(
                    '/admin/team',
                    {
                        method: 'POST',
                        body: JSON.stringify({ name, game_id: gameId }),
                    },
                    bearerToken
                );
            },
            async assignPlayer(
                playerId: number, 
                teamId: number, 
                bearerToken: string
            ): Promise<ApiResponse> {
                return request<ApiResponse>(
                    '/admin/team/assign-player',
                    {
                        method: 'POST',
                        body: JSON.stringify({ player_id: playerId, team_id: teamId }),
                    },
                    bearerToken
                );
            },
            async autoAssign(
                gameId: number, 
                teamCount: number, 
                teamNames: string[], 
                bearerToken: string
            ): Promise<ApiResponse> {
                return request<ApiResponse>(
                    '/admin/team/auto-assign',
                    {
                        method: 'POST',
                        body: JSON.stringify({ 
                            game_id: gameId, 
                            team_count: teamCount, 
                            team_names: teamNames 
                        }),
                    },
                    bearerToken
                );
            },
            async delete(teamId: number, bearerToken: string): Promise<ApiResponse> {
                return request<ApiResponse>(
                    `/admin/team/${teamId}`,
                    { method: 'DELETE' },
                    bearerToken
                );
            },
            async getPlayers(teamId: number, bearerToken: string): Promise<Player[]> {
                return request<Player[]>(`/admin/team/${teamId}/players`, {}, bearerToken);
            },
        },
        async checkCredentials(bearerToken: string): Promise<ApiResponse> {
            return request<ApiResponse>('/admin/check', {}, bearerToken);
        },
    },
};
