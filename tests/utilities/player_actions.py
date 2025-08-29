"""
Player action utilities for testing.
"""

from playwright.async_api import Page, expect


class PlayerActions:
    """Utility class for player interactions."""

    def __init__(self, page: Page, server_url: str, player_name: str):
        self.page = page
        self.server_url = server_url
        self.player_name = player_name

    async def goto_home_page(self):
        """Navigate to the home page."""
        await self.page.goto(f"{self.server_url}/")
        await expect(self.page.locator("text=Raddle Teams")).to_be_visible()

    async def join_lobby(self, lobby_code: str):
        """Join a lobby with the given code."""
        # Fill player name
        name_input = self.page.locator(
            'input[placeholder*="name"], input[placeholder*="Name"]'
        )
        await name_input.fill(self.player_name)

        # Fill lobby code
        code_input = self.page.locator(
            'input[placeholder*="code"], input[placeholder*="Code"]'
        )
        await code_input.fill(lobby_code)

        # Click join button
        join_button = self.page.locator(
            'button:has-text("Join Lobby"), button:has-text("Join")'
        )
        await join_button.click()

        # Wait for lobby page to load
        await expect(self.page.locator("text=Lobby, text=Players")).to_be_visible()

    async def wait_in_lobby(self):
        """Wait in the lobby for other players or game start."""
        # Just wait for the lobby interface to be stable
        await expect(self.page.locator("text=Lobby")).to_be_visible()

    async def wait_for_game_start(self, timeout: int = 60000):
        """Wait for the game to start."""
        # This will be implemented when game functionality is added
        await expect(self.page.locator("text=Game Started, text=Puzzle")).to_be_visible(
            timeout=timeout
        )

    async def get_lobby_info(self):
        """Get information about the current lobby."""
        lobby_code = await self.page.locator(
            '[data-testid="lobby-code"]'
        ).first.text_content()

        # Count players in lobby
        player_elements = self.page.locator('[data-testid="player"], .player-item')
        player_count = await player_elements.count()

        return {
            "lobby_code": lobby_code.strip() if lobby_code else None,
            "player_count": player_count,
        }

    async def check_connection_status(self):
        """Check if WebSocket connection is active."""
        # Look for connection indicators in the UI
        connected_indicator = self.page.locator(
            "text=Connected, .connection-status.connected"
        )
        disconnected_indicator = self.page.locator(
            "text=Disconnected, .connection-status.disconnected"
        )

        if await connected_indicator.is_visible():
            return "connected"
        elif await disconnected_indicator.is_visible():
            return "disconnected"
        else:
            return "unknown"

    async def take_screenshot(self, name: str = None):
        """Take a screenshot of the player's view."""
        screenshot_name = name or f"player_{self.player_name}_screenshot"
        await self.page.screenshot(
            path=f"tests/recordings/screenshots/{screenshot_name}.png"
        )

    async def simulate_disconnect(self):
        """Simulate a network disconnect."""
        # Temporarily disable network
        await self.page.context.set_offline(True)

    async def simulate_reconnect(self):
        """Simulate reconnecting after a disconnect."""
        # Re-enable network
        await self.page.context.set_offline(False)

        # Refresh page to trigger reconnection
        await self.page.reload()

    async def enter_game_guess(self, word: str):
        """Enter a guess in the game (when game functionality is implemented)."""
        # This will be implemented when game functionality is added
        guess_input = self.page.locator(
            'input[placeholder*="guess"], input[placeholder*="word"]'
        )
        await guess_input.fill(word)

        submit_button = self.page.locator(
            'button:has-text("Submit"), button:has-text("Guess")'
        )
        await submit_button.click()

    async def wait_for_team_assignment(self, timeout: int = 30000):
        """Wait to be assigned to a team."""
        await expect(self.page.locator("text=Team, text=assigned")).to_be_visible(
            timeout=timeout
        )
