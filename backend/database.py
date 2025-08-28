"""
Database models and configuration for the Raddle Teams game.
"""

from datetime import datetime
from enum import Enum
from typing import Optional

from sqlmodel import Field, Session, SQLModel, create_engine


class GameState(str, Enum):
    """Possible game states."""

    LOBBY = "lobby"
    TEAM_SETUP = "team_setup"
    ACTIVE = "active"
    FINISHED = "finished"


class Player(SQLModel, table=True):
    """Player model."""

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    session_id: str = Field(unique=True)
    team_id: Optional[int] = Field(default=None, foreign_key="team.id")
    connected: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Team(SQLModel, table=True):
    """Team model."""

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    game_id: int = Field(foreign_key="game.id")
    current_word_index: int = Field(default=0)
    completed_at: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Game(SQLModel, table=True):
    """Game model."""

    id: Optional[int] = Field(default=None, primary_key=True)
    state: GameState = Field(default=GameState.LOBBY)
    puzzle_name: str = Field(default="tutorial")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = Field(default=None)
    finished_at: Optional[datetime] = Field(default=None)


class Guess(SQLModel, table=True):
    """Guess model for tracking player submissions."""

    id: Optional[int] = Field(default=None, primary_key=True)
    team_id: int = Field(foreign_key="team.id")
    player_id: int = Field(foreign_key="player.id")
    word_index: int
    direction: str  # "forward" or "backward"
    guess: str
    is_correct: bool = Field(default=False)
    submitted_at: datetime = Field(default_factory=datetime.utcnow)


# Database setup
DATABASE_URL = "sqlite:///./raddle_teams.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})


def create_db_and_tables():
    """Create database tables."""
    SQLModel.metadata.create_all(engine)


def get_session():
    """Get database session."""
    with Session(engine) as session:
        yield session
