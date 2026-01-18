from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Index, UniqueConstraint
from sqlmodel import Field, Relationship, SQLModel


class Room(SQLModel, table=True):
    """Main game room container"""

    id: Optional[int] = Field(default=None, primary_key=True)
    code: str = Field(unique=True, index=True)  # 6-character room code
    name: str
    host_player_id: Optional[int] = Field(
        default=None, foreign_key="player.id", ondelete="SET NULL"
    )  # Host can leave
    current_round: int = Field(default=0)  # 0 = lobby, 1-3 = active rounds
    status: str = Field(default="lobby")  # lobby, question_submission, voting, results, completed
    created_at: datetime = Field(default_factory=lambda: datetime.now(tz=timezone.utc))

    # Current question tracking for voting phase
    current_question_id: Optional[int] = Field(default=None, foreign_key="question.id", ondelete="SET NULL")
    voting_started_at: Optional[datetime] = None  # When voting timer started for current question
    voting_duration_seconds: int = Field(default=30)  # Timer duration

    # Relationships
    players: list["Player"] = Relationship(
        back_populates="room",
        cascade_delete=True,
        passive_deletes=True,
        sa_relationship_kwargs={"foreign_keys": "[Player.room_id]"},
    )
    people_pool: list["PersonInPool"] = Relationship(back_populates="room", cascade_delete=True, passive_deletes=True)
    questions: list["Question"] = Relationship(
        back_populates="room",
        cascade_delete=True,
        passive_deletes=True,
        sa_relationship_kwargs={"foreign_keys": "[Question.room_id]"},
    )
    game_session: Optional["GameSession"] = Relationship(back_populates="room")


class Player(SQLModel, table=True):
    """Player in a room"""

    __table_args__ = (UniqueConstraint("name", "room_id", name="uq_player_name_room"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    session_id: str = Field(unique=True, index=True)  # UUID for authentication
    room_id: int = Field(foreign_key="room.id", ondelete="CASCADE", index=True)
    is_host: bool = Field(default=False)
    created_at: datetime = Field(default_factory=lambda: datetime.now(tz=timezone.utc))

    # Relationships
    room: "Room" = Relationship(
        back_populates="players", sa_relationship_kwargs={"foreign_keys": "[Player.room_id]"}
    )
    questions: list["Question"] = Relationship(back_populates="player", cascade_delete=True, passive_deletes=True)
    votes: list["Vote"] = Relationship(back_populates="voter", cascade_delete=True, passive_deletes=True)
    score: Optional["Score"] = Relationship(back_populates="player")


class PersonInPool(SQLModel, table=True):
    """Person available for voting (player or non-present person)"""

    __table_args__ = (UniqueConstraint("name", "room_id", name="uq_person_name_room"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    room_id: int = Field(foreign_key="room.id", ondelete="CASCADE", index=True)
    name: str
    is_player: bool = Field(default=False)  # True if this person is an active player
    player_id: Optional[int] = Field(default=None, foreign_key="player.id", ondelete="CASCADE")
    created_at: datetime = Field(default_factory=lambda: datetime.now(tz=timezone.utc))

    # Relationships
    room: "Room" = Relationship(back_populates="people_pool")


class Question(SQLModel, table=True):
    """Superlatives question submitted by a player"""

    __table_args__ = (Index("ix_question_round", "room_id", "round_number"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    room_id: int = Field(foreign_key="room.id", ondelete="CASCADE", index=True)
    player_id: int = Field(foreign_key="player.id", ondelete="CASCADE", index=True)
    round_number: int  # 1, 2, or 3
    question_text: str = Field(max_length=200)
    created_at: datetime = Field(default_factory=lambda: datetime.now(tz=timezone.utc))

    # Voting status for this question
    voting_completed: bool = Field(default=False)
    results_shown: bool = Field(default=False)

    # Relationships
    room: "Room" = Relationship(
        back_populates="questions", sa_relationship_kwargs={"foreign_keys": "[Question.room_id]"}
    )
    player: "Player" = Relationship(back_populates="questions")
    votes: list["Vote"] = Relationship(back_populates="question", cascade_delete=True, passive_deletes=True)


class Vote(SQLModel, table=True):
    """Vote for a specific question"""

    __table_args__ = (UniqueConstraint("question_id", "voter_id", "is_revote", name="uq_vote_question_voter_revote"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    question_id: int = Field(foreign_key="question.id", ondelete="CASCADE", index=True)
    voter_id: int = Field(foreign_key="player.id", ondelete="CASCADE", index=True)
    voted_for_name: str  # Name from people pool
    is_revote: bool = Field(default=False)  # True for tie-breaking revotes
    timestamp: datetime = Field(default_factory=lambda: datetime.now(tz=timezone.utc), index=True)

    # Relationships
    question: "Question" = Relationship(back_populates="votes")
    voter: "Player" = Relationship(back_populates="votes")


class Score(SQLModel, table=True):
    """Player scores across all rounds"""

    id: Optional[int] = Field(default=None, primary_key=True)
    player_id: int = Field(foreign_key="player.id", ondelete="CASCADE", unique=True)
    room_id: int = Field(foreign_key="room.id", ondelete="CASCADE", index=True)
    total_score: int = Field(default=0)
    round_1_score: int = Field(default=0)
    round_2_score: int = Field(default=0)
    round_3_score: int = Field(default=0)

    # Relationships
    player: "Player" = Relationship(back_populates="score")


class GameSession(SQLModel, table=True):
    """Session statistics for a completed game"""

    id: Optional[int] = Field(default=None, primary_key=True)
    room_id: int = Field(foreign_key="room.id", ondelete="CASCADE", unique=True, index=True)
    start_time: datetime = Field(default_factory=lambda: datetime.now(tz=timezone.utc))
    end_time: Optional[datetime] = None
    player_count: int
    questions_count: int = Field(default=0)
    votes_count: int = Field(default=0)

    # Relationships
    room: "Room" = Relationship(back_populates="game_session")
