import logging
import os
from contextlib import asynccontextmanager

from sqlalchemy import event
from sqlmodel import Session, SQLModel, create_engine

from backend.custom_logging import database_logger
from backend.database.models import (  # noqa: F401
    GameSession,
    PersonInPool,
    Player,
    Question,
    Room,
    Score,
    Vote,
)
from backend.settings import settings

DATABASE_URL = settings.DATABASE_URL

os.makedirs("databases", exist_ok=True)

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

if "sqlite" in DATABASE_URL:

    @event.listens_for(engine, "connect")
    def enable_sqlite_fks(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


def _sqlalchemy_handle_error(exception_context):
    try:
        stmt = getattr(exception_context, "statement", None)
        params = getattr(exception_context, "parameters", None)
        is_disconnect = getattr(exception_context, "is_disconnect", None)
        orig = getattr(exception_context, "original_exception", None)

        database_logger.error(
            "SQLAlchemy engine error: statement=%s parameters=%s is_disconnect=%s",
            stmt,
            params,
            is_disconnect,
            exc_info=orig or True,
        )
    except Exception as exc:
        database_logger.exception("Failed to log SQLAlchemy exception: %s", exc)


def register_database_logger():
    sqlalchemy_logger_names = ("sqlalchemy", "sqlalchemy.engine", "sqlalchemy.pool")
    for name in sqlalchemy_logger_names:
        log = logging.getLogger(name)
        for h in database_logger.handlers:
            if h not in log.handlers:
                log.addHandler(h)
    log.setLevel(database_logger.level)
    log.propagate = False

    event.listen(engine, "handle_error", _sqlalchemy_handle_error)


register_database_logger()


def drop_all_tables():
    SQLModel.metadata.drop_all(engine)


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session


@asynccontextmanager
async def get_session_context():
    """
    Async context manager for getting a database session.
    Use this in WebSocket handlers and other async contexts where Depends() isn't available.
    """
    with Session(engine) as session:
        yield session
