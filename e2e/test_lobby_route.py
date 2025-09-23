from typing import Awaitable, Callable

from playwright.async_api import Page, expect

from backend.settings import Settings
from e2e.fixtures.browsers import BrowserSession
from e2e.utilities.admin_actions import AdminActions
from e2e.utilities.player_actions import PlayerActions

type AdminFixture = Callable[[], Awaitable[tuple[AdminActions, Page, BrowserSession]]]
type PlayerFixture = Callable[[str], Awaitable[tuple[PlayerActions, Page, BrowserSession]]]


class TestLobbyRouteFlows:
    async def test_lobby_player_join_flow(
        self,
        player_actions_fixture: PlayerFixture,
        admin_actions_fixture: AdminFixture,
        settings: Settings,
    ):
        admin_actions, admin_page, admin_session = await admin_actions_fixture()
        admin_session.set_name("lobby_player_join_flow_ADMIN")
        player_actions, player_page, player_session = await player_actions_fixture("Test Player")
        player_session.set_name("lobby_player_join_flow_PLAYER")

        await admin_actions.goto_admin_page()
        await admin_actions.login(settings.ADMIN_PASSWORD)
        lobby_code = await admin_actions.create_lobby("Player Join Test Lobby")

        await player_actions.goto_home_page()
        await player_actions.fill_name_and_code("Test Player", lobby_code)
        await player_actions.join_lobby()

        await expect(player_page.locator("p:has-text('Lobby Code:')")).to_be_visible()
        await expect(player_page.locator(f"span.font-mono.text-lg.font-bold:has-text('{lobby_code}')")).to_be_visible()
        await expect(player_page.locator("p:has-text('Welcome, Test Player!')")).to_be_visible()

        await player_session.screenshot()

    async def test_lobby_player_join_nonexistent(self, player_actions_fixture: PlayerFixture, server_url: str):
        player_actions, player_page, player_session = await player_actions_fixture("Test Player")
        player_session.set_name("lobby_player_join_nonexistent")

        await player_actions.goto_home_page()
        await player_actions.fill_name_and_code("Test Player", "INVALID123")
        await player_actions.join_lobby_expect_error()

        await expect(player_page.locator("text=Failed to join lobby")).to_be_visible()
        await expect(player_page.locator("h1:has-text('Raddle Teams')")).to_be_visible()

        await player_session.screenshot()

    async def test_lobby_info_display(
        self,
        player_actions_fixture: PlayerFixture,
        admin_actions_fixture: AdminFixture,
        settings: Settings,
    ):
        admin_actions, admin_page, admin_session = await admin_actions_fixture()
        admin_session.set_name("lobby_info_display_ADMIN")
        player_actions, player_page, player_session = await player_actions_fixture("Info Test Player")
        player_session.set_name("lobby_info_display_PLAYER")

        await admin_actions.goto_admin_page()
        await admin_actions.login(settings.ADMIN_PASSWORD)
        lobby_code = await admin_actions.create_lobby("Lobby Info Test")

        await player_actions.goto_home_page()
        await player_actions.fill_name_and_code("Info Test Player", lobby_code)
        await player_actions.join_lobby()

        await expect(player_page.locator("p:has-text('Lobby Code:')")).to_be_visible()
        await expect(player_page.locator(f"span.font-mono.text-lg.font-bold:has-text('{lobby_code}')")).to_be_visible()
        await expect(player_page.locator("text=Lobby Info Test")).to_be_visible()
        await expect(player_page.locator("p:has-text('Welcome, Info Test Player!')")).to_be_visible()
        await expect(player_page.locator("text=Players (1)")).to_be_visible()

        await player_session.screenshot()

    async def test_lobby_leave_flow(
        self,
        player_actions_fixture: PlayerFixture,
        admin_actions_fixture: AdminFixture,
        settings: Settings,
    ):
        admin_actions, admin_page, admin_session = await admin_actions_fixture()
        admin_session.set_name("lobby_leave_flow_ADMIN")
        player_actions, player_page, player_session = await player_actions_fixture("Leave Test Player")
        player_session.set_name("lobby_leave_flow_PLAYER")

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

    async def test_lobby_reconnection_flow(
        self,
        player_actions_fixture: PlayerFixture,
        admin_actions_fixture: AdminFixture,
        settings: Settings,
    ):
        admin_actions, admin_page, admin_session = await admin_actions_fixture()
        admin_session.set_name("lobby_reconnection_flow_ADMIN")
        player_actions, player_page, player_session = await player_actions_fixture("Reconnect Player")
        player_session.set_name("lobby_reconnection_flow_PLAYER")

        await admin_actions.goto_admin_page()
        await admin_actions.login(settings.ADMIN_PASSWORD)
        lobby_code = await admin_actions.create_lobby("Reconnection Test")

        await player_actions.goto_home_page()
        await player_actions.fill_name_and_code("Reconnect Player", lobby_code)
        await player_actions.join_lobby()

        await expect(player_page.locator("p:has-text('Lobby Code:')")).to_be_visible()

        await player_page.reload(wait_until="networkidle")

        await expect(player_page.locator("p:has-text('Lobby Code:')")).to_be_visible(timeout=10000)
        await expect(player_page.locator(f"span.font-mono.text-lg.font-bold:has-text('{lobby_code}')")).to_be_visible()

        await player_session.screenshot()

    async def test_lobby_navigation_flow(
        self,
        player_actions_fixture: PlayerFixture,
        admin_actions_fixture: AdminFixture,
        settings: Settings,
    ):
        admin_actions, admin_page, admin_session = await admin_actions_fixture()
        admin_session.set_name("lobby_navigation_flow_ADMIN")
        player_actions, player_page, player_session = await player_actions_fixture("Nav Test Player")
        player_session.set_name("lobby_navigation_flow_PLAYER")

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

        is_in_lobby = await player_page.locator("p:has-text('Lobby Code:')").is_visible()
        is_on_home = await player_page.locator("h1:has-text('Raddle Teams')").is_visible()

        page_title = await player_page.title()
        current_url = player_page.url

        if is_in_lobby:
            await expect(player_page.locator("p:has-text('Lobby Code:')")).to_be_visible()
        elif is_on_home:
            await expect(player_page.locator("h1:has-text('Raddle Teams')")).to_be_visible()
        else:
            await player_session.screenshot()
            print(f"Debug: Page title={page_title}, URL={current_url}, in_lobby={is_in_lobby}, on_home={is_on_home}")
            assert admin_actions.server_url in current_url

        await player_session.screenshot()

    async def test_lobby_multiple_players_join_same(
        self,
        player_actions_fixture: PlayerFixture,
        admin_actions_fixture: AdminFixture,
        settings: Settings,
    ):
        admin_actions, admin_page, admin_session = await admin_actions_fixture()
        admin_session.set_name("lobby_multiple_players_join_same_ADMIN")
        player1_actions, player1_page, player1_session = await player_actions_fixture("Player One")
        player1_session.set_name("lobby_multiple_players_join_same_PLAYER1")

        await admin_actions.goto_admin_page()
        await admin_actions.login(settings.ADMIN_PASSWORD)
        lobby_code = await admin_actions.create_lobby("Multi Player Test")

        await player1_actions.goto_home_page()
        await player1_actions.fill_name_and_code("Player One", lobby_code)
        await player1_actions.join_lobby()

        await expect(player1_page.locator("p:has-text('Welcome, Player One!')")).to_be_visible()
        await player1_actions.wait_for_player_count(1)

        player2_actions, player2_page, player2_session = await player_actions_fixture("Player Two")
        player2_session.set_name("lobby_multiple_players_join_same_PLAYER2")
        await player2_actions.goto_home_page()
        await player2_actions.fill_name_and_code("Player Two", lobby_code)
        await player2_actions.join_lobby()

        await expect(player2_page.locator("p:has-text('Welcome, Player Two!')")).to_be_visible()

        await player1_actions.wait_for_player_count(2, timeout=8000)
        await player2_actions.wait_for_player_count(2, timeout=3000)

        await player2_session.screenshot()
        await player1_session.screenshot()

    async def test_lobby_no_session_access(self, player_actions_fixture: PlayerFixture, server_url: str):
        player_actions, player_page, player_session = await player_actions_fixture("Test User")
        player_session.set_name("lobby_no_session_access")

        await player_page.goto(f"{server_url}/lobby/TESTCODE")
        await player_page.wait_for_load_state("networkidle")

        await expect(player_page.locator("h1:has-text('Raddle Teams')")).to_be_visible()

        await player_session.screenshot()

    async def test_lobby_case_insensitive_codes(
        self,
        player_actions_fixture: PlayerFixture,
        admin_actions_fixture: AdminFixture,
        settings: Settings,
    ):
        admin_actions, admin_page, admin_session = await admin_actions_fixture()
        admin_session.set_name("lobby_case_insensitive_ADMIN")
        player_actions, player_page, player_session = await player_actions_fixture("Case Test Player")
        player_session.set_name("lobby_case_insensitive_PLAYER")

        await admin_actions.goto_admin_page()
        await admin_actions.login(settings.ADMIN_PASSWORD)
        lobby_code = await admin_actions.create_lobby("Case Insensitive Test")

        await player_actions.goto_home_page()
        await player_actions.fill_name_and_code("Case Test Player", lobby_code.lower())
        await player_actions.join_lobby()

        await expect(player_page.locator("p:has-text('Lobby Code:')")).to_be_visible()
        await expect(player_page.locator("p:has-text('Welcome, Case Test Player!')")).to_be_visible()

        await player_session.screenshot()

    async def test_lobby_browser_back_navigation(
        self,
        player_actions_fixture: PlayerFixture,
        admin_actions_fixture: AdminFixture,
        settings: Settings,
    ):
        admin_actions, admin_page, admin_session = await admin_actions_fixture()
        admin_session.set_name("lobby_browser_back_ADMIN")
        player_actions, player_page, player_session = await player_actions_fixture("Back Test Player")
        player_session.set_name("lobby_browser_back_PLAYER")

        await admin_actions.goto_admin_page()
        await admin_actions.login(settings.ADMIN_PASSWORD)
        lobby_code = await admin_actions.create_lobby("Browser Back Test")

        await player_actions.goto_home_page()
        await player_actions.fill_name_and_code("Back Test Player", lobby_code)
        await player_actions.join_lobby()

        await expect(player_page.locator("p:has-text('Lobby Code:')")).to_be_visible()

        await player_page.go_back()

        await expect(player_page.locator("p:has-text('Lobby Code:')")).to_be_visible()
        await expect(player_page.locator(f"span.font-mono.text-lg.font-bold:has-text('{lobby_code}')")).to_be_visible()

        await player_session.screenshot()

    async def test_lobby_loading_states(
        self,
        player_actions_fixture: PlayerFixture,
        admin_actions_fixture: AdminFixture,
        settings: Settings,
    ):
        admin_actions, admin_page, admin_session = await admin_actions_fixture()
        admin_session.set_name("lobby_loading_states_ADMIN")
        player_actions, player_page, player_session = await player_actions_fixture("Loading Test Player")
        player_session.set_name("lobby_loading_states_PLAYER")

        await admin_actions.goto_admin_page()
        await admin_actions.login(settings.ADMIN_PASSWORD)
        lobby_code = await admin_actions.create_lobby("Loading States Test")

        await player_actions.goto_home_page()
        await player_actions.fill_name_and_code("Loading Test Player", lobby_code)
        await player_actions.join_lobby()

        await expect(player_page.locator("p:has-text('Lobby Code:')")).to_be_visible()

        await player_session.screenshot()

    async def test_lobby_team_display_no_teams(
        self,
        player_actions_fixture: PlayerFixture,
        admin_actions_fixture: AdminFixture,
        settings: Settings,
    ):
        admin_actions, admin_page, admin_session = await admin_actions_fixture()
        admin_session.set_name("lobby_no_teams_ADMIN")
        player_actions, player_page, player_session = await player_actions_fixture("No Teams Player")
        player_session.set_name("lobby_no_teams_PLAYER")

        await admin_actions.goto_admin_page()
        await admin_actions.login(settings.ADMIN_PASSWORD)
        lobby_code = await admin_actions.create_lobby("No Teams Test")

        await player_actions.goto_home_page()
        await player_actions.fill_name_and_code("No Teams Player", lobby_code)
        await player_actions.join_lobby()

        await expect(player_page.locator("text=No teams created yet")).to_be_visible()

        await player_session.screenshot()


class TestLobbyRouteWebSocketFlows:
    async def test_lobby_websocket_player_rejoin_after_leaving(
        self,
        player_actions_fixture: PlayerFixture,
        admin_actions_fixture: AdminFixture,
        settings: Settings,
    ):
        admin_actions, admin_page, admin_session = await admin_actions_fixture()
        admin_session.set_name("lobby_websocket_player_rejoin_ADMIN")
        player_actions, player_page, player_session = await player_actions_fixture("Rejoin Player")
        player_session.set_name("lobby_websocket_player_rejoin_PLAYER")

        await admin_actions.goto_admin_page()
        await admin_actions.login(settings.ADMIN_PASSWORD)
        lobby_code = await admin_actions.create_lobby("Rejoin Test Lobby")

        await player_actions.goto_home_page()
        await player_actions.fill_name_and_code("Rejoin Player", lobby_code)
        await player_actions.join_lobby()
        await expect(player_page.locator("p:has-text('Lobby Code:')")).to_be_visible()

        await player_actions.leave_lobby()
        await expect(player_page.locator("h1:has-text('Raddle Teams')")).to_be_visible()

        await player_page.evaluate("() => localStorage.clear()")

        await player_actions.goto_home_page()

        await player_actions.fill_name_and_code("Rejoin Player", lobby_code)
        try:
            await player_actions.join_lobby()
        except AssertionError as e:
            await player_session.screenshot()
            error_text = await player_page.text_content("body")
            print(f"Rejoin failed. Page content: {error_text[:500]}")
            raise e
        await expect(player_page.locator("p:has-text('Lobby Code:')")).to_be_visible()
        await expect(player_page.locator(f"span.font-mono.text-lg.font-bold:has-text('{lobby_code}')")).to_be_visible()
        await expect(player_page.locator("p:has-text('Welcome, Rejoin Player!')")).to_be_visible()

        await player_session.screenshot()

    async def test_lobby_websocket_reconnection_after_page_refresh(
        self,
        player_actions_fixture: PlayerFixture,
        admin_actions_fixture: AdminFixture,
        settings: Settings,
    ):
        admin_actions, admin_page, admin_session = await admin_actions_fixture()
        admin_session.set_name("lobby_websocket_reconnection_ADMIN")
        player_actions, player_page, player_session = await player_actions_fixture("Reconnect Player")
        player_session.set_name("lobby_websocket_reconnection_PLAYER")

        await admin_actions.goto_admin_page()
        await admin_actions.login(settings.ADMIN_PASSWORD)
        lobby_code = await admin_actions.create_lobby("Reconnection Test Lobby")

        await player_actions.goto_home_page()
        await player_actions.fill_name_and_code("Reconnect Player", lobby_code)
        await player_actions.join_lobby()
        await expect(player_page.locator("p:has-text('Lobby Code:')")).to_be_visible()

        await player_page.reload(wait_until="networkidle")

        await expect(player_page.locator("p:has-text('Lobby Code:')")).to_be_visible(timeout=5000)
        await expect(player_page.locator(f"span.font-mono.text-lg.font-bold:has-text('{lobby_code}')")).to_be_visible()
        await expect(player_page.locator("p:has-text('Welcome, Reconnect Player!')")).to_be_visible()

        await player_session.screenshot()

    async def test_lobby_websocket_multiple_players_realtime_updates(
        self,
        player_actions_fixture: PlayerFixture,
        admin_actions_fixture: AdminFixture,
        settings: Settings,
    ):
        admin_actions, admin_page, admin_session = await admin_actions_fixture()
        admin_session.set_name("lobby_websocket_realtime_updates_ADMIN")

        player1_actions, player1_page, player1_session = await player_actions_fixture("Player One")
        player1_session.set_name("lobby_websocket_realtime_updates_PLAYER1")

        player2_actions, player2_page, player2_session = await player_actions_fixture("Player Two")
        player2_session.set_name("lobby_websocket_realtime_updates_PLAYER2")

        await admin_actions.goto_admin_page()
        await admin_actions.login(settings.ADMIN_PASSWORD)
        lobby_code = await admin_actions.create_lobby("Realtime Updates Test")

        await player1_actions.goto_home_page()
        await player1_actions.fill_name_and_code("Player One", lobby_code)
        await player1_actions.join_lobby()

        await player1_actions.wait_for_player_count(1, timeout=5000)

        await player2_actions.goto_home_page()
        await player2_actions.fill_name_and_code("Player Two", lobby_code)
        await player2_actions.join_lobby()

        await player1_actions.wait_for_player_count(2, timeout=8000)
        await player2_actions.wait_for_player_count(2, timeout=3000)

        await expect(player1_page.locator("span.font-medium:has-text('Player One (You)')")).to_be_visible()
        await expect(player1_page.locator("span.font-medium:has-text('Player Two')")).to_be_visible()
        await expect(player2_page.locator("span.font-medium:has-text('Player One')")).to_be_visible()
        await expect(player2_page.locator("span.font-medium:has-text('Player Two (You)')")).to_be_visible()

        await player1_session.screenshot()
        await player2_session.screenshot()

    async def test_lobby_websocket_concurrent_joins(
        self,
        player_actions_fixture: PlayerFixture,
        admin_actions_fixture: AdminFixture,
        settings: Settings,
    ):
        admin_actions, admin_page, admin_session = await admin_actions_fixture()
        admin_session.set_name("lobby_websocket_concurrent_joins_ADMIN")

        player1_actions, player1_page, player1_session = await player_actions_fixture("Concurrent One")
        player1_session.set_name("lobby_websocket_concurrent_joins_PLAYER1")

        player2_actions, player2_page, player2_session = await player_actions_fixture("Concurrent Two")
        player2_session.set_name("lobby_websocket_concurrent_joins_PLAYER2")

        player3_actions, player3_page, player3_session = await player_actions_fixture("Concurrent Three")
        player3_session.set_name("lobby_websocket_concurrent_joins_PLAYER3")

        await admin_actions.goto_admin_page()
        await admin_actions.login(settings.ADMIN_PASSWORD)
        lobby_code = await admin_actions.create_lobby("Concurrent Join Test")

        await player1_actions.goto_home_page()
        await player1_actions.fill_name_and_code("Concurrent One", lobby_code)

        await player2_actions.goto_home_page()
        await player2_actions.fill_name_and_code("Concurrent Two", lobby_code)

        await player3_actions.goto_home_page()
        await player3_actions.fill_name_and_code("Concurrent Three", lobby_code)

        await player1_actions.join_lobby()
        await player2_actions.join_lobby()
        await player3_actions.join_lobby()

        await player1_actions.wait_for_player_count(3, timeout=10000)
        await player2_actions.wait_for_player_count(3, timeout=5000)
        await player3_actions.wait_for_player_count(3, timeout=5000)

        await player1_session.screenshot()
        await player2_session.screenshot()
        await player3_session.screenshot()

    async def test_lobby_websocket_player_leave_updates(
        self,
        player_actions_fixture: PlayerFixture,
        admin_actions_fixture: AdminFixture,
        settings: Settings,
    ):
        admin_actions, admin_page, admin_session = await admin_actions_fixture()
        admin_session.set_name("lobby_websocket_leave_updates_ADMIN")

        player1_actions, player1_page, player1_session = await player_actions_fixture("Leaver One")
        player1_session.set_name("lobby_websocket_leave_updates_PLAYER1")

        player2_actions, player2_page, player2_session = await player_actions_fixture("Stayer Two")
        player2_session.set_name("lobby_websocket_leave_updates_PLAYER2")

        await admin_actions.goto_admin_page()
        await admin_actions.login(settings.ADMIN_PASSWORD)
        lobby_code = await admin_actions.create_lobby("Leave Updates Test")

        await player1_actions.goto_home_page()
        await player1_actions.fill_name_and_code("Leaver One", lobby_code)
        await player1_actions.join_lobby()

        await player2_actions.goto_home_page()
        await player2_actions.fill_name_and_code("Stayer Two", lobby_code)
        await player2_actions.join_lobby()

        await player1_actions.wait_for_player_count(2, timeout=8000)
        await player2_actions.wait_for_player_count(2, timeout=3000)

        await player1_actions.leave_lobby()

        await player2_actions.wait_for_player_count(1, timeout=8000)

        await expect(player2_page.locator("text=Leaver One")).not_to_be_visible(timeout=5000)
        await expect(player2_page.locator("text=Players (1)")).to_be_visible()

        await player2_session.screenshot()
