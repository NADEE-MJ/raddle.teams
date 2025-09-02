import re
from playwright.async_api import Page, expect
from backend.settings import settings


class AdminActions:
    def __init__(self, page: Page, server_url: str):
        self.page = page
        self.server_url = server_url

    async def goto_admin_page(self):
        await self.page.goto(f"{self.server_url}/admin", wait_until="networkidle")

        await expect(self.page.locator('[data-testid="admin-login-title"], [data-testid="admin-dashboard-title"]')).to_be_visible()

    async def login(self, admin_token: str = None):
        if admin_token is None:
            admin_token = settings.ADMIN_PASSWORD

        token_input = self.page.locator('[data-testid="admin-token-input"]')
        await token_input.fill(admin_token)

        login_button = self.page.locator('[data-testid="admin-login-submit"]')
        await login_button.click()

        await expect(self.page.locator('[data-testid="admin-dashboard-title"]')).to_be_visible()

    async def create_lobby(self, lobby_name: str = "Test Lobby") -> str:
        name_input = self.page.locator('[data-testid="lobby-name-input"]')
        await name_input.fill(lobby_name)

        create_button = self.page.locator('[data-testid="create-lobby-submit"]')
        await create_button.click()

        lobby_code_element = self.page.locator("span.font-mono.font-bold").first
        await expect(lobby_code_element).to_be_visible()
        lobby_code = await lobby_code_element.text_content()

        return lobby_code.strip()

    async def view_all_lobbies(self):
        refresh_button = self.page.locator('[data-testid="refresh-lobbies-button"]')
        await refresh_button.click()

        await expect(self.page.locator('[data-testid="all-lobbies-heading"]')).to_be_visible()

    async def get_first_lobby(self):
        await self.view_all_lobbies()

        lobby_code_element = self.page.locator("span.font-mono.font-bold").first
        await expect(lobby_code_element).to_be_visible()
        code = await lobby_code_element.text_content()
        return code.strip() if code else ""

    async def peek_into_lobby(self, lobby_code: str):
        # Find the lobby in the list and get its View Details button
        # We'll look for any view details button since we can't easily get lobby ID from code
        await expect(self.page.locator(f"text=Code: {lobby_code}")).to_be_visible()
        
        # Find the view details button associated with this lobby by finding the lobby card
        lobby_row = self.page.locator(f"text=Code: {lobby_code}").locator("..").locator("..")
        view_details_button = lobby_row.locator('button:has-text("View Details")')
        await view_details_button.click()

        await expect(self.page.locator('h2:has-text("Lobby Details")')).to_be_visible()

    async def logout(self):
        logout_button = self.page.locator('[data-testid="logout-button"]')
        await logout_button.click()

        await expect(self.page.locator('[data-testid="admin-login-title"]')).to_be_visible()

    async def refresh_lobbies(self):
        refresh_button = self.page.locator('[data-testid="refresh-lobbies-button"]')
        await refresh_button.click()

    async def get_lobby_player_count(self, lobby_code: str) -> int:
        lobby_info = self.page.locator(f"text={lobby_code}").locator("..")
        player_count_text = await lobby_info.locator("text=/\\d+ players?/").text_content()

        match = re.search(r"(\d+)", player_count_text)
        return int(match.group(1)) if match else 0

    async def wait_for_players(self, expected_count: int, timeout: int = 30000):
        await expect(self.page.locator(f"text=/Players \\({expected_count}\\)/")).to_be_visible(timeout=timeout)

    async def delete_lobby(self, lobby_code: str):
        lobby_card = self.page.locator(f"text=Code: {lobby_code}").locator("..")
        delete_button = lobby_card.locator('button:has-text("Delete")')
        await delete_button.click()

        await expect(self.page.locator(f"text=Code: {lobby_code}")).not_to_be_visible(timeout=5000)
