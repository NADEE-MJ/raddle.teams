export interface Player {
  id: string;
  name: string;
  teamId?: string;
  connected: boolean;
  joinedAt: string;
}

export interface Team {
  id: string;
  name: string;
  players: string[];
  score: number;
  currentWordPosition: number;
  hintsUsed: number;
}

export interface Game {
  id: string;
  state: 'lobby' | 'team_assignment' | 'team_naming' | 'in_progress' | 'finished';
  numTeams: number;
  teams: Team[];
  currentPuzzle?: string;
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
}

export interface WebSocketMessage {
  type: string;
  data?: any;
  [key: string]: any;
}

export interface AdminStatus {
  game: Game | null;
  players: string[];
  teams: Team[];
}