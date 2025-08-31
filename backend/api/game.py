from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from backend.database import get_session
from backend.database.models import Game, Guess, Player, PuzzleWord, Team
from backend.dependencies import get_player_user
from backend.schemas import MessageResponse
from backend.services.game_service import game_service
from backend.services.puzzle_service import puzzle_service

router = APIRouter(tags=["Game Play"])


class SubmitGuessRequest(BaseModel):
    word_index: int
    direction: str  # "forward" or "backward"
    guess: str


@router.get("/game", response_model=Optional[dict])
async def get_current_game(
    player: Player = Depends(get_player_user),
    session: Session = Depends(get_session),
):
    """Get current game for player's lobby."""
    # Get active game for player's lobby
    game = session.exec(
        select(Game)
        .where(Game.lobby_id == player.lobby_id)
        .where(Game.state.in_(["team_setup", "active"]))
    ).first()
    
    if not game:
        return None
    
    return {
        "id": game.id,
        "lobby_id": game.lobby_id,
        "state": game.state,
        "puzzle_name": game.puzzle_name,
        "created_at": game.created_at,
        "started_at": game.started_at,
        "finished_at": game.finished_at,
    }


@router.get("/game/{game_id}/puzzle", response_model=dict)
async def get_game_puzzle(
    game_id: int,
    player: Player = Depends(get_player_user),
    session: Session = Depends(get_session),
):
    """Get puzzle information for a game."""
    # Verify game exists and player has access
    game = session.get(Game, game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    if player.lobby_id != game.lobby_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get puzzle words
    puzzle_words = puzzle_service.get_puzzle_words(game.puzzle_name)
    
    # Convert to dict format
    words = []
    for word in puzzle_words:
        words.append({
            "word_index": word.word_index,
            "word": word.word,
            "clue": word.clue,
            "transform": word.transform,
        })
    
    return {
        "puzzle_name": game.puzzle_name,
        "words": words,
        "total_words": len(words),
    }


@router.get("/game/{game_id}/team-progress", response_model=dict)
async def get_team_progress(
    game_id: int,
    player: Player = Depends(get_player_user),
    session: Session = Depends(get_session),
):
    """Get current team's progress in the game."""
    
    if not player.team_id:
        raise HTTPException(status_code=400, detail="Player is not assigned to a team")
    
    progress = game_service.get_team_progress(game_id, player.team_id)
    if not progress:
        raise HTTPException(status_code=404, detail="Team not found in this game")
    
    return progress


@router.post("/game/{game_id}/guess", response_model=dict)
async def submit_guess(
    game_id: int,
    request: SubmitGuessRequest,
    player: Player = Depends(get_player_user),
    session: Session = Depends(get_session),
):
    """Submit a guess for a word in the puzzle with optimistic locking."""
    
    if not player.team_id:
        raise HTTPException(status_code=400, detail="Player is not assigned to a team")
    
    # Validate direction
    if request.direction not in ["forward", "backward"]:
        raise HTTPException(status_code=400, detail="Direction must be 'forward' or 'backward'")
    
    # Use the game service with optimistic locking
    success, result = await game_service.submit_guess_with_locking(
        game_id=game_id,
        player=player,
        word_index=request.word_index,
        direction=request.direction,
        guess=request.guess
    )
    
    if not success:
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to submit guess"))
    
    return result


@router.get("/game/{game_id}/leaderboard", response_model=List[dict])
async def get_game_leaderboard(
    game_id: int,
    player: Player = Depends(get_player_user),
    session: Session = Depends(get_session),
):
    """Get leaderboard for the current game."""
    # Verify game exists and player has access
    game = session.get(Game, game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    if player.lobby_id != game.lobby_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return game_service.get_game_leaderboard(game_id)