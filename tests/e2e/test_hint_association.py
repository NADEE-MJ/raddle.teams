"""Test that the correct hint is moved when solving words."""

from typing import Awaitable, Callable

from playwright.async_api import Page, expect

from tests.e2e.fixtures.browsers import BrowserSession
from tests.e2e.utilities.player_actions import PlayerActions

type PlayerFixture = Callable[[str], Awaitable[tuple[PlayerActions, Page, BrowserSession]]]


class TestHintAssociation:
    """Test hint association and movement."""

    async def test_south_hint_moves_when_solving_south(self, player_actions_fixture: PlayerFixture):
        """Test that SOUTH's hint (Cardinal direction) moves to used when SOUTH is solved."""
        actions, page, browser = await player_actions_fixture("test_player")
        browser.set_name("south_hint_movement")

        await page.goto("http://localhost:8000/tutorial")

        # Check that the "Cardinal direction" hint is in available hints initially
        await expect(page.locator("text=Cardinal direction that's DOWN on a map")).to_be_visible()

        # Solve SOUTH
        input_field = page.locator('input[placeholder*="Type"]')
        await input_field.fill("SOUTH")

        # Wait for success message
        await expect(page.locator("text=🎉 Correct!")).to_be_visible()

        # The cardinal direction hint should now be in Used Hints section, showing SOUTH instead of <>
        used_cardinal_hint = page.locator('text="Cardinal direction that\'s SOUTH on a map"')
        await expect(used_cardinal_hint).to_be_visible()

        # The original DOWN hint should no longer be in available hints
        await expect(page.locator("text=Cardinal direction that's DOWN on a map")).not_to_be_visible()

    async def test_used_hints_show_actual_word(self, player_actions_fixture: PlayerFixture):
        """Test that used hints show the actual solved word instead of <>."""
        actions, page, browser = await player_actions_fixture("test_player")
        browser.set_name("used_hints_display")

        await page.goto("http://localhost:8000/tutorial")

        # Solve SOUTH
        input_field = page.locator('input[placeholder*="Type"]')
        await input_field.fill("SOUTH")
        await expect(page.locator("text=🎉 Correct!")).to_be_visible()

        # Check that used hints section shows SOUTH instead of <>
        used_hints_section = page.locator("text=Used Hints").locator("..")

        # Should show "Cardinal direction that's SOUTH on a map" in used hints
        await expect(used_hints_section.locator('text="Cardinal direction that\'s SOUTH on a map"')).to_be_visible()

    async def test_mouth_hint_remains_available_after_solving_south(self, player_actions_fixture: PlayerFixture):
        """Test that MOUTH's hint stays available after solving SOUTH."""
        actions, page, browser = await player_actions_fixture("test_player")
        browser.set_name("mouth_hint_remains")

        await page.goto("http://localhost:8000/tutorial")

        # Solve SOUTH
        input_field = page.locator('input[placeholder*="Type"]')
        await input_field.fill("SOUTH")
        await expect(page.locator("text=🎉 Correct!")).to_be_visible()

        # The hint for MOUTH should still be available (it gets SOUTH substituted now)
        mouth_hint = page.locator('text="Change the first letter of SOUTH to get a part of the body"')
        await expect(mouth_hint).to_be_visible()
