"""Test tutorial route and basic functionality."""

from typing import Awaitable, Callable

from playwright.async_api import Page, expect

from tests.e2e.fixtures.browsers import BrowserSession
from tests.e2e.utilities.player_actions import PlayerActions

type PlayerFixture = Callable[[str], Awaitable[tuple[PlayerActions, Page, BrowserSession]]]


class TestTutorialRoute:
    """Test tutorial page routing and basic functionality."""

    async def test_tutorial_route_accessible(self, player_actions_fixture: PlayerFixture):
        """Test that tutorial route is accessible from landing page."""
        actions, page, browser = await player_actions_fixture("test_player")
        browser.set_name("tutorial_route_accessible")

        # Navigate to landing page
        await actions.goto_home_page()

        # Check that tutorial button exists
        tutorial_button = page.locator('a[href="/tutorial"]')
        await expect(tutorial_button).to_be_visible()
        await expect(tutorial_button).to_contain_text("How to Play")

        # Click tutorial button
        await tutorial_button.click()

        # Verify navigation to tutorial page
        await expect(page).to_have_url("http://localhost:8000/tutorial")
        await expect(page.locator("h1")).to_contain_text("How to Play Raddle Teams")

    async def test_tutorial_page_structure(self, player_actions_fixture: PlayerFixture):
        """Test that tutorial page has expected structure."""
        actions, page, browser = await player_actions_fixture("test_player")
        browser.set_name("tutorial_page_structure")

        # Navigate to tutorial page directly
        await page.goto("http://localhost:8000/tutorial")

        # Check main elements are present
        await expect(page.locator("h1")).to_contain_text("How to Play Raddle Teams")
        await expect(page.locator('button:has-text("Skip Tutorial")')).to_be_visible()

        # Check progress indicator
        progress_dots = page.locator('[class*="rounded-full"]')
        await expect(progress_dots).to_have_count(8)  # 8 tutorial steps

        # Check step counter
        await expect(page.locator("text=Step 1 of 8")).to_be_visible()

        # Check navigation buttons
        prev_button = page.locator('button:has-text("Previous")')
        next_button = page.locator('button:has-text("Next")')
        await expect(prev_button).to_be_visible()
        await expect(next_button).to_be_visible()

        # First step should have disabled previous button
        await expect(prev_button).to_be_disabled()

    async def test_tutorial_navigation(self, player_actions_fixture: PlayerFixture):
        """Test navigation through tutorial steps."""
        actions, page, browser = await player_actions_fixture("test_player")
        browser.set_name("tutorial_navigation")

        await page.goto("http://localhost:8000/tutorial")

        # Start at step 1
        await expect(page.locator("text=Step 1 of 8")).to_be_visible()
        await expect(page.locator("h2")).to_contain_text("Welcome to Raddle Teams!")

        # Navigate to step 2
        await page.click('button:has-text("Next")')
        await expect(page.locator("text=Step 2 of 8")).to_be_visible()
        await expect(page.locator("h2")).to_contain_text("Understanding Word Ladders")

        # Navigate back to step 1
        await page.click('button:has-text("Previous")')
        await expect(page.locator("text=Step 1 of 8")).to_be_visible()

    async def test_skip_tutorial_functionality(self, player_actions_fixture: PlayerFixture):
        """Test skip tutorial button functionality."""
        actions, page, browser = await player_actions_fixture("test_player")
        browser.set_name("skip_tutorial")

        await page.goto("http://localhost:8000/tutorial")

        # Click skip tutorial
        await page.click('button:has-text("Skip Tutorial")')

        # Should navigate back to landing page
        await expect(page).to_have_url("http://localhost:8000/")
        await expect(page.locator("h1")).to_contain_text("Raddle Teams")

    async def test_interactive_game_appears(self, player_actions_fixture: PlayerFixture):
        """Test that interactive game appears on correct steps."""
        actions, page, browser = await player_actions_fixture("test_player")
        browser.set_name("interactive_game")

        await page.goto("http://localhost:8000/tutorial")

        # Navigate to first interactive step (step 4)
        for _ in range(3):
            await page.click('button:has-text("Next")')
        await expect(page.locator("text=Step 4 of 8")).to_be_visible()

        # Check that interactive game is present
        await expect(page.locator("text=Try it yourself:")).to_be_visible()
        await expect(page.locator('h3:has-text("Tutorial Puzzle")')).to_be_visible()

        # Check for word ladder elements
        await expect(page.locator("text=DOWN")).to_be_visible()
        await expect(page.locator("text=EARTH")).to_be_visible()
        await expect(page.locator("text=Available Clues")).to_be_visible()

    async def test_tutorial_completion_navigation(self, player_actions_fixture: PlayerFixture):
        """Test navigation to final step."""
        actions, page, browser = await player_actions_fixture("test_player")
        browser.set_name("tutorial_completion")

        await page.goto("http://localhost:8000/tutorial")

        # Skip to last step by clicking next multiple times
        for _ in range(7):  # Go to step 8
            next_button = page.locator('button:has-text("Next")')
            if await next_button.is_enabled():
                await next_button.click()

        # Should be at last step
        await expect(page.locator("text=Step 8 of 8")).to_be_visible()
        await expect(page.locator("h2")).to_contain_text("Ready to Play!")

        # Should have "Start Playing!" button
        start_button = page.locator('button:has-text("Start Playing!")')
        await expect(start_button).to_be_visible()

        # Click start playing
        await start_button.click()

        # Should navigate back to landing page
        await expect(page).to_have_url("http://localhost:8000/")
