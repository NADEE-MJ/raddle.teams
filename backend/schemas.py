from pydantic import BaseModel

from backend.database.models import Lobby, Player, Team


class LobbyInfo(BaseModel):
    lobby: Lobby
    players: list[Player]
    players_by_team: dict[int, list[Player]] | None
    teams: list[Team] | None
    game: None = None


class PlayerCreate(BaseModel):
    name: str
