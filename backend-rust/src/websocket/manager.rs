use axum::extract::ws::{Message, WebSocket};
use futures::{stream::SplitSink, SinkExt};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

use super::events::{AdminMessage, DisconnectedLobbyEvent, JoinedLobbyEvent, PlayerKickedEvent};

// ============================================================================
// Admin WebSocket Manager
// ============================================================================

#[derive(Debug)]
pub struct AdminConnection {
    pub sender: Arc<RwLock<SplitSink<WebSocket, Message>>>,
    pub subscribed_lobbies: Vec<i32>,
}

#[derive(Clone)]
pub struct AdminWebSocketManager {
    connections: Arc<RwLock<HashMap<String, Arc<RwLock<AdminConnection>>>>>,
}

impl AdminWebSocketManager {
    pub fn new() -> Self {
        Self {
            connections: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn connect(
        &self,
        web_session_id: String,
        sender: SplitSink<WebSocket, Message>,
    ) {
        let connection = Arc::new(RwLock::new(AdminConnection {
            sender: Arc::new(RwLock::new(sender)),
            subscribed_lobbies: Vec::new(),
        }));

        self.connections
            .write()
            .await
            .insert(web_session_id.clone(), connection);

        let count = self.connections.read().await.len();
        tracing::info!(
            "Admin connected: web_session_id={}, total_admins={}",
            web_session_id,
            count
        );
    }

    pub async fn disconnect(&self, web_session_id: &str) {
        self.connections.write().await.remove(web_session_id);
        let count = self.connections.read().await.len();
        tracing::info!(
            "Admin disconnected: web_session_id={}, remaining_admins={}",
            web_session_id,
            count
        );
    }

    pub async fn subscribe_to_lobby(&self, web_session_id: &str, lobby_id: i32) {
        let connections = self.connections.read().await;
        if let Some(conn) = connections.get(web_session_id) {
            let mut conn = conn.write().await;
            if !conn.subscribed_lobbies.contains(&lobby_id) {
                conn.subscribed_lobbies.push(lobby_id);
                tracing::info!(
                    "Admin web_session_id={} subscribed to lobby_id={}",
                    web_session_id,
                    lobby_id
                );
            }
        }
    }

    pub async fn unsubscribe_from_lobby(&self, web_session_id: &str, lobby_id: i32) {
        let connections = self.connections.read().await;
        if let Some(conn) = connections.get(web_session_id) {
            let mut conn = conn.write().await;
            conn.subscribed_lobbies.retain(|&id| id != lobby_id);
            tracing::info!(
                "Admin web_session_id={} unsubscribed from lobby_id={}",
                web_session_id,
                lobby_id
            );
        }
    }

    pub async fn broadcast_to_lobby<T: serde::Serialize>(
        &self,
        lobby_id: i32,
        event: &T,
    ) {
        let json = match serde_json::to_string(event) {
            Ok(j) => j,
            Err(e) => {
                tracing::error!("Failed to serialize event: {}", e);
                return;
            }
        };

        let connections = self.connections.read().await;
        let mut recipients = Vec::new();

        // Find all admins subscribed to this lobby
        for (session_id, conn) in connections.iter() {
            let conn_guard = conn.read().await;
            if conn_guard.subscribed_lobbies.contains(&lobby_id) {
                recipients.push((session_id.clone(), conn.clone()));
            }
        }

        drop(connections);

        tracing::debug!(
            "Broadcasting to {} admin(s) for lobby_id={}",
            recipients.len(),
            lobby_id
        );

        // Send to all recipients
        for (session_id, conn) in recipients {
            let conn_guard = conn.write().await;
            let mut sender = conn_guard.sender.write().await;

            if let Err(e) = sender.send(Message::Text(json.clone())).await {
                tracing::error!(
                    "Failed to send to admin web_session_id={}: {}",
                    session_id,
                    e
                );
            }
        }
    }

    pub async fn handle_message(&self, web_session_id: &str, message: AdminMessage) {
        match message {
            AdminMessage::SubscribeLobby { lobby_id } => {
                self.subscribe_to_lobby(web_session_id, lobby_id).await;
            }
            AdminMessage::UnsubscribeLobby { lobby_id } => {
                self.unsubscribe_from_lobby(web_session_id, lobby_id).await;
            }
        }
    }
}

// ============================================================================
// Lobby WebSocket Manager
// ============================================================================

#[derive(Clone)]
pub struct LobbyWebSocketManager {
    // lobby_id -> (player_session_id -> WebSocket sender)
    connections: Arc<RwLock<HashMap<i32, HashMap<String, Arc<RwLock<SplitSink<WebSocket, Message>>>>>>>,
    admin_manager: AdminWebSocketManager,
}

impl LobbyWebSocketManager {
    pub fn new(admin_manager: AdminWebSocketManager) -> Self {
        Self {
            connections: Arc::new(RwLock::new(HashMap::new())),
            admin_manager,
        }
    }

    pub async fn connect(
        &self,
        lobby_id: i32,
        player_session_id: String,
        sender: SplitSink<WebSocket, Message>,
    ) {
        let sender = Arc::new(RwLock::new(sender));

        let mut connections = self.connections.write().await;
        connections
            .entry(lobby_id)
            .or_insert_with(HashMap::new)
            .insert(player_session_id.clone(), sender);

        let lobby_size = connections.get(&lobby_id).map(|l| l.len()).unwrap_or(0);

        tracing::info!(
            "Player connected: lobby_id={}, player_session_id={}, lobby_size={}",
            lobby_id,
            player_session_id,
            lobby_size
        );
    }

    pub async fn disconnect(&self, lobby_id: i32, player_session_id: &str) {
        let mut connections = self.connections.write().await;

        if let Some(lobby) = connections.get_mut(&lobby_id) {
            lobby.remove(player_session_id);
            let lobby_size = lobby.len();

            tracing::info!(
                "Player disconnected: lobby_id={}, player_session_id={}, remaining={}",
                lobby_id,
                player_session_id,
                lobby_size
            );

            // Clean up empty lobbies
            if lobby.is_empty() {
                connections.remove(&lobby_id);
            }
        }
    }

    pub async fn send_to_player<T: serde::Serialize>(
        &self,
        lobby_id: i32,
        player_session_id: &str,
        event: &T,
    ) {
        let json = match serde_json::to_string(event) {
            Ok(j) => j,
            Err(e) => {
                tracing::error!("Failed to serialize event: {}", e);
                return;
            }
        };

        let connections = self.connections.read().await;
        if let Some(lobby) = connections.get(&lobby_id) {
            if let Some(sender) = lobby.get(player_session_id) {
                let mut sender = sender.write().await;
                if let Err(e) = sender.send(Message::Text(json)).await {
                    tracing::error!(
                        "Failed to send to player_session_id={}: {}",
                        player_session_id,
                        e
                    );
                }
            }
        }
    }

    pub async fn broadcast_to_lobby<T: serde::Serialize>(
        &self,
        lobby_id: i32,
        event: &T,
    ) {
        let json = match serde_json::to_string(event) {
            Ok(j) => j,
            Err(e) => {
                tracing::error!("Failed to serialize event: {}", e);
                return;
            }
        };

        let connections = self.connections.read().await;

        if let Some(lobby) = connections.get(&lobby_id) {
            tracing::debug!(
                "Broadcasting to {} player(s) in lobby_id={}",
                lobby.len(),
                lobby_id
            );

            for (session_id, sender) in lobby.iter() {
                let mut sender = sender.write().await;
                if let Err(e) = sender.send(Message::Text(json.clone())).await {
                    tracing::error!(
                        "Failed to send to player_session_id={}: {}",
                        session_id,
                        e
                    );
                }
            }
        }

        // Also broadcast to admins
        self.admin_manager.broadcast_to_lobby(lobby_id, event).await;
    }

    pub async fn kick_player(&self, lobby_id: i32, player_session_id: &str) {
        tracing::info!(
            "Kicking player: lobby_id={}, player_session_id={}",
            lobby_id,
            player_session_id
        );

        let kick_event = PlayerKickedEvent::new(lobby_id, player_session_id.to_string());

        // Send kick event to the player
        self.send_to_player(lobby_id, player_session_id, &kick_event)
            .await;

        // Close the connection
        let mut connections = self.connections.write().await;
        if let Some(lobby) = connections.get_mut(&lobby_id) {
            if let Some(sender) = lobby.remove(player_session_id) {
                let mut sender = sender.write().await;
                let _ = sender.close().await; // Ignore errors on close
                tracing::info!(
                    "Player {} removed from lobby {} after kick",
                    player_session_id,
                    lobby_id
                );
            }
        }

        // Broadcast kick notification to others
        self.broadcast_to_lobby(lobby_id, &kick_event).await;
    }
}
