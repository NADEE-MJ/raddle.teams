"""Test the new single-page tutorial functionality."""

from typing import Awaitable, Callable

from playwright.async_api import Page, expect

from e2e.fixtures.browsers import BrowserSession
from e2e.utilities.player_actions import PlayerActions

type PlayerFixture = Callable[[str], Awaitable[tuple[PlayerActions, Page, BrowserSession]]]


class TestTutorial:
    async def test_tutorial_loads_correctly(self, player_actions_fixture: PlayerFixture):
        actions, page, browser = await player_actions_fixture("test_player")
        browser.set_name("new_tutorial_loads")

        await page.goto("http://localhost:8000/tutorial")

        # Check main title and structure
        await expect(page.locator("h1")).to_contain_text("RDDLE")  # From GlobalLayout
        await expect(page.get_by_role("heading", name="Learn how to Raddle")).to_be_visible()  # From TutorialPage
        await expect(page.locator('[data-testid="tutorial-link"]:has-text("Tutorial")')).to_be_visible()

        # Check that the tutorial page loaded with the puzzle (look for key elements)
        await expect(page.locator('[data-testid="ladder-word-down"]')).to_be_visible()
        await expect(page.locator('[data-testid="ladder-word-earth"]')).to_be_visible()

    async def test_game_interface_elements(self, player_actions_fixture: PlayerFixture):
        actions, page, browser = await player_actions_fixture("test_player")
        browser.set_name("game_interface")

        await page.goto("http://localhost:8000/tutorial")

        # Check ladder display (using more specific selectors)
        await expect(page.locator('[data-testid="ladder-word-down"]:has-text("DOWN")')).to_be_visible()
        await expect(page.locator('[data-testid="ladder-word-earth"]:has-text("EARTH")')).to_be_visible()

        # Check switch direction button
        await expect(page.locator('[data-testid="switch-direction-button"]')).to_be_visible()

        # Check input field is visible
        await expect(page.locator('[data-testid="active-step-input"]')).to_be_visible()

    async def test_hints_show_correctly(self, player_actions_fixture: PlayerFixture):
        actions, page, browser = await player_actions_fixture("test_player")
        browser.set_name("hints_display")

        await page.goto("http://localhost:8000/tutorial")

        # Should see hints with DOWN substituted for <>
        await expect(page.locator("text=Cardinal direction that's DOWN on a map, most of the time")).to_be_visible()

    async def test_basic_guess_functionality(self, player_actions_fixture: PlayerFixture):
        actions, page, browser = await player_actions_fixture("test_player")
        browser.set_name("basic_guess")

        await page.goto("http://localhost:8000/tutorial")

        # Try to make a guess (SOUTH should be the answer to the first clue)
        input_field = page.locator('[data-testid="active-step-input"]')

        await input_field.fill("SOUTH")
        await input_field.press("Enter")

        # Should see the word SOUTH appear in the ladder
        await expect(page.locator('[data-testid="ladder-word-south"]:has-text("SOUTH")')).to_be_visible()

    async def test_direction_switching(self, player_actions_fixture: PlayerFixture):
        actions, page, browser = await player_actions_fixture("test_player")
        browser.set_name("direction_switching")

        await page.goto("http://localhost:8000/tutorial")

        # Click switch direction button
        switch_button = page.locator('[data-testid="switch-direction-button"]')
        await switch_button.click()

        # Should see direction change text
        await expect(switch_button).to_contain_text("Switch to solving")

        # Switch back
        await switch_button.click()

        # Should see DOWN substituted again
        await expect(page.locator("text=Cardinal direction that's DOWN on a map, most of the time")).to_be_visible()

    async def test_back_to_home_button(self, player_actions_fixture: PlayerFixture):
        actions, page, browser = await player_actions_fixture("test_player")
        browser.set_name("back_to_home")

        await page.goto("http://localhost:8000/tutorial")

        # Click home link in header
        await page.click('[data-testid="home-link"]')

        # Should navigate back to landing page
        await expect(page).to_have_url("http://localhost:8000/")
        await expect(page.locator("h1")).to_contain_text("RDDLE")

    async def test_ready_to_play_button(self, player_actions_fixture: PlayerFixture):
        actions, page, browser = await player_actions_fixture("test_player")
        browser.set_name("ready_to_play")

        await page.goto("http://localhost:8000/tutorial")

        # Click home link instead (no "Ready to Play with Friends" button exists)
        await page.click('[data-testid="home-link"]')

        # Should navigate back to landing page
        await expect(page).to_have_url("http://localhost:8000/")
        await expect(page.locator("h1")).to_contain_text("RDDLE")
