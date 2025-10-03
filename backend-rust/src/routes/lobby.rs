use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use chrono::Utc;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, EntityTrait, LoaderTrait, QueryFilter, QuerySelect, Set,
};
use std::collections::HashMap;
use uuid::Uuid;

use crate::{
    database::{Lobby, LobbyModel, Player, PlayerActiveModel, PlayerModel, Team, TeamModel},
    extractors::AuthenticatedPlayer,
    schemas::{ErrorResponse, LobbyInfo, MessageResponse, PlayerCreate},
    websocket::{DisconnectedLobbyEvent, JoinedLobbyEvent, LobbyWebSocketManager},
    AppState,
};

/// POST /api/lobby/{lobby_code}
/// Join a lobby with a player name
pub async fn join_lobby(
    State(state): State<AppState>,
    Path(lobby_code): Path<String>,
    Json(player_data): Json<PlayerCreate>,
) -> Result<Json<PlayerModel>, (StatusCode, Json<ErrorResponse>)> {
    tracing::info!(
        "Player attempting to join lobby: code={}, name={}",
        lobby_code,
        player_data.name
    );

    // Find lobby by code
    let lobby = Lobby::find()
        .filter(crate::database::models::Column::Code.eq(&lobby_code))
        .one(&state.db)
        .await
        .map_err(|e| {
            tracing::error!("Database error finding lobby: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse::new("Database error")),
            )
        })?;

    let lobby = lobby.ok_or_else(|| {
        tracing::warn!("Lobby not found: code={}", lobby_code);
        (
            StatusCode::NOT_FOUND,
            Json(ErrorResponse::new("Lobby not found")),
        )
    })?;

    // Check if player name is already taken in this lobby
    let existing_player = Player::find()
        .filter(crate::database::player::Column::LobbyId.eq(lobby.id))
        .filter(crate::database::player::Column::Name.eq(&player_data.name))
        .one(&state.db)
        .await
        .map_err(|e| {
            tracing::error!("Database error checking player name: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse::new("Database error")),
            )
        })?;

    if existing_player.is_some() {
        tracing::warn!(
            "Player name already taken: name={}, lobby_code={}",
            player_data.name,
            lobby_code
        );
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse::new("Player name already taken in this lobby")),
        ));
    }

    // Create new player
    let session_id = Uuid::new_v4().to_string();
    let player = PlayerActiveModel {
        name: Set(player_data.name.clone()),
        session_id: Set(session_id.clone()),
        lobby_id: Set(lobby.id),
        team_id: Set(None),
        created_at: Set(Utc::now()),
        ..Default::default()
    };

    let player = player.insert(&state.db).await.map_err(|e| {
        tracing::error!("Failed to create player: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse::new("Failed to create player")),
        )
    })?;

    tracing::info!(
        "Player created: session_id={}, lobby_id={}, name={}",
        player.session_id,
        lobby.id,
        player.name
    );

    // Broadcast join event
    let join_event = JoinedLobbyEvent::new(lobby.id, player.session_id.clone());
    state
        .lobby_ws_manager
        .broadcast_to_lobby(lobby.id, &join_event)
        .await;

    Ok(Json(player))
}

/// GET /api/lobby/active
/// Get the currently authenticated player
pub async fn get_active_user(
    AuthenticatedPlayer(player): AuthenticatedPlayer,
) -> Json<PlayerModel> {
    tracing::info!("Returning active user: session_id={}", player.session_id);
    Json(player)
}

/// GET /api/lobby
/// Get the current lobby for the authenticated player
pub async fn get_current_lobby(
    State(state): State<AppState>,
    AuthenticatedPlayer(player): AuthenticatedPlayer,
) -> Result<Json<LobbyModel>, (StatusCode, Json<ErrorResponse>)> {
    tracing::info!(
        "Player requesting current lobby: session_id={}",
        player.session_id
    );

    let lobby = Lobby::find_by_id(player.lobby_id)
        .one(&state.db)
        .await
        .map_err(|e| {
            tracing::error!("Database error finding lobby: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse::new("Database error")),
            )
        })?;

    let lobby = lobby.ok_or_else(|| {
        tracing::warn!(
            "Lobby not found for player: lobby_id={}",
            player.lobby_id
        );
        (
            StatusCode::NOT_FOUND,
            Json(ErrorResponse::new("Lobby not found")),
        )
    })?;

    tracing::info!(
        "Returning lobby id={} for player session_id={}",
        lobby.id,
        player.session_id
    );

    Ok(Json(lobby))
}

/// DELETE /api/lobby
/// Leave the current lobby
pub async fn leave_current_lobby(
    State(state): State<AppState>,
    AuthenticatedPlayer(player): AuthenticatedPlayer,
) -> Result<Json<MessageResponse>, (StatusCode, Json<ErrorResponse>)> {
    tracing::info!("Player leaving lobby: session_id={}", player.session_id);

    let lobby_id = player.lobby_id;
    let session_id = player.session_id.clone();

    // Delete the player
    Player::delete_by_id(player.id)
        .exec(&state.db)
        .await
        .map_err(|e| {
            tracing::error!("Failed to delete player: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse::new("Failed to remove player")),
            )
        })?;

    tracing::info!(
        "Player deleted: session_id={}, lobby_id={}",
        session_id,
        lobby_id
    );

    // Broadcast disconnect event
    let disconnect_event = DisconnectedLobbyEvent::new(lobby_id, session_id);
    state
        .lobby_ws_manager
        .broadcast_to_lobby(lobby_id, &disconnect_event)
        .await;

    Ok(Json(MessageResponse::success(
        "Player left lobby successfully",
    )))
}

/// GET /api/lobby/{lobby_id}
/// Get full lobby information including players and teams
pub async fn get_lobby_info(
    State(state): State<AppState>,
    Path(lobby_id): Path<i32>,
    AuthenticatedPlayer(_player): AuthenticatedPlayer,
) -> Result<Json<LobbyInfo>, (StatusCode, Json<ErrorResponse>)> {
    tracing::info!("Fetching lobby info: lobby_id={}", lobby_id);

    // Find lobby
    let lobby = Lobby::find_by_id(lobby_id)
        .one(&state.db)
        .await
        .map_err(|e| {
            tracing::error!("Database error finding lobby: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse::new("Database error")),
            )
        })?;

    let lobby = lobby.ok_or_else(|| {
        tracing::warn!("Lobby not found: lobby_id={}", lobby_id);
        (
            StatusCode::NOT_FOUND,
            Json(ErrorResponse::new("Lobby not found")),
        )
    })?;

    // Get all players in this lobby
    let players: Vec<PlayerModel> = Player::find()
        .filter(crate::database::player::Column::LobbyId.eq(lobby_id))
        .all(&state.db)
        .await
        .map_err(|e| {
            tracing::error!("Database error finding players: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse::new("Database error")),
            )
        })?;

    // Get all teams in this lobby
    let teams: Vec<TeamModel> = Team::find()
        .filter(crate::database::team::Column::LobbyId.eq(lobby_id))
        .all(&state.db)
        .await
        .map_err(|e| {
            tracing::error!("Database error finding teams: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse::new("Database error")),
            )
        })?;

    // Group players by team
    let mut players_by_team: HashMap<i32, Vec<PlayerModel>> = HashMap::new();
    for player in &players {
        if let Some(team_id) = player.team_id {
            players_by_team
                .entry(team_id)
                .or_insert_with(Vec::new)
                .push(player.clone());
        }
    }

    tracing::info!(
        "Returning lobby info: lobby_id={}, players={}, teams={}",
        lobby_id,
        players.len(),
        teams.len()
    );

    Ok(Json(LobbyInfo {
        lobby,
        players,
        players_by_team,
        teams,
    }))
}
