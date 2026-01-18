"""WebSocket API endpoints."""

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from sqlmodel import select

from backend.custom_logging import websocket_logger
from backend.database import get_session_context
from backend.database.models import Player
from backend.websocket.events import ConnectionConfirmedEvent
from backend.websocket.managers import ClientType, admin_websocket_manager, room_websocket_manager

router = APIRouter(tags=["websocket"])


@router.websocket("/ws/admin")
async def admin_websocket(websocket: WebSocket, token: str = Query(...)):
    """Admin WebSocket connection for monitoring."""
    from backend.settings import settings

    # Verify admin token
    if token != settings.ADMIN_PASSWORD:
        websocket_logger.warning("Admin websocket connection rejected: invalid token")
        await websocket.close(code=1008, reason="Invalid admin token")
        return

    # Generate a session ID for this admin connection
    import uuid

    web_session_id = str(uuid.uuid4())

    try:
        await admin_websocket_manager.connect(websocket, web_session_id)
        websocket_logger.info(f"Admin websocket connected: session={web_session_id}")

        # Listen for messages
        await admin_websocket_manager.continuous_listening(websocket, web_session_id)

    except WebSocketDisconnect:
        websocket_logger.info(f"Admin websocket disconnected: session={web_session_id}")
    except Exception as e:
        websocket_logger.exception(f"Admin websocket error: {e}")
    finally:
        await admin_websocket_manager.disconnect(web_session_id)


@router.websocket("/ws/room/{room_id}")
async def room_websocket(
    websocket: WebSocket, room_id: int, session_id: str = Query(...), client_type: ClientType = Query("player")
):
    """Room WebSocket connection for players, displays, and hosts."""
    # Verify session_id belongs to a player in this room
    async with get_session_context() as session:
        player = session.exec(select(Player).where(Player.session_id == session_id)).first()

        if not player:
            websocket_logger.warning(f"WebSocket connection rejected: invalid session_id={session_id}")
            await websocket.close(code=1008, reason="Invalid session")
            return

        if player.room_id != room_id:
            websocket_logger.warning(
                f"WebSocket connection rejected: player room mismatch (expected {room_id}, got {player.room_id})"
            )
            await websocket.close(code=1008, reason="Room mismatch")
            return

    try:
        await room_websocket_manager.connect(websocket, room_id, session_id, client_type)
        websocket_logger.info(f"Room websocket connected: room={room_id} session={session_id} type={client_type}")

        # Send connection confirmation
        confirm_event = ConnectionConfirmedEvent(
            room_id=room_id, player_session_id=session_id, client_type=client_type
        )
        await room_websocket_manager.send_to_player(room_id, session_id, confirm_event)

        # Listen for messages
        await room_websocket_manager.continuous_listening(websocket, room_id, session_id)

    except WebSocketDisconnect:
        websocket_logger.info(f"Room websocket disconnected: room={room_id} session={session_id}")
    except Exception as e:
        websocket_logger.exception(f"Room websocket error: {e}")
    finally:
        await room_websocket_manager.disconnect(room_id, session_id)
