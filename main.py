import json
import os
import uuid
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Optional, Dict, Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.database import init_db
from backend.db_models import GameState, GuessDirection
from backend.websocket_manager import ConnectionManager


# Simple data classes for Phase 1 (not using SQLModel tables)
class SimpleGame:
    def __init__(self, id: str, state: GameState, num_teams: int, current_puzzle: str = None):
        self.id = id
        self.state = state
        self.num_teams = num_teams
        self.current_puzzle = current_puzzle
        self.created_at = datetime.utcnow()

class SimpleTeam:
    def __init__(self, id: str, name: str, game_id: str):
        self.id = id
        self.name = name
        self.game_id = game_id


# Global game state
current_game: Optional[SimpleGame] = None
current_puzzle: Optional[Dict[str, Any]] = None


def load_puzzle(puzzle_name: str = "tutorial") -> Dict[str, Any]:
    """Load a puzzle from the puzzles directory"""
    puzzle_path = f"puzzles/{puzzle_name}.json"
    if os.path.exists(puzzle_path):
        with open(puzzle_path, 'r') as f:
            return json.load(f)
    return {
        "id": "tutorial",
        "name": "Tutorial Puzzle", 
        "words": ["DOWN", "SOUTH", "MOUTH", "HEART", "EARTH"],
        "clues": {
            "SOUTH": {
                "forward": "CARDINAL DIRECTION THAT'S ____ ON A MAP, MOST OF THE TIME",
                "backward": "CHANGE THE FIRST LETTER OF ________ TO GET A PART OF THE BODY -> MOUTH"
            },
            "MOUTH": {
                "forward": "CHANGE THE FIRST LETTER OF SOUTH TO GET A PART OF THE ____",
                "backward": "ORGAN THAT SITS INSIDE THE ________ -> HEART"
            },
            "HEART": {
                "forward": "ORGAN THAT SITS INSIDE THE ________",
                "backward": "MOVE THE FIRST LETTER OF ________ TO THE END TO GET WHERE WE ARE -> EARTH"
            }
        }
    }


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
current_game: Optional[SimpleGame] = None
current_puzzle: Optional[Dict[str, Any]] = None


# API Routes
@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}


@app.post("/api/join")
async def join_game(player_name: str = Form(...)):
    """Join the game lobby"""
    # Check if game exists and is in lobby state
    if current_game and current_game.state != GameState.LOBBY:
        raise HTTPException(status_code=400, detail="Game already in progress")
    
    # Create player
    player_id = str(uuid.uuid4())
    
    # In real implementation, this would use the database
    # For now, just return the player info
    
    return {
        "player_id": player_id,
        "name": player_name,
        "status": "joined_lobby"
    }


@app.post("/api/admin/start-game")
async def start_game(num_teams: int = 2):
    """Admin endpoint to start the game"""
    global current_game, current_puzzle
    
    if current_game and current_game.state != GameState.LOBBY:
        raise HTTPException(status_code=400, detail="Game already in progress")
    
    # Load the tutorial puzzle for Phase 1
    current_puzzle = load_puzzle("tutorial")
    
    # Create game instance
    game_id = str(uuid.uuid4())
    current_game = SimpleGame(
        id=game_id,
        state=GameState.LOBBY,
        num_teams=num_teams,
        current_puzzle=current_puzzle["id"]
    )
    
    # Notify all connected clients
    await manager.broadcast({
        "type": "game_started",
        "game_id": game_id,
        "num_teams": num_teams,
        "puzzle": current_puzzle
    })
    
    return {"game_id": game_id, "status": "started", "puzzle": current_puzzle["name"]}


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
        teams.append(SimpleTeam(
            id=str(uuid.uuid4()),
            name=f"Team {i+1}",
            game_id=current_game.id
        ))
    
    # Assign players to teams round-robin  
    team_assignments = []
    for idx, player_id in enumerate(connected_players):
        team_idx = idx % len(teams)
        team = teams[team_idx]
        # Assign player to team in the connection manager
        manager.assign_player_to_team(player_id, team.id)
        team_assignments.append({"player_id": player_id, "team_id": team.id})
    
    # Update game state
    current_game.state = GameState.TEAM_ASSIGNMENT
    
    # Notify all clients with team assignments
    await manager.broadcast({
        "type": "teams_assigned", 
        "teams": [{"id": t.id, "name": t.name, "players": []} for t in teams],
        "assignments": team_assignments,
        "puzzle": current_puzzle
    })
    
    return {"teams": teams, "assignments": team_assignments}


@app.get("/api/admin/status")
async def get_admin_status():
    """Get current game status for admin"""
    if not current_game:
        return {"game": None, "players": [], "teams": [], "puzzle": None}
    
    connected_players = await manager.get_connected_players()
    
    return {
        "game": {
            "id": current_game.id,
            "state": current_game.state.value,
            "num_teams": current_game.num_teams,
            "current_puzzle": current_game.current_puzzle
        },
        "players": connected_players,
        "teams": [],  # Simplified for demo
        "puzzle": current_puzzle
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
                # Handle guess submission with enum validation
                try:
                    direction = GuessDirection(message.get("direction", "forward"))
                    await handle_guess(player_id, message["guess"], direction)
                except ValueError:
                    # Invalid direction, default to forward
                    await handle_guess(player_id, message["guess"], GuessDirection.FORWARD)
                
    except WebSocketDisconnect:
        manager.disconnect(player_id)


async def handle_guess(player_id: str, guess: str, direction: GuessDirection):
    """Handle a player's guess submission"""
    global current_puzzle
    
    if not current_puzzle:
        return
    
    # Basic guess checking for Phase 1
    is_correct = False
    guess_upper = guess.upper().strip()
    
    # Check if the guess matches any word in the puzzle
    if guess_upper in current_puzzle["words"]:
        is_correct = True
    
    guess_result = {
        "type": "guess_result",
        "player_id": player_id,
        "guess": guess_upper,
        "direction": direction.value,
        "correct": is_correct,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    # Broadcast to team members
    await manager.broadcast_to_team(player_id, guess_result)
    
    # If correct, also broadcast current puzzle state
    if is_correct:
        await manager.broadcast_to_team(player_id, {
            "type": "word_solved",
            "word": guess_upper,
            "player_id": player_id,
            "direction": direction.value,
            "timestamp": datetime.utcnow().isoformat()
        })


# Mount static files for frontend (when built)
if os.path.exists("frontend/dist"):
    # Serve static assets first
    app.mount("/assets", StaticFiles(directory="frontend/dist/assets"), name="assets")


# Catch-all route for SPA routing - serves React app for all non-API routes
@app.get("/{full_path:path}")
async def catch_all(full_path: str):
    # If it's an API route, let it 404
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not Found")
    
    # For all other routes, serve the React app
    if os.path.exists("frontend/dist/index.html"):
        return FileResponse("frontend/dist/index.html")
    
    # Fallback for development
    return {"message": "Raddle Teams API", "status": "running", "phase": "1"}