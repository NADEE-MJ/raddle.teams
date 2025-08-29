from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from backend.websocket.managers import admin_web_socket_manager, lobby_websocket_manager
from settings import settings

router = APIRouter()


@router.websocket("/ws/admin/{web_session_id}")
async def admin_websocket(
    websocket: WebSocket,
    web_session_id: str,
    token: str = Query(...),
):
    # Validate admin token before accepting connection
    if not token or token != settings.ADMIN_PASSWORD:
        await websocket.close(code=4001, reason="Unauthorized")
        return

    # Handle admin-specific websocket logic here
    await admin_web_socket_manager.connect(websocket, web_session_id)

    try:
        await admin_web_socket_manager.continuous_listening(websocket)
    except WebSocketDisconnect:
        await admin_web_socket_manager.disconnect(web_session_id)
    except Exception:
        # TODO: Handle other exceptions in a better way
        await admin_web_socket_manager.disconnect(web_session_id)


@router.websocket("/ws/lobby/{lobby_id}/player/{player_session_id}")
async def lobby_websocket(websocket: WebSocket, lobby_id: int, player_session_id: str):
    await lobby_websocket_manager.connect(
        websocket, lobby_id=lobby_id, player_session_id=player_session_id
    )

    try:
        await lobby_websocket_manager.continuous_listening(websocket)
    except WebSocketDisconnect:
        await lobby_websocket_manager.disconnect(
            lobby_id=lobby_id, player_session_id=player_session_id
        )
    except Exception:
        # TODO: Handle other exceptions in a better way
        await lobby_websocket_manager.disconnect(
            lobby_id=lobby_id, player_session_id=player_session_id
        )


# @router.websocket("/ws/{team_id}/{player_session_id}")
# async def team_websocket(websocket: WebSocket, team_id: int, player_session_id: str):
#     pass
