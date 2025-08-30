from datetime import datetime
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from backend.api.admin.lobby import router as admin_lobby_router
from backend.api.lobby import router as lobby_router
from backend.database import create_db_and_tables
from backend.websocket.api import router as websocket_router
from custom_logging import file_logger

app = FastAPI(
    title="Raddle Teams",
    description="A team-based word chain puzzle game",
)

create_db_and_tables()


# Define specific API routes BEFORE the catch-all route
@app.get("/api", tags=["Root"])
async def api_root():
    return {
        "message": "Welcome to the Raddle Teams API",
        "timestamp": datetime.now().isoformat(),
        "documentation_endpoints": {"OpenAPI": "/api/docs", "ReDoc": "/api/redoc"},
    }


app.include_router(lobby_router, prefix="/api")
app.include_router(admin_lobby_router, prefix="/api/admin")
app.include_router(websocket_router)

current_dir = Path(__file__).parent
static_path = current_dir / "static"

if static_path.exists():
    app.mount(
        "/assets",
        StaticFiles(directory=str(static_path / "assets"), html=True),
        name="assets",
    )
    file_logger.info(f"Static files mounted from: {static_path}")
    print(f"📁 Static files mounted from: {static_path}")
else:
    file_logger.error(f"Static directory not found. Looked for: {static_path}")
    print(f"⚠️  Warning: Static directory not found. Looked for: {static_path}")
    exit(1)


@app.get("/favicon.svg")
async def serve_favicon():
    favicon_path = static_path / "favicon.svg"
    if favicon_path.exists():
        return FileResponse(str(favicon_path))
    return {"error": "Favicon not found"}


@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    file_logger.debug(f"Catch-all route accessed with path: {full_path}")

    # If it's an API or WebSocket route, return 404
    if full_path.startswith(("api/", "ws/", "docs", "redoc", "openapi.json")):
        file_logger.warning(f"API endpoint not found: {full_path}")
        return {"error": "endpoint not found"}

    # For all other routes, serve the frontend index.html to support SPA routing
    index_file = static_path / "index.html"
    if index_file.exists():
        file_logger.debug(f"Serving index.html for SPA route: {full_path}")
        return FileResponse(str(index_file))
    else:
        file_logger.error(f"index.html not found at: {index_file}")
        return {"error": "Frontend not built. Run 'npm run build' first."}
