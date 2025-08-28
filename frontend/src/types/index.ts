export interface Player {
  id: number;
  name: string;
  session_id: string;
  team_id?: number;
  connected: boolean;
  created_at: string;
}

export interface Team {
  id: number;
  name: string;
  game_id: number;
  current_word_index: number;
  completed_at?: string;
  created_at: string;
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

export interface TeamProgress {
  team_id: number;
  team_name: string;
  current_word: string;
  current_word_index: number;
  total_words: number;
  forward_clue?: string;
  backward_clue?: string;
  forward_next_length?: number;
  backward_next_length?: number;
  recent_guesses: Guess[];
  completed: boolean;
  completed_at?: string;
}

export interface WebSocketMessage {
  type: string;
  data?: Record<string, unknown>;
  player_session_id?: string;
  message?: Record<string, unknown>;
  team_id?: number;
  state?: string;
}
