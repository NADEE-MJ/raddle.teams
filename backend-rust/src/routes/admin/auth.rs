use axum::Json;
use uuid::Uuid;

use crate::{extractors::AuthenticatedAdmin, schemas::AdminAuthenticatedResponse};

/// GET /api/admin/check
/// Check admin credentials and get session ID
pub async fn check_admin_credentials(
    _admin: AuthenticatedAdmin,
) -> Json<AdminAuthenticatedResponse> {
    tracing::info!("Admin credentials check endpoint called");

    Json(AdminAuthenticatedResponse {
        session_id: Uuid::new_v4().to_string(),
    })
}
