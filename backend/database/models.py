from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Column, Index, JSON, UniqueConstraint
from sqlmodel import Field, Relationship, SQLModel


class Player(SQLModel, table=True):
    __table_args__ = (
        UniqueConstraint("name", "lobby_id", name="uq_player_name_lobby"),
        Index("ix_player_session_id", "session_id"),
        Index("ix_player_lobby_id", "lobby_id"),
        Index("ix_player_team_id", "team_id"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    session_id: str = Field(unique=True)
    lobby_id: int = Field(foreign_key="lobby.id", ondelete="CASCADE")
    team_id: Optional[int] = Field(default=None, foreign_key="team.id", ondelete="CASCADE")
    created_at: datetime = Field(default_factory=lambda: datetime.now(tz=timezone.utc))

    # Relationships
    lobby: "Lobby" = Relationship(back_populates="players")
    team: Optional["Team"] = Relationship(back_populates="players")


class Team(SQLModel, table=True):
    __table_args__ = (Index("ix_team_lobby_id", "lobby_id"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    lobby_id: int = Field(foreign_key="lobby.id", ondelete="CASCADE")
    game_id: Optional[int] = Field(default=None, foreign_key="game.id", ondelete="SET NULL")  # Link to team's puzzle
    current_word_index: int = Field(default=0)  # Deprecated, not used
    completed_at: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=lambda: datetime.now(tz=timezone.utc))

    # Simplified game state - server only tracks revealed words
    revealed_steps: str = Field(default="[]", sa_column=Column(JSON))  # JSON array of revealed step indices
    last_updated_at: Optional[datetime] = Field(default=None)

    # Tournament statistics (persist across rounds)
    total_points: int = Field(default=0)
    rounds_won: int = Field(default=0)
    rounds_played: int = Field(default=0)

    # Relationships
    lobby: "Lobby" = Relationship(back_populates="teams")
    game: Optional["Game"] = Relationship(back_populates="teams")  # The puzzle this team is solving
    players: list["Player"] = Relationship(back_populates="team", cascade_delete=True, passive_deletes=True)
    guesses: list["Guess"] = Relationship(back_populates="team", cascade_delete=True, passive_deletes=True)


class Lobby(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    code: str = Field(unique=True, index=True)
    name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(tz=timezone.utc))

    # Relationships
    players: list["Player"] = Relationship(back_populates="lobby", cascade_delete=True, passive_deletes=True)
    teams: list["Team"] = Relationship(back_populates="lobby", cascade_delete=True, passive_deletes=True)
    games: list["Game"] = Relationship(back_populates="lobby", cascade_delete=True, passive_deletes=True)


class Game(SQLModel, table=True):
    """Represents a puzzle assignment for a team."""

    __table_args__ = (Index("ix_game_lobby_id", "lobby_id"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    lobby_id: int = Field(foreign_key="lobby.id", ondelete="CASCADE")  # Removed unique constraint
    difficulty: str  # "easy", "medium", "hard"
    puzzle_data: str = Field(sa_column=Column(JSON))  # Full puzzle JSON with meta and ladder
    started_at: datetime = Field(default_factory=lambda: datetime.now(tz=timezone.utc))
    completed_at: Optional[datetime] = Field(default=None)

    # Relationships
    lobby: "Lobby" = Relationship(back_populates="games")
    teams: list["Team"] = Relationship(back_populates="game")  # Teams solving this puzzle


class Guess(SQLModel, table=True):
    __table_args__ = (
        Index("ix_guess_team_id", "team_id"),
        Index("ix_guess_player_id", "player_id"),
        Index("ix_guess_game_id", "game_id"),
        Index("ix_guess_team_word", "team_id", "word_index"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    team_id: int = Field(foreign_key="team.id", ondelete="CASCADE")
    player_id: int = Field(foreign_key="player.id", ondelete="CASCADE")
    game_id: int = Field(foreign_key="game.id", ondelete="CASCADE")  # Which puzzle they were solving
    word_index: int  # Index in the puzzle ladder
    direction: str  # "down" or "up"
    guess: str  # The guessed word
    is_correct: bool
    created_at: datetime = Field(default_factory=lambda: datetime.now(tz=timezone.utc))

    # Relationships
    team: "Team" = Relationship(back_populates="guesses")
    player: "Player" = Relationship()
    game: "Game" = Relationship()


class RoundResult(SQLModel, table=True):
    __table_args__ = (
        Index("ix_round_lobby_id", "lobby_id"),
        Index("ix_round_team_id", "team_id"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    lobby_id: int = Field(foreign_key="lobby.id", ondelete="CASCADE")
    game_id: int = Field(foreign_key="game.id", ondelete="CASCADE")
    team_id: int = Field(foreign_key="team.id", ondelete="CASCADE")
    round_number: int  # 1, 2, 3...
    placement: int  # 1st, 2nd, 3rd, etc.
    points_earned: int
    completion_percentage: float  # 0.0 to 1.0 for DNF teams
    time_to_complete: Optional[int] = Field(default=None)  # seconds, null if DNF
    completed_at: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=lambda: datetime.now(tz=timezone.utc))

    # Relationships
    lobby: "Lobby" = Relationship()
    game: "Game" = Relationship()
    team: "Team" = Relationship()
