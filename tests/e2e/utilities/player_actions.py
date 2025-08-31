from playwright.async_api import Page, expect


class PlayerActions:
    def __init__(self, page: Page, server_url: str, player_name: str = "Test Player"):
        self.page = page
        self.server_url = server_url
        self.player_name = player_name

    async def goto_home_page(self):
        await self.page.goto(f"{self.server_url}/", wait_until="networkidle")
        try:
            await expect(self.page.locator("h1:has-text('Raddle Teams')")).to_be_visible(timeout=2000)
        except AssertionError:
            if await self.page.locator("p:has-text('Lobby Code:')").is_visible():
                return
            await expect(self.page.locator("h1:has-text('Raddle Teams')")).to_be_visible()

    async def fill_name_and_code(self, name: str, lobby_code: str):
        name_input = self.page.locator('#name, input[placeholder*="name"], input[placeholder*="Name"]')
        await name_input.fill(name)

        code_input = self.page.locator('#lobbyCode, input[placeholder*="code"], input[placeholder*="Code"]')
        await code_input.fill(lobby_code)

    async def join_lobby(self):
        join_button = self.page.locator('button:has-text("Join Lobby"), button:has-text("Join")')
        await join_button.click()

        await expect(self.page.locator("p:has-text('Lobby Code:')")).to_be_visible()

    async def join_lobby_expect_error(self):
        join_button = self.page.locator('button:has-text("Join Lobby"), button:has-text("Join")')
        await join_button.click()

        await expect(self.page.locator("h1:has-text('Raddle Teams')")).to_be_visible()

    async def leave_lobby(self):
        leave_button = self.page.locator('button:has-text("Leave"), button:has-text("Leave Lobby")')
        await leave_button.click()

        await expect(self.page.locator("h1:has-text('Raddle Teams')")).to_be_visible()

    async def wait_in_lobby(self):
        await expect(self.page.locator("p:has-text('Lobby Code:')")).to_be_visible()

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
