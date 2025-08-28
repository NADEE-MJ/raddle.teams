from sqlmodel import Session, SQLModel, create_engine

from backend.database.models import Game, Guess, Player, Team, Lobby  # noqa: F401

DATABASE_URL = "sqlite:///./database.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
