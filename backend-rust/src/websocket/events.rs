use serde::{Deserialize, Serialize};

/// Base trait for all lobby events
pub trait LobbyEvent: Serialize {
    fn event_type(&self) -> &'static str;
}

// ============================================================================
// Player Events
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JoinedLobbyEvent {
    pub event_type: String,
    pub lobby_id: i32,
    pub player_session_id: String,
}

impl JoinedLobbyEvent {
    pub fn new(lobby_id: i32, player_session_id: String) -> Self {
        Self {
            event_type: "player_joined".to_string(),
            lobby_id,
            player_session_id,
        }
    }
}

impl LobbyEvent for JoinedLobbyEvent {
    fn event_type(&self) -> &'static str {
        "player_joined"
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DisconnectedLobbyEvent {
    pub event_type: String,
    pub lobby_id: i32,
    pub player_session_id: String,
}

impl DisconnectedLobbyEvent {
    pub fn new(lobby_id: i32, player_session_id: String) -> Self {
        Self {
            event_type: "player_disconnected".to_string(),
            lobby_id,
            player_session_id,
        }
    }
}

impl LobbyEvent for DisconnectedLobbyEvent {
    fn event_type(&self) -> &'static str {
        "player_disconnected"
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlayerKickedEvent {
    pub event_type: String,
    pub lobby_id: i32,
    pub player_session_id: String,
}

impl PlayerKickedEvent {
    pub fn new(lobby_id: i32, player_session_id: String) -> Self {
        Self {
            event_type: "player_kicked".to_string(),
            lobby_id,
            player_session_id,
        }
    }
}

impl LobbyEvent for PlayerKickedEvent {
    fn event_type(&self) -> &'static str {
        "player_kicked"
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TeamAssignedEvent {
    pub event_type: String,
    pub lobby_id: i32,
    pub player_session_id: String,
}

impl TeamAssignedEvent {
    pub fn new(lobby_id: i32, player_session_id: String) -> Self {
        Self {
            event_type: "team_assigned".to_string(),
            lobby_id,
            player_session_id,
        }
    }
}

impl LobbyEvent for TeamAssignedEvent {
    fn event_type(&self) -> &'static str {
        "team_assigned"
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TeamChangedEvent {
    pub event_type: String,
    pub lobby_id: i32,
    pub player_session_id: String,
    pub old_team_id: i32,
    pub new_team_id: i32,
}

impl TeamChangedEvent {
    pub fn new(lobby_id: i32, player_session_id: String, old_team_id: i32, new_team_id: i32) -> Self {
        Self {
            event_type: "team_changed".to_string(),
            lobby_id,
            player_session_id,
            old_team_id,
            new_team_id,
        }
    }
}

impl LobbyEvent for TeamChangedEvent {
    fn event_type(&self) -> &'static str {
        "team_changed"
    }
}

// ============================================================================
// Admin WebSocket Messages (Client -> Server)
// ============================================================================

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(tag = "action")]
pub enum AdminMessage {
    #[serde(rename = "subscribe_lobby")]
    SubscribeLobby { lobby_id: i32 },

    #[serde(rename = "unsubscribe_lobby")]
    UnsubscribeLobby { lobby_id: i32 },
}

// ============================================================================
// Generic Event Wrapper
// ============================================================================

/// A generic event that can be sent over WebSocket
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Event {
    pub event_type: String,
    pub data: serde_json::Value,
}

impl Event {
    pub fn new<T: Serialize>(event_type: impl Into<String>, data: &T) -> anyhow::Result<Self> {
        Ok(Self {
            event_type: event_type.into(),
            data: serde_json::to_value(data)?,
        })
    }
}
