"""Test tutorial route and functionality."""

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
        await expect(tutorial_button).to_contain_text('How to Play')
        
        # Click tutorial button
        await tutorial_button.click()
        
        # Verify navigation to tutorial page
        await expect(page).to_have_url('http://localhost:8000/tutorial')
        await expect(page.locator('h1')).to_contain_text('How to Play Raddle Teams')

    async def test_tutorial_page_structure(self, player_actions_fixture: PlayerFixture):
        """Test that tutorial page has expected structure."""
        actions, page, browser = await player_actions_fixture("test_player")
        browser.set_name("tutorial_page_structure")
        
        # Navigate to tutorial page directly
        await page.goto('http://localhost:8000/tutorial')
        
        # Check main elements are present
        await expect(page.locator('h1')).to_contain_text('How to Play Raddle Teams')
        await expect(page.locator('button:has-text("Skip Tutorial")')).to_be_visible()
        
        # Check progress indicator
        progress_dots = page.locator('[class*="rounded-full"]')
        await expect(progress_dots).to_have_count(8)  # 8 tutorial steps
        
        # Check step counter
        await expect(page.locator('text=Step 1 of 8')).to_be_visible()
        
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
        
        await page.goto('http://localhost:8000/tutorial')
        
        # Start at step 1
        await expect(page.locator('text=Step 1 of 8')).to_be_visible()
        await expect(page.locator('h2')).to_contain_text('Welcome to Raddle Teams!')
        
        # Navigate to step 2
        await page.click('button:has-text("Next")')
        await expect(page.locator('text=Step 2 of 8')).to_be_visible()
        await expect(page.locator('h2')).to_contain_text('Understanding Word Ladders')
        
        # Navigate back to step 1
        await page.click('button:has-text("Previous")')
        await expect(page.locator('text=Step 1 of 8')).to_be_visible()

    async def test_skip_tutorial_functionality(self, player_actions_fixture: PlayerFixture):
        """Test skip tutorial button functionality."""
        actions, page, browser = await player_actions_fixture("test_player")
        browser.set_name("skip_tutorial")
        
        await page.goto('http://localhost:8000/tutorial')
        
        # Click skip tutorial
        await page.click('button:has-text("Skip Tutorial")')
        
        # Should navigate back to landing page
        await expect(page).to_have_url('http://localhost:8000/')
        await expect(page.locator('h1')).to_contain_text('Raddle Teams')

    async def test_interactive_word_chain_display(self, player_actions_fixture: PlayerFixture):
        """Test that interactive word chain game displays correctly."""
        actions, page, browser = await player_actions_fixture("test_player")
        browser.set_name("word_chain_display")
        
        await page.goto('http://localhost:8000/tutorial')
        
        # Navigate to first interactive step (step 4)
        for _ in range(3):
            await page.click('button:has-text("Next")')
        await expect(page.locator('text=Step 4 of 8')).to_be_visible()
        
        # Check that interactive game is present
        await expect(page.locator('text=Try it yourself:')).to_be_visible()
        
        # Check for word ladder display
        await expect(page.locator('text=Tutorial Puzzle')).to_be_visible()
        await expect(page.locator('text=DOWN')).to_be_visible()
        await expect(page.locator('text=EARTH')).to_be_visible()
        
        # Check for clue bank
        await expect(page.locator('text=Available Clues')).to_be_visible()
        
        # Check for missing word placeholders
        missing_words = page.locator('text=?????')
        await expect(missing_words.first()).to_be_visible()

    async def test_word_chain_correct_answer(self, player_actions_fixture: PlayerFixture):
        """Test submitting correct answer in word chain game."""
        actions, page, browser = await player_actions_fixture("test_player")
        browser.set_name("word_chain_correct")
        
        await page.goto('http://localhost:8000/tutorial')
        await page.click('button:has-text("Next")')  # Go to step 2
        
        # Enter correct answer (BAT for CAT -> ??? chain)
        guess_input = page.locator('input[placeholder*="letter word"]')
        guess_button = page.locator('button:has-text("Guess")')
        
        await guess_input.fill('BAT')
        await guess_button.click()
        
        # Should show success feedback
        success_feedback = page.locator('text=🎉 Correct!')
        await expect(success_feedback).to_be_visible()
        
        # Next button should become enabled
        next_button = page.locator('button:has-text("Next")')
        await expect(next_button).to_be_enabled()

    async def test_hint_functionality(self, player_actions_fixture: PlayerFixture):
        """Test hint system in word chain game."""
        actions, page, browser = await player_actions_fixture("test_player")
        browser.set_name("hint_functionality")
        
        await page.goto('http://localhost:8000/tutorial')
        await page.click('button:has-text("Next")')  # Go to step 2
        
        # Click show hint
        hint_button = page.locator('button:has-text("Show Hint")')
        await expect(hint_button).to_be_visible()
        await hint_button.click()
        
        # Should show hint with first and last letter
        hint_text = page.locator('text=Hint: B_T')  # BAT with middle letter hidden
        await expect(hint_text).to_be_visible()
        
        # Button should change to "Hide Hint"
        hide_hint_button = page.locator('button:has-text("Hide Hint")')
        await expect(hide_hint_button).to_be_visible()

    async def test_invalid_input_handling(self, player_actions_fixture: PlayerFixture):
        """Test handling of invalid input in word games."""
        actions, page, browser = await player_actions_fixture("test_player")
        browser.set_name("invalid_input")
        
        await page.goto('http://localhost:8000/tutorial')
        await page.click('button:has-text("Next")')  # Go to interactive step
        
        guess_input = page.locator('input[placeholder*="letter word"]')
        guess_button = page.locator('button:has-text("Guess")')
        
        # Test empty input
        await guess_button.click()
        feedback = page.locator('[class*="bg-orange-100"]')
        await expect(feedback).to_contain_text('Please enter a word')
        
        # Test wrong length input
        await guess_input.fill('A')
        await guess_button.click()
        await expect(feedback).to_contain_text('must be 3 letters long')
        
        # Test non-alphabetic input
        await guess_input.fill('123')
        await guess_button.click()
        await expect(feedback).to_contain_text('must contain only letters')