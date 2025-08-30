from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, SQLModel


class Player(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    session_id: str = Field(unique=True)
    lobby_id: int = Field(foreign_key="lobby.id")
    team_id: Optional[int] = Field(default=None, foreign_key="team.id")
    created_at: datetime = Field(default_factory=lambda: datetime.now(tz=timezone.utc))


class Team(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    # game_id: int = Field(foreign_key="game.id")
    lobby_id: int = Field(foreign_key="lobby.id")
    current_word_index: int = Field(default=0)
    completed_at: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=lambda: datetime.now(tz=timezone.utc))


class Lobby(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    code: str = Field(unique=True, index=True)
    name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(tz=timezone.utc))


# class Game(SQLModel, table=True):
#     id: Optional[int] = Field(default=None, primary_key=True)
#     state: GameState = Field(default=GameState.LOBBY)
#     puzzle_name: str = Field(default="tutorial")
#     created_at: datetime = Field(default_factory=lambda: datetime.now(tz=timezone.utc))
#     started_at: Optional[datetime] = Field(default=None)
#     finished_at: Optional[datetime] = Field(default=None)


class Guess(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    team_id: int = Field(foreign_key="team.id")
    player_id: int = Field(foreign_key="player.id")
    word_index: int
    direction: str  # "forward" or "backward"
    guess: str
    is_correct: bool = Field(default=False)
    submitted_at: datetime = Field(
        default_factory=lambda: datetime.now(tz=timezone.utc)
    )
