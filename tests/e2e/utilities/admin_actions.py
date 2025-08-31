import re
from playwright.async_api import Page, expect
from backend.settings import settings


class AdminActions:
    def __init__(self, page: Page, server_url: str):
        self.page = page
        self.server_url = server_url

    async def goto_admin_page(self):
        await self.page.goto(f"{self.server_url}/admin", wait_until="networkidle")

        await expect(
            self.page.locator(
                "h1:has-text('Admin Login'), h1:has-text('Admin Dashboard')"
            )
        ).to_be_visible()

    async def login(self, admin_token: str = None):
        if admin_token is None:
            admin_token = settings.ADMIN_PASSWORD

        token_input = self.page.locator(
            'input[type="password"], input[placeholder*="token"], input[placeholder*="Token"]'
        )
        await token_input.fill(admin_token)

        login_button = self.page.locator(
            'button:has-text("Login"), button[type="submit"]'
        )
        await login_button.click()

        await expect(self.page.locator("text=Admin Dashboard")).to_be_visible()

    async def create_lobby(self, lobby_name: str = "Test Lobby") -> str:
        name_input = self.page.locator('input[placeholder="Lobby name"]')
        await name_input.fill(lobby_name)

        create_button = self.page.locator('button:has-text("Create Lobby")')
        await create_button.click()

        lobby_code_element = self.page.locator("span.font-mono.font-bold").first
        await expect(lobby_code_element).to_be_visible()
        lobby_code = await lobby_code_element.text_content()

        return lobby_code.strip()

    async def view_all_lobbies(self):
        refresh_button = self.page.locator('button:has-text("Refresh")')
        await refresh_button.click()

        await expect(self.page.locator("text=All Lobbies")).to_be_visible()

    async def get_first_lobby(self):
        await self.view_all_lobbies()

        lobby_code_element = self.page.locator("span.font-mono.font-bold").first
        await expect(lobby_code_element).to_be_visible()
        code = await lobby_code_element.text_content()
        return code.strip() if code else ""

    async def peek_into_lobby(self, lobby_code: str):
        lobby_card = self.page.locator(f"text=Code: {lobby_code}").locator("..")
        view_details_button = lobby_card.locator('button:has-text("View Details")')
        await view_details_button.click()

        await expect(self.page.locator("text=Lobby Details:")).to_be_visible()

    async def logout(self):
        logout_button = self.page.locator('button:has-text("Logout")')
        await logout_button.click()

        await expect(self.page.locator("h1:has-text('Admin Login')")).to_be_visible()

    async def refresh_lobbies(self):
        refresh_button = self.page.locator('button:has-text("Refresh")')
        await refresh_button.click()

    async def get_lobby_player_count(self, lobby_code: str) -> int:
        lobby_info = self.page.locator(f"text={lobby_code}").locator("..")
        player_count_text = await lobby_info.locator(
            "text=/\\d+ players?/"
        ).text_content()

        match = re.search(r"(\d+)", player_count_text)
        return int(match.group(1)) if match else 0

    async def wait_for_players(self, expected_count: int, timeout: int = 30000):
        await expect(
            self.page.locator(f"text=/{expected_count} players?/")
        ).to_be_visible(timeout=timeout)

    async def delete_lobby(self, lobby_code: str):
        lobby_card = self.page.locator(f"text=Code: {lobby_code}").locator("..")
        delete_button = lobby_card.locator('button:has-text("Delete")')
        await delete_button.click()

        await expect(self.page.locator(f"text=Code: {lobby_code}")).not_to_be_visible(
            timeout=5000
        )
