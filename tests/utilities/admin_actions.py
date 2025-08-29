"""
Admin dashboard action utilities for testing.
"""

import re

from playwright.async_api import Page, expect


class AdminActions:
    """Utility class for admin dashboard interactions."""

    def __init__(self, page: Page, server_url: str):
        self.page = page
        self.server_url = server_url

    async def goto_admin_page(self):
        """Navigate to the admin page."""
        await self.page.goto(f"{self.server_url}/admin")
        await expect(self.page).to_have_title(re.compile("Admin"))

    async def login(self, admin_token: str = "admin123"):
        """Login to admin dashboard."""
        # Fill admin token
        token_input = self.page.locator(
            'input[type="password"], input[placeholder*="token"], input[placeholder*="Token"]'
        )
        await token_input.fill(admin_token)

        # Click login button
        login_button = self.page.locator(
            'button:has-text("Login"), button[type="submit"]'
        )
        await login_button.click()

        # Wait for successful login (dashboard should appear)
        await expect(
            self.page.locator("text=Create Lobby, text=All Lobbies")
        ).to_be_visible()

    async def create_lobby(self, lobby_name: str = "Test Lobby") -> str:
        """Create a new lobby and return the lobby code."""
        # Fill lobby name
        name_input = self.page.locator(
            'input[placeholder*="lobby name"], input[placeholder*="Lobby Name"]'
        )
        await name_input.fill(lobby_name)

        # Click create button
        create_button = self.page.locator(
            'button:has-text("Create Lobby"), button:has-text("Create")'
        )
        await create_button.click()

        # Wait for lobby to be created and extract the code
        lobby_code_element = self.page.locator("text=/[A-Z0-9]{6}/")
        await expect(lobby_code_element).to_be_visible()
        lobby_code = await lobby_code_element.text_content()

        return lobby_code.strip()

    async def view_all_lobbies(self):
        """Navigate to view all lobbies."""
        view_button = self.page.locator(
            'button:has-text("View All Lobbies"), button:has-text("All Lobbies")'
        )
        await view_button.click()

        # Wait for lobbies list to load
        await expect(
            self.page.locator("text=Lobbies, text=Active Lobbies")
        ).to_be_visible()

    async def peek_into_lobby(self, lobby_code: str):
        """Peek into a specific lobby."""
        # Find the lobby in the list and click peek
        lobby_row = self.page.locator(f"text={lobby_code}").locator("..")
        peek_button = lobby_row.locator(
            'button:has-text("Peek"), button:has-text("View")'
        )
        await peek_button.click()

        # Wait for lobby details to load
        await expect(self.page.locator("text=Players, text=Teams")).to_be_visible()

    async def get_lobby_player_count(self, lobby_code: str) -> int:
        """Get the number of players in a lobby."""
        # This will depend on your exact UI structure
        lobby_info = self.page.locator(f"text={lobby_code}").locator("..")
        player_count_text = await lobby_info.locator(
            "text=/\\d+ players?/"
        ).text_content()

        # Extract number from text like "3 players"
        match = re.search(r"(\d+)", player_count_text)
        return int(match.group(1)) if match else 0

    async def wait_for_players(self, expected_count: int, timeout: int = 30000):
        """Wait for a specific number of players to join."""
        await expect(
            self.page.locator(f"text=/{expected_count} players?/")
        ).to_be_visible(timeout=timeout)

    async def take_screenshot(self, name: str = "admin_screenshot"):
        """Take a screenshot of the admin dashboard."""
        await self.page.screenshot(path=f"tests/recordings/screenshots/{name}.png")

    async def monitor_websocket_messages(self):
        """Monitor WebSocket messages (for debugging)."""
        messages = []

        def handle_websocket(ws):
            def on_message(payload):
                messages.append(payload)

            ws.on("framereceived", on_message)

        self.page.on("websocket", handle_websocket)
        return messages
