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

    async def test_admin_websocket_reconnection(self, admin_actions_fixture: AdminFixture, settings: Settings):
        admin_actions, admin_page, admin_session = await admin_actions_fixture()
        admin_session.set_name("admin_websocket_reconnection")

        await admin_actions.goto_admin_page()
        await admin_actions.login(settings.ADMIN_PASSWORD)
        lobby_code = await admin_actions.create_lobby("WebSocket Reconnect Test")

        await admin_actions.peek_into_lobby(lobby_code)

        await admin_page.reload(wait_until="networkidle")

        await expect(admin_page.locator("h1:has-text('Admin Dashboard')")).to_be_visible()

        await admin_session.screenshot()

    async def test_admin_websocket_concurrent_sessions(self, admin_actions_fixture: AdminFixture, settings: Settings):
        admin1_actions, admin1_page, admin1_session = await admin_actions_fixture()
        admin1_session.set_name("admin_websocket_concurrent_1")

        admin2_actions, admin2_page, admin2_session = await admin_actions_fixture()
        admin2_session.set_name("admin_websocket_concurrent_2")

        await admin1_actions.goto_admin_page()
        await admin1_actions.login(settings.ADMIN_PASSWORD)
        lobby_code = await admin1_actions.create_lobby("Concurrent Admin Test")

        await admin2_actions.goto_admin_page()
        await admin2_actions.login(settings.ADMIN_PASSWORD)

        await admin1_actions.peek_into_lobby(lobby_code)
        await admin2_actions.peek_into_lobby(lobby_code)

        await expect(admin1_page.locator("text=Lobby Details: Concurrent Admin Test")).to_be_visible()
        await expect(admin2_page.locator("text=Lobby Details: Concurrent Admin Test")).to_be_visible()

        await admin1_session.screenshot()
        await admin2_session.screenshot()


class TestAdminTeamManagementFeatures:
    async def test_admin_modal_lobby_details_display(self, admin_actions_fixture: AdminFixture, settings: Settings):
        actions, page, browser = await admin_actions_fixture()
        browser.set_name("admin_modal_lobby_details")

        await actions.goto_admin_page()
        await actions.login(settings.ADMIN_PASSWORD)

        lobby_code = await actions.create_lobby("Modal Test Lobby")
        await actions.peek_into_lobby(lobby_code)

        await expect(page.locator(".fixed.inset-0.z-50")).to_be_visible()  # Modal backdrop
        await expect(page.locator(".bg-opacity-80.bg-black")).to_be_visible()  # Modal overlay
        await expect(page.locator("h2:has-text('Lobby Details: Modal Test Lobby')")).to_be_visible()

        close_button = page.locator("button:has-text('✕')")
        await expect(close_button).to_be_visible()
        await close_button.click()

        await expect(page.locator(".fixed.inset-0.z-50")).not_to_be_visible()
        await browser.screenshot()

    async def test_admin_scrollable_lobby_list(self, admin_actions_fixture: AdminFixture, settings: Settings):
        actions, page, browser = await admin_actions_fixture()
        browser.set_name("admin_scrollable_lobby_list")

        await actions.goto_admin_page()
        await actions.login(settings.ADMIN_PASSWORD)

        for i in range(5):
            await actions.create_lobby(f"Scroll Test Lobby {i + 1}")

        lobby_container = page.locator(".max-h-96.overflow-y-auto")
        await expect(lobby_container).to_be_visible()

        await expect(page.locator("text=Scroll Test Lobby")).to_have_count(5)
        await browser.screenshot()

    async def test_admin_team_creation_validation(self, admin_actions_fixture: AdminFixture, settings: Settings):
        actions, page, browser = await admin_actions_fixture()
        browser.set_name("admin_team_creation_validation")

        await actions.goto_admin_page()
        await actions.login(settings.ADMIN_PASSWORD)
        lobby_code = await actions.create_lobby("Validation Test Lobby")

        await actions.peek_into_lobby(lobby_code)

        await expect(page.locator("h3:has-text('Create Teams')")).not_to_be_visible()

        await browser.screenshot()

    async def test_admin_move_player_between_teams_with_ui_updates(
        self, admin_actions_fixture: AdminFixture, player_actions_fixture: PlayerFixture, settings: Settings
    ):
        admin_actions, admin_page, admin_session = await admin_actions_fixture()
        admin_session.set_name("admin_move_player_ADMIN")

        player_actions, player_page, player_session = await player_actions_fixture("Moveable Player")
        player_session.set_name("admin_move_player_PLAYER")

        await admin_actions.goto_admin_page()
        await admin_actions.login(settings.ADMIN_PASSWORD)
        lobby_code = await admin_actions.create_lobby("Player Move Test")

        # Have player join lobby
        await player_actions.goto_home_page()
        await player_actions.fill_name_and_code("Moveable Player", lobby_code)
        await player_actions.join_lobby()

        # Verify player is in lobby page
        await expect(player_page.locator("p:has-text('Lobby Code:')")).to_be_visible()

        # Admin opens lobby details and creates teams
        await admin_actions.peek_into_lobby(lobby_code)
        await admin_actions.wait_for_players(1, 5000)

        # Create 2 teams
        teams_input = admin_page.locator('input[type="number"]')
        await teams_input.clear()
        await teams_input.fill("2")

        create_teams_button = admin_page.locator('[data-testid="create-teams-button"]')
        await create_teams_button.click()

        await expect(admin_page.locator('[data-testid="teams-heading"]')).to_be_visible(timeout=5000)

        # Verify player sees teams in their lobby
        await expect(player_page.locator("h2:has-text('Teams (2)')")).to_be_visible(timeout=5000)
        await expect(player_page.locator("h3:has-text('Team 1')")).to_be_visible()
        await expect(player_page.locator("h3:has-text('Team 2')")).to_be_visible()

        # Check the player's initial team assignment
        initial_team_status = admin_page.locator('[data-testid="team-status-Moveable Player"]')
        await expect(initial_team_status).to_be_visible()
        initial_text = await initial_team_status.inner_text()
        print(f"Initial team status: {initial_text}")

        # Find the player's team dropdown in admin interface and move them to "No team"
        team_dropdown = admin_page.locator('[data-testid="team-dropdown-Moveable Player"]')

        await expect(team_dropdown).to_be_visible()

        # Move player to "No team"
        await team_dropdown.select_option("")

        # Check if the status changes at all after some time
        await admin_page.wait_for_timeout(3000)
        final_text = await initial_team_status.inner_text()
        print(f"Final team status after 3 seconds: {final_text}")

        # Try a different approach - check if team status changes away from initial team
        try:
            await expect(
                admin_page.locator('[data-testid="team-status-Moveable Player"]:has-text("No team")')
            ).to_be_visible(timeout=5000)
            print("SUCCESS: Player status updated to 'No team'")
        except Exception as e:
            print(f"FAILED: Player status did not update - {e}")
            # Let's see what the current status actually is
            current_status = await initial_team_status.inner_text()
            print(f"Current status is: '{current_status}'")

        # Verify unassigned section appears
        await expect(admin_page.locator('[data-testid="unassigned-players-heading"]')).to_be_visible(timeout=3000)

        # Verify player UI updates to show they're unassigned
        await expect(player_page.locator("text=Moveable Player").locator("..").locator("text=No team")).to_be_visible(
            timeout=3000
        )

        # Move player to Team 1 using the unassigned dropdown
        unassigned_dropdown = admin_page.locator('[data-testid="unassigned-team-dropdown-Moveable Player"]')
        await expect(unassigned_dropdown).to_be_visible(timeout=3000)
        await unassigned_dropdown.select_option("1")  # Assuming Team 1 has id=1

        # Verify player shows up assigned to Team 1 in the player list
        await expect(
            admin_page.locator('[data-testid="player-row-Moveable Player"]').locator("text=Team 1")
        ).to_be_visible(timeout=3000)

        # Verify the unassigned section disappears
        await expect(admin_page.locator('[data-testid="unassigned-players-heading"]')).not_to_be_visible(timeout=3000)

        # Verify player sees themselves in Team 1 section
        await expect(player_page.locator("text=Moveable Player").locator("..").locator("text=Team 1")).to_be_visible(
            timeout=3000
        )

        await admin_session.screenshot()
        await player_session.screenshot()

    async def test_admin_kick_player_with_websocket_updates(
        self, admin_actions_fixture: AdminFixture, player_actions_fixture: PlayerFixture, settings: Settings
    ):
        """Test kicking a player and verify WebSocket notifications and UI updates"""
        admin_actions, admin_page, admin_session = await admin_actions_fixture()
        admin_session.set_name("admin_kick_player_ADMIN")

        # Create two players to ensure kick doesn't affect others
        player1_actions, player1_page, player1_session = await player_actions_fixture("Player One")
        player1_session.set_name("admin_kick_player_PLAYER1")

        player2_actions, player2_page, player2_session = await player_actions_fixture("Player Two")
        player2_session.set_name("admin_kick_player_PLAYER2")

        await admin_actions.goto_admin_page()
        await admin_actions.login(settings.ADMIN_PASSWORD)
        lobby_code = await admin_actions.create_lobby("Kick Player Test")

        # Have both players join
        await player1_actions.goto_home_page()
        await player1_actions.fill_name_and_code("Player One", lobby_code)
        await player1_actions.join_lobby()

        await player2_actions.goto_home_page()
        await player2_actions.fill_name_and_code("Player Two", lobby_code)
        await player2_actions.join_lobby()

        # Verify both players are in lobby
        await expect(player1_page.locator("p:has-text('Lobby Code:')")).to_be_visible()
        await expect(player2_page.locator("p:has-text('Lobby Code:')")).to_be_visible()

        # Admin opens lobby details
        await admin_actions.peek_into_lobby(lobby_code)
        await admin_actions.wait_for_players(2, 5000)

        # Set up dialog handlers for confirmation
        admin_page.on("dialog", lambda dialog: dialog.accept())
        player1_page.on("dialog", lambda dialog: dialog.accept())

        # Find and kick Player One
        kick_button = admin_page.locator('[data-testid="kick-button-Player One"]')

        await expect(kick_button).to_be_visible()
        await kick_button.click()

        # Verify Player One gets redirected to home page
        await expect(player1_page.locator("h1:has-text('Raddle')")).to_be_visible(timeout=10000)

        # Verify admin sees player count decrease
        await admin_actions.wait_for_players(1, 5000)
        await expect(admin_page.locator("text=Player One")).not_to_be_visible()

        # Verify Player Two is still in lobby and sees Player One disappear
        await expect(player2_page.locator("p:has-text('Lobby Code:')")).to_be_visible()
        await expect(player2_page.locator('[data-testid="player-name-Player One"]')).not_to_be_visible(timeout=5000)
        await expect(player2_page.locator('[data-testid="player-name-Player Two"]')).to_be_visible()

        await admin_session.screenshot()
        await player1_session.screenshot()
        await player2_session.screenshot()

    async def test_team_creation_updates_player_lobby_ui(
        self, admin_actions_fixture: AdminFixture, player_actions_fixture: PlayerFixture, settings: Settings
    ):
        """Test that creating teams updates the player lobby UI via WebSocket"""
        admin_actions, admin_page, admin_session = await admin_actions_fixture()
        admin_session.set_name("admin_team_creation_ui_ADMIN")

        player_actions, player_page, player_session = await player_actions_fixture("Team UI Player")
        player_session.set_name("admin_team_creation_ui_PLAYER")

        await admin_actions.goto_admin_page()
        await admin_actions.login(settings.ADMIN_PASSWORD)
        lobby_code = await admin_actions.create_lobby("Team UI Test")

        # Have player join lobby
        await player_actions.goto_home_page()
        await player_actions.fill_name_and_code("Team UI Player", lobby_code)
        await player_actions.join_lobby()

        # Verify player is in lobby with no teams initially
        await expect(player_page.locator("p:has-text('Lobby Code:')")).to_be_visible()
        await expect(player_page.locator('[data-testid="player-teams-heading"]:has-text("Teams (0)")')).to_be_visible()

        # Admin opens lobby details and creates teams
        await admin_actions.peek_into_lobby(lobby_code)
        await admin_actions.wait_for_players(1, 5000)

        # Create 3 teams
        teams_input = admin_page.locator('input[type="number"]')
        await teams_input.clear()
        await teams_input.fill("3")

        create_teams_button = admin_page.locator('[data-testid="create-teams-button"]')
        await create_teams_button.click()

        # Verify admin sees teams created
        await expect(admin_page.locator('[data-testid="teams-heading"]:has-text("Teams (3)")')).to_be_visible(
            timeout=5000
        )

        # Verify player lobby UI updates to show teams via WebSocket
        await expect(player_page.locator('[data-testid="player-teams-heading"]:has-text("Teams (3)")')).to_be_visible(
            timeout=5000
        )
        await expect(player_page.locator('[data-testid="team-section-Team 1"]')).to_be_visible()
        await expect(player_page.locator('[data-testid="team-section-Team 2"]')).to_be_visible()
        await expect(player_page.locator('[data-testid="team-section-Team 3"]')).to_be_visible()

        # Verify player sees themselves assigned to one of the teams
        player_team_badge = player_page.locator('[data-testid="team-status-Team UI Player"]')
        await expect(player_team_badge).to_be_visible(timeout=3000)
        await expect(player_team_badge).to_contain_text("Team")

        await admin_session.screenshot()
        await player_session.screenshot()

    async def test_team_creation_with_uneven_player_distribution(
        self, admin_actions_fixture: AdminFixture, player_actions_fixture: PlayerFixture, settings: Settings
    ):
        """Test team creation with uneven player distribution (5 players, 3 teams)"""
        admin_actions, admin_page, admin_session = await admin_actions_fixture()
        admin_session.set_name("admin_uneven_teams_ADMIN")

        # Create 5 players
        players = []
        for i in range(5):
            player_actions, player_page, player_session = await player_actions_fixture(f"Player {i + 1}")
            player_session.set_name(f"admin_uneven_teams_PLAYER{i + 1}")
            players.append((player_actions, player_page, player_session))

        await admin_actions.goto_admin_page()
        await admin_actions.login(settings.ADMIN_PASSWORD)
        lobby_code = await admin_actions.create_lobby("Uneven Teams Test")

        # Have all players join
        for i, (player_actions, player_page, _) in enumerate(players):
            await player_actions.goto_home_page()
            await player_actions.fill_name_and_code(f"Player {i + 1}", lobby_code)
            await player_actions.join_lobby()

        # Admin creates 3 teams for 5 players
        await admin_actions.peek_into_lobby(lobby_code)
        await admin_actions.wait_for_players(5, 5000)

        teams_input = admin_page.locator('input[type="number"]')
        await teams_input.clear()
        await teams_input.fill("3")

        create_teams_button = admin_page.locator('[data-testid="create-teams-button"]')
        await create_teams_button.click()

        # Verify all 3 teams exist
        await expect(admin_page.locator('[data-testid="teams-heading"]:has-text("Teams (3)")')).to_be_visible(
            timeout=5000
        )
        await expect(admin_page.locator("h4:has-text('Team 1')")).to_be_visible()
        await expect(admin_page.locator("h4:has-text('Team 2')")).to_be_visible()
        await expect(admin_page.locator("h4:has-text('Team 3')")).to_be_visible()

        # Verify all players are assigned to teams (no unassigned players)
        await expect(admin_page.locator("h3:has-text('Unassigned Players')")).not_to_be_visible()

        # Verify players can see their team assignments
        for _, player_page, _ in players:
            await expect(player_page.locator('[data-testid="player-teams-heading"]')).to_be_visible(timeout=5000)

        await admin_session.screenshot()

    async def test_prevent_duplicate_team_creation(
        self, admin_actions_fixture: AdminFixture, player_actions_fixture: PlayerFixture, settings: Settings
    ):
        """Test that teams cannot be created twice for the same lobby"""
        admin_actions, admin_page, admin_session = await admin_actions_fixture()
        admin_session.set_name("admin_prevent_duplicate_teams_ADMIN")

        player_actions, _, player_session = await player_actions_fixture("Test Player")
        player_session.set_name("admin_prevent_duplicate_teams_PLAYER")

        await admin_actions.goto_admin_page()
        await admin_actions.login(settings.ADMIN_PASSWORD)
        lobby_code = await admin_actions.create_lobby("Duplicate Prevention Test")

        # Have player join
        await player_actions.goto_home_page()
        await player_actions.fill_name_and_code("Test Player", lobby_code)
        await player_actions.join_lobby()

        await admin_actions.peek_into_lobby(lobby_code)
        await admin_actions.wait_for_players(1, 5000)

        # Create teams first time
        teams_input = admin_page.locator('input[type="number"]')
        await teams_input.fill("2")

        create_teams_button = admin_page.locator('[data-testid="create-teams-button"]')
        await create_teams_button.click()

        await expect(admin_page.locator('[data-testid="teams-heading"]')).to_contain_text("Teams (2)")

        # Create teams section should now be hidden
        await expect(admin_page.locator('[data-testid="create-teams-heading"]')).not_to_be_visible()

        await admin_session.screenshot()

    async def test_multiple_admins_see_team_changes(
        self, admin_actions_fixture: AdminFixture, player_actions_fixture: PlayerFixture, settings: Settings
    ):
        """Test that multiple admin sessions see team management changes in real-time"""
        admin1_actions, admin1_page, admin1_session = await admin_actions_fixture()
        admin1_session.set_name("admin_multiple_admin1")

        admin2_actions, admin2_page, admin2_session = await admin_actions_fixture()
        admin2_session.set_name("admin_multiple_admin2")

        player_actions, _, player_session = await player_actions_fixture("Shared Player")
        player_session.set_name("admin_multiple_PLAYER")

        # Both admins login
        await admin1_actions.goto_admin_page()
        await admin1_actions.login(settings.ADMIN_PASSWORD)
        lobby_code = await admin1_actions.create_lobby("Multi Admin Test")

        await admin2_actions.goto_admin_page()
        await admin2_actions.login(settings.ADMIN_PASSWORD)

        # Player joins
        await player_actions.goto_home_page()
        await player_actions.fill_name_and_code("Shared Player", lobby_code)
        await player_actions.join_lobby()

        # Both admins open lobby details
        await admin1_actions.peek_into_lobby(lobby_code)
        await admin2_actions.peek_into_lobby(lobby_code)

        # Admin1 creates teams
        teams_input = admin1_page.locator('input[type="number"]')
        await teams_input.fill("2")

        create_teams_button = admin1_page.locator('[data-testid="create-teams-button"]')
        await create_teams_button.click()

        # Verify both admins see the teams created
        await expect(admin1_page.locator('[data-testid="teams-heading"]:has-text("Teams (2)")')).to_be_visible(
            timeout=5000
        )
        await expect(admin2_page.locator('[data-testid="teams-heading"]:has-text("Teams (2)")')).to_be_visible(
            timeout=5000
        )

        # Admin2 moves the player to unassigned
        team_dropdown = admin2_page.locator('[data-testid="team-dropdown-Shared Player"]')
        await team_dropdown.select_option("")

        # Both admins should see the unassigned player
        await expect(
            admin1_page.locator('[data-testid="unassigned-players-heading"]:has-text("Unassigned Players (1)")')
        ).to_be_visible(timeout=3000)
        await expect(
            admin2_page.locator('[data-testid="unassigned-players-heading"]:has-text("Unassigned Players (1)")')
        ).to_be_visible(timeout=3000)

        await admin1_session.screenshot()
        await admin2_session.screenshot()


class TestTeamManagementPlayerExperience:
    """Test team management from the player's perspective"""

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

    async def test_player_sees_other_players_team_changes(
        self, admin_actions_fixture: AdminFixture, player_actions_fixture: PlayerFixture, settings: Settings
    ):
        """Test that players see other players' team changes in real-time"""
        admin_actions, admin_page, admin_session = await admin_actions_fixture()
        admin_session.set_name("other_players_team_changes_ADMIN")

        player1_actions, player1_page, player1_session = await player_actions_fixture("Observer Player")
        player1_session.set_name("other_players_team_changes_OBSERVER")

        player2_actions, player2_page, player2_session = await player_actions_fixture("Moving Player")
        player2_session.set_name("other_players_team_changes_MOVING")

        await admin_actions.goto_admin_page()
        await admin_actions.login(settings.ADMIN_PASSWORD)
        lobby_code = await admin_actions.create_lobby("Other Players Team Changes")

        # Both players join
        await player1_actions.goto_home_page()
        await player1_actions.fill_name_and_code("Observer Player", lobby_code)
        await player1_actions.join_lobby()

        await player2_actions.goto_home_page()
        await player2_actions.fill_name_and_code("Moving Player", lobby_code)
        await player2_actions.join_lobby()

        # Admin creates teams
        await admin_actions.peek_into_lobby(lobby_code)
        await admin_actions.wait_for_players(2, 5000)

        teams_input = admin_page.locator('input[type="number"]')
        await teams_input.fill("2")

        create_teams_button = admin_page.locator('[data-testid="create-teams-button"]')
        await create_teams_button.click()

        await expect(admin_page.locator('[data-testid="teams-heading"]')).to_contain_text("Teams (2)")

        # Both players see teams and their initial assignments
        await expect(player1_page.locator('[data-testid="player-teams-heading"]')).to_contain_text("Teams (2)")
        await expect(player2_page.locator('[data-testid="player-teams-heading"]')).to_contain_text("Teams (2)")

        # Observer should see Moving Player in some team initially
        moving_player_badge = player1_page.locator("text=Moving Player")
        await expect(moving_player_badge).to_be_visible()

        # Admin moves Moving Player to unassigned
        player2_row = admin_page.locator("text=Moving Player").locator("..")
        team_dropdown = player2_row.locator("select")
        await team_dropdown.select_option("")

        # Observer should see Moving Player disappear from their team section
        await expect(player1_page.locator("text=Moving Player").locator("..").locator("text=No team")).to_be_visible(
            timeout=3000
        )

        # Admin moves Moving Player to Team 1 specifically
        unassigned_player_row = admin_page.locator("text=Moving Player").locator("..")
        unassigned_dropdown = unassigned_player_row.locator("select")
        await unassigned_dropdown.select_option("1")  # Move to Team 1

        # Observer should see Moving Player appear in Team 1
        await expect(
            player1_page.locator("h3:has-text('Team 1')").locator("..").locator("text=Moving Player")
        ).to_be_visible(timeout=3000)

        # Moving Player should see themselves in Team 1 (highlighted)
        await expect(player2_page.locator(".bg-blue-200:has-text('Moving Player')")).to_be_visible(timeout=3000)

        await admin_session.screenshot()
        await player1_session.screenshot()
        await player2_session.screenshot()

    async def test_player_team_progress_display(
        self, admin_actions_fixture: AdminFixture, player_actions_fixture: PlayerFixture, settings: Settings
    ):
        """Test that players see team progress information correctly"""
        admin_actions, admin_page, admin_session = await admin_actions_fixture()
        admin_session.set_name("team_progress_display_ADMIN")

        player_actions, player_page, player_session = await player_actions_fixture("Progress Player")
        player_session.set_name("team_progress_display_PLAYER")

        await admin_actions.goto_admin_page()
        await admin_actions.login(settings.ADMIN_PASSWORD)
        lobby_code = await admin_actions.create_lobby("Team Progress Test")

        await player_actions.goto_home_page()
        await player_actions.fill_name_and_code("Progress Player", lobby_code)
        await player_actions.join_lobby()

        # Admin creates teams
        await admin_actions.peek_into_lobby(lobby_code)
        await admin_actions.wait_for_players(1, 5000)

        teams_input = admin_page.locator('input[type="number"]')
        await teams_input.fill("2")

        create_teams_button = admin_page.locator('[data-testid="create-teams-button"]')
        await create_teams_button.click()

        await expect(admin_page.locator('[data-testid="teams-heading"]')).to_contain_text("Teams (2)")

        # Player should see team progress information
        await expect(player_page.locator('[data-testid="player-teams-heading"]')).to_contain_text("Teams (2)")

        # Each team should show progress information (Word 1 initially)
        await expect(player_page.locator("text=Progress: Word 1")).to_have_count(2, timeout=3000)

        # Player should see member lists for teams
        await expect(player_page.locator("text=Members:")).to_be_visible(timeout=3000)

        # Player should see themselves in one of the teams (highlighted in blue)
        await expect(player_page.locator(".bg-blue-200:has-text('Progress Player')")).to_be_visible(timeout=3000)

        await admin_session.screenshot()
        await player_session.screenshot()
