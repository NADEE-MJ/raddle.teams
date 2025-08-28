import { Player, Team, Game, Guess, TeamProgress } from "../types";

const API_BASE = "/api";

class ApiService {
  private async request<T>(
    endpoint: string,
    options?: RequestInit,
  ): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Player endpoints
  async createPlayer(name: string, sessionId: string): Promise<Player> {
    return this.request<Player>("/players", {
      method: "POST",
      body: JSON.stringify({ name, session_id: sessionId }),
    });
  }

  async getPlayers(): Promise<Player[]> {
    return this.request<Player[]>("/players");
  }

  // Game endpoints
  async createGame(): Promise<Game> {
    return this.request<Game>("/games", {
      method: "POST",
    });
  }

  async getCurrentGame(): Promise<Game> {
    return this.request<Game>("/games/current");
  }

  async startGame(gameId: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/games/${gameId}/start`, {
      method: "POST",
    });
  }

  // Team endpoints
  async createTeam(name: string): Promise<Team> {
    return this.request<Team>("/teams", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  }

  async getTeams(): Promise<Team[]> {
    return this.request<Team[]>("/teams");
  }

  async joinTeam(
    teamId: number,
    playerSessionId: string,
  ): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/teams/${teamId}/join`, {
      method: "POST",
      body: JSON.stringify({ player_session_id: playerSessionId }),
    });
  }

  async getTeamProgress(teamId: number): Promise<TeamProgress> {
    return this.request<TeamProgress>(`/teams/${teamId}/progress`);
  }

  // Guess endpoints
  async submitGuess(
    playerSessionId: string,
    guess: string,
    direction: "forward" | "backward",
  ): Promise<Guess> {
    return this.request<Guess>("/guess", {
      method: "POST",
      body: JSON.stringify({
        player_session_id: playerSessionId,
        guess,
        direction,
      }),
    });
  }

  // Health check
  async healthCheck(): Promise<{ status: string; message: string }> {
    return this.request<{ status: string; message: string }>("/health");
  }
}

export const apiService = new ApiService();
