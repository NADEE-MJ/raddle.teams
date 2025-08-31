from typing import Awaitable, Callable

from playwright.async_api import Page, expect

from backend.settings import Settings
from tests.e2e.fixtures.browsers import BrowserSession
from tests.e2e.utilities.admin_actions import AdminActions

type AdminFixture = Callable[[], Awaitable[tuple[AdminActions, Page, BrowserSession]]]


class TestAdminDashboardFlows:
    async def test_admin_login_flow(
        self, admin_actions_fixture: AdminFixture, settings: Settings
    ):
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

    async def test_admin_create_lobby(
        self, admin_actions_fixture: AdminFixture, settings: Settings
    ):
        actions, page, browser = await admin_actions_fixture()
        browser.set_name("admin_create_lobby")

        await actions.goto_admin_page()
        await actions.login(settings.ADMIN_PASSWORD)

        lobby_code = await actions.create_lobby("E2E Test Lobby")

        await expect(page.locator(f"text=Code: {lobby_code}")).to_be_visible()
        await expect(page.locator('h3:has-text("E2E Test Lobby")')).to_be_visible()

        await browser.screenshot("admin_lobby_created")

    async def test_admin_view_lobby_details(
        self, admin_actions_fixture: AdminFixture, settings: Settings
    ):
        actions, page, browser = await admin_actions_fixture()
        browser.set_name("admin_view_lobby_details")

        await actions.goto_admin_page()
        await actions.login(settings.ADMIN_PASSWORD)

        # Create a lobby first since database is reset between tests
        lobby_code = await actions.create_lobby("View Details Test Lobby")

        # Now view its details
        await actions.peek_into_lobby(lobby_code)

        await expect(page.locator("text=Lobby Details:")).to_be_visible()
        await expect(
            page.locator('h2:has-text("Lobby Details: View Details Test Lobby")')
        ).to_be_visible()
        lobby_info_section = page.locator("h3:has-text('Lobby Info')").locator("..")
        await expect(lobby_info_section.locator(f"text={lobby_code}")).to_be_visible()
        await expect(page.locator("text=No players in this lobby yet")).to_be_visible()

        await browser.screenshot()

    async def test_admin_logout(
        self, admin_actions_fixture: AdminFixture, settings: Settings
    ):
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

    async def test_admin_navigation(
        self,
        admin_actions_fixture: AdminFixture,
        settings: Settings,
        server_url: str,
    ):
        actions, page, browser = await admin_actions_fixture()
        browser.set_name("admin_navigation")

        await actions.goto_admin_page()
        await actions.login(settings.ADMIN_PASSWORD)

        home_button = page.locator('button:has-text("Home")')
        await home_button.click()

        await expect(page).to_have_url(f"{server_url}/")
        await expect(page.locator("text=Your Name")).to_be_visible()

        await page.goto(f"{server_url}/admin")

        await expect(page.locator("h1:has-text('Admin Dashboard')")).to_be_visible()

        await browser.screenshot("admin_navigation")

    async def test_admin_multiple_lobbies_management(
        self, admin_actions_fixture: AdminFixture, settings: Settings
    ):
        actions, page, browser = await admin_actions_fixture()
        browser.set_name("admin_multiple_lobbies")

        await actions.goto_admin_page()
        await actions.login(settings.ADMIN_PASSWORD)

        lobby1_code = await actions.create_lobby("First Test Lobby")
        lobby2_code = await actions.create_lobby("Second Test Lobby")

        await expect(page.locator(f"text=Code: {lobby1_code}")).to_be_visible()
        await expect(page.locator(f"text=Code: {lobby2_code}")).to_be_visible()
        await expect(page.locator('h3:has-text("First Test Lobby")')).to_be_visible()
        await expect(page.locator('h3:has-text("Second Test Lobby")')).to_be_visible()

        await actions.refresh_lobbies()
        await expect(page.locator(f"text=Code: {lobby1_code}")).to_be_visible()
        await expect(page.locator(f"text=Code: {lobby2_code}")).to_be_visible()

        await browser.screenshot("admin_multiple_lobbies")

    async def test_admin_empty_lobby_list(
        self, admin_actions_fixture: AdminFixture, settings: Settings
    ):
        actions, page, browser = await admin_actions_fixture()
        browser.set_name("admin_empty_lobby_list")

        await actions.goto_admin_page()
        await actions.login(settings.ADMIN_PASSWORD)

        await actions.view_all_lobbies()
        await expect(page.locator("text=No lobbies created yet")).to_be_visible()

        await browser.screenshot("admin_empty_lobby_list")

    async def test_admin_delete_lobby(
        self, admin_actions_fixture: AdminFixture, settings: Settings
    ):
        actions, page, browser = await admin_actions_fixture()
        browser.set_name("admin_delete_lobby")

        await actions.goto_admin_page()
        await actions.login(settings.ADMIN_PASSWORD)

        # Create a lobby to delete
        lobby_code = await actions.create_lobby("Delete Test Lobby")

        # Verify lobby exists
        await expect(page.locator(f"text=Code: {lobby_code}")).to_be_visible()
        await expect(page.locator('h3:has-text("Delete Test Lobby")')).to_be_visible()

        # Delete the lobby
        await actions.delete_lobby(lobby_code)

        # Verify lobby is gone
        await expect(page.locator(f"text=Code: {lobby_code}")).not_to_be_visible()
        await expect(
            page.locator('h3:has-text("Delete Test Lobby")')
        ).not_to_be_visible()

        await browser.screenshot("admin_delete_lobby_success")
