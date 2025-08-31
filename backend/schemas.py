from pydantic import BaseModel

from backend.database.models import Lobby, Player, Team


class LobbyInfo(BaseModel):
    lobby: Lobby
    players: list[Player]
    players_by_team: dict[int, list[Player]]
    teams: list[Team]


class PlayerCreate(BaseModel):
    name: str


class MessageResponse(BaseModel):
    status: bool
    message: str


class ApiRootResponse(BaseModel):
    message: str
    timestamp: str
    documentation_endpoints: dict[str, str]
