from typing import Callable

from playwright.async_api import Page, expect

from settings import Settings
from tests.e2e.fixtures.browsers import BrowserSession
from tests.e2e.utilities.admin_actions import AdminActions

AdminFixture = tuple[AdminActions, Page, BrowserSession]


class TestAdmin:
    async def test_admin_login_flow(self, browser, settings: Settings, server_url: str):
        browser, page = browser
        browser.set_name("admin_login_flow")

        actions = AdminActions(page, server_url)

        await actions.goto_admin_page()

        await expect(page.locator("h1:has-text('Admin Login')")).to_be_visible()
        await expect(page.locator('input[type="password"]')).to_be_visible()

        await actions.login(settings.ADMIN_PASSWORD)

        await expect(page.locator("h1:has-text('Admin Dashboard')")).to_be_visible()
        await expect(page.locator("text=Create New Lobby")).to_be_visible()
        await expect(page.locator("text=All Lobbies")).to_be_visible()

        await browser.screenshot("admin_logged_in")

    async def test_admin_login_invalid_password(
        self,
        server_url: str,
        browser,
        admin_actions: Callable[[Page], AdminActions],
    ):
        """Test admin login with incorrect password."""
        browser, page = browser
        browser.set_name("admin_login_invalid_password")
        actions, page, browser = admin_actions

        await actions.goto_admin_page()

        # Try to login with wrong password
        token_input = page.locator('input[type="password"]')
        await token_input.fill("wrong_password")

        login_button = page.locator('button:has-text("Login")')
        await login_button.click()

        # Should show error message and stay on login page
        await expect(page.locator("text=Invalid admin token")).to_be_visible()
        await expect(page.locator("h1:has-text('Admin Login')")).to_be_visible()

        await browser.screenshot("admin_login_failed")
        # await browser.stop()

    async def test_admin_create_lobby(
        self,
        server_url: str,
        browser: BrowserSession,
        admin_actions: Callable[[Page], AdminActions],
        admin_password: str,
    ):
        """Test creating a new lobby through admin interface."""
        page = await browser.start()
        actions = admin_actions(page)

        # Login as admin
        await actions.goto_admin_page()
        await actions.login(admin_password)

        # Create a lobby
        lobby_code = await actions.create_lobby("E2E Test Lobby")

        # Verify lobby was created and appears in the list
        await expect(page.locator(f"text=Code: {lobby_code}")).to_be_visible()
        await expect(page.locator("text=E2E Test Lobby")).to_be_visible()

        await browser.screenshot("admin_lobby_created")
        await browser.stop()

    async def test_admin_view_lobby_details(
        self,
        server_url: str,
        browser: BrowserSession,
        admin_actions: Callable[[Page], AdminActions],
        admin_password: str,
    ):
        """Test viewing lobby details through admin interface."""
        page = await browser.start()
        actions = admin_actions(page)

        # Login as admin
        await actions.goto_admin_page()
        await actions.login(admin_password)

        # Create a lobby first
        lobby_code = await actions.create_lobby("Detail Test Lobby")

        # View lobby details
        await actions.peek_into_lobby(lobby_code)

        # Verify lobby details are shown
        await expect(
            page.locator("text=Lobby Details: Detail Test Lobby")
        ).to_be_visible()
        await expect(page.locator(f"text=Code: {lobby_code}")).to_be_visible()
        await expect(page.locator("text=No players in this lobby yet")).to_be_visible()

        await browser.screenshot("admin_lobby_details")
        await browser.stop()

    async def test_admin_logout(
        self,
        server_url: str,
        browser: BrowserSession,
        admin_actions: Callable[[Page], AdminActions],
        admin_password: str,
    ):
        """Test admin logout functionality."""
        page = await browser.start()
        actions = admin_actions(page)

        # Login as admin
        await actions.goto_admin_page()
        await actions.login(admin_password)

        # Verify we're logged in
        await expect(page.locator("h1:has-text('Admin Dashboard')")).to_be_visible()

        # Logout
        logout_button = page.locator('button:has-text("Logout")')
        await logout_button.click()

        # Should be back to login page
        await expect(page.locator("h1:has-text('Admin Login')")).to_be_visible()
        await expect(page.locator('input[type="password"]')).to_be_visible()

        await browser.screenshot("admin_logged_out")
        await browser.stop()

    async def test_admin_navigation(
        self,
        server_url: str,
        browser: BrowserSession,
        admin_actions: Callable[[Page], AdminActions],
        admin_password: str,
    ):
        """Test navigation between admin and home pages."""
        page = await browser.start()
        actions = admin_actions(page)

        # Login as admin
        await actions.goto_admin_page()
        await actions.login(admin_password)

        # Navigate to home page
        home_button = page.locator('button:has-text("Home")')
        await home_button.click()

        # Should be on home page
        await expect(page).to_have_url(f"{server_url}/")
        await expect(page.locator("text=Enter Your Name")).to_be_visible()

        # Navigate back to admin
        await page.goto(f"{server_url}/admin")

        # Should still be logged in (token persisted)
        await expect(page.locator("h1:has-text('Admin Dashboard')")).to_be_visible()

        await browser.screenshot("admin_navigation")
        await browser.stop()

    async def test_home_page_loads(self, server_url: str, browser: BrowserSession):
        page = await browser.start()

        await page.goto(f"{server_url}/")
        await page.wait_for_load_state("networkidle")

        # # Check that React has loaded
        await expect(page).to_have_title("Raddle Teams")

        # enter a name in the your name field
        await page.fill("#name", "Test User")

        # Verify the name was entered
        await expect(page.locator("#name")).to_have_value("Test User")

        # # Test the lobby code field as well
        # await page.fill('#lobbyCode', "TEST123")
        # await expect(page.locator('#lobbyCode')).to_have_value("TEST123")

        # # Take a screenshot for verification
        await browser.screenshot("home_page")

        # await page.video.save_as("tests/recordings/videos/home_page_video.mp4")
        await browser.stop()

        print("✅ Home page loaded successfully")
