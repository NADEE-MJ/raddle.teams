"""
E2E tests for tournament feature - multi-round gameplay with points and leaderboard.
"""

from typing import Awaitable, Callable

import pytest
from playwright.async_api import Page, expect

from backend.settings import Settings
from e2e.fixtures.browsers import BrowserSession
from e2e.utilities.admin_actions import AdminActions
from e2e.utilities.player_actions import PlayerActions
from e2e.utilities.test_setup import setup_admin_with_lobby, setup_player, setup_teams_and_assign_players

type AdminFixture = Callable[[], Awaitable[tuple[AdminActions, Page, BrowserSession]]]
type PlayerFixture = Callable[[str], Awaitable[tuple[PlayerActions, Page, BrowserSession]]]


@pytest.mark.e2e
class TestTournamentFlow:
    """E2E tests for tournament features."""

    async def test_tournament_single_round_placement_tracking(
        self,
        admin_actions_fixture: AdminFixture,
        player_actions_fixture: PlayerFixture,
        settings: Settings,
    ):
        """Test complete single round tournament with placement tracking."""
        test_name = "TOURNAMENT_SINGLE"

        # Setup admin with lobby
        admin_actions, admin_page, admin_session, lobby_code = await setup_admin_with_lobby(
            admin_actions_fixture, settings, test_name
        )

        # Create 3 players
        player1_actions, player1_page, player1_session = await setup_player(
            player_actions_fixture, test_name, "Player1", lobby_code
        )
        player2_actions, player2_page, player2_session = await setup_player(
            player_actions_fixture, test_name, "Player2", lobby_code
        )
        player3_actions, player3_page, player3_session = await setup_player(
            player_actions_fixture, test_name, "Player3", lobby_code
        )

        # Admin creates 3 teams and assigns players
        await admin_actions.peek_into_lobby(lobby_code)
        await setup_teams_and_assign_players(admin_actions, admin_page, 3)

        # Start game with same puzzle
        await admin_actions.start_game(difficulty="easy", puzzle_mode="same")

        # Wait for all players to see game start
        await player1_actions.wait_for_game_to_start()
        await player2_actions.wait_for_game_to_start()
        await player3_actions.wait_for_game_to_start()

        # Player 1 finishes first
        await player1_actions.complete_puzzle_fast()

        # Verify placement notification appears on other players' screens
        await expect(player2_page.locator("text=/1st place/i")).to_be_visible(timeout=5000)
        await expect(player3_page.locator("text=/1st place/i")).to_be_visible(timeout=5000)

        # Player 2 finishes second
        await player2_actions.complete_puzzle_fast()

        # Verify 2nd place notification
        await expect(player1_page.locator("text=/2nd place/i")).to_be_visible(timeout=5000)
        await expect(player3_page.locator("text=/2nd place/i")).to_be_visible(timeout=5000)

        # Player 3 finishes third
        await player3_actions.complete_puzzle_fast()

        # Verify 3rd place notification
        await expect(player1_page.locator("text=/3rd place/i")).to_be_visible(timeout=5000)
        await expect(player2_page.locator("text=/3rd place/i")).to_be_visible(timeout=5000)

        # Admin ends game
        await admin_actions.end_current_game()

        # Verify players return to lobby
        await player1_actions.wait_for_lobby_page()
        await player2_actions.wait_for_lobby_page()
        await player3_actions.wait_for_lobby_page()

        # Verify leaderboard shows correct points (3, 2, 1 for reverse placement)
        await expect(player1_page.locator("text=/3 pts/i")).to_be_visible(timeout=5000)
        await expect(player1_page.locator("text=/2 pts/i")).to_be_visible(timeout=5000)
        await expect(player1_page.locator("text=/1 pts/i")).to_be_visible(timeout=5000)

    async def test_tournament_multi_round_leaderboard(
        self,
        admin_actions_fixture: AdminFixture,
        player_actions_fixture: PlayerFixture,
        settings: Settings,
    ):
        """Test multi-round tournament with cumulative leaderboard."""
        test_name = "TOURNAMENT_MULTI"

        # Setup admin with lobby
        admin_actions, admin_page, admin_session, lobby_code = await setup_admin_with_lobby(
            admin_actions_fixture, settings, test_name
        )

        # Setup 2 players
        player1_actions, player1_page, player1_session = await setup_player(
            player_actions_fixture, test_name, "PlayerA", lobby_code
        )
        player2_actions, player2_page, player2_session = await setup_player(
            player_actions_fixture, test_name, "PlayerB", lobby_code
        )

        # Admin creates 2 teams
        await admin_actions.peek_into_lobby(lobby_code)
        await setup_teams_and_assign_players(admin_actions, admin_page, 2)

        # Round 1: Player 1 wins
        await admin_actions.start_game(difficulty="easy", puzzle_mode="same")
        await player1_actions.wait_for_game_to_start()
        await player2_actions.wait_for_game_to_start()

        await player1_actions.complete_puzzle_fast()
        await player2_actions.complete_puzzle_fast()

        await admin_actions.end_current_game()

        # Verify Round 1 leaderboard
        await player1_actions.wait_for_lobby_page()
        await expect(player1_page.locator("text=/Round 1/i")).to_be_visible(timeout=5000)

        # Player 1 should have 2 points, Player 2 should have 1 point
        await expect(player1_page.locator("text=/2 pts/i")).to_be_visible(timeout=5000)
        await expect(player1_page.locator("text=/1 pts/i")).to_be_visible(timeout=5000)

        # Round 2: Player 2 wins
        await admin_actions.start_game(difficulty="easy", puzzle_mode="same")
        await player1_actions.wait_for_game_to_start()
        await player2_actions.wait_for_game_to_start()

        await player2_actions.complete_puzzle_fast()
        await player1_actions.complete_puzzle_fast()

        await admin_actions.end_current_game()

        # Verify Round 2 cumulative leaderboard
        await player1_actions.wait_for_lobby_page()
        await expect(player1_page.locator("text=/Round 2/i")).to_be_visible(timeout=5000)

        # Both teams should now have 3 points total (2+1 and 1+2)
        leaderboard_entries = player1_page.locator("text=/3 pts/i")
        await expect(leaderboard_entries).to_have_count(2, timeout=5000)

        # Verify placement breakdown shows 1-1-0-0 for both teams
        placement_entries = player1_page.locator("text=/1-1-0-0/i")
        await expect(placement_entries).to_have_count(2, timeout=5000)

    async def test_tournament_dnf_scoring(
        self,
        admin_actions_fixture: AdminFixture,
        player_actions_fixture: PlayerFixture,
        settings: Settings,
    ):
        """Test DNF (Did Not Finish) scoring when admin ends game early."""
        test_name = "TOURNAMENT_DNF"

        # Setup admin with lobby
        admin_actions, admin_page, admin_session, lobby_code = await setup_admin_with_lobby(
            admin_actions_fixture, settings, test_name
        )

        # Setup 3 players
        player1_actions, player1_page, player1_session = await setup_player(
            player_actions_fixture, test_name, "Player1", lobby_code
        )
        player2_actions, player2_page, player2_session = await setup_player(
            player_actions_fixture, test_name, "Player2", lobby_code
        )
        player3_actions, player3_page, player3_session = await setup_player(
            player_actions_fixture, test_name, "Player3", lobby_code
        )

        # Admin creates 3 teams
        await admin_actions.peek_into_lobby(lobby_code)
        await setup_teams_and_assign_players(admin_actions, admin_page, 3)

        # Start game
        await admin_actions.start_game(difficulty="easy", puzzle_mode="same")
        await player1_actions.wait_for_game_to_start()
        await player2_actions.wait_for_game_to_start()
        await player3_actions.wait_for_game_to_start()

        # Only player 1 finishes
        await player1_actions.complete_puzzle_fast()

        # Admin ends game before others finish
        await admin_actions.end_current_game()

        # Verify all players return to lobby
        await player1_actions.wait_for_lobby_page()
        await player2_actions.wait_for_lobby_page()
        await player3_actions.wait_for_lobby_page()

        # Verify leaderboard shows points for finished team and DNF teams
        # Player 1 should have full points (3), others get DNF scoring (scaled by completion)
        await expect(player1_page.locator("text=/3 pts/i")).to_be_visible(timeout=5000)

        # Verify placement breakdown shows DNF count
        dnf_entries = player1_page.locator("text=/0-0-0-1/i")
        await expect(dnf_entries).to_have_count(2, timeout=5000)  # Two DNF teams

    async def test_tournament_leaderboard_crown_display(
        self,
        admin_actions_fixture: AdminFixture,
        player_actions_fixture: PlayerFixture,
        settings: Settings,
    ):
        """Test that crown icon appears on last round winner in leaderboard."""
        test_name = "TOURNAMENT_CROWN"

        # Setup admin with lobby
        admin_actions, admin_page, admin_session, lobby_code = await setup_admin_with_lobby(
            admin_actions_fixture, settings, test_name
        )

        # Setup 2 players
        player1_actions, player1_page, player1_session = await setup_player(
            player_actions_fixture, test_name, "Winner", lobby_code
        )
        player2_actions, player2_page, player2_session = await setup_player(
            player_actions_fixture, test_name, "Second", lobby_code
        )

        # Admin creates 2 teams
        await admin_actions.peek_into_lobby(lobby_code)
        await setup_teams_and_assign_players(admin_actions, admin_page, 2)

        # Round 1: Player 1 wins
        await admin_actions.start_game(difficulty="easy", puzzle_mode="same")
        await player1_actions.wait_for_game_to_start()
        await player2_actions.wait_for_game_to_start()

        await player1_actions.complete_puzzle_fast()
        await player2_actions.complete_puzzle_fast()

        await admin_actions.end_current_game()

        # Verify crown appears next to player 1's team
        await player1_actions.wait_for_lobby_page()

        # Find the team with crown emoji
        await expect(player1_page.locator("text=👑")).to_be_visible(timeout=5000)

    async def test_tournament_continuous_play_after_first_finish(
        self,
        admin_actions_fixture: AdminFixture,
        player_actions_fixture: PlayerFixture,
        settings: Settings,
    ):
        """Test that puzzle doesn't auto-reveal when first team finishes (continuous play)."""
        test_name = "TOURNAMENT_CONTINUOUS"

        # Setup admin with lobby
        admin_actions, admin_page, admin_session, lobby_code = await setup_admin_with_lobby(
            admin_actions_fixture, settings, test_name
        )

        # Setup 2 players
        player1_actions, player1_page, player1_session = await setup_player(
            player_actions_fixture, test_name, "Fast", lobby_code
        )
        player2_actions, player2_page, player2_session = await setup_player(
            player_actions_fixture, test_name, "Slow", lobby_code
        )

        # Admin creates 2 teams
        await admin_actions.peek_into_lobby(lobby_code)
        await setup_teams_and_assign_players(admin_actions, admin_page, 2)

        # Start game
        await admin_actions.start_game(difficulty="easy", puzzle_mode="same")
        await player1_actions.wait_for_game_to_start()
        await player2_actions.wait_for_game_to_start()

        # Player 1 finishes first
        await player1_actions.complete_puzzle_fast()

        # Verify player 2 can still interact with puzzle (not auto-revealed)
        puzzle_input = player2_page.locator('input[type="text"]').first
        await expect(puzzle_input).to_be_enabled(timeout=3000)
        await expect(puzzle_input).to_be_editable(timeout=3000)

        # Player 2 can still make guesses
        await player2_actions.make_guess(0, "test")

        # Complete puzzle
        await player2_actions.complete_puzzle_fast()

        # Now admin can end the round
        await admin_actions.end_current_game()
