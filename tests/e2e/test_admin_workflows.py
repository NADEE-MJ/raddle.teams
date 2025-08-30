"""
Phase 1: Admin Workflow Tests

Tests admin-specific workflows:
- Admin authentication
- Lobby management operations
- Admin monitoring capabilities
- Admin error handling
"""

import pytest
import httpx
import asyncio
from tests.e2e.fixtures.server import ServerManager
from settings import settings


class TestAdminWorkflows:
    """Test admin-specific workflows end-to-end."""
    
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
    
    async def test_admin_authentication_workflow(self, server_url: str):
        """Test admin authentication workflow."""
        async with httpx.AsyncClient() as client:
            # Test authentication check endpoint
            headers = {"Authorization": f"Bearer {settings.ADMIN_PASSWORD}"}
            response = await client.get(f"{server_url}/api/admin/check", headers=headers)
            assert response.status_code == 200
            
            data = response.json()
            assert data["status"] == "authenticated"
            assert "message" in data
            
            print("✅ Admin authentication workflow complete")
    
    async def test_admin_lobby_management_workflow(self, server_url: str):
        """Test complete admin lobby management workflow."""
        async with httpx.AsyncClient() as client:
            headers = {"Authorization": f"Bearer {settings.ADMIN_PASSWORD}"}
            
            # 1. Check initial state - should have empty or minimal lobbies
            response = await client.get(f"{server_url}/api/admin/lobby", headers=headers)
            assert response.status_code == 200
            initial_lobbies = response.json()
            initial_count = len(initial_lobbies)
            
            # 2. Create multiple lobbies
            lobby_names = ["Admin Test Lobby 1", "Admin Test Lobby 2", "Admin Test Lobby 3"]
            created_lobbies = []
            
            for lobby_name in lobby_names:
                lobby_data = {"name": lobby_name}
                response = await client.post(
                    f"{server_url}/api/admin/lobby", json=lobby_data, headers=headers
                )
                assert response.status_code == 200
                lobby = response.json()
                created_lobbies.append(lobby)
                
                # Verify lobby structure
                assert "id" in lobby
                assert "code" in lobby
                assert "name" in lobby
                assert lobby["name"] == lobby_name
                assert len(lobby["code"]) == 6
            
            # 3. Verify all lobbies are listed
            response = await client.get(f"{server_url}/api/admin/lobby", headers=headers)
            assert response.status_code == 200
            all_lobbies = response.json()
            assert len(all_lobbies) >= initial_count + 3
            
            # Check that our lobbies are in the list
            created_lobby_ids = {lobby["id"] for lobby in created_lobbies}
            all_lobby_ids = {lobby["id"] for lobby in all_lobbies}
            assert created_lobby_ids.issubset(all_lobby_ids)
            
            print("✅ Admin lobby management workflow complete")
            return created_lobbies
    
    async def test_admin_monitoring_workflow(self, server_url: str):
        """Test admin monitoring capabilities."""
        async with httpx.AsyncClient() as client:
            headers = {"Authorization": f"Bearer {settings.ADMIN_PASSWORD}"}
            
            # Create a lobby for monitoring
            lobby_data = {"name": "Monitoring Test Lobby"}
            response = await client.post(
                f"{server_url}/api/admin/lobby", json=lobby_data, headers=headers
            )
            assert response.status_code == 200
            lobby = response.json()
            lobby_code = lobby["code"]
            
            # Initially no players
            response = await client.get(f"{server_url}/api/lobby/{lobby['id']}")
            assert response.status_code == 200
            lobby_info = response.json()
            assert len(lobby_info["players"]) == 0
            
            # Add players and monitor
            players = []
            for i in range(3):
                import uuid
                session_id = str(uuid.uuid4())
                player_data = {"name": f"Monitored Player {i+1}", "session_id": session_id}
                
                response = await client.post(
                    f"{server_url}/api/lobby/{lobby_code}/join", json=player_data
                )
                assert response.status_code == 200
                players.append(response.json())
                
                # Check lobby state after each player joins
                response = await client.get(f"{server_url}/api/lobby/{lobby['id']}")
                assert response.status_code == 200
                lobby_info = response.json()
                assert len(lobby_info["players"]) == i + 1
            
            # Final verification - should have all 3 players
            response = await client.get(f"{server_url}/api/lobby/{lobby['id']}")
            assert response.status_code == 200
            lobby_info = response.json()
            assert len(lobby_info["players"]) == 3
            
            player_names = {p["name"] for p in lobby_info["players"]}
            expected_names = {f"Monitored Player {i+1}" for i in range(3)}
            assert player_names == expected_names
            
            print("✅ Admin monitoring workflow complete")
    
    async def test_admin_concurrent_operations_workflow(self, server_url: str):
        """Test admin handling of concurrent operations."""
        async with httpx.AsyncClient() as client:
            headers = {"Authorization": f"Bearer {settings.ADMIN_PASSWORD}"}
            
            # Create multiple lobbies concurrently
            lobby_creation_tasks = []
            for i in range(5):
                lobby_data = {"name": f"Concurrent Admin Lobby {i+1}"}
                task = client.post(
                    f"{server_url}/api/admin/lobby", 
                    json=lobby_data, 
                    headers=headers
                )
                lobby_creation_tasks.append(task)
            
            # Execute all lobby creations simultaneously
            lobby_responses = await asyncio.gather(*lobby_creation_tasks)
            lobbies = [r.json() for r in lobby_responses]
            
            # Verify all lobbies were created successfully
            assert len(lobbies) == 5
            for i, lobby in enumerate(lobbies):
                assert lobby["name"] == f"Concurrent Admin Lobby {i+1}"
                assert "id" in lobby
                assert "code" in lobby
            
            # Verify all lobbies appear in admin list
            response = await client.get(f"{server_url}/api/admin/lobby", headers=headers)
            assert response.status_code == 200
            all_lobbies = response.json()
            
            created_lobby_codes = {lobby["code"] for lobby in lobbies}
            all_lobby_codes = {lobby["code"] for lobby in all_lobbies}
            assert created_lobby_codes.issubset(all_lobby_codes)
            
            print("✅ Admin concurrent operations workflow complete")
    
    async def test_admin_large_scale_monitoring(self, server_url: str):
        """Test admin monitoring with larger number of lobbies and players."""
        async with httpx.AsyncClient() as client:
            headers = {"Authorization": f"Bearer {settings.ADMIN_PASSWORD}"}
            
            # Create multiple lobbies
            lobbies = []
            for i in range(3):
                lobby_data = {"name": f"Large Scale Lobby {i+1}"}
                response = await client.post(
                    f"{server_url}/api/admin/lobby", json=lobby_data, headers=headers
                )
                assert response.status_code == 200
                lobbies.append(response.json())
            
            # Add multiple players to each lobby
            all_players = []
            for lobby in lobbies:
                lobby_players = []
                for j in range(4):  # 4 players per lobby
                    import uuid
                    session_id = str(uuid.uuid4())
                    player_data = {
                        "name": f"Player {j+1} in {lobby['name']}", 
                        "session_id": session_id
                    }
                    
                    response = await client.post(
                        f"{server_url}/api/lobby/{lobby['code']}/join", 
                        json=player_data
                    )
                    assert response.status_code == 200
                    lobby_players.append(response.json())
                
                all_players.extend(lobby_players)
            
            # Verify admin can monitor all lobbies
            for lobby in lobbies:
                response = await client.get(f"{server_url}/api/lobby/{lobby['id']}")
                assert response.status_code == 200
                lobby_info = response.json()
                assert len(lobby_info["players"]) == 4
            
            # Verify admin sees all lobbies in the list
            response = await client.get(f"{server_url}/api/admin/lobby", headers=headers)
            assert response.status_code == 200
            all_lobbies = response.json()
            
            # Our lobbies should be in the list
            created_lobby_ids = {lobby["id"] for lobby in lobbies}
            all_lobby_ids = {lobby["id"] for lobby in all_lobbies}
            assert created_lobby_ids.issubset(all_lobby_ids)
            
            print("✅ Admin large scale monitoring workflow complete")
            print(f"   Total lobbies created: {len(lobbies)}")
            print(f"   Total players added: {len(all_players)}")


class TestAdminErrorHandling:
    """Test admin error handling scenarios."""
    
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
    
    async def test_admin_authentication_errors(self, server_url: str):
        """Test admin authentication error scenarios."""
        async with httpx.AsyncClient() as client:
            # Test without auth header
            response = await client.get(f"{server_url}/api/admin/lobby")
            assert response.status_code == 403
            
            # Test with invalid token
            headers = {"Authorization": "Bearer invalid_token"}
            response = await client.get(f"{server_url}/api/admin/lobby", headers=headers)
            assert response.status_code == 403
            
            # Test with malformed auth header
            headers = {"Authorization": "Invalid format"}
            response = await client.get(f"{server_url}/api/admin/lobby", headers=headers)
            assert response.status_code in [401, 403]  # Either is acceptable
            
            # Test with empty token
            headers = {"Authorization": "Bearer "}
            response = await client.get(f"{server_url}/api/admin/lobby", headers=headers)
            assert response.status_code in [401, 403]  # Either is acceptable
            
            print("✅ Admin authentication errors handled correctly")
    
    async def test_admin_lobby_creation_errors(self, server_url: str):
        """Test admin lobby creation error scenarios."""
        async with httpx.AsyncClient() as client:
            headers = {"Authorization": f"Bearer {settings.ADMIN_PASSWORD}"}
            
            # Test missing lobby name
            response = await client.post(
                f"{server_url}/api/admin/lobby", json={}, headers=headers
            )
            assert response.status_code == 422  # Validation error
            
            # Test empty lobby name
            response = await client.post(
                f"{server_url}/api/admin/lobby", json={"name": ""}, headers=headers
            )
            # This might succeed or fail depending on validation rules
            # The important thing is it doesn't crash the server
            assert response.status_code in [200, 422]
            
            # Test very long lobby name
            long_name = "x" * 1000
            response = await client.post(
                f"{server_url}/api/admin/lobby", 
                json={"name": long_name}, 
                headers=headers
            )
            # Should either succeed or fail gracefully
            assert response.status_code in [200, 422]
            
            # Test null lobby name
            response = await client.post(
                f"{server_url}/api/admin/lobby", 
                json={"name": None}, 
                headers=headers
            )
            assert response.status_code == 422  # Validation error
            
            print("✅ Admin lobby creation errors handled correctly")
    
    async def test_admin_monitoring_errors(self, server_url: str):
        """Test admin monitoring error scenarios."""
        async with httpx.AsyncClient() as client:
            # Test getting info for non-existent lobby
            response = await client.get(f"{server_url}/api/lobby/99999")
            assert response.status_code == 404
            
            # Test getting info for invalid lobby ID format
            response = await client.get(f"{server_url}/api/lobby/invalid")
            assert response.status_code == 422  # Should be validation error
            
            print("✅ Admin monitoring errors handled correctly")
    
    async def test_admin_stress_test(self, server_url: str):
        """Test admin endpoints under stress."""
        async with httpx.AsyncClient() as client:
            headers = {"Authorization": f"Bearer {settings.ADMIN_PASSWORD}"}
            
            # Rapid lobby creation
            rapid_tasks = []
            for i in range(10):
                lobby_data = {"name": f"Stress Test Lobby {i+1}"}
                task = client.post(
                    f"{server_url}/api/admin/lobby", 
                    json=lobby_data, 
                    headers=headers
                )
                rapid_tasks.append(task)
            
            # Execute all at once
            responses = await asyncio.gather(*rapid_tasks, return_exceptions=True)
            
            # Count successful responses
            successful = sum(1 for r in responses if hasattr(r, 'status_code') and r.status_code == 200)
            
            # Should handle most or all requests successfully
            assert successful >= 8  # Allow for some potential failures under stress
            
            print(f"✅ Admin stress test complete: {successful}/10 requests successful")


class TestAdminPlayerCoordination:
    """Test coordination between admin and player operations."""
    
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
    
    async def test_admin_player_real_time_coordination(self, server_url: str):
        """Test real-time coordination between admin and player operations."""
        async with httpx.AsyncClient() as client:
            headers = {"Authorization": f"Bearer {settings.ADMIN_PASSWORD}"}
            
            # Admin creates lobby
            lobby_data = {"name": "Real-time Coordination Test"}
            response = await client.post(
                f"{server_url}/api/admin/lobby", json=lobby_data, headers=headers
            )
            assert response.status_code == 200
            lobby = response.json()
            
            # Simulate real-time player joining while admin monitors
            async def player_joins():
                """Simulate players joining over time."""
                players = []
                for i in range(5):
                    # Small delay between joins
                    await asyncio.sleep(0.1)
                    
                    import uuid
                    session_id = str(uuid.uuid4())
                    player_data = {"name": f"RT Player {i+1}", "session_id": session_id}
                    
                    response = await client.post(
                        f"{server_url}/api/lobby/{lobby['code']}/join", 
                        json=player_data
                    )
                    if response.status_code == 200:
                        players.append(response.json())
                
                return players
            
            async def admin_monitors():
                """Simulate admin monitoring in real-time."""
                monitoring_results = []
                for i in range(6):  # Monitor 6 times (before and after each join)
                    await asyncio.sleep(0.08)  # Slightly offset from player joins
                    
                    response = await client.get(f"{server_url}/api/lobby/{lobby['id']}")
                    if response.status_code == 200:
                        lobby_info = response.json()
                        monitoring_results.append(len(lobby_info["players"]))
                
                return monitoring_results
            
            # Run player joins and admin monitoring concurrently
            players, monitoring_results = await asyncio.gather(
                player_joins(), 
                admin_monitors()
            )
            
            # Verify results
            assert len(players) == 5
            assert len(monitoring_results) == 6
            
            # The monitoring should show increasing player counts
            # (exact timing might vary, but we should see the trend)
            final_count = monitoring_results[-1]
            assert final_count >= 4  # Allow for timing variations in concurrent operations
            
            print("✅ Admin-player real-time coordination test complete")
            print(f"   Players added: {len(players)}")
            print(f"   Monitoring snapshots: {monitoring_results}")
    
    async def test_admin_handles_player_session_changes(self, server_url: str):
        """Test admin monitoring when players change sessions/lobbies."""
        async with httpx.AsyncClient() as client:
            headers = {"Authorization": f"Bearer {settings.ADMIN_PASSWORD}"}
            
            # Create two lobbies
            lobby1_data = {"name": "Session Change Lobby 1"}
            lobby2_data = {"name": "Session Change Lobby 2"}
            
            lobby1_response = await client.post(
                f"{server_url}/api/admin/lobby", json=lobby1_data, headers=headers
            )
            lobby2_response = await client.post(
                f"{server_url}/api/admin/lobby", json=lobby2_data, headers=headers
            )
            
            lobby1 = lobby1_response.json()
            lobby2 = lobby2_response.json()
            
            # Player joins first lobby
            import uuid
            session_id = str(uuid.uuid4())
            player_data = {"name": "Session Switcher", "session_id": session_id}
            
            response = await client.post(
                f"{server_url}/api/lobby/{lobby1['code']}/join", json=player_data
            )
            assert response.status_code == 200
            
            # Admin checks lobby 1 - should have 1 player
            response = await client.get(f"{server_url}/api/lobby/{lobby1['id']}")
            assert response.status_code == 200
            lobby1_info = response.json()
            assert len(lobby1_info["players"]) == 1
            
            # Admin checks lobby 2 - should have 0 players
            response = await client.get(f"{server_url}/api/lobby/{lobby2['id']}")
            assert response.status_code == 200
            lobby2_info = response.json()
            assert len(lobby2_info["players"]) == 0
            
            # Player switches to second lobby with same session ID
            response = await client.post(
                f"{server_url}/api/lobby/{lobby2['code']}/join", json=player_data
            )
            assert response.status_code == 200
            
            # Admin checks both lobbies again
            # Lobby 1 should now have 0 players (player moved)
            response = await client.get(f"{server_url}/api/lobby/{lobby1['id']}")
            assert response.status_code == 200
            lobby1_info = response.json()
            assert len(lobby1_info["players"]) == 0
            
            # Lobby 2 should have 1 player (player moved here)
            response = await client.get(f"{server_url}/api/lobby/{lobby2['id']}")
            assert response.status_code == 200
            lobby2_info = response.json()
            assert len(lobby2_info["players"]) == 1
            assert lobby2_info["players"][0]["name"] == "Session Switcher"
            
            print("✅ Admin handles player session changes correctly")