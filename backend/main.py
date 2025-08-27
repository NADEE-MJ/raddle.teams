from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
import json
import asyncio
from typing import Dict, List, Optional
import uuid
from datetime import datetime

from backend.database import init_db, get_db
from backend.models import Player, Team, Game, GameState
from backend.websocket_manager import ConnectionManager


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database
    await init_db()
    yield


app = FastAPI(title="Raddle Teams", lifespan=lifespan)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket connection manager
manager = ConnectionManager()

# Global game state
current_game: Optional[Game] = None


@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}


@app.post("/api/join")
async def join_game(player_name: str = Form(...)):
    """Join the game lobby"""
    async with get_db() as db:
        # Check if game exists and is in lobby state
        if current_game and current_game.state != GameState.LOBBY:
            raise HTTPException(status_code=400, detail="Game already in progress")
        
        # Create player
        player_id = str(uuid.uuid4())
        player = Player(
            id=player_id,
            name=player_name,
            connected=True,
            joined_at=datetime.utcnow()
        )
        
        # Add to database (simplified for demo)
        # In real implementation, this would use SQLAlchemy
        
        return {
            "player_id": player_id,
            "name": player_name,
            "status": "joined_lobby"
        }


@app.post("/api/admin/start-game")
async def start_game(num_teams: int = 2):
    """Admin endpoint to start the game"""
    global current_game
    
    if current_game and current_game.state != GameState.LOBBY:
        raise HTTPException(status_code=400, detail="Game already in progress")
    
    # Create game instance
    game_id = str(uuid.uuid4())
    current_game = Game(
        id=game_id,
        state=GameState.LOBBY,
        num_teams=num_teams,
        created_at=datetime.utcnow()
    )
    
    # Notify all connected clients
    await manager.broadcast({
        "type": "game_started",
        "game_id": game_id,
        "num_teams": num_teams
    })
    
    return {"game_id": game_id, "status": "started"}


@app.post("/api/admin/assign-teams")
async def assign_teams():
    """Admin endpoint to randomly assign players to teams"""
    global current_game
    
    if not current_game:
        raise HTTPException(status_code=400, detail="No active game")
    
    # Get all connected players
    connected_players = await manager.get_connected_players()
    
    if len(connected_players) == 0:
        raise HTTPException(status_code=400, detail="No players connected")
    
    # Simple random assignment for demo
    teams = []
    for i in range(current_game.num_teams):
        teams.append(Team(
            id=str(uuid.uuid4()),
            name=f"Team {i+1}",
            players=[],
            game_id=current_game.id
        ))
    
    # Assign players to teams round-robin
    for idx, player_id in enumerate(connected_players):
        team_idx = idx % len(teams)
        teams[team_idx].players.append(player_id)
    
    # Update game state
    current_game.state = GameState.TEAM_ASSIGNMENT
    current_game.teams = teams
    
    # Notify all clients
    await manager.broadcast({
        "type": "teams_assigned",
        "teams": [{"id": t.id, "name": t.name, "players": t.players} for t in teams]
    })
    
    return {"teams": teams}


@app.get("/api/admin/status")
async def get_admin_status():
    """Get current game status for admin"""
    if not current_game:
        return {"game": None, "players": [], "teams": []}
    
    connected_players = await manager.get_connected_players()
    
    return {
        "game": {
            "id": current_game.id,
            "state": current_game.state.value,
            "num_teams": current_game.num_teams
        },
        "players": connected_players,
        "teams": [{"id": t.id, "name": t.name, "players": t.players} for t in current_game.teams] if current_game.teams else []
    }


@app.websocket("/ws/{player_id}")
async def websocket_endpoint(websocket: WebSocket, player_id: str):
    await manager.connect(websocket, player_id)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Handle different message types
            if message["type"] == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
            
            elif message["type"] == "guess":
                # Handle guess submission (Phase 1 basic implementation)
                await handle_guess(player_id, message["guess"], message.get("direction", "forward"))
                
    except WebSocketDisconnect:
        manager.disconnect(player_id)


async def handle_guess(player_id: str, guess: str, direction: str):
    """Handle a player's guess submission"""
    # Basic implementation for Phase 1
    # In a real implementation, this would check against the puzzle
    guess_result = {
        "type": "guess_result",
        "player_id": player_id,
        "guess": guess,
        "direction": direction,
        "correct": False,  # Placeholder
        "timestamp": datetime.utcnow().isoformat()
    }
    
    # Broadcast to team members
    await manager.broadcast_to_team(player_id, guess_result)


# Mount static files for frontend (when built)
import os
if os.path.exists("frontend/dist"):
    # Serve static assets first
    app.mount("/assets", StaticFiles(directory="frontend/dist/assets"), name="assets")


@app.get("/")
async def read_index():
    if os.path.exists("frontend/dist/index.html"):
        return FileResponse("frontend/dist/index.html")
    return {"message": "Raddle Teams API", "status": "running", "phase": "1"}


@app.get("/admin")
async def read_admin():
    if os.path.exists("frontend/dist/index.html"):
        return FileResponse("frontend/dist/index.html")
    return {"message": "Admin page not available"}


# Catch-all route for SPA routing
@app.get("/{full_path:path}")
async def catch_all(full_path: str):
    # If it's an API route, let it 404
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not Found")
    
    # For other routes, serve the React app
    if os.path.exists("frontend/dist/index.html"):
        return FileResponse("frontend/dist/index.html")
    
    raise HTTPException(status_code=404, detail="Not Found")