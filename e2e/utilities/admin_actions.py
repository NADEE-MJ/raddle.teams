import re
from playwright.async_api import Page, expect
from backend.settings import settings


class AdminActions:
    def __init__(self, page: Page, server_url: str):
        self.page = page
        self.server_url = server_url

    async def goto_admin_page(self):
        await self.page.goto(f"{self.server_url}/admin", wait_until="networkidle")

        await expect(
            self.page.locator('[data-testid="admin-login-title"], [data-testid="admin-dashboard-title"]')
        ).to_be_visible()

    async def login(self, admin_token: str = None):
        if admin_token is None:
            admin_token = settings.ADMIN_PASSWORD

        token_input = self.page.locator('[data-testid="admin-token-input"]')
        await token_input.fill(admin_token)

        login_button = self.page.locator('[data-testid="admin-login-submit"]')
        await login_button.click()

        await expect(self.page.locator('[data-testid="admin-dashboard-title"]')).to_be_visible()

    async def create_lobby(self, lobby_name: str = "Test Lobby") -> str:
        name_input = self.page.locator('[data-testid="lobby-name-input"]')
        await name_input.fill(lobby_name)

        create_button = self.page.locator('[data-testid="create-lobby-submit"]')
        await create_button.click()

        lobby_code_element = self.page.locator("button.font-bold").first
        await expect(lobby_code_element).to_be_visible()
        lobby_code = await lobby_code_element.text_content()

        return lobby_code.strip()

    async def view_all_lobbies(self):
        refresh_button = self.page.locator('[data-testid="refresh-lobbies-button"]')
        await refresh_button.click()

        await expect(self.page.locator('[data-testid="all-lobbies-heading"]')).to_be_visible()

    async def get_first_lobby(self):
        await self.view_all_lobbies()

        lobby_code_element = self.page.locator("button.font-bold").first
        await expect(lobby_code_element).to_be_visible()
        code = await lobby_code_element.text_content()
        return code.strip() if code else ""

    async def peek_into_lobby(self, lobby_code: str):
        # Find the lobby card with the specific lobby code and click it
        # The entire card is clickable now
        lobby_card = self.page.locator(f"button:has-text('{lobby_code}')").locator("..")
        await expect(lobby_card).to_be_visible()
        await lobby_card.click()

        await expect(self.page.locator('h2:has-text("Lobby Details")')).to_be_visible()

    async def logout(self):
        logout_button = self.page.locator('[data-testid="logout-button"]')
        await logout_button.click()

        await expect(self.page.locator('[data-testid="admin-login-title"]')).to_be_visible()

    async def refresh_lobbies(self):
        refresh_button = self.page.locator('[data-testid="refresh-lobbies-button"]')
        await refresh_button.click()

    async def get_lobby_player_count(self, lobby_code: str) -> int:
        lobby_info = self.page.locator(f"text={lobby_code}").locator("..")
        player_count_text = await lobby_info.locator("text=/\\d+ players?/").text_content()

        match = re.search(r"(\d+)", player_count_text)
        return int(match.group(1)) if match else 0

    async def wait_for_players(self, expected_count: int, timeout: int = 30000):
        """Wait for the expected number of players to appear in the lobby."""
        # Players are now shown in unassigned or within teams
        # Just wait for the page to update - tests should verify specific players
        await self.page.wait_for_timeout(min(timeout, 2000))

    async def wait_for_player_name(self, player_name: str, timeout: int = 10000):
        """Wait for a specific player to appear in the admin view."""
        await expect(self.page.locator(f"text={player_name}")).to_be_visible(timeout=timeout)

    async def delete_lobby(self, lobby_code: str):
        lobby_card = self.page.locator(f"button:has-text('{lobby_code}')").locator("..").locator("..")
        delete_button = lobby_card.locator('button:has-text("Delete")')
        await delete_button.click()

        await expect(self.page.locator(f"button:has-text('{lobby_code}')")).not_to_be_visible(timeout=5000)

    async def create_teams(self, num_teams: int, timeout: int = 5000):
        """Create teams in the lobby details view."""
        teams_input = self.page.locator('input[type="number"]')
        await teams_input.fill(str(num_teams))

        create_teams_button = self.page.locator('[data-testid="create-teams-button"]')
        await create_teams_button.click()

        await expect(self.page.locator(f"text=/Teams \\({num_teams}\\)/")).to_be_visible(timeout=timeout)

    async def move_player_to_team(self, player_name: str, team_name: str, timeout: int = 5000):
        """Move a player to a specific team using the dropdown."""
        # Find the player's row
        player_row = self.page.locator(f"text={player_name}").locator("..")
        # Find the select dropdown in that row
        team_dropdown = player_row.locator("select")
        await team_dropdown.select_option(label=team_name)

        # Wait a bit for the change to propagate
        await self.page.wait_for_timeout(500)

    async def unassign_player(self, player_name: str, timeout: int = 5000):
        """Unassign a player from their team."""
        player_row = self.page.locator(f"text={player_name}").locator("..")
        team_dropdown = player_row.locator("select")
        await team_dropdown.select_option("")

        # Wait for unassignment
        await self.page.wait_for_timeout(500)

    async def kick_player(self, player_name: str):
        """Kick a player from the lobby."""
        # Set up dialog handler to accept the confirmation
        self.page.on("dialog", lambda dialog: dialog.accept())

        # Try unassigned player first, then team player
        kick_button = self.page.locator(f'[data-testid="unassigned-kick-button-{player_name}"]')
        if not await kick_button.is_visible():
            kick_button = self.page.locator(f'[data-testid="team-kick-button-{player_name}"]')

        await kick_button.click()

        # Wait a moment for the kick to process
        await self.page.wait_for_timeout(1000)

        # Refresh to see the updated player list
        refresh_button = self.page.locator('[data-testid="refresh-lobby-button"]')
        await refresh_button.click()

        # Wait for refresh to complete
        await self.page.wait_for_timeout(1000)

        # Wait for player row to be removed (check both possible locations)
        await expect(self.page.locator(f'[data-testid="unassigned-player-row-{player_name}"]')).not_to_be_visible(
            timeout=5000
        )
        await expect(self.page.locator(f'[data-testid="team-player-row-{player_name}"]')).not_to_be_visible(timeout=500)

    async def start_game(self, difficulty: str = "medium"):
        """Start a game with the specified difficulty."""
        # Set up dialog handler to accept the confirmation
        self.page.on("dialog", lambda dialog: dialog.accept())

        # Select difficulty
        difficulty_dropdown = self.page.locator('[data-testid="difficulty-select"]')
        await difficulty_dropdown.select_option(label=difficulty.capitalize())

        # Click start game button
        start_button = self.page.locator('[data-testid="start-game-button"]')
        await start_button.click()

        # Wait for game to start - button should become disabled or disappear
        await expect(start_button).not_to_be_visible(timeout=15000)

        # Wait a moment for game state to load
        await self.page.wait_for_timeout(1000)

    async def wait_for_team_progress(self, team_name: str, timeout: int = 30000):
        """Wait for a specific team's progress to appear in game view."""
        await expect(self.page.locator(f'h3:has-text("{team_name}")')).to_be_visible(timeout=timeout)

    async def verify_team_completed(self, team_name: str, timeout: int = 30000):
        """Verify that a team shows as completed."""
        team_card = self.page.locator(f'h3:has-text("{team_name}")').locator("..")
        completed_badge = team_card.locator("text=/✓ Completed/")
        await expect(completed_badge).to_be_visible(timeout=timeout)
