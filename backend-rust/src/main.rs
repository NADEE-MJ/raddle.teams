use axum::{
    extract::Request,
    http::{StatusCode, Uri},
    response::IntoResponse,
    routing::get,
    Router,
};
use std::{path::PathBuf, sync::Arc};
use tower::{ServiceBuilder, ServiceExt};
use tower_http::{
    cors::CorsLayer,
    services::{ServeDir, ServeFile},
    trace::TraceLayer,
};

// Use library modules
use raddle_teams_rust::{
    config::Config,
    database,
    routes,
    schemas,
    websocket::{admin_websocket_handler, lobby_websocket_handler, AdminWebSocketManager, LobbyWebSocketManager},
    AppState,
    logging,
};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Load configuration
    let config = Config::from_env()?;
    let config = Arc::new(config);

    // Initialize logging
    logging::init_logging(&config.log_level, config.testing)?;

    tracing::info!("Starting Raddle Teams Rust Server");
    tracing::info!("Environment: {}", if config.testing { "testing" } else { "production" });
    tracing::info!("Database URL: {}", config.database_url);

    // Create database connection pool
    let db = database::create_connection_pool(&config.database_url).await?;

    // Create/verify database tables
    database::create_tables(&db).await?;

    // Initialize WebSocket managers
    let admin_ws_manager = AdminWebSocketManager::new();
    let lobby_ws_manager = LobbyWebSocketManager::new(admin_ws_manager.clone());

    // Create application state
    let app_state = AppState {
        db,
        config: config.clone(),
        admin_ws_manager: admin_ws_manager.clone(),
        lobby_ws_manager: lobby_ws_manager.clone(),
    };

    // Create API routes
    let api_routes = routes::create_routes(app_state.clone());

    // WebSocket routes - need to use app_state for extractors to work
    let ws_routes = Router::new()
        .route("/admin/:web_session_id", get(admin_websocket_handler))
        .route("/lobby/:lobby_id/player/:player_session_id", get(lobby_websocket_handler))
        .with_state(app_state.clone());

    // Testing-only route for database reset
    let mut app = Router::new()
        .nest("/api", api_routes)
        .nest("/ws", ws_routes);

    if config.testing {
        tracing::info!("Testing mode enabled - adding /api/reset-db endpoint");
        app = app.route(
            "/api/reset-db",
            axum::routing::delete({
                let state = app_state.clone();
                move || async move {
                    tracing::info!("Resetting database (TESTING mode)");
                    if let Err(e) = database::drop_all_tables(&state.db).await {
                        tracing::error!("Failed to drop tables: {}", e);
                        return (
                            StatusCode::INTERNAL_SERVER_ERROR,
                            axum::Json(schemas::MessageResponse::error("Failed to drop tables")),
                        );
                    }
                    if let Err(e) = database::create_tables(&state.db).await {
                        tracing::error!("Failed to create tables: {}", e);
                        return (
                            StatusCode::INTERNAL_SERVER_ERROR,
                            axum::Json(schemas::MessageResponse::error("Failed to create tables")),
                        );
                    }
                    tracing::info!("Database reset successful");
                    (
                        StatusCode::OK,
                        axum::Json(schemas::MessageResponse::success("Database reset successful")),
                    )
                }
            }),
        );
    }

    // Static file serving
    let static_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap()
        .join("static");

    if !static_path.exists() {
        tracing::error!("Static directory not found: {}", static_path.display());
        tracing::error!("Frontend not built. Run './rt build' first.");
        std::process::exit(1);
    }

    tracing::info!("Serving static files from: {}", static_path.display());

    // Mount static file services
    let assets_service = ServeDir::new(static_path.join("assets"));
    let img_service = ServeDir::new(static_path.join("img"));

    app = app
        .nest_service("/assets", assets_service)
        .nest_service("/img", img_service);

    // Catch-all route for SPA routing
    let index_path = static_path.join("index.html");
    app = app.fallback(move |uri: Uri, request: Request| async move {
        // If it's an API or WebSocket route, return 404
        let path = uri.path();
        if path.starts_with("/api/")
            || path.starts_with("/ws/")
            || path.starts_with("/docs")
            || path.starts_with("/redoc")
            || path.starts_with("/openapi.json")
        {
            tracing::warn!("API endpoint not found (catch-all): {}", path);
            return (
                StatusCode::NOT_FOUND,
                axum::Json(schemas::ErrorResponse::new("Endpoint not found")),
            )
                .into_response();
        }

        // For all other routes, serve the frontend index.html
        tracing::debug!("Serving index.html for SPA route: {}", path);
        match ServeFile::new(&index_path).oneshot(request).await {
            Ok(res) => res.into_response(),
            Err(err) => {
                tracing::error!("Error serving index.html: {}", err);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    axum::Json(schemas::ErrorResponse::new("Frontend not built")),
                )
                    .into_response()
            }
        }
    });

    // Add middleware
    app = app.layer(
        ServiceBuilder::new()
            .layer(TraceLayer::new_for_http())
            .layer(CorsLayer::permissive()),
    );

    // Bind and serve
    let addr = format!("{}:{}", config.host, config.port);
    let listener = tokio::net::TcpListener::bind(&addr).await?;

    tracing::info!("🚀 Server listening on http://{}", addr);
    tracing::info!("📡 WebSocket endpoints:");
    tracing::info!("   - Admin: ws://{}/ws/admin/{{session_id}}", addr);
    tracing::info!("   - Player: ws://{}/ws/lobby/{{lobby_id}}/player/{{session_id}}", addr);

    axum::serve(listener, app).await?;

    Ok(())
}
