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

export interface AdminAuthAdminAuthenticatedResponse {
    session_id: string;
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

// export interface WebSocketMessage {
//     type: LobbyWebSocketEvents | string;
//     data?: Record<string, unknown>;
//     player_session_id?: string;
//     message?: Record<string, unknown>;
//     team_id?: number;
//     lobby_id?: number;
//     state?: string;
//     old_team_id?: number;
//     new_team_id?: number;
// }
