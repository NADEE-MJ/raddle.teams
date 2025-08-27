from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from enum import Enum


class GameState(Enum):
    LOBBY = "lobby"
    TEAM_ASSIGNMENT = "team_assignment"
    TEAM_NAMING = "team_naming"
    IN_PROGRESS = "in_progress"
    FINISHED = "finished"


class Player(BaseModel):
    id: str
    name: str
    team_id: Optional[str] = None
    connected: bool = True
    joined_at: datetime


class Team(BaseModel):
    id: str
    name: str
    players: List[str] = []
    game_id: str
    score: int = 0
    current_word_position: int = 0
    hints_used: int = 0


class Game(BaseModel):
    id: str
    state: GameState
    num_teams: int
    teams: List[Team] = []
    current_puzzle: Optional[str] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None


class Guess(BaseModel):
    id: str
    player_id: str
    team_id: str
    game_id: str
    word_position: int
    guess: str
    direction: str  # 'forward' or 'backward'
    correct: bool = False
    submitted_at: datetime


class Puzzle(BaseModel):
    id: str
    name: str
    words: List[str]
    clues: dict  # word -> {"forward": str, "backward": str}


class WebSocketMessage(BaseModel):
    type: str
    data: dict = {}