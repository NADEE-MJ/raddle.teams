from custom_logging import websocket_logger
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect

from backend.dependencies import check_admin_token_query
from backend.websocket.managers import admin_web_socket_manager, lobby_websocket_manager

router = APIRouter()


@router.websocket("/admin/{web_session_id}")
async def admin_websocket(
    websocket: WebSocket,
    web_session_id: str,
    is_admin: bool = Depends(check_admin_token_query),
):
    websocket_logger.info(
        f"Admin websocket endpoint invoked: web_session_id={web_session_id} is_admin={is_admin}"
    )
    # Handle admin-specific websocket logic here
    try:
        await admin_web_socket_manager.connect(websocket, web_session_id)
    except Exception:
        websocket_logger.exception(
            f"Failed to establish admin websocket connection: web_session_id={web_session_id}"
        )
        # Unable to accept/connect, nothing more to do
        return

    try:
        await admin_web_socket_manager.continuous_listening(websocket)
    except WebSocketDisconnect:
        websocket_logger.info(
            f"Admin websocket disconnected (WebSocketDisconnect): web_session_id={web_session_id}"
        )
        await admin_web_socket_manager.disconnect(web_session_id)
    except Exception:
        websocket_logger.exception(
            f"Unexpected error in admin websocket: web_session_id={web_session_id}"
        )
        await admin_web_socket_manager.disconnect(web_session_id)


@router.websocket("/lobby/{lobby_id}/player/{player_session_id}")
async def lobby_websocket(websocket: WebSocket, lobby_id: int, player_session_id: str):
    websocket_logger.info(
        f"Player websocket endpoint invoked: lobby_id={lobby_id} player_session_id={player_session_id}"
    )
    try:
        await lobby_websocket_manager.connect(
            websocket, lobby_id=lobby_id, player_session_id=player_session_id
        )
    except Exception:
        websocket_logger.exception(
            f"Failed to establish player websocket: lobby_id={lobby_id} player_session_id={player_session_id}"
        )
        return

    try:
        await lobby_websocket_manager.continuous_listening(websocket)
    except WebSocketDisconnect:
        websocket_logger.info(
            f"Player websocket disconnected (WebSocketDisconnect): lobby_id={lobby_id} player_session_id={player_session_id}"
        )
        await lobby_websocket_manager.disconnect(
            lobby_id=lobby_id, player_session_id=player_session_id
        )
    except Exception:
        websocket_logger.exception(
            f"Unexpected error in player websocket: lobby_id={lobby_id} player_session_id={player_session_id}"
        )
        await lobby_websocket_manager.disconnect(
            lobby_id=lobby_id, player_session_id=player_session_id
        )
