from playwright.async_api import Page, expect


class PlayerActions:
    def __init__(self, page: Page, server_url: str, player_name: str = "Test Player"):
        self.page = page
        self.server_url = server_url
        self.player_name = player_name

    async def goto_home_page(self):
        await self.page.goto(f"{self.server_url}/", wait_until="networkidle")
        await expect(self.page.locator("h1:has-text('Raddle Teams')")).to_be_visible()

    async def fill_name_and_code(self, name: str, lobby_code: str):
        """Fill in the name and lobby code fields"""
        name_input = self.page.locator(
            '#name, input[placeholder*="name"], input[placeholder*="Name"]'
        )
        await name_input.fill(name)

        code_input = self.page.locator(
            '#lobbyCode, input[placeholder*="code"], input[placeholder*="Code"]'
        )
        await code_input.fill(lobby_code)

    async def join_lobby(self):
        """Click the join lobby button and wait for lobby page to load"""
        join_button = self.page.locator(
            'button:has-text("Join Lobby"), button:has-text("Join")'
        )
        await join_button.click()

        # Wait for lobby page to load
        await expect(self.page.locator("h1:has-text('Lobby:')")).to_be_visible()

    async def join_lobby_expect_error(self):
        """Click join lobby button but expect an error instead of successful join"""
        join_button = self.page.locator(
            'button:has-text("Join Lobby"), button:has-text("Join")'
        )
        await join_button.click()

        # Should stay on home page, no navigation to lobby
        await expect(self.page.locator("h1:has-text('Raddle Teams')")).to_be_visible()

    async def leave_lobby(self):
        """Leave the current lobby and return to home page"""
        leave_button = self.page.locator(
            'button:has-text("Leave"), button:has-text("Leave Lobby")'
        )
        await leave_button.click()

        # Should be back on home page
        await expect(self.page.locator("h1:has-text('Raddle Teams')")).to_be_visible()

    async def wait_in_lobby(self):
        """Wait for lobby page to be visible"""
        await expect(self.page.locator("h1:has-text('Lobby:')")).to_be_visible()

    async def wait_for_game_start(self, timeout: int = 60000):
        """Wait for game to start (future implementation)"""
        await expect(self.page.locator("text=Game Started, text=Puzzle")).to_be_visible(
            timeout=timeout
        )

    async def get_lobby_info(self):
        """Get current lobby information"""
        # Try to find lobby code from the UI
        lobby_code_element = self.page.locator(
            'span:has-text("Code:") + span, [data-testid="lobby-code"]'
        ).first
        lobby_code = (
            await lobby_code_element.text_content()
            if await lobby_code_element.is_visible()
            else None
        )

        # Count players in the lobby
        player_elements = self.page.locator(
            '[data-testid="player"], .player-item, li:has-text("👤")'
        )
        player_count = await player_elements.count()

        return {
            "lobby_code": lobby_code.strip() if lobby_code else None,
            "player_count": player_count,
        }

    async def verify_lobby_details(self, expected_lobby_name: str, expected_code: str):
        """Verify lobby details are displayed correctly"""
        await expect(self.page.locator(f"text={expected_lobby_name}")).to_be_visible()
        await expect(self.page.locator(f"text={expected_code}")).to_be_visible()
        await expect(self.page.locator(f"text={self.player_name}")).to_be_visible()

    async def wait_for_other_players(self, expected_count: int, timeout: int = 30000):
        """Wait for a specific number of players to join the lobby"""
        await expect(
            self.page.locator(f"text=/{expected_count} players?/")
        ).to_be_visible(timeout=timeout)

    async def check_connection_status(self):
        """Check the current WebSocket connection status"""
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

    async def simulate_disconnect(self):
        """Simulate network disconnection"""
        await self.page.context.set_offline(True)

    async def simulate_reconnect(self):
        """Simulate network reconnection"""
        await self.page.context.set_offline(False)
        # Refresh page to trigger reconnection
        await self.page.reload()

    async def enter_game_guess(self, word: str):
        """Enter a guess in the game (future implementation)"""
        guess_input = self.page.locator(
            'input[placeholder*="guess"], input[placeholder*="word"]'
        )
        await guess_input.fill(word)

        submit_button = self.page.locator(
            'button:has-text("Submit"), button:has-text("Guess")'
        )
        await submit_button.click()

    async def wait_for_team_assignment(self, timeout: int = 30000):
        """Wait for team assignment (future implementation)"""
        await expect(self.page.locator("text=Team, text=assigned")).to_be_visible(
            timeout=timeout
        )

    async def refresh_lobby(self):
        """Refresh the current lobby page"""
        await self.page.reload(wait_until="networkidle")
        await self.wait_in_lobby()

    async def take_screenshot(self, name: str = None):
        """Take a screenshot for debugging"""
        screenshot_name = name or f"player_{self.player_name}_screenshot"
        await self.page.screenshot(
            path=f"tests/recordings/screenshots/{screenshot_name}.png"
        )
