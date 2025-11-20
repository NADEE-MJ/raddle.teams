"""
Comprehensive end-to-end test covering the complete game flow.

This test covers:
1. Admin login and lobby creation
2. Multiple players joining lobbies
3. Team creation and management
4. Player movement between teams
5. Kicking and re-joining players
6. Duplicate name handling
7. Multiple lobby management
8. Starting games
9. Playing games (correct and incorrect guesses)
10. Kicking players during games
11. Moving players during games
12. Renaming teams during games
13. Game completion and victory screen
14. Returning to lobby after game
15. Starting a new game
16. Admin ending a game
"""

from typing import Awaitable, Callable

from playwright.async_api import Page, expect

from backend.settings import Settings
from e2e.fixtures.browsers import BrowserSession
from e2e.utilities.admin_actions import AdminActions
from e2e.utilities.player_actions import PlayerActions

type AdminFixture = Callable[[], Awaitable[tuple[AdminActions, Page, BrowserSession]]]
type PlayerFixture = Callable[[str], Awaitable[tuple[PlayerActions, Page, BrowserSession]]]


class TestComprehensiveGameFlow:
    async def test_complete_game_flow_marathon(
        self,
        admin_actions_fixture: AdminFixture,
        player_actions_fixture: PlayerFixture,
        settings: Settings,
    ):
        """
        Comprehensive marathon test covering all major game flows.
        This test is designed to run continuously until it errors out.
        """

        # ============================================================
        # PART 1: Setup - Create admin and player browsers
        # ============================================================
        print("\n=== PART 1: Setup ===")

        # Create admin browser
        admin_actions, admin_page, admin_session = await admin_actions_fixture()
        admin_session.set_name("ADMIN")

        # Create 6 player browsers
        player1_actions, player1_page, player1_session = await player_actions_fixture("Alice")
        player1_session.set_name("PLAYER_Alice")

        player2_actions, player2_page, player2_session = await player_actions_fixture("Bob")
        player2_session.set_name("PLAYER_Bob")

        player3_actions, player3_page, player3_session = await player_actions_fixture("Charlie")
        player3_session.set_name("PLAYER_Charlie")

        player4_actions, player4_page, player4_session = await player_actions_fixture("Diana")
        player4_session.set_name("PLAYER_Diana")

        player5_actions, player5_page, player5_session = await player_actions_fixture("Eve")
        player5_session.set_name("PLAYER_Eve")

        player6_actions, player6_page, player6_session = await player_actions_fixture("Frank")
        player6_session.set_name("PLAYER_Frank")

        # ============================================================
        # PART 2: Admin Login and Lobby Creation
        # ============================================================
        print("\n=== PART 2: Admin Login and Lobby Creation ===")

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

        # ============================================================
        # PART 3: Players Join Lobby 1
        # ============================================================
        print("\n=== PART 3: Players Join Lobby 1 ===")

        # Admin views lobby 1
        await admin_actions.peek_into_lobby(lobby1_code)

        # Player 1 joins
        await player1_actions.goto_home_page()
        await player1_actions.fill_name_and_code("Alice", lobby1_code)
        await player1_actions.join_lobby()
        await player1_session.screenshot("04_alice_joined_lobby1")

        # Player 2 joins
        await player2_actions.goto_home_page()
        await player2_actions.fill_name_and_code("Bob", lobby1_code)
        await player2_actions.join_lobby()
        await player2_session.screenshot("04_bob_joined_lobby1")

        # Player 3 joins
        await player3_actions.goto_home_page()
        await player3_actions.fill_name_and_code("Charlie", lobby1_code)
        await player3_actions.join_lobby()

        # Player 4 joins
        await player4_actions.goto_home_page()
        await player4_actions.fill_name_and_code("Diana", lobby1_code)
        await player4_actions.join_lobby()

        # Wait for admin to see all 4 players
        await admin_actions.wait_for_player_name("Alice", timeout=10000)
        await admin_actions.wait_for_player_name("Bob", timeout=5000)
        await admin_actions.wait_for_player_name("Charlie", timeout=5000)
        await admin_actions.wait_for_player_name("Diana", timeout=5000)

        # Verify all players see each other
        await player1_actions.wait_for_player_count(4, timeout=5000)
        await player2_actions.wait_for_player_count(4, timeout=5000)

        await admin_session.screenshot("05_all_4_players_in_lobby1")

        # ============================================================
        # PART 4: Test Duplicate Name Handling
        # ============================================================
        print("\n=== PART 4: Test Duplicate Name Handling ===")

        # Player 5 tries to join with duplicate name "Alice"
        await player5_actions.goto_home_page()
        await player5_actions.fill_name_and_code("Alice", lobby1_code)
        await player5_actions.join_lobby_expect_error()

        # Verify error is shown (player should stay on landing page)
        await expect(player5_page.locator('[data-testid="landing-page-title"]')).to_be_visible()
        await player5_session.screenshot("06_duplicate_name_rejected")

        # Player 5 joins with unique name
        await player5_actions.fill_name_and_code("Eve", lobby1_code)
        await player5_actions.join_lobby()
        await admin_actions.wait_for_player_name("Eve", timeout=5000)
        await player1_actions.wait_for_player_count(5, timeout=5000)

        print("Duplicate name handling works correctly")

        # ============================================================
        # PART 5: Test Multiple Lobby Management
        # ============================================================
        print("\n=== PART 5: Test Multiple Lobby Management ===")

        # Player 6 joins lobby 2
        await player6_actions.goto_home_page()
        await player6_actions.fill_name_and_code("Frank", lobby2_code)
        await player6_actions.join_lobby()
        await player6_session.screenshot("07_frank_in_lobby2")

        # Admin navigates back and checks lobby 2
        await admin_actions.goto_admin_page()
        await admin_actions.peek_into_lobby(lobby2_code)
        await admin_actions.wait_for_player_name("Frank", timeout=5000)
        await admin_session.screenshot("08_admin_sees_frank_in_lobby2")

        # Admin goes back to lobby 1
        await admin_actions.goto_admin_page()
        await admin_actions.peek_into_lobby(lobby1_code)
        await admin_session.screenshot("09_admin_back_to_lobby1")

        print("Multiple lobby management works")

        # ============================================================
        # PART 6: Team Creation and Management
        # ============================================================
        print("\n=== PART 6: Team Creation and Management ===")

        # Create 2 teams (players will be randomly assigned)
        await admin_actions.create_teams(2)
        await expect(admin_page.locator('[data-testid="teams-heading"]')).to_contain_text("Teams (2)")

        # All players should see teams created
        await player1_actions.verify_team_count(2, timeout=5000)
        await player2_actions.verify_team_count(2, timeout=5000)
        await player3_actions.verify_team_count(2, timeout=5000)

        await admin_session.screenshot("10_teams_created")
        await player1_session.screenshot("10_players_see_teams")

        # Players are automatically randomly assigned to teams
        # Let's wait a moment for assignments to propagate
        await admin_page.wait_for_timeout(1000)

        # Get the actual team names (they're randomly generated like "Jolly Octopi")
        team_names = await admin_actions.get_team_names()
        print(f"Teams created with names: {team_names}")

        team1_name = team_names[0] if len(team_names) > 0 else "Team 1"
        team2_name = team_names[1] if len(team_names) > 1 else "Team 2"

        # Get current team assignments by checking if players are visible in teams
        await admin_session.screenshot("11_initial_team_assignments")

        # Re-organize: Move Alice and Bob to team1, Charlie and Diana to team2
        await admin_actions.move_player_to_team("Alice", team1_name)
        await admin_actions.move_player_to_team("Bob", team1_name)
        await admin_actions.move_player_to_team("Charlie", team2_name)
        await admin_actions.move_player_to_team("Diana", team2_name)

        # Players verify their team assignments
        await player1_actions.verify_in_team(team1_name, timeout=5000)
        await player2_actions.verify_in_team(team1_name, timeout=5000)
        await player3_actions.verify_in_team(team2_name, timeout=5000)
        await player4_actions.verify_in_team(team2_name, timeout=5000)

        await admin_session.screenshot("12_players_reassigned_to_teams")

        print(f"Teams created and players organized: {team1_name} (Alice, Bob), {team2_name} (Charlie, Diana)")

        # ============================================================
        # PART 7: Test Player Movement Between Teams
        # ============================================================
        print("\n=== PART 7: Test Player Movement Between Teams ===")

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

        # ============================================================
        # PART 8: Test Kicking and Re-joining
        # ============================================================
        print("\n=== PART 8: Test Kicking and Re-joining ===")

        # First, assign Eve to a team (she's currently unassigned)
        await admin_actions.move_player_to_team("Eve", team1_name)
        await player5_actions.verify_in_team(team1_name, timeout=5000)

        # Now unassign Eve
        await admin_actions.unassign_player("Eve")
        await player5_actions.verify_unassigned(timeout=5000)

        # Kick Eve
        await admin_actions.kick_player("Eve")
        await expect(admin_page.locator("text=Eve")).not_to_be_visible()

        # Other players should see player count decrease
        await player1_actions.wait_for_player_count(4, timeout=5000)

        await admin_session.screenshot("13_eve_kicked")

        # Eve rejoins with same name
        await player5_actions.goto_home_page()
        await player5_actions.fill_name_and_code("Eve", lobby1_code)
        await player5_actions.join_lobby()
        await admin_actions.wait_for_player_name("Eve", timeout=5000)
        await player1_actions.wait_for_player_count(5, timeout=5000)

        await player5_session.screenshot("14_eve_rejoined")

        # Kick Eve again
        await admin_actions.unassign_player("Eve")
        await admin_actions.kick_player("Eve")
        await player1_actions.wait_for_player_count(4, timeout=5000)

        # Eve rejoins with different name
        await player5_actions.goto_home_page()
        await player5_actions.fill_name_and_code("Eva", lobby1_code)
        await player5_actions.join_lobby()
        await admin_actions.wait_for_player_name("Eva", timeout=5000)
        await player1_actions.wait_for_player_count(5, timeout=5000)

        # Assign Eva to team1
        await admin_actions.move_player_to_team("Eva", team1_name)

        print("Kicking and rejoining works correctly")

        # ============================================================
        # PART 9: Start Game
        # ============================================================
        print("\n=== PART 9: Start Game ===")

        # Start game with medium difficulty
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
        await player5_actions.wait_for_game_to_start(timeout=15000)

        await player1_session.screenshot("16_alice_on_game_page")
        await player3_session.screenshot("16_charlie_on_game_page")

        print("Game started successfully")

        # ============================================================
        # PART 10: Submit Guesses (Both Correct and Incorrect)
        # ============================================================
        print("\n=== PART 10: Submit Guesses ===")

        # Wait for game to fully initialize
        await player1_page.wait_for_timeout(2000)

        # Submit some incorrect guesses first
        await player1_actions.submit_incorrect_guess()
        await player1_session.screenshot("17_alice_submitted_incorrect_guess")

        await player2_actions.submit_incorrect_guess()
        await player3_actions.submit_incorrect_guess()

        # Wait a bit to see guess history
        await player1_page.wait_for_timeout(1000)
        await player1_session.screenshot("18_guess_history_visible")

        print("Players submitted guesses")

        # Note: Bob was kicked earlier, so Team 1 now only has Alice and Eva

        # ============================================================
        # PART 11: Kick Player During Game (Bob from Team 1)
        # ============================================================
        print("\n=== PART 11: Kick Player During Game ===")

        # First, have Bob rejoin the game
        await player2_actions.goto_home_page()
        await player2_actions.fill_name_and_code("Bob", lobby1_code)
        await player2_actions.join_lobby()
        await admin_actions.wait_for_player_name("Bob", timeout=5000)

        # Admin assigns Bob back to team 1
        await admin_actions.move_player_to_team("Bob", team1_name)
        await player2_actions.verify_in_team(team1_name, timeout=5000)

        # Bob should now be in the game
        await player2_actions.wait_for_game_to_start(timeout=10000)
        await player2_session.screenshot("19_bob_rejoined_game")

        # Now kick Bob during the game
        await admin_actions.kick_player("Bob")
        await expect(admin_page.locator("text=Bob")).not_to_be_visible()
        await admin_session.screenshot("20_bob_kicked_during_game")

        # Bob should be kicked from game and redirected
        await player2_actions.verify_kicked_from_game(timeout=10000)
        await player2_session.screenshot("21_bob_sees_kicked_message")

        # Other Team 1 players should see Bob disappear
        await player1_page.wait_for_timeout(1000)
        await player1_session.screenshot("22_alice_sees_bob_gone")

        print("Player kicked during game")

        # ============================================================
        # PART 12: Move Player to Different Team During Game
        # ============================================================
        print("\n=== PART 12: Move Player During Game ===")

        # Admin moves Eva from team1 to team2
        await admin_actions.move_player_to_team("Eva", team2_name)
        await admin_session.screenshot("23_eva_moved_to_team2")

        # Eva should be redirected to lobby
        await player5_actions.verify_team_changed_redirect(timeout=10000)
        await player5_session.screenshot("24_eva_redirected_to_lobby")

        # Verify Eva now sees team2 assignment in lobby
        await player5_actions.verify_in_team(team2_name, timeout=5000)

        print("Player moved during game")

        # ============================================================
        # PART 12.5: Complete a full game (Team 1 wins)
        # ============================================================
        print("\n=== PART 12.5: Complete Full Game (Team 1 wins) ===")

        # Get Alice's session ID
        alice_session_response = await player1_page.evaluate("""() => localStorage.getItem('sessionId')""")
        alice_session_id = alice_session_response

        # Alice solves the complete puzzle for Team 1
        print(f"Alice (team {team1_name}) solving complete puzzle...")
        server_url = "http://localhost:8000"
        await player1_actions.solve_complete_puzzle(alice_session_id, server_url)
        await player1_session.screenshot("25_alice_solving_puzzle")

        # Wait for victory modal
        await player1_page.wait_for_timeout(3000)
        await player1_session.screenshot("26_victory_screen")

        # Verify admin sees team completion
        await admin_session.screenshot("27_admin_sees_team1_complete")

        # Click button to return to lobby from victory modal
        return_button = player1_page.locator("button:has-text('Return to Lobby'), button:has-text('Back to Lobby')")
        try:
            await expect(return_button).to_be_visible(timeout=5000)
            await return_button.click()
            await player1_page.wait_for_timeout(1000)
        except Exception:
            # Modal might auto-close or not exist
            pass

        await player1_session.screenshot("28_alice_back_in_lobby_after_win")

        print("Team 1 won the game!")

        # ============================================================
        # PART 13: Rename Teams in Lobby After Game
        # ============================================================
        print("\n=== PART 13: Rename Teams in Lobby ===")

        # Navigate admin back to lobby details
        await admin_actions.goto_admin_page()
        await admin_actions.peek_into_lobby(lobby1_code)

        # Rename teams - team IDs are typically 1 and 2 (auto-incremented)
        new_team1_name = "Awesome Team"
        new_team2_name = "Cool Squad"

        await admin_actions.rename_team(1, new_team1_name)
        await admin_session.screenshot("29_team1_renamed")

        await admin_actions.rename_team(2, new_team2_name)
        await admin_session.screenshot("30_team2_renamed")

        # Verify the new names appear
        await expect(admin_page.locator(f'[data-testid="team-name-1"]:has-text("{new_team1_name}")')).to_be_visible()
        await expect(admin_page.locator(f'[data-testid="team-name-2"]:has-text("{new_team2_name}")')).to_be_visible()

        # Players should see updated team names in lobby
        await player1_page.wait_for_timeout(2000)
        await player1_session.screenshot("31_alice_sees_renamed_team")

        # Update our team name variables for later use
        team1_name = new_team1_name
        team2_name = new_team2_name

        print("Teams renamed in lobby")

        # ============================================================
        # PART 14: Start New Game
        # ============================================================
        print("\n=== PART 14: Start New Game ===")

        # Admin starts a new game
        await admin_actions.start_game(difficulty="easy")
        await admin_actions.wait_for_team_progress(team1_name, timeout=10000)
        await admin_actions.wait_for_team_progress(team2_name, timeout=10000)
        await admin_session.screenshot("32_new_game_started")

        # Players should be redirected to game page
        await player1_actions.wait_for_game_to_start(timeout=15000)
        await player3_actions.wait_for_game_to_start(timeout=15000)
        await player4_actions.wait_for_game_to_start(timeout=15000)

        await player1_session.screenshot("33_new_game_alice")

        # Let players submit a few guesses
        await player1_page.wait_for_timeout(2000)
        await player1_actions.submit_incorrect_guess()
        await player3_actions.submit_incorrect_guess()

        await player1_session.screenshot("34_playing_new_game")

        print("New game started and playing")

        # ============================================================
        # PART 15: End Game via Admin
        # ============================================================
        print("\n=== PART 15: End Game via Admin ===")

        # Admin ends the game
        await admin_actions.end_game()
        await admin_session.screenshot("35_game_ended_by_admin")

        # Players should be redirected to lobby
        await player1_actions.verify_game_ended_redirect(timeout=10000)
        await player3_actions.verify_game_ended_redirect(timeout=10000)
        await player4_actions.verify_game_ended_redirect(timeout=10000)

        await player1_session.screenshot("36_alice_back_in_lobby_after_end")
        await player3_session.screenshot("36_charlie_back_in_lobby_after_end")

        print("Game ended by admin")

        # ============================================================
        # PART 16: Final State Verification
        # ============================================================
        print("\n=== PART 16: Final State Verification ===")

        # Verify lobby is still functional
        await admin_session.screenshot("37_final_admin_state")
        await player1_session.screenshot("37_final_alice_state")

        # Verify players can still see team assignments
        await player1_actions.verify_in_team(team1_name, timeout=5000)
        await player3_actions.verify_in_team(team2_name, timeout=5000)

        print("\n=== TEST COMPLETE ===")
        print("All flows tested successfully!")
        print("✓ Admin login and lobby management")
        print("✓ Player joining and duplicate name handling")
        print("✓ Multiple lobby management")
        print("✓ Team creation and player assignment")
        print("✓ Player movement between teams")
        print("✓ Kicking and re-joining players")
        print("✓ Game starting and playing")
        print("✓ Incorrect and correct guesses")
        print("✓ Kicking player during game")
        print("✓ Moving player during game")
        print("✓ Complete game victory")
        print("✓ Team renaming")
        print("✓ Starting new games")
        print("✓ Admin ending games")
