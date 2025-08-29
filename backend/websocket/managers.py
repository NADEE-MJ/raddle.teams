import json
from typing import Dict, TypedDict

from fastapi import WebSocket

from backend.websocket.events import JoinedLobbyEvent, LobbyEvent
from custom_logging import file_logger


class AdminWebSocketConnection(TypedDict):
    websocket: WebSocket
    subscribed_lobbies: list[int]


class AdminWebSocketManager:
    def __init__(self):
        # keyed by web_session_id
        self.admin_websockets: Dict[str, AdminWebSocketConnection] = {}

    async def connect(self, websocket: WebSocket, web_session_id: str):
        await websocket.accept()
        self.admin_websockets[web_session_id] = {
            "websocket": websocket,
            "subscribed_lobbies": [],
        }

    async def broadcast_to_lobby(self, lobby_id: int, event: LobbyEvent):
        for connection in self.admin_websockets.values():
            if lobby_id in connection["subscribed_lobbies"]:
                await connection["websocket"].send_text(json.dumps(event.model_dump()))

    async def continuous_listening(self, websocket: WebSocket):
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)

            file_logger.debug(f"Received message: {message}")

            # TODO maybe use this
            # # Echo message to all team members
            # await self.broadcast_to_all(
            #     {
            #         "player_session_id": player_session_id,
            #         "message": message,
            #     },
            # )

    async def disconnect(self, web_session_id: str):
        connection = self.admin_websockets.pop(web_session_id, None)
        if connection:
            try:
                # Try to close the WebSocket gracefully
                await connection["websocket"].close()
            except Exception:
                # WebSocket might already be closed, ignore the error
                pass


admin_web_socket_manager = AdminWebSocketManager()


class LobbyWebSocketManager:
    def __init__(self, admin_web_socket_manager: AdminWebSocketManager):
        self.lobby_websockets: Dict[int, Dict[str, WebSocket]] = {}
        """
        lobby_websockets looks like:
        {
            lobby_id: {
                player_session_id: websocket
            }
        }
        """
        self.admin_web_socket_manager = admin_web_socket_manager

    async def connect(
        self, websocket: WebSocket, lobby_id: int, player_session_id: str
    ):
        await websocket.accept()

        self.lobby_websockets.setdefault(lobby_id, {})[player_session_id] = websocket

        await self.broadcast_to_lobby(
            lobby_id,
            JoinedLobbyEvent(lobby_id=lobby_id, player_session_id=player_session_id),
        )

    async def disconnect(self, lobby_id: int, player_session_id: str):
        if lobby_id in self.lobby_websockets:
            websocket = self.lobby_websockets[lobby_id].pop(player_session_id, None)
            if websocket:
                try:
                    # Try to close the WebSocket gracefully
                    await websocket.close()
                except Exception:
                    # WebSocket might already be closed, ignore the error
                    pass

    # async def broadcast_to_session(
    #     self, lobby_id: int, player_session_id: str, event: LobbyEvent
    # ):
    #     websocket = self.lobby_websockets.get(lobby_id, {}).get(player_session_id)
    #     if websocket:
    #         await websocket.send_text(json.dumps(event.model_dump()))
    #     else:
    #         # TODO catch this
    #         raise ValueError("WebSocket is not connected")

    async def broadcast_to_lobby(self, lobby_id: int, event: LobbyEvent):
        for websocket in self.lobby_websockets.get(lobby_id, {}).values():
            try:
                await websocket.send_text(json.dumps(event.model_dump()))
            except Exception:
                # TODO not sure about this
                # Ignore failed sends, cleanup will happen elsewhere
                pass
        await self.admin_web_socket_manager.broadcast_to_lobby(lobby_id, event)

    async def continuous_listening(self, websocket: WebSocket):
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)

            file_logger.debug(f"Received message: {message}")

            # TODO maybe use this
            # # Echo message to all team members
            # await self.broadcast_to_all(
            #     {
            #         "player_session_id": player_session_id,
            #         "message": message,
            #     },
            # )


lobby_websocket_manager = LobbyWebSocketManager(
    admin_web_socket_manager=admin_web_socket_manager
)
