from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from .database.database import GameState


class PlayerCreate(BaseModel):
    """Schema for creating a player."""

    name: str
    session_id: str


class PlayerResponse(BaseModel):
    """Schema for player response."""

    id: int
    name: str
    session_id: str
    team_id: Optional[int]
    connected: bool
    created_at: datetime


class TeamCreate(BaseModel):
    """Schema for creating a team."""

    name: str


class TeamResponse(BaseModel):
    """Schema for team response."""

    id: int
    name: str
    game_id: int
    current_word_index: int
    completed_at: Optional[datetime]
    created_at: datetime


class GameResponse(BaseModel):
    """Schema for game response."""

    id: int
    state: GameState
    puzzle_name: str
    created_at: datetime
    started_at: Optional[datetime]
    finished_at: Optional[datetime]


class JoinTeamRequest(BaseModel):
    """Schema for joining a team."""

    player_session_id: str


class GuessCreate(BaseModel):
    """Schema for creating a guess."""

    player_session_id: str
    guess: str
    direction: str  # "forward" or "backward"


class GuessResponse(BaseModel):
    """Schema for guess response."""

    id: int
    team_id: int
    player_id: int
    word_index: int
    direction: str
    guess: str
    is_correct: bool
    submitted_at: datetime
