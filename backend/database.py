from sqlalchemy import create_engine, Column, String, DateTime, Boolean, Integer, Text, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from contextlib import asynccontextmanager
import aiosqlite
from datetime import datetime

DATABASE_URL = "sqlite+aiosqlite:///./raddle_teams.db"

Base = declarative_base()

# Database models
class PlayerDB(Base):
    __tablename__ = "players"
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    team_id = Column(String, ForeignKey("teams.id"), nullable=True)
    connected = Column(Boolean, default=True)
    joined_at = Column(DateTime, default=datetime.utcnow)


class TeamDB(Base):
    __tablename__ = "teams"
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    game_id = Column(String, ForeignKey("games.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    players = relationship("PlayerDB", backref="team")


class GameDB(Base):
    __tablename__ = "games"
    
    id = Column(String, primary_key=True)
    state = Column(String, nullable=False)
    num_teams = Column(Integer, nullable=False)
    current_puzzle = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)
    
    teams = relationship("TeamDB", backref="game")


class GuessDB(Base):
    __tablename__ = "guesses"
    
    id = Column(String, primary_key=True)
    player_id = Column(String, ForeignKey("players.id"))
    team_id = Column(String, ForeignKey("teams.id"))
    game_id = Column(String, ForeignKey("games.id"))
    word_position = Column(Integer, nullable=False)
    guess = Column(String, nullable=False)
    direction = Column(String, nullable=False)  # 'forward' or 'backward'
    correct = Column(Boolean, default=False)
    submitted_at = Column(DateTime, default=datetime.utcnow)


# Async database setup
engine = create_async_engine(DATABASE_URL, echo=True)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def init_db():
    """Initialize the database"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


@asynccontextmanager
async def get_db():
    """Get database session"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()