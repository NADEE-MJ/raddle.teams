from typing import Awaitable, Callable

from playwright.async_api import Page, expect

from backend.settings import Settings
from tests.e2e.fixtures.browsers import BrowserSession
from tests.e2e.utilities.admin_actions import AdminActions
from tests.e2e.utilities.player_actions import PlayerActions

type AdminFixture = Callable[[], Awaitable[tuple[AdminActions, Page, BrowserSession]]]
type PlayerFixture = Callable[[str], Awaitable[tuple[PlayerActions, Page, BrowserSession]]]


class TestGameRouteFlows:
    async def test_game_page_with_invalid_game_id(self, player_actions_fixture: PlayerFixture, server_url: str):
        player_actions, player_page, player_session = await player_actions_fixture("Test User")
        player_session.set_name("game_page_invalid_id")

        await player_page.goto(f"{server_url}/game/invalid-game-123")
        await player_page.wait_for_load_state("networkidle")

        await expect(player_page.locator("text=No active session found")).to_be_visible()

        await player_session.screenshot()

    async def test_game_page_with_valid_session(
        self,
        player_actions_fixture: PlayerFixture,
        admin_actions_fixture: AdminFixture,
        settings: Settings,
        server_url: str,
    ):
        admin_actions, admin_page, admin_session = await admin_actions_fixture()
        admin_session.set_name("game_page_valid_session_ADMIN")
        player_actions, player_page, player_session = await player_actions_fixture("Game Test Player")
        player_session.set_name("game_page_valid_session_PLAYER")

        await admin_actions.goto_admin_page()
        await admin_actions.login(settings.ADMIN_PASSWORD)
        lobby_code = await admin_actions.create_lobby("Game Test Lobby")

        await player_actions.goto_home_page()
        await player_actions.fill_name_and_code("Game Test Player", lobby_code)
        await player_actions.join_lobby()

        await player_page.goto(f"{server_url}/game/test-game-123")
        await player_page.wait_for_load_state("networkidle")

        await player_session.screenshot()

    async def test_game_invalid_direct_access(self, player_actions_fixture: PlayerFixture, server_url: str):
        player_actions, player_page, player_session = await player_actions_fixture("Test User")
        player_session.set_name("game_invalid_direct_access")

        await player_page.goto(f"{server_url}/game")
        await player_page.wait_for_load_state("networkidle")

        await expect(player_page.locator("h1:has-text('Invalid Game Access')")).to_be_visible()
        await expect(player_page.locator("text=Please use a valid game link")).to_be_visible()
        await expect(player_page.locator("a:has-text('Back to Home')")).to_be_visible()

        await player_page.click("a:has-text('Back to Home')")
        await expect(player_page.locator("h1:has-text('Raddle Teams')")).to_be_visible()

        await player_session.screenshot()


class TestGameRouteWebSocketFlows:
    pass
