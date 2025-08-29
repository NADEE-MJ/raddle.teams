from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from settings import settings

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
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if credentials.credentials != settings.ADMIN_PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return True
