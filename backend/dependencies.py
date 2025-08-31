from fastapi import Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from backend.custom_logging import api_logger
from backend.settings import settings

security = HTTPBearer()


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
