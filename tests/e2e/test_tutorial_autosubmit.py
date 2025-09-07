"""Test auto-submit functionality in tutorial."""

from typing import Awaitable, Callable

from playwright.async_api import Page, expect

from tests.e2e.fixtures.browsers import BrowserSession
from tests.e2e.utilities.player_actions import PlayerActions

type PlayerFixture = Callable[[str], Awaitable[tuple[PlayerActions, Page, BrowserSession]]]


class TestTutorialAutoSubmit:
    """Test auto-submit functionality."""

    async def test_auto_submit_on_correct_answer(self, player_actions_fixture: PlayerFixture):
        """Test that correct answers auto-submit without button click."""
        actions, page, browser = await player_actions_fixture("test_player")
        browser.set_name("auto_submit_test")

        await page.goto("http://localhost:8000/tutorial")

        # Find the input field
        input_field = page.locator('input[placeholder*="Type"]')
        await expect(input_field).to_be_visible()

        # Type the correct answer (SOUTH) - should auto-submit
        await input_field.fill("SOUTH")

        # Should see success message automatically
        await expect(page.locator("text=🎉 Correct!")).to_be_visible()
        await expect(page.locator('text="SOUTH" solved!')).to_be_visible()

        # Input should clear automatically
        await expect(input_field).to_have_value("")

    async def test_no_submit_button_present(self, player_actions_fixture: PlayerFixture):
        """Test that there's no submit button - it's all automatic."""
        actions, page, browser = await player_actions_fixture("test_player")
        browser.set_name("no_submit_button")

        await page.goto("http://localhost:8000/tutorial")

        # Should not have a submit button
        submit_button = page.locator('button:has-text("Submit")')
        await expect(submit_button).not_to_be_visible()

        # Should have auto-submit placeholder text
        input_field = page.locator('input[placeholder*="auto-submits"]')
        await expect(input_field).to_be_visible()

    async def test_partial_word_does_not_submit(self, player_actions_fixture: PlayerFixture):
        """Test that partial words don't trigger submission."""
        actions, page, browser = await player_actions_fixture("test_player")
        browser.set_name("partial_word_test")

        await page.goto("http://localhost:8000/tutorial")

        # Find the input field
        input_field = page.locator('input[placeholder*="Type"]')

        # Type partial word
        await input_field.fill("SOU")

        # Should not see success message yet
        success_msg = page.locator("text=🎉 Correct!")
        await expect(success_msg).not_to_be_visible()

        # Input should still have partial value
        await expect(input_field).to_have_value("SOU")

    async def test_hint_moves_to_used_after_correct_answer(self, player_actions_fixture: PlayerFixture):
        """Test that the correct hint moves to used section."""
        actions, page, browser = await player_actions_fixture("test_player")
        browser.set_name("hint_movement_test")

        await page.goto("http://localhost:8000/tutorial")

        # Count initial available hints
        available_section = page.locator("text=Available Hints").locator("..")
        initial_available = await available_section.locator(".p-3").count()

        # Count initial used hints
        used_section = page.locator("text=Used Hints").locator("..")
        initial_used = await used_section.locator(".p-3").count()

        # Submit correct answer
        input_field = page.locator('input[placeholder*="Type"]')
        await input_field.fill("SOUTH")

        # Wait for success message
        await expect(page.locator("text=🎉 Correct!")).to_be_visible()

        # Should have one less available hint and one more used hint
        final_available = await available_section.locator(".p-3").count()
        final_used = await used_section.locator(".p-3").count()

        assert final_available == initial_available - 1
        assert final_used == initial_used + 1
