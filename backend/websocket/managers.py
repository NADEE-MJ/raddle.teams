import json
from typing import Dict, TypedDict

from fastapi import WebSocket
from sqlmodel import select

from backend.custom_logging import websocket_logger
from backend.database import get_session_context
from backend.database.models import Player
from backend.websocket.events import LobbyEvent, PlayerKickedEvent


class AdminWebSocketConnection(TypedDict):
    websocket: WebSocket
    subscribed_lobbies: list[int]


class AdminWebSocketManager:
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
            "subscribed_lobbies": [],
        }
        websocket_logger.info(
            f"Admin connected: web_session_id={web_session_id}. Total admins={len(self.admin_websockets)}"
        )

    async def broadcast_to_lobby(self, lobby_id: int, event: LobbyEvent):
        recipients = [conn for conn in self.admin_websockets.values() if lobby_id in conn["subscribed_lobbies"]]
        websocket_logger.debug(
            f"Broadcasting event to admins for lobby={lobby_id}. Event={event.model_dump()}. Recipients={len(recipients)}"
        )
        if not recipients:
            websocket_logger.debug("No admin connections available")
        for connection in recipients:
            try:
                await connection["websocket"].send_text(json.dumps(event.model_dump()))
                websocket_logger.debug("Sent event to admin websocket")
            except Exception:
                websocket_logger.exception("Failed to send event to admin websocket; continuing.")

    async def subscribe_to_lobby(self, web_session_id: str, lobby_id: int):
        connection = self.admin_websockets.get(web_session_id)
        if not connection:
            websocket_logger.warning(
                f"Cannot subscribe unknown admin web_session_id={web_session_id} to lobby_id={lobby_id}"
            )
            return

        if lobby_id not in connection["subscribed_lobbies"]:
            connection["subscribed_lobbies"].append(lobby_id)
            websocket_logger.info(f"Admin web_session_id={web_session_id} subscribed to lobby_id={lobby_id}")
        else:
            websocket_logger.debug(f"Admin web_session_id={web_session_id} already subscribed to lobby_id={lobby_id}")

    async def unsubscribe_from_lobby(self, web_session_id: str, lobby_id: int):
        connection = self.admin_websockets.get(web_session_id)
        if not connection:
            websocket_logger.warning(
                f"Cannot unsubscribe unknown admin web_session_id={web_session_id} from lobby_id={lobby_id}"
            )
            return

        try:
            connection["subscribed_lobbies"].remove(lobby_id)
            websocket_logger.info(f"Admin web_session_id={web_session_id} unsubscribed from lobby_id={lobby_id}")
        except ValueError:
            websocket_logger.debug(f"Admin web_session_id={web_session_id} was not subscribed to lobby_id={lobby_id}")

    async def handle_message(self, web_session_id: str, message: dict):
        action = message.get("action")
        lobby_id = message.get("lobby_id")

        if action == "subscribe_lobby" and lobby_id is not None:
            await self.subscribe_to_lobby(web_session_id, lobby_id)
        elif action == "unsubscribe_lobby" and lobby_id is not None:
            await self.unsubscribe_from_lobby(web_session_id, lobby_id)
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
        self.player_teams: Dict[str, int] = {}
        """
        player_teams maps player_session_id to team_id for team-based broadcasts
        """
        self.admin_web_socket_manager = admin_web_socket_manager

    async def connect(self, websocket: WebSocket, lobby_id: int, player_session_id: str):
        try:
            await websocket.accept()
            websocket_logger.debug(
                f"Player websocket.accept() succeeded: lobby_id={lobby_id} player_session_id={player_session_id}"
            )
        except Exception:
            websocket_logger.exception(
                f"Player websocket.accept() failed: lobby_id={lobby_id} player_session_id={player_session_id}"
            )
            raise

        self.lobby_websockets.setdefault(lobby_id, {})[player_session_id] = websocket
        websocket_logger.info(
            f"Player connected: lobby_id={lobby_id} player_session_id={player_session_id}. Lobby size={len(self.lobby_websockets[lobby_id])}"
        )

        # Register this player's team (if assigned) for team-based broadcasts
        async with get_session_context() as session:
            player = session.exec(select(Player).where(Player.session_id == player_session_id)).first()
            if player and player.team_id:
                self.register_player_team(player_session_id, player.team_id)

    async def disconnect(self, lobby_id: int, player_session_id: str):
        if lobby_id not in self.lobby_websockets:
            websocket_logger.debug(
                f"Tried to disconnect from unknown lobby: lobby_id={lobby_id} player_session_id={player_session_id}"
            )
            return

        websocket = self.lobby_websockets[lobby_id].pop(player_session_id, None)
        if not websocket:
            websocket_logger.debug(
                f"No websocket found to disconnect for lobby_id={lobby_id} player_session_id={player_session_id}"
            )
            return

        try:
            await websocket.close()
            websocket_logger.debug(
                f"Player websocket.close() succeeded: lobby_id={lobby_id} player_session_id={player_session_id}"
            )
        except Exception:
            websocket_logger.debug(
                f"Player websocket close failed (probably already closed): lobby_id={lobby_id} player_session_id={player_session_id}"
            )
        websocket_logger.info(
            f"Player disconnected: lobby_id={lobby_id} player_session_id={player_session_id}. Remaining in lobby={len(self.lobby_websockets.get(lobby_id, {}))}"
        )

        self.unregister_player_team(player_session_id)

    async def send_to_player(self, lobby_id: int, player_session_id: str, event: LobbyEvent):
        websocket = self.lobby_websockets.get(lobby_id, {}).get(player_session_id)
        if websocket:
            try:
                await websocket.send_text(json.dumps(event.model_dump()))
                websocket_logger.debug(f"Sent event to player_session_id={player_session_id} in lobby={lobby_id}")
            except Exception:
                websocket_logger.exception(
                    f"Failed to send event to player_session_id={player_session_id} in lobby={lobby_id}"
                )
        else:
            websocket_logger.debug(f"No websocket found for player_session_id={player_session_id} in lobby={lobby_id}")

    async def broadcast_to_lobby(self, lobby_id: int, event: LobbyEvent):
        websocket_logger.debug(f"Broadcasting event to lobby {lobby_id}: {event.model_dump()}")
        members = self.lobby_websockets.get(lobby_id, {})
        if not members:
            websocket_logger.debug(f"No connected players in lobby={lobby_id} to broadcast to")
        for ws_id, websocket in list(members.items()):
            try:
                await websocket.send_text(json.dumps(event.model_dump()))
                websocket_logger.debug(f"Sent event to player_session_id={ws_id} in lobby={lobby_id}")
            except Exception:
                websocket_logger.exception(
                    f"Failed to send event to player_session_id={ws_id} in lobby={lobby_id}; removing or ignoring."
                )
                # Ignore failed sends, cleanup will happen elsewhere
                pass
        await self.admin_web_socket_manager.broadcast_to_lobby(lobby_id, event)

    async def kick_player(self, lobby_id: int, player_session_id: str):
        websocket_logger.info(f"Kicking player: lobby_id={lobby_id} player_session_id={player_session_id}")
        websocket = self.lobby_websockets.get(lobby_id, {}).get(player_session_id)
        if websocket:
            try:
                kick_event = PlayerKickedEvent(lobby_id=lobby_id, player_session_id=player_session_id)
                await websocket.send_text(json.dumps(kick_event.model_dump()))
                # Force close the connection, 1008 is Policy Violation
                await websocket.close(code=1008, reason="Player kicked by admin")
            except Exception:
                websocket_logger.exception(f"Error while kicking player {player_session_id}")
            finally:
                if lobby_id in self.lobby_websockets and player_session_id in self.lobby_websockets[lobby_id]:
                    del self.lobby_websockets[lobby_id][player_session_id]
                    websocket_logger.info(f"Player {player_session_id} removed from lobby {lobby_id} after kick")

        kick_notification_event = PlayerKickedEvent(lobby_id=lobby_id, player_session_id=player_session_id)
        await self.broadcast_to_lobby(lobby_id, kick_notification_event)

        await self.admin_web_socket_manager.broadcast_to_lobby(lobby_id, kick_notification_event)

    def register_player_team(self, player_session_id: str, team_id: int):
        """
        Register a player's team membership for team-based broadcasts.

        Args:
            player_session_id: Player's session ID
            team_id: Team ID the player belongs to
        """
        self.player_teams[player_session_id] = team_id
        websocket_logger.debug(f"Registered player {player_session_id} to team {team_id}")

    def unregister_player_team(self, player_session_id: str):
        """
        Unregister a player's team membership.

        Args:
            player_session_id: Player's session ID
        """
        self.player_teams.pop(player_session_id, None)
        websocket_logger.debug(f"Unregistered player {player_session_id} from team")

    async def broadcast_to_team(self, lobby_id: int, team_id: int, event: dict):
        """
        Broadcast a message to all players on a specific team.

        Args:
            lobby_id: Lobby ID
            team_id: Team ID to broadcast to
            event: Event data to broadcast (dict or Pydantic model)
        """
        from pydantic import BaseModel

        # Convert Pydantic models to dict
        if isinstance(event, BaseModel):
            event_data = event.model_dump()
        else:
            event_data = event

        websocket_logger.debug(f"Broadcasting event to team {team_id} in lobby {lobby_id}: {event_data}")

        members = self.lobby_websockets.get(lobby_id, {})
        team_players = [
            (session_id, websocket)
            for session_id, websocket in members.items()
            if self.player_teams.get(session_id) == team_id
        ]

        if not team_players:
            websocket_logger.debug(f"No connected players in team={team_id} to broadcast to")

        for session_id, websocket in team_players:
            try:
                await websocket.send_text(json.dumps(event_data))
                websocket_logger.debug(f"Sent event to player_session_id={session_id} in team={team_id}")
            except Exception:
                websocket_logger.exception(
                    f"Failed to send event to player_session_id={session_id} in team={team_id}; continuing."
                )

    async def handle_game_message(self, lobby_id: int, player_session_id: str, message: dict):
        """
        Handle game-related messages from players.

        Args:
            lobby_id: Lobby ID
            player_session_id: Player's session ID
            message: Message data from the player
        """
        action = message.get("action")

        if action == "submit_guess":
            # Import here to avoid circular dependency
            from backend.api.game import handle_guess_submission

            await handle_guess_submission(lobby_id, player_session_id, message, self)
        else:
            websocket_logger.warning(f"Unknown game message action: {action}")

    async def continuous_listening(self, websocket: WebSocket, lobby_id: int, player_session_id: str):
        """
        Continuously listen for messages from a player's websocket.

        Args:
            websocket: The WebSocket connection
            lobby_id: Lobby ID
            player_session_id: Player's session ID
        """
        while True:
            try:
                data = await websocket.receive_text()
                message = json.loads(data)
                websocket_logger.debug(f"Player WS received message: {message}")

                # Handle game messages
                await self.handle_game_message(lobby_id, player_session_id, message)
            except Exception:
                websocket_logger.exception("Error while reading from player websocket. Stopping continuous listening.")
                break


lobby_websocket_manager = LobbyWebSocketManager(admin_web_socket_manager=admin_web_socket_manager)
