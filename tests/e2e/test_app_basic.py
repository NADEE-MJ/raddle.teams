"""
Phase 1: Basic Application Functionality Tests

Tests the core application components:
- Home page loads correctly
- Admin page loads and authentication works
- Basic navigation between pages
"""

from playwright.async_api import expect

from tests.fixtures.browsers import BrowserSession


class TestAppBasic:
    """Test basic application functionality."""

    async def test_home_page_loads(self, server_url: str, browser: BrowserSession):
        """Test that the home page loads and displays correctly."""
        page = await browser.start()

        print("here")
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
        await page.screenshot(path="tests/recordings/screenshots/home_page.png")

        # await page.video.save_as("tests/recordings/videos/home_page_video.mp4")
        await browser.stop()

        print("✅ Home page loaded successfully")

    # async def test_admin_page_loads(self, page: Page, server_url: str):
    #     """Test that the admin page loads and displays login form."""
    #     await page.goto(f"{server_url}/admin")
    #     await page.wait_for_load_state("networkidle")

    #     # Check for admin login elements
    #     token_input = page.locator('input[type="password"]')
    #     await expect(token_input).to_be_visible()

    #     login_button = page.locator('button:has-text("Login")')
    #     await expect(login_button).to_be_visible()

    #     # Take a screenshot
    #     await page.screenshot(path="tests/recordings/screenshots/admin_page.png")

    #     print("✅ Admin page loaded with login form")

    # async def test_admin_authentication(self, page: Page, server_url: str):
    #     """Test admin authentication with correct password."""
    #     await page.goto(f"{server_url}/admin")
    #     await page.wait_for_load_state("networkidle")

    #     # Fill in the admin password
    #     token_input = page.locator('input[type="password"]')
    #     await token_input.fill("test")

    #     # Click login button
    #     login_button = page.locator('button:has-text("Login")')
    #     await login_button.click()

    #     # Wait for login to complete
    #     await page.wait_for_timeout(2000)

    #     # Take a screenshot of the result
    #     await page.screenshot(path="tests/recordings/screenshots/admin_logged_in.png")

    #     print("✅ Admin authentication test completed")

    # async def test_navigation_between_pages(self, page: Page, server_url: str):
    #     """Test navigation between different pages."""
    #     # Start at home page
    #     await page.goto(f"{server_url}/")
    #     await page.wait_for_load_state("networkidle")

    #     # Navigate to admin page
    #     await page.goto(f"{server_url}/admin")
    #     await page.wait_for_load_state("networkidle")

    #     # Navigate back to home
    #     await page.goto(f"{server_url}/")
    #     await page.wait_for_load_state("networkidle")

    #     # Take final screenshot
    #     await page.screenshot(path="tests/recordings/screenshots/navigation_test.png")

    #     print("✅ Page navigation test completed")
