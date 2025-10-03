use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use chrono::Utc;
use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter, Set};
use std::collections::HashMap;
use uuid::Uuid;

use crate::{
    database::{
        Lobby, LobbyActiveModel, LobbyModel, Player, PlayerModel, Team, TeamModel,
    },
    extractors::AuthenticatedAdmin,
    schemas::{ErrorResponse, LobbyCreate, LobbyInfo, MessageResponse},
    AppState,
};

/// POST /api/admin/lobby
/// Create a new lobby
pub async fn create_lobby(
    State(state): State<AppState>,
    _admin: AuthenticatedAdmin,
    Json(lobby_data): Json<LobbyCreate>,
) -> Result<Json<LobbyModel>, (StatusCode, Json<ErrorResponse>)> {
    tracing::info!("Admin creating lobby: name={}", lobby_data.name);

    // Generate 6-character uppercase code
    let code = Uuid::new_v4()
        .to_string()
        .chars()
        .filter(|c| c.is_alphanumeric())
        .take(6)
        .collect::<String>()
        .to_uppercase();

    let lobby = LobbyActiveModel {
        name: Set(lobby_data.name.clone()),
        code: Set(code.clone()),
        created_at: Set(Utc::now()),
        ..Default::default()
    };

    let lobby = lobby.insert(&state.db).await.map_err(|e| {
        tracing::error!("Failed to create lobby: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse::new("Failed to create lobby")),
        )
    })?;

    tracing::info!(
        "Created lobby: id={}, code={}, name={}",
        lobby.id,
        lobby.code,
        lobby.name
    );

    Ok(Json(lobby))
}

/// GET /api/admin/lobby
/// Get all lobbies
pub async fn get_all_lobbies(
    State(state): State<AppState>,
    _admin: AuthenticatedAdmin,
) -> Result<Json<Vec<LobbyModel>>, (StatusCode, Json<ErrorResponse>)> {
    tracing::info!("Admin requesting all lobbies");

    let lobbies = Lobby::find().all(&state.db).await.map_err(|e| {
        tracing::error!("Database error fetching lobbies: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse::new("Database error")),
        )
    })?;

    tracing::info!("Returning {} lobbies", lobbies.len());

    Ok(Json(lobbies))
}

/// GET /api/admin/lobby/{lobby_id}
/// Get detailed lobby information
pub async fn get_lobby_info(
    State(state): State<AppState>,
    Path(lobby_id): Path<i32>,
    _admin: AuthenticatedAdmin,
) -> Result<Json<LobbyInfo>, (StatusCode, Json<ErrorResponse>)> {
    tracing::info!("Admin requesting lobby info: lobby_id={}", lobby_id);

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

    // Get all players
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

    // Get all teams
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
        "Admin returning lobby info: lobby_id={}, teams={}, players={}",
        lobby_id,
        teams.len(),
        players.len()
    );

    Ok(Json(LobbyInfo {
        lobby,
        players,
        players_by_team,
        teams,
    }))
}

/// DELETE /api/admin/lobby/player/{player_id}
/// Kick a player from their lobby
pub async fn kick_player(
    State(state): State<AppState>,
    Path(player_id): Path<i32>,
    _admin: AuthenticatedAdmin,
) -> Result<Json<MessageResponse>, (StatusCode, Json<ErrorResponse>)> {
    tracing::info!("Admin kicking player: player_id={}", player_id);

    // Find player
    let player = Player::find_by_id(player_id)
        .one(&state.db)
        .await
        .map_err(|e| {
            tracing::error!("Database error finding player: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse::new("Database error")),
            )
        })?;

    let player = player.ok_or_else(|| {
        tracing::warn!("Player not found: player_id={}", player_id);
        (
            StatusCode::NOT_FOUND,
            Json(ErrorResponse::new("Player not found")),
        )
    })?;

    let player_name = player.name.clone();
    let lobby_id = player.lobby_id;
    let player_session_id = player.session_id.clone();

    // Kick via WebSocket manager
    state
        .lobby_ws_manager
        .kick_player(lobby_id, &player_session_id)
        .await;

    // Delete player from database
    Player::delete_by_id(player_id)
        .exec(&state.db)
        .await
        .map_err(|e| {
            tracing::error!("Failed to delete player: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse::new("Failed to delete player")),
            )
        })?;

    tracing::info!(
        "Successfully kicked player: name={}, id={}, lobby_id={}",
        player_name,
        player_id,
        lobby_id
    );

    Ok(Json(MessageResponse::success(format!(
        "Player '{}' has been kicked from the lobby",
        player_name
    ))))
}

/// DELETE /api/admin/lobby/{lobby_id}
/// Delete a lobby (cascades to players and teams)
pub async fn delete_lobby(
    State(state): State<AppState>,
    Path(lobby_id): Path<i32>,
    _admin: AuthenticatedAdmin,
) -> Result<Json<MessageResponse>, (StatusCode, Json<ErrorResponse>)> {
    tracing::info!("Admin deleting lobby: lobby_id={}", lobby_id);

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

    let lobby_name = lobby.name.clone();

    // Delete lobby (cascades to players and teams)
    Lobby::delete_by_id(lobby_id)
        .exec(&state.db)
        .await
        .map_err(|e| {
            tracing::error!("Failed to delete lobby: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse::new("Failed to delete lobby")),
            )
        })?;

    tracing::info!(
        "Successfully deleted lobby: id={}, name={}",
        lobby_id,
        lobby_name
    );

    Ok(Json(MessageResponse::success(format!(
        "Lobby '{}' deleted successfully",
        lobby_name
    ))))
}
