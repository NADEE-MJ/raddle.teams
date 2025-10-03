use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use crate::database::{LobbyModel, PlayerModel, TeamModel};

// ============================================================================
// Request Models
// ============================================================================

#[derive(Debug, Deserialize, Serialize)]
pub struct PlayerCreate {
    pub name: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct LobbyCreate {
    pub name: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct TeamCreate {
    pub num_teams: i32,
}

// ============================================================================
// Response Models
// ============================================================================

#[derive(Debug, Serialize, Deserialize)]
pub struct LobbyInfo {
    pub lobby: LobbyModel,
    pub players: Vec<PlayerModel>,
    pub players_by_team: HashMap<i32, Vec<PlayerModel>>,
    pub teams: Vec<TeamModel>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MessageResponse {
    pub status: bool,
    pub message: String,
}

impl MessageResponse {
    pub fn success(message: impl Into<String>) -> Self {
        Self {
            status: true,
            message: message.into(),
        }
    }

    pub fn error(message: impl Into<String>) -> Self {
        Self {
            status: false,
            message: message.into(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ApiRootResponse {
    pub message: String,
    pub timestamp: String,
    pub documentation_endpoints: HashMap<String, String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AdminAuthenticatedResponse {
    pub session_id: String,
}

// ============================================================================
// Error Response
// ============================================================================

#[derive(Debug, Serialize, Deserialize)]
pub struct ErrorResponse {
    pub detail: String,
}

impl ErrorResponse {
    pub fn new(detail: impl Into<String>) -> Self {
        Self {
            detail: detail.into(),
        }
    }
}
