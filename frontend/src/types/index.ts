// #########################################################################
// ? API RESPONSES
// #########################################################################

export interface Player {
    id: number;
    name: string;
    session_id: string;
    lobby_id: number;
    team_id?: number;
    is_ready: boolean;
    created_at: string;
}

export interface Team {
    id: number;
    name: string;
    game_id: number;
    lobby_id: number;
    current_word_index: number;
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
    force_start?: boolean;
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
    PLAYER_JOINED = 'player_joined',
    TEAM_ASSIGNED = 'team_assigned',
    TEAM_CHANGED = 'team_changed',
    DISCONNECTED = 'disconnected',
    PLAYER_KICKED = 'player_kicked',
    READY_STATUS_CHANGED = 'ready_status_changed',
    LOBBY_DELETED = 'lobby_deleted',
}

export interface WebSocketMessage {
    type: LobbyWebSocketEvents | GameWebSocketEvents | string;
    data?: Record<string, unknown>;
    player_session_id?: string;
    message?: Record<string, unknown>;
    team_id?: number;
    team_name?: string;
    lobby_id?: number;
    state?: string;
    revealed_steps?: number[];
    is_completed?: boolean;
    completed_at?: string;
    last_updated_at?: string;
    old_team_id?: number;
    new_team_id?: number;
    placement?: number;
    points_earned?: number;
    first_place_team_name?: string;
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
    TEAM_PLACED = 'team_placed',
    GAME_WON = 'game_won',
    STATE_UPDATE = 'state_update',
    ALREADY_SOLVED = 'already_solved',
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
    team_id: number;
    team_name: string;
    placement: number;
    points_earned: number;
    completed_at: string;
    first_place_team_name: string;
}

export type GameEvent =
    | GameStartedEvent
    | GuessSubmittedEvent
    | WordSolvedEvent
    | DirectionChangedEvent
    | StateUpdateEvent
    | TeamCompletedEvent
    | TeamPlacedEvent
    | GameWonEvent
    | AlreadySolvedEvent;

// #########################################################################
// ? ADMIN GAME STATE
// #########################################################################

export interface TeamGameProgress {
    team_id: number;
    team_name: string;
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
