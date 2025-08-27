from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Optional
import json
import asyncio
from datetime import datetime
import uuid

from database import Database, Player, Team, GameState
from models import JoinGameRequest, CreateTeamsRequest, SubmitAnswerRequest

app = FastAPI(title="Raddle Teams API", version="1.0.0")

# CORS middleware for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database
db = Database()

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, team_id: str):
        await websocket.accept()
        if team_id not in self.active_connections:
            self.active_connections[team_id] = []
        self.active_connections[team_id].append(websocket)
    
    def disconnect(self, websocket: WebSocket, team_id: str):
        if team_id in self.active_connections:
            self.active_connections[team_id].remove(websocket)
            if not self.active_connections[team_id]:
                del self.active_connections[team_id]
    
    async def send_to_team(self, team_id: str, message: dict):
        if team_id in self.active_connections:
            disconnected = []
            for connection in self.active_connections[team_id]:
                try:
                    await connection.send_json(message)
                except:
                    disconnected.append(connection)
            
            # Remove disconnected connections
            for connection in disconnected:
                self.active_connections[team_id].remove(connection)

manager = ConnectionManager()

@app.on_event("startup")
async def startup_event():
    await db.create_tables()

# REST API Endpoints

@app.post("/api/join")
async def join_game(request: JoinGameRequest):
    """Player joins the game lobby"""
    player_id = str(uuid.uuid4())
    player = Player(
        id=player_id,
        name=request.player_name,
        team_id=None,
        connected=True
    )
    
    await db.add_player(player)
    return {"player_id": player_id, "message": "Joined game successfully"}

@app.post("/api/admin/create-teams")
async def create_teams(request: CreateTeamsRequest):
    """Admin creates teams and assigns players"""
    players = await db.get_all_players()
    unassigned_players = [p for p in players if p.team_id is None]
    
    if len(unassigned_players) < request.num_teams:
        raise HTTPException(status_code=400, detail="Not enough players for teams")
    
    teams = []
    for i in range(request.num_teams):
        team_id = str(uuid.uuid4())
        team = Team(
            id=team_id,
            name=f"Team {i+1}",
            current_puzzle=0,
            current_word_index=0,
            hints_used=0,
            completed_puzzles=0,
            start_time=datetime.now()
        )
        teams.append(team)
        await db.add_team(team)
    
    # Assign players to teams round-robin
    for i, player in enumerate(unassigned_players):
        team_index = i % request.num_teams
        player.team_id = teams[team_index].id
        await db.update_player(player)
    
    return {"teams": [{"id": t.id, "name": t.name} for t in teams]}

@app.get("/api/admin/players")
async def get_players():
    """Get all players for admin view"""
    players = await db.get_all_players()
    return {"players": [{"id": p.id, "name": p.name, "team_id": p.team_id} for p in players]}

@app.get("/api/admin/teams")
async def get_teams():
    """Get all teams for admin view"""
    teams = await db.get_all_teams()
    return {"teams": [{"id": t.id, "name": t.name, "current_puzzle": t.current_puzzle, 
                      "current_word_index": t.current_word_index, "hints_used": t.hints_used} for t in teams]}

@app.post("/api/submit-answer")
async def submit_answer(request: SubmitAnswerRequest):
    """Submit an answer for a word"""
    player = await db.get_player(request.player_id)
    if not player or not player.team_id:
        raise HTTPException(status_code=400, detail="Player not found or not on team")
    
    team = await db.get_team(player.team_id)
    if not team:
        raise HTTPException(status_code=400, detail="Team not found")
    
    # Load current puzzle
    puzzle = load_puzzle(team.current_puzzle)
    if not puzzle:
        raise HTTPException(status_code=400, detail="Puzzle not found")
    
    # Check if answer is correct
    current_word_index = team.current_word_index
    if request.direction == "forward":
        target_word_index = current_word_index + 1
    else:
        target_word_index = current_word_index - 1
    
    if target_word_index < 0 or target_word_index >= len(puzzle["words"]):
        raise HTTPException(status_code=400, detail="Invalid direction")
    
    correct_answer = puzzle["words"][target_word_index]
    
    # Broadcast guess to team
    await manager.send_to_team(player.team_id, {
        "type": "guess_submitted",
        "player_name": player.name,
        "guess": request.answer.upper(),
        "direction": request.direction,
        "word_index": current_word_index
    })
    
    if request.answer.upper() == correct_answer:
        # Correct answer! Update team progress
        team.current_word_index = target_word_index
        await db.update_team(team)
        
        # Check if puzzle is complete
        is_complete = (target_word_index == 0 or target_word_index == len(puzzle["words"]) - 1)
        
        await manager.send_to_team(player.team_id, {
            "type": "word_solved",
            "solver": player.name,
            "word": correct_answer,
            "new_word_index": target_word_index,
            "puzzle_complete": is_complete
        })
        
        if is_complete:
            team.completed_puzzles += 1
            await db.update_team(team)
            
            await manager.send_to_team(player.team_id, {
                "type": "puzzle_complete",
                "puzzles_completed": team.completed_puzzles
            })
        
        return {"correct": True, "word": correct_answer}
    
    return {"correct": False}

def load_puzzle(puzzle_index: int) -> Optional[dict]:
    """Load puzzle from JSON file"""
    try:
        with open(f"/home/nadeem/Documents/raddle.teams/puzzles/puzzle_{puzzle_index}.json", "r") as f:
            return json.load(f)
    except FileNotFoundError:
        return None

# WebSocket endpoint
@app.websocket("/ws/{player_id}")
async def websocket_endpoint(websocket: WebSocket, player_id: str):
    player = await db.get_player(player_id)
    if not player or not player.team_id:
        await websocket.close(code=1000)
        return
    
    await manager.connect(websocket, player.team_id)
    
    try:
        # Send initial game state
        team = await db.get_team(player.team_id)
        puzzle = load_puzzle(team.current_puzzle)
        
        await websocket.send_json({
            "type": "game_state",
            "team": {
                "id": team.id,
                "name": team.name,
                "current_puzzle": team.current_puzzle,
                "current_word_index": team.current_word_index,
                "hints_used": team.hints_used
            },
            "puzzle": puzzle,
            "player": {
                "id": player.id,
                "name": player.name
            }
        })
        
        while True:
            await websocket.receive_text()  # Keep connection alive
            
    except WebSocketDisconnect:
        manager.disconnect(websocket, player.team_id)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
