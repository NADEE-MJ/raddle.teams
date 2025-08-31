from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from backend.api.admin.auth import router as admin_auth_router
from backend.api.admin.game import router as admin_game_router
from backend.api.admin.lobby import router as admin_lobby_router
from backend.api.admin.teams import router as admin_teams_router
from backend.api.game import router as game_router
from backend.api.lobby import router as lobby_router
from backend.custom_logging import api_logger, server_logger
from backend.database import create_db_and_tables, drop_all_tables
from backend.schemas import ApiRootResponse, MessageResponse
from backend.services.puzzle_service import puzzle_service
from backend.settings import settings
from backend.websocket.api import router as websocket_router
from backend.api.tutorial import router as tutorial_router

app = FastAPI(
    title="Raddle Teams",
    description="A team-based word chain puzzle game",
    version="1.0.0",
)

if settings.TESTING:

    @app.delete("/api/reset-db", response_model=MessageResponse)
    async def reset_db():
        api_logger.info("Resetting database (TESTING mode)")
        drop_all_tables()
        create_db_and_tables()
        puzzle_service.initialize_default_puzzles()
        api_logger.info("Database and puzzles reset successful")
        return MessageResponse(status=True, message="Database and puzzles reset successful")


try:
    create_db_and_tables()
    server_logger.info("Database and tables created/verified successfully")
    
    # Initialize puzzles
    puzzle_service.initialize_default_puzzles()
    server_logger.info("Puzzles loaded successfully")
except Exception as exc:
    server_logger.exception("Failed to initialize database and puzzles: %s", exc)
    raise


# Define specific API routes BEFORE the catch-all route
@app.get("/api", tags=["Root"], response_model=ApiRootResponse)
async def api_root():
    api_logger.info("API root accessed")
    return ApiRootResponse(
        message="Welcome to the Raddle Teams API",
        timestamp=datetime.now().isoformat(),
        documentation_endpoints={"OpenAPI": "/docs", "ReDoc": "/redoc"},
    )


app.include_router(lobby_router, prefix="/api")
server_logger.info("Included lobby router at /api")
app.include_router(game_router, prefix="/api")
server_logger.info("Included game router at /api")
app.include_router(admin_lobby_router, prefix="/api/admin")
server_logger.info("Included admin lobby router at /api/admin")
app.include_router(admin_game_router, prefix="/api/admin")
server_logger.info("Included admin game router at /api/admin")
app.include_router(admin_teams_router, prefix="/api/admin")
server_logger.info("Included admin teams router at /api/admin")
app.include_router(admin_auth_router, prefix="/api/admin")
server_logger.info("Included admin auth router at /api/admin")
app.include_router(websocket_router, prefix="/ws")
server_logger.info("Included websocket router at /ws")
app.include_router(tutorial_router, prefix="/api")
server_logger.info("Included tutorial router at /api")

current_dir = Path(__file__).parent
static_path = current_dir.parent / "static"

if static_path.exists():
    app.mount(
        "/assets",
        StaticFiles(directory=str(static_path / "assets"), html=True),
        name="assets",
    )
    server_logger.info("Static files mounted from: %s", static_path)
else:
    server_logger.error("Static directory not found. Looked for: %s", static_path)
    server_logger.error("Frontend not built. Run 'npm run build' first.")
    exit(1)


@app.get("/favicon.svg")
async def serve_favicon():
    favicon_path = static_path / "favicon.svg"
    if favicon_path.exists():
        api_logger.debug("Serving favicon: %s", favicon_path)
        return FileResponse(str(favicon_path))
    api_logger.debug("Favicon not found at: %s", favicon_path)
    return {"error": "Favicon not found"}


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
    raise HTTPException(status_code=500, detail="Frontend not built. Run 'npm run build' first.")
