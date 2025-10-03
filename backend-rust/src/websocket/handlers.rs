use axum::{
    extract::{
        ws::{Message, WebSocket},
        Path, State, WebSocketUpgrade,
    },
    response::Response,
};
use futures::{SinkExt, StreamExt};

use super::{events::AdminMessage, manager::{AdminWebSocketManager, LobbyWebSocketManager}};
use crate::{extractors::AuthenticatedAdmin, AppState};

// ============================================================================
// Admin WebSocket Handler
// ============================================================================

pub async fn admin_websocket_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
    Path(web_session_id): Path<String>,
    _admin: AuthenticatedAdmin,
) -> Response {
    tracing::info!(
        "Admin WebSocket connection initiated: web_session_id={}",
        web_session_id
    );

    let manager = state.admin_ws_manager.clone();
    ws.on_upgrade(move |socket| admin_websocket_connection(socket, manager, web_session_id))
}

async fn admin_websocket_connection(
    socket: WebSocket,
    manager: AdminWebSocketManager,
    web_session_id: String,
) {
    let (sender, mut receiver) = socket.split();

    // Register the connection
    manager.connect(web_session_id.clone(), sender).await;

    // Listen for messages
    while let Some(msg) = receiver.next().await {
        match msg {
            Ok(Message::Text(text)) => {
                tracing::debug!("Admin WS received: {}", text);

                match serde_json::from_str::<AdminMessage>(&text) {
                    Ok(admin_msg) => {
                        manager.handle_message(&web_session_id, admin_msg).await;
                    }
                    Err(e) => {
                        tracing::warn!("Failed to parse admin message: {}", e);
                    }
                }
            }
            Ok(Message::Close(_)) => {
                tracing::info!("Admin WebSocket closing: web_session_id={}", web_session_id);
                break;
            }
            Err(e) => {
                tracing::error!(
                    "Admin WebSocket error for web_session_id={}: {}",
                    web_session_id,
                    e
                );
                break;
            }
            _ => {}
        }
    }

    // Clean up connection
    manager.disconnect(&web_session_id).await;
}

// ============================================================================
// Player/Lobby WebSocket Handler
// ============================================================================

pub async fn lobby_websocket_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
    Path((lobby_id, player_session_id)): Path<(i32, String)>,
) -> Response {
    tracing::info!(
        "Player WebSocket connection initiated: lobby_id={}, player_session_id={}",
        lobby_id,
        player_session_id
    );

    let manager = state.lobby_ws_manager.clone();
    ws.on_upgrade(move |socket| {
        lobby_websocket_connection(socket, manager, lobby_id, player_session_id)
    })
}

async fn lobby_websocket_connection(
    socket: WebSocket,
    manager: LobbyWebSocketManager,
    lobby_id: i32,
    player_session_id: String,
) {
    let (sender, mut receiver) = socket.split();

    // Register the connection
    manager
        .connect(lobby_id, player_session_id.clone(), sender)
        .await;

    // Listen for messages (currently we don't process player messages, just keep connection alive)
    while let Some(msg) = receiver.next().await {
        match msg {
            Ok(Message::Text(text)) => {
                tracing::debug!(
                    "Player WS received from player_session_id={}: {}",
                    player_session_id,
                    text
                );
                // Handle player messages if needed in the future
            }
            Ok(Message::Close(_)) => {
                tracing::info!(
                    "Player WebSocket closing: lobby_id={}, player_session_id={}",
                    lobby_id,
                    player_session_id
                );
                break;
            }
            Err(e) => {
                tracing::error!(
                    "Player WebSocket error for lobby_id={}, player_session_id={}: {}",
                    lobby_id,
                    player_session_id,
                    e
                );
                break;
            }
            _ => {}
        }
    }

    // Clean up connection
    manager.disconnect(lobby_id, &player_session_id).await;
}
