from typing import Awaitable, Callable

from playwright.async_api import Page, expect

from backend.settings import Settings
from tests.e2e.fixtures.browsers import BrowserSession
from tests.e2e.utilities.admin_actions import AdminActions
from tests.e2e.utilities.player_actions import PlayerActions

type AdminFixture = Callable[[], Awaitable[tuple[AdminActions, Page, BrowserSession]]]
type PlayerFixture = Callable[[], Awaitable[tuple[PlayerActions, Page, BrowserSession]]]


class TestAdvancedPlayerFlows:
    async def test_player_rejoin_after_leaving(
        self,
        player_actions_fixture: PlayerFixture,
        admin_actions_fixture: AdminFixture,
        settings: Settings,
    ):
        admin_actions, admin_page, admin_session = await admin_actions_fixture()
        admin_session.set_name("test_player_rejoin_ADMIN")
        player_actions, player_page, player_session = await player_actions_fixture(
            "Rejoin Player"
        )
        player_session.set_name("test_player_rejoin_PLAYER")

        await admin_actions.goto_admin_page()
        await admin_actions.login(settings.ADMIN_PASSWORD)
        lobby_code = await admin_actions.create_lobby("Rejoin Test Lobby")

        await player_actions.goto_home_page()
        await player_actions.fill_name_and_code("Rejoin Player", lobby_code)
        await player_actions.join_lobby()
        await expect(player_page.locator("p:has-text('Lobby Code:')")).to_be_visible()

        await player_actions.leave_lobby()
        await expect(player_page.locator("h1:has-text('Raddle Teams')")).to_be_visible()

        # Wait a moment to ensure the leave operation completes

        # Clear any potential localStorage issues
        await player_page.evaluate("() => localStorage.clear()")

        # Navigate to home page explicitly to ensure clean state
        await player_actions.goto_home_page()

        # Try to rejoin with the same name
        await player_actions.fill_name_and_code("Rejoin Player", lobby_code)
        try:
            await player_actions.join_lobby()
        except AssertionError as e:
            # Debug: Take a screenshot to see what's happening
            await player_session.screenshot()
            # Check if there's an error message on the page
            error_text = await player_page.text_content("body")
            print(f"Rejoin failed. Page content: {error_text[:500]}")
            raise e
        await expect(player_page.locator("p:has-text('Lobby Code:')")).to_be_visible()
        await expect(
            player_page.locator(
                f"span.font-mono.text-lg.font-bold:has-text('{lobby_code}')"
            )
        ).to_be_visible()
        await expect(
            player_page.locator("p:has-text('Welcome, Rejoin Player!')")
        ).to_be_visible()

        await player_session.screenshot()

    async def test_player_reconnection_after_page_refresh(
        self,
        player_actions_fixture: PlayerFixture,
        admin_actions_fixture: AdminFixture,
        settings: Settings,
    ):
        admin_actions, admin_page, admin_session = await admin_actions_fixture()
        admin_session.set_name("test_player_reconnection_ADMIN")
        player_actions, player_page, player_session = await player_actions_fixture(
            "Reconnect Player"
        )
        player_session.set_name("test_player_reconnection_PLAYER")

        await admin_actions.goto_admin_page()
        await admin_actions.login(settings.ADMIN_PASSWORD)
        lobby_code = await admin_actions.create_lobby("Reconnection Test Lobby")

        await player_actions.goto_home_page()
        await player_actions.fill_name_and_code("Reconnect Player", lobby_code)
        await player_actions.join_lobby()
        await expect(player_page.locator("p:has-text('Lobby Code:')")).to_be_visible()

        await player_page.reload(wait_until="networkidle")

        await expect(player_page.locator("p:has-text('Lobby Code:')")).to_be_visible(
            timeout=5000
        )
        await expect(
            player_page.locator(
                f"span.font-mono.text-lg.font-bold:has-text('{lobby_code}')"
            )
        ).to_be_visible()
        await expect(
            player_page.locator("p:has-text('Welcome, Reconnect Player!')")
        ).to_be_visible()

        await player_session.screenshot()

    async def test_multiple_players_realtime_updates(
        self,
        player_actions_fixture: PlayerFixture,
        admin_actions_fixture: AdminFixture,
        settings: Settings,
    ):
        admin_actions, admin_page, admin_session = await admin_actions_fixture()
        admin_session.set_name("test_realtime_updates_ADMIN")

        player1_actions, player1_page, player1_session = await player_actions_fixture(
            "Player One"
        )
        player1_session.set_name("test_realtime_updates_PLAYER1")

        player2_actions, player2_page, player2_session = await player_actions_fixture(
            "Player Two"
        )
        player2_session.set_name("test_realtime_updates_PLAYER2")

        await admin_actions.goto_admin_page()
        await admin_actions.login(settings.ADMIN_PASSWORD)
        lobby_code = await admin_actions.create_lobby("Realtime Test Lobby")

        await player1_actions.goto_home_page()
        await player1_actions.fill_name_and_code("Player One", lobby_code)
        await player1_actions.join_lobby()
        await player1_actions.wait_for_player_count(1)

        await player2_actions.goto_home_page()
        await player2_actions.fill_name_and_code("Player Two", lobby_code)
        await player2_actions.join_lobby()

        # Wait for WebSocket updates to show both players
        await player1_actions.wait_for_player_count(2, timeout=8000)
        await player2_actions.wait_for_player_count(2, timeout=3000)

        await expect(player1_page.locator("text=Player Two")).to_be_visible()
        await expect(player2_page.locator("text=Player One")).to_be_visible()

        await player1_session.screenshot()
        await player2_session.screenshot()

    async def test_concurrent_player_joins(
        self,
        player_actions_fixture: PlayerFixture,
        admin_actions_fixture: AdminFixture,
        settings: Settings,
    ):
        admin_actions, admin_page, admin_session = await admin_actions_fixture()
        admin_session.set_name("test_concurrent_joins_ADMIN")

        player1_actions, player1_page, player1_session = await player_actions_fixture(
            "Concurrent One"
        )
        player1_session.set_name("test_concurrent_joins_PLAYER1")

        player2_actions, player2_page, player2_session = await player_actions_fixture(
            "Concurrent Two"
        )
        player2_session.set_name("test_concurrent_joins_PLAYER2")

        player3_actions, player3_page, player3_session = await player_actions_fixture(
            "Concurrent Three"
        )
        player3_session.set_name("test_concurrent_joins_PLAYER3")

        await admin_actions.goto_admin_page()
        await admin_actions.login(settings.ADMIN_PASSWORD)
        lobby_code = await admin_actions.create_lobby("Concurrent Test Lobby")

        await player1_actions.goto_home_page()
        await player1_actions.fill_name_and_code("Concurrent One", lobby_code)

        await player2_actions.goto_home_page()
        await player2_actions.fill_name_and_code("Concurrent Two", lobby_code)

        await player3_actions.goto_home_page()
        await player3_actions.fill_name_and_code("Concurrent Three", lobby_code)

        await player1_actions.join_lobby()
        await player2_actions.join_lobby()
        await player3_actions.join_lobby()

        # Wait for WebSocket updates to show all three players
        await player1_actions.wait_for_player_count(3, timeout=15000)
        await player2_actions.wait_for_player_count(3, timeout=10000)
        await player3_actions.wait_for_player_count(3, timeout=8000)

        for player_page in [player1_page, player2_page, player3_page]:
            await expect(
                player_page.locator("span:has-text('Concurrent One')").nth(0)
            ).to_be_visible()
            await expect(
                player_page.locator("span:has-text('Concurrent Two')").nth(0)
            ).to_be_visible()
            await expect(
                player_page.locator("span:has-text('Concurrent Three')").nth(0)
            ).to_be_visible()

        await player1_session.screenshot()
        await player2_session.screenshot()
        await player3_session.screenshot()

    async def test_player_leave_realtime_updates(
        self,
        player_actions_fixture: PlayerFixture,
        admin_actions_fixture: AdminFixture,
        settings: Settings,
    ):
        admin_actions, admin_page, admin_session = await admin_actions_fixture()
        admin_session.set_name("test_leave_updates_ADMIN")

        player1_actions, player1_page, player1_session = await player_actions_fixture(
            "Staying Player"
        )
        player1_session.set_name("test_leave_updates_PLAYER1")

        player2_actions, player2_page, player2_session = await player_actions_fixture(
            "Leaving Player"
        )
        player2_session.set_name("test_leave_updates_PLAYER2")

        await admin_actions.goto_admin_page()
        await admin_actions.login(settings.ADMIN_PASSWORD)
        lobby_code = await admin_actions.create_lobby("Leave Updates Test")

        await player1_actions.goto_home_page()
        await player1_actions.fill_name_and_code("Staying Player", lobby_code)
        await player1_actions.join_lobby()

        await player2_actions.goto_home_page()
        await player2_actions.fill_name_and_code("Leaving Player", lobby_code)
        await player2_actions.join_lobby()

        # Wait for WebSocket updates to show both players joined
        await player1_actions.wait_for_player_count(2, timeout=8000)
        await player2_actions.wait_for_player_count(2, timeout=3000)

        # Now test leaving
        await player2_actions.leave_lobby()

        # Wait for WebSocket updates to show player left
        await player1_actions.wait_for_player_count(1, timeout=8000)
        await expect(player1_page.locator("text=Leaving Player")).not_to_be_visible()

        await player1_session.screenshot()
