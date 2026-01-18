from pydantic import BaseModel, Field

from backend.database.models import PersonInPool, Player, Question, Room, Score, Vote


#############################################################################
# Request Models
#############################################################################
class PlayerJoinRequest(BaseModel):
    name: str
    room_code: str


class RoomCreateRequest(BaseModel):
    host_name: str
    room_name: str | None = None


class LobbyCreateRequest(BaseModel):
    room_name: str | None = None


class QuestionSubmitRequest(BaseModel):
    question_text: str = Field(..., max_length=200)


class VoteSubmitRequest(BaseModel):
    question_id: int
    voted_for_name: str


class PersonAddRequest(BaseModel):
    person_name: str


class NicknameUpdateRequest(BaseModel):
    old_name: str
    new_name: str


class HostStartGameRequest(BaseModel):
    pass


class HostStartRoundRequest(BaseModel):
    round_number: int


class HostStartVotingRequest(BaseModel):
    question_id: int


class HostEndVotingRequest(BaseModel):
    question_id: int


#############################################################################
# Response Models
#############################################################################
class RoomInfo(BaseModel):
    room: Room
    players: list[Player]
    people_pool: list[PersonInPool]
    questions: list[Question]
    scores: list[Score]


class MessageResponse(BaseModel):
    status: bool
    message: str


class LobbyCreateResponse(BaseModel):
    room_code: str
    room_name: str


class GeneratedNameResponse(BaseModel):
    name: str


class ApiRootResponse(BaseModel):
    message: str
    timestamp: str
    documentation_endpoints: dict[str, str]


class AdminAuthenticatedResponse(BaseModel):
    session_id: str


class PlayerJoinResponse(BaseModel):
    session_id: str
    player: Player
    room: Room


class QuestionSubmitResponse(BaseModel):
    question: Question


class VoteSubmitResponse(BaseModel):
    vote: Vote


class VoteResults(BaseModel):
    question_id: int
    question_text: str
    votes_by_person: dict[str, int]  # person_name -> vote_count
    total_votes: int
    winner: str | None  # None if tie
    is_tie: bool
    tied_people: list[str]  # Empty if no tie
    fastest_voter: Player | None  # Player who voted first (for speed bonus)


class RoundScores(BaseModel):
    round_number: int
    scores: list[Score]
