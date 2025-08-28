"""
Main FastAPI application entrypoint.
Serves the frontend and handles API routes.
"""

import os

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from backend.api import router as api_router
from backend.websocket import router as websocket_router

app = FastAPI(
    title="Raddle Teams",
    description="A team-based word chain puzzle game",
    version="0.1.0",
)

# Include API routes
app.include_router(api_router, prefix="/api")
app.include_router(websocket_router)

# Serve static files from the built frontend
static_path = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_path):
    app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "message": "Raddle Teams API is running"}


# Serve the frontend index.html for all routes not starting with /api or /ws
@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    """Serve the frontend application for all non-API routes."""
    # Check if it's an API or WebSocket route
    if full_path.startswith(("api/", "ws/", "docs", "redoc", "openapi.json")):
        # Let FastAPI handle these routes
        return

    # Serve static files if they exist
    static_file_path = os.path.join(static_path, full_path)
    if os.path.exists(static_file_path) and os.path.isfile(static_file_path):
        return FileResponse(static_file_path)

    # Otherwise serve the main index.html
    index_path = os.path.join(static_path, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)

    # Fallback to the root index.html if static build doesn't exist
    fallback_path = os.path.join(os.path.dirname(__file__), "index.html")
    if os.path.exists(fallback_path):
        return FileResponse(fallback_path)

    return {
        "message": "Frontend not built yet. Run 'npm run build' to build the frontend."
    }
