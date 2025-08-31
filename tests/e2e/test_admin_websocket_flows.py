from typing import Awaitable, Callable

from playwright.async_api import Page, expect

from backend.settings import Settings
from tests.e2e.fixtures.browsers import BrowserSession
from tests.e2e.utilities.admin_actions import AdminActions
from tests.e2e.utilities.player_actions import PlayerActions

type AdminFixture = Callable[[], Awaitable[tuple[AdminActions, Page, BrowserSession]]]
type PlayerFixture = Callable[
    [str], Awaitable[tuple[PlayerActions, Page, BrowserSession]]
]


class TestAdminWebSocketFlows:
    async def test_admin_sees_player_join_updates(
        self,
        player_actions_fixture: PlayerFixture,
        admin_actions_fixture: AdminFixture,
        settings: Settings,
    ):
        admin_actions, admin_page, admin_session = await admin_actions_fixture()
        admin_session.set_name("test_admin_player_join_ADMIN")
        player_actions, player_page, player_session = await player_actions_fixture(
            "Join Notify Player"
        )
        player_session.set_name("test_admin_player_join_PLAYER")

        await admin_actions.goto_admin_page()
        await admin_actions.login(settings.ADMIN_PASSWORD)
        lobby_code = await admin_actions.create_lobby("Join Notification Test")

        await expect(admin_page.locator(f"text=Code: {lobby_code}")).to_be_visible()

        await admin_actions.peek_into_lobby(lobby_code)

        await player_actions.goto_home_page()
        await player_actions.fill_name_and_code("Join Notify Player", lobby_code)
        await player_actions.join_lobby()
        await expect(player_page.locator("p:has-text('Lobby Code:')")).to_be_visible()

        await admin_actions.wait_for_players(1, 1000)

        await expect(admin_page.locator("text=Players (1)")).to_be_visible()
        await expect(admin_page.locator("text=Join Notify Player")).to_be_visible()

        await admin_session.screenshot()

    async def test_admin_sees_multiple_players_join(
        self,
        player_actions_fixture: PlayerFixture,
        admin_actions_fixture: AdminFixture,
        settings: Settings,
    ):
        admin_actions, admin_page, admin_session = await admin_actions_fixture()
        admin_session.set_name("test_admin_multiple_joins_ADMIN")

        player1_actions, player1_page, player1_session = await player_actions_fixture(
            "Multi Join One"
        )
        player1_session.set_name("test_admin_multiple_joins_PLAYER1")

        player2_actions, player2_page, player2_session = await player_actions_fixture(
            "Multi Join Two"
        )
        player2_session.set_name("test_admin_multiple_joins_PLAYER2")

        await admin_actions.goto_admin_page()
        await admin_actions.login(settings.ADMIN_PASSWORD)
        lobby_code = await admin_actions.create_lobby("Multi Join Test")

        # Admin must peek into lobby first to subscribe to WebSocket updates
        await admin_actions.peek_into_lobby(lobby_code)

        await player1_actions.goto_home_page()
        await player1_actions.fill_name_and_code("Multi Join One", lobby_code)
        await player1_actions.join_lobby()

        # Wait for first player to appear via WebSocket
        await admin_actions.wait_for_players(1, 5000)

        await player2_actions.goto_home_page()
        await player2_actions.fill_name_and_code("Multi Join Two", lobby_code)
        await player2_actions.join_lobby()

        # Wait for second player to appear via WebSocket
        await admin_actions.wait_for_players(2, 5000)
        await expect(admin_page.locator("text=Multi Join One")).to_be_visible()
        await expect(admin_page.locator("text=Multi Join Two")).to_be_visible()

        await admin_session.screenshot()

    async def test_admin_sees_player_leave_updates(
        self,
        player_actions_fixture: PlayerFixture,
        admin_actions_fixture: AdminFixture,
        settings: Settings,
    ):
        admin_actions, admin_page, admin_session = await admin_actions_fixture()
        admin_session.set_name("test_admin_player_leave_ADMIN")
        player_actions, player_page, player_session = await player_actions_fixture(
            "Leave Notify Player"
        )
        player_session.set_name("test_admin_player_leave_PLAYER")

        await admin_actions.goto_admin_page()
        await admin_actions.login(settings.ADMIN_PASSWORD)
        lobby_code = await admin_actions.create_lobby("Leave Notification Test")

        # Admin must peek into lobby first to subscribe to WebSocket updates
        await admin_actions.peek_into_lobby(lobby_code)

        await player_actions.goto_home_page()
        await player_actions.fill_name_and_code("Leave Notify Player", lobby_code)
        await player_actions.join_lobby()

        # Wait for player to appear via WebSocket
        await admin_actions.wait_for_players(1, 5000)
        await expect(admin_page.locator("text=Leave Notify Player")).to_be_visible()

        # Keep lobby details open to receive leave notifications via WebSocket
        await player_actions.leave_lobby()
        await expect(player_page.locator("h1:has-text('Raddle Teams')")).to_be_visible()

        # Wait for player to disappear via WebSocket - check for "No players" text
        await expect(
            admin_page.locator("text=No players in this lobby yet")
        ).to_be_visible(timeout=5000)

        await admin_session.screenshot()

    async def test_admin_lobby_management_with_active_players(
        self,
        player_actions_fixture: PlayerFixture,
        admin_actions_fixture: AdminFixture,
        settings: Settings,
    ):
        admin_actions, admin_page, admin_session = await admin_actions_fixture()
        admin_session.set_name("test_admin_management_ADMIN")

        player1_actions, player1_page, player1_session = await player_actions_fixture(
            "Active Player One"
        )
        player1_session.set_name("test_admin_management_PLAYER1")

        player2_actions, player2_page, player2_session = await player_actions_fixture(
            "Active Player Two"
        )
        player2_session.set_name("test_admin_management_PLAYER2")

        await admin_actions.goto_admin_page()
        await admin_actions.login(settings.ADMIN_PASSWORD)
        lobby1_code = await admin_actions.create_lobby("Active Lobby 1")
        lobby2_code = await admin_actions.create_lobby("Active Lobby 2")

        # Admin must peek into lobby1 first to subscribe to WebSocket updates
        await admin_actions.peek_into_lobby(lobby1_code)

        await player1_actions.goto_home_page()
        await player1_actions.fill_name_and_code("Active Player One", lobby1_code)
        await player1_actions.join_lobby()

        # Wait for first player to appear via WebSocket
        await admin_actions.wait_for_players(1, 5000)

        await player2_actions.goto_home_page()
        await player2_actions.fill_name_and_code("Active Player Two", lobby1_code)
        await player2_actions.join_lobby()

        # Wait for second player to appear via WebSocket
        await admin_actions.wait_for_players(2, 5000)

        await expect(admin_page.locator("text=Active Player One")).to_be_visible()
        await expect(admin_page.locator("text=Active Player Two")).to_be_visible()

        close_button = admin_page.locator("button:has-text('✕ Close')")
        await close_button.click()

        # Test that lobby2 exists but might be empty since both players joined lobby1
        await admin_actions.peek_into_lobby(lobby2_code)
        # Just verify the lobby details open, don't check player count since it may be 0

        await close_button.click()
        lobby3_code = await admin_actions.create_lobby("Empty Lobby")
        await admin_actions.delete_lobby(lobby3_code)

        await admin_session.screenshot()
        await player1_session.screenshot()
        await player2_session.screenshot()
