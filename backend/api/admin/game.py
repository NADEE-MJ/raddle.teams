from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from backend.database import get_session
from backend.database.models import Game, Lobby, Team
from backend.dependencies import get_admin_user
from backend.schemas import MessageResponse
from backend.services.puzzle_service import puzzle_service
from backend.services.websocket_service import websocket_broadcast_service

router = APIRouter(tags=["Admin Game Management"])


@router.post("/game", response_model=dict)
async def create_game(
    lobby_id: int,
    puzzle_name: str,
    admin_user: str = Depends(get_admin_user),
    session: Session = Depends(get_session),
):
    """Create a new game for a lobby."""
    # Verify lobby exists
    lobby = session.get(Lobby, lobby_id)
    if not lobby:
        raise HTTPException(status_code=404, detail="Lobby not found")
    
    # Verify puzzle exists
    available_puzzles = puzzle_service.get_available_puzzles()
    if puzzle_name not in available_puzzles:
        raise HTTPException(status_code=404, detail=f"Puzzle '{puzzle_name}' not found")
    
    # Check if lobby already has an active game
    existing_game = session.exec(
        select(Game).where(Game.lobby_id == lobby_id).where(Game.state != "finished")
    ).first()
    
    if existing_game:
        raise HTTPException(status_code=400, detail="Lobby already has an active game")
    
    # Create game
    game = Game(
        lobby_id=lobby_id,
        state="team_setup",
        puzzle_name=puzzle_name
    )
    session.add(game)
    session.commit()
    session.refresh(game)
    
    # Broadcast game creation
    try:
        await websocket_broadcast_service.broadcast_game_created(
            game_id=game.id,
            puzzle_name=puzzle_name,
            state=game.state
        )
    except Exception as e:
        print(f"WebSocket broadcast error: {e}")
    
    return {
        "id": game.id,
        "lobby_id": game.lobby_id,
        "state": game.state,
        "puzzle_name": game.puzzle_name,
        "created_at": game.created_at,
        "started_at": game.started_at,
        "finished_at": game.finished_at,
    }


@router.get("/game/{game_id}", response_model=dict)
async def get_game(
    game_id: int,
    admin_user: str = Depends(get_admin_user),
    session: Session = Depends(get_session),
):
    """Get game details."""
    game = session.get(Game, game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    return {
        "id": game.id,
        "lobby_id": game.lobby_id,
        "state": game.state,
        "puzzle_name": game.puzzle_name,
        "created_at": game.created_at,
        "started_at": game.started_at,
        "finished_at": game.finished_at,
    }


@router.post("/game/{game_id}/start", response_model=MessageResponse)
async def start_game(
    game_id: int,
    admin_user: str = Depends(get_admin_user),
    session: Session = Depends(get_session),
):
    """Start a game (move from team_setup to active)."""
    game = session.get(Game, game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    if game.state != "team_setup":
        raise HTTPException(status_code=400, detail=f"Cannot start game in state: {game.state}")
    
    # Verify there are teams assigned to this game
    teams = session.exec(select(Team).where(Team.game_id == game_id)).all()
    if not teams:
        raise HTTPException(status_code=400, detail="Cannot start game without teams")
    
    # Update game state
    game.state = "active"
    game.started_at = datetime.now(timezone.utc)
    session.add(game)
    session.commit()
    
    # Broadcast game start
    try:
        await websocket_broadcast_service.broadcast_game_started(game_id=game_id)
    except Exception as e:
        print(f"WebSocket broadcast error: {e}")
    
    return MessageResponse(status=True, message="Game started successfully")


@router.post("/game/{game_id}/finish", response_model=MessageResponse)
async def finish_game(
    game_id: int,
    admin_user: str = Depends(get_admin_user),
    session: Session = Depends(get_session),
):
    """Finish a game."""
    game = session.get(Game, game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    if game.state == "finished":
        raise HTTPException(status_code=400, detail="Game is already finished")
    
    # Update game state
    game.state = "finished"
    game.finished_at = datetime.now(timezone.utc)
    session.add(game)
    session.commit()
    
    # Broadcast game finish
    try:
        await websocket_broadcast_service.broadcast_game_finished(game_id=game_id)
    except Exception as e:
        print(f"WebSocket broadcast error: {e}")
    
    return MessageResponse(status=True, message="Game finished successfully")


@router.get("/puzzles", response_model=List[str])
async def get_available_puzzles(
    admin_user: str = Depends(get_admin_user),
):
    """Get list of available puzzles."""
    return puzzle_service.get_available_puzzles()


@router.get("/game/{game_id}/teams", response_model=List[dict])
async def get_game_teams(
    game_id: int,
    admin_user: str = Depends(get_admin_user),
    session: Session = Depends(get_session),
):
    """Get teams for a specific game."""
    game = session.get(Game, game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    teams = session.exec(select(Team).where(Team.game_id == game_id)).all()
    
    result = []
    for team in teams:
        result.append({
            "id": team.id,
            "name": team.name,
            "lobby_id": team.lobby_id,
            "game_id": team.game_id,
            "current_word_index": team.current_word_index,
            "completed_at": team.completed_at,
            "created_at": team.created_at,
        })
    
    return result