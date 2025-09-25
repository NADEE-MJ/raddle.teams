from typing import Awaitable, Callable

from playwright.async_api import Page, expect

from backend.settings import Settings
from e2e.fixtures.browsers import BrowserSession
from e2e.utilities.admin_actions import AdminActions
from e2e.utilities.player_actions import PlayerActions

type AdminFixture = Callable[[], Awaitable[tuple[AdminActions, Page, BrowserSession]]]
type PlayerFixture = Callable[[str], Awaitable[tuple[PlayerActions, Page, BrowserSession]]]


class TestAdminRouteFlows:
    async def test_admin_login_flow(self, admin_actions_fixture: AdminFixture, settings: Settings):
        actions, page, browser = await admin_actions_fixture()
        browser.set_name("admin_login_flow")

        await actions.goto_admin_page()

        await expect(page.locator('[data-testid="admin-login-title"]')).to_be_visible()
        await expect(page.locator('[data-testid="admin-token-input"]')).to_be_visible()

        await actions.login(settings.ADMIN_PASSWORD)

        await expect(page.locator('[data-testid="admin-dashboard-title"]')).to_be_visible()
        await expect(page.locator('[data-testid="create-lobby-heading"]')).to_be_visible()
        await expect(page.locator('[data-testid="all-lobbies-heading"]')).to_be_visible()

        await browser.screenshot()

    async def test_admin_login_invalid_password(
        self,
        admin_actions_fixture: AdminFixture,
    ):
        actions, page, browser = await admin_actions_fixture()
        browser.set_name("admin_login_invalid_password")

        await actions.goto_admin_page()

        token_input = page.locator('[data-testid="admin-token-input"]')
        await token_input.fill("wrong_password")

        login_button = page.locator('[data-testid="admin-login-submit"]')
        await login_button.click()

        await expect(page.locator('[data-testid="admin-login-error"]:has-text("Invalid admin token")')).to_be_visible()
        await expect(page.locator('[data-testid="admin-login-title"]')).to_be_visible()

        await browser.screenshot()

    async def test_admin_create_lobby(self, admin_actions_fixture: AdminFixture, settings: Settings):
        actions, page, browser = await admin_actions_fixture()
        browser.set_name("admin_create_lobby")

        await actions.goto_admin_page()
        await actions.login(settings.ADMIN_PASSWORD)

        lobby_code = await actions.create_lobby("E2E Test Lobby")

        await expect(page.locator(f"text=Code: {lobby_code}")).to_be_visible()
        await expect(page.locator('h3:has-text("E2E Test Lobby")')).to_be_visible()

        await browser.screenshot("admin_lobby_created")

    async def test_admin_view_lobby_details(self, admin_actions_fixture: AdminFixture, settings: Settings):
        actions, page, browser = await admin_actions_fixture()
        browser.set_name("admin_view_lobby_details")

        await actions.goto_admin_page()
        await actions.login(settings.ADMIN_PASSWORD)

        lobby_code = await actions.create_lobby("View Details Test Lobby")

        await actions.peek_into_lobby(lobby_code)

        await expect(page.locator("text=Lobby Details:")).to_be_visible()
        await expect(page.locator('h2:has-text("Lobby Details: View Details Test Lobby")')).to_be_visible()
        lobby_info_section = page.locator("h3:has-text('Lobby Info')").locator("..")
        await expect(lobby_info_section.locator(f"text={lobby_code}")).to_be_visible()
        await expect(page.locator("text=No players in this lobby yet")).to_be_visible()

        await browser.screenshot()

    async def test_admin_logout(self, admin_actions_fixture: AdminFixture, settings: Settings):
        actions, page, browser = await admin_actions_fixture()
        browser.set_name("admin_logout")

        await actions.goto_admin_page()
        await actions.login(settings.ADMIN_PASSWORD)

        await expect(page.locator('[data-testid="admin-dashboard-title"]')).to_be_visible()

        logout_button = page.locator('[data-testid="logout-button"]')
        await logout_button.click()

        await expect(page.locator('[data-testid="admin-login-title"]')).to_be_visible()
        await expect(page.locator('[data-testid="admin-token-input"]')).to_be_visible()

        await browser.screenshot()

    async def test_admin_delete_lobby(self, admin_actions_fixture: AdminFixture, settings: Settings):
        actions, page, browser = await admin_actions_fixture()
        browser.set_name("admin_delete_lobby")

        await actions.goto_admin_page()
        await actions.login(settings.ADMIN_PASSWORD)

        lobby_code = await actions.create_lobby("Delete Test Lobby")
        await expect(page.locator(f"text=Code: {lobby_code}")).to_be_visible()

        delete_button = page.locator(f"text=Code: {lobby_code}").locator("..").locator("button:has-text('Delete')")
        if await delete_button.is_visible():
            await delete_button.click()
            await expect(page.locator(f"text=Code: {lobby_code}")).not_to_be_visible(timeout=5000)

        await browser.screenshot()

    async def test_admin_multiple_lobbies_management(self, admin_actions_fixture: AdminFixture, settings: Settings):
        actions, page, browser = await admin_actions_fixture()
        browser.set_name("admin_multiple_lobbies_management")

        await actions.goto_admin_page()
        await actions.login(settings.ADMIN_PASSWORD)

        lobby1_code = await actions.create_lobby("First Lobby")
        lobby2_code = await actions.create_lobby("Second Lobby")
        lobby3_code = await actions.create_lobby("Third Lobby")

        await expect(page.locator(f"text=Code: {lobby1_code}")).to_be_visible()
        await expect(page.locator(f"text=Code: {lobby2_code}")).to_be_visible()
        await expect(page.locator(f"text=Code: {lobby3_code}")).to_be_visible()

        await expect(page.locator('h3:has-text("First Lobby")')).to_be_visible()
        await expect(page.locator('h3:has-text("Second Lobby")')).to_be_visible()
        await expect(page.locator('h3:has-text("Third Lobby")')).to_be_visible()

        await browser.screenshot()

    async def test_admin_empty_lobby_name(self, admin_actions_fixture: AdminFixture, settings: Settings):
        actions, page, browser = await admin_actions_fixture()
        browser.set_name("admin_empty_lobby_name")

        await actions.goto_admin_page()
        await actions.login(settings.ADMIN_PASSWORD)

        lobby_name_input = page.locator('[data-testid="lobby-name-input"]')
        await lobby_name_input.fill("")

        create_button = page.locator('[data-testid="create-lobby-submit"]')
        await expect(create_button).to_be_disabled()

        await browser.screenshot()

    async def test_admin_lobby_refresh_behavior(
        self,
        admin_actions_fixture: AdminFixture,
        player_actions_fixture: PlayerFixture,
        settings: Settings,
    ):
        admin_actions, admin_page, admin_session = await admin_actions_fixture()
        admin_session.set_name("admin_lobby_refresh_ADMIN")
        player_actions, player_page, player_session = await player_actions_fixture("Refresh Test Player")
        player_session.set_name("admin_lobby_refresh_PLAYER")

        await admin_actions.goto_admin_page()
        await admin_actions.login(settings.ADMIN_PASSWORD)
        lobby_code = await admin_actions.create_lobby("Refresh Test Lobby")

        await admin_actions.peek_into_lobby(lobby_code)

        await player_actions.goto_home_page()
        await player_actions.fill_name_and_code("Refresh Test Player", lobby_code)
        await player_actions.join_lobby()

        await admin_actions.wait_for_players(1, 5000)

        await admin_page.reload(wait_until="networkidle")

        await expect(admin_page.locator("h1:has-text('Admin Dashboard')")).to_be_visible()

        await admin_session.screenshot()


class TestAdminRouteWebSocketFlows:
    async def test_admin_websocket_sees_player_join_updates(
        self,
        player_actions_fixture: PlayerFixture,
        admin_actions_fixture: AdminFixture,
        settings: Settings,
    ):
        admin_actions, admin_page, admin_session = await admin_actions_fixture()
        admin_session.set_name("admin_websocket_player_join_ADMIN")
        player_actions, player_page, player_session = await player_actions_fixture("Join Notify Player")
        player_session.set_name("admin_websocket_player_join_PLAYER")

        await admin_actions.goto_admin_page()
        await admin_actions.login(settings.ADMIN_PASSWORD)
        lobby_code = await admin_actions.create_lobby("Join Notification Test")

        await expect(admin_page.locator(f"text=Code: {lobby_code}")).to_be_visible()

        await admin_actions.peek_into_lobby(lobby_code)

        await player_actions.goto_home_page()
        await player_actions.fill_name_and_code("Join Notify Player", lobby_code)
        await player_actions.join_lobby()
        await expect(player_page.locator("p:has-text('Lobby Code:')")).to_be_visible()

        await admin_actions.wait_for_players(1, 1000)

        await expect(admin_page.locator("text=Players (1)")).to_be_visible()
        await expect(admin_page.locator("text=Join Notify Player")).to_be_visible()

        await admin_session.screenshot()

    async def test_admin_websocket_sees_multiple_players_join(
        self,
        player_actions_fixture: PlayerFixture,
        admin_actions_fixture: AdminFixture,
        settings: Settings,
    ):
        admin_actions, admin_page, admin_session = await admin_actions_fixture()
        admin_session.set_name("admin_websocket_multiple_joins_ADMIN")

        player1_actions, player1_page, player1_session = await player_actions_fixture("Multi Join One")
        player1_session.set_name("admin_websocket_multiple_joins_PLAYER1")

        player2_actions, player2_page, player2_session = await player_actions_fixture("Multi Join Two")
        player2_session.set_name("admin_websocket_multiple_joins_PLAYER2")

        await admin_actions.goto_admin_page()
        await admin_actions.login(settings.ADMIN_PASSWORD)
        lobby_code = await admin_actions.create_lobby("Multi Join Test")

        await admin_actions.peek_into_lobby(lobby_code)

        await player1_actions.goto_home_page()
        await player1_actions.fill_name_and_code("Multi Join One", lobby_code)
        await player1_actions.join_lobby()

        await admin_actions.wait_for_players(1, 5000)

        await player2_actions.goto_home_page()
        await player2_actions.fill_name_and_code("Multi Join Two", lobby_code)
        await player2_actions.join_lobby()

        await admin_actions.wait_for_players(2, 5000)
        await expect(admin_page.locator("text=Multi Join One")).to_be_visible()
        await expect(admin_page.locator("text=Multi Join Two")).to_be_visible()

        await admin_session.screenshot()

    async def test_admin_websocket_sees_player_leave_updates(
        self,
        player_actions_fixture: PlayerFixture,
        admin_actions_fixture: AdminFixture,
        settings: Settings,
    ):
        admin_actions, admin_page, admin_session = await admin_actions_fixture()
        admin_session.set_name("admin_websocket_player_leave_ADMIN")
        player_actions, player_page, player_session = await player_actions_fixture("Leave Notify Player")
        player_session.set_name("admin_websocket_player_leave_PLAYER")

        await admin_actions.goto_admin_page()
        await admin_actions.login(settings.ADMIN_PASSWORD)
        lobby_code = await admin_actions.create_lobby("Leave Notification Test")

        await admin_actions.peek_into_lobby(lobby_code)

        await player_actions.goto_home_page()
        await player_actions.fill_name_and_code("Leave Notify Player", lobby_code)
        await player_actions.join_lobby()

        await admin_actions.wait_for_players(1, 5000)
        await expect(admin_page.locator("text=Leave Notify Player")).to_be_visible()

        await player_actions.leave_lobby()

        await admin_actions.wait_for_players(0, 5000)
        await expect(admin_page.locator("text=Leave Notify Player")).not_to_be_visible(timeout=3000)

        await admin_session.screenshot()


class TestTeamManagementPlayerExperience:
    async def test_player_sees_team_assignment_changes_realtime(
        self, admin_actions_fixture: AdminFixture, player_actions_fixture: PlayerFixture, settings: Settings
    ):
        """Test that players see their team assignment changes in real-time"""
        admin_actions, admin_page, admin_session = await admin_actions_fixture()
        admin_session.set_name("team_assignment_realtime_ADMIN")

        player1_actions, player1_page, player1_session = await player_actions_fixture("Team Player 1")
        player1_session.set_name("team_assignment_realtime_PLAYER1")

        player2_actions, player2_page, player2_session = await player_actions_fixture("Team Player 2")
        player2_session.set_name("team_assignment_realtime_PLAYER2")

        await admin_actions.goto_admin_page()
        await admin_actions.login(settings.ADMIN_PASSWORD)
        lobby_code = await admin_actions.create_lobby("Player Team Assignment Test")

        # Both players join
        await player1_actions.goto_home_page()
        await player1_actions.fill_name_and_code("Team Player 1", lobby_code)
        await player1_actions.join_lobby()

        await player2_actions.goto_home_page()
        await player2_actions.fill_name_and_code("Team Player 2", lobby_code)
        await player2_actions.join_lobby()

        # Initially players see no teams
        await expect(player1_page.locator('[data-testid="player-teams-heading"]:has-text("Teams (0)")')).to_be_visible()
        await expect(player2_page.locator('[data-testid="player-teams-heading"]:has-text("Teams (0)")')).to_be_visible()
        await expect(player1_page.locator("text=No teams created yet")).to_be_visible()

        # Verify players see "No team" status in player list
        await expect(player1_page.locator('[data-testid="team-status-Team Player 1"]')).to_contain_text("No team")
        await expect(player2_page.locator('[data-testid="team-status-Team Player 2"]')).to_contain_text("No team")

        # Admin creates teams
        await admin_actions.peek_into_lobby(lobby_code)
        await admin_actions.wait_for_players(2, 5000)

        teams_input = admin_page.locator('input[type="number"]')
        await teams_input.fill("2")

        create_teams_button = admin_page.locator('[data-testid="create-teams-button"]')
        await create_teams_button.click()

        await expect(admin_page.locator('[data-testid="teams-heading"]')).to_contain_text("Teams (2)")

        # Players should see teams created and their assignments
        await expect(player1_page.locator('[data-testid="player-teams-heading"]')).to_contain_text("Teams (2)")
        await expect(player2_page.locator('[data-testid="player-teams-heading"]')).to_contain_text("Teams (2)")

        # Players should see Team 1 and Team 2 sections
        await expect(player1_page.locator('[data-testid="team-section-Team 1"]')).to_be_visible()
        await expect(player1_page.locator('[data-testid="team-section-Team 2"]')).to_be_visible()

        # Players should see themselves assigned to a team (highlighted in blue)
        await expect(player1_page.locator(".bg-blue-200:has-text('Team Player 1')")).to_be_visible(timeout=3000)
        await expect(player2_page.locator(".bg-blue-200:has-text('Team Player 2')")).to_be_visible(timeout=3000)

        # Players should see team status in player list updated
        player1_team_status = player1_page.locator("text=Team Player 1").locator("..").locator("div:has-text('Team')")
        player2_team_status = player2_page.locator("text=Team Player 2").locator("..").locator("div:has-text('Team')")
        await expect(player1_team_status).to_be_visible(timeout=3000)
        await expect(player2_team_status).to_be_visible(timeout=3000)

        # Admin moves Player 1 to unassigned
        player1_row = admin_page.locator("text=Team Player 1").locator("..")
        team_dropdown = player1_row.locator("select")
        await team_dropdown.select_option("")

        # Player 1 should see themselves move to unassigned in real-time
        await expect(player1_page.locator("text=Team Player 1").locator("..").locator("text=No team")).to_be_visible(
            timeout=3000
        )
        # Player 1 should no longer appear in any team section (should be de-highlighted)
        await expect(player1_page.locator(".bg-blue-200:has-text('Team Player 1')")).not_to_be_visible(timeout=3000)

        # Player 2 should also see Player 1 disappear from teams
        await expect(player2_page.locator(".bg-gray-200:has-text('Team Player 1')")).not_to_be_visible(timeout=3000)

        await admin_session.screenshot()
        await player1_session.screenshot()
        await player2_session.screenshot()
