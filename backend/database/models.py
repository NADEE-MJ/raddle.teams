from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, Relationship, SQLModel


class Player(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True)
    session_id: str = Field(unique=True)
    lobby_id: int = Field(foreign_key="lobby.id", ondelete="CASCADE")
    team_id: Optional[int] = Field(
        default=None, foreign_key="team.id", ondelete="CASCADE"
    )
    created_at: datetime = Field(default_factory=lambda: datetime.now(tz=timezone.utc))

    # Relationships
    lobby: "Lobby" = Relationship(back_populates="players")
    team: Optional["Team"] = Relationship(back_populates="players")
    guesses: list["Guess"] = Relationship(
        back_populates="player", cascade_delete=True, passive_deletes=True
    )


class Team(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    lobby_id: int = Field(foreign_key="lobby.id", ondelete="CASCADE")
    current_word_index: int = Field(default=0)
    completed_at: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=lambda: datetime.now(tz=timezone.utc))

    # Relationships
    lobby: "Lobby" = Relationship(back_populates="teams")
    players: list["Player"] = Relationship(
        back_populates="team", cascade_delete=True, passive_deletes=True
    )
    guesses: list["Guess"] = Relationship(
        back_populates="team", cascade_delete=True, passive_deletes=True
    )


class Lobby(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    code: str = Field(unique=True, index=True)
    name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(tz=timezone.utc))

    # Relationships
    players: list["Player"] = Relationship(
        back_populates="lobby", cascade_delete=True, passive_deletes=True
    )
    teams: list["Team"] = Relationship(
        back_populates="lobby", cascade_delete=True, passive_deletes=True
    )


class Guess(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    team_id: int = Field(foreign_key="team.id", ondelete="CASCADE")
    player_id: int = Field(foreign_key="player.id", ondelete="CASCADE")
    word_index: int
    direction: str = Field(description="Direction of guess: 'forward' or 'backward'")
    guess: str
    is_correct: bool = Field(default=False)
    submitted_at: datetime = Field(
        default_factory=lambda: datetime.now(tz=timezone.utc)
    )

    # Relationships
    team: "Team" = Relationship(back_populates="guesses")
    player: "Player" = Relationship(back_populates="guesses")