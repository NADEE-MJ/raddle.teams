from typing import AsyncGenerator

import pytest
from playwright.async_api import Page, async_playwright

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from settings import settings as env
from tests.e2e.fixtures.browsers import BrowserSession, MultiBrowserManager
from tests.e2e.fixtures.server import ServerManager
from tests.e2e.utilities.admin_actions import AdminActions


@pytest.fixture(scope="session", autouse=True)
def server():
    manager = ServerManager()
    manager.start()
    yield manager
    manager.stop()


@pytest.fixture(scope="session", autouse=True)
def server_url(server):
    return server.url


@pytest.fixture(scope="module")
async def multi_browser():
    manager = MultiBrowserManager()
    await manager.start()
    yield manager
    await manager.close_all()


@pytest.fixture()
async def playwright():
    async with async_playwright() as p:
        yield p


BrowserFixture = AsyncGenerator[tuple[BrowserSession, Page], None]


@pytest.fixture
async def browser(playwright) -> BrowserFixture:
    # Use the built-in browser instead of connecting to external service
    browser = await playwright.chromium.launch()
    session = BrowserSession(browser)
    page = await session.start()
    
    yield session, page
    
    await session.stop()
    await browser.close()


@pytest.fixture(scope="session", autouse=True)
def settings():
    return env


@pytest.fixture
def admin_actions(
    browser: BrowserFixture, server_url: str
) -> tuple[AdminActions, Page, BrowserSession]:
    session, page = browser
    return AdminActions(page, server_url), page, session
