from enum import Enum

from pydantic import BaseModel


####################################################################
# ROOM EVENTS
####################################################################
class RoomWebSocketEvents(str, Enum):
    CONNECTION_CONFIRMED = "connection_confirmed"
    PLAYER_JOINED = "player_joined"
    PLAYER_LEFT = "player_left"
    PLAYER_KICKED = "player_kicked"
    PERSON_ADDED_TO_POOL = "person_added_to_pool"
    PERSON_REMOVED_FROM_POOL = "person_removed_from_pool"
    PERSON_NICKNAME_UPDATED = "person_nickname_updated"
    ROOM_STATE_UPDATED = "room_state_updated"
    GAME_STARTED = "game_started"
    ROUND_STARTED = "round_started"
    ROUND_ENDED = "round_ended"
    GAME_COMPLETED = "game_completed"
    ROOM_DELETED = "room_deleted"


class RoomEvent(BaseModel):
    room_id: int
    type: RoomWebSocketEvents


class ConnectionConfirmedEvent(RoomEvent):
    type: RoomWebSocketEvents = RoomWebSocketEvents.CONNECTION_CONFIRMED
    player_session_id: str
    client_type: str  # "display", "player", "host"


class PlayerJoinedEvent(RoomEvent):
    type: RoomWebSocketEvents = RoomWebSocketEvents.PLAYER_JOINED
    player_id: int
    player_name: str
    is_host: bool


class PlayerLeftEvent(RoomEvent):
    type: RoomWebSocketEvents = RoomWebSocketEvents.PLAYER_LEFT
    player_id: int
    player_name: str


class PlayerKickedEvent(RoomEvent):
    type: RoomWebSocketEvents = RoomWebSocketEvents.PLAYER_KICKED
    player_id: int
    player_name: str


class PersonAddedToPoolEvent(RoomEvent):
    type: RoomWebSocketEvents = RoomWebSocketEvents.PERSON_ADDED_TO_POOL
    person_name: str
    is_player: bool


class PersonRemovedFromPoolEvent(RoomEvent):
    type: RoomWebSocketEvents = RoomWebSocketEvents.PERSON_REMOVED_FROM_POOL
    person_name: str


class PersonNicknameUpdatedEvent(RoomEvent):
    type: RoomWebSocketEvents = RoomWebSocketEvents.PERSON_NICKNAME_UPDATED
    old_name: str
    new_name: str


class RoomStateUpdatedEvent(RoomEvent):
    type: RoomWebSocketEvents = RoomWebSocketEvents.ROOM_STATE_UPDATED
    status: str  # lobby, question_submission, voting, results, completed
    current_round: int


class GameStartedEvent(RoomEvent):
    type: RoomWebSocketEvents = RoomWebSocketEvents.GAME_STARTED
    round_number: int


class RoundStartedEvent(RoomEvent):
    type: RoomWebSocketEvents = RoomWebSocketEvents.ROUND_STARTED
    round_number: int


class RoundEndedEvent(RoomEvent):
    type: RoomWebSocketEvents = RoomWebSocketEvents.ROUND_ENDED
    round_number: int


class GameCompletedEvent(RoomEvent):
    type: RoomWebSocketEvents = RoomWebSocketEvents.GAME_COMPLETED
    final_scores: dict  # player_id -> total_score


class RoomDeletedEvent(RoomEvent):
    type: RoomWebSocketEvents = RoomWebSocketEvents.ROOM_DELETED


####################################################################
# GAME EVENTS
####################################################################
class GameWebSocketEvents(str, Enum):
    QUESTION_SUBMISSION_STARTED = "question_submission_started"
    QUESTION_SUBMITTED = "question_submitted"
    QUESTION_SUBMISSION_COMPLETE = "question_submission_complete"
    VOTING_STARTED = "voting_started"
    VOTE_SUBMITTED = "vote_submitted"
    VOTING_COMPLETE = "voting_complete"
    RESULTS_READY = "results_ready"
    TIE_DETECTED = "tie_detected"
    REVOTE_STARTED = "revote_started"
    POINTS_AWARDED = "points_awarded"


class GameEvent(BaseModel):
    room_id: int
    type: GameWebSocketEvents


class QuestionSubmissionStartedEvent(GameEvent):
    type: GameWebSocketEvents = GameWebSocketEvents.QUESTION_SUBMISSION_STARTED
    round_number: int


class QuestionSubmittedEvent(GameEvent):
    type: GameWebSocketEvents = GameWebSocketEvents.QUESTION_SUBMITTED
    player_id: int
    player_name: str
    total_submitted: int
    total_players: int


class QuestionSubmissionCompleteEvent(GameEvent):
    type: GameWebSocketEvents = GameWebSocketEvents.QUESTION_SUBMISSION_COMPLETE
    total_questions: int


class VotingStartedEvent(GameEvent):
    type: GameWebSocketEvents = GameWebSocketEvents.VOTING_STARTED
    question_id: int
    question_text: str
    duration_seconds: int
    started_at: str  # ISO timestamp


class VoteSubmittedEvent(GameEvent):
    type: GameWebSocketEvents = GameWebSocketEvents.VOTE_SUBMITTED
    voter_id: int
    voter_name: str
    total_voted: int
    total_voters: int


class VotingCompleteEvent(GameEvent):
    type: GameWebSocketEvents = GameWebSocketEvents.VOTING_COMPLETE
    question_id: int


class ResultsReadyEvent(GameEvent):
    type: GameWebSocketEvents = GameWebSocketEvents.RESULTS_READY
    question_id: int
    question_text: str
    votes_by_person: dict[str, int]  # person_name -> vote_count
    winner: str | None
    is_tie: bool
    tied_people: list[str]


class TieDetectedEvent(GameEvent):
    type: GameWebSocketEvents = GameWebSocketEvents.TIE_DETECTED
    question_id: int
    tied_people: list[str]


class RevoteStartedEvent(GameEvent):
    type: GameWebSocketEvents = GameWebSocketEvents.REVOTE_STARTED
    question_id: int
    tied_people: list[str]


class PointsAwardedEvent(GameEvent):
    type: GameWebSocketEvents = GameWebSocketEvents.POINTS_AWARDED
    player_id: int
    player_name: str
    points: int
    reason: str  # "majority_vote", "speed_bonus"
