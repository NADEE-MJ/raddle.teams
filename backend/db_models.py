from sqlmodel import SQLModel, Field, Relationship
from typing import List, Optional
from datetime import datetime
from enum import Enum


class GameState(str, Enum):
    LOBBY = "lobby"
    TEAM_ASSIGNMENT = "team_assignment"
    TEAM_NAMING = "team_naming"
    IN_PROGRESS = "in_progress"
    FINISHED = "finished"


class GuessDirection(str, Enum):
    FORWARD = "forward"
    BACKWARD = "backward"


# Base models that can be used for both DB and API
class PlayerBase(SQLModel):
    name: str
    team_id: Optional[str] = None
    connected: bool = True
    joined_at: datetime = Field(default_factory=datetime.utcnow)


class Player(PlayerBase, table=True):
    __tablename__ = "players"
    
    id: Optional[str] = Field(default=None, primary_key=True)
    
    # Relationships
    team: Optional["Team"] = Relationship(back_populates="players")


class PlayerCreate(PlayerBase):
    pass


class PlayerResponse(PlayerBase):
    id: str


class TeamBase(SQLModel):
    name: str
    game_id: str
    score: int = 0
    current_word_position: int = 0
    hints_used: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Team(TeamBase, table=True):
    __tablename__ = "teams"
    
    id: Optional[str] = Field(default=None, primary_key=True)
    
    # Relationships
    players: List[Player] = Relationship(back_populates="team")
    game: Optional["Game"] = Relationship(back_populates="teams")


class TeamCreate(TeamBase):
    pass


class TeamResponse(TeamBase):
    id: str
    players: List[PlayerResponse] = []


class GameBase(SQLModel):
    state: GameState
    num_teams: int
    current_puzzle: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None


class Game(GameBase, table=True):
    __tablename__ = "games"
    
    id: Optional[str] = Field(default=None, primary_key=True)
    
    # Relationships
    teams: List[Team] = Relationship(back_populates="game")


class GameCreate(GameBase):
    pass


class GameResponse(GameBase):
    id: str
    teams: List[TeamResponse] = []


class GuessBase(SQLModel):
    player_id: str
    team_id: str
    game_id: str
    word_position: int
    guess: str
    direction: GuessDirection
    correct: bool = False
    submitted_at: datetime = Field(default_factory=datetime.utcnow)


class Guess(GuessBase, table=True):
    __tablename__ = "guesses"
    
    id: Optional[str] = Field(default=None, primary_key=True)


class GuessCreate(GuessBase):
    pass


class GuessResponse(GuessBase):
    id: str


class PuzzleBase(SQLModel):
    name: str
    words: List[str]
    clues: dict  # word -> {"forward": str, "backward": str}


class Puzzle(PuzzleBase):
    id: str


class WebSocketMessage(SQLModel):
    type: str
    data: dict = {}