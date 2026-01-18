from fastapi import Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import select

from backend.custom_logging import api_logger
from backend.database import Session, get_session
from backend.database.models import Player, Room
from backend.settings import settings

security = HTTPBearer()


def check_admin_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> bool:
    if not credentials or not credentials.credentials:
        api_logger.warning("Missing admin auth token in Authorization header")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if credentials.credentials != settings.ADMIN_PASSWORD:
        api_logger.warning("Invalid admin credentials provided via Authorization header")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    api_logger.info("Admin authenticated via Authorization header")
    return True


def check_admin_token_query(
    token: str = Query(..., description="Admin authentication token"),
) -> bool:
    if not token:
        api_logger.warning("Missing admin token in query parameter")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
        )

    if token != settings.ADMIN_PASSWORD:
        api_logger.warning("Invalid admin credentials provided via query parameter")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin credentials",
        )

    api_logger.info("Admin authenticated via query parameter")
    return True


def require_player_session(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_session),
) -> Player:
    if not credentials or not credentials.credentials:
        api_logger.warning("Missing player session token in Authorization header")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    player = db.exec(select(Player).where(Player.session_id == credentials.credentials)).first()

    if not player:
        api_logger.warning("Invalid player session token provided in Authorization header")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    api_logger.debug(f"Player session authenticated: player_id={player.id}")
    return player


def require_host_session(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_session),
) -> Player:
    """Require authenticated player who is also a host."""
    player = require_player_session(credentials, db)

    if not player.is_host:
        api_logger.warning(f"Player {player.id} attempted host action without host privileges")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Host privileges required",
        )

    api_logger.debug(f"Host session authenticated: player_id={player.id}")
    return player
