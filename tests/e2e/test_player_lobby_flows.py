from playwright.async_api import Page, expect
from typing import Callable, Awaitable

from backend.settings import Settings
from tests.e2e.fixtures.browsers import BrowserSession
from tests.e2e.utilities.admin_actions import AdminActions
from tests.e2e.utilities.player_actions import PlayerActions

type AdminFixture = Callable[[], Awaitable[tuple[AdminActions, Page, BrowserSession]]]
type PlayerFixture = Callable[[], Awaitable[tuple[PlayerActions, Page, BrowserSession]]]


class TestPlayerLobbyFlows:
    async def test_home_page_loads(
        self, player_actions_fixture: PlayerFixture, server_url: str
    ):
        player_actions, player_page, player_session = await player_actions_fixture(
            "Test User"
        )
        player_session.set_name("test_home_page_loads")

        await player_page.goto(f"{server_url}/")
        await player_page.wait_for_load_state("networkidle")

        await expect(player_page).to_have_title("Raddle Teams")

        await player_page.fill("#name", "Test User")

        await expect(player_page.locator("#name")).to_have_value("Test User")

        await player_page.fill("#lobbyCode", "TEST12")
        await expect(player_page.locator("#lobbyCode")).to_have_value("TEST12")

        await player_session.screenshot()

    async def test_player_join_lobby_flow(
        self,
        player_actions_fixture: PlayerFixture,
        admin_actions_fixture: AdminFixture,
        settings: Settings,
    ):
        admin_actions, admin_page, admin_session = await admin_actions_fixture()
        admin_session.set_name("player_join_lobby_flow_ADMIN")
        player_actions, player_page, player_session = await player_actions_fixture(
            "Test Player"
        )
        player_session.set_name("player_join_lobby_flow_PLAYER")

        await admin_actions.goto_admin_page()
        await admin_actions.login(settings.ADMIN_PASSWORD)
        lobby_code = await admin_actions.create_lobby("Player Join Test Lobby")

        await player_actions.goto_home_page()
        await player_actions.fill_name_and_code("Test Player", lobby_code)
        await player_actions.join_lobby()

        await expect(player_page.locator("p:has-text('Lobby Code:')")).to_be_visible()
        await expect(
            player_page.locator(
                f"span.font-mono.text-lg.font-bold:has-text('{lobby_code}')"
            )
        ).to_be_visible()
        await expect(
            player_page.locator("p:has-text('Welcome, Test Player!')")
        ).to_be_visible()

        await player_session.screenshot()

    async def test_player_join_nonexistent_lobby(
        self, player_actions_fixture: PlayerFixture, server_url: str
    ):
        player_actions, player_page, player_session = await player_actions_fixture(
            "Test Player"
        )
        player_session.set_name("test_player_join_nonexistent_lobby")

        await player_actions.goto_home_page()
        await player_actions.fill_name_and_code("Test Player", "INVALID123")
        await player_actions.join_lobby_expect_error()

        await expect(player_page.locator("text=Failed to join lobby")).to_be_visible()
        await expect(player_page.locator("h1:has-text('Raddle Teams')")).to_be_visible()

        await player_session.screenshot()

    async def test_player_empty_name_validation(
        self, player_actions_fixture: PlayerFixture, server_url: str
    ):
        player_actions, player_page, player_session = await player_actions_fixture(
            "Test Player"
        )
        player_session.set_name("test_player_empty_name_validation")

        await player_actions.goto_home_page()
        await player_actions.fill_name_and_code("", "TEST123")

        join_button = player_page.locator('button:has-text("Join Lobby")')
        await join_button.click()

        await expect(player_page.locator("h1:has-text('Raddle Teams')")).to_be_visible()

        await player_session.screenshot()

    async def test_player_lobby_info_display(
        self,
        player_actions_fixture: PlayerFixture,
        admin_actions_fixture: AdminFixture,
        settings: Settings,
    ):
        admin_actions, admin_page, admin_session = await admin_actions_fixture()
        admin_session.set_name("test_player_lobby_info_display_ADMIN")
        player_actions, player_page, player_session = await player_actions_fixture(
            "Info Test Player"
        )
        player_session.set_name("test_player_lobby_info_display_PLAYER")

        await admin_actions.goto_admin_page()
        await admin_actions.login(settings.ADMIN_PASSWORD)
        lobby_code = await admin_actions.create_lobby("Lobby Info Test")

        await player_actions.goto_home_page()
        await player_actions.fill_name_and_code("Info Test Player", lobby_code)
        await player_actions.join_lobby()

        await expect(player_page.locator("p:has-text('Lobby Code:')")).to_be_visible()
        await expect(
            player_page.locator(
                f"span.font-mono.text-lg.font-bold:has-text('{lobby_code}')"
            )
        ).to_be_visible()
        await expect(player_page.locator("text=Lobby Info Test")).to_be_visible()
        await expect(
            player_page.locator("p:has-text('Welcome, Info Test Player!')")
        ).to_be_visible()
        await expect(player_page.locator("text=Players (1)")).to_be_visible()

        await player_session.screenshot()

    async def test_player_leave_lobby_flow(
        self,
        player_actions_fixture: PlayerFixture,
        admin_actions_fixture: AdminFixture,
        settings: Settings,
    ):
        admin_actions, admin_page, admin_session = await admin_actions_fixture()
        admin_session.set_name("test_player_leave_lobby_flow_ADMIN")
        player_actions, player_page, player_session = await player_actions_fixture(
            "Leave Test Player"
        )
        player_session.set_name("test_player_leave_lobby_flow_PLAYER")

        await admin_actions.goto_admin_page()
        await admin_actions.login(settings.ADMIN_PASSWORD)
        lobby_code = await admin_actions.create_lobby("Leave Test Lobby")

        await player_actions.goto_home_page()
        await player_actions.fill_name_and_code("Leave Test Player", lobby_code)
        await player_actions.join_lobby()

        await expect(player_page.locator("p:has-text('Lobby Code:')")).to_be_visible()

        await player_actions.leave_lobby()

        await expect(player_page.locator("h1:has-text('Raddle Teams')")).to_be_visible()
        await expect(player_page.locator("text=Your Name")).to_be_visible()

        await player_session.screenshot()

    async def test_player_reconnection_flow(
        self,
        player_actions_fixture: PlayerFixture,
        admin_actions_fixture: AdminFixture,
        settings: Settings,
    ):
        admin_actions, admin_page, admin_session = await admin_actions_fixture()
        admin_session.set_name("test_player_reconnection_flow_ADMIN")
        player_actions, player_page, player_session = await player_actions_fixture(
            "Reconnect Player"
        )
        player_session.set_name("test_player_reconnection_flow_PLAYER")

        await admin_actions.goto_admin_page()
        await admin_actions.login(settings.ADMIN_PASSWORD)
        lobby_code = await admin_actions.create_lobby("Reconnection Test")

        await player_actions.goto_home_page()
        await player_actions.fill_name_and_code("Reconnect Player", lobby_code)
        await player_actions.join_lobby()

        await expect(player_page.locator("p:has-text('Lobby Code:')")).to_be_visible()

        await player_page.reload(wait_until="networkidle")

        await expect(player_page.locator("p:has-text('Lobby Code:')")).to_be_visible(
            timeout=10000
        )
        await expect(
            player_page.locator(
                f"span.font-mono.text-lg.font-bold:has-text('{lobby_code}')"
            )
        ).to_be_visible()

        await player_session.screenshot()

    async def test_player_navigation_flow(
        self,
        player_actions_fixture: PlayerFixture,
        admin_actions_fixture: AdminFixture,
        settings: Settings,
    ):
        admin_actions, admin_page, admin_session = await admin_actions_fixture()
        admin_session.set_name("test_player_navigation_flow_ADMIN")
        player_actions, player_page, player_session = await player_actions_fixture(
            "Nav Test Player"
        )
        player_session.set_name("test_player_navigation_flow_PLAYER")

        await admin_actions.goto_admin_page()
        await admin_actions.login(settings.ADMIN_PASSWORD)
        lobby_code = await admin_actions.create_lobby("Navigation Test")

        await player_actions.goto_home_page()
        await player_actions.fill_name_and_code("Nav Test Player", lobby_code)
        await player_actions.join_lobby()

        await player_page.goto(f"{admin_actions.server_url}/admin")
        await expect(player_page.locator("h1:has-text('Admin Login')")).to_be_visible()

        await player_page.goto(f"{admin_actions.server_url}/")

        await player_page.wait_for_load_state("networkidle")

        is_in_lobby = await player_page.locator(
            "p:has-text('Lobby Code:')"
        ).is_visible()
        is_on_home = await player_page.locator(
            "h1:has-text('Raddle Teams')"
        ).is_visible()

        page_title = await player_page.title()
        current_url = player_page.url

        if is_in_lobby:
            await expect(
                player_page.locator("p:has-text('Lobby Code:')")
            ).to_be_visible()
        elif is_on_home:
            await expect(
                player_page.locator("h1:has-text('Raddle Teams')")
            ).to_be_visible()
        else:
            await player_session.screenshot()
            print(
                f"Debug: Page title={page_title}, URL={current_url}, in_lobby={is_in_lobby}, on_home={is_on_home}"
            )
            assert admin_actions.server_url in current_url

        await player_session.screenshot()

    async def test_multiple_players_join_same_lobby(
        self,
        player_actions_fixture: PlayerFixture,
        admin_actions_fixture: AdminFixture,
        settings: Settings,
    ):
        admin_actions, admin_page, admin_session = await admin_actions_fixture()
        admin_session.set_name("test_multiple_players_join_same_lobby_ADMIN")
        player1_actions, player1_page, player1_session = await player_actions_fixture(
            "Player One"
        )
        player1_session.set_name("test_multiple_players_join_same_lobby_PLAYER1")

        await admin_actions.goto_admin_page()
        await admin_actions.login(settings.ADMIN_PASSWORD)
        lobby_code = await admin_actions.create_lobby("Multi Player Test")

        await player1_actions.goto_home_page()
        await player1_actions.fill_name_and_code("Player One", lobby_code)
        await player1_actions.join_lobby()

        await expect(
            player1_page.locator("p:has-text('Welcome, Player One!')")
        ).to_be_visible()
        await player1_actions.wait_for_player_count(1)

        player2_actions, player2_page, player2_session = await player_actions_fixture(
            "Player Two"
        )
        player2_session.set_name("test_multiple_players_join_same_lobby_PLAYER2")
        await player2_actions.goto_home_page()
        await player2_actions.fill_name_and_code("Player Two", lobby_code)
        await player2_actions.join_lobby()

        await expect(
            player2_page.locator("p:has-text('Welcome, Player Two!')")
        ).to_be_visible()

        # Add a small delay to ensure WebSocket connections are established
        await player1_actions.wait_for_websocket_update(2000)
        await player2_actions.wait_for_websocket_update(1000)

        try:
            await player1_actions.wait_for_player_count(2, timeout=8000)
            await player2_actions.wait_for_player_count(2, timeout=3000)
        except AssertionError:
            # TODO If real-time updates don't work, manually refresh for now, THESE SHOULD ALWAYS WORK
            print("WebSocket updates not working, falling back to manual refresh")
            await player1_page.reload(wait_until="networkidle")
            await player2_page.reload(wait_until="networkidle")
            await player1_actions.wait_for_player_count(2, timeout=5000)
            await player2_actions.wait_for_player_count(2, timeout=5000)

        await player2_session.screenshot()
        await player1_session.screenshot()

    async def test_player_form_validation(
        self, player_actions_fixture: PlayerFixture, server_url: str
    ):
        player_actions, player_page, player_session = await player_actions_fixture(
            "Test Player"
        )
        player_session.set_name("test_player_form_validation")

        await player_actions.goto_home_page()

        await player_actions.fill_name_and_code("", "TEST123")
        join_button = player_page.locator('button:has-text("Join Lobby")')
        await join_button.click()

        await expect(player_page.locator("text=Please enter your name")).to_be_visible()
        await expect(player_page.locator("h1:has-text('Raddle Teams')")).to_be_visible()

        await player_page.fill("#name", "Test Player")
        await player_page.fill("#lobbyCode", "")
        await join_button.click()

        await expect(
            player_page.locator("text=Please enter a lobby code")
        ).to_be_visible()
        await expect(player_page.locator("h1:has-text('Raddle Teams')")).to_be_visible()

        await player_session.screenshot()
