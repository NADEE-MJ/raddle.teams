export interface Player {
  id: number;
  name: string;
  session_id: string;
  lobby_id: number;
  team_id?: number;
  created_at: string;
}

export interface Team {
  id: number;
  name: string;
  game_id: number;
  lobby_id: number;
  current_word_index: number;
  completed_at?: string;
  created_at: string;
}

export interface Lobby {
  id: number;
  code: string;
  name: string;
  created_at: string;
}

export interface LobbyInfo {
  lobby: Lobby;
  players: Player[];
  players_by_team: Record<number, Player[]> | null;
  teams: Team[] | null;
  game: null;
}

export interface Game {
  id: number;
  state: "lobby" | "team_setup" | "active" | "finished";
  puzzle_name: string;
  created_at: string;
  started_at?: string;
  finished_at?: string;
}

export interface Guess {
  id: number;
  team_id: number;
  player_id: number;
  word_index: number;
  direction: "forward" | "backward";
  guess: string;
  is_correct: boolean;
  submitted_at: string;
}

export interface WebSocketMessage {
  type: string;
  data?: Record<string, unknown>;
  player_session_id?: string;
  message?: Record<string, unknown>;
  team_id?: number;
  lobby_id?: number;
  state?: string;
}

export interface ApiResponse {
  status: boolean;
  message: string;
}
