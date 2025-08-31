from fastapi import APIRouter, HTTPException
from backend.services.puzzle_service import puzzle_service

router = APIRouter(tags=["Tutorial"])


@router.get("/tutorial", response_model=dict)
async def get_tutorial_puzzle():
    """Return the tutorial puzzle JSON for the frontend to consume."""
    try:
        puzzle = puzzle_service.load_puzzle_from_file("tutorial")
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Tutorial puzzle not found")

    return puzzle
