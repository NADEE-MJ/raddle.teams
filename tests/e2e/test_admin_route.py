from typing import Awaitable, Callable

from playwright.async_api import Page, expect

from backend.settings import Settings
from tests.e2e.fixtures.browsers import BrowserSession
from tests.e2e.utilities.admin_actions import AdminActions
from tests.e2e.utilities.player_actions import PlayerActions

type AdminFixture = Callable[[], Awaitable[tuple[AdminActions, Page, BrowserSession]]]
type PlayerFixture = Callable[[str], Awaitable[tuple[PlayerActions, Page, BrowserSession]]]


class TestAdminRouteFlows:
    async def test_admin_login_flow(self, admin_actions_fixture: AdminFixture, settings: Settings):
        actions, page, browser = await admin_actions_fixture()
        browser.set_name("admin_login_flow")

        await actions.goto_admin_page()

        await expect(page.locator("h1:has-text('Admin Login')")).to_be_visible()
        await expect(page.locator('input[type="password"]')).to_be_visible()

        await actions.login(settings.ADMIN_PASSWORD)

        await expect(page.locator("h1:has-text('Admin Dashboard')")).to_be_visible()
        await expect(page.locator("text=Create New Lobby")).to_be_visible()
        await expect(page.locator("text=All Lobbies")).to_be_visible()

        await browser.screenshot()

    async def test_admin_login_invalid_password(
        self,
        admin_actions_fixture: AdminFixture,
    ):
        actions, page, browser = await admin_actions_fixture()
        browser.set_name("admin_login_invalid_password")

        await actions.goto_admin_page()

        token_input = page.locator('input[type="password"]')
        await token_input.fill("wrong_password")

        login_button = page.locator('button:has-text("Login")')
        await login_button.click()

        await expect(page.locator("text=Invalid admin token")).to_be_visible()
        await expect(page.locator("h1:has-text('Admin Login')")).to_be_visible()

        await browser.screenshot()

    async def test_admin_create_lobby(self, admin_actions_fixture: AdminFixture, settings: Settings):
        actions, page, browser = await admin_actions_fixture()
        browser.set_name("admin_create_lobby")

        await actions.goto_admin_page()
        await actions.login(settings.ADMIN_PASSWORD)

        lobby_code = await actions.create_lobby("E2E Test Lobby")

        await expect(page.locator(f"text=Code: {lobby_code}")).to_be_visible()
        await expect(page.locator('h3:has-text("E2E Test Lobby")')).to_be_visible()

        await browser.screenshot("admin_lobby_created")

    async def test_admin_view_lobby_details(self, admin_actions_fixture: AdminFixture, settings: Settings):
        actions, page, browser = await admin_actions_fixture()
        browser.set_name("admin_view_lobby_details")

        await actions.goto_admin_page()
        await actions.login(settings.ADMIN_PASSWORD)

        lobby_code = await actions.create_lobby("View Details Test Lobby")

        await actions.peek_into_lobby(lobby_code)

        await expect(page.locator("text=Lobby Details:")).to_be_visible()
        await expect(page.locator('h2:has-text("Lobby Details: View Details Test Lobby")')).to_be_visible()
        lobby_info_section = page.locator("h3:has-text('Lobby Info')").locator("..")
        await expect(lobby_info_section.locator(f"text={lobby_code}")).to_be_visible()
        await expect(page.locator("text=No players in this lobby yet")).to_be_visible()

        await browser.screenshot()

    async def test_admin_logout(self, admin_actions_fixture: AdminFixture, settings: Settings):
        actions, page, browser = await admin_actions_fixture()
        browser.set_name("admin_logout")

        await actions.goto_admin_page()
        await actions.login(settings.ADMIN_PASSWORD)

        await expect(page.locator("h1:has-text('Admin Dashboard')")).to_be_visible()

        logout_button = page.locator('button:has-text("Logout")')
        await logout_button.click()

        await expect(page.locator("h1:has-text('Admin Login')")).to_be_visible()
        await expect(page.locator('input[type="password"]')).to_be_visible()

        await browser.screenshot()

    async def test_admin_delete_lobby(self, admin_actions_fixture: AdminFixture, settings: Settings):
        actions, page, browser = await admin_actions_fixture()
        browser.set_name("admin_delete_lobby")

        await actions.goto_admin_page()
        await actions.login(settings.ADMIN_PASSWORD)

        lobby_code = await actions.create_lobby("Delete Test Lobby")
        await expect(page.locator(f"text=Code: {lobby_code}")).to_be_visible()

        delete_button = page.locator(f"text=Code: {lobby_code}").locator("..").locator("button:has-text('Delete')")
        if await delete_button.is_visible():
            await delete_button.click()
            await expect(page.locator(f"text=Code: {lobby_code}")).not_to_be_visible(timeout=5000)

        await browser.screenshot()

    async def test_admin_multiple_lobbies_management(self, admin_actions_fixture: AdminFixture, settings: Settings):
        actions, page, browser = await admin_actions_fixture()
        browser.set_name("admin_multiple_lobbies_management")

        await actions.goto_admin_page()
        await actions.login(settings.ADMIN_PASSWORD)

        lobby1_code = await actions.create_lobby("First Lobby")
        lobby2_code = await actions.create_lobby("Second Lobby")
        lobby3_code = await actions.create_lobby("Third Lobby")

        await expect(page.locator(f"text=Code: {lobby1_code}")).to_be_visible()
        await expect(page.locator(f"text=Code: {lobby2_code}")).to_be_visible()
        await expect(page.locator(f"text=Code: {lobby3_code}")).to_be_visible()

        await expect(page.locator('h3:has-text("First Lobby")')).to_be_visible()
        await expect(page.locator('h3:has-text("Second Lobby")')).to_be_visible()
        await expect(page.locator('h3:has-text("Third Lobby")')).to_be_visible()

        await browser.screenshot()

    async def test_admin_empty_lobby_name(self, admin_actions_fixture: AdminFixture, settings: Settings):
        actions, page, browser = await admin_actions_fixture()
        browser.set_name("admin_empty_lobby_name")

        await actions.goto_admin_page()
        await actions.login(settings.ADMIN_PASSWORD)

        lobby_name_input = page.locator('input[placeholder="Lobby name"]')
        await lobby_name_input.fill("")

        create_button = page.locator('button:has-text("Create Lobby")')
        await expect(create_button).to_be_disabled()

        await browser.screenshot()

    async def test_admin_lobby_refresh_behavior(
        self,
        admin_actions_fixture: AdminFixture,
        player_actions_fixture: PlayerFixture,
        settings: Settings,
    ):
        admin_actions, admin_page, admin_session = await admin_actions_fixture()
        admin_session.set_name("admin_lobby_refresh_ADMIN")
        player_actions, player_page, player_session = await player_actions_fixture("Refresh Test Player")
        player_session.set_name("admin_lobby_refresh_PLAYER")

        await admin_actions.goto_admin_page()
        await admin_actions.login(settings.ADMIN_PASSWORD)
        lobby_code = await admin_actions.create_lobby("Refresh Test Lobby")

        await admin_actions.peek_into_lobby(lobby_code)

        await player_actions.goto_home_page()
        await player_actions.fill_name_and_code("Refresh Test Player", lobby_code)
        await player_actions.join_lobby()

        await admin_actions.wait_for_players(1, 5000)

        await admin_page.reload(wait_until="networkidle")

        await expect(admin_page.locator("h1:has-text('Admin Dashboard')")).to_be_visible()

        await admin_session.screenshot()


class TestAdminRouteWebSocketFlows:
    async def test_admin_websocket_sees_player_join_updates(
        self,
        player_actions_fixture: PlayerFixture,
        admin_actions_fixture: AdminFixture,
        settings: Settings,
    ):
        admin_actions, admin_page, admin_session = await admin_actions_fixture()
        admin_session.set_name("admin_websocket_player_join_ADMIN")
        player_actions, player_page, player_session = await player_actions_fixture("Join Notify Player")
        player_session.set_name("admin_websocket_player_join_PLAYER")

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

    async def test_admin_websocket_sees_multiple_players_join(
        self,
        player_actions_fixture: PlayerFixture,
        admin_actions_fixture: AdminFixture,
        settings: Settings,
    ):
        admin_actions, admin_page, admin_session = await admin_actions_fixture()
        admin_session.set_name("admin_websocket_multiple_joins_ADMIN")

        player1_actions, player1_page, player1_session = await player_actions_fixture("Multi Join One")
        player1_session.set_name("admin_websocket_multiple_joins_PLAYER1")

        player2_actions, player2_page, player2_session = await player_actions_fixture("Multi Join Two")
        player2_session.set_name("admin_websocket_multiple_joins_PLAYER2")

        await admin_actions.goto_admin_page()
        await admin_actions.login(settings.ADMIN_PASSWORD)
        lobby_code = await admin_actions.create_lobby("Multi Join Test")

        await admin_actions.peek_into_lobby(lobby_code)

        await player1_actions.goto_home_page()
        await player1_actions.fill_name_and_code("Multi Join One", lobby_code)
        await player1_actions.join_lobby()

        await admin_actions.wait_for_players(1, 5000)

        await player2_actions.goto_home_page()
        await player2_actions.fill_name_and_code("Multi Join Two", lobby_code)
        await player2_actions.join_lobby()

        await admin_actions.wait_for_players(2, 5000)
        await expect(admin_page.locator("text=Multi Join One")).to_be_visible()
        await expect(admin_page.locator("text=Multi Join Two")).to_be_visible()

        await admin_session.screenshot()

    async def test_admin_websocket_sees_player_leave_updates(
        self,
        player_actions_fixture: PlayerFixture,
        admin_actions_fixture: AdminFixture,
        settings: Settings,
    ):
        admin_actions, admin_page, admin_session = await admin_actions_fixture()
        admin_session.set_name("admin_websocket_player_leave_ADMIN")
        player_actions, player_page, player_session = await player_actions_fixture("Leave Notify Player")
        player_session.set_name("admin_websocket_player_leave_PLAYER")

        await admin_actions.goto_admin_page()
        await admin_actions.login(settings.ADMIN_PASSWORD)
        lobby_code = await admin_actions.create_lobby("Leave Notification Test")

        await admin_actions.peek_into_lobby(lobby_code)

        await player_actions.goto_home_page()
        await player_actions.fill_name_and_code("Leave Notify Player", lobby_code)
        await player_actions.join_lobby()

        await admin_actions.wait_for_players(1, 5000)
        await expect(admin_page.locator("text=Leave Notify Player")).to_be_visible()

        await player_actions.leave_lobby()

        await admin_actions.wait_for_players(0, 5000)
        await expect(admin_page.locator("text=Leave Notify Player")).not_to_be_visible(timeout=3000)

        await admin_session.screenshot()

    async def test_admin_websocket_reconnection(self, admin_actions_fixture: AdminFixture, settings: Settings):
        admin_actions, admin_page, admin_session = await admin_actions_fixture()
        admin_session.set_name("admin_websocket_reconnection")

        await admin_actions.goto_admin_page()
        await admin_actions.login(settings.ADMIN_PASSWORD)
        lobby_code = await admin_actions.create_lobby("WebSocket Reconnect Test")

        await admin_actions.peek_into_lobby(lobby_code)

        await admin_page.reload(wait_until="networkidle")

        await expect(admin_page.locator("h1:has-text('Admin Dashboard')")).to_be_visible()

        await admin_session.screenshot()

    async def test_admin_websocket_concurrent_sessions(self, admin_actions_fixture: AdminFixture, settings: Settings):
        admin1_actions, admin1_page, admin1_session = await admin_actions_fixture()
        admin1_session.set_name("admin_websocket_concurrent_1")

        admin2_actions, admin2_page, admin2_session = await admin_actions_fixture()
        admin2_session.set_name("admin_websocket_concurrent_2")

        await admin1_actions.goto_admin_page()
        await admin1_actions.login(settings.ADMIN_PASSWORD)
        lobby_code = await admin1_actions.create_lobby("Concurrent Admin Test")

        await admin2_actions.goto_admin_page()
        await admin2_actions.login(settings.ADMIN_PASSWORD)

        await admin1_actions.peek_into_lobby(lobby_code)
        await admin2_actions.peek_into_lobby(lobby_code)

        await expect(admin1_page.locator("text=Lobby Details: Concurrent Admin Test")).to_be_visible()
        await expect(admin2_page.locator("text=Lobby Details: Concurrent Admin Test")).to_be_visible()

        await admin1_session.screenshot()
        await admin2_session.screenshot()
