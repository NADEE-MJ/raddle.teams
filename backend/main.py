import os
from datetime import datetime
from pathlib import Path

from custom_logging import api_logger, server_logger
from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from backend.api.admin.lobby import router as admin_lobby_router
from backend.api.lobby import router as lobby_router
from backend.database import create_db_and_tables, drop_all_tables
from backend.settings import settings
from backend.websocket.api import router as websocket_router

app = FastAPI(
    title="Raddle Teams",
    description="A team-based word chain puzzle game",
)

if settings.TESTING:

    @app.delete("/api/reset-db")
    async def reset_db():
        api_logger.info("Resetting database (TESTING mode)")
        drop_all_tables()
        create_db_and_tables()
        api_logger.info("Database reset successful")
        return {"message": "Database reset successful"}


try:
    create_db_and_tables()
    server_logger.info("Database and tables created/verified successfully")
except Exception as exc:
    server_logger.exception("Failed to create/verify database tables: %s", exc)
    raise


# Define specific API routes BEFORE the catch-all route
@app.get("/api", tags=["Root"])
async def api_root():
    api_logger.info("API root accessed")
    return {
        "message": "Welcome to the Raddle Teams API",
        "timestamp": datetime.now().isoformat(),
        "documentation_endpoints": {"OpenAPI": "/api/docs", "ReDoc": "/api/redoc"},
    }


app.include_router(lobby_router, prefix="/api")
server_logger.info("Included lobby router at /api")
app.include_router(admin_lobby_router, prefix="/api/admin")
server_logger.info("Included admin lobby router at /api/admin")
app.include_router(websocket_router, prefix="/ws")
server_logger.info("Included websocket router at /ws")

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
        return {"error": "endpoint not found"}

    # For all other routes, serve the frontend index.html to support SPA routing
    index_file = static_path / "index.html"
    if index_file.exists():
        api_logger.debug("Serving index.html for SPA route: %s", full_path)
        return FileResponse(str(index_file))
    api_logger.error("index.html not found at: %s", index_file)
    return {"error": "Frontend not built. Run 'npm run build' first."}
