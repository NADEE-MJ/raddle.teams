from playwright.async_api import Page, expect


class PlayerActions:
    def __init__(self, page: Page, server_url: str, player_name: str = "Test Player"):
        self.page = page
        self.server_url = server_url
        self.player_name = player_name

    async def goto_home_page(self, force_clear_session: bool = False):
        """Navigate to home page, handling redirects from game/lobby pages."""
        current_url = self.page.url

        # If forced or in a game, clear session first to avoid redirects
        if force_clear_session or "game" in current_url:
            # Clear localStorage to reset session
            await self.page.evaluate("localStorage.clear()")
            await self.page.wait_for_timeout(200)

        # Navigate to home page
        await self.page.goto(f"{self.server_url}/", wait_until="domcontentloaded")

        # Wait for any redirects
        await self.page.wait_for_timeout(500)

        # Check if we're on landing page
        try:
            await expect(self.page.locator('[data-testid="landing-page-title"]')).to_be_visible(timeout=2000)
            return
        except AssertionError:
            pass

        # If not, check where we are
        if await self.page.locator("p:has-text('Lobby Code:')").is_visible():
            # In lobby, leave and try again
            await self.leave_lobby()
            return

        # Still not on home page, force clear and reload
        await self.page.evaluate("localStorage.clear()")
        await self.page.goto(f"{self.server_url}/", wait_until="networkidle")
        await expect(self.page.locator('[data-testid="landing-page-title"]')).to_be_visible(timeout=3000)

    async def fill_name_and_code(self, name: str, lobby_code: str):
        name_input = self.page.locator('[data-testid="name-input"]')
        await name_input.fill(name)

        code_input = self.page.locator('[data-testid="lobby-code-input"]')
        await code_input.fill(lobby_code)

    async def join_lobby(self):
        join_button = self.page.locator('[data-testid="join-lobby-button"]')
        await join_button.click()

        # Wait for navigation - could be lobby or game page (if game is active)
        await self.page.wait_for_timeout(1500)

        # Check what page we landed on
        current_url = self.page.url
        print(f"After join_lobby, URL is: {current_url}")

        # Check if there's an error message (try multiple possible selectors)
        has_error = False
        error_text = None
        if await self.page.locator('[data-testid="error-message"]').is_visible(timeout=500):
            has_error = True
            error_text = await self.page.locator('[data-testid="error-message"]').text_content()
        elif await self.page.locator(".error").is_visible(timeout=500):
            has_error = True
            error_text = await self.page.locator(".error").text_content()

        if has_error:
            print(f"Error message visible: {error_text}")
            raise Exception(f"Failed to join lobby: {error_text}")

        # Check if we're in game page
        if "/game" in current_url:
            print("Joined and redirected to game page (game is active)")
            await self.page.wait_for_timeout(500)
            return

        # Check if we're in lobby page
        if "/lobby/" in current_url:
            # Wait for lobby page to load
            await expect(self.page.locator('[data-testid="lobby-code"]')).to_be_visible(timeout=5000)
            # Wait for WebSocket connection
            await self.page.wait_for_timeout(500)
            return

        # Not sure where we are, print page content for debugging
        page_title = await self.page.title()
        print(f"Unexpected page after join_lobby. Title: {page_title}, URL: {current_url}")

        # Try to find lobby code anyway
        await expect(self.page.locator('[data-testid="lobby-code"]')).to_be_visible(timeout=5000)

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

    async def wait_for_other_players(self, expected_count: int, timeout: int = 10000):
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

    async def wait_for_team_assignment(self, timeout: int = 10000):
        await expect(self.page.locator("text=Team, text=assigned")).to_be_visible(timeout=timeout)

    async def refresh_lobby(self):
        await self.page.reload(wait_until="networkidle")
        await self.wait_in_lobby()

    async def wait_for_player_count(self, expected_count: int, timeout: int = 10000):
        await expect(self.page.locator(f"text=Players ({expected_count})")).to_be_visible(timeout=timeout)

    async def wait_for_websocket_update(self, delay: int = 500):
        """Wait for WebSocket updates to propagate."""
        await self.page.wait_for_timeout(delay)

    async def wait_for_game_to_start(self, timeout: int = 30000):
        """Wait for game to start and navigate to game page."""
        # Wait for navigation to /game
        await self.page.wait_for_url("**/game", timeout=timeout)
        # Wait for page to stabilize
        await self.page.wait_for_timeout(500)

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
        # Check if player appears in the "Unassigned Players" section
        await expect(self.page.locator(f'[data-testid="unassigned-player-{self.player_name}"]')).to_be_visible(
            timeout=timeout
        )

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

        # Wait for the guess to be processed
        await self.page.wait_for_timeout(300)

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

    async def get_current_puzzle_word(self) -> str:
        """Get the current word that needs to be guessed (from the active step)."""
        # Look for the active input field which should have the word length as maxLength
        active_input = self.page.locator('input[type="text"]').first
        await expect(active_input).to_be_visible(timeout=5000)

        # Get the maxLength attribute to determine word length
        max_length = await active_input.get_attribute("maxLength")
        return max_length if max_length else "5"

    async def submit_incorrect_guess(self):
        """Submit an intentionally incorrect guess."""
        # Get the word length from the input
        active_input = self.page.locator('input[type="text"]').first

        # Wait for input to be visible
        await expect(active_input).to_be_visible(timeout=10000)

        max_length_str = await active_input.get_attribute("maxLength")
        max_length = int(max_length_str) if max_length_str else 5

        # Create a nonsense word of the right length
        incorrect_word = "Z" * max_length

        await active_input.fill(incorrect_word)
        await active_input.press("Enter")

        # Wait for the guess to be processed
        await self.page.wait_for_timeout(300)

    async def verify_kicked_from_game(self, timeout: int = 5000):
        """Verify that player has been kicked and sees appropriate message."""
        # Should see landing page after being kicked
        await expect(self.page.locator('[data-testid="landing-page-title"]')).to_be_visible(timeout=timeout)

    async def verify_team_changed_redirect(self, timeout: int = 10000):
        """Verify that player sees alert about team change and is redirected to lobby."""
        # Player should be redirected to lobby page
        await self.page.wait_for_url("**/lobby/**", timeout=timeout)

    async def verify_game_ended_redirect(self, timeout: int = 10000):
        """Verify that player is redirected to lobby when game ends."""
        # Player should be redirected to lobby page
        await self.page.wait_for_url("**/lobby/**", timeout=timeout)

    async def get_puzzle_data(self, session_id: str, server_url: str) -> dict:
        """
        Get puzzle data from the API for the current player's game.
        Returns the full puzzle data including ladder, team info, etc.
        """
        import httpx

        async with httpx.AsyncClient() as client:
            response = await client.get(f"{server_url}/api/game/puzzle", params={"player_session_id": session_id})
            response.raise_for_status()
            return response.json()

    async def verify_puzzle_word_count(self, session_id: str, server_url: str, min_words: int, max_words: int):
        """Verify that the puzzle has a word count within the expected range."""
        puzzle_data = await self.get_puzzle_data(session_id, server_url)
        ladder = puzzle_data["puzzle"]["ladder"]
        word_count = len(ladder)

        print(f"Puzzle has {word_count} words (expected {min_words}-{max_words})")

        assert min_words <= word_count <= max_words, (
            f"Puzzle word count {word_count} is not in expected range {min_words}-{max_words}"
        )

    async def solve_complete_puzzle(self, session_id: str, server_url: str):
        """
        Solve the complete puzzle by getting puzzle data from API and submitting all correct guesses.
        """
        puzzle_data = await self.get_puzzle_data(session_id, server_url)
        puzzle = puzzle_data["puzzle"]
        ladder = puzzle["ladder"]

        print(f"Solving puzzle with {len(ladder)} words...")

        # Solve each word in sequence
        for idx, step in enumerate(ladder):
            # Skip first and last words (they're revealed by default)
            if idx == 0 or idx == len(ladder) - 1:
                continue

            target_word = step["word"]
            print(f"  Solving word {idx}: {target_word}")

            # Wait for the active input to be available
            active_input = self.page.locator('[data-testid="active-step-input"]')

            try:
                await expect(active_input).to_be_visible(timeout=5000)
            except Exception as e:
                print(f"  Could not find active input for word {idx}: {e}")
                # Game might be complete
                break

            # Submit the correct word
            await active_input.fill(target_word)
            await active_input.press("Enter")

            # Wait for the guess to be processed
            await self.page.wait_for_timeout(500)

            # Check if we've been redirected (game ended, kicked, etc.)
            try:
                current_url = self.page.url
                if "lobby" in current_url and "game" not in current_url:
                    print("  Redirected to lobby, stopping puzzle solving")
                    break
            except Exception:
                pass

    async def switch_solving_direction(self):
        """
        Click the direction toggle button to switch between upward and downward solving.
        Direction is a client-side UI feature that changes which word is active.
        """
        # Find the direction toggle button
        direction_button = self.page.locator(
            'button:has-text("Switch to solving"), button:has-text("↑"), button:has-text("↓")'
        ).first

        try:
            await expect(direction_button).to_be_visible(timeout=5000)
            await direction_button.click()
            # Wait for UI to update after direction change
            await self.page.wait_for_timeout(300)
            print(f"  [{self.player_name}] Switched solving direction")
        except Exception as e:
            print(f"  [{self.player_name}] Could not find direction toggle button: {e}")
            raise

    async def get_current_direction(self) -> str:
        """
        Get the current solving direction from the UI.
        Returns 'upward' or 'downward' based on button text.
        """
        # The button text shows the OPPOSITE direction (what you'll switch TO)
        direction_button = self.page.locator(
            'button:has-text("Switch to solving"), button:has-text("↑"), button:has-text("↓")'
        ).first

        try:
            button_text = await direction_button.text_content(timeout=2000)
            if "↑" in button_text or "upward" in button_text.lower():
                return "downward"  # If button says "switch to upward", we're currently downward
            elif "↓" in button_text or "downward" in button_text.lower():
                return "upward"  # If button says "switch to downward", we're currently upward
            else:
                return "unknown"
        except Exception:
            return "unknown"

    async def solve_word_at_index(self, word: str):
        """
        Submit a guess for the currently active word (whatever direction is active).
        This is simpler than submit_guess() - just solves the word that's currently active.
        """
        # Wait for active input
        active_input = self.page.locator('[data-testid="active-step-input"]')

        try:
            await expect(active_input).to_be_visible(timeout=5000)
        except Exception as e:
            print(f"  [{self.player_name}] Could not find active input: {e}")
            raise

        # Submit the word
        await active_input.fill(word)
        await active_input.press("Enter")

        # Wait for processing
        await self.page.wait_for_timeout(500)
        print(f"  [{self.player_name}] Solved: {word}")

    async def solve_partial_puzzle_alternating(
        self, session_id: str, server_url: str, num_words_from_start: int, num_words_from_end: int
    ):
        """
        Solve puzzle from both directions by alternating between start and end.
        This simulates realistic multi-direction solving behavior.

        Args:
            session_id: Player's session ID
            server_url: Server URL
            num_words_from_start: How many words to solve from the beginning (downward direction)
            num_words_from_end: How many words to solve from the end (upward direction)
        """
        # Get puzzle data
        puzzle_data = await self.get_puzzle_data(session_id, server_url)
        ladder = puzzle_data["puzzle"]["ladder"]
        total_words = len(ladder)

        print(f"  [{self.player_name}] Solving {num_words_from_start} words from start, {num_words_from_end} from end")

        # Ensure we're starting in downward direction
        current_direction = await self.get_current_direction()
        if current_direction == "upward":
            await self.switch_solving_direction()

        # Solve words from the start (downward direction)
        for i in range(num_words_from_start):
            word_idx = i + 1  # Skip first word (index 0) as it's pre-revealed
            if word_idx >= total_words - 1:  # Don't solve last word
                break

            target_word = ladder[word_idx]["word"]

            try:
                await self.solve_word_at_index(target_word)
            except Exception as e:
                print(f"  [{self.player_name}] Failed to solve word {word_idx}: {e}")
                break

        # Switch to upward direction if we need to solve from end
        if num_words_from_end > 0:
            await self.switch_solving_direction()

            # Solve words from the end (upward direction)
            for i in range(num_words_from_end):
                word_idx = total_words - 2 - i  # Start from second-to-last word (last is pre-revealed)
                if word_idx <= 0:  # Don't go past the first word
                    break

                target_word = ladder[word_idx]["word"]

                try:
                    await self.solve_word_at_index(target_word)
                except Exception as e:
                    print(f"  [{self.player_name}] Failed to solve word {word_idx}: {e}")
                    break

        print(f"  [{self.player_name}] Finished partial solving")
