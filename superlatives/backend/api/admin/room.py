"""Admin room management endpoints (monitoring and emergency actions)."""

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from backend.custom_logging import api_logger
from backend.database import get_session
from backend.database.models import PersonInPool, Player, Question, Room, Score
from backend.dependencies import check_admin_token
from backend.schemas import MessageResponse, RoomInfo

router = APIRouter(prefix="/api/admin/room", tags=["admin"])


@router.get("", dependencies=[Depends(check_admin_token)])
def list_rooms(db: Session = Depends(get_session)):
    """List all rooms (monitoring)."""
    rooms = db.exec(select(Room)).all()
    return [
        {
            "id": room.id,
            "code": room.code,
            "name": room.name,
            "status": room.status,
            "current_round": room.current_round,
            "created_at": room.created_at.isoformat(),
        }
        for room in rooms
    ]


@router.get("/{room_id}", dependencies=[Depends(check_admin_token)], response_model=RoomInfo)
def get_room_details(room_id: int, db: Session = Depends(get_session)):
    """Get detailed room information (monitoring)."""
    room = db.get(Room, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    players = db.exec(select(Player).where(Player.room_id == room_id)).all()
    people_pool = db.exec(select(PersonInPool).where(PersonInPool.room_id == room_id)).all()
    questions = db.exec(select(Question).where(Question.room_id == room_id)).all()
    scores = db.exec(select(Score).where(Score.room_id == room_id)).all()

    return RoomInfo(
        room=room, players=list(players), people_pool=list(people_pool), questions=list(questions), scores=list(scores)
    )


@router.delete("/{room_id}", dependencies=[Depends(check_admin_token)], response_model=MessageResponse)
def delete_room(room_id: int, db: Session = Depends(get_session)):
    """Delete a room (emergency cleanup)."""
    room = db.get(Room, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    db.delete(room)
    db.commit()

    api_logger.info(f"Admin deleted room: room_id={room_id}")
    return MessageResponse(status=True, message=f"Room {room_id} deleted")


@router.delete("/{room_id}/player/{player_id}", dependencies=[Depends(check_admin_token)], response_model=MessageResponse)
def kick_player(room_id: int, player_id: int, db: Session = Depends(get_session)):
    """Kick a player from a room (emergency)."""
    player = db.get(Player, player_id)
    if not player or player.room_id != room_id:
        raise HTTPException(status_code=404, detail="Player not found in this room")

    # Remove from people pool
    person = db.exec(
        select(PersonInPool).where(PersonInPool.room_id == room_id, PersonInPool.player_id == player_id)
    ).first()
    if person:
        db.delete(person)

    db.delete(player)
    db.commit()

    api_logger.info(f"Admin kicked player: room={room_id} player={player_id}")
    return MessageResponse(status=True, message="Player kicked")


@router.post("/{room_id}/force-advance", dependencies=[Depends(check_admin_token)], response_model=MessageResponse)
def force_advance_phase(room_id: int, db: Session = Depends(get_session)):
    """Force advance to next phase (emergency)."""
    room = db.get(Room, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    # Simple phase advancement
    if room.status == "lobby":
        room.status = "question_submission"
        room.current_round = 1
    elif room.status == "question_submission":
        room.status = "voting"
    elif room.status == "voting":
        room.status = "results"
    elif room.status == "results":
        room.status = "question_submission"

    db.commit()

    api_logger.info(f"Admin force advance: room={room_id} new_status={room.status}")
    return MessageResponse(status=True, message=f"Advanced to {room.status}")


@router.post("/{room_id}/reset", dependencies=[Depends(check_admin_token)], response_model=MessageResponse)
def reset_room_to_lobby(room_id: int, db: Session = Depends(get_session)):
    """Reset room to lobby (emergency)."""
    room = db.get(Room, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    room.status = "lobby"
    room.current_round = 0
    room.current_question_id = None
    room.voting_started_at = None
    db.commit()

    api_logger.info(f"Admin reset room: room={room_id}")
    return MessageResponse(status=True, message="Room reset to lobby")
