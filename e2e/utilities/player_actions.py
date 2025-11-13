from playwright.async_api import Page, expect


class PlayerActions:
    def __init__(self, page: Page, server_url: str, player_name: str = "Test Player"):
        self.page = page
        self.server_url = server_url
        self.player_name = player_name

    async def goto_home_page(self):
        await self.page.goto(f"{self.server_url}/", wait_until="networkidle")
        try:
            await expect(self.page.locator('[data-testid="landing-page-title"]')).to_be_visible(timeout=2000)
        except AssertionError:
            if await self.page.locator("p:has-text('Lobby Code:')").is_visible():
                return
            await expect(self.page.locator('[data-testid="landing-page-title"]')).to_be_visible()

    async def fill_name_and_code(self, name: str, lobby_code: str):
        name_input = self.page.locator('[data-testid="name-input"]')
        await name_input.fill(name)

        code_input = self.page.locator('[data-testid="lobby-code-input"]')
        await code_input.fill(lobby_code)

    async def join_lobby(self):
        join_button = self.page.locator('[data-testid="join-lobby-button"]')
        await join_button.click()

        await expect(self.page.locator('[data-testid="lobby-code"]')).to_be_visible()

    async def join_lobby_expect_error(self):
        join_button = self.page.locator('[data-testid="join-lobby-button"]')
        await join_button.click()

        await expect(self.page.locator('[data-testid="landing-page-title"]')).to_be_visible()

    async def leave_lobby(self):
        leave_button = self.page.locator('[data-testid="logout-button"]')
        await leave_button.click()

        await expect(self.page.locator('[data-testid="landing-page-title"]')).to_be_visible()

    async def wait_in_lobby(self):
        await expect(self.page.locator('[data-testid="lobby-code"]')).to_be_visible()

    async def wait_for_game_start(self, timeout: int = 60000):
        await expect(self.page.locator("text=Game Started, text=Puzzle")).to_be_visible(timeout=timeout)

    async def get_lobby_info(self):
        lobby_code_element = self.page.locator('span:has-text("Code:") + span, [data-testid="lobby-code"]').first
        lobby_code = await lobby_code_element.text_content() if await lobby_code_element.is_visible() else None

        player_elements = self.page.locator('[data-testid="player"], .player-item, li:has-text("👤")')
        player_count = await player_elements.count()

        return {
            "lobby_code": lobby_code.strip() if lobby_code else None,
            "player_count": player_count,
        }

    async def verify_lobby_details(self, expected_lobby_name: str, expected_code: str):
        await expect(self.page.locator(f"text={expected_lobby_name}")).to_be_visible()
        await expect(self.page.locator(f"text={expected_code}")).to_be_visible()
        await expect(self.page.locator(f"text={self.player_name}")).to_be_visible()

    async def wait_for_other_players(self, expected_count: int, timeout: int = 30000):
        await expect(self.page.locator(f"text=/{expected_count} players?/")).to_be_visible(timeout=timeout)

    async def check_connection_status(self):
        connected_indicator = self.page.locator("text=Connected, .connection-status.connected")
        disconnected_indicator = self.page.locator("text=Disconnected, .connection-status.disconnected")

        if await connected_indicator.is_visible():
            return "connected"
        elif await disconnected_indicator.is_visible():
            return "disconnected"
        else:
            return "unknown"

    async def simulate_disconnect(self):
        await self.page.context.set_offline(True)

    async def simulate_reconnect(self):
        await self.page.context.set_offline(False)
        # Refresh page to trigger reconnection
        await self.page.reload()

    async def enter_game_guess(self, word: str):
        guess_input = self.page.locator('input[placeholder*="guess"], input[placeholder*="word"]')
        await guess_input.fill(word)

        submit_button = self.page.locator('button:has-text("Submit"), button:has-text("Guess")')
        await submit_button.click()

    async def wait_for_team_assignment(self, timeout: int = 30000):
        await expect(self.page.locator("text=Team, text=assigned")).to_be_visible(timeout=timeout)

    async def refresh_lobby(self):
        await self.page.reload(wait_until="networkidle")
        await self.wait_in_lobby()

    async def wait_for_player_count(self, expected_count: int, timeout: int = 15000):
        await expect(self.page.locator(f"text=Players ({expected_count})")).to_be_visible(timeout=timeout)

    async def wait_for_websocket_update(self, delay: int = 1000):
        await self.page.wait_for_timeout(delay)

    async def wait_for_game_to_start(self, timeout: int = 30000):
        """Wait for game to start and navigate to game page."""
        # Wait for navigation to /game
        await self.page.wait_for_url("**/game", timeout=timeout)
        # Wait a moment for the page to stabilize
        await self.page.wait_for_timeout(1000)

    async def verify_in_team(self, team_name: str, timeout: int = 5000):
        """Verify that player sees themselves in a specific team."""
        team_section = self.page.locator(f'[data-testid="team-section-{team_name}"]')
        await expect(team_section).to_be_visible(timeout=timeout)
        # Verify player is in this team
        await expect(team_section.locator(f'[data-testid="team-member-{self.player_name}"]')).to_be_visible(
            timeout=timeout
        )

    async def verify_unassigned(self, timeout: int = 5000):
        """Verify that player sees themselves as unassigned."""
        await expect(
            self.page.locator(f'[data-testid="team-status-{self.player_name}"]:has-text("No team")')
        ).to_be_visible(timeout=timeout)

    async def verify_team_count(self, expected_count: int, timeout: int = 5000):
        """Verify the number of teams visible."""
        await expect(
            self.page.locator(f'[data-testid="player-teams-heading"]:has-text("Teams ({expected_count})")')
        ).to_be_visible(timeout=timeout)

    async def submit_guess(self, word: str, word_index: int | None = None):
        """Submit a guess in the game."""
        # Wait for game page to be ready
        await expect(self.page.locator("text=/Puzzle:|Team:/")).to_be_visible()

        # Type the guess
        guess_input = self.page.locator('input[placeholder*="guess"], input[type="text"]').first
        await guess_input.fill(word)

        # Press Enter to submit
        await guess_input.press("Enter")

        # Wait a moment for the guess to be processed
        await self.page.wait_for_timeout(500)

    async def verify_word_revealed(self, word: str, timeout: int = 10000):
        """Verify that a word appears as revealed in the ladder."""
        await expect(self.page.locator(f"text={word}").first).to_be_visible(timeout=timeout)

    async def verify_game_completed(self, timeout: int = 30000):
        """Verify that the game shows as completed."""
        # Look for completion indicator
        await expect(self.page.locator("text=Completed, text=Won, text=Finished").first).to_be_visible(timeout=timeout)

    async def wait_for_team_status_change(self, expected_status: str, timeout: int = 5000):
        """Wait for player's team status to change in the player list."""
        player_status = self.page.locator(f"text={self.player_name}").locator("..").locator("div")
        await expect(player_status).to_contain_text(expected_status, timeout=timeout)
