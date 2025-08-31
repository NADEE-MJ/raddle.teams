from typing import Optional

from fastapi import Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import select

from backend.custom_logging import api_logger
from backend.database import Session, get_session
from backend.database.models import Player
from backend.settings import settings

# security instance used for admin checks (required)
security = HTTPBearer()

# user token security which does not auto-error when missing. Used to optionally
# extract a user session id from a Bearer token. Frontend will send a Bearer
# token containing the user's session id in Authorization: Bearer <session_id>.
# We keep auto_error=False so endpoints can decide whether a missing session is
# fatal (require_player_session) or acceptable (get_optional_player_session).
user_security = HTTPBearer(auto_error=False)


def check_admin_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> bool:
    """
    FastAPI dependency that validates admin bearer token.

    Expects a bearer token in the Authorization header that matches
    the admin password from environment settings.

    Raises:
        HTTPException: 401 if token is invalid or missing

    Returns:
        bool: True if authentication successful
    """
    if not credentials or not credentials.credentials:
        api_logger.warning("Missing admin auth token in Authorization header")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if credentials.credentials != settings.ADMIN_PASSWORD:
        api_logger.warning(
            "Invalid admin credentials provided via Authorization header"
        )
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
    """
    FastAPI dependency that validates admin token from query parameters.

    Expects a token query parameter that matches the admin password
    from environment settings.

    Args:
        token: Admin token from query parameter

    Raises:
        HTTPException: 401 if token is invalid or missing

    Returns:
        bool: True if authentication successful
    """
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
    credentials: HTTPAuthorizationCredentials = Depends(user_security),
    db: Session = Depends(get_session),
) -> Player:
    """
    FastAPI dependency that requires a player session id to be present in the
    Authorization Bearer token. Raises 401 when missing.
    """
    if not credentials or not credentials.credentials:
        api_logger.warning("Missing player session token in Authorization header")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    player = db.exec(
        select(Player).where(Player.session_id == credentials.credentials)
    ).first()

    if not player:
        api_logger.warning(
            "Invalid player session token provided in Authorization header"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    api_logger.debug(f"Player session authenticated: player_id={player.id}")
    return player
