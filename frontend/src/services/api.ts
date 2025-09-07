import { Player, Lobby, LobbyInfo, ApiResponse, AdminAuthAdminAuthenticatedResponse } from '@/types';

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
        throw new Error(`API error: ${response.status} ${response.statusText}`);
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
                async move(playerId: number, teamId: number, bearerToken: string): Promise<ApiResponse> {
                    return request<ApiResponse>(
                        `/admin/lobby/team/${teamId}/player/${playerId}`,
                        {
                            method: 'PUT',
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
        },
    },
};
