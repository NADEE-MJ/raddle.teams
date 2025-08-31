from fastapi import APIRouter, Depends

from backend.custom_logging import api_logger
from backend.dependencies import check_admin_token

router = APIRouter(dependencies=[Depends(check_admin_token)])


@router.get("/check", response_model=dict)
async def check_admin_credentials():
    api_logger.info("Admin credentials check endpoint called")
    return {"status": "authenticated", "message": "Admin credentials are valid"}