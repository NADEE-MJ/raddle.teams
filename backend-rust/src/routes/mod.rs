pub mod admin;
pub mod lobby;

use axum::{routing::{delete, get, post, put}, Router};
use std::collections::HashMap;

use crate::AppState;

/// Create and configure all API routes
pub fn create_routes(state: AppState) -> Router {
    // API root route
    let api_root = Router::new().route(
        "/",
        get(|| async {
            use chrono::Utc;
            use axum::Json;
            use crate::schemas::ApiRootResponse;

            let mut endpoints = HashMap::new();
            endpoints.insert("OpenAPI".to_string(), "/docs".to_string());
            endpoints.insert("ReDoc".to_string(), "/redoc".to_string());

            Json(ApiRootResponse {
                message: "Welcome to the Raddle Teams API".to_string(),
                timestamp: Utc::now().to_rfc3339(),
                documentation_endpoints: endpoints,
            })
        }),
    );

    // Lobby routes
    let lobby_routes = Router::new()
        .route("/lobby/join/:lobby_code", post(lobby::join_lobby))
        .route("/lobby/active", get(lobby::get_active_user))
        .route("/lobby", get(lobby::get_current_lobby))
        .route("/lobby", delete(lobby::leave_current_lobby))
        .route("/lobby/info/:lobby_id", get(lobby::get_lobby_info));

    // Admin routes
    let admin_routes = Router::new()
        .route("/admin/check", get(admin::auth::check_admin_credentials))
        .route("/admin/lobby", post(admin::lobby::create_lobby))
        .route("/admin/lobby", get(admin::lobby::get_all_lobbies))
        .route("/admin/lobby/:lobby_id", get(admin::lobby::get_lobby_info))
        .route("/admin/lobby/:lobby_id", delete(admin::lobby::delete_lobby))
        .route("/admin/lobby/player/:player_id", delete(admin::lobby::kick_player))
        .route(
            "/admin/lobby/team/:team_id/player/:player_id",
            put(admin::team::move_player_to_team),
        )
        .route("/admin/lobby/:lobby_id/team", post(admin::team::create_teams));

    // Combine all routes
    Router::new()
        .merge(api_root)
        .merge(lobby_routes)
        .merge(admin_routes)
        .with_state(state)
}
