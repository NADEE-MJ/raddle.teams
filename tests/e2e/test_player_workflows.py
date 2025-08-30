"""
Phase 1: Player Workflow Tests

Tests player-specific flows:
- Player joining lobbies
- Player lobby interactions
- Player session management
- Multi-player scenarios
"""

import pytest
import httpx
import asyncio
from tests.e2e.fixtures.server import ServerManager
from settings import settings


class TestPlayerWorkflows:
    """Test player-specific workflows end-to-end."""
    
    @pytest.fixture(scope="class", autouse=True)
    def server(self):
        """Start server for these tests."""
        manager = ServerManager()
        manager.start()
        yield manager
        manager.stop()
    
    @pytest.fixture(scope="class")
    def server_url(self, server):
        return server.url
    
    async def test_player_join_lobby_workflow(self, server_url: str):
        """Test complete player lobby joining workflow."""
        async with httpx.AsyncClient() as client:
            # 1. Admin creates a lobby
            headers = {"Authorization": f"Bearer {settings.ADMIN_PASSWORD}"}
            lobby_data = {"name": "Player Workflow Test Lobby"}
            
            response = await client.post(
                f"{server_url}/api/admin/lobby", json=lobby_data, headers=headers
            )
            assert response.status_code == 200
            lobby = response.json()
            lobby_code = lobby["code"]
            
            # 2. Player joins the lobby
            import uuid
            session_id = str(uuid.uuid4())
            player_data = {"name": "Test Player", "session_id": session_id}
            
            response = await client.post(
                f"{server_url}/api/lobby/{lobby_code}/join", json=player_data
            )
            assert response.status_code == 200
            player = response.json()
            
            # 3. Verify player is in lobby
            response = await client.get(f"{server_url}/api/player/{session_id}/lobby")
            assert response.status_code == 200
            returned_lobby = response.json()
            assert returned_lobby["code"] == lobby_code
            
            # 4. Get lobby info to see player in list
            response = await client.get(f"{server_url}/api/lobby/{lobby['id']}")
            assert response.status_code == 200
            lobby_info = response.json()
            assert len(lobby_info["players"]) == 1
            assert lobby_info["players"][0]["name"] == "Test Player"
            
            print("✅ Player join lobby workflow complete")
    
    async def test_multiple_players_join_same_lobby(self, server_url: str):
        """Test multiple players joining the same lobby."""
        async with httpx.AsyncClient() as client:
            # Admin creates a lobby
            headers = {"Authorization": f"Bearer {settings.ADMIN_PASSWORD}"}
            lobby_data = {"name": "Multi-Player Test Lobby"}
            
            response = await client.post(
                f"{server_url}/api/admin/lobby", json=lobby_data, headers=headers
            )
            assert response.status_code == 200
            lobby = response.json()
            lobby_code = lobby["code"]
            
            # Multiple players join
            players = []
            for i in range(3):
                import uuid
                session_id = str(uuid.uuid4())
                player_data = {"name": f"Player {i+1}", "session_id": session_id}
                
                response = await client.post(
                    f"{server_url}/api/lobby/{lobby_code}/join", json=player_data
                )
                assert response.status_code == 200
                players.append(response.json())
            
            # Verify all players are in lobby
            response = await client.get(f"{server_url}/api/lobby/{lobby['id']}")
            assert response.status_code == 200
            lobby_info = response.json()
            assert len(lobby_info["players"]) == 3
            
            player_names = {p["name"] for p in lobby_info["players"]}
            assert player_names == {"Player 1", "Player 2", "Player 3"}
            
            print("✅ Multiple players join same lobby workflow complete")
    
    async def test_player_session_persistence(self, server_url: str):
        """Test that player sessions persist across requests."""
        async with httpx.AsyncClient() as client:
            # Admin creates a lobby
            headers = {"Authorization": f"Bearer {settings.ADMIN_PASSWORD}"}
            lobby_data = {"name": "Session Persistence Test"}
            
            response = await client.post(
                f"{server_url}/api/admin/lobby", json=lobby_data, headers=headers
            )
            assert response.status_code == 200
            lobby = response.json()
            lobby_code = lobby["code"]
            
            # Player joins lobby
            import uuid
            session_id = str(uuid.uuid4())
            player_data = {"name": "Persistent Player", "session_id": session_id}
            
            response = await client.post(
                f"{server_url}/api/lobby/{lobby_code}/join", json=player_data
            )
            assert response.status_code == 200
            player = response.json()
            
            # Simulate multiple requests with same session ID
            for i in range(3):
                response = await client.get(f"{server_url}/api/player/{session_id}/lobby")
                assert response.status_code == 200
                returned_lobby = response.json()
                assert returned_lobby["code"] == lobby_code
            
            print("✅ Player session persistence test complete")
    
    async def test_player_rejoins_with_same_session(self, server_url: str):
        """Test player can rejoin/update lobby with same session ID."""
        async with httpx.AsyncClient() as client:
            # Admin creates two lobbies
            headers = {"Authorization": f"Bearer {settings.ADMIN_PASSWORD}"}
            
            response1 = await client.post(
                f"{server_url}/api/admin/lobby", 
                json={"name": "First Lobby"}, 
                headers=headers
            )
            lobby1 = response1.json()
            
            response2 = await client.post(
                f"{server_url}/api/admin/lobby", 
                json={"name": "Second Lobby"}, 
                headers=headers
            )
            lobby2 = response2.json()
            
            # Player joins first lobby
            import uuid
            session_id = str(uuid.uuid4())
            player_data = {"name": "Switching Player", "session_id": session_id}
            
            response = await client.post(
                f"{server_url}/api/lobby/{lobby1['code']}/join", json=player_data
            )
            assert response.status_code == 200
            
            # Verify player is in first lobby
            response = await client.get(f"{server_url}/api/player/{session_id}/lobby")
            assert response.status_code == 200
            returned_lobby = response.json()
            assert returned_lobby["id"] == lobby1["id"]
            
            # Player joins second lobby with same session ID
            response = await client.post(
                f"{server_url}/api/lobby/{lobby2['code']}/join", json=player_data
            )
            assert response.status_code == 200
            
            # Verify player is now in second lobby
            response = await client.get(f"{server_url}/api/player/{session_id}/lobby")
            assert response.status_code == 200
            returned_lobby = response.json()
            assert returned_lobby["id"] == lobby2["id"]
            
            print("✅ Player lobby switching test complete")


class TestAdminPlayerIntegration:
    """Test admin and player interactions together."""
    
    @pytest.fixture(scope="class", autouse=True)
    def server(self):
        """Start server for these tests."""
        manager = ServerManager()
        manager.start()
        yield manager
        manager.stop()
    
    @pytest.fixture(scope="class")
    def server_url(self, server):
        return server.url
    
    async def test_admin_monitors_player_joins(self, server_url: str):
        """Test admin can monitor as players join lobbies."""
        async with httpx.AsyncClient() as client:
            # Admin creates lobby
            headers = {"Authorization": f"Bearer {settings.ADMIN_PASSWORD}"}
            lobby_data = {"name": "Admin Monitoring Test"}
            
            response = await client.post(
                f"{server_url}/api/admin/lobby", json=lobby_data, headers=headers
            )
            assert response.status_code == 200
            lobby = response.json()
            lobby_code = lobby["code"]
            
            # Check initial state - no players
            response = await client.get(f"{server_url}/api/lobby/{lobby['id']}")
            assert response.status_code == 200
            lobby_info = response.json()
            assert len(lobby_info["players"]) == 0
            
            # Player 1 joins
            import uuid
            session_id1 = str(uuid.uuid4())
            player_data1 = {"name": "First Player", "session_id": session_id1}
            
            response = await client.post(
                f"{server_url}/api/lobby/{lobby_code}/join", json=player_data1
            )
            assert response.status_code == 200
            
            # Admin checks - should see 1 player
            response = await client.get(f"{server_url}/api/lobby/{lobby['id']}")
            assert response.status_code == 200
            lobby_info = response.json()
            assert len(lobby_info["players"]) == 1
            
            # Player 2 joins
            session_id2 = str(uuid.uuid4())
            player_data2 = {"name": "Second Player", "session_id": session_id2}
            
            response = await client.post(
                f"{server_url}/api/lobby/{lobby_code}/join", json=player_data2
            )
            assert response.status_code == 200
            
            # Admin checks - should see 2 players
            response = await client.get(f"{server_url}/api/lobby/{lobby['id']}")
            assert response.status_code == 200
            lobby_info = response.json()
            assert len(lobby_info["players"]) == 2
            
            # Admin views all lobbies and sees the lobby with players
            response = await client.get(f"{server_url}/api/admin/lobby", headers=headers)
            assert response.status_code == 200
            lobbies = response.json()
            
            # Find our lobby in the list
            our_lobby = next((l for l in lobbies if l["id"] == lobby["id"]), None)
            assert our_lobby is not None
            
            print("✅ Admin monitors player joins test complete")
    
    async def test_concurrent_lobby_operations(self, server_url: str):
        """Test concurrent admin and player operations."""
        async with httpx.AsyncClient() as client:
            headers = {"Authorization": f"Bearer {settings.ADMIN_PASSWORD}"}
            
            # Create multiple lobbies concurrently
            lobby_tasks = []
            for i in range(3):
                task = client.post(
                    f"{server_url}/api/admin/lobby", 
                    json={"name": f"Concurrent Lobby {i+1}"}, 
                    headers=headers
                )
                lobby_tasks.append(task)
            
            lobby_responses = await asyncio.gather(*lobby_tasks)
            lobbies = [r.json() for r in lobby_responses]
            
            # Verify all lobbies created successfully
            for lobby in lobbies:
                assert "id" in lobby
                assert "code" in lobby
            
            # Players join different lobbies concurrently
            player_tasks = []
            for i, lobby in enumerate(lobbies):
                import uuid
                session_id = str(uuid.uuid4())
                player_data = {"name": f"Concurrent Player {i+1}", "session_id": session_id}
                
                task = client.post(
                    f"{server_url}/api/lobby/{lobby['code']}/join", 
                    json=player_data
                )
                player_tasks.append(task)
            
            player_responses = await asyncio.gather(*player_tasks)
            players = [r.json() for r in player_responses]
            
            # Verify all players joined successfully
            for player in players:
                assert "id" in player
                assert "session_id" in player
            
            print("✅ Concurrent lobby operations test complete")


class TestErrorHandlingWorkflows:
    """Test error handling in various workflows."""
    
    @pytest.fixture(scope="class", autouse=True)
    def server(self):
        """Start server for these tests."""
        manager = ServerManager()
        manager.start()
        yield manager
        manager.stop()
    
    @pytest.fixture(scope="class")
    def server_url(self, server):
        return server.url
    
    async def test_invalid_lobby_code_scenarios(self, server_url: str):
        """Test various invalid lobby code scenarios."""
        async with httpx.AsyncClient() as client:
            import uuid
            session_id = str(uuid.uuid4())
            player_data = {"name": "Test Player", "session_id": session_id}
            
            # Test completely invalid code
            response = await client.post(
                f"{server_url}/api/lobby/INVALID/join", json=player_data
            )
            assert response.status_code == 404
            
            # Test non-existent but valid format code
            response = await client.post(
                f"{server_url}/api/lobby/ABC123/join", json=player_data
            )
            assert response.status_code == 404
            
            print("✅ Invalid lobby code scenarios test complete")
    
    async def test_invalid_session_scenarios(self, server_url: str):
        """Test various invalid session scenarios."""
        async with httpx.AsyncClient() as client:
            # Test non-existent session
            response = await client.get(
                f"{server_url}/api/player/non_existent_session/lobby"
            )
            assert response.status_code == 404
            
            print("✅ Invalid session scenarios test complete")
    
    async def test_malformed_request_data(self, server_url: str):
        """Test handling of malformed request data."""
        async with httpx.AsyncClient() as client:
            headers = {"Authorization": f"Bearer {settings.ADMIN_PASSWORD}"}
            
            # Create a valid lobby first
            response = await client.post(
                f"{server_url}/api/admin/lobby", 
                json={"name": "Error Test Lobby"}, 
                headers=headers
            )
            assert response.status_code == 200
            lobby = response.json()
            lobby_code = lobby["code"]
            
            # Test missing player name
            response = await client.post(
                f"{server_url}/api/lobby/{lobby_code}/join", 
                json={"session_id": "test_session"}
            )
            assert response.status_code == 422  # Validation error
            
            # Test missing session_id
            response = await client.post(
                f"{server_url}/api/lobby/{lobby_code}/join", 
                json={"name": "Test Player"}
            )
            assert response.status_code == 422  # Validation error
            
            # Test empty JSON
            response = await client.post(
                f"{server_url}/api/lobby/{lobby_code}/join", 
                json={}
            )
            assert response.status_code == 422  # Validation error
            
            print("✅ Malformed request data test complete")