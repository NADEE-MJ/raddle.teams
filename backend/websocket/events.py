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


####################################################################
# ? GAME EVENTS
####################################################################
class GameWebSocketEvents(str, Enum):
    GAME_STARTED = "game_started"
    GUESS_SUBMITTED = "guess_submitted"
    WORD_SOLVED = "word_solved"
    DIRECTION_CHANGED = "direction_changed"
    TEAM_COMPLETED = "team_completed"
    GAME_WON = "game_won"
    STATE_UPDATE = "state_update"
    ALREADY_SOLVED = "already_solved"
    TEAM_PLACED = "team_placed"
    ROUND_ENDED = "round_ended"
    NEW_ROUND_STARTED = "new_round_started"


class GameEvent(BaseModel):
    team_id: int
    type: GameWebSocketEvents


class GameStartedEvent(GameEvent):
    type: GameWebSocketEvents = GameWebSocketEvents.GAME_STARTED
    puzzle_title: str
    puzzle_length: int


class GuessSubmittedEvent(GameEvent):
    type: GameWebSocketEvents = GameWebSocketEvents.GUESS_SUBMITTED
    player_id: int
    player_name: str
    word_index: int
    guess: str
    is_correct: bool
    direction: str


class WordSolvedEvent(GameEvent):
    type: GameWebSocketEvents = GameWebSocketEvents.WORD_SOLVED
    player_id: int
    player_name: str
    word_index: int
    word: str
    direction: str


class DirectionChangedEvent(GameEvent):
    type: GameWebSocketEvents = GameWebSocketEvents.DIRECTION_CHANGED
    player_id: int
    player_name: str
    new_direction: str


class StateUpdateEvent(GameEvent):
    type: GameWebSocketEvents = GameWebSocketEvents.STATE_UPDATE
    revealed_steps: list[int]
    is_completed: bool
    last_updated_at: str


class TeamCompletedEvent(GameEvent):
    type: GameWebSocketEvents = GameWebSocketEvents.TEAM_COMPLETED
    team_name: str
    completed_at: str


class GameWonEvent(BaseModel):
    type: GameWebSocketEvents = GameWebSocketEvents.GAME_WON
    lobby_id: int
    winning_team_id: int
    winning_team_name: str


class AlreadySolvedEvent(GameEvent):
    type: GameWebSocketEvents = GameWebSocketEvents.ALREADY_SOLVED
    word_index: int


class TeamPlacedEvent(BaseModel):
    type: GameWebSocketEvents = GameWebSocketEvents.TEAM_PLACED
    lobby_id: int
    team_id: int
    team_name: str
    placement: int
    completed_at: str


class RoundEndedEvent(BaseModel):
    type: GameWebSocketEvents = GameWebSocketEvents.ROUND_ENDED
    lobby_id: int
    round_number: int
    results: list[dict]  # Summary data with placements and points


class NewRoundStartedEvent(BaseModel):
    type: GameWebSocketEvents = GameWebSocketEvents.NEW_ROUND_STARTED
    lobby_id: int
    game_id: int
    round_number: int
