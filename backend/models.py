from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class JoinGameRequest(BaseModel):
    player_name: str

class CreateTeamsRequest(BaseModel):
    num_teams: int

class SubmitAnswerRequest(BaseModel):
    player_id: str
    answer: str
    direction: str  # "forward" or "backward"

class Player(BaseModel):
    id: str
    name: str
    team_id: Optional[str] = None
    connected: bool = True

class Team(BaseModel):
    id: str
    name: str
    current_puzzle: int = 0
    current_word_index: int = 1  # Start in middle of word chain
    hints_used: int = 0
    completed_puzzles: int = 0
    start_time: datetime

class GameState(BaseModel):
    active: bool = False
    started: bool = False
    num_teams: int = 0
