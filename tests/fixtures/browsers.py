"""
Browser management utilities for multi-browser testing.
"""

import os
from datetime import datetime
from typing import Dict, List

import pytest
from playwright.async_api import Browser, BrowserContext, Page, async_playwright


class BrowserSession:
    """Manages a single browser session with recording capabilities."""

    def __init__(self, browser: Browser, role: str, session_id: str):
        self.browser = browser
        self.role = role  # 'admin' or 'player'
        self.session_id = session_id
        self.context: BrowserContext = None
        self.page: Page = None
        self.recording_dir = "tests/recordings/videos"
        # self.recording_dir = f"tests/recordings/{datetime.now().strftime('%Y%m%d_%H%M%S')}_{role}_{session_id}"

    async def start(self, **context_options):
        """Start the browser session with recording."""
        # Ensure recording directory exists
        os.makedirs(self.recording_dir, exist_ok=True)

        # Default context options based on role
        default_options = {
            "record_video_dir": f"{self.recording_dir}/video/",
            "record_video_size": {
                "width": 1920 if self.role == "admin" else 1280,
                "height": 1080 if self.role == "admin" else 720,
            },
            "viewport": {
                "width": 1920 if self.role == "admin" else 1280,
                "height": 1080 if self.role == "admin" else 720,
            },
        }

        # Merge with provided options
        final_options = {**default_options, **context_options}

        # Create context and start tracing
        self.context = await self.browser.new_context(**final_options)
        # await self.context.tracing.start(screenshots=True, snapshots=True, sources=True)

        # Create page
        self.page = await self.context.new_page()

        return self.page

    async def stop(self):
        """Stop the session and save recordings."""
        if self.page:
            await self.page.close()
            if self.page.video:
                await self.page.video.save_as(
                    "tests/recordings/videos/home_page_video.mp4"
                )
        if self.context:
            # Stop tracing and save
            # await self.context.tracing.stop(path=f"{self.recording_dir}/trace.zip")
            await self.context.close()

    async def screenshot(self, name: str = "screenshot"):
        """Take a screenshot."""
        if self.page:
            screenshot_path = (
                f"{self.recording_dir}/{name}_{datetime.now().strftime('%H%M%S')}.png"
            )
            await self.page.screenshot(path=screenshot_path)
            return screenshot_path


class MultiBrowserManager:
    """Manages multiple browser sessions for coordinated testing."""

    def __init__(self):
        self.playwright = None
        self.browser = None
        self.sessions: Dict[str, BrowserSession] = {}

    async def start(self):
        """Start the browser manager."""
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.connect("ws://127.0.0.1:3000/")

    async def create_admin_session(self, session_id: str = "admin") -> Page:
        """Create an admin browser session."""
        session = BrowserSession(self.browser, "admin", session_id)
        page = await session.start()
        self.sessions[f"admin_{session_id}"] = session
        return page

    async def create_player_session(self, player_name: str) -> Page:
        """Create a player browser session."""
        session = BrowserSession(self.browser, "player", player_name)
        page = await session.start()
        self.sessions[f"player_{player_name}"] = session
        return page

    async def create_multiple_players(self, player_names: List[str]) -> Dict[str, Page]:
        """Create multiple player sessions."""
        players = {}
        for name in player_names:
            players[name] = await self.create_player_session(name)
        return players

    async def close_all(self):
        """Close all browser sessions."""
        for session in self.sessions.values():
            await session.stop()
        self.sessions.clear()

        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()

    def get_session(self, session_key: str) -> BrowserSession:
        """Get a specific session."""
        return self.sessions.get(session_key)
