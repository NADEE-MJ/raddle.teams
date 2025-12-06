import re

from playwright.async_api import Page, expect


class AdminActions:
    def __init__(self, page: Page, server_url: str):
        self.page = page
        self.server_url = server_url
        self._dialog_handler_set = False

    async def _ensure_dialog_handler(self):
        """Set up dialog handler once to avoid conflicts."""
        if not self._dialog_handler_set:
            self.page.on("dialog", lambda dialog: dialog.accept())
            self._dialog_handler_set = True

    async def _refresh_lobby_view(self, wait_ms: int = 500):
        """Refresh the lobby details view and wait for updates."""
        refresh_button = self.page.locator('[data-testid="refresh-lobby-button"]')
        try:
            if await refresh_button.is_visible(timeout=1000):
                await refresh_button.click()
                await self.page.wait_for_timeout(wait_ms)
        except Exception:
            # Refresh button might not be visible, continue anyway
            pass

    async def goto_admin_page(self):
        await self.page.goto(f"{self.server_url}/admin", wait_until="networkidle")

        await expect(
            self.page.locator('[data-testid="admin-login-title"], [data-testid="admin-dashboard-title"]')
        ).to_be_visible()

    async def login(self, admin_token: str = None):
        from backend.settings import settings

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

        # Wait for WebSocket update
        await self.page.wait_for_timeout(500)

        # Get the newly created lobby (last one)
        lobby_code_element = self.page.locator("button.font-bold").last
        await expect(lobby_code_element).to_be_visible(timeout=5000)
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
        """Open lobby details view and wait for initial data load."""
        lobby_card = self.page.locator(f"button:has-text('{lobby_code}')").locator("..")
        await expect(lobby_card).to_be_visible()
        await lobby_card.click()

        await expect(self.page.locator('h2:has-text("Lobby Details")')).to_be_visible()

        # Wait for WebSocket subscription to establish
        await self.page.wait_for_timeout(500)

        # Refresh to get latest state
        await self._refresh_lobby_view()

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

    async def wait_for_players(self, expected_count: int, timeout: int = 10000):
        """Wait for the expected number of players to appear in the lobby."""
        # Just wait briefly for page to update - tests should verify specific players
        await self.page.wait_for_timeout(min(timeout, 1000))

    async def wait_for_player_name(self, player_name: str, timeout: int = 5000):
        """Wait for a specific player to appear in the admin view."""
        await expect(self.page.locator(f"text={player_name}")).to_be_visible(timeout=timeout)

    async def delete_lobby(self, lobby_code: str):
        await self._ensure_dialog_handler()

        lobby_card = self.page.locator(f"button:has-text('{lobby_code}')").locator("..").locator("..")
        delete_button = lobby_card.locator('button:has-text("Delete")')
        await delete_button.click()

        await expect(self.page.locator(f"button:has-text('{lobby_code}')")).not_to_be_visible(timeout=5000)

    async def create_teams(self, num_teams: int, timeout: int = 5000):
        """
        Create teams in the lobby details view using the new counter controls.
        The admin UI now uses +/- buttons instead of a numeric input.
        """
        # If teams already exist, nothing to do
        existing_teams_heading = self.page.locator('[data-testid="teams-heading"]')
        if await existing_teams_heading.is_visible(timeout=1000):
            return

        num_display = self.page.locator('[data-testid="num-teams-display"]')
        increase_button = self.page.locator('[data-testid="increase-num-teams"]')
        decrease_button = self.page.locator('[data-testid="decrease-num-teams"]')
        create_button = self.page.locator('[data-testid="create-teams-button"]')

        await expect(num_display).to_be_visible(timeout=timeout)

        # Read the current number of teams from the display
        current_text = await num_display.text_content()
        current_num = int(current_text.strip()) if current_text else 0

        # Adjust using the +/- controls
        for _ in range(15):
            if current_num == num_teams:
                break
            if current_num < num_teams:
                await increase_button.click()
                current_num += 1
            else:
                await decrease_button.click()
                current_num -= 1
            await self.page.wait_for_timeout(100)

        if current_num != num_teams:
            raise Exception(f"Failed to set desired team count. Current: {current_num}, Target: {num_teams}")

        await expect(create_button).to_be_enabled(timeout=timeout)
        await create_button.click()

        # Wait for teams to be created and visible
        await expect(self.page.locator(f"text=/Teams \\({num_teams}\\)/")).to_be_visible(timeout=timeout)

        # Allow WebSocket updates to propagate
        await self.page.wait_for_timeout(500)

    async def move_player_to_team(self, player_name: str, team_name: str, timeout: int = 5000):
        """Move a player to a specific team using the dropdown."""
        # Refresh first to ensure we have latest state
        await self._refresh_lobby_view()

        # Try both possible dropdown locations
        unassigned_dropdown = self.page.locator(f'[data-testid="unassigned-team-dropdown-{player_name}"]')
        team_dropdown = self.page.locator(f'[data-testid="team-move-dropdown-{player_name}"]')

        # Find which dropdown is visible
        dropdown = None
        try:
            if await unassigned_dropdown.is_visible(timeout=1000):
                dropdown = unassigned_dropdown
            elif await team_dropdown.is_visible(timeout=1000):
                dropdown = team_dropdown
        except Exception:
            pass

        if dropdown is None:
            raise Exception(
                f"Could not find dropdown for player {player_name}. Player might not be visible or in expected state."
            )

        # Wait for dropdown to be ready
        await self.page.wait_for_timeout(300)

        # Get available options
        options = await dropdown.evaluate(
            """(select) => Array.from(select.options).map(opt => ({ value: opt.value, label: opt.text }))"""
        )
        print(f"Available options for {player_name}: {options}")

        # Find matching option
        target_option = next((opt for opt in options if opt["label"] == team_name), None)
        if target_option:
            await dropdown.select_option(value=target_option["value"])
        else:
            raise Exception(
                f"Team '{team_name}' not found in dropdown for {player_name}. "
                f"Available: {[opt['label'] for opt in options]}"
            )

        # Wait for WebSocket update to propagate
        await self.page.wait_for_timeout(500)

        # Refresh to see updated state
        await self._refresh_lobby_view()

    async def unassign_player(self, player_name: str, timeout: int = 5000):
        """Unassign a player from their team."""
        # Refresh first to ensure we have latest state
        await self._refresh_lobby_view()

        # Player must be in a team to unassign - look for team dropdown
        team_dropdown = self.page.locator(f'[data-testid="team-move-dropdown-{player_name}"]')

        # Wait for dropdown to be visible
        try:
            await expect(team_dropdown).to_be_visible(timeout=timeout)
        except Exception as e:
            raise Exception(
                f"Could not find team dropdown for {player_name}. "
                f"Player might not be assigned to a team or UI hasn't updated yet. Error: {e}"
            )

        # Wait for dropdown to be ready
        await self.page.wait_for_timeout(300)

        # Select "Unassign" option
        await team_dropdown.select_option(label="Unassign")

        # Wait for WebSocket update
        await self.page.wait_for_timeout(500)

        # Refresh to see updated state
        await self._refresh_lobby_view()

    async def kick_player(self, player_name: str):
        """Kick a player from the lobby."""
        await self._ensure_dialog_handler()

        # Refresh first to get latest state
        await self._refresh_lobby_view()

        # Try to find kick button in either location (unassigned or team)
        unassigned_kick = self.page.locator(f'[data-testid="unassigned-kick-button-{player_name}"]')
        team_kick = self.page.locator(f'[data-testid="team-kick-button-{player_name}"]')

        kick_button = None
        if await unassigned_kick.is_visible(timeout=1000):
            kick_button = unassigned_kick
        elif await team_kick.is_visible(timeout=1000):
            kick_button = team_kick

        if kick_button is None:
            raise Exception(f"Could not find kick button for {player_name}")

        await kick_button.click()

        # Wait for kick to process
        await self.page.wait_for_timeout(500)

        # Refresh to see updated player list
        await self._refresh_lobby_view()

        # Verify player is gone (check both possible locations)
        await expect(self.page.locator(f'[data-testid="unassigned-player-row-{player_name}"]')).not_to_be_visible(
            timeout=5000
        )
        await expect(self.page.locator(f'[data-testid="team-player-row-{player_name}"]')).not_to_be_visible(
            timeout=1000
        )

    async def start_game(
        self, difficulty: str = "medium", puzzle_mode: str = "different", word_count_mode: str = "balanced"
    ):
        """Start a game with the specified difficulty, puzzle mode, and word count mode."""
        await self._ensure_dialog_handler()

        # Select difficulty
        difficulty_dropdown = self.page.locator('[data-testid="difficulty-select"]')
        await difficulty_dropdown.select_option(label=difficulty.capitalize())

        # Select puzzle mode by value (options: 'different' -> 'Different Puzzles', 'same' -> 'Same Puzzle')
        puzzle_mode_dropdown = self.page.locator('[data-testid="puzzle-mode-select"]')
        if await puzzle_mode_dropdown.is_visible(timeout=1000):
            await puzzle_mode_dropdown.select_option(value=puzzle_mode)

        # Select word count mode by value (options: 'balanced' -> 'Balanced (±1)', 'exact' -> 'Exact Match')
        # Note: This dropdown is disabled when puzzle_mode is "same"
        word_count_dropdown = self.page.locator('[data-testid="word-count-mode-select"]')
        if await word_count_dropdown.is_visible(timeout=1000) and await word_count_dropdown.is_enabled(timeout=1000):
            await word_count_dropdown.select_option(value=word_count_mode)

        # Click start game button
        start_button = self.page.locator('[data-testid="start-game-button"]')
        await start_button.click()

        # Wait for game to start
        await expect(start_button).not_to_be_visible(timeout=15000)

        # Wait for game state to load
        await self.page.wait_for_timeout(1000)

    async def wait_for_team_progress(self, team_name: str, timeout: int = 10000):
        """Wait for a specific team's progress to appear in game view."""
        await expect(self.page.locator(f'h3:has-text("{team_name}")')).to_be_visible(timeout=timeout)

    async def verify_team_completed(self, team_name: str, timeout: int = 30000):
        """Verify that a team shows as completed."""
        team_card = self.page.locator(f'h3:has-text("{team_name}")').locator("..")
        completed_badge = team_card.locator("text=/✓ Completed/")
        await expect(completed_badge).to_be_visible(timeout=timeout)

    async def get_team_names(self) -> list[str]:
        """Get the names of all teams."""
        # Refresh first to ensure we have latest state
        await self._refresh_lobby_view()

        # Find all team name elements
        team_names_locator = self.page.locator('[data-testid^="team-name-"]')
        count = await team_names_locator.count()
        names = []
        for i in range(count):
            name = await team_names_locator.nth(i).text_content()
            if name:
                names.append(name.strip())
        return names

    async def rename_team(self, team_id: int, new_name: str):
        """Rename a team."""
        # Click the edit button for the team
        edit_button = self.page.locator(f'[data-testid="edit-team-name-button-{team_id}"]')
        await edit_button.click()

        # Wait for input to appear and fill it
        name_input = self.page.locator(f'[data-testid="edit-team-name-input-{team_id}"]')
        await expect(name_input).to_be_visible()
        await name_input.fill(new_name)

        # Click save button
        save_button = self.page.locator(f'[data-testid="save-team-name-button-{team_id}"]')
        await save_button.click()

        # Wait for the new name to appear
        await expect(self.page.locator(f'[data-testid="team-name-{team_id}"]:has-text("{new_name}")')).to_be_visible(
            timeout=5000
        )

        # Wait for WebSocket update
        await self.page.wait_for_timeout(500)

    async def end_game(self):
        """End the current game."""
        await self._ensure_dialog_handler()

        # Click end game button
        end_button = self.page.locator('[data-testid="end-game-button"]')
        await end_button.click()

        # Wait for game to end - the start game button should reappear
        await expect(self.page.locator('[data-testid="start-game-button"]')).to_be_visible(timeout=15000)

    async def end_current_game(self):
        """Alias for end_game."""
        await self.end_game()
