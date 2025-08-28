from datetime import datetime
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from backend.api import router as api_router
# from backend.websocket import router as websocket_router
from custom_logging import file_logger

app = FastAPI(
    title="Raddle Teams",
    description="A team-based word chain puzzle game",
)

# app.include_router(api_router, prefix="/api")
# app.include_router(websocket_router)

current_dir = Path(__file__).parent
static_path = current_dir / "static"

if static_path.exists():
    app.mount("/", StaticFiles(directory=str(static_path), html=True), name="static")
    file_logger.info(f"Static files mounted from: {static_path}")
    print(f"📁 Static files mounted from: {static_path}")
else:
    file_logger.error(f"Static directory not found. Looked for: {static_path}")
    print(f"⚠️  Warning: Static directory not found. Looked for: {static_path}")
    exit(1)


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "message": "Raddle Teams API is running"}


@app.get("/api", tags=["Root"])
async def api_root():
    return {
        "message": "Welcome to the Raddle Teams API",
        "timestamp": datetime.now().isoformat(),
        "documentation_endpoints": {"OpenAPI": "/api/docs", "ReDoc": "/api/redoc"},
    }


@app.get("/{path:path}")
async def serve_frontend(path: str):
    file_logger.debug(f"Catch-all route accessed with path: {path}")

    if path.startswith(("api/", "ws/", "docs", "redoc", "openapi.json")):
        file_logger.warning(f"endpoint not found: {path}")
        return {"error": "endpoint not found"}

    file_logger.warning(f"File not found: {path}")
    return {"error": "Not found"}
