from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from backend.websocket.managers import lobby_websocket_manager

router = APIRouter()

# @router.websocket("/ws/admin")
# async def admin_websocket(websocket: WebSocket):
#     # need to make sure only admins can access this route
#     await websocket.accept()
#     # Handle admin-specific websocket logic here


@router.websocket("/ws/{lobby_id}/{player_session_id}")
async def lobby_websocket(websocket: WebSocket, lobby_id: int, player_session_id: str):
    await lobby_websocket_manager.connect(
        websocket, lobby_id=lobby_id, player_session_id=player_session_id
    )

    try:
        await lobby_websocket_manager.continuous_listening(websocket)
    except WebSocketDisconnect:
        lobby_websocket_manager.disconnect(websocket)
    except Exception:
        # TODO: Handle other exceptions in a better way
        lobby_websocket_manager.disconnect(websocket)


# @router.websocket("/ws/{team_id}/{player_session_id}")
# async def team_websocket(websocket: WebSocket, team_id: int, player_session_id: str):
#     pass
