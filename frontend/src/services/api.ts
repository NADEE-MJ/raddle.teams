import { Player, Lobby, LobbyInfo } from "../types";

const API_BASE = "/api";

class ApiService {
  private getAuthHeaders(): HeadersInit {
    const adminToken = localStorage.getItem("adminToken");
    
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (adminToken) {
      headers["Authorization"] = `Bearer ${adminToken}`;
    }

    return headers;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit,
  ): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        ...this.getAuthHeaders(),
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Admin endpoints
  async createLobby(name: string): Promise<Lobby> {
    return this.request<Lobby>("/admin/lobby", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  }

  async getAllLobbies(): Promise<Lobby[]> {
    return this.request<Lobby[]>("/admin/lobby");
  }

  // Player endpoints
  async joinLobby(lobbyCode: string, name: string, sessionId: string): Promise<Player> {
    return this.request<Player>(`/lobby/${lobbyCode}/join`, {
      method: "POST",
      body: JSON.stringify({ name, session_id: sessionId }),
    });
  }

  async getActiveLobbyForPlayer(sessionId: string): Promise<Lobby> {
    return this.request<Lobby>(`/player/${sessionId}/lobby`);
  }

  async getLobbyInfo(lobbyId: number): Promise<LobbyInfo> {
    return this.request<LobbyInfo>(`/lobby/${lobbyId}`);
  }

  // Authentication helpers
  setAdminToken(token: string): void {
    localStorage.setItem("adminToken", token);
  }

  setUserToken(token: string): void {
    localStorage.setItem("userToken", token);
  }

  getAdminToken(): string | null {
    return localStorage.getItem("adminToken");
  }

  getUserToken(): string | null {
    return localStorage.getItem("userToken");
  }

  clearTokens(): void {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("userToken");
  }
}

export const apiService = new ApiService();
