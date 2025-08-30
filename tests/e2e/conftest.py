"""
Playwright configuration for Raddle Teams testing.
Configured for headless CI-friendly testing with video recording.
"""

import pytest
from playwright.async_api import async_playwright

from tests.fixtures.browsers import BrowserSession, MultiBrowserManager
from tests.fixtures.server import ServerManager

# Playwright configuration using pytest-playwright plugin
pytest_plugins = ["playwright"]


@pytest.fixture(scope="session")
def browser_type_launch_args(browser_type):
    """Configure Playwright to use system browsers in headless mode."""
    if browser_type.name == "chromium":
        return {
            "executable_path": "/usr/bin/chromium",
            "headless": True,  # Always headless for CI
            "args": [
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--disable-web-security",
            ],
        }
    return {}


@pytest.fixture(scope="function")
def browser_context_args(browser_context_args):
    """Configure browser context with video recording for all tests."""
    return {
        **browser_context_args,
        # Enable video recording when using Playwright server
        "record_video_dir": "tests/recordings/videos",
        "record_video_size": {"width": 1280, "height": 720},
        "viewport": {"width": 1280, "height": 720},
    }


@pytest.fixture(scope="session")
def server():
    """Pytest fixture to manage the test server."""
    manager = ServerManager()
    manager.start()
    yield manager
    manager.stop()


@pytest.fixture(scope="session")
def server_url(server):
    """Pytest fixture that provides the server URL."""
    return server.url


@pytest.fixture
async def multi_browser():
    """Pytest fixture for multi-browser management."""
    manager = MultiBrowserManager()
    await manager.start()
    yield manager
    await manager.close_all()


@pytest.fixture
async def browser():
    """Pytest fixture for custom browser session."""
    playwright = await async_playwright().start()
    browser = await playwright.chromium.connect("ws://127.0.0.1:3000/")

    yield BrowserSession(browser, "test", "12345")
