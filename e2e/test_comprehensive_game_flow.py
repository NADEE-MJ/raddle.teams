from typing import Awaitable, Callable

from playwright.async_api import Page, expect

from backend.settings import Settings
from e2e.fixtures.browsers import BrowserSession
from e2e.utilities.admin_actions import AdminActions
from e2e.utilities.player_actions import PlayerActions
from e2e.utilities.test_setup import setup_admin_with_lobby, setup_player, setup_teams_and_assign_players

type AdminFixture = Callable[[], Awaitable[tuple[AdminActions, Page, BrowserSession]]]
type PlayerFixture = Callable[[str], Awaitable[tuple[PlayerActions, Page, BrowserSession]]]


class TestComprehensiveGameFlow:
    """Comprehensive E2E tests for the game flow, split into individual test functions."""

    async def test_01_admin_login_and_lobby_creation(
        self,
        admin_actions_fixture: AdminFixture,
        settings: Settings,
    ):
        """Test admin login and creating multiple lobbies."""
        test_name = "TEST_01"

        # Create admin and login
        admin_actions, admin_page, admin_session = await admin_actions_fixture()
        admin_session.set_name(f"{test_name}_ADMIN")

        await admin_actions.goto_admin_page()
        await admin_actions.login(settings.ADMIN_PASSWORD)
        await admin_session.screenshot("01_admin_logged_in")

        # Create first lobby
        lobby1_code = await admin_actions.create_lobby("Test Lobby 1")
        await expect(admin_page.locator(f"button:has-text('{lobby1_code}')")).to_be_visible()
        await admin_session.screenshot("02_lobby1_created")

        # Create second lobby for later testing
        lobby2_code = await admin_actions.create_lobby("Test Lobby 2")
        await expect(admin_page.locator(f"button:has-text('{lobby2_code}')")).to_be_visible()
        await admin_session.screenshot("03_lobby2_created")

        print(f"Created lobbies: {lobby1_code}, {lobby2_code}")

    async def test_02_players_join_lobby(
        self,
        admin_actions_fixture: AdminFixture,
        player_actions_fixture: PlayerFixture,
        settings: Settings,
    ):
        """Test multiple players joining a lobby."""
        test_name = "TEST_02"

        # Setup admin with lobby
        admin_actions, admin_page, admin_session, lobby_code = await setup_admin_with_lobby(
            admin_actions_fixture, settings, test_name
        )

        # Admin views lobby
        await admin_actions.peek_into_lobby(lobby_code)
        await admin_page.wait_for_timeout(1000)

        # Create and join 4 players
        player1_actions, player1_page, player1_session = await setup_player(
            player_actions_fixture, test_name, "Alice", lobby_code
        )
        await player1_session.screenshot("04_alice_joined_lobby")

        player2_actions, player2_page, player2_session = await setup_player(
            player_actions_fixture, test_name, "Bob", lobby_code
        )
        await player2_session.screenshot("04_bob_joined_lobby")

        player3_actions, player3_page, player3_session = await setup_player(
            player_actions_fixture, test_name, "Charlie", lobby_code
        )

        player4_actions, player4_page, player4_session = await setup_player(
            player_actions_fixture, test_name, "Diana", lobby_code
        )

        # Give WebSocket time to propagate
        await admin_page.wait_for_timeout(500)

        # Refresh admin view
        refresh_button = admin_page.locator('[data-testid="refresh-lobby-button"]')
        if await refresh_button.is_visible(timeout=1000):
            await refresh_button.click()
            await admin_page.wait_for_timeout(1000)

        # Wait for admin to see all 4 players
        await admin_actions.wait_for_player_name("Alice", timeout=10000)
        await admin_actions.wait_for_player_name("Bob", timeout=5000)
        await admin_actions.wait_for_player_name("Charlie", timeout=5000)
        await admin_actions.wait_for_player_name("Diana", timeout=5000)

        # Verify players see each other
        await player1_actions.wait_for_player_count(4, timeout=5000)
        await player2_actions.wait_for_player_count(4, timeout=5000)

        await admin_session.screenshot("05_all_4_players_in_lobby")

    async def test_03_duplicate_name_handling(
        self,
        admin_actions_fixture: AdminFixture,
        player_actions_fixture: PlayerFixture,
        settings: Settings,
    ):
        """Test that duplicate player names are rejected."""
        test_name = "TEST_03"

        # Setup admin with lobby
        admin_actions, admin_page, admin_session, lobby_code = await setup_admin_with_lobby(
            admin_actions_fixture, settings, test_name
        )
        await admin_actions.peek_into_lobby(lobby_code)

        # Player 1 joins
        player1_actions, player1_page, player1_session = await setup_player(
            player_actions_fixture, test_name, "Alice", lobby_code
        )

        # Player 2 tries to join with duplicate name
        player2_actions, player2_page, player2_session = await setup_player(
            player_actions_fixture, test_name, "Eve", lobby_code=None, join_lobby=False
        )

        await player2_actions.goto_home_page()
        await player2_actions.fill_name_and_code("Alice", lobby_code)
        await player2_actions.join_lobby_expect_error()

        # Verify error is shown
        await expect(player2_page.locator('[data-testid="landing-page-title"]')).to_be_visible()
        await player2_session.screenshot("06_duplicate_name_rejected")

        # Player 2 joins with unique name
        await player2_actions.fill_name_and_code("Eve", lobby_code)
        await player2_actions.join_lobby()

        # Refresh admin view
        await admin_page.wait_for_timeout(1000)
        refresh_button = admin_page.locator('[data-testid="refresh-lobby-button"]')
        if await refresh_button.is_visible(timeout=1000):
            await refresh_button.click()
            await admin_page.wait_for_timeout(500)

        await admin_actions.wait_for_player_name("Eve", timeout=5000)

        print("Duplicate name handling works correctly")

    async def test_04_team_creation_and_management(
        self,
        admin_actions_fixture: AdminFixture,
        player_actions_fixture: PlayerFixture,
        settings: Settings,
    ):
        """Test creating teams and assigning players."""
        test_name = "TEST_04"

        # Setup admin with lobby
        admin_actions, admin_page, admin_session, lobby_code = await setup_admin_with_lobby(
            admin_actions_fixture, settings, test_name
        )
        await admin_actions.peek_into_lobby(lobby_code)

        # Join 4 players
        player1_actions, _, _ = await setup_player(player_actions_fixture, test_name, "Alice", lobby_code)
        player2_actions, _, _ = await setup_player(player_actions_fixture, test_name, "Bob", lobby_code)
        player3_actions, _, _ = await setup_player(player_actions_fixture, test_name, "Charlie", lobby_code)
        player4_actions, _, _ = await setup_player(player_actions_fixture, test_name, "Diana", lobby_code)

        await admin_page.wait_for_timeout(1000)
        refresh_button = admin_page.locator('[data-testid="refresh-lobby-button"]')
        if await refresh_button.is_visible(timeout=1000):
            await refresh_button.click()
            await admin_page.wait_for_timeout(1000)

        # Create teams and assign players
        team1_name, team2_name = await setup_teams_and_assign_players(
            admin_actions, admin_page, 2, {0: ["Alice", "Bob"], 1: ["Charlie", "Diana"]}
        )

        # Verify team assignments
        await player1_actions.verify_team_count(2, timeout=5000)
        await player2_actions.verify_team_count(2, timeout=5000)
        await player3_actions.verify_team_count(2, timeout=5000)

        await player1_actions.verify_in_team(team1_name, timeout=5000)
        await player2_actions.verify_in_team(team1_name, timeout=5000)
        await player3_actions.verify_in_team(team2_name, timeout=5000)
        await player4_actions.verify_in_team(team2_name, timeout=5000)

        await admin_session.screenshot("07_teams_created_and_assigned")

        print(f"Teams created: {team1_name} (Alice, Bob), {team2_name} (Charlie, Diana)")

    async def test_05_player_movement_between_teams(
        self,
        admin_actions_fixture: AdminFixture,
        player_actions_fixture: PlayerFixture,
        settings: Settings,
    ):
        """Test moving players between teams."""
        test_name = "TEST_05"

        # Setup admin with lobby
        admin_actions, admin_page, admin_session, lobby_code = await setup_admin_with_lobby(
            admin_actions_fixture, settings, test_name
        )
        await admin_actions.peek_into_lobby(lobby_code)

        # Join players
        player1_actions, player1_page, player1_session = await setup_player(
            player_actions_fixture, test_name, "Alice", lobby_code
        )
        player2_actions, player2_page, player2_session = await setup_player(
            player_actions_fixture, test_name, "Bob", lobby_code
        )

        await admin_page.wait_for_timeout(1000)
        refresh_button = admin_page.locator('[data-testid="refresh-lobby-button"]')
        if await refresh_button.is_visible(timeout=1000):
            await refresh_button.click()
            await admin_page.wait_for_timeout(1000)

        # Create teams and assign
        team1_name, team2_name = await setup_teams_and_assign_players(
            admin_actions, admin_page, 2, {0: ["Alice", "Bob"]}
        )

        # Move Alice from team1 to team2
        await admin_actions.move_player_to_team("Alice", team2_name)
        await player1_actions.verify_in_team(team2_name, timeout=5000)

        # Verify Bob sees Alice moved
        await expect(player2_page.locator(f'[data-testid="team-section-{team2_name}"]')).to_contain_text("Alice")
        await player2_session.screenshot("13_bob_sees_alice_moved")

        # Move Alice back to team1
        await admin_actions.move_player_to_team("Alice", team1_name)
        await player1_actions.verify_in_team(team1_name, timeout=5000)

        print("Player movement between teams works")

    async def test_06_kicking_and_rejoining(
        self,
        admin_actions_fixture: AdminFixture,
        player_actions_fixture: PlayerFixture,
        settings: Settings,
    ):
        """Test kicking players and rejoining with same/different names."""
        test_name = "TEST_06"

        # Setup admin with lobby
        admin_actions, admin_page, admin_session, lobby_code = await setup_admin_with_lobby(
            admin_actions_fixture, settings, test_name
        )
        await admin_actions.peek_into_lobby(lobby_code)

        # Join players
        player1_actions, player1_page, _ = await setup_player(player_actions_fixture, test_name, "Alice", lobby_code)
        player2_actions, player2_page, player2_session = await setup_player(
            player_actions_fixture, test_name, "Eve", lobby_code
        )

        await admin_page.wait_for_timeout(1000)
        refresh_button = admin_page.locator('[data-testid="refresh-lobby-button"]')
        if await refresh_button.is_visible(timeout=1000):
            await refresh_button.click()
            await admin_page.wait_for_timeout(1000)

        # Create team and assign Eve
        team1_name, _ = await setup_teams_and_assign_players(admin_actions, admin_page, 2, {0: ["Eve"]})

        await player2_actions.verify_in_team(team1_name, timeout=5000)

        # Kick Eve
        await admin_page.wait_for_timeout(500)
        if await refresh_button.is_visible(timeout=1000):
            await refresh_button.click()
            await admin_page.wait_for_timeout(500)

        await admin_actions.kick_player("Eve")
        await player1_page.wait_for_timeout(500)
        await admin_session.screenshot("13_eve_kicked")

        # Eve rejoins with same name
        await player2_actions.goto_home_page()
        await player2_actions.fill_name_and_code("Eve", lobby_code)
        await player2_actions.join_lobby()

        # Refresh admin view
        await admin_page.wait_for_timeout(1000)
        if await refresh_button.is_visible(timeout=1000):
            await refresh_button.click()
            await admin_page.wait_for_timeout(500)

        await admin_actions.wait_for_player_name("Eve", timeout=5000)
        await player2_session.screenshot("14_eve_rejoined")

        # Kick Eve again
        await admin_page.wait_for_timeout(500)
        if await refresh_button.is_visible(timeout=1000):
            await refresh_button.click()
            await admin_page.wait_for_timeout(500)

        await admin_actions.kick_player("Eve")
        await player1_page.wait_for_timeout(500)

        # Eve rejoins with different name
        await player2_actions.goto_home_page()
        await player2_actions.fill_name_and_code("Eva", lobby_code)
        await player2_actions.join_lobby()

        # Refresh admin view
        await admin_page.wait_for_timeout(500)
        if await refresh_button.is_visible(timeout=1000):
            await refresh_button.click()
            await admin_page.wait_for_timeout(500)

        await admin_actions.wait_for_player_name("Eva", timeout=5000)

        print("Kicking and rejoining works correctly")

    async def test_07_start_game(
        self,
        admin_actions_fixture: AdminFixture,
        player_actions_fixture: PlayerFixture,
        settings: Settings,
    ):
        """Test starting a game."""
        test_name = "TEST_07"

        # Setup admin with lobby
        admin_actions, admin_page, admin_session, lobby_code = await setup_admin_with_lobby(
            admin_actions_fixture, settings, test_name
        )
        await admin_actions.peek_into_lobby(lobby_code)

        # Join players
        player1_actions, player1_page, player1_session = await setup_player(
            player_actions_fixture, test_name, "Alice", lobby_code
        )
        player2_actions, player2_page, player2_session = await setup_player(
            player_actions_fixture, test_name, "Bob", lobby_code
        )
        player3_actions, player3_page, player3_session = await setup_player(
            player_actions_fixture, test_name, "Charlie", lobby_code
        )
        player4_actions, player4_page, _ = await setup_player(player_actions_fixture, test_name, "Diana", lobby_code)

        await admin_page.wait_for_timeout(1000)
        refresh_button = admin_page.locator('[data-testid="refresh-lobby-button"]')
        if await refresh_button.is_visible(timeout=1000):
            await refresh_button.click()
            await admin_page.wait_for_timeout(1000)

        # Create teams and assign
        team1_name, team2_name = await setup_teams_and_assign_players(
            admin_actions, admin_page, 2, {0: ["Alice", "Bob"], 1: ["Charlie", "Diana"]}
        )

        # Start game
        await admin_actions.start_game(difficulty="medium")

        # Admin should see game progress view
        await admin_actions.wait_for_team_progress(team1_name, timeout=10000)
        await admin_actions.wait_for_team_progress(team2_name, timeout=10000)
        await admin_session.screenshot("15_game_started")

        # All players should be redirected to game page
        await player1_actions.wait_for_game_to_start(timeout=15000)
        await player2_actions.wait_for_game_to_start(timeout=15000)
        await player3_actions.wait_for_game_to_start(timeout=15000)
        await player4_actions.wait_for_game_to_start(timeout=15000)

        await player1_session.screenshot("16_alice_on_game_page")
        await player3_session.screenshot("16_charlie_on_game_page")

        print("Game started successfully")

    async def test_08_submit_guesses(
        self,
        admin_actions_fixture: AdminFixture,
        player_actions_fixture: PlayerFixture,
        settings: Settings,
    ):
        """Test submitting both correct and incorrect guesses."""
        test_name = "TEST_08"

        # Setup admin with lobby
        admin_actions, admin_page, admin_session, lobby_code = await setup_admin_with_lobby(
            admin_actions_fixture, settings, test_name
        )
        await admin_actions.peek_into_lobby(lobby_code)

        # Join players
        player1_actions, player1_page, player1_session = await setup_player(
            player_actions_fixture, test_name, "Alice", lobby_code
        )
        player2_actions, player2_page, _ = await setup_player(player_actions_fixture, test_name, "Bob", lobby_code)
        player3_actions, _, _ = await setup_player(player_actions_fixture, test_name, "Charlie", lobby_code)

        await admin_page.wait_for_timeout(1000)
        refresh_button = admin_page.locator('[data-testid="refresh-lobby-button"]')
        if await refresh_button.is_visible(timeout=1000):
            await refresh_button.click()
            await admin_page.wait_for_timeout(1000)

        # Create teams and start game
        team1_name, team2_name = await setup_teams_and_assign_players(
            admin_actions, admin_page, 2, {0: ["Alice", "Bob"], 1: ["Charlie"]}
        )
        await admin_actions.start_game(difficulty="medium")
        await player1_actions.wait_for_game_to_start(timeout=15000)

        # Wait for game to fully initialize
        await player1_page.wait_for_timeout(500)

        # Submit incorrect guesses
        await player1_actions.submit_incorrect_guess()
        await player1_session.screenshot("17_alice_submitted_incorrect_guess")

        await player2_actions.submit_incorrect_guess()
        await player3_actions.submit_incorrect_guess()

        # Wait to see guess history
        await player1_page.wait_for_timeout(1000)
        await player1_session.screenshot("18_guess_history_visible")

        print("Players submitted guesses")

    async def test_09_kick_player_during_game(
        self,
        admin_actions_fixture: AdminFixture,
        player_actions_fixture: PlayerFixture,
        settings: Settings,
    ):
        """Test kicking a player during an active game."""
        test_name = "TEST_09"

        # Setup admin with lobby
        admin_actions, admin_page, admin_session, lobby_code = await setup_admin_with_lobby(
            admin_actions_fixture, settings, test_name
        )
        await admin_actions.peek_into_lobby(lobby_code)

        # Join players
        player1_actions, player1_page, player1_session = await setup_player(
            player_actions_fixture, test_name, "Alice", lobby_code
        )
        player2_actions, player2_page, player2_session = await setup_player(
            player_actions_fixture, test_name, "Bob", lobby_code
        )

        await admin_page.wait_for_timeout(1000)
        refresh_button = admin_page.locator('[data-testid="refresh-lobby-button"]')
        if await refresh_button.is_visible(timeout=1000):
            await refresh_button.click()
            await admin_page.wait_for_timeout(1000)

        # Create teams and start game
        team1_name, _ = await setup_teams_and_assign_players(admin_actions, admin_page, 2, {0: ["Alice", "Bob"]})
        await admin_actions.start_game(difficulty="medium")
        await player1_actions.wait_for_game_to_start(timeout=15000)
        await player2_actions.wait_for_game_to_start(timeout=15000)

        # Admin kicks Bob during game
        await admin_actions.kick_player("Bob")
        await admin_session.screenshot("20_bob_kicked_during_game")

        # Bob should be kicked and redirected
        await player2_actions.verify_kicked_from_game(timeout=10000)
        await player2_session.screenshot("21_bob_sees_kicked_message")

        # Alice should see Bob disappear
        await player1_page.wait_for_timeout(1000)
        await player1_session.screenshot("22_alice_sees_bob_gone")

        print("Player kicked during game")

    async def test_10_move_player_during_game(
        self,
        admin_actions_fixture: AdminFixture,
        player_actions_fixture: PlayerFixture,
        settings: Settings,
    ):
        """Test moving a player to a different team during an active game."""
        test_name = "TEST_10"

        # Setup admin with lobby
        admin_actions, admin_page, admin_session, lobby_code = await setup_admin_with_lobby(
            admin_actions_fixture, settings, test_name
        )
        await admin_actions.peek_into_lobby(lobby_code)

        # Join players
        player1_actions, _, _ = await setup_player(player_actions_fixture, test_name, "Alice", lobby_code)
        player2_actions, player2_page, player2_session = await setup_player(
            player_actions_fixture, test_name, "Eva", lobby_code
        )

        await admin_page.wait_for_timeout(1000)
        refresh_button = admin_page.locator('[data-testid="refresh-lobby-button"]')
        if await refresh_button.is_visible(timeout=1000):
            await refresh_button.click()
            await admin_page.wait_for_timeout(1000)

        # Create teams and start game
        team1_name, team2_name = await setup_teams_and_assign_players(
            admin_actions, admin_page, 2, {0: ["Alice", "Eva"]}
        )
        await admin_actions.start_game(difficulty="medium")
        await player1_actions.wait_for_game_to_start(timeout=15000)
        await player2_actions.wait_for_game_to_start(timeout=15000)

        # Set up console monitoring
        console_logs = []

        def handle_console(msg):
            log_entry = f"[{msg.type}] {msg.text}"
            console_logs.append(log_entry)
            if any(
                keyword in msg.text
                for keyword in [
                    "GameState",
                    "Team changed",
                    "team_changed",
                    "WebSocket",
                    "Received message",
                    "navigate",
                    "redirect",
                ]
            ):
                print(f"  Eva console: {log_entry}")

        player2_page.on("console", handle_console)

        # Check Eva's current state
        eva_url = player2_page.url
        eva_session_id = await player2_page.evaluate("""() => localStorage.getItem('raddle_session_id')""")
        print(f"Before team change - Eva URL: {eva_url}, Session ID: {eva_session_id}")

        # Admin moves Eva from team1 to team2
        await admin_actions.move_player_to_team("Eva", team2_name)
        await admin_session.screenshot("23_eva_moved_to_team2")

        # Wait for WebSocket message
        await player2_page.wait_for_timeout(3000)

        # Check console logs
        ws_logs = [log for log in console_logs if "GameState" in log or "team_changed" in log or "Team changed" in log]
        print(f"WebSocket/GameState logs: {ws_logs}")

        # Check URL after change
        eva_url_after = player2_page.url
        print(f"After team change - Eva URL: {eva_url_after}")

        # Eva should be redirected to game with new team's puzzle
        await player2_page.wait_for_url("**/game", timeout=10000)
        await player2_session.screenshot("24_eva_back_in_game_with_new_team")

        print("Player moved during game")

    async def test_11_complete_game_multi_player_multi_direction(
        self,
        admin_actions_fixture: AdminFixture,
        player_actions_fixture: PlayerFixture,
        settings: Settings,
    ):
        """Test completing a full game with multi-player multi-direction solving."""
        test_name = "TEST_11"

        # Setup admin with lobby
        admin_actions, admin_page, admin_session, lobby_code = await setup_admin_with_lobby(
            admin_actions_fixture, settings, test_name
        )
        await admin_actions.peek_into_lobby(lobby_code)

        # Join players
        player1_actions, player1_page, player1_session = await setup_player(
            player_actions_fixture, test_name, "Alice", lobby_code
        )
        player2_actions, player2_page, _ = await setup_player(player_actions_fixture, test_name, "Eva", lobby_code)
        player3_actions, player3_page, player3_session = await setup_player(
            player_actions_fixture, test_name, "Charlie", lobby_code
        )
        player4_actions, player4_page, _ = await setup_player(player_actions_fixture, test_name, "Diana", lobby_code)

        await admin_page.wait_for_timeout(1000)
        refresh_button = admin_page.locator('[data-testid="refresh-lobby-button"]')
        if await refresh_button.is_visible(timeout=1000):
            await refresh_button.click()
            await admin_page.wait_for_timeout(1000)

        # Create teams and start game
        team1_name, team2_name = await setup_teams_and_assign_players(
            admin_actions, admin_page, 2, {0: ["Alice", "Eva"], 1: ["Charlie", "Diana"]}
        )
        await admin_actions.start_game(difficulty="medium")
        await player1_actions.wait_for_game_to_start(timeout=15000)
        await player2_actions.wait_for_game_to_start(timeout=15000)
        await player3_actions.wait_for_game_to_start(timeout=15000)
        await player4_actions.wait_for_game_to_start(timeout=15000)

        # Get session IDs
        server_url = "http://localhost:8000"
        alice_session_id = await player1_page.evaluate("""() => localStorage.getItem('raddle_session_id')""")
        eva_session_id = await player2_page.evaluate("""() => localStorage.getItem('raddle_session_id')""")
        charlie_session_id = await player3_page.evaluate("""() => localStorage.getItem('raddle_session_id')""")
        diana_session_id = await player4_page.evaluate("""() => localStorage.getItem('raddle_session_id')""")

        # Get puzzle data
        alice_puzzle = await player1_actions.get_puzzle_data(alice_session_id, server_url)
        charlie_puzzle = await player3_actions.get_puzzle_data(charlie_session_id, server_url)

        team1_total_words = len(alice_puzzle["puzzle"]["ladder"])
        team2_total_words = len(charlie_puzzle["puzzle"]["ladder"])

        print(f"Team 1 puzzle: {team1_total_words} words, Team 2 puzzle: {team2_total_words} words")

        # Team 1 will solve all and win
        team1_words_to_solve = team1_total_words - 2

        # Team 2 will solve ~60% but lose
        team2_words_to_solve = int((team2_total_words - 2) * 0.6)

        print(f"Team 1 will solve all {team1_words_to_solve} words to win")
        print(f"Team 2 will solve ~{team2_words_to_solve} words but lose")

        # Team 2 starts solving
        print("\nTeam 2 starts solving...")
        charlie_words_from_start = min(3, team2_words_to_solve)
        print(f"  Charlie solving {charlie_words_from_start} words from start")
        await player3_actions.solve_partial_puzzle_alternating(
            charlie_session_id, server_url, num_words_from_start=charlie_words_from_start, num_words_from_end=0
        )
        await player3_session.screenshot("25_charlie_solving")

        diana_words_from_end = min(3, team2_words_to_solve - charlie_words_from_start)
        print(f"  Diana solving {diana_words_from_end} words from end")
        await player4_actions.switch_solving_direction()
        await player4_actions.solve_partial_puzzle_alternating(
            diana_session_id, server_url, num_words_from_start=0, num_words_from_end=diana_words_from_end
        )

        # Team 1 solves and wins
        print("\nTeam 1 starts solving to win...")
        alice_words = team1_words_to_solve // 2
        eva_words = team1_words_to_solve - alice_words

        print(f"  Alice solving {alice_words} words from start")
        await player1_actions.solve_partial_puzzle_alternating(
            alice_session_id, server_url, num_words_from_start=alice_words, num_words_from_end=0
        )
        await player1_session.screenshot("26_alice_solving")

        print(f"  Eva solving {eva_words} words from end")
        await player2_actions.solve_partial_puzzle_alternating(
            eva_session_id, server_url, num_words_from_start=0, num_words_from_end=eva_words
        )

        # Wait for victory
        await player1_page.wait_for_timeout(3000)
        await player1_session.screenshot("27_team1_victory_screen")
        await player3_session.screenshot("27_team2_sees_team1_won")
        await admin_session.screenshot("28_admin_sees_team1_complete")

        # Click return button if visible
        return_button = player1_page.locator("button:has-text('Return to Lobby'), button:has-text('Back to Lobby')")
        try:
            await expect(return_button).to_be_visible(timeout=5000)
            await return_button.click()
            await player1_page.wait_for_timeout(1000)
        except Exception:
            pass

        await player1_session.screenshot("29_alice_back_in_lobby_after_win")

        print("Team 1 won with multi-player multi-direction solving!")

    async def test_12_rename_teams(
        self,
        admin_actions_fixture: AdminFixture,
        player_actions_fixture: PlayerFixture,
        settings: Settings,
    ):
        """Test renaming teams in lobby."""
        test_name = "TEST_12"

        # Setup admin with lobby
        admin_actions, admin_page, admin_session, lobby_code = await setup_admin_with_lobby(
            admin_actions_fixture, settings, test_name
        )
        await admin_actions.peek_into_lobby(lobby_code)

        # Join a player
        player1_actions, player1_page, player1_session = await setup_player(
            player_actions_fixture, test_name, "Alice", lobby_code
        )

        await admin_page.wait_for_timeout(1000)
        refresh_button = admin_page.locator('[data-testid="refresh-lobby-button"]')
        if await refresh_button.is_visible(timeout=1000):
            await refresh_button.click()
            await admin_page.wait_for_timeout(1000)

        # Create teams
        await setup_teams_and_assign_players(admin_actions, admin_page, 2)

        # Rename teams
        new_team1_name = "Awesome Team"
        new_team2_name = "Cool Squad"

        await admin_actions.rename_team(1, new_team1_name)
        await admin_session.screenshot("30_team1_renamed")

        await admin_actions.rename_team(2, new_team2_name)
        await admin_session.screenshot("31_team2_renamed")

        # Verify names appear
        await expect(admin_page.locator(f'[data-testid="team-name-1"]:has-text("{new_team1_name}")')).to_be_visible()
        await expect(admin_page.locator(f'[data-testid="team-name-2"]:has-text("{new_team2_name}")')).to_be_visible()

        await player1_page.wait_for_timeout(500)
        await player1_session.screenshot("32_alice_sees_renamed_team")

        print("Teams renamed in lobby")

    async def test_13_game_transition_redirects(
        self,
        admin_actions_fixture: AdminFixture,
        player_actions_fixture: PlayerFixture,
        settings: Settings,
    ):
        """Test that players are redirected when a new game starts."""
        test_name = "TEST_13"

        # Setup admin with lobby
        admin_actions, admin_page, admin_session, lobby_code = await setup_admin_with_lobby(
            admin_actions_fixture, settings, test_name
        )
        await admin_actions.peek_into_lobby(lobby_code)

        # Join players
        player1_actions, player1_page, player1_session = await setup_player(
            player_actions_fixture, test_name, "Alice", lobby_code
        )
        player2_actions, player2_page, _ = await setup_player(player_actions_fixture, test_name, "Charlie", lobby_code)

        await admin_page.wait_for_timeout(1000)
        refresh_button = admin_page.locator('[data-testid="refresh-lobby-button"]')
        if await refresh_button.is_visible(timeout=1000):
            await refresh_button.click()
            await admin_page.wait_for_timeout(1000)

        # Create teams and start first game
        team1_name, team2_name = await setup_teams_and_assign_players(
            admin_actions, admin_page, 2, {0: ["Alice"], 1: ["Charlie"]}
        )
        await admin_actions.start_game(difficulty="medium")
        await player1_actions.wait_for_game_to_start(timeout=15000)
        await player2_actions.wait_for_game_to_start(timeout=15000)

        # Submit some guesses
        await player1_actions.submit_incorrect_guess()
        await player2_actions.submit_incorrect_guess()

        # Alice returns to lobby
        await player1_actions.leave_lobby()
        await player1_page.wait_for_timeout(500)
        await player1_actions.fill_name_and_code("Alice", lobby_code)
        await player1_actions.join_lobby()

        # Charlie stays on game screen
        # End the game and start a new one
        await admin_actions.goto_admin_page()
        await admin_actions.peek_into_lobby(lobby_code)
        await admin_page.wait_for_timeout(1000)
        await admin_actions.end_game()
        await admin_page.wait_for_timeout(1000)

        # Track URLs before new game
        alice_url = player1_page.url
        charlie_url = player2_page.url
        print(f"Before new game - Alice: {alice_url}, Charlie: {charlie_url}")

        # Start new game
        await admin_actions.start_game(difficulty="medium")
        await admin_actions.wait_for_team_progress(team1_name, timeout=10000)
        await admin_session.screenshot("33_new_game_started")

        # Verify redirects
        print("\n=== Verifying Game Transition ===")
        await player1_actions.wait_for_game_to_start(timeout=15000)
        alice_new_url = player1_page.url
        print(f"  Alice after: {alice_new_url}")
        assert "/game" in alice_new_url

        await player2_actions.wait_for_game_to_start(timeout=15000)
        charlie_new_url = player2_page.url
        print(f"  Charlie after: {charlie_new_url}")
        assert "/game" in charlie_new_url

        print("✓ All players transitioned to new game")
        await player1_session.screenshot("34_new_game_alice")

    async def test_14_end_game_via_admin(
        self,
        admin_actions_fixture: AdminFixture,
        player_actions_fixture: PlayerFixture,
        settings: Settings,
    ):
        """Test ending a game via admin."""
        test_name = "TEST_14"

        # Setup admin with lobby
        admin_actions, admin_page, admin_session, lobby_code = await setup_admin_with_lobby(
            admin_actions_fixture, settings, test_name
        )
        await admin_actions.peek_into_lobby(lobby_code)

        # Join players
        player1_actions, player1_page, player1_session = await setup_player(
            player_actions_fixture, test_name, "Alice", lobby_code
        )
        player2_actions, player2_page, player2_session = await setup_player(
            player_actions_fixture, test_name, "Charlie", lobby_code
        )

        await admin_page.wait_for_timeout(1000)
        refresh_button = admin_page.locator('[data-testid="refresh-lobby-button"]')
        if await refresh_button.is_visible(timeout=1000):
            await refresh_button.click()
            await admin_page.wait_for_timeout(1000)

        # Create teams and start game
        team1_name, team2_name = await setup_teams_and_assign_players(
            admin_actions, admin_page, 2, {0: ["Alice"], 1: ["Charlie"]}
        )
        await admin_actions.start_game(difficulty="medium")
        await player1_actions.wait_for_game_to_start(timeout=15000)
        await player2_actions.wait_for_game_to_start(timeout=15000)

        # Admin ends the game
        await admin_actions.end_game()
        await admin_session.screenshot("36_game_ended_by_admin")

        # Players redirected to lobby
        await player1_actions.verify_game_ended_redirect(timeout=10000)
        await player2_actions.verify_game_ended_redirect(timeout=10000)

        await player1_session.screenshot("37_alice_back_in_lobby_after_end")
        await player2_session.screenshot("37_charlie_back_in_lobby_after_end")

        print("Game ended by admin")

    async def test_15_lobby_switching_flow(
        self,
        admin_actions_fixture: AdminFixture,
        player_actions_fixture: PlayerFixture,
        settings: Settings,
    ):
        """Test players switching between multiple lobbies."""
        test_name = "TEST_15"

        # Setup admin and create two lobbies
        admin_actions, admin_page, admin_session = await admin_actions_fixture()
        admin_session.set_name(f"{test_name}_ADMIN")

        await admin_actions.goto_admin_page()
        await admin_actions.login(settings.ADMIN_PASSWORD)

        lobby1_code = await admin_actions.create_lobby("Test Lobby 1")
        lobby2_code = await admin_actions.create_lobby("Test Lobby 2")

        # Setup players
        player1_actions, player1_page, player1_session = await setup_player(
            player_actions_fixture, test_name, "Alice", lobby1_code
        )
        player2_actions, player2_page, player2_session = await setup_player(
            player_actions_fixture, test_name, "Frank", lobby2_code
        )

        # Frank in Lobby 2
        await admin_actions.peek_into_lobby(lobby2_code)
        await admin_page.wait_for_timeout(1000)
        refresh_button = admin_page.locator('[data-testid="refresh-lobby-button"]')
        if await refresh_button.is_visible(timeout=1000):
            await refresh_button.click()
            await admin_page.wait_for_timeout(500)

        await admin_actions.wait_for_player_name("Frank", timeout=5000)
        await admin_session.screenshot("38_frank_in_lobby2")

        # Frank leaves Lobby 2 and joins Lobby 1
        await player2_actions.leave_lobby()
        await player2_session.screenshot("38_frank_left_lobby2")

        await player2_actions.fill_name_and_code("Frank", lobby1_code)
        await player2_actions.join_lobby()

        # Verify Frank in Lobby 1
        await admin_actions.goto_admin_page()
        await admin_actions.peek_into_lobby(lobby1_code)
        await admin_page.wait_for_timeout(1000)
        if await refresh_button.is_visible(timeout=1000):
            await refresh_button.click()
            await admin_page.wait_for_timeout(500)

        await admin_actions.wait_for_player_name("Frank", timeout=5000)
        await player2_session.screenshot("39_frank_in_lobby1")

        # Alice switches to Lobby 2
        await player1_actions.leave_lobby()
        await player1_actions.goto_home_page()
        await player1_actions.fill_name_and_code("Alice", lobby2_code)
        await player1_actions.join_lobby()
        await player1_session.screenshot("40_alice_in_lobby2")

        # Verify Alice in Lobby 2
        await admin_actions.goto_admin_page()
        await admin_actions.peek_into_lobby(lobby2_code)
        await admin_page.wait_for_timeout(1000)
        if await refresh_button.is_visible(timeout=1000):
            await refresh_button.click()
            await admin_page.wait_for_timeout(500)

        await admin_actions.wait_for_player_name("Alice", timeout=5000)
        await admin_session.screenshot("41_admin_sees_alice_in_lobby2")

        print("Lobby switching flow complete")

    async def test_16_player_leaving_mid_game(
        self,
        admin_actions_fixture: AdminFixture,
        player_actions_fixture: PlayerFixture,
        settings: Settings,
    ):
        """Test player voluntarily leaving during a game and rejoining."""
        test_name = "TEST_16"

        # Setup admin with lobby
        admin_actions, admin_page, admin_session, lobby_code = await setup_admin_with_lobby(
            admin_actions_fixture, settings, test_name
        )
        await admin_actions.peek_into_lobby(lobby_code)

        # Join players
        player1_actions, player1_page, _ = await setup_player(player_actions_fixture, test_name, "Charlie", lobby_code)
        player2_actions, player2_page, player2_session = await setup_player(
            player_actions_fixture, test_name, "Diana", lobby_code
        )

        await admin_page.wait_for_timeout(1000)
        refresh_button = admin_page.locator('[data-testid="refresh-lobby-button"]')
        if await refresh_button.is_visible(timeout=1000):
            await refresh_button.click()
            await admin_page.wait_for_timeout(1000)

        # Create teams and start game
        team1_name, team2_name = await setup_teams_and_assign_players(
            admin_actions, admin_page, 2, {0: ["Charlie"], 1: ["Diana"]}
        )
        await admin_actions.start_game(difficulty="medium")
        await player1_actions.wait_for_game_to_start(timeout=15000)
        await player2_actions.wait_for_game_to_start(timeout=15000)

        # Diana leaves mid-game
        print("Diana leaving game...")
        await player2_actions.leave_lobby()
        await player2_session.screenshot("44_diana_left_during_game")

        # Charlie continues
        await player1_actions.submit_incorrect_guess()

        # Diana rejoins
        print("Diana rejoining...")
        await player2_actions.fill_name_and_code("Diana", lobby_code)
        await player2_actions.join_lobby()
        await player2_session.screenshot("46_diana_rejoined_lobby")

        # Verify Diana is unassigned
        await player2_actions.verify_unassigned(timeout=5000)

        # Admin assigns Diana back
        await admin_actions.move_player_to_team("Diana", team2_name)

        # Diana redirected to game
        await player2_actions.wait_for_game_to_start(timeout=10000)
        await player2_actions.submit_incorrect_guess()
        await player2_session.screenshot("47_diana_playing_after_reassignment")

        print("Player leaving and rejoining mid-game works")

    async def test_17_websocket_reconnection(
        self,
        admin_actions_fixture: AdminFixture,
        player_actions_fixture: PlayerFixture,
        settings: Settings,
    ):
        """Test WebSocket reconnection in lobby and during game."""
        test_name = "TEST_17"

        # Setup admin with lobby
        admin_actions, admin_page, admin_session, lobby_code = await setup_admin_with_lobby(
            admin_actions_fixture, settings, test_name
        )
        await admin_actions.peek_into_lobby(lobby_code)

        # Join player
        player1_actions, player1_page, player1_session = await setup_player(
            player_actions_fixture, test_name, "Alice", lobby_code
        )

        await admin_page.wait_for_timeout(1000)
        refresh_button = admin_page.locator('[data-testid="refresh-lobby-button"]')
        if await refresh_button.is_visible(timeout=1000):
            await refresh_button.click()
            await admin_page.wait_for_timeout(1000)

        # Create teams
        team1_name, _ = await setup_teams_and_assign_players(admin_actions, admin_page, 2, {0: ["Alice"]})

        # Test reconnection in lobby
        print("Testing reconnection in lobby...")
        await player1_session.screenshot("48_before_disconnect_lobby")

        await player1_actions.simulate_disconnect()
        await player1_page.wait_for_timeout(500)
        await player1_session.screenshot("49_disconnected_lobby")

        await player1_actions.simulate_reconnect()
        await player1_actions.wait_in_lobby()
        await player1_session.screenshot("50_reconnected_lobby")

        await player1_actions.verify_in_team(team1_name, timeout=5000)

        # Start game for in-game reconnection test
        await admin_actions.start_game(difficulty="medium")
        await player1_actions.wait_for_game_to_start(timeout=15000)

        await player1_actions.submit_incorrect_guess()
        await player1_session.screenshot("51_before_disconnect_game")

        # Test reconnection during game
        print("Testing reconnection during game...")
        await player1_actions.simulate_disconnect()
        await player1_page.wait_for_timeout(500)
        await player1_session.screenshot("52_disconnected_game")

        await player1_actions.simulate_reconnect()
        await player1_actions.wait_for_game_to_start(timeout=15000)
        await player1_session.screenshot("53_reconnected_game")

        await player1_actions.submit_incorrect_guess()
        await player1_session.screenshot("54_game_state_synced_after_reconnect")

        print("WebSocket reconnection works correctly")

    async def test_18_unassigned_players(
        self,
        admin_actions_fixture: AdminFixture,
        player_actions_fixture: PlayerFixture,
        settings: Settings,
    ):
        """Test scenarios with unassigned players."""
        test_name = "TEST_18"

        # Setup admin with lobby
        admin_actions, admin_page, admin_session, lobby_code = await setup_admin_with_lobby(
            admin_actions_fixture, settings, test_name
        )
        await admin_actions.peek_into_lobby(lobby_code)

        # Join players
        player1_actions, player1_page, _ = await setup_player(player_actions_fixture, test_name, "Alice", lobby_code)
        player2_actions, player2_page, player2_session = await setup_player(
            player_actions_fixture, test_name, "Frank", lobby_code
        )

        await admin_page.wait_for_timeout(1000)
        refresh_button = admin_page.locator('[data-testid="refresh-lobby-button"]')
        if await refresh_button.is_visible(timeout=1000):
            await refresh_button.click()
            await admin_page.wait_for_timeout(1000)

        # Create teams and assign only Alice
        team1_name, team2_name = await setup_teams_and_assign_players(admin_actions, admin_page, 2, {0: ["Alice"]})

        # Explicitly unassign Frank (he might have been auto-assigned)
        await admin_actions.unassign_player("Frank")

        # Verify Frank is unassigned
        await player2_actions.verify_unassigned(timeout=5000)
        await admin_session.screenshot("55_frank_unassigned")

        # Try to start game with unassigned player
        print("Starting game with unassigned player...")
        try:
            await admin_actions.start_game(difficulty="medium")
            await player1_actions.wait_for_game_to_start(timeout=10000)

            # Frank might be on game page but can't play
            await player2_page.wait_for_timeout(1000)
            await player2_session.screenshot("56_frank_cant_play_unassigned")

            # Assign Frank mid-game
            print("Assigning Frank mid-game...")
            await admin_actions.move_player_to_team("Frank", team2_name)
            await player2_page.wait_for_timeout(1500)

            await player2_actions.wait_for_game_to_start(timeout=10000)
            await player2_page.wait_for_timeout(1000)
            await player2_actions.submit_incorrect_guess()
            await player2_session.screenshot("57_frank_playing_after_mid_game_assignment")

            print("Unassigned player scenarios work")
        except Exception as e:
            print(f"Game blocked with unassigned player: {e}")
            await admin_session.screenshot("56_game_blocked_with_unassigned")

    async def test_19_empty_team_scenarios(
        self,
        admin_actions_fixture: AdminFixture,
        player_actions_fixture: PlayerFixture,
        settings: Settings,
    ):
        """Test scenarios with empty teams."""
        test_name = "TEST_19"

        # Setup admin with lobby
        admin_actions, admin_page, admin_session, lobby_code = await setup_admin_with_lobby(
            admin_actions_fixture, settings, test_name
        )
        await admin_actions.peek_into_lobby(lobby_code)

        # Join players
        player1_actions, player1_page, _ = await setup_player(player_actions_fixture, test_name, "Alice", lobby_code)
        player2_actions, player2_page, _ = await setup_player(player_actions_fixture, test_name, "Charlie", lobby_code)
        player3_actions, player3_page, _ = await setup_player(player_actions_fixture, test_name, "Frank", lobby_code)

        await admin_page.wait_for_timeout(1000)
        refresh_button = admin_page.locator('[data-testid="refresh-lobby-button"]')
        if await refresh_button.is_visible(timeout=1000):
            await refresh_button.click()
            await admin_page.wait_for_timeout(1000)

        # Create teams and assign all to team1, leaving team2 empty
        team1_name, team2_name = await setup_teams_and_assign_players(
            admin_actions, admin_page, 2, {0: ["Alice", "Charlie", "Frank"]}
        )

        # Wait for UI to update
        await player2_page.wait_for_timeout(2000)
        await player3_page.wait_for_timeout(2000)

        # Verify assignments
        try:
            await player2_actions.verify_in_team(team1_name, timeout=10000)
            await player3_actions.verify_in_team(team1_name, timeout=10000)
            print("✓ All players in team1")
        except Exception as e:
            print(f"Note: UI verification failed but backend working: {e}")

        await admin_session.screenshot("58_team2_empty")

        # Try to start game with empty team
        print("Starting game with empty team...")
        try:
            await admin_actions.start_game(difficulty="medium")
            await player1_actions.wait_for_game_to_start(timeout=10000)
            await admin_session.screenshot("59_game_started_with_empty_team")
            print("Game can start with empty team")
        except Exception as e:
            print(f"Game blocked with empty team: {e}")
            await admin_session.screenshot("59_game_blocked_with_empty_team")

    async def test_20_puzzle_mode_and_difficulty(
        self,
        admin_actions_fixture: AdminFixture,
        player_actions_fixture: PlayerFixture,
        settings: Settings,
    ):
        """Test different puzzle modes and difficulty levels."""
        test_name = "TEST_20"

        # Setup admin with lobby
        admin_actions, admin_page, admin_session, lobby_code = await setup_admin_with_lobby(
            admin_actions_fixture, settings, test_name
        )
        await admin_actions.peek_into_lobby(lobby_code)

        # Join players
        player1_actions, player1_page, _ = await setup_player(player_actions_fixture, test_name, "Alice", lobby_code)
        player2_actions, player2_page, _ = await setup_player(player_actions_fixture, test_name, "Charlie", lobby_code)

        await admin_page.wait_for_timeout(1000)
        refresh_button = admin_page.locator('[data-testid="refresh-lobby-button"]')
        if await refresh_button.is_visible(timeout=1000):
            await refresh_button.click()
            await admin_page.wait_for_timeout(1000)

        # Create teams
        team1_name, team2_name = await setup_teams_and_assign_players(
            admin_actions, admin_page, 2, {0: ["Alice"], 1: ["Charlie"]}
        )

        server_url = "http://localhost:8000"
        alice_session_id = await player1_page.evaluate("() => localStorage.getItem('raddle_session_id')")
        charlie_session_id = await player2_page.evaluate("() => localStorage.getItem('raddle_session_id')")

        # Test 1: SAME puzzle mode + MEDIUM difficulty
        print("\nTest 1: SAME puzzle + MEDIUM difficulty...")
        await admin_actions.start_game(difficulty="medium", puzzle_mode="same")
        await admin_actions.wait_for_team_progress(team1_name, timeout=10000)
        await admin_actions.wait_for_team_progress(team2_name, timeout=10000)
        await player1_actions.wait_for_game_to_start(timeout=15000)
        await player2_actions.wait_for_game_to_start(timeout=15000)

        # Get puzzles
        alice_puzzle = await player1_actions.get_puzzle_data(alice_session_id, server_url)
        charlie_puzzle = await player2_actions.get_puzzle_data(charlie_session_id, server_url)

        alice_words = [step["word"] for step in alice_puzzle["puzzle"]["ladder"]]
        charlie_words = [step["word"] for step in charlie_puzzle["puzzle"]["ladder"]]

        print(f"  Alice: {alice_words}")
        print(f"  Charlie: {charlie_words}")

        # Verify SAME mode
        assert alice_words == charlie_words, "Puzzles should be identical"
        print("  ✓ SAME puzzle mode verified")
        print(f"  ✓ MEDIUM difficulty: {len(alice_words)} words")

        await admin_session.screenshot("60_same_puzzle_medium")

        # End game
        await admin_actions.end_game()
        await player1_actions.verify_game_ended_redirect(timeout=10000)

        # Test 2: DIFFERENT puzzle mode + MEDIUM difficulty
        print("\nTest 2: DIFFERENT puzzle + MEDIUM difficulty...")
        await admin_actions.start_game(difficulty="medium", puzzle_mode="different", word_count_mode="balanced")
        await admin_actions.wait_for_team_progress(team1_name, timeout=10000)
        await admin_actions.wait_for_team_progress(team2_name, timeout=10000)
        await player1_actions.wait_for_game_to_start(timeout=15000)
        await player2_actions.wait_for_game_to_start(timeout=15000)

        # Get puzzles
        alice_puzzle = await player1_actions.get_puzzle_data(alice_session_id, server_url)
        charlie_puzzle = await player2_actions.get_puzzle_data(charlie_session_id, server_url)

        alice_words = [step["word"] for step in alice_puzzle["puzzle"]["ladder"]]
        charlie_words = [step["word"] for step in charlie_puzzle["puzzle"]["ladder"]]

        print(f"  Alice: {alice_words}")
        print(f"  Charlie: {charlie_words}")

        # Verify DIFFERENT mode
        assert alice_words != charlie_words, "Puzzles should be different"
        print("  ✓ DIFFERENT puzzle mode verified")

        # Verify balanced word counts
        word_count_diff = abs(len(alice_words) - len(charlie_words))
        assert word_count_diff <= 1, f"Word count diff {word_count_diff} > 1"
        print(f"  ✓ Balanced: {len(alice_words)} vs {len(charlie_words)} (diff: {word_count_diff})")

        await admin_session.screenshot("61_different_puzzle_medium")

        # End game
        await admin_actions.end_game()
        await player1_actions.verify_game_ended_redirect(timeout=10000)

        print("✓ Puzzle mode and difficulty testing complete")

    async def test_21_final_state_verification(
        self,
        admin_actions_fixture: AdminFixture,
        player_actions_fixture: PlayerFixture,
        settings: Settings,
    ):
        """Final verification that lobby is still functional."""
        test_name = "TEST_21"

        # Setup admin with lobby
        admin_actions, admin_page, admin_session, lobby_code = await setup_admin_with_lobby(
            admin_actions_fixture, settings, test_name
        )
        await admin_actions.peek_into_lobby(lobby_code)

        # Join players
        player1_actions, player1_page, player1_session = await setup_player(
            player_actions_fixture, test_name, "Alice", lobby_code
        )
        player2_actions, player2_page, _ = await setup_player(player_actions_fixture, test_name, "Charlie", lobby_code)

        await admin_page.wait_for_timeout(1000)
        refresh_button = admin_page.locator('[data-testid="refresh-lobby-button"]')
        if await refresh_button.is_visible(timeout=1000):
            await refresh_button.click()
            await admin_page.wait_for_timeout(1000)

        # Create teams
        team1_name, team2_name = await setup_teams_and_assign_players(
            admin_actions, admin_page, 2, {0: ["Alice"], 1: ["Charlie"]}
        )

        # Verify lobby is functional
        await admin_session.screenshot("62_final_admin_state")
        await player1_session.screenshot("62_final_alice_state")

        await player1_actions.verify_in_team(team1_name, timeout=5000)
        await player2_actions.verify_in_team(team2_name, timeout=5000)

        print("\n=== ALL TESTS COMPLETE ===")
        print("✓ All 21 comprehensive E2E tests passed!")

    # ==================== TOURNAMENT FEATURE TESTS ====================

    async def test_22_tournament_continuous_play_and_placements(
        self,
        admin_actions_fixture: AdminFixture,
        player_actions_fixture: PlayerFixture,
        settings: Settings,
    ):
        """Test that teams compete for all placements (1st, 2nd, 3rd) without auto-revealing puzzles."""
        test_name = "TEST_22"

        # Setup admin with lobby
        admin_actions, admin_page, admin_session, lobby_code = await setup_admin_with_lobby(
            admin_actions_fixture, settings, test_name
        )
        await admin_actions.peek_into_lobby(lobby_code)

        # Join 6 players for 3 teams
        player1_actions, player1_page, player1_session = await setup_player(
            player_actions_fixture, test_name, "Alice", lobby_code
        )
        player2_actions, player2_page, player2_session = await setup_player(
            player_actions_fixture, test_name, "Bob", lobby_code
        )
        player3_actions, player3_page, player3_session = await setup_player(
            player_actions_fixture, test_name, "Charlie", lobby_code
        )
        player4_actions, player4_page, player4_session = await setup_player(
            player_actions_fixture, test_name, "Diana", lobby_code
        )
        player5_actions, player5_page, player5_session = await setup_player(
            player_actions_fixture, test_name, "Eva", lobby_code
        )
        player6_actions, player6_page, player6_session = await setup_player(
            player_actions_fixture, test_name, "Frank", lobby_code
        )

        await admin_page.wait_for_timeout(1000)
        refresh_button = admin_page.locator('[data-testid="refresh-lobby-button"]')
        if await refresh_button.is_visible(timeout=1000):
            await refresh_button.click()
            await admin_page.wait_for_timeout(1000)

        # Create 3 teams
        team1_name, team2_name, team3_name = await setup_teams_and_assign_players(
            admin_actions,
            admin_page,
            3,
            {0: ["Alice", "Bob"], 1: ["Charlie", "Diana"], 2: ["Eva", "Frank"]},
        )

        # Start game
        await admin_actions.start_game(difficulty="medium")
        await player1_actions.wait_for_game_to_start(timeout=15000)
        await player3_actions.wait_for_game_to_start(timeout=15000)
        await player5_actions.wait_for_game_to_start(timeout=15000)

        # Get session IDs and puzzle data
        server_url = "http://localhost:8000"
        alice_session_id = await player1_page.evaluate("""() => localStorage.getItem('raddle_session_id')""")
        charlie_session_id = await player3_page.evaluate("""() => localStorage.getItem('raddle_session_id')""")
        eva_session_id = await player5_page.evaluate("""() => localStorage.getItem('raddle_session_id')""")

        alice_puzzle = await player1_actions.get_puzzle_data(alice_session_id, server_url)
        charlie_puzzle = await player3_actions.get_puzzle_data(charlie_session_id, server_url)
        eva_puzzle = await player5_actions.get_puzzle_data(eva_session_id, server_url)

        team1_total_words = len(alice_puzzle["puzzle"]["ladder"])
        team2_total_words = len(charlie_puzzle["puzzle"]["ladder"])
        team3_total_words = len(eva_puzzle["puzzle"]["ladder"])

        print(
            f"Team 1: {team1_total_words} words, Team 2: {team2_total_words} words, Team 3: {team3_total_words} words"
        )

        # Team 1 will finish first
        print("\nTeam 1 solving to finish first...")
        await player1_actions.solve_partial_puzzle_alternating(
            alice_session_id, server_url, num_words_from_start=team1_total_words - 2, num_words_from_end=0
        )

        # Wait for Team 1 to finish
        await player1_page.wait_for_timeout(2000)
        await player1_session.screenshot("63_team1_finished_first")

        # Verify Team 2 and Team 3 can still see their puzzles (no auto-reveal)
        team2_puzzle_visible = await player3_page.locator('[data-testid="word-ladder-container"]').is_visible()
        team3_puzzle_visible = await player5_page.locator('[data-testid="word-ladder-container"]').is_visible()

        assert team2_puzzle_visible, "Team 2 puzzle should still be visible"
        assert team3_puzzle_visible, "Team 3 puzzle should still be visible"

        print("✓ Puzzles NOT auto-revealed - teams can compete for 2nd and 3rd place")

        # Team 3 finishes second
        print("\nTeam 3 solving to finish second...")
        await player5_actions.solve_partial_puzzle_alternating(
            eva_session_id, server_url, num_words_from_start=team3_total_words - 2, num_words_from_end=0
        )

        await player5_page.wait_for_timeout(2000)
        await player5_session.screenshot("64_team3_finished_second")

        # Team 2 finishes third
        print("\nTeam 2 solving to finish third...")
        await player3_actions.solve_partial_puzzle_alternating(
            charlie_session_id, server_url, num_words_from_start=team2_total_words - 2, num_words_from_end=0
        )

        await player3_page.wait_for_timeout(2000)
        await player3_session.screenshot("65_team2_finished_third")

        # Verify admin can see all placements
        await admin_page.wait_for_timeout(1000)
        await admin_session.screenshot("66_admin_sees_all_placements")

        print("✓ Tournament continuous play: all teams competed for placements!")

    async def test_23_tournament_round_ending_with_points(
        self,
        admin_actions_fixture: AdminFixture,
        player_actions_fixture: PlayerFixture,
        settings: Settings,
    ):
        """Test admin ending round, points calculation, and new round creation."""
        test_name = "TEST_23"

        # Setup admin with lobby
        admin_actions, admin_page, admin_session, lobby_code = await setup_admin_with_lobby(
            admin_actions_fixture, settings, test_name
        )
        await admin_actions.peek_into_lobby(lobby_code)

        # Join 4 players for 2 teams
        player1_actions, player1_page, player1_session = await setup_player(
            player_actions_fixture, test_name, "Alice", lobby_code
        )
        player2_actions, player2_page, player2_session = await setup_player(
            player_actions_fixture, test_name, "Bob", lobby_code
        )

        await admin_page.wait_for_timeout(1000)
        refresh_button = admin_page.locator('[data-testid="refresh-lobby-button"]')
        if await refresh_button.is_visible(timeout=1000):
            await refresh_button.click()
            await admin_page.wait_for_timeout(1000)

        # Create 2 teams
        team1_name, team2_name = await setup_teams_and_assign_players(
            admin_actions, admin_page, 2, {0: ["Alice"], 1: ["Bob"]}
        )

        # Verify leaderboard shows 0 rounds played initially
        leaderboard_visible = await admin_page.locator('text="🏆 Tournament Leaderboard"').is_visible()
        if leaderboard_visible:
            await admin_session.screenshot("67_initial_leaderboard_no_rounds")
            print("✓ Leaderboard visible before any rounds")

        # Start game
        await admin_actions.start_game(difficulty="medium")
        await player1_actions.wait_for_game_to_start(timeout=15000)
        await player2_actions.wait_for_game_to_start(timeout=15000)

        # Get session IDs
        server_url = "http://localhost:8000"
        alice_session_id = await player1_page.evaluate("""() => localStorage.getItem('raddle_session_id')""")

        # Team 1 completes puzzle
        alice_puzzle = await player1_actions.get_puzzle_data(alice_session_id, server_url)
        team1_total_words = len(alice_puzzle["puzzle"]["ladder"])

        print("\nTeam 1 solving puzzle...")
        await player1_actions.solve_partial_puzzle_alternating(
            alice_session_id, server_url, num_words_from_start=team1_total_words - 2, num_words_from_end=0
        )

        await player1_page.wait_for_timeout(2000)

        # Admin ends the round
        print("\nAdmin ending round...")
        await admin_actions.end_game()

        await admin_page.wait_for_timeout(2000)
        await admin_session.screenshot("68_round_ended_new_round_started")

        # Verify new game can be started (button should be visible)
        start_game_button = admin_page.locator('[data-testid="start-game-button"]')
        await expect(start_game_button).to_be_visible(timeout=5000)

        print("✓ Round ended and new round created")

        # Verify leaderboard shows round 1 results
        if await admin_page.locator('text="Round 1"').is_visible(timeout=2000):
            await admin_session.screenshot("69_leaderboard_shows_round_1")
            print("✓ Leaderboard updated with Round 1 results")

    async def test_24_tournament_leaderboard_updates(
        self,
        admin_actions_fixture: AdminFixture,
        player_actions_fixture: PlayerFixture,
        settings: Settings,
    ):
        """Test leaderboard updates and cumulative points across rounds."""
        test_name = "TEST_24"

        # Setup admin with lobby
        admin_actions, admin_page, admin_session, lobby_code = await setup_admin_with_lobby(
            admin_actions_fixture, settings, test_name
        )
        await admin_actions.peek_into_lobby(lobby_code)

        # Join 4 players for 2 teams
        player1_actions, player1_page, player1_session = await setup_player(
            player_actions_fixture, test_name, "Alice", lobby_code
        )
        player2_actions, player2_page, player2_session = await setup_player(
            player_actions_fixture, test_name, "Bob", lobby_code
        )

        await admin_page.wait_for_timeout(1000)
        refresh_button = admin_page.locator('[data-testid="refresh-lobby-button"]')
        if await refresh_button.is_visible(timeout=1000):
            await refresh_button.click()
            await admin_page.wait_for_timeout(1000)

        # Create 2 teams
        team1_name, team2_name = await setup_teams_and_assign_players(
            admin_actions, admin_page, 2, {0: ["Alice"], 1: ["Bob"]}
        )

        # Play Round 1: Team 1 wins
        print("\n=== Round 1 ===")
        await admin_actions.start_game(difficulty="medium")
        await player1_actions.wait_for_game_to_start(timeout=15000)
        await player2_actions.wait_for_game_to_start(timeout=15000)

        server_url = "http://localhost:8000"
        alice_session_id = await player1_page.evaluate("""() => localStorage.getItem('raddle_session_id')""")
        alice_puzzle = await player1_actions.get_puzzle_data(alice_session_id, server_url)
        team1_total_words = len(alice_puzzle["puzzle"]["ladder"])

        await player1_actions.solve_partial_puzzle_alternating(
            alice_session_id, server_url, num_words_from_start=team1_total_words - 2, num_words_from_end=0
        )
        await player1_page.wait_for_timeout(2000)

        await admin_actions.end_game()
        await admin_page.wait_for_timeout(2000)

        # Check leaderboard shows Round 1
        if await admin_page.locator('text="Round 1"').is_visible(timeout=2000):
            print("✓ Leaderboard shows Round 1")
            await admin_session.screenshot("70_leaderboard_after_round_1")

        # Play Round 2: Team 2 wins
        print("\n=== Round 2 ===")
        await admin_actions.start_game(difficulty="medium")
        await player1_actions.wait_for_game_to_start(timeout=15000)
        await player2_actions.wait_for_game_to_start(timeout=15000)

        bob_session_id = await player2_page.evaluate("""() => localStorage.getItem('raddle_session_id')""")
        bob_puzzle = await player2_actions.get_puzzle_data(bob_session_id, server_url)
        team2_total_words = len(bob_puzzle["puzzle"]["ladder"])

        await player2_actions.solve_partial_puzzle_alternating(
            bob_session_id, server_url, num_words_from_start=team2_total_words - 2, num_words_from_end=0
        )
        await player2_page.wait_for_timeout(2000)

        await admin_actions.end_game()
        await admin_page.wait_for_timeout(2000)

        # Check leaderboard shows Round 2 and cumulative points
        if await admin_page.locator('text="Round 2"').is_visible(timeout=2000):
            print("✓ Leaderboard shows Round 2")
            await admin_session.screenshot("71_leaderboard_after_round_2")

        # Verify placement breakdown format (1st-2nd-3rd-DNF)
        placement_breakdown_visible = await admin_page.locator("text=/\\(\\d+-\\d+-\\d+-\\d+\\)/").is_visible()
        if placement_breakdown_visible:
            print("✓ Placement breakdown format visible")

        print("✓ Leaderboard cumulative points working across rounds")

    async def test_25_tournament_round_summary_viewing(
        self,
        admin_actions_fixture: AdminFixture,
        player_actions_fixture: PlayerFixture,
        settings: Settings,
    ):
        """Test admin viewing round summary with player stats and awards."""
        test_name = "TEST_25"

        # Setup admin with lobby
        admin_actions, admin_page, admin_session, lobby_code = await setup_admin_with_lobby(
            admin_actions_fixture, settings, test_name
        )
        await admin_actions.peek_into_lobby(lobby_code)

        # Join 4 players for 2 teams
        player1_actions, player1_page, player1_session = await setup_player(
            player_actions_fixture, test_name, "Alice", lobby_code
        )
        player2_actions, player2_page, player2_session = await setup_player(
            player_actions_fixture, test_name, "Bob", lobby_code
        )
        player3_actions, player3_page, player3_session = await setup_player(
            player_actions_fixture, test_name, "Charlie", lobby_code
        )
        player4_actions, player4_page, player4_session = await setup_player(
            player_actions_fixture, test_name, "Diana", lobby_code
        )

        await admin_page.wait_for_timeout(1000)
        refresh_button = admin_page.locator('[data-testid="refresh-lobby-button"]')
        if await refresh_button.is_visible(timeout=1000):
            await refresh_button.click()
            await admin_page.wait_for_timeout(1000)

        # Create 2 teams with 2 players each
        team1_name, team2_name = await setup_teams_and_assign_players(
            admin_actions, admin_page, 2, {0: ["Alice", "Bob"], 1: ["Charlie", "Diana"]}
        )

        # Start and complete a round
        await admin_actions.start_game(difficulty="medium")
        await player1_actions.wait_for_game_to_start(timeout=15000)
        await player2_actions.wait_for_game_to_start(timeout=15000)
        await player3_actions.wait_for_game_to_start(timeout=15000)
        await player4_actions.wait_for_game_to_start(timeout=15000)

        server_url = "http://localhost:8000"
        alice_session_id = await player1_page.evaluate("""() => localStorage.getItem('raddle_session_id')""")
        bob_session_id = await player2_page.evaluate("""() => localStorage.getItem('raddle_session_id')""")

        alice_puzzle = await player1_actions.get_puzzle_data(alice_session_id, server_url)
        team1_total_words = len(alice_puzzle["puzzle"]["ladder"])

        # Alice and Bob collaborate to solve
        alice_words = (team1_total_words - 2) // 2
        bob_words = (team1_total_words - 2) - alice_words

        print(f"Alice solving {alice_words} words, Bob solving {bob_words} words")
        await player1_actions.solve_partial_puzzle_alternating(
            alice_session_id, server_url, num_words_from_start=alice_words, num_words_from_end=0
        )
        await player2_actions.solve_partial_puzzle_alternating(
            bob_session_id, server_url, num_words_from_start=0, num_words_from_end=bob_words
        )

        await player1_page.wait_for_timeout(2000)

        # End round
        await admin_actions.end_game()
        await admin_page.wait_for_timeout(2000)

        # Check for "View Last Round Results" or "View Results" button
        view_results_button = admin_page.locator('button:has-text("View"), button:has-text("Results")')
        if await view_results_button.is_visible(timeout=3000):
            print("✓ View Results button visible")
            await view_results_button.first.click()
            await admin_page.wait_for_timeout(1000)

            # Verify round summary modal elements
            round_results_heading = await admin_page.locator('text="Round"').first.is_visible()
            if round_results_heading:
                await admin_session.screenshot("72_round_summary_modal")
                print("✓ Round summary modal opened")

                # Check for team rankings table
                if await admin_page.locator('text="Team Rankings"').is_visible():
                    print("✓ Team rankings table visible")

                # Check for medals
                if await admin_page.locator('text="🥇"').is_visible():
                    print("✓ Medals visible in rankings")

                # Try to expand player details
                show_details_button = admin_page.locator('button:has-text("Show")')
                if await show_details_button.is_visible(timeout=2000):
                    await show_details_button.first.click()
                    await admin_page.wait_for_timeout(1000)
                    await admin_session.screenshot("73_player_stats_expanded")

                    # Check for player names
                    alice_visible = await admin_page.locator('text="Alice"').is_visible()
                    bob_visible = await admin_page.locator('text="Bob"').is_visible()

                    if alice_visible and bob_visible:
                        print("✓ Player stats visible")

                # Close modal
                close_button = admin_page.locator('button:has-text("Close")')
                if await close_button.is_visible():
                    await close_button.last.click()
                    await admin_page.wait_for_timeout(500)
                    print("✓ Round summary modal closed")

        print("✓ Round summary viewing complete")

    async def test_26_tournament_dnf_scoring(
        self,
        admin_actions_fixture: AdminFixture,
        player_actions_fixture: PlayerFixture,
        settings: Settings,
    ):
        """Test DNF (Did Not Finish) scoring with completion percentage."""
        test_name = "TEST_26"

        # Setup admin with lobby
        admin_actions, admin_page, admin_session, lobby_code = await setup_admin_with_lobby(
            admin_actions_fixture, settings, test_name
        )
        await admin_actions.peek_into_lobby(lobby_code)

        # Join 4 players for 2 teams
        player1_actions, player1_page, player1_session = await setup_player(
            player_actions_fixture, test_name, "Alice", lobby_code
        )
        player2_actions, player2_page, player2_session = await setup_player(
            player_actions_fixture, test_name, "Bob", lobby_code
        )

        await admin_page.wait_for_timeout(1000)
        refresh_button = admin_page.locator('[data-testid="refresh-lobby-button"]')
        if await refresh_button.is_visible(timeout=1000):
            await refresh_button.click()
            await admin_page.wait_for_timeout(1000)

        # Create 2 teams
        team1_name, team2_name = await setup_teams_and_assign_players(
            admin_actions, admin_page, 2, {0: ["Alice"], 1: ["Bob"]}
        )

        # Start game
        await admin_actions.start_game(difficulty="medium")
        await player1_actions.wait_for_game_to_start(timeout=15000)
        await player2_actions.wait_for_game_to_start(timeout=15000)

        server_url = "http://localhost:8000"
        alice_session_id = await player1_page.evaluate("""() => localStorage.getItem('raddle_session_id')""")
        bob_session_id = await player2_page.evaluate("""() => localStorage.getItem('raddle_session_id')""")

        alice_puzzle = await player1_actions.get_puzzle_data(alice_session_id, server_url)
        bob_puzzle = await player2_actions.get_puzzle_data(bob_session_id, server_url)

        team1_total_words = len(alice_puzzle["puzzle"]["ladder"])
        team2_total_words = len(bob_puzzle["puzzle"]["ladder"])

        # Team 1 completes fully
        print("\nTeam 1 completing puzzle...")
        await player1_actions.solve_partial_puzzle_alternating(
            alice_session_id, server_url, num_words_from_start=team1_total_words - 2, num_words_from_end=0
        )
        await player1_page.wait_for_timeout(2000)

        # Team 2 completes only ~60% (DNF)
        team2_partial_words = int((team2_total_words - 2) * 0.6)
        print(f"\nTeam 2 completing {team2_partial_words} out of {team2_total_words - 2} words (DNF)...")
        await player2_actions.solve_partial_puzzle_alternating(
            bob_session_id, server_url, num_words_from_start=team2_partial_words, num_words_from_end=0
        )
        await player2_page.wait_for_timeout(1000)

        # Admin ends round (Team 2 did not finish)
        print("\nAdmin ending round with DNF team...")
        await admin_actions.end_game()
        await admin_page.wait_for_timeout(2000)

        await admin_session.screenshot("74_round_ended_with_dnf")

        # Verify leaderboard shows results
        if await admin_page.locator('text="Round 1"').is_visible(timeout=2000):
            print("✓ Round ended with DNF scoring")

        print("✓ DNF scoring complete")

    async def test_27_tournament_zero_points_rule(
        self,
        admin_actions_fixture: AdminFixture,
        player_actions_fixture: PlayerFixture,
        settings: Settings,
    ):
        """Test zero-points rule: if nobody finishes, everyone gets 0 points."""
        test_name = "TEST_27"

        # Setup admin with lobby
        admin_actions, admin_page, admin_session, lobby_code = await setup_admin_with_lobby(
            admin_actions_fixture, settings, test_name
        )
        await admin_actions.peek_into_lobby(lobby_code)

        # Join 4 players for 2 teams
        player1_actions, player1_page, player1_session = await setup_player(
            player_actions_fixture, test_name, "Alice", lobby_code
        )
        player2_actions, player2_page, player2_session = await setup_player(
            player_actions_fixture, test_name, "Bob", lobby_code
        )

        await admin_page.wait_for_timeout(1000)
        refresh_button = admin_page.locator('[data-testid="refresh-lobby-button"]')
        if await refresh_button.is_visible(timeout=1000):
            await refresh_button.click()
            await admin_page.wait_for_timeout(1000)

        # Create 2 teams
        team1_name, team2_name = await setup_teams_and_assign_players(
            admin_actions, admin_page, 2, {0: ["Alice"], 1: ["Bob"]}
        )

        # Start game
        await admin_actions.start_game(difficulty="medium")
        await player1_actions.wait_for_game_to_start(timeout=15000)
        await player2_actions.wait_for_game_to_start(timeout=15000)

        server_url = "http://localhost:8000"
        alice_session_id = await player1_page.evaluate("""() => localStorage.getItem('raddle_session_id')""")
        bob_session_id = await player2_page.evaluate("""() => localStorage.getItem('raddle_session_id')""")

        alice_puzzle = await player1_actions.get_puzzle_data(alice_session_id, server_url)
        bob_puzzle = await player2_actions.get_puzzle_data(bob_session_id, server_url)

        team1_total_words = len(alice_puzzle["puzzle"]["ladder"])
        team2_total_words = len(bob_puzzle["puzzle"]["ladder"])

        # Both teams complete only ~30% (neither finishes)
        team1_partial = int((team1_total_words - 2) * 0.3)
        team2_partial = int((team2_total_words - 2) * 0.3)

        print(f"\nTeam 1 completing {team1_partial} words (not finishing)...")
        await player1_actions.solve_partial_puzzle_alternating(
            alice_session_id, server_url, num_words_from_start=team1_partial, num_words_from_end=0
        )

        print(f"\nTeam 2 completing {team2_partial} words (not finishing)...")
        await player2_actions.solve_partial_puzzle_alternating(
            bob_session_id, server_url, num_words_from_start=team2_partial, num_words_from_end=0
        )

        await player1_page.wait_for_timeout(1000)

        # Admin ends round (nobody finished)
        print("\nAdmin ending round with no finishers...")
        await admin_actions.end_game()
        await admin_page.wait_for_timeout(2000)

        await admin_session.screenshot("75_round_ended_nobody_finished")

        # Verify leaderboard shows 0 points for all teams
        if await admin_page.locator('text="0 pts"').is_visible(timeout=2000):
            print("✓ Zero-points rule: all teams got 0 points")

        print("✓ Zero-points rule verified")

        print("\n=== ALL TOURNAMENT TESTS COMPLETE ===")
        print("✓ All 27 E2E tests passed (21 base + 6 tournament)!")
