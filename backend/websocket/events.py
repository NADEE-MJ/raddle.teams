from enum import Enum
from typing import Dict, Optional

from pydantic import BaseModel

####################################################################
# ? LOBBY EVENTS
####################################################################


class LobbyWebSocketEvents(str, Enum):
    CONNECTION_CONFIRMED = "connection_confirmed"
    GAME_STARTED = "game_started"
    GAME_STATE_CHANGED = "game_state_changed"
    NEW_LOBBY_CREATED = "new_lobby_created"
    TEAM_ASSIGNED = "team_assigned"
    TEAM_CHANGED = "team_changed"
    TEAMS_UPDATED = "teams_updated"
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
# ? GAME EVENTS
####################################################################


class GameWebSocketEvents(str, Enum):
    GAME_CREATED = "game_created"
    GAME_STARTED = "game_started"
    GAME_FINISHED = "game_finished"
    TEAM_PROGRESS_UPDATE = "team_progress_update"
    GUESS_SUBMITTED = "guess_submitted"
    WORD_SOLVED = "word_solved"
    TEAM_COMPLETED = "team_completed"
    LEADERBOARD_UPDATE = "leaderboard_update"


class GameEvent(BaseModel):
    game_id: int
    lobby_id: int
    type: GameWebSocketEvents


class GameCreatedEvent(GameEvent):
    type: GameWebSocketEvents = GameWebSocketEvents.GAME_CREATED
    puzzle_name: str
    state: str


class GameStartedEvent(GameEvent):
    type: GameWebSocketEvents = GameWebSocketEvents.GAME_STARTED


class GameFinishedEvent(GameEvent):
    type: GameWebSocketEvents = GameWebSocketEvents.GAME_FINISHED
    winning_team_id: Optional[int] = None
    winning_team_name: Optional[str] = None


class GuessSubmittedEvent(GameEvent):
    type: GameWebSocketEvents = GameWebSocketEvents.GUESS_SUBMITTED
    team_id: int
    player_id: int
    player_name: str
    word_index: int
    direction: str
    guess: str
    is_correct: bool


class WordSolvedEvent(GameEvent):
    type: GameWebSocketEvents = GameWebSocketEvents.WORD_SOLVED
    team_id: int
    team_name: str
    word_index: int
    word: str
    solved_by_player_id: int
    solved_by_player_name: str


class TeamProgressUpdateEvent(GameEvent):
    type: GameWebSocketEvents = GameWebSocketEvents.TEAM_PROGRESS_UPDATE
    team_id: int
    team_name: str
    current_word_index: int
    completed_at: Optional[str] = None


class TeamCompletedEvent(GameEvent):
    type: GameWebSocketEvents = GameWebSocketEvents.TEAM_COMPLETED
    team_id: int
    team_name: str
    completed_at: str
    completion_rank: int


class LeaderboardUpdateEvent(GameEvent):
    type: GameWebSocketEvents = GameWebSocketEvents.LEADERBOARD_UPDATE
    leaderboard: list


####################################################################
# ? ADMIN EVENTS
####################################################################
