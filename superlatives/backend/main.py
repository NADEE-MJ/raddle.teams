from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from backend.api.admin.auth import router as admin_auth_router
from backend.api.admin.room import router as admin_room_router
from backend.api.game import router as game_router
from backend.api.host import router as host_router
from backend.api.room import router as room_router
from backend.custom_logging import api_logger, server_logger
from backend.database import create_db_and_tables, drop_all_tables
from backend.game.game_manager import game_manager
from backend.schemas import ApiRootResponse, MessageResponse
from backend.settings import settings
from backend.websocket.api import router as websocket_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle app startup and shutdown."""
    # Startup
    server_logger.info("Starting game manager...")
    await game_manager.start()
    yield
    # Shutdown
    server_logger.info("Stopping game manager...")
    await game_manager.stop()


app = FastAPI(
    title="Superlatives Game",
    description="A Jackbox-style multiplayer superlatives party game",
    version="1.0.0",
    lifespan=lifespan,
)

if settings.TESTING:

    @app.delete("/api/reset-db", response_model=MessageResponse)
    async def reset_db():
        api_logger.info("Resetting database (TESTING mode)")
        drop_all_tables()
        create_db_and_tables()
        api_logger.info("Database reset successful")
        return MessageResponse(status=True, message="Database reset successful")


try:
    create_db_and_tables()
    server_logger.info("Database and tables created/verified successfully")
except Exception as exc:
    server_logger.exception("Failed to create/verify database tables: %s", exc)
    raise


# Define specific API routes BEFORE the catch-all route
@app.get("/api", tags=["Root"], response_model=ApiRootResponse)
async def api_root():
    api_logger.info("API root accessed")
    return ApiRootResponse(
        message="Welcome to the Superlatives Game API",
        timestamp=datetime.now().isoformat(),
        documentation_endpoints={"OpenAPI": "/docs", "ReDoc": "/redoc"},
    )


server_logger.info("Included room api routes")
app.include_router(room_router)

server_logger.info("Included game api routes")
app.include_router(game_router)

server_logger.info("Included host api routes")
app.include_router(host_router)

server_logger.info("Included admin api routes")
app.include_router(admin_auth_router)
app.include_router(admin_room_router)

server_logger.info("Included websocket routes")
app.include_router(websocket_router)

current_dir = Path(__file__).parent
static_path = current_dir.parent / "static"

if static_path.exists():
    app.mount(
        "/assets",
        StaticFiles(directory=str(static_path / "assets")),
        name="assets",
    )
    server_logger.info("Static files mounted from: %s", static_path)
else:
    server_logger.warning("Static directory not found. Looked for: %s", static_path)
    server_logger.warning("Frontend not built. Run './ss build' first.")


@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    api_logger.debug("Catch-all route accessed with path: %s", full_path)

    # If it's an API or WebSocket route, return 404
    if full_path.startswith(("api/", "ws/", "docs", "redoc", "openapi.json")):
        api_logger.warning("API endpoint not found (catch-all): %s", full_path)
        raise HTTPException(status_code=404, detail="Endpoint not found")

    # For all other routes, serve the frontend index.html to support SPA routing
    index_file = static_path / "index.html"
    if index_file.exists():
        api_logger.debug("Serving index.html for SPA route: %s", full_path)
        return FileResponse(str(index_file))
    api_logger.error("index.html not found at: %s", index_file)
    raise HTTPException(status_code=500, detail="Frontend not built. Run './ss build' first.")
