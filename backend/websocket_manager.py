from fastapi import WebSocket
from typing import Dict, List
import json


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.player_teams: Dict[str, str] = {}  # player_id -> team_id

    async def connect(self, websocket: WebSocket, player_id: str):
        await websocket.accept()
        self.active_connections[player_id] = websocket

    def disconnect(self, player_id: str):
        if player_id in self.active_connections:
            del self.active_connections[player_id]
        if player_id in self.player_teams:
            del self.player_teams[player_id]

    async def send_personal_message(self, message: dict, player_id: str):
        if player_id in self.active_connections:
            websocket = self.active_connections[player_id]
            await websocket.send_text(json.dumps(message))

    async def broadcast(self, message: dict):
        """Broadcast message to all connected players"""
        disconnected = []
        for player_id, connection in self.active_connections.items():
            try:
                await connection.send_text(json.dumps(message))
            except Exception:
                disconnected.append(player_id)
        
        # Clean up disconnected players
        for player_id in disconnected:
            self.disconnect(player_id)

    async def broadcast_to_team(self, player_id: str, message: dict):
        """Broadcast message to all players in the same team"""
        team_id = self.player_teams.get(player_id)
        if not team_id:
            return
        
        disconnected = []
        for pid, connection in self.active_connections.items():
            if self.player_teams.get(pid) == team_id:
                try:
                    await connection.send_text(json.dumps(message))
                except Exception:
                    disconnected.append(pid)
        
        # Clean up disconnected players
        for pid in disconnected:
            self.disconnect(pid)

    def assign_player_to_team(self, player_id: str, team_id: str):
        """Assign a player to a team"""
        self.player_teams[player_id] = team_id

    async def get_connected_players(self) -> List[str]:
        """Get list of connected player IDs"""
        return list(self.active_connections.keys())