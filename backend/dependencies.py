from fastapi import Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from typing import Optional

from backend.custom_logging import api_logger
from backend.settings import settings

# security instance used for admin checks (required)
security = HTTPBearer()

# user token security which does not auto-error when missing. Used to optionally
# extract a user session id from a Bearer token. Frontend will send a Bearer
# token containing the user's session id in Authorization: Bearer <session_id>.
# We keep auto_error=False so endpoints can decide whether a missing session is
# fatal (require_user_session) or acceptable (get_optional_user_session).
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


def get_optional_user_session(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(user_security),
) -> Optional[str]:
    """
    FastAPI dependency that returns the user session id from a Bearer token
    when present, otherwise returns None. This is used by endpoints that may
    create a new session for the player (e.g. join endpoint).
    """
    if not credentials or not credentials.credentials:
        api_logger.debug("No user session token provided in Authorization header")
        return None

    api_logger.info("User session extracted from Authorization header")
    return credentials.credentials


def require_user_session(
    credentials: HTTPAuthorizationCredentials = Depends(user_security),
) -> str:
    """
    FastAPI dependency that requires a user session id to be present in the
    Authorization Bearer token. Raises 401 when missing.
    """
    if not credentials or not credentials.credentials:
        api_logger.warning("Missing user session token in Authorization header")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    api_logger.info("User session authenticated via Authorization header")
    return credentials.credentials
