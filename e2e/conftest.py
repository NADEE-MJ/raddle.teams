import os

import httpx
import pytest
from playwright.async_api import async_playwright

from backend.settings import settings as app_settings
from e2e.fixtures.browsers import BrowserSession
from e2e.fixtures.server import ServerManager
from e2e.utilities.admin_actions import AdminActions
from e2e.utilities.player_actions import PlayerActions


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


@pytest.fixture()
async def shared_browser(playwright):
    slow_mo_enabled = os.getenv("PYTEST_SLOW_MO") is not None

    if slow_mo_enabled:
        browser = await playwright.chromium.launch(headless=False, slow_mo=int(os.getenv("PYTEST_SLOW_MO")))
    else:
        browser = await playwright.chromium.launch(headless=True)

    yield browser
    await browser.close()


@pytest.fixture
async def admin_actions_fixture(shared_browser, server_url, request):
    sessions = []

    async def create():
        session = BrowserSession(shared_browser, request)
        page = await session.start()
        sessions.append(session)
        return AdminActions(page, server_url), page, session

    yield create

    test_failed = False
    if hasattr(request.node, "rep_call"):
        test_failed = request.node.rep_call.failed
    for session in sessions:
        await session.stop(test_failed)


@pytest.fixture
async def player_actions_fixture(shared_browser, server_url, request):
    sessions = []

    async def create(name):
        session = BrowserSession(shared_browser, request)
        page = await session.start()
        sessions.append(session)
        return PlayerActions(page, server_url, name), page, session

    yield create

    test_failed = False
    if hasattr(request.node, "rep_call"):
        test_failed = request.node.rep_call.failed
    for session in sessions:
        await session.stop(test_failed)


@pytest.fixture(scope="session")
def settings():
    return app_settings
