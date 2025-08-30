# import pytest
# import asyncio
# from pathlib import Path
# from sqlmodel import Session, SQLModel, create_engine
# from httpx import AsyncClient
# import tempfile
# import os

# import sys
# sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

# from main import app
# from backend.database.models import Player, Team, Lobby, Guess
# from backend.database import get_session


# @pytest.fixture(scope="session")
# def event_loop():
#     """Create an instance of the default event loop for the test session."""
#     loop = asyncio.get_event_loop_policy().new_event_loop()
#     yield loop
#     loop.close()


# @pytest.fixture(scope="session")
# def test_db_path():
#     """Create a temporary database file for testing."""
#     with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as temp_file:
#         yield temp_file.name
#     # Clean up after tests
#     try:
#         os.unlink(temp_file.name)
#     except FileNotFoundError:
#         pass


# @pytest.fixture(scope="session")
# def test_engine(test_db_path):
#     """Create a test database engine."""
#     test_database_url = f"sqlite:///{test_db_path}"
#     engine = create_engine(test_database_url, connect_args={"check_same_thread": False})

#     # Create all tables
#     SQLModel.metadata.create_all(engine)

#     yield engine

#     # Clean up
#     engine.dispose()


# @pytest.fixture
# def test_session(test_engine):
#     """Create a test database session that rolls back after each test."""
#     connection = test_engine.connect()
#     transaction = connection.begin()
#     session = Session(bind=connection)

#     yield session

#     session.close()
#     transaction.rollback()
#     connection.close()


# @pytest.fixture
# async def client(test_session):
#     """Create an async test client with dependency override for database session."""
#     from httpx import ASGITransport

#     def get_test_session():
#         yield test_session

#     app.dependency_overrides[get_session] = get_test_session

#     transport = ASGITransport(app=app)
#     async with AsyncClient(transport=transport, base_url="http://test") as client:
#         yield client

#     # Clean up dependency override
#     app.dependency_overrides.clear()
