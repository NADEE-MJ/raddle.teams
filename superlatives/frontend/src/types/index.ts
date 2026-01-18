// Game types
export interface Room {
    id: number;
    code: string;
    name: string;
    host_player_id: number | null;
    current_round: number;
    status: 'lobby' | 'question_submission' | 'voting' | 'results' | 'completed';
    created_at: string;
    current_question_id: number | null;
    voting_started_at: string | null;
    voting_duration_seconds: number;
}

export interface Player {
    id: number;
    name: string;
    session_id: string;
    room_id: number;
    is_host: boolean;
    created_at: string;
}

export interface PersonInPool {
    id: number;
    room_id: number;
    name: string;
    is_player: boolean;
    player_id: number | null;
    created_at: string;
}

export interface Question {
    id: number;
    room_id: number;
    player_id: number;
    round_number: number;
    question_text: string;
    created_at: string;
    voting_completed: boolean;
    results_shown: boolean;
}

export interface Vote {
    id: number;
    question_id: number;
    voter_id: number;
    voted_for_name: string;
    is_revote: boolean;
    timestamp: string;
}

export interface Score {
    id: number;
    player_id: number;
    room_id: number;
    total_score: number;
    round_1_score: number;
    round_2_score: number;
    round_3_score: number;
}

export interface VoteResults {
    question_id: number;
    question_text: string;
    votes_by_person: Record<string, number>;
    total_votes: number;
    winner: string | null;
    is_tie: boolean;
    tied_people: string[];
    fastest_voter: Player | null;
}

export type ClientType = 'display' | 'player' | 'host';

// WebSocket Events
export type RoomEventType =
    | 'connection_confirmed'
    | 'player_joined'
    | 'player_left'
    | 'player_kicked'
    | 'person_added_to_pool'
    | 'person_removed_from_pool'
    | 'room_state_updated'
    | 'game_started'
    | 'round_started'
    | 'round_ended'
    | 'game_completed'
    | 'room_deleted';

export type GameEventType =
    | 'question_submission_started'
    | 'question_submitted'
    | 'question_submission_complete'
    | 'voting_started'
    | 'vote_submitted'
    | 'voting_complete'
    | 'results_ready'
    | 'tie_detected'
    | 'revote_started'
    | 'points_awarded';

export interface BaseRoomEvent {
    room_id: number;
    type: RoomEventType;
}

export interface BaseGameEvent {
    room_id: number;
    type: GameEventType;
}

// API Response types
export interface RoomInfo {
    room: Room;
    players: Player[];
    people_pool: PersonInPool[];
    questions: Question[];
    scores: Score[];
}

export interface PlayerJoinResponse {
    session_id: string;
    player: Player;
    room: Room;
}
