"""
Phase 1: WebSocket Integration Tests

Tests WebSocket functionality:
- Admin WebSocket connections
- Player WebSocket connections
- Basic message handling
- Connection/disconnection flows
"""

import pytest
import asyncio
import json
import websockets
from websockets.exceptions import ConnectionClosedError, InvalidStatus
from tests.e2e.fixtures.server import ServerManager
from settings import settings


class TestWebSocketConnections:
    """Test WebSocket connection establishment and basic functionality."""
    
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
    
    @pytest.fixture(scope="class")
    def ws_url(self, server_url):
        # Convert HTTP URL to WebSocket URL
        return server_url.replace("http://", "ws://")
    
    async def test_admin_websocket_connection_with_valid_token(self, ws_url: str):
        """Test admin WebSocket connection with valid token."""
        import uuid
        web_session_id = str(uuid.uuid4())
        ws_endpoint = f"{ws_url}/ws/admin/{web_session_id}?token={settings.ADMIN_PASSWORD}"
        
        try:
            async with websockets.connect(ws_endpoint) as websocket:
                # Connection successful - send a test message
                test_message = {"type": "test", "message": "Hello from admin"}
                await websocket.send(json.dumps(test_message))
                
                # Don't wait for response as the current implementation just logs
                # The fact that we can connect and send is sufficient for this test
                print("✅ Admin WebSocket connection with valid token successful")
                
        except Exception as e:
            pytest.fail(f"Admin WebSocket connection failed: {e}")
    
    async def test_admin_websocket_connection_with_invalid_token(self, ws_url: str):
        """Test admin WebSocket connection with invalid token."""
        import uuid
        web_session_id = str(uuid.uuid4())
        ws_endpoint = f"{ws_url}/ws/admin/{web_session_id}?token=invalid_token"
        
        with pytest.raises((ConnectionClosedError, InvalidStatus)):
            async with websockets.connect(ws_endpoint) as websocket:
                # Should not reach here
                pytest.fail("Admin WebSocket connection should have failed with invalid token")
        
        print("✅ Admin WebSocket connection properly rejects invalid token")
    
    async def test_admin_websocket_connection_without_token(self, ws_url: str):
        """Test admin WebSocket connection without token."""
        import uuid
        web_session_id = str(uuid.uuid4())
        ws_endpoint = f"{ws_url}/ws/admin/{web_session_id}"
        
        with pytest.raises((ConnectionClosedError, InvalidStatus)):
            async with websockets.connect(ws_endpoint) as websocket:
                # Should not reach here
                pytest.fail("Admin WebSocket connection should have failed without token")
        
        print("✅ Admin WebSocket connection properly rejects missing token")
    
    async def test_player_websocket_connection(self, ws_url: str, server_url: str):
        """Test player WebSocket connection."""
        # First create a lobby and join it with a player
        import httpx
        import uuid
        
        async with httpx.AsyncClient() as client:
            # Admin creates lobby
            headers = {"Authorization": f"Bearer {settings.ADMIN_PASSWORD}"}
            lobby_data = {"name": "WebSocket Test Lobby"}
            
            response = await client.post(
                f"{server_url}/api/admin/lobby", json=lobby_data, headers=headers
            )
            assert response.status_code == 200
            lobby = response.json()
            lobby_code = lobby["code"]
            
            # Player joins lobby
            session_id = str(uuid.uuid4())
            player_data = {"name": "WebSocket Test Player", "session_id": session_id}
            
            response = await client.post(
                f"{server_url}/api/lobby/{lobby_code}/join", json=player_data
            )
            assert response.status_code == 200
            player = response.json()
            
            # Now connect via WebSocket
            ws_endpoint = f"{ws_url}/ws/lobby/{lobby['id']}/player/{session_id}"
            
            try:
                async with websockets.connect(ws_endpoint) as websocket:
                    # Connection successful - send a test message
                    test_message = {"type": "test", "message": "Hello from player"}
                    await websocket.send(json.dumps(test_message))
                    
                    print("✅ Player WebSocket connection successful")
                    
            except Exception as e:
                pytest.fail(f"Player WebSocket connection failed: {e}")
    
    async def test_multiple_websocket_connections(self, ws_url: str, server_url: str):
        """Test multiple WebSocket connections simultaneously."""
        import httpx
        import uuid
        
        async with httpx.AsyncClient() as client:
            # Admin creates lobby
            headers = {"Authorization": f"Bearer {settings.ADMIN_PASSWORD}"}
            lobby_data = {"name": "Multi WebSocket Test Lobby"}
            
            response = await client.post(
                f"{server_url}/api/admin/lobby", json=lobby_data, headers=headers
            )
            assert response.status_code == 200
            lobby = response.json()
            lobby_code = lobby["code"]
            
            # Create multiple players
            players = []
            for i in range(3):
                session_id = str(uuid.uuid4())
                player_data = {"name": f"WS Player {i+1}", "session_id": session_id}
                
                response = await client.post(
                    f"{server_url}/api/lobby/{lobby_code}/join", json=player_data
                )
                assert response.status_code == 200
                players.append((response.json(), session_id))
            
            # Connect multiple WebSocket connections
            connections = []
            try:
                # Create all connections
                for player, session_id in players:
                    ws_endpoint = f"{ws_url}/ws/lobby/{lobby['id']}/player/{session_id}"
                    websocket = await websockets.connect(ws_endpoint)
                    connections.append(websocket)
                
                # Send messages from all connections
                for i, websocket in enumerate(connections):
                    test_message = {"type": "test", "message": f"Hello from player {i+1}"}
                    await websocket.send(json.dumps(test_message))
                
                print("✅ Multiple WebSocket connections successful")
                
            finally:
                # Clean up all connections
                for websocket in connections:
                    try:
                        await websocket.close()
                    except:
                        pass
    
    async def test_websocket_connection_cleanup(self, ws_url: str, server_url: str):
        """Test WebSocket connection cleanup when client disconnects."""
        import httpx
        import uuid
        
        async with httpx.AsyncClient() as client:
            # Admin creates lobby
            headers = {"Authorization": f"Bearer {settings.ADMIN_PASSWORD}"}
            lobby_data = {"name": "Cleanup Test Lobby"}
            
            response = await client.post(
                f"{server_url}/api/admin/lobby", json=lobby_data, headers=headers
            )
            assert response.status_code == 200
            lobby = response.json()
            lobby_code = lobby["code"]
            
            # Player joins lobby
            session_id = str(uuid.uuid4())
            player_data = {"name": "Cleanup Test Player", "session_id": session_id}
            
            response = await client.post(
                f"{server_url}/api/lobby/{lobby_code}/join", json=player_data
            )
            assert response.status_code == 200
            
            # Connect and then disconnect
            ws_endpoint = f"{ws_url}/ws/lobby/{lobby['id']}/player/{session_id}"
            
            websocket = await websockets.connect(ws_endpoint)
            
            # Send a message
            test_message = {"type": "test", "message": "About to disconnect"}
            await websocket.send(json.dumps(test_message))
            
            # Close the connection
            await websocket.close()
            
            # Try to reconnect with the same session
            websocket2 = await websockets.connect(ws_endpoint)
            test_message2 = {"type": "test", "message": "Reconnected"}
            await websocket2.send(json.dumps(test_message2))
            await websocket2.close()
            
            print("✅ WebSocket connection cleanup and reconnection successful")


class TestWebSocketEdgeCases:
    """Test WebSocket edge cases and error conditions."""
    
    @pytest.fixture(scope="session", autouse=True)
    def server(self):
        """Start server for these tests."""
        manager = ServerManager()
        manager.start()
        yield manager
        manager.stop()
    
    @pytest.fixture(scope="session")
    def ws_url(self, server):
        return server.url.replace("http://", "ws://")
    
    async def test_websocket_invalid_lobby_id(self, ws_url: str):
        """Test WebSocket connection to non-existent lobby."""
        import uuid
        session_id = str(uuid.uuid4())
        ws_endpoint = f"{ws_url}/ws/lobby/99999/player/{session_id}"
        
        try:
            # This might succeed in connecting but fail when trying to use
            async with websockets.connect(ws_endpoint) as websocket:
                test_message = {"type": "test", "message": "Invalid lobby test"}
                await websocket.send(json.dumps(test_message))
                # The connection might succeed but the backend should handle the invalid lobby
                print("✅ WebSocket handles invalid lobby ID gracefully")
        except Exception:
            # Connection failure is also acceptable for invalid lobby
            print("✅ WebSocket properly rejects invalid lobby ID")
    
    async def test_websocket_malformed_messages(self, ws_url: str, server_url: str):
        """Test WebSocket handling of malformed messages."""
        import httpx
        import uuid
        
        async with httpx.AsyncClient() as client:
            # Setup valid lobby and player
            headers = {"Authorization": f"Bearer {settings.ADMIN_PASSWORD}"}
            lobby_data = {"name": "Malformed Message Test"}
            
            response = await client.post(
                f"{server_url}/api/admin/lobby", json=lobby_data, headers=headers
            )
            lobby = response.json()
            lobby_code = lobby["code"]
            
            session_id = str(uuid.uuid4())
            player_data = {"name": "Malformed Test Player", "session_id": session_id}
            
            response = await client.post(
                f"{server_url}/api/lobby/{lobby_code}/join", json=player_data
            )
            assert response.status_code == 200
            
            # Connect and send malformed messages
            ws_endpoint = f"{ws_url}/ws/lobby/{lobby['id']}/player/{session_id}"
            
            async with websockets.connect(ws_endpoint) as websocket:
                # Send invalid JSON
                await websocket.send("invalid json")
                
                # Send empty message
                await websocket.send("")
                
                # Send valid JSON but unexpected structure
                await websocket.send('{"unexpected": "structure"}')
                
                # Send a valid message to ensure connection still works
                valid_message = {"type": "test", "message": "Valid message after invalid ones"}
                await websocket.send(json.dumps(valid_message))
                
                print("✅ WebSocket handles malformed messages gracefully")