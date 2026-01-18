"""Admin authentication endpoints."""

from fastapi import APIRouter, Depends

from backend.dependencies import check_admin_token
from backend.schemas import AdminAuthenticatedResponse

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/check", response_model=AdminAuthenticatedResponse)
def check_admin(authenticated: bool = Depends(check_admin_token)):
    """Verify admin authentication token."""
    return AdminAuthenticatedResponse(session_id="admin")
