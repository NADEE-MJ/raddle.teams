from pydantic import BaseModel

from backend.database.models import Lobby, Player, Team


#############################################################################
# ? Request Models
#############################################################################
class PlayerCreate(BaseModel):
    name: str


class LobbyCreate(BaseModel):
    name: str | None = None


class TeamCreate(BaseModel):
    num_teams: int


class TeamUpdate(BaseModel):
    name: str


class AdminStartGameRequest(BaseModel):
    difficulty: str
    puzzle_mode: str = "different"  # "same" or "different"
    word_count_mode: str = "balanced"  # "exact" or "balanced"
    force_start: bool = False  # Allow starting even if not all players are ready


#############################################################################
# ? Response Models
#############################################################################
class LobbyInfo(BaseModel):
    lobby: Lobby
    players: list[Player]
    players_by_team: dict[int, list[Player]]
    teams: list[Team]


class MessageResponse(BaseModel):
    status: bool
    message: str


class GeneratedNameResponse(BaseModel):
    name: str


class ApiRootResponse(BaseModel):
    message: str
    timestamp: str
    documentation_endpoints: dict[str, str]


class AdminAuthenticatedResponse(BaseModel):
    session_id: str
