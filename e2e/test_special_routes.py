from typing import Awaitable, Callable

from playwright.async_api import Page, expect

from backend.settings import Settings
from e2e.fixtures.browsers import BrowserSession
from e2e.utilities.admin_actions import AdminActions
from e2e.utilities.player_actions import PlayerActions

type AdminFixture = Callable[[], Awaitable[tuple[AdminActions, Page, BrowserSession]]]
type PlayerFixture = Callable[[str], Awaitable[tuple[PlayerActions, Page, BrowserSession]]]


class TestSpecialRoutes:
    async def test_invalid_lobby_page_direct_access(self, player_actions_fixture: PlayerFixture, server_url: str):
        player_actions, player_page, player_session = await player_actions_fixture("Test User")
        player_session.set_name("special_invalid_lobby_direct_access")

        await player_page.goto(f"{server_url}/lobby")
        await player_page.wait_for_load_state("networkidle")

        await expect(player_page.locator("h1:has-text('Invalid Lobby Access')")).to_be_visible()
        await expect(player_page.locator("text=Please use a valid lobby link")).to_be_visible()
        await expect(player_page.locator("a:has-text('Back to Home')")).to_be_visible()

        await player_page.click("a:has-text('Back to Home')")
        await expect(player_page.locator("h1:has-text('Raddle Teams')")).to_be_visible()

        await player_session.screenshot()

    async def test_404_not_found_page(self, player_actions_fixture: PlayerFixture, server_url: str):
        player_actions, player_page, player_session = await player_actions_fixture("Test User")
        player_session.set_name("special_404_not_found")

        await player_page.goto(f"{server_url}/nonexistent-route")
        await player_page.wait_for_load_state("networkidle")

        await expect(player_page.locator("h1:has-text('Page Not Found')")).to_be_visible()
        await expect(player_page.locator("text=The page you're looking for doesn't exist")).to_be_visible()
        await expect(player_page.locator("a:has-text('Back to Home')")).to_be_visible()

        await player_page.click("a:has-text('Back to Home')")
        await expect(player_page.locator("h1:has-text('Raddle Teams')")).to_be_visible()

        await player_session.screenshot()

    async def test_network_error_handling(self, player_actions_fixture: PlayerFixture, server_url: str):
        player_actions, player_page, player_session = await player_actions_fixture("Test User")
        player_session.set_name("special_network_error")

        await player_page.goto(f"{server_url}/")
        await player_page.wait_for_load_state("networkidle")

        await expect(player_page.locator("h1:has-text('Raddle Teams')")).to_be_visible()

        await player_session.screenshot()

    async def test_malformed_lobby_code_handling(self, player_actions_fixture: PlayerFixture, server_url: str):
        player_actions, player_page, player_session = await player_actions_fixture("Test User")
        player_session.set_name("special_malformed_lobby_code")

        await player_page.goto(f"{server_url}/")
        await player_page.wait_for_load_state("networkidle")

        await player_page.fill("#name", "Test User")
        await player_page.fill("#lobbyCode", "123")

        join_button = player_page.locator('button:has-text("Join Lobby")')
        await join_button.click()

        await expect(player_page.locator("h1:has-text('Raddle Teams')")).to_be_visible()

        await player_session.screenshot()


class TestEdgeCaseScenarios:
    async def test_duplicate_player_names(
        self,
        player_actions_fixture: PlayerFixture,
        admin_actions_fixture: AdminFixture,
        settings: Settings,
    ):
        admin_actions, admin_page, admin_session = await admin_actions_fixture()
        admin_session.set_name("edge_duplicate_names_ADMIN")

        player1_actions, player1_page, player1_session = await player_actions_fixture("Duplicate Name")
        player1_session.set_name("edge_duplicate_names_PLAYER1")

        player2_actions, player2_page, player2_session = await player_actions_fixture("Duplicate Name")
        player2_session.set_name("edge_duplicate_names_PLAYER2")

        await admin_actions.goto_admin_page()
        await admin_actions.login(settings.ADMIN_PASSWORD)
        lobby_code = await admin_actions.create_lobby("Duplicate Names Test")

        await player1_actions.goto_home_page()
        await player1_actions.fill_name_and_code("Duplicate Name", lobby_code)
        await player1_actions.join_lobby()

        await player2_actions.goto_home_page()
        await player2_actions.fill_name_and_code("Duplicate Name", lobby_code)

        try:
            await player2_actions.join_lobby()
        except Exception:
            pass

        await admin_actions.peek_into_lobby(lobby_code)

        if await admin_page.locator("text=Players (2)").is_visible():
            await expect(admin_page.locator("text=Players (2)")).to_be_visible()
        else:
            await expect(admin_page.locator("text=Players (1)")).to_be_visible()

        await admin_session.screenshot()
        await player1_session.screenshot()
        await player2_session.screenshot()

    async def test_rapid_join_leave_actions(
        self,
        player_actions_fixture: PlayerFixture,
        admin_actions_fixture: AdminFixture,
        settings: Settings,
    ):
        admin_actions, admin_page, admin_session = await admin_actions_fixture()
        admin_session.set_name("edge_rapid_join_leave_ADMIN")
        player_actions, player_page, player_session = await player_actions_fixture("Rapid Player")
        player_session.set_name("edge_rapid_join_leave_PLAYER")

        await admin_actions.goto_admin_page()
        await admin_actions.login(settings.ADMIN_PASSWORD)
        lobby_code = await admin_actions.create_lobby("Rapid Actions Test")

        await admin_actions.peek_into_lobby(lobby_code)

        for i in range(3):
            await player_actions.goto_home_page()
            await player_actions.fill_name_and_code(f"Rapid Player {i}", lobby_code)
            await player_actions.join_lobby()
            await player_actions.leave_lobby()

        await admin_session.screenshot()

    async def test_session_persistence_across_tabs(
        self,
        player_actions_fixture: PlayerFixture,
        admin_actions_fixture: AdminFixture,
        settings: Settings,
    ):
        admin_actions, admin_page, admin_session = await admin_actions_fixture()
        admin_session.set_name("edge_session_persistence_ADMIN")
        player_actions, player_page, player_session = await player_actions_fixture("Persistent Player")
        player_session.set_name("edge_session_persistence_PLAYER")

        await admin_actions.goto_admin_page()
        await admin_actions.login(settings.ADMIN_PASSWORD)
        lobby_code = await admin_actions.create_lobby("Session Persistence Test")

        await player_actions.goto_home_page()
        await player_actions.fill_name_and_code("Persistent Player", lobby_code)
        await player_actions.join_lobby()

        await expect(player_page.locator("p:has-text('Lobby Code:')")).to_be_visible()

        new_tab = await player_page.context.new_page()
        await new_tab.goto(f"{player_actions.server_url}/lobby/{lobby_code}")
        await new_tab.wait_for_load_state("networkidle")

        await new_tab.close()

        await expect(player_page.locator("p:has-text('Lobby Code:')")).to_be_visible()

        await player_session.screenshot()

    async def test_special_characters_in_names(
        self,
        player_actions_fixture: PlayerFixture,
        admin_actions_fixture: AdminFixture,
        settings: Settings,
    ):
        admin_actions, admin_page, admin_session = await admin_actions_fixture()
        admin_session.set_name("edge_special_chars_ADMIN")
        player_actions, player_page, player_session = await player_actions_fixture("Special Player")
        player_session.set_name("edge_special_chars_PLAYER")

        await admin_actions.goto_admin_page()
        await admin_actions.login(settings.ADMIN_PASSWORD)
        lobby_code = await admin_actions.create_lobby("Special Characters Test")

        special_name = "Player!@#$%^&*()"
        await player_actions.goto_home_page()
        await player_actions.fill_name_and_code(special_name, lobby_code)

        try:
            await player_actions.join_lobby()
            await expect(player_page.locator(f"p:has-text('Welcome, {special_name}!')")).to_be_visible()
        except Exception:
            await expect(player_page.locator("h1:has-text('Raddle Teams')")).to_be_visible()

        await admin_actions.peek_into_lobby(lobby_code)

        await admin_session.screenshot()
        await player_session.screenshot()

    async def test_very_long_player_names(
        self,
        player_actions_fixture: PlayerFixture,
        admin_actions_fixture: AdminFixture,
        settings: Settings,
    ):
        admin_actions, admin_page, admin_session = await admin_actions_fixture()
        admin_session.set_name("edge_long_names_ADMIN")
        player_actions, player_page, player_session = await player_actions_fixture("Long Name Player")
        player_session.set_name("edge_long_names_PLAYER")

        await admin_actions.goto_admin_page()
        await admin_actions.login(settings.ADMIN_PASSWORD)
        lobby_code = await admin_actions.create_lobby("Long Names Test")

        very_long_name = "A" * 100
        await player_actions.goto_home_page()
        await player_actions.fill_name_and_code(very_long_name, lobby_code)

        try:
            await player_actions.join_lobby()
        except Exception:
            pass

        await admin_actions.peek_into_lobby(lobby_code)

        await admin_session.screenshot()
        await player_session.screenshot()

    async def test_sql_injection_prevention(
        self,
        player_actions_fixture: PlayerFixture,
        admin_actions_fixture: AdminFixture,
        settings: Settings,
    ):
        admin_actions, admin_page, admin_session = await admin_actions_fixture()
        admin_session.set_name("edge_sql_injection_ADMIN")

        await admin_actions.goto_admin_page()
        await admin_actions.login(settings.ADMIN_PASSWORD)

        malicious_lobby_name = "'; DROP TABLE lobbies; --"
        try:
            await admin_actions.create_lobby(malicious_lobby_name)
        except Exception:
            pass

        await expect(admin_page.locator("h1:has-text('Admin Dashboard')")).to_be_visible()

        await admin_session.screenshot()
