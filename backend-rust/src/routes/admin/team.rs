use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use chrono::Utc;
use rand::seq::SliceRandom;
use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter, Set};

use crate::{
    database::{Lobby, Player, PlayerActiveModel, PlayerModel, Team, TeamActiveModel, TeamModel},
    extractors::AuthenticatedAdmin,
    schemas::{ErrorResponse, MessageResponse, TeamCreate},
    websocket::{TeamAssignedEvent, TeamChangedEvent},
    AppState,
};

/// PUT /api/admin/lobby/team/{team_id}/player/{player_id}
/// Move a player to a different team
pub async fn move_player_to_team(
    State(state): State<AppState>,
    Path((team_id, player_id)): Path<(i32, i32)>,
    _admin: AuthenticatedAdmin,
) -> Result<Json<MessageResponse>, (StatusCode, Json<ErrorResponse>)> {
    tracing::info!(
        "Admin moving player to team: player_id={}, team_id={}",
        player_id,
        team_id
    );

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

    let old_team_id = player.team_id.unwrap_or(0);

    // Handle team_id = 0 (unassign from team)
    let new_team_id = if team_id == 0 {
        None
    } else {
        // Verify team exists and is in same lobby
        let team = Team::find_by_id(team_id)
            .one(&state.db)
            .await
            .map_err(|e| {
                tracing::error!("Database error finding team: {}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ErrorResponse::new("Database error")),
                )
            })?;

        let team = team.ok_or_else(|| {
            tracing::warn!("Team not found: team_id={}", team_id);
            (
                StatusCode::NOT_FOUND,
                Json(ErrorResponse::new("Team not found")),
            )
        })?;

        if team.lobby_id != player.lobby_id {
            tracing::warn!(
                "Team not in same lobby: team_lobby={}, player_lobby={}",
                team.lobby_id,
                player.lobby_id
            );
            return Err((
                StatusCode::BAD_REQUEST,
                Json(ErrorResponse::new(
                    "Team is not in the same lobby as player",
                )),
            ));
        }

        Some(team_id)
    };

    // Update player's team
    let mut player: PlayerActiveModel = player.into();
    player.team_id = Set(new_team_id);
    let player = player.update(&state.db).await.map_err(|e| {
        tracing::error!("Failed to update player team: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse::new("Failed to update player")),
        )
    })?;

    // Broadcast team change event
    let event = TeamChangedEvent::new(
        player.lobby_id,
        player.session_id.clone(),
        old_team_id,
        new_team_id.unwrap_or(0),
    );
    state
        .lobby_ws_manager
        .broadcast_to_lobby(player.lobby_id, &event)
        .await;

    tracing::info!(
        "Successfully moved player_id={} from team {} to team {}",
        player_id,
        old_team_id,
        new_team_id.unwrap_or(0)
    );

    Ok(Json(MessageResponse::success("Player moved successfully")))
}

/// POST /api/admin/lobby/{lobby_id}/team
/// Create teams for a lobby and randomly assign players
pub async fn create_teams(
    State(state): State<AppState>,
    Path(lobby_id): Path<i32>,
    _admin: AuthenticatedAdmin,
    Json(team_data): Json<TeamCreate>,
) -> Result<Json<MessageResponse>, (StatusCode, Json<ErrorResponse>)> {
    tracing::info!(
        "Admin creating teams: lobby_id={}, num_teams={}",
        lobby_id,
        team_data.num_teams
    );

    // Validate num_teams
    if team_data.num_teams < 2 || team_data.num_teams > 10 {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse::new("Number of teams must be between 2 and 10")),
        ));
    }

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

    lobby.ok_or_else(|| {
        tracing::warn!("Lobby not found: lobby_id={}", lobby_id);
        (
            StatusCode::NOT_FOUND,
            Json(ErrorResponse::new("Lobby not found")),
        )
    })?;

    // Check if teams already exist
    let existing_teams: Vec<TeamModel> = Team::find()
        .filter(crate::database::team::Column::LobbyId.eq(lobby_id))
        .all(&state.db)
        .await
        .map_err(|e| {
            tracing::error!("Database error checking teams: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse::new("Database error")),
            )
        })?;

    if !existing_teams.is_empty() {
        tracing::warn!("Teams already exist for lobby_id={}", lobby_id);
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse::new("Teams already exist for this lobby")),
        ));
    }

    // Get all players
    let mut players: Vec<PlayerModel> = Player::find()
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

    if players.is_empty() {
        tracing::warn!("No players in lobby_id={}", lobby_id);
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse::new("Cannot create teams with no players")),
        ));
    }

    // Create teams
    let mut teams = Vec::new();
    for i in 0..team_data.num_teams {
        let team = TeamActiveModel {
            name: Set(format!("Team {}", i + 1)),
            lobby_id: Set(lobby_id),
            current_word_index: Set(0),
            completed_at: Set(None),
            created_at: Set(Utc::now()),
            ..Default::default()
        };

        let team = team.insert(&state.db).await.map_err(|e| {
            tracing::error!("Failed to create team: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse::new("Failed to create team")),
            )
        })?;

        teams.push(team);
    }

    // Shuffle players and assign to teams
    {
        let mut rng = rand::thread_rng();
        players.shuffle(&mut rng);
    } // RNG is dropped here before any await points

    for (i, player) in players.iter().enumerate() {
        let team_index = i % team_data.num_teams as usize;
        let team_id = teams[team_index].id;

        let mut player_active: PlayerActiveModel = player.clone().into();
        player_active.team_id = Set(Some(team_id));

        player_active.update(&state.db).await.map_err(|e| {
            tracing::error!("Failed to assign player to team: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse::new("Failed to assign players")),
            )
        })?;
    }

    // Broadcast team assigned event for each player
    for player in &players {
        let event = TeamAssignedEvent::new(lobby_id, player.session_id.clone());
        state
            .lobby_ws_manager
            .broadcast_to_lobby(lobby_id, &event)
            .await;
    }

    tracing::info!(
        "Successfully created {} teams for lobby_id={} with {} players",
        team_data.num_teams,
        lobby_id,
        players.len()
    );

    Ok(Json(MessageResponse::success(format!(
        "Created {} teams with players randomly assigned",
        team_data.num_teams
    ))))
}
