// Library exports for testing and reusability

pub mod config;
pub mod database;
pub mod extractors;
pub mod logging;
pub mod routes;
pub mod schemas;
pub mod websocket;

// Re-export AppState for convenience
use std::sync::Arc;

#[derive(Clone)]
pub struct AppState {
    pub db: database::DatabaseConnection,
    pub config: Arc<config::Config>,
    pub admin_ws_manager: websocket::AdminWebSocketManager,
    pub lobby_ws_manager: websocket::LobbyWebSocketManager,
}

impl axum::extract::FromRef<AppState> for database::DatabaseConnection {
    fn from_ref(state: &AppState) -> Self {
        state.db.clone()
    }
}

impl axum::extract::FromRef<AppState> for Arc<config::Config> {
    fn from_ref(state: &AppState) -> Self {
        state.config.clone()
    }
}
