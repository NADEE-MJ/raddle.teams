import { Player, Lobby, LobbyInfo } from "@/types";

const API_BASE = "/api";

const request = async <T>(
  endpoint: string,
  options?: RequestInit,
  bearerToken?: string
): Promise<T> => {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    headers: {
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
          "/admin/lobby",
          {
            method: "POST",
            body: JSON.stringify({ name }),
          },
          bearerToken
        );
      },
      async getAll(bearerToken: string): Promise<Lobby[]> {
        return request<Lobby[]>("/admin/lobby", {}, bearerToken);
      },
      async delete(
        lobbyId: number,
        bearerToken: string
      ): Promise<{ status: string; message: string }> {
        return request<{ status: string; message: string }>(
          `/admin/lobby/${lobbyId}`,
          {
            method: "DELETE",
          },
          bearerToken
        );
      },
      async getInfo(lobbyId: number, bearerToken: string): Promise<LobbyInfo> {
        return request<LobbyInfo>(`/admin/lobby/${lobbyId}`, {}, bearerToken);
      },
    },
    async checkCredentials(bearerToken: string): Promise<{ status: string; message: string }> {
      return request<{ status: string; message: string }>("/admin/check", {}, bearerToken);
    },
  },
  player: {
    lobby: {
      async activeUser(bearerToken: string): Promise<Player> {
        return request<Player>(`/lobby/active`, {}, bearerToken);
      },
      async join(lobbyCode: string, name: string, sessionId: string): Promise<Player> {
        return request<Player>(`/lobby/${lobbyCode}/join`, {
          method: "POST",
          body: JSON.stringify({ name, session_id: sessionId }),
        });
      },
      async getInfo(bearerToken: string): Promise<Lobby> {
        return request<Lobby>(`/lobby`, {}, bearerToken);
      },
      async leave(bearerToken: string): Promise<{ status: string; message: string }> {
        return request<{ status: string; message: string }>(
          `/lobby`,
          {
            method: "DELETE",
          },
          bearerToken
        );
      },
    },
  },
};
