from enum import Enum

from pydantic import BaseModel


####################################################################
# ? LOBBY EVENTS
####################################################################
class LobbyWebSocketEvents(str, Enum):
    CONNECTION_CONFIRMED = "connection_confirmed"
    TEAM_ASSIGNED = "team_assigned"
    TEAM_CHANGED = "team_changed"
    DISCONNECTED = "disconnected"
    PLAYER_KICKED = "player_kicked"


class LobbyEvent(BaseModel):
    lobby_id: int
    player_session_id: str
    type: LobbyWebSocketEvents


class JoinedLobbyEvent(LobbyEvent):
    type: LobbyWebSocketEvents = LobbyWebSocketEvents.CONNECTION_CONFIRMED


class DisconnectedLobbyEvent(LobbyEvent):
    type: LobbyWebSocketEvents = LobbyWebSocketEvents.DISCONNECTED


class PlayerKickedEvent(LobbyEvent):
    type: LobbyWebSocketEvents = LobbyWebSocketEvents.PLAYER_KICKED


class TeamAssignedEvent(LobbyEvent):
    type: LobbyWebSocketEvents = LobbyWebSocketEvents.TEAM_ASSIGNED


class TeamChangedEvent(LobbyEvent):
    new_team_id: int
    old_team_id: int
    type: LobbyWebSocketEvents = LobbyWebSocketEvents.TEAM_CHANGED
