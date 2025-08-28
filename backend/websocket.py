import json
from typing import Dict, List

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from .database import GameState

router = APIRouter()


class ConnectionManager:
    """Manages WebSocket connections for teams."""

    def __init__(self):
        # Map team_id to list of WebSocket connections
        self.team_connections: Dict[int, List[WebSocket]] = {}
        # Map WebSocket to player info
        self.connection_info: Dict[WebSocket, dict] = {}

    async def connect(self, websocket: WebSocket, team_id: int, player_session_id: str):
        """Accept a WebSocket connection and add to team."""
        await websocket.accept()

        # Add to team connections
        if team_id not in self.team_connections:
            self.team_connections[team_id] = []
        self.team_connections[team_id].append(websocket)

        # Store connection info
        self.connection_info[websocket] = {
            "team_id": team_id,
            "player_session_id": player_session_id,
        }

    def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket connection."""
        if websocket in self.connection_info:
            info = self.connection_info[websocket]
            team_id = info["team_id"]

            # Remove from team connections
            if team_id in self.team_connections:
                self.team_connections[team_id] = [
                    conn for conn in self.team_connections[team_id] if conn != websocket
                ]

                # Clean up empty team lists
                if not self.team_connections[team_id]:
                    del self.team_connections[team_id]

            # Remove connection info
            del self.connection_info[websocket]

    async def send_to_team(self, team_id: int, message: dict):
        """Send a message to all connections in a team."""
        if team_id in self.team_connections:
            disconnected = []
            for connection in self.team_connections[team_id]:
                try:
                    await connection.send_text(json.dumps(message))
                except Exception:
                    # Connection is broken, mark for removal
                    disconnected.append(connection)

            # Clean up disconnected connections
            for conn in disconnected:
                self.disconnect(conn)

    async def broadcast_to_all(self, message: dict):
        """Send a message to all connected clients."""
        for team_connections in self.team_connections.values():
            for connection in team_connections:
                try:
                    await connection.send_text(json.dumps(message))
                except Exception:
                    # Ignore failed sends, cleanup will happen elsewhere
                    pass


# Global connection manager
manager = ConnectionManager()


@router.websocket("/ws/{team_id}/{player_session_id}")
async def websocket_endpoint(
    websocket: WebSocket, team_id: int, player_session_id: str
):
    """WebSocket endpoint for team communication."""
    await manager.connect(websocket, team_id, player_session_id)

    try:
        # Send initial connection confirmation
        await websocket.send_text(
            json.dumps(
                {
                    "type": "connection_confirmed",
                    "team_id": team_id,
                    "player_session_id": player_session_id,
                }
            )
        )

        # Listen for messages
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)

            # Echo message to all team members
            await manager.send_to_team(
                team_id,
                {
                    "type": "team_message",
                    "player_session_id": player_session_id,
                    "message": message,
                },
            )

    except WebSocketDisconnect:
        manager.disconnect(websocket)

        # Notify team members that someone disconnected
        await manager.send_to_team(
            team_id,
            {"type": "player_disconnected", "player_session_id": player_session_id},
        )


async def notify_team_guess(team_id: int, guess_data: dict):
    """Notify team members of a new guess."""
    await manager.send_to_team(team_id, {"type": "new_guess", "data": guess_data})


async def notify_team_progress(team_id: int, progress_data: dict):
    """Notify team members of progress update."""
    await manager.send_to_team(
        team_id, {"type": "progress_update", "data": progress_data}
    )


async def notify_game_state_change(state: GameState):
    """Notify all players of game state change."""
    await manager.broadcast_to_all({"type": "game_state_change", "state": state.value})


async def notify_player_team_assignment(
    player_session_id: str, team_id: int, team_name: str
):
    """Notify a specific player that they've been assigned to a team."""
    # Find the player's connection across all teams
    for team_connections in manager.team_connections.values():
        for connection in team_connections:
            if connection in manager.connection_info:
                info = manager.connection_info[connection]
                if info["player_session_id"] == player_session_id:
                    try:
                        await connection.send_text(
                            json.dumps(
                                {
                                    "type": "team_assignment",
                                    "team_id": team_id,
                                    "team_name": team_name,
                                }
                            )
                        )
                    except Exception:
                        pass  # Connection might be closed
                    return
