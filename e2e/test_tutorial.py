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
        await expect(page.locator("h1")).to_contain_text("How to Play Raddle Teams")
        await expect(page.locator('button:has-text("← Back to Home")')).to_be_visible()

        # Check instruction sections
        await expect(page.locator("text=🎯 Game Objective")).to_be_visible()
        await expect(page.locator("text=🔄 How to Solve")).to_be_visible()
        await expect(page.locator("text=💡 Tips")).to_be_visible()
        await expect(page.locator("text=👥 Team Play")).to_be_visible()

        # Check game section
        await expect(page.locator("text=🎮 Try it yourself!")).to_be_visible()
        await expect(page.locator("text=Tutorial Puzzle")).to_be_visible()

    async def test_game_interface_elements(self, player_actions_fixture: PlayerFixture):
        actions, page, browser = await player_actions_fixture("test_player")
        browser.set_name("game_interface")

        await page.goto("http://localhost:8000/tutorial")

        # Check ladder display
        await expect(page.locator("text=DOWN")).to_be_visible()
        await expect(page.locator("text=EARTH")).to_be_visible()

        # Check controls
        await expect(page.locator("text=Solving Controls")).to_be_visible()
        await expect(page.locator("text=Direction:")).to_be_visible()
        await expect(page.locator('button:has-text("Forward (from DOWN)")')).to_be_visible()
        await expect(page.locator('button:has-text("Backward (from EARTH)")')).to_be_visible()

        # Check hints section
        await expect(page.locator("text=Available Hints")).to_be_visible()
        await expect(page.locator("text=Used Hints")).to_be_visible()

        # Check input field
        await expect(page.locator('input[placeholder*="Enter"]')).to_be_visible()
        await expect(page.locator('button:has-text("Submit")')).to_be_visible()

    async def test_hints_show_correctly(self, player_actions_fixture: PlayerFixture):
        actions, page, browser = await player_actions_fixture("test_player")
        browser.set_name("hints_display")

        await page.goto("http://localhost:8000/tutorial")

        # Should see hints with DOWN substituted for <>
        await expect(page.locator("text=Cardinal direction that's DOWN on a map")).to_be_visible()
        await expect(page.locator("text=Change the first letter of DOWN to get")).to_be_visible()

    async def test_basic_guess_functionality(self, player_actions_fixture: PlayerFixture):
        actions, page, browser = await player_actions_fixture("test_player")
        browser.set_name("basic_guess")

        await page.goto("http://localhost:8000/tutorial")

        # Try to make a guess (SOUTH should be the answer to the first clue)
        input_field = page.locator('input[placeholder*="Enter"]')
        submit_button = page.locator('button:has-text("Submit")')

        await input_field.fill("SOUTH")
        await submit_button.click()

        # Should see success message
        await expect(page.locator("text=🎉 Correct!")).to_be_visible()
        await expect(page.locator("text=SOUTH solved!")).to_be_visible()

    async def test_direction_switching(self, player_actions_fixture: PlayerFixture):
        actions, page, browser = await player_actions_fixture("test_player")
        browser.set_name("direction_switching")

        await page.goto("http://localhost:8000/tutorial")

        # Click backward direction
        backward_button = page.locator('button:has-text("Backward (from EARTH)")')
        await backward_button.click()

        # Should see EARTH substituted in hints now
        await expect(page.locator("text=Move the first letter of EARTH to the end")).to_be_visible()

        # Switch back to forward
        forward_button = page.locator('button:has-text("Forward (from DOWN)")')
        await forward_button.click()

        # Should see DOWN substituted again
        await expect(page.locator("text=Cardinal direction that's DOWN on a map")).to_be_visible()

    async def test_back_to_home_button(self, player_actions_fixture: PlayerFixture):
        actions, page, browser = await player_actions_fixture("test_player")
        browser.set_name("back_to_home")

        await page.goto("http://localhost:8000/tutorial")

        # Click back to home
        await page.click('button:has-text("← Back to Home")')

        # Should navigate back to landing page
        await expect(page).to_have_url("http://localhost:8000/")
        await expect(page.locator("h1")).to_contain_text("Raddle Teams")

    async def test_ready_to_play_button(self, player_actions_fixture: PlayerFixture):
        actions, page, browser = await player_actions_fixture("test_player")
        browser.set_name("ready_to_play")

        await page.goto("http://localhost:8000/tutorial")

        # Click ready to play with friends
        await page.click('button:has-text("Ready to Play with Friends!")')

        # Should navigate back to landing page
        await expect(page).to_have_url("http://localhost:8000/")
        await expect(page.locator("h1")).to_contain_text("Raddle Teams")
