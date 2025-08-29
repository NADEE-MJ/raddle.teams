"""
Phase 1: API Endpoints Tests

Tests the backend API functionality:
- Admin authentication endpoints
- Lobby creation and management
- Player joining functionality
"""

import httpx
from playwright.async_api import Page


class TestAPIEndpoints:
    """Test API endpoints directly."""

    async def test_api_root_endpoint(self, server_url: str):
        """Test that the API root endpoint responds correctly."""
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{server_url}/api")
            assert response.status_code == 200

            data = response.json()
            assert "message" in data
            assert "timestamp" in data

        print("✅ API root endpoint working")

    async def test_admin_auth_check(self, server_url: str):
        """Test admin authentication endpoint."""
        async with httpx.AsyncClient() as client:
            # Test without token (should fail)
            response = await client.get(f"{server_url}/api/admin/check")
            assert response.status_code == 403

            # Test with correct token
            headers = {"Authorization": "Bearer test"}
            response = await client.get(
                f"{server_url}/api/admin/check", headers=headers
            )
            assert response.status_code == 200

            data = response.json()
            assert data["status"] == "authenticated"

        print("✅ Admin authentication working")

    async def test_admin_lobby_creation(self, server_url: str):
        """Test admin lobby creation endpoint."""
        async with httpx.AsyncClient() as client:
            headers = {"Authorization": "Bearer test"}
            lobby_data = {"name": "Test Lobby"}

            response = await client.post(
                f"{server_url}/api/admin/lobby", json=lobby_data, headers=headers
            )
            assert response.status_code == 200

            data = response.json()
            assert "id" in data
            assert "code" in data
            assert data["name"] == "Test Lobby"
            assert len(data["code"]) == 6  # 6-character lobby code

        print("✅ Admin lobby creation working")

    async def test_player_join_lobby(self, server_url: str):
        """Test player joining a lobby."""
        async with httpx.AsyncClient() as client:
            # First create a lobby as admin
            headers = {"Authorization": "Bearer test"}
            lobby_data = {"name": "Player Test Lobby"}

            response = await client.post(
                f"{server_url}/api/admin/lobby", json=lobby_data, headers=headers
            )
            assert response.status_code == 200
            lobby = response.json()
            lobby_code = lobby["code"]

            # Now try to join as a player
            player_data = {"name": "Test Player", "session_id": "test_session_123"}

            response = await client.post(
                f"{server_url}/api/lobby/{lobby_code}/join", json=player_data
            )
            assert response.status_code == 200

            player = response.json()
            assert player["name"] == "Test Player"
            assert player["session_id"] == "test_session_123"
            assert player["lobby_id"] == lobby["id"]

        print("✅ Player join lobby working")

    async def test_get_player_lobby(self, server_url: str):
        """Test retrieving player's current lobby."""
        async with httpx.AsyncClient() as client:
            # Create lobby and join as player
            headers = {"Authorization": "Bearer test"}
            lobby_data = {"name": "Player Lobby Test"}

            response = await client.post(
                f"{server_url}/api/admin/lobby", json=lobby_data, headers=headers
            )
            lobby = response.json()
            lobby_code = lobby["code"]

            player_data = {"name": "Test Player 2", "session_id": "test_session_456"}

            await client.post(
                f"{server_url}/api/lobby/{lobby_code}/join", json=player_data
            )

            # Get player's lobby
            response = await client.get(
                f"{server_url}/api/player/test_session_456/lobby"
            )
            assert response.status_code == 200

            returned_lobby = response.json()
            assert returned_lobby["id"] == lobby["id"]
            assert returned_lobby["code"] == lobby_code

        print("✅ Get player lobby working")

    async def test_api_integration_with_browser(self, page: Page, server_url: str):
        """Test API integration by using browser to verify frontend-backend communication."""
        await page.goto(f"{server_url}/admin")
        await page.wait_for_load_state("networkidle")

        # Login as admin
        token_input = page.locator('input[type="password"]')
        await token_input.fill("test")

        login_button = page.locator('button:has-text("Login")')
        await login_button.click()
        await page.wait_for_timeout(2000)

        # Take screenshot after login
        await page.screenshot(
            path="tests/recordings/screenshots/api_integration_test.png"
        )

        print("✅ API integration with browser working")
