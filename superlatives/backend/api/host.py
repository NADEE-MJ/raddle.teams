"""Host API endpoints for game control."""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from backend.custom_logging import api_logger
from backend.database import get_session
from backend.database.models import PersonInPool, Player, Question, Room, Score
from backend.dependencies import require_host_session
from backend.game.state_machine import SuperlativesStateMachine
from backend.schemas import (
    HostEndVotingRequest,
    HostStartGameRequest,
    HostStartRoundRequest,
    HostStartVotingRequest,
    LobbyCreateRequest,
    LobbyCreateResponse,
    MessageResponse,
    NicknameUpdateRequest,
    PersonAddRequest,
    PlayerJoinResponse,
    RoomCreateRequest,
)
from backend.game.game_manager import game_manager
from backend.utils.name_generator import generate_room_code, generate_room_name
from backend.websocket.events import GameStartedEvent, PersonAddedToPoolEvent, PersonRemovedFromPoolEvent, PlayerJoinedEvent
from backend.websocket.managers import room_websocket_manager

router = APIRouter(prefix="/api/host", tags=["host"])


@router.post("/lobby", response_model=LobbyCreateResponse)
async def create_lobby(request: LobbyCreateRequest, db: Session = Depends(get_session)):
    """Create a new lobby without joining as a player yet."""
    # Generate room code
    code = generate_room_code()
    while db.exec(select(Room).where(Room.code == code)).first():
        code = generate_room_code()

    # Generate room name if not provided
    room_name = request.room_name if request.room_name else generate_room_name()

    # Create room
    room = Room(code=code, name=room_name, status="lobby", current_round=0)
    db.add(room)
    db.commit()
    db.refresh(room)

    api_logger.info(f"Lobby created: room_id={room.id} code={room.code}")

    return LobbyCreateResponse(room_code=room.code, room_name=room.name)


@router.post("/room", response_model=PlayerJoinResponse)
async def create_room(request: RoomCreateRequest, db: Session = Depends(get_session)):
    """Create a new room (host becomes first player)."""
    # Generate room code
    code = generate_room_code()
    while db.exec(select(Room).where(Room.code == code)).first():
        code = generate_room_code()

    # Generate room name if not provided
    room_name = request.room_name if request.room_name else generate_room_name()

    # Create room
    room = Room(code=code, name=room_name, status="lobby", current_round=0)
    db.add(room)
    db.flush()  # Get room.id

    # Create host player
    session_id = str(uuid.uuid4())
    player = Player(name=request.host_name, session_id=session_id, room_id=room.id, is_host=True)
    db.add(player)
    db.flush()  # Get player.id

    # Set host_player_id on room
    room.host_player_id = player.id

    # Add host to people pool
    person = PersonInPool(room_id=room.id, name=request.host_name, is_player=True, player_id=player.id)
    db.add(person)

    # Create score entry
    score = Score(player_id=player.id, room_id=room.id)
    db.add(score)

    db.commit()
    db.refresh(room)
    db.refresh(player)

    api_logger.info(f"Room created: room_id={room.id} code={room.code} host={player.id}")

    # Broadcast to all clients in the room
    event = PlayerJoinedEvent(room_id=room.id, player_id=player.id, player_name=player.name, is_host=player.is_host)
    await room_websocket_manager.broadcast_to_room(room.id, event)

    return PlayerJoinResponse(session_id=session_id, player=player, room=room)


@router.post("/people-pool", response_model=MessageResponse)
async def add_person_to_pool(
    request: PersonAddRequest, host: Player = Depends(require_host_session), db: Session = Depends(get_session)
):
    """Add a non-present person to the people pool."""
    # Check if name already exists
    existing = db.exec(
        select(PersonInPool).where(PersonInPool.room_id == host.room_id, PersonInPool.name == request.person_name)
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Person name already exists in pool")

    # Check limit (max 20 non-players)
    non_players = db.exec(
        select(PersonInPool).where(PersonInPool.room_id == host.room_id, PersonInPool.is_player == False)
    ).all()

    if len(non_players) >= 20:
        raise HTTPException(status_code=400, detail="Maximum 20 non-present people allowed")

    # Add person
    person = PersonInPool(room_id=host.room_id, name=request.person_name, is_player=False)
    db.add(person)
    db.commit()

    api_logger.info(f"Person added to pool: room={host.room_id} name={request.person_name}")

    # Broadcast to all clients in the room
    event = PersonAddedToPoolEvent(room_id=host.room_id, person_name=request.person_name, is_player=False)
    await room_websocket_manager.broadcast_to_room(host.room_id, event)

    return MessageResponse(status=True, message=f"Added {request.person_name} to people pool")


@router.delete("/people-pool/{name}", response_model=MessageResponse)
async def remove_person_from_pool(name: str, host: Player = Depends(require_host_session), db: Session = Depends(get_session)):
    """Remove a non-present person from the people pool."""
    person = db.exec(
        select(PersonInPool).where(
            PersonInPool.room_id == host.room_id, PersonInPool.name == name, PersonInPool.is_player == False
        )
    ).first()

    if not person:
        raise HTTPException(status_code=404, detail="Person not found in pool (or is an active player)")

    db.delete(person)
    db.commit()

    api_logger.info(f"Person removed from pool: room={host.room_id} name={name}")

    # Broadcast to all clients in the room
    event = PersonRemovedFromPoolEvent(room_id=host.room_id, person_name=name)
    await room_websocket_manager.broadcast_to_room(host.room_id, event)

    return MessageResponse(status=True, message=f"Removed {name} from people pool")


@router.post("/nickname", response_model=MessageResponse)
async def update_nickname(
    request: NicknameUpdateRequest, host: Player = Depends(require_host_session), db: Session = Depends(get_session)
):
    """Update a person's nickname in the people pool."""
    # Check if new name already exists
    existing = db.exec(
        select(PersonInPool).where(PersonInPool.room_id == host.room_id, PersonInPool.name == request.new_name)
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="New name already exists in pool")

    # Find person by old name
    person = db.exec(
        select(PersonInPool).where(PersonInPool.room_id == host.room_id, PersonInPool.name == request.old_name)
    ).first()

    if not person:
        raise HTTPException(status_code=404, detail="Person not found")

    # If this is a player, also update their player record
    if person.is_player and person.player_id:
        player = db.get(Player, person.player_id)
        if player:
            player.name = request.new_name

    # Update name in people pool
    person.name = request.new_name
    db.commit()

    api_logger.info(f"Nickname updated: room={host.room_id} old={request.old_name} new={request.new_name}")

    # Broadcast to all clients in the room
    from backend.websocket.events import PersonNicknameUpdatedEvent
    event = PersonNicknameUpdatedEvent(room_id=host.room_id, old_name=request.old_name, new_name=request.new_name)
    await room_websocket_manager.broadcast_to_room(host.room_id, event)

    return MessageResponse(status=True, message=f"Nickname updated from {request.old_name} to {request.new_name}")


@router.delete("/player/{player_id}", response_model=MessageResponse)
def kick_player(
    player_id: int, host: Player = Depends(require_host_session), db: Session = Depends(get_session)
):
    """Kick a player from the room."""
    player = db.get(Player, player_id)
    if not player or player.room_id != host.room_id:
        raise HTTPException(status_code=404, detail="Player not found")

    if player.is_host:
        raise HTTPException(status_code=400, detail="Cannot kick the host")

    # Remove from people pool
    person = db.exec(
        select(PersonInPool).where(PersonInPool.room_id == host.room_id, PersonInPool.player_id == player_id)
    ).first()
    if person:
        db.delete(person)

    db.delete(player)
    db.commit()

    api_logger.info(f"Player kicked: room={host.room_id} player={player_id}")
    return MessageResponse(status=True, message="Player kicked")


@router.post("/start-game", response_model=MessageResponse)
async def start_game(
    request: HostStartGameRequest, host: Player = Depends(require_host_session), db: Session = Depends(get_session)
):
    """Start the game from lobby."""
    room = db.get(Room, host.room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    if room.status != "lobby":
        raise HTTPException(status_code=400, detail="Game already started")

    # Check minimum players (at least 3 for a good game)
    players = db.exec(select(Player).where(Player.room_id == room.id)).all()
    if len(players) < 3:
        raise HTTPException(status_code=400, detail="Need at least 3 players to start")

    api_logger.info(f"Game started by host: room={room.id}")

    # Start the game via game manager (handles all state transitions automatically)
    await game_manager.start_game(room.id)

    return MessageResponse(status=True, message="Game started")


@router.post("/start-round", response_model=MessageResponse)
def start_round(
    request: HostStartRoundRequest, host: Player = Depends(require_host_session), db: Session = Depends(get_session)
):
    """Start a new round."""
    room = db.get(Room, host.room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    state_machine = SuperlativesStateMachine(db)
    success = state_machine.start_new_round(room.id)

    if not success:
        raise HTTPException(status_code=400, detail="Cannot start new round")

    api_logger.info(f"Round started: room={room.id} round={room.current_round}")
    return MessageResponse(status=True, message=f"Started round {room.current_round}")


@router.post("/start-voting", response_model=MessageResponse)
def start_voting(
    request: HostStartVotingRequest, host: Player = Depends(require_host_session), db: Session = Depends(get_session)
):
    """Start voting for a question."""
    room = db.get(Room, host.room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    question = db.get(Question, request.question_id)
    if not question or question.room_id != room.id:
        raise HTTPException(status_code=404, detail="Question not found")

    from datetime import datetime, timezone

    room.status = "voting"
    room.current_question_id = request.question_id
    room.voting_started_at = datetime.now(tz=timezone.utc)
    db.commit()

    api_logger.info(f"Voting started: room={room.id} question={request.question_id}")
    return MessageResponse(status=True, message="Voting started")


@router.post("/end-voting", response_model=MessageResponse)
def end_voting(
    request: HostEndVotingRequest, host: Player = Depends(require_host_session), db: Session = Depends(get_session)
):
    """End voting and show results."""
    room = db.get(Room, host.room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    question = db.get(Question, request.question_id)
    if not question or question.room_id != room.id:
        raise HTTPException(status_code=404, detail="Question not found")

    question.voting_completed = True
    room.status = "results"
    room.current_question_id = None
    db.commit()

    # Award points
    state_machine = SuperlativesStateMachine(db)
    state_machine.award_points(room.id, request.question_id)

    api_logger.info(f"Voting ended: room={room.id} question={request.question_id}")
    return MessageResponse(status=True, message="Voting ended, results shown")


@router.post("/force-advance", response_model=MessageResponse)
def force_advance(host: Player = Depends(require_host_session), db: Session = Depends(get_session)):
    """Force advance to next phase (emergency control)."""
    room = db.get(Room, host.room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    # Simple phase advancement
    if room.status == "question_submission":
        room.status = "voting"
    elif room.status == "voting":
        room.status = "results"
    elif room.status == "results":
        room.status = "question_submission"

    db.commit()

    api_logger.info(f"Force advance: room={room.id} new_status={room.status}")
    return MessageResponse(status=True, message=f"Advanced to {room.status}")


@router.get("/stats")
def get_stats(host: Player = Depends(require_host_session), db: Session = Depends(get_session)):
    """Get game statistics."""
    room = db.get(Room, host.room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    players = db.exec(select(Player).where(Player.room_id == room.id)).all()
    questions = db.exec(select(Question).where(Question.room_id == room.id)).all()
    scores = db.exec(select(Score).where(Score.room_id == room.id)).all()

    return {
        "room": room.model_dump(),
        "player_count": len(players),
        "question_count": len(questions),
        "scores": [s.model_dump() for s in scores],
    }
