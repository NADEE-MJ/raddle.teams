from enum import Enum


class GameState(str, Enum):
    """Possible game states."""

    LOBBY = "lobby"
    TEAM_SETUP = "team_setup"
    ACTIVE = "active"
    FINISHED = "finished"
