"""Test setup utilities for E2E tests."""

from typing import Awaitable, Callable

from playwright.async_api import Page, expect

from backend.settings import Settings
from e2e.fixtures.browsers import BrowserSession
from e2e.utilities.admin_actions import AdminActions
from e2e.utilities.player_actions import PlayerActions

type AdminFixture = Callable[[], Awaitable[tuple[AdminActions, Page, BrowserSession]]]
type PlayerFixture = Callable[[str], Awaitable[tuple[PlayerActions, Page, BrowserSession]]]


async def setup_admin_with_lobby(
    admin_actions_fixture: AdminFixture,
    settings: Settings,
    test_name: str,
    lobby_name: str = "Test Lobby 1",
) -> tuple[AdminActions, Page, BrowserSession, str]:
    """
    Create admin, login, and create a lobby.

    Args:
        admin_actions_fixture: Fixture that creates admin browser session
        settings: Application settings with admin credentials
        test_name: Name of the test (used for browser naming)
        lobby_name: Name for the lobby to create

    Returns:
        Tuple of (AdminActions, Page, BrowserSession, lobby_code)
    """
    admin_actions, admin_page, admin_session = await admin_actions_fixture()
    admin_session.set_name(f"{test_name}_ADMIN")

    await admin_actions.goto_admin_page()
    await admin_actions.login(settings.ADMIN_PASSWORD)
    lobby_code = await admin_actions.create_lobby(lobby_name)
    await expect(admin_page.locator(f"button:has-text('{lobby_code}')")).to_be_visible()

    return admin_actions, admin_page, admin_session, lobby_code


async def setup_player(
    player_actions_fixture: PlayerFixture,
    test_name: str,
    player_name: str,
    lobby_code: str = None,
    join_lobby: bool = True,
) -> tuple[PlayerActions, Page, BrowserSession]:
    """
    Create a player browser and optionally join a lobby.

    Args:
        player_actions_fixture: Fixture that creates player browser session
        test_name: Name of the test (used for browser naming)
        player_name: Name of the player
        lobby_code: Lobby code to join (required if join_lobby=True)
        join_lobby: Whether to automatically join the lobby

    Returns:
        Tuple of (PlayerActions, Page, BrowserSession)
    """
    player_actions, player_page, player_session = await player_actions_fixture(player_name)
    player_session.set_name(f"{test_name}_{player_name}")

    if join_lobby and lobby_code:
        await player_actions.goto_home_page()
        await player_actions.fill_name_and_code(player_name, lobby_code)
        await player_actions.join_lobby()

    return player_actions, player_page, player_session


async def setup_teams_and_assign_players(
    admin_actions: AdminActions,
    admin_page: Page,
    num_teams: int,
    player_assignments: dict[int, list[str]] = None,
) -> tuple[str, str]:
    """
    Create teams and optionally assign players.

    Args:
        admin_actions: Admin actions instance
        admin_page: Admin page instance
        num_teams: Number of teams to create
        player_assignments: Dict mapping team index to list of player names
                          Example: {0: ["Alice", "Bob"], 1: ["Charlie", "Diana"]}

    Returns:
        Tuple of (team1_name, team2_name)
    """
    await admin_actions.create_teams(num_teams)
    await expect(admin_page.locator('[data-testid="teams-heading"]')).to_contain_text(f"Teams ({num_teams})")

    # Wait for teams to be created
    await admin_page.wait_for_timeout(1000)

    # Get team names
    team_names = await admin_actions.get_team_names()
    team1_name = team_names[0] if len(team_names) > 0 else "Team 1"
    team2_name = team_names[1] if len(team_names) > 1 else "Team 2"

    # Assign players if provided
    if player_assignments:
        for team_idx, player_names in player_assignments.items():
            team_name = team_names[team_idx] if team_idx < len(team_names) else f"Team {team_idx + 1}"
            for player_name in player_names:
                await admin_actions.move_player_to_team(player_name, team_name)

    return team1_name, team2_name
