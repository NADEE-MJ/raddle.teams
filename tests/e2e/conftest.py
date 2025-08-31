import httpx
import pytest
from playwright.async_api import async_playwright

from backend.settings import settings as app_settings
from tests.e2e.fixtures.browsers import BrowserSession
from tests.e2e.fixtures.server import ServerManager
from tests.e2e.utilities.admin_actions import AdminActions
from tests.e2e.utilities.player_actions import PlayerActions


@pytest.fixture(scope="session")
def server():
    manager = ServerManager()
    manager.start()
    yield manager
    manager.stop()


@pytest.fixture(scope="session")
def server_url(server):
    return server.url


@pytest.fixture(autouse=True)
def reset_database(server_url):
    with httpx.Client() as client:
        client.delete(f"{server_url}/api/reset-db")


@pytest.fixture()
async def playwright():
    async with async_playwright() as p:
        yield p


@pytest.fixture
async def browser(playwright):
    async def create():
        browser = await playwright.chromium.launch()
        session = BrowserSession(browser)
        page = await session.start()

        yield session, page

        await session.stop()
        await browser.close()

    return create


@pytest.fixture
async def admin_actions(browser, server_url):
    session, page = await browser()
    return AdminActions(page, server_url), page, session


@pytest.fixture
async def player_actions(browser, server_url):
    session, page = await browser()
    return PlayerActions(page, server_url), page, session


@pytest.fixture(scope="session")
def settings():
    return app_settings
