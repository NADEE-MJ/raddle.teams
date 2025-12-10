// #########################################################################
// ? API RESPONSES
// #########################################################################

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

export interface ApiResponse {
    status: boolean;
    message: string;
}

export interface GeneratedNameResponse {
    name: string;
}

export interface AdminAuthAdminAuthenticatedResponse {
    session_id: string;
}

export interface StartGameRequest {
    difficulty: 'easy' | 'medium' | 'hard';
    puzzle_mode: 'same' | 'different';
    word_count_mode: 'exact' | 'balanced';
}

export interface StartGameResponse {
    success: boolean;
    game_id: number;
    message: string;
}

// #########################################################################
// ? WEBSOCKET EVENTS
// #########################################################################

export enum LobbyWebSocketEvents {
    CONNECTION_CONFIRMED = 'connection_confirmed',
    TEAM_ASSIGNED = 'team_assigned',
    TEAM_CHANGED = 'team_changed',
    DISCONNECTED = 'disconnected',
    PLAYER_KICKED = 'player_kicked',
}

export interface WebSocketMessage {
    type: LobbyWebSocketEvents | GameWebSocketEvents | string;
    data?: Record<string, unknown>;
    player_session_id?: string;
    message?: Record<string, unknown>;
    team_id?: number;
    lobby_id?: number;
    state?: string;
    revealed_steps?: number[];
    is_completed?: boolean;
    completed_at?: string;
    last_updated_at?: string;
    old_team_id?: number;
    new_team_id?: number;
}

export type ConnectionStatus =
    | 'connecting' // Initial connection attempt
    | 'connected' // Successfully connected
    | 'reconnecting' // Lost connection, attempting to reconnect
    | 'disconnected' // Manually disconnected
    | 'failed'; // Max retries reached or permanent failure

// #########################################################################
// ? GAME TYPES
// #########################################################################

export enum GameWebSocketEvents {
    GAME_STARTED = 'game_started',
    GUESS_SUBMITTED = 'guess_submitted',
    WORD_SOLVED = 'word_solved',
    DIRECTION_CHANGED = 'direction_changed',
    TEAM_COMPLETED = 'team_completed',
    GAME_WON = 'game_won',
    STATE_UPDATE = 'state_update',
    ALREADY_SOLVED = 'already_solved',
    TEAM_PLACED = 'team_placed',
    ROUND_ENDED = 'round_ended',
    NEW_ROUND_STARTED = 'new_round_started',
}

export type Direction = 'down' | 'up';

export type GamePhase = 'DOWNWARD' | 'UPWARD' | 'DIRECTION_LOCKED' | 'COMPLETED';

export interface GameState {
    phase: GamePhase;
    direction: Direction;
    revealed_steps: number[];
    current_question: number;
    current_answer: number;
    is_completed: boolean;
    last_updated_at: string;
}

export interface Guess {
    id: number;
    team_id: number;
    player_id: number;
    word_index: number;
    direction: Direction;
    guess: string;
    is_correct: boolean;
    created_at: string;
}

export interface GameStartedEvent {
    type: GameWebSocketEvents.GAME_STARTED;
    team_id: number;
    puzzle_title: string;
    puzzle_length: number;
}

export interface GuessSubmittedEvent {
    type: GameWebSocketEvents.GUESS_SUBMITTED;
    team_id: number;
    player_id: number;
    player_name: string;
    word_index: number;
    guess: string;
    is_correct: boolean;
    direction: Direction;
}

export interface WordSolvedEvent {
    type: GameWebSocketEvents.WORD_SOLVED;
    team_id: number;
    player_id: number;
    player_name: string;
    word_index: number;
    word: string;
    direction: Direction;
}

export interface DirectionChangedEvent {
    type: GameWebSocketEvents.DIRECTION_CHANGED;
    team_id: number;
    player_id: number;
    player_name: string;
    new_direction: Direction;
}

export interface StateUpdateEvent {
    type: GameWebSocketEvents.STATE_UPDATE;
    team_id: number;
    phase: GamePhase;
    direction: Direction;
    revealed_steps: number[];
    current_question: number;
    current_answer: number;
    is_completed: boolean;
    last_updated_at: string;
}

export interface TeamCompletedEvent {
    type: GameWebSocketEvents.TEAM_COMPLETED;
    team_id: number;
    team_name: string;
    completed_at: string;
}

export interface GameWonEvent {
    type: GameWebSocketEvents.GAME_WON;
    lobby_id: number;
    winning_team_id: number;
    winning_team_name: string;
}

export interface AlreadySolvedEvent {
    type: GameWebSocketEvents.ALREADY_SOLVED;
    team_id: number;
    word_index: number;
}

export interface TeamPlacedEvent {
    type: GameWebSocketEvents.TEAM_PLACED;
    lobby_id: number;
    team_id: number;
    team_name: string;
    placement: number;
    completed_at: string;
}

export interface RoundEndedEvent {
    type: GameWebSocketEvents.ROUND_ENDED;
    lobby_id: number;
    round_number: number;
    results: Array<{
        team_id: number;
        team_name: string;
        placement: number;
        points_earned: number;
    }>;
}

export interface NewRoundStartedEvent {
    type: GameWebSocketEvents.NEW_ROUND_STARTED;
    lobby_id: number;
    game_id: number;
    round_number: number;
}

export type GameEvent =
    | GameStartedEvent
    | GuessSubmittedEvent
    | WordSolvedEvent
    | DirectionChangedEvent
    | StateUpdateEvent
    | TeamCompletedEvent
    | GameWonEvent
    | AlreadySolvedEvent
    | TeamPlacedEvent
    | RoundEndedEvent
    | NewRoundStartedEvent;

// #########################################################################
// ? ADMIN GAME STATE
// #########################################################################

export interface TeamGameProgress {
    team_id: number;
    team_name: string;
    game_id: number;
    puzzle: {
        title: string;
        ladder: Array<{
            word: string;
            clue?: string;
            transform?: string;
        }>;
    };
    revealed_steps: number[];
    is_completed: boolean;
    completed_at: string | null;
}

export interface GameStateResponse {
    is_game_active: boolean;
    teams: TeamGameProgress[];
}

export interface RoundHistoryEntry {
    round_number: number;
    game_id: number;
    started_at: string | null;
    completed_at: string | null;
    winner_team_id: number | null;
    winner_team_name: string | null;
}

// #########################################################################
// ? TOURNAMENT TYPES
// #########################################################################

export interface PlayerAward {
    key: string;
    title: string;
    emoji: string;
    description: string;
}

export interface PlayerGameStats {
    player_id: number;
    player_name: string;
    correct_guesses: number;
    total_guesses: number;
    accuracy_rate: number;
    words_solved: number[];
    wrong_guesses: string[];
    awards: PlayerAward[];
}

export interface TeamGameStats {
    team_id: number;
    team_name: string;
    placement: number;
    points_earned: number;
    wrong_guesses: number;
    wrong_guess_rate: number;
    wrong_guess_label: string;
    completed_at: string | null;
    completion_percentage: number;
    time_to_complete: number | null;
    player_stats: PlayerGameStats[];
}

export interface GameStatsResponse {
    game_id: number;
    round_number: number;
    started_at: string;
    teams: TeamGameStats[];
    last_round_winner_id: number | null;
}

export interface PlacementBreakdown {
    first: number;
    second: number;
    third: number;
    dnf: number;
}

export interface TeamLeaderboardEntry {
    team_id: number;
    team_name: string;
    total_points: number;
    rounds_won: number;
    rounds_played: number;
    placement_breakdown: PlacementBreakdown;
    last_round_winner: boolean;
}

export interface LeaderboardResponse {
    teams: TeamLeaderboardEntry[];
    current_round: number;
    total_rounds: number;
    last_round_game_id: number | null;
}

export interface RoundResultEntry {
    id: number;
    lobby_id: number;
    game_id: number;
    team_id: number;
    round_number: number;
    placement: number;
    points_earned: number;
    completion_percentage: number;
    time_to_complete: number | null;
    completed_at: string | null;
    created_at: string;
}
