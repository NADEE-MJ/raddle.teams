from playwright.async_api import Page, expect

from settings import Settings
from tests.e2e.fixtures.browsers import BrowserSession
from tests.e2e.utilities.admin_actions import AdminActions
from tests.e2e.utilities.player_actions import PlayerActions

AdminFixture = tuple[AdminActions, Page, BrowserSession]
PlayerFixture = tuple[PlayerActions, Page, BrowserSession]


class TestPlayerLobbyFlows:
    async def test_home_page_loads(
        self, browser: tuple[BrowserSession, Page], server_url: str
    ):
        session, page = browser
        session.set_name("home_page_loads")

        await page.goto(f"{server_url}/")
        await page.wait_for_load_state("networkidle")

        await expect(page).to_have_title("Raddle Teams")

        await page.fill("#name", "Test User")

        await expect(page.locator("#name")).to_have_value("Test User")

        await page.fill("#lobbyCode", "TEST12")
        await expect(page.locator("#lobbyCode")).to_have_value("TEST12")

        await session.screenshot("home_page")

    async def test_player_join_lobby_flow(
        self,
        browser: tuple[BrowserSession, Page],
        admin_actions: AdminFixture,
        server_url: str,
        settings: Settings,
    ):
        # Set up admin to create a lobby first
        admin_actions_obj, admin_page, admin_session = admin_actions
        admin_session.set_name("player_join_setup")

        await admin_actions_obj.goto_admin_page()
        await admin_actions_obj.login(settings.ADMIN_PASSWORD)
        lobby_code = await admin_actions_obj.create_lobby("Player Join Test Lobby")

        # Now test player joining
        session, page = browser
        session.set_name("player_join_lobby_flow")

        player_actions = PlayerActions(page, server_url, "Test Player")

        await player_actions.goto_home_page()
        await player_actions.fill_name_and_code("Test Player", lobby_code)
        await player_actions.join_lobby()

        # Verify we're in the lobby
        await expect(page.locator("h1:has-text('Lobby:')")).to_be_visible()
        await expect(page.locator(f"text={lobby_code}")).to_be_visible()
        await expect(page.locator("text=Test Player")).to_be_visible()

        await session.screenshot("player_joined_lobby")

    async def test_player_join_nonexistent_lobby(
        self, browser: tuple[BrowserSession, Page], server_url: str
    ):
        session, page = browser
        session.set_name("player_join_nonexistent_lobby")

        player_actions = PlayerActions(page, server_url, "Test Player")

        await player_actions.goto_home_page()
        await player_actions.fill_name_and_code("Test Player", "INVALID123")
        await player_actions.join_lobby_expect_error()

        # Should stay on home page with error message
        await expect(page.locator("text=Lobby not found")).to_be_visible()
        await expect(page.locator("h1:has-text('Raddle Teams')")).to_be_visible()

        await session.screenshot("player_join_invalid_lobby")

    async def test_player_empty_name_validation(
        self, browser: tuple[BrowserSession, Page], server_url: str
    ):
        session, page = browser
        session.set_name("player_empty_name_validation")

        player_actions = PlayerActions(page, server_url, "")

        await player_actions.goto_home_page()
        await player_actions.fill_name_and_code("", "TEST123")

        # Try to join with empty name
        join_button = page.locator('button:has-text("Join Lobby")')
        await join_button.click()

        # Should show validation error or button should be disabled
        # Check if we're still on the home page (didn't navigate)
        await expect(page.locator("h1:has-text('Raddle Teams')")).to_be_visible()

        await session.screenshot("player_empty_name_validation")

    async def test_player_lobby_info_display(
        self,
        browser: tuple[BrowserSession, Page],
        admin_actions: AdminFixture,
        server_url: str,
        settings: Settings,
    ):
        # Set up admin to create a lobby
        admin_actions_obj, admin_page, admin_session = admin_actions
        admin_session.set_name("player_lobby_info_setup")

        await admin_actions_obj.goto_admin_page()
        await admin_actions_obj.login(settings.ADMIN_PASSWORD)
        lobby_code = await admin_actions_obj.create_lobby("Lobby Info Test")

        # Player joins the lobby
        session, page = browser
        session.set_name("player_lobby_info_display")

        player_actions = PlayerActions(page, server_url, "Info Test Player")

        await player_actions.goto_home_page()
        await player_actions.fill_name_and_code("Info Test Player", lobby_code)
        await player_actions.join_lobby()

        # Verify lobby information is displayed correctly
        await expect(page.locator("h1:has-text('Lobby:')")).to_be_visible()
        await expect(page.locator(f"text={lobby_code}")).to_be_visible()
        await expect(page.locator("text=Lobby Info Test")).to_be_visible()
        await expect(page.locator("text=Info Test Player")).to_be_visible()
        await expect(page.locator("text=1 player")).to_be_visible()

        await session.screenshot("player_lobby_info_display")

    async def test_player_leave_lobby_flow(
        self,
        browser: tuple[BrowserSession, Page],
        admin_actions: AdminFixture,
        server_url: str,
        settings: Settings,
    ):
        # Set up admin to create a lobby
        admin_actions_obj, admin_page, admin_session = admin_actions
        admin_session.set_name("player_leave_setup")

        await admin_actions_obj.goto_admin_page()
        await admin_actions_obj.login(settings.ADMIN_PASSWORD)
        lobby_code = await admin_actions_obj.create_lobby("Leave Test Lobby")

        # Player joins and then leaves
        session, page = browser
        session.set_name("player_leave_lobby_flow")

        player_actions = PlayerActions(page, server_url, "Leave Test Player")

        await player_actions.goto_home_page()
        await player_actions.fill_name_and_code("Leave Test Player", lobby_code)
        await player_actions.join_lobby()

        # Verify we're in the lobby first
        await expect(page.locator("h1:has-text('Lobby:')")).to_be_visible()

        # Leave the lobby
        await player_actions.leave_lobby()

        # Should be back on home page
        await expect(page.locator("h1:has-text('Raddle Teams')")).to_be_visible()
        await expect(page.locator("text=Your Name")).to_be_visible()

        await session.screenshot("player_left_lobby")

    async def test_player_reconnection_flow(
        self,
        browser: tuple[BrowserSession, Page],
        admin_actions: AdminFixture,
        server_url: str,
        settings: Settings,
    ):
        # Set up admin to create a lobby
        admin_actions_obj, admin_page, admin_session = admin_actions
        admin_session.set_name("player_reconnection_setup")

        await admin_actions_obj.goto_admin_page()
        await admin_actions_obj.login(settings.ADMIN_PASSWORD)
        lobby_code = await admin_actions_obj.create_lobby("Reconnection Test")

        # Player joins lobby
        session, page = browser
        session.set_name("player_reconnection_flow")

        player_actions = PlayerActions(page, server_url, "Reconnect Player")

        await player_actions.goto_home_page()
        await player_actions.fill_name_and_code("Reconnect Player", lobby_code)
        await player_actions.join_lobby()

        # Verify we're in the lobby
        await expect(page.locator("h1:has-text('Lobby:')")).to_be_visible()

        # Simulate going back to home page and then returning
        await player_actions.goto_home_page()

        # The app should detect existing session and redirect back to lobby
        await expect(page.locator("h1:has-text('Lobby:')")).to_be_visible(timeout=10000)
        await expect(page.locator(f"text={lobby_code}")).to_be_visible()

        await session.screenshot("player_reconnected_to_lobby")

    async def test_player_navigation_flow(
        self,
        browser: tuple[BrowserSession, Page],
        admin_actions: AdminFixture,
        server_url: str,
        settings: Settings,
    ):
        # Set up admin to create a lobby
        admin_actions_obj, admin_page, admin_session = admin_actions
        admin_session.set_name("player_navigation_setup")

        await admin_actions_obj.goto_admin_page()
        await admin_actions_obj.login(settings.ADMIN_PASSWORD)
        lobby_code = await admin_actions_obj.create_lobby("Navigation Test")

        # Test player navigation
        session, page = browser
        session.set_name("player_navigation_flow")

        player_actions = PlayerActions(page, server_url, "Nav Test Player")

        await player_actions.goto_home_page()
        await player_actions.fill_name_and_code("Nav Test Player", lobby_code)
        await player_actions.join_lobby()

        # Test navigation to admin page from lobby
        await page.goto(f"{server_url}/admin")
        await expect(page.locator("h1:has-text('Admin Login')")).to_be_visible()

        # Navigate back to home
        await page.goto(f"{server_url}/")

        # Should be redirected back to lobby (existing session)
        await expect(page.locator("h1:has-text('Lobby:')")).to_be_visible(timeout=10000)

        await session.screenshot("player_navigation_complete")
