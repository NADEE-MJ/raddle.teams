import json
from typing import Dict, Literal, TypedDict

from fastapi import WebSocket
from sqlmodel import select

from backend.custom_logging import websocket_logger
from backend.database import get_session_context
from backend.database.models import Player
from backend.websocket.events import PlayerKickedEvent, RoomEvent

ClientType = Literal["display", "player", "host"]


class RoomWebSocketConnection(TypedDict):
    websocket: WebSocket
    client_type: ClientType


class AdminWebSocketConnection(TypedDict):
    websocket: WebSocket
    subscribed_rooms: list[int]


class AdminWebSocketManager:
    """Manages admin WebSocket connections for monitoring multiple rooms."""

    def __init__(self):
        # keyed by web_session_id
        self.admin_websockets: Dict[str, AdminWebSocketConnection] = {}

    async def connect(self, websocket: WebSocket, web_session_id: str):
        try:
            await websocket.accept()
            websocket_logger.debug(f"Admin websocket.accept() succeeded: web_session_id={web_session_id}")
        except Exception:
            websocket_logger.exception(f"Admin websocket.accept() failed: web_session_id={web_session_id}")
            raise

        self.admin_websockets[web_session_id] = {
            "websocket": websocket,
            "subscribed_rooms": [],
        }
        websocket_logger.info(
            f"Admin connected: web_session_id={web_session_id}. Total admins={len(self.admin_websockets)}"
        )

    async def broadcast_to_room(self, room_id: int, event: RoomEvent):
        recipients = [conn for conn in self.admin_websockets.values() if room_id in conn["subscribed_rooms"]]
        websocket_logger.debug(
            f"Broadcasting event to admins for room={room_id}. Event={event.model_dump()}. Recipients={len(recipients)}"
        )
        if not recipients:
            websocket_logger.debug("No admin connections available")
        for connection in recipients:
            try:
                await connection["websocket"].send_text(json.dumps(event.model_dump()))
                websocket_logger.debug("Sent event to admin websocket")
            except Exception:
                websocket_logger.exception("Failed to send event to admin websocket; continuing.")

    async def subscribe_to_room(self, web_session_id: str, room_id: int):
        connection = self.admin_websockets.get(web_session_id)
        if not connection:
            websocket_logger.warning(
                f"Cannot subscribe unknown admin web_session_id={web_session_id} to room_id={room_id}"
            )
            return

        if room_id not in connection["subscribed_rooms"]:
            connection["subscribed_rooms"].append(room_id)
            websocket_logger.info(f"Admin web_session_id={web_session_id} subscribed to room_id={room_id}")
        else:
            websocket_logger.debug(f"Admin web_session_id={web_session_id} already subscribed to room_id={room_id}")

    async def unsubscribe_from_room(self, web_session_id: str, room_id: int):
        connection = self.admin_websockets.get(web_session_id)
        if not connection:
            websocket_logger.warning(
                f"Cannot unsubscribe unknown admin web_session_id={web_session_id} from room_id={room_id}"
            )
            return

        try:
            connection["subscribed_rooms"].remove(room_id)
            websocket_logger.info(f"Admin web_session_id={web_session_id} unsubscribed from room_id={room_id}")
        except ValueError:
            websocket_logger.debug(f"Admin web_session_id={web_session_id} was not subscribed to room_id={room_id}")

    async def handle_message(self, web_session_id: str, message: dict):
        action = message.get("action")
        room_id = message.get("room_id")

        if action == "subscribe_room" and room_id is not None:
            await self.subscribe_to_room(web_session_id, room_id)
        elif action == "unsubscribe_room" and room_id is not None:
            await self.unsubscribe_from_room(web_session_id, room_id)
        else:
            websocket_logger.warning(f"Unknown admin websocket message: {message}")

    async def continuous_listening(self, websocket: WebSocket, web_session_id: str):
        while True:
            try:
                data = await websocket.receive_text()
                message = json.loads(data)
                websocket_logger.debug(f"Admin WS received message: {message}")
                await self.handle_message(web_session_id, message)
            except Exception:
                websocket_logger.exception("Error while reading from admin websocket. Stopping continuous listening.")
                break

    async def disconnect(self, web_session_id: str):
        connection = self.admin_websockets.pop(web_session_id, None)
        if not connection:
            websocket_logger.debug(f"Tried to disconnect unknown admin web_session_id={web_session_id}")
            return

        try:
            await connection["websocket"].close()
            websocket_logger.debug(f"Admin websocket.close() succeeded: web_session_id={web_session_id}")
        except Exception:
            websocket_logger.debug(
                f"Admin websocket close failed (probably already closed): web_session_id={web_session_id}"
            )
        websocket_logger.info(
            f"Admin disconnected: web_session_id={web_session_id}. Remaining admins={len(self.admin_websockets)}"
        )


admin_websocket_manager = AdminWebSocketManager()


class RoomWebSocketManager:
    """Manages WebSocket connections for rooms with multiple client types."""

    def __init__(self, admin_websocket_manager: AdminWebSocketManager):
        self.room_websockets: Dict[int, Dict[str, RoomWebSocketConnection]] = {}
        """
        room_websockets looks like:
        {
            room_id: {
                player_session_id: {
                    "websocket": WebSocket,
                    "client_type": "display" | "player" | "host"
                }
            }
        }
        """
        self.admin_websocket_manager = admin_websocket_manager

    async def connect(self, websocket: WebSocket, room_id: int, player_session_id: str, client_type: ClientType):
        try:
            await websocket.accept()
            websocket_logger.debug(
                f"Player websocket.accept() succeeded: room_id={room_id} player_session_id={player_session_id} client_type={client_type}"
            )
        except Exception:
            websocket_logger.exception(
                f"Player websocket.accept() failed: room_id={room_id} player_session_id={player_session_id}"
            )
            raise

        self.room_websockets.setdefault(room_id, {})[player_session_id] = {
            "websocket": websocket,
            "client_type": client_type,
        }
        websocket_logger.info(
            f"Player connected: room_id={room_id} player_session_id={player_session_id} client_type={client_type}. Room size={len(self.room_websockets[room_id])}"
        )

    async def disconnect(self, room_id: int, player_session_id: str):
        if room_id not in self.room_websockets:
            websocket_logger.debug(
                f"Tried to disconnect from unknown room: room_id={room_id} player_session_id={player_session_id}"
            )
            return

        connection = self.room_websockets[room_id].pop(player_session_id, None)
        if not connection:
            websocket_logger.debug(
                f"No websocket found to disconnect for room_id={room_id} player_session_id={player_session_id}"
            )
            return

        try:
            await connection["websocket"].close()
            websocket_logger.debug(
                f"Player websocket.close() succeeded: room_id={room_id} player_session_id={player_session_id}"
            )
        except Exception:
            websocket_logger.debug(
                f"Player websocket close failed (probably already closed): room_id={room_id} player_session_id={player_session_id}"
            )
        websocket_logger.info(
            f"Player disconnected: room_id={room_id} player_session_id={player_session_id}. Remaining in room={len(self.room_websockets.get(room_id, {}))}"
        )

    async def send_to_player(self, room_id: int, player_session_id: str, event: RoomEvent):
        """Send event to a specific player."""
        connection = self.room_websockets.get(room_id, {}).get(player_session_id)
        if connection:
            try:
                await connection["websocket"].send_text(json.dumps(event.model_dump()))
                websocket_logger.debug(f"Sent event to player_session_id={player_session_id} in room={room_id}")
            except Exception:
                websocket_logger.exception(
                    f"Failed to send event to player_session_id={player_session_id} in room={room_id}"
                )
        else:
            websocket_logger.debug(f"No websocket found for player_session_id={player_session_id} in room={room_id}")

    async def broadcast_to_room(self, room_id: int, event: RoomEvent):
        """Broadcast event to all connections in a room."""
        websocket_logger.debug(f"Broadcasting event to room {room_id}: {event.model_dump()}")
        connections = self.room_websockets.get(room_id, {})
        if not connections:
            websocket_logger.debug(f"No connected clients in room={room_id} to broadcast to")
        for session_id, connection in list(connections.items()):
            try:
                await connection["websocket"].send_text(json.dumps(event.model_dump()))
                websocket_logger.debug(
                    f"Sent event to player_session_id={session_id} in room={room_id} (client_type={connection['client_type']})"
                )
            except Exception:
                websocket_logger.exception(
                    f"Failed to send event to player_session_id={session_id} in room={room_id}; continuing."
                )
        await self.admin_websocket_manager.broadcast_to_room(room_id, event)

    async def broadcast_to_displays(self, room_id: int, event: RoomEvent):
        """Broadcast event to display (TV) clients only."""
        websocket_logger.debug(f"Broadcasting event to displays in room {room_id}: {event.model_dump()}")
        connections = self.room_websockets.get(room_id, {})
        display_connections = [
            (session_id, conn) for session_id, conn in connections.items() if conn["client_type"] == "display"
        ]

        if not display_connections:
            websocket_logger.debug(f"No display connections in room={room_id}")

        for session_id, connection in display_connections:
            try:
                await connection["websocket"].send_text(json.dumps(event.model_dump()))
                websocket_logger.debug(f"Sent event to display in room={room_id}")
            except Exception:
                websocket_logger.exception(f"Failed to send event to display in room={room_id}; continuing.")

    async def broadcast_to_players(self, room_id: int, event: RoomEvent):
        """Broadcast event to player (phone controller) clients only."""
        websocket_logger.debug(f"Broadcasting event to players in room {room_id}: {event.model_dump()}")
        connections = self.room_websockets.get(room_id, {})
        player_connections = [
            (session_id, conn) for session_id, conn in connections.items() if conn["client_type"] == "player"
        ]

        if not player_connections:
            websocket_logger.debug(f"No player connections in room={room_id}")

        for session_id, connection in player_connections:
            try:
                await connection["websocket"].send_text(json.dumps(event.model_dump()))
                websocket_logger.debug(f"Sent event to player {session_id} in room={room_id}")
            except Exception:
                websocket_logger.exception(
                    f"Failed to send event to player {session_id} in room={room_id}; continuing."
                )

    async def send_to_host(self, room_id: int, event: RoomEvent):
        """Send event to host client."""
        websocket_logger.debug(f"Sending event to host in room {room_id}: {event.model_dump()}")
        connections = self.room_websockets.get(room_id, {})

        # Find host connection
        async with get_session_context() as session:
            # Get the room's host player
            from backend.database.models import Room

            room = session.get(Room, room_id)
            if not room or not room.host_player_id:
                websocket_logger.debug(f"No host found for room={room_id}")
                return

            # Get host's session_id
            host_player = session.get(Player, room.host_player_id)
            if not host_player:
                websocket_logger.debug(f"Host player not found for room={room_id}")
                return

            connection = connections.get(host_player.session_id)
            if connection and connection["client_type"] == "host":
                try:
                    await connection["websocket"].send_text(json.dumps(event.model_dump()))
                    websocket_logger.debug(f"Sent event to host in room={room_id}")
                except Exception:
                    websocket_logger.exception(f"Failed to send event to host in room={room_id}")
            else:
                websocket_logger.debug(f"No host connection found for room={room_id}")

    async def kick_player(self, room_id: int, player_session_id: str):
        websocket_logger.info(f"Kicking player: room_id={room_id} player_session_id={player_session_id}")
        connection = self.room_websockets.get(room_id, {}).get(player_session_id)
        if connection:
            try:
                # Get player info for the kick event
                async with get_session_context() as session:
                    player = session.exec(select(Player).where(Player.session_id == player_session_id)).first()
                    if player:
                        kick_event = PlayerKickedEvent(
                            room_id=room_id, player_id=player.id, player_name=player.name
                        )
                        await connection["websocket"].send_text(json.dumps(kick_event.model_dump()))
                # Force close the connection, 1008 is Policy Violation
                await connection["websocket"].close(code=1008, reason="Player kicked")
            except Exception:
                websocket_logger.exception(f"Error while kicking player {player_session_id}")
            finally:
                if room_id in self.room_websockets and player_session_id in self.room_websockets[room_id]:
                    del self.room_websockets[room_id][player_session_id]
                    websocket_logger.info(f"Player {player_session_id} removed from room {room_id} after kick")

        # Notify everyone else in the room
        async with get_session_context() as session:
            player = session.exec(select(Player).where(Player.session_id == player_session_id)).first()
            if player:
                kick_notification_event = PlayerKickedEvent(
                    room_id=room_id, player_id=player.id, player_name=player.name
                )
                await self.broadcast_to_room(room_id, kick_notification_event)

    async def handle_game_message(self, room_id: int, player_session_id: str, message: dict):
        """
        Handle game-related messages from players.

        Args:
            room_id: Room ID
            player_session_id: Player's session ID
            message: Message data from the player
        """
        action = message.get("action")
        websocket_logger.debug(f"Handling game message: action={action} from player={player_session_id}")

        # Game-specific actions will be implemented in API endpoints
        # This is a placeholder for future message handling
        if action:
            websocket_logger.debug(f"Game action '{action}' received (handler to be implemented)")
        else:
            websocket_logger.warning(f"Unknown game message action: {action}")

    async def continuous_listening(self, websocket: WebSocket, room_id: int, player_session_id: str):
        """
        Continuously listen for messages from a player's websocket.

        Args:
            websocket: The WebSocket connection
            room_id: Room ID
            player_session_id: Player's session ID
        """
        while True:
            try:
                data = await websocket.receive_text()
                message = json.loads(data)
                websocket_logger.debug(f"Player WS received message: {message}")

                # Handle game messages
                await self.handle_game_message(room_id, player_session_id, message)
            except Exception:
                websocket_logger.exception("Error while reading from player websocket. Stopping continuous listening.")
                break


room_websocket_manager = RoomWebSocketManager(admin_websocket_manager=admin_websocket_manager)
