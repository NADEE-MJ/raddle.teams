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
    game: Game | null;
}

export interface Game {
    id: number;
    lobby_id: number;
    state: 'lobby' | 'team_setup' | 'active' | 'finished';
    puzzle_name: string;
    created_at: string;
    started_at?: string;
    finished_at?: string;
}

export interface Guess {
    id: number;
    team_id: number;
    player_id: number;
    player_name?: string;
    word_index: number;
    direction: 'forward' | 'backward';
    guess: string;
    is_correct: boolean;
    submitted_at: string;
}

export interface PuzzleWord {
    word_index: number;
    word: string;
    clue?: string;
    transform?: string;
}

export interface Puzzle {
    puzzle_name: string;
    words: PuzzleWord[];
    total_words: number;
}

export interface TutorialItem {
    word: string;
    clue?: string | null;
    transform?: string | null;
}

export interface TutorialResponse {
    title?: string;
    ladder?: TutorialItem[];
    words?: TutorialItem[];
}

export interface TeamProgress {
    team_id: number;
    team_name: string;
    current_word_index: number;
    completed_at?: string;
    is_completed: boolean;
    recent_guesses: Guess[];
}

export interface LeaderboardEntry {
    rank: number;
    team_id: number;
    team_name: string;
    current_word_index: number;
    completed_at?: string;
    player_count: number;
    is_completed: boolean;
}

export interface GuessSubmissionRequest {
    word_index: number;
    direction: 'forward' | 'backward';
    guess: string;
}

export interface GuessSubmissionResult {
    guess_id: number;
    is_correct: boolean;
    correct_word?: string;
    progress_updated: boolean;
    team_progress: {
        current_word_index: number;
        completed_at?: string;
        is_completed: boolean;
    };
    puzzle_length: number;
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

// Game WebSocket Events
export interface GameWebSocketEvent {
    game_id: number;
    lobby_id: number;
    type: string;
}

export interface GuessSubmittedEvent extends GameWebSocketEvent {
    type: 'guess_submitted';
    team_id: number;
    player_id: number;
    player_name: string;
    word_index: number;
    direction: string;
    guess: string;
    is_correct: boolean;
}

export interface WordSolvedEvent extends GameWebSocketEvent {
    type: 'word_solved';
    team_id: number;
    team_name: string;
    word_index: number;
    word: string;
    solved_by_player_id: number;
    solved_by_player_name: string;
}

export interface TeamProgressUpdateEvent extends GameWebSocketEvent {
    type: 'team_progress_update';
    team_id: number;
    team_name: string;
    current_word_index: number;
    completed_at?: string;
}

export interface TeamCompletedEvent extends GameWebSocketEvent {
    type: 'team_completed';
    team_id: number;
    team_name: string;
    completed_at: string;
    completion_rank: number;
}

export interface LeaderboardUpdateEvent extends GameWebSocketEvent {
    type: 'leaderboard_update';
    leaderboard: LeaderboardEntry[];
}

export interface GameCreatedEvent extends GameWebSocketEvent {
    type: 'game_created';
    puzzle_name: string;
    state: string;
}

export interface GameStartedEvent extends GameWebSocketEvent {
    type: 'game_started';
}

export interface GameFinishedEvent extends GameWebSocketEvent {
    type: 'game_finished';
    winning_team_id?: number;
    winning_team_name?: string;
}

export interface ApiResponse {
    status: boolean;
    message: string;
}
