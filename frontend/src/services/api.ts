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
      "Content-Type": "application/json",
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
          body: JSON.stringify({ name }),
        }, sessionId); // sessionId becomes the bearer token
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

// Token management constants  
const ADMIN_TOKEN_KEY = "raddle_admin_token";
const USER_TOKEN_KEY = "raddle_user_token";

// Legacy apiService interface that the frontend expects
export const apiService = {
  // Token management methods
  getAdminToken(): string | null {
    return localStorage.getItem(ADMIN_TOKEN_KEY);
  },

  setAdminToken(token: string): void {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
  },

  getUserToken(): string | null {
    return localStorage.getItem(USER_TOKEN_KEY);
  },

  setUserToken(token: string): void {
    localStorage.setItem(USER_TOKEN_KEY, token);
  },

  clearTokens(): void {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(USER_TOKEN_KEY);
  },

  // Admin API methods - these get token automatically
  async getAllLobbies(): Promise<Lobby[]> {
    const token = this.getAdminToken();
    if (!token) throw new Error("No admin token available");
    return api.admin.lobby.getAll(token);
  },

  async createLobby(name: string): Promise<Lobby> {
    const token = this.getAdminToken();
    if (!token) throw new Error("No admin token available");
    return api.admin.lobby.create(name, token);
  },

  async deleteLobby(lobbyId: number): Promise<{ status: string; message: string }> {
    const token = this.getAdminToken();
    if (!token) throw new Error("No admin token available");
    return api.admin.lobby.delete(lobbyId, token);
  },

  async getLobbyInfo(lobbyId: number): Promise<LobbyInfo> {
    // Try admin token first, then user token
    const adminToken = this.getAdminToken();
    if (adminToken) {
      return api.admin.lobby.getInfo(lobbyId, adminToken);
    }
    
    const userToken = this.getUserToken();
    if (!userToken) throw new Error("No authentication token available");
    return api.player.lobby.getInfo(lobbyId, userToken);
  },

  async checkAdminCredentials(): Promise<{ status: string; message: string }> {
    const token = this.getAdminToken();
    if (!token) throw new Error("No admin token available");
    return api.admin.checkCredentials(token);
  },

  // Player API methods
  async joinLobby(lobbyCode: string, name: string, sessionId: string): Promise<Player> {
    return api.player.lobby.join(lobbyCode, name, sessionId);
  },

  async getCurrentLobby(): Promise<Lobby> {
    const token = this.getUserToken();
    if (!token) throw new Error("No user token available");
    return api.player.lobby.getCurrent(token);
  },

  async leaveLobby(sessionId: string): Promise<{ status: string; message: string }> {
    // Use session ID as bearer token
    return api.player.lobby.leave(sessionId);
  },
};
