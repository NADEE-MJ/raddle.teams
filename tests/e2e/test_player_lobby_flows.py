from playwright.async_api import Page, expect

from backend.settings import Settings
from tests.e2e.fixtures.browsers import BrowserSession
from tests.e2e.utilities.admin_actions import AdminActions
from tests.e2e.utilities.player_actions import PlayerActions

AdminFixture = tuple[AdminActions, Page, BrowserSession]
PlayerFixture = tuple[PlayerActions, Page, BrowserSession]


class TestPlayerLobbyFlows:
    async def test_home_page_loads(
        self, player_actions, server_url: str
    ):
        player_actions, player_page, player_session = await player_actions()
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
        player_actions,
        admin_actions,
        settings: Settings,
    ):
        admin_actions, admin_page, admin_session = await admin_actions()
        admin_session.set_name("player_join_lobby_flow_ADMIN")
        player_actions, player_page, player_session = await player_actions()
        player_session.set_name("player_join_lobby_flow_PLAYER")

        await admin_actions.goto_admin_page()
        await admin_actions.login(settings.ADMIN_PASSWORD)
        lobby_code = await admin_actions.create_lobby("Player Join Test Lobby")

        await player_actions.goto_home_page()
        await player_actions.fill_name_and_code("Test Player", lobby_code)
        await player_actions.join_lobby()

        await expect(player_page.locator("p:has-text('Lobby Code:')")).to_be_visible()
        await expect(player_page.locator(f"text={lobby_code}")).to_be_visible()
        await expect(
            player_page.locator("p:has-text('Welcome, Test Player!')")
        ).to_be_visible()

        await player_session.screenshot()

    async def test_player_join_nonexistent_lobby(
        self, player_actions, server_url: str
    ):
        player_actions, player_page, player_session = await player_actions()
        player_session.set_name("test_player_join_nonexistent_lobby")

        await player_actions.goto_home_page()
        await player_actions.fill_name_and_code("Test Player", "INVALID123")
        await player_actions.join_lobby_expect_error()

        await expect(player_page.locator("text=Failed to join lobby")).to_be_visible()
        await expect(player_page.locator("h1:has-text('Raddle Teams')")).to_be_visible()

        await player_session.screenshot()

    async def test_player_empty_name_validation(
        self, player_actions, server_url: str
    ):
        player_actions, player_page, player_session = await player_actions()
        player_session.set_name("test_player_empty_name_validation")

        await player_actions.goto_home_page()
        await player_actions.fill_name_and_code("", "TEST123")

        join_button = player_page.locator('button:has-text("Join Lobby")')
        await join_button.click()

        await expect(player_page.locator("h1:has-text('Raddle Teams')")).to_be_visible()

        await player_session.screenshot()

    async def test_player_lobby_info_display(
        self,
        player_actions,
        admin_actions,
        settings: Settings,
    ):
        admin_actions, admin_page, admin_session = await admin_actions()
        admin_session.set_name("test_player_lobby_info_display_ADMIN")
        player_actions, player_page, player_session = await player_actions()
        player_session.set_name("test_player_lobby_info_display_PLAYER")

        await admin_actions.goto_admin_page()
        await admin_actions.login(settings.ADMIN_PASSWORD)
        lobby_code = await admin_actions.create_lobby("Lobby Info Test")

        await player_actions.goto_home_page()
        await player_actions.fill_name_and_code("Info Test Player", lobby_code)
        await player_actions.join_lobby()

        await expect(player_page.locator("p:has-text('Lobby Code:')")).to_be_visible()
        await expect(player_page.locator(f"text={lobby_code}")).to_be_visible()
        await expect(player_page.locator("text=Lobby Info Test")).to_be_visible()
        await expect(
            player_page.locator("p:has-text('Welcome, Info Test Player!')")
        ).to_be_visible()
        await expect(player_page.locator("text=Players (1)")).to_be_visible()

        await player_session.screenshot()

    async def test_player_leave_lobby_flow(
        self,
        player_actions,
        admin_actions,
        settings: Settings,
    ):
        admin_actions, admin_page, admin_session = await admin_actions()
        admin_session.set_name("test_player_leave_lobby_flow_ADMIN")
        player_actions, player_page, player_session = await player_actions()
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
        player_actions,
        admin_actions,
        settings: Settings,
    ):
        admin_actions, admin_page, admin_session = await admin_actions()
        admin_session.set_name("test_player_reconnection_flow_ADMIN")
        player_actions, player_page, player_session = await player_actions()
        player_session.set_name("test_player_reconnection_flow_PLAYER")

        await admin_actions.goto_admin_page()
        await admin_actions.login(settings.ADMIN_PASSWORD)
        lobby_code = await admin_actions.create_lobby("Reconnection Test")

        await player_actions.goto_home_page()
        await player_actions.fill_name_and_code("Reconnect Player", lobby_code)
        await player_actions.join_lobby()

        await expect(player_page.locator("p:has-text('Lobby Code:')")).to_be_visible()

        await player_actions.goto_home_page()

        await expect(player_page.locator("p:has-text('Lobby Code:')")).to_be_visible(
            timeout=10000
        )
        await expect(player_page.locator(f"text={lobby_code}")).to_be_visible()

        await player_session.screenshot()

    async def test_player_navigation_flow(
        self,
        player_actions,
        admin_actions,
        settings: Settings,
    ):
        admin_actions, admin_page, admin_session = await admin_actions()
        admin_session.set_name("test_player_navigation_flow_ADMIN")
        player_actions, player_page, player_session = await player_actions()
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

        await expect(player_page.locator("p:has-text('Lobby Code:')")).to_be_visible(
            timeout=10000
        )

        await player_session.screenshot()

    async def test_multiple_players_join_same_lobby(
        self,
        player_actions,
        admin_actions,
        settings: Settings,
    ):
        admin_actions, admin_page, admin_session = await admin_actions()
        admin_session.set_name("test_multiple_players_join_same_lobby_ADMIN")
        player_actions, player_page, player_session = await player_actions()
        player_session.set_name("test_multiple_players_join_same_lobby_PLAYER1")

        await admin_actions.goto_admin_page()
        await admin_actions.login(settings.ADMIN_PASSWORD)
        lobby_code = await admin_actions.create_lobby("Multi Player Test")

        await player_actions.goto_home_page()
        await player_actions.fill_name_and_code("Player One", lobby_code)
        await player_actions.join_lobby()

        await expect(
            player_page.locator("p:has-text('Welcome, Player One!')")
        ).to_be_visible()
        await expect(player_page.locator("text=Players (1)")).to_be_visible()

        player2_browser = await player_session.browser.new_page()
        from tests.e2e.utilities.player_actions import PlayerActions

        player2_actions = PlayerActions(
            player2_browser, admin_actions.server_url, "Player Two"
        )
        await player2_actions.goto_home_page()
        await player2_actions.fill_name_and_code("Player Two", lobby_code)
        await player2_actions.join_lobby()

        await expect(
            player2_browser.locator("p:has-text('Welcome, Player Two!')")
        ).to_be_visible()
        await expect(player2_browser.locator("text=Players (2)")).to_be_visible()

        await player2_browser.close()
        await player_session.screenshot()

    async def test_player_form_validation(
        self, player_actions, server_url: str
    ):
        player_actions, player_page, player_session = await player_actions()
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
