from typing import Awaitable, Callable

from playwright.async_api import Page, expect

from tests.e2e.fixtures.browsers import BrowserSession
from tests.e2e.utilities.player_actions import PlayerActions

type PlayerFixture = Callable[[str], Awaitable[tuple[PlayerActions, Page, BrowserSession]]]


class TestLandingPageFlows:
    async def test_landing_home_page_loads(self, player_actions_fixture: PlayerFixture, server_url: str):
        player_actions, player_page, player_session = await player_actions_fixture("Test User")
        player_session.set_name("landing_home_page_loads")

        await player_page.goto(f"{server_url}/")
        await player_page.wait_for_load_state("networkidle")

        await expect(player_page).to_have_title("Raddle Teams")

        await player_page.fill('[data-testid="name-input"]', "Test User")

        await expect(player_page.locator('[data-testid="name-input"]')).to_have_value("Test User")

        await player_page.fill('[data-testid="lobby-code-input"]', "TEST12")
        await expect(player_page.locator('[data-testid="lobby-code-input"]')).to_have_value("TEST12")

        await player_session.screenshot()

    async def test_landing_admin_button_navigation(self, player_actions_fixture: PlayerFixture, server_url: str):
        player_actions, player_page, player_session = await player_actions_fixture("Test User")
        player_session.set_name("landing_admin_button_navigation")

        await player_page.goto(f"{server_url}/")
        await player_page.wait_for_load_state("networkidle")

        await expect(player_page.locator('[data-testid="landing-page-title"]')).to_be_visible()

        admin_button = player_page.locator('[data-testid="admin-panel-link"]')
        await admin_button.click()

        await expect(player_page.locator('[data-testid="admin-login-title"]')).to_be_visible()

        await player_session.screenshot()

    async def test_landing_form_validation(self, player_actions_fixture: PlayerFixture, server_url: str):
        player_actions, player_page, player_session = await player_actions_fixture("Test Player")
        player_session.set_name("landing_form_validation")

        await player_actions.goto_home_page()

        await player_actions.fill_name_and_code("", "TEST123")
        join_button = player_page.locator('[data-testid="join-lobby-button"]')
        await join_button.click()

        await expect(player_page.locator('[data-testid="join-form-error"]:has-text("Please enter your name")')).to_be_visible()
        await expect(player_page.locator('[data-testid="landing-page-title"]')).to_be_visible()

        await player_page.fill('[data-testid="name-input"]', "Test Player")
        await player_page.fill('[data-testid="lobby-code-input"]', "")
        await join_button.click()

        await expect(player_page.locator('[data-testid="join-form-error"]:has-text("Please enter a lobby code")')).to_be_visible()
        await expect(player_page.locator('[data-testid="landing-page-title"]')).to_be_visible()

        await player_session.screenshot()
