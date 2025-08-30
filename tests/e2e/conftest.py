import os
import sys
from typing import AsyncGenerator

import httpx
import pytest
from playwright.async_api import Page, async_playwright

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from settings import settings as env
from tests.e2e.fixtures.browsers import BrowserSession, MultiBrowserManager
from tests.e2e.fixtures.server import ServerManager
from tests.e2e.utilities.admin_actions import AdminActions
from tests.e2e.utilities.player_actions import PlayerActions


@pytest.fixture(scope="session", autouse=True)
def server():
    manager = ServerManager()
    manager.start()
    yield manager
    manager.stop()


@pytest.fixture(scope="session", autouse=True)
def server_url(server):
    return server.url


@pytest.fixture(scope="function", autouse=True)
def reset_database(server_url):
    with httpx.Client() as client:
        client.delete(f"{server_url}/api/reset-db")


@pytest.fixture()
async def playwright():
    async with async_playwright() as p:
        yield p


@pytest.fixture(scope="module")
async def multi_browser(playwright):
    browser = await playwright.chromium.connect("ws://127.0.0.1:3000/")
    manager = MultiBrowserManager(playwright, browser)
    await manager.start()
    yield manager
    await manager.close_all()
    await browser.close()


BrowserFixture = AsyncGenerator[tuple[BrowserSession, Page], None]


@pytest.fixture
async def browser(playwright) -> BrowserFixture:
    browser = await playwright.chromium.connect("ws://127.0.0.1:3000/")
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


@pytest.fixture
def player_actions(
    browser: BrowserFixture, server_url: str
) -> tuple[PlayerActions, Page, BrowserSession]:
    session, page = browser
    return PlayerActions(page, server_url), page, session
