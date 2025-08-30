# """
# Phase 1: User Workflows Tests

# Tests complete user workflows with multiple browsers:
# - Admin creates lobby while players join
# - Real-time coordination between admin and players
# - Full end-to-end scenarios
# """

# import asyncio

# from playwright.async_api import Browser, Page


# class TestUserWorkflows:
#     """Test complete user workflows with multiple browsers."""

#     async def test_admin_creates_lobby_players_join(
#         self, browser: Browser, server_url: str
#     ):
#         """Test the complete workflow: admin creates lobby, multiple players join."""

#         # Create separate browser contexts for admin and players
#         admin_context = await browser.new_context(
#             # Disable video recording to avoid ffmpeg dependency
#             # record_video_dir="tests/recordings/videos",
#             # record_video_size={"width": 1280, "height": 720},
#             viewport={"width": 1280, "height": 720}
#         )

#         player1_context = await browser.new_context(
#             # record_video_dir="tests/recordings/videos",
#             # record_video_size={"width": 1280, "height": 720},
#             viewport={"width": 1280, "height": 720}
#         )

#         player2_context = await browser.new_context(
#             # record_video_dir="tests/recordings/videos",
#             # record_video_size={"width": 1280, "height": 720},
#             viewport={"width": 1280, "height": 720}
#         )

#         try:
#             # Create pages for each context
#             admin_page = await admin_context.new_page()
#             player1_page = await player1_context.new_page()
#             player2_page = await player2_context.new_page()

#             # Admin workflow: Login and create lobby
#             await admin_page.goto(f"{server_url}/admin")
#             await admin_page.wait_for_load_state("networkidle")

#             # Admin login
#             token_input = admin_page.locator('input[type="password"]')
#             await token_input.fill("test")

#             login_button = admin_page.locator('button:has-text("Login")')
#             await login_button.click()
#             await admin_page.wait_for_timeout(2000)

#             await admin_page.screenshot(
#                 path="tests/recordings/screenshots/workflow_admin_logged_in.png"
#             )

#             # Players start at home page
#             await player1_page.goto(f"{server_url}/")
#             await player1_page.wait_for_load_state("networkidle")

#             await player2_page.goto(f"{server_url}/")
#             await player2_page.wait_for_load_state("networkidle")

#             await player1_page.screenshot(
#                 path="tests/recordings/screenshots/workflow_player1_home.png"
#             )
#             await player2_page.screenshot(
#                 path="tests/recordings/screenshots/workflow_player2_home.png"
#             )

#             # Wait a bit to simulate real user behavior
#             await asyncio.sleep(3)

#             # Take final screenshots
#             await admin_page.screenshot(
#                 path="tests/recordings/screenshots/workflow_final_admin.png"
#             )
#             await player1_page.screenshot(
#                 path="tests/recordings/screenshots/workflow_final_player1.png"
#             )
#             await player2_page.screenshot(
#                 path="tests/recordings/screenshots/workflow_final_player2.png"
#             )

#             print("✅ Multi-browser workflow completed")

#         finally:
#             # Clean up contexts
#             await admin_context.close()
#             await player1_context.close()
#             await player2_context.close()

#     async def test_player_reconnection_flow(self, browser: Browser, server_url: str):
#         """Test player disconnection and reconnection scenario."""

#         context = await browser.new_context(
#             # Disable video recording to avoid ffmpeg dependency
#             # record_video_dir="tests/recordings/videos",
#             # record_video_size={"width": 1280, "height": 720},
#             viewport={"width": 1280, "height": 720}
#         )

#         try:
#             page = await context.new_page()

#             # Player visits home page
#             await page.goto(f"{server_url}/")
#             await page.wait_for_load_state("networkidle")
#             await page.screenshot(
#                 path="tests/recordings/screenshots/reconnection_start.png"
#             )

#             # Simulate some navigation (this would normally be where player joins lobby)
#             await page.goto(f"{server_url}/lobby")
#             await page.wait_for_load_state("networkidle")
#             await page.screenshot(
#                 path="tests/recordings/screenshots/reconnection_lobby.png"
#             )

#             # Navigate back to home (simulating a refresh/reconnection)
#             await page.goto(f"{server_url}/")
#             await page.wait_for_load_state("networkidle")
#             await page.screenshot(
#                 path="tests/recordings/screenshots/reconnection_back_home.png"
#             )

#             print("✅ Player reconnection flow tested")

#         finally:
#             await context.close()

#     async def test_concurrent_player_actions(self, browser: Browser, server_url: str):
#         """Test multiple players performing actions simultaneously."""

#         # Create multiple contexts for concurrent testing
#         contexts = []
#         pages = []

#         for i in range(3):
#             context = await browser.new_context(
#                 # Disable video recording to avoid ffmpeg dependency
#                 # record_video_dir="tests/recordings/videos",
#                 # record_video_size={"width": 1280, "height": 720},
#                 viewport={"width": 1280, "height": 720}
#             )
#             contexts.append(context)

#             page = await context.new_page()
#             pages.append(page)

#         try:
#             # All players navigate to home page simultaneously
#             tasks = []
#             for i, page in enumerate(pages):
#                 task = self._player_navigation_task(page, server_url, f"player_{i + 1}")
#                 tasks.append(task)

#             # Run all tasks concurrently
#             await asyncio.gather(*tasks)

#             print("✅ Concurrent player actions tested")

#         finally:
#             # Clean up all contexts
#             for context in contexts:
#                 await context.close()

#     async def _player_navigation_task(
#         self, page: Page, server_url: str, player_name: str
#     ):
#         """Helper task for concurrent player navigation."""
#         await page.goto(f"{server_url}/")
#         await page.wait_for_load_state("networkidle")
#         await page.screenshot(
#             path=f"tests/recordings/screenshots/concurrent_{player_name}.png"
#         )

#         # Wait a bit to simulate reading the page
#         await asyncio.sleep(2)

#         # Navigate to different pages
#         await page.goto(f"{server_url}/lobby")
#         await page.wait_for_load_state("networkidle")
#         await page.screenshot(
#             path=f"tests/recordings/screenshots/concurrent_{player_name}_lobby.png"
#         )
