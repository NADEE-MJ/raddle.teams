use axum::{
    async_trait,
    extract::{FromRef, FromRequestParts, Query},
    http::{request::Parts, StatusCode},
    response::{IntoResponse, Response},
    Json, RequestPartsExt,
};
use axum_extra::{
    headers::{authorization::Bearer, Authorization},
    TypedHeader,
};
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};
use serde::Deserialize;

use crate::{
    database::{Player, PlayerModel},
    schemas::ErrorResponse,
    AppState,
};

// ============================================================================
// Player Session Extractor (from Authorization header)
// ============================================================================

pub struct AuthenticatedPlayer(pub PlayerModel);

#[async_trait]
impl<S> FromRequestParts<S> for AuthenticatedPlayer
where
    AppState: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = Response;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let state = AppState::from_ref(state);

        // Extract Authorization header
        let TypedHeader(Authorization(bearer)) = parts
            .extract::<TypedHeader<Authorization<Bearer>>>()
            .await
            .map_err(|_| {
                (
                    StatusCode::UNAUTHORIZED,
                    Json(ErrorResponse::new("Missing authorization header")),
                )
                    .into_response()
            })?;

        let session_id = bearer.token();

        // Query database for player with this session_id
        let player = Player::find()
            .filter(crate::database::player::Column::SessionId.eq(session_id))
            .one(&state.db)
            .await
            .map_err(|e| {
                tracing::error!("Database error while fetching player: {}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ErrorResponse::new("Database error")),
                )
                    .into_response()
            })?;

        match player {
            Some(p) => {
                tracing::debug!("Player authenticated: session_id={}", session_id);
                Ok(AuthenticatedPlayer(p))
            }
            None => {
                tracing::warn!("Invalid session_id: {}", session_id);
                Err((
                    StatusCode::UNAUTHORIZED,
                    Json(ErrorResponse::new("Invalid session")),
                )
                    .into_response())
            }
        }
    }
}

// ============================================================================
// Admin Token Extractor (from query parameter)
// ============================================================================

#[derive(Deserialize)]
pub struct AdminTokenQuery {
    pub token: String,
}

pub struct AuthenticatedAdmin;

#[async_trait]
impl<S> FromRequestParts<S> for AuthenticatedAdmin
where
    AppState: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = Response;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let state = AppState::from_ref(state);

        // Extract token from query parameter
        let Query(query) = parts.extract::<Query<AdminTokenQuery>>().await.map_err(|_| {
            (
                StatusCode::UNAUTHORIZED,
                Json(ErrorResponse::new("Missing admin token")),
            )
                .into_response()
        })?;

        // Verify token matches admin password
        if query.token == state.config.admin_password {
            tracing::debug!("Admin authenticated successfully");
            Ok(AuthenticatedAdmin)
        } else {
            tracing::warn!("Invalid admin token provided");
            Err((
                StatusCode::UNAUTHORIZED,
                Json(ErrorResponse::new("Invalid admin token")),
            )
                .into_response())
        }
    }
}
