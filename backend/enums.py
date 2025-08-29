from enum import Enum


class GameState(str, Enum):
    LOBBY = "lobby"
    ACTIVE = "active"
    FINISHED = "finished"
