"""Pytest configuration and fixtures."""

import pytest
from sqlmodel import Session, create_engine
from sqlmodel.pool import StaticPool

from backend.database import SQLModel
from backend.main import app


@pytest.fixture(name="session")
def session_fixture():
    """Create a fresh database session for each test."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


@pytest.fixture(name="client")
def client_fixture():
    """Create a test client."""
    from fastapi.testclient import TestClient

    return TestClient(app)
