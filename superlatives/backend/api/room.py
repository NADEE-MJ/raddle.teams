"""Room API endpoints for players."""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from backend.custom_logging import api_logger
from backend.database import get_session
from backend.database.models import PersonInPool, Player, Room, Score
from backend.dependencies import require_player_session
from backend.schemas import MessageResponse, PlayerJoinResponse, PlayerJoinRequest, RoomInfo
from backend.websocket.events import PlayerJoinedEvent
from backend.websocket.managers import room_websocket_manager

router = APIRouter(prefix="/api/room", tags=["room"])


@router.post("", response_model=PlayerJoinResponse)
async def join_room(request: PlayerJoinRequest, db: Session = Depends(get_session)):
    """Join a room as a player."""
    # Find room by code
    room = db.exec(select(Room).where(Room.code == request.room_code.upper())).first()
    if not room:
        api_logger.warning(f"Room not found: code={request.room_code}")
        raise HTTPException(status_code=404, detail="Room not found")

    # Check if player name is already taken in this room
    existing_player = db.exec(
        select(Player).where(Player.room_id == room.id, Player.name == request.name)
    ).first()
    if existing_player:
        api_logger.warning(f"Player name already taken: room={room.id} name={request.name}")
        raise HTTPException(status_code=400, detail="Player name already taken in this room")

    # Check if this is the first player (becomes host)
    existing_players = db.exec(select(Player).where(Player.room_id == room.id)).all()
    is_first_player = len(existing_players) == 0

    # Create player
    session_id = str(uuid.uuid4())
    player = Player(name=request.name, session_id=session_id, room_id=room.id, is_host=is_first_player)
    db.add(player)
    db.flush()  # Flush to get player.id

    # If this is the first player, set them as host on the room
    if is_first_player:
        room.host_player_id = player.id

    # Add player to people pool
    person = PersonInPool(room_id=room.id, name=request.name, is_player=True, player_id=player.id)
    db.add(person)

    # Create score entry
    score = Score(player_id=player.id, room_id=room.id)
    db.add(score)

    db.commit()
    db.refresh(player)
    db.refresh(room)

    api_logger.info(f"Player joined room: player_id={player.id} room={room.id}")

    # Broadcast to all clients in the room
    event = PlayerJoinedEvent(room_id=room.id, player_id=player.id, player_name=player.name, is_host=player.is_host)
    await room_websocket_manager.broadcast_to_room(room.id, event)

    return PlayerJoinResponse(session_id=session_id, player=player, room=room)


@router.get("", response_model=RoomInfo)
def get_current_room(player: Player = Depends(require_player_session), db: Session = Depends(get_session)):
    """Get current player's room information."""
    room = db.get(Room, player.room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    players = db.exec(select(Player).where(Player.room_id == room.id)).all()
    people_pool = db.exec(select(PersonInPool).where(PersonInPool.room_id == room.id)).all()
    questions = db.exec(select(Room).where(Room.id == room.id)).first()
    scores = db.exec(select(Score).where(Score.room_id == room.id)).all()

    from backend.database.models import Question

    all_questions = db.exec(select(Question).where(Question.room_id == room.id)).all()

    return RoomInfo(room=room, players=list(players), people_pool=list(people_pool), questions=list(all_questions), scores=list(scores))


@router.get("/{room_code}", response_model=RoomInfo)
def get_room_by_code(room_code: str, db: Session = Depends(get_session)):
    """Get room information by room code (public endpoint for display view)."""
    room = db.exec(select(Room).where(Room.code == room_code.upper())).first()
    if not room:
        api_logger.warning(f"Room not found: code={room_code}")
        raise HTTPException(status_code=404, detail="Room not found")

    players = db.exec(select(Player).where(Player.room_id == room.id)).all()
    people_pool = db.exec(select(PersonInPool).where(PersonInPool.room_id == room.id)).all()
    scores = db.exec(select(Score).where(Score.room_id == room.id)).all()

    from backend.database.models import Question

    all_questions = db.exec(select(Question).where(Question.room_id == room.id)).all()

    return RoomInfo(room=room, players=list(players), people_pool=list(people_pool), questions=list(all_questions), scores=list(scores))


@router.delete("", response_model=MessageResponse)
def leave_room(player: Player = Depends(require_player_session), db: Session = Depends(get_session)):
    """Leave the current room."""
    # Remove from people pool
    person = db.exec(
        select(PersonInPool).where(PersonInPool.room_id == player.room_id, PersonInPool.player_id == player.id)
    ).first()
    if person:
        db.delete(person)

    # If player is host, we might want to transfer host or delete room
    # For now, just remove player
    db.delete(player)
    db.commit()

    api_logger.info(f"Player left room: player_id={player.id}")
    return MessageResponse(status=True, message="Left room successfully")
