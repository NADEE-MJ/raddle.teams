from enum import Enum

from pydantic import BaseModel

####################################################################
# ? LOBBY EVENTS
####################################################################


class LobbyWebSocketEvents(str, Enum):
    CONNECTION_CONFIRMED = "connection_confirmed"
    GAME_STARTED = "game_started"
    NEW_LOBBY_CREATED = "new_lobby_created"
    TEAM_ASSIGNED = "team_assigned"
    TEAM_CHANGED = "team_changed"
    DISCONNECTED = "disconnected"


class NewLobbyCreatedEvent(BaseModel):
    lobby_id: int
    type: LobbyWebSocketEvents = LobbyWebSocketEvents.NEW_LOBBY_CREATED


class LobbyEvent(BaseModel):
    lobby_id: int
    player_session_id: str
    type: LobbyWebSocketEvents


class JoinedLobbyEvent(LobbyEvent):
    type: LobbyWebSocketEvents = LobbyWebSocketEvents.CONNECTION_CONFIRMED


class DisconnectedLobbyEvent(LobbyEvent):
    type: LobbyWebSocketEvents = LobbyWebSocketEvents.DISCONNECTED


####################################################################
# ? ADMIN EVENTS
####################################################################
