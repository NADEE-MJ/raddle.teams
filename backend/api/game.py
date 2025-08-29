# from datetime import datetime

# from fastapi import APIRouter, Depends, HTTPException
# from sqlmodel import Session, select

# router = APIRouter()


# @router.post("/games", response_model=GameResponse)
# async def create_game(session: Session = Depends(get_session)):
#     """Create a new game."""
#     # Check if there's already an active game
#     active_game = session.exec(
#         select(Game).where(Game.state != GameState.FINISHED)
#     ).first()

#     if active_game:
#         raise HTTPException(status_code=400, detail="A game is already active")

#     game = Game(state=GameState.LOBBY)
#     session.add(game)
#     session.commit()
#     session.refresh(game)

#     # Set as current game
#     game_manager.current_game = game

#     return game


# @router.get("/games/current", response_model=GameResponse)
# async def get_current_game(session: Session = Depends(get_session)):
#     """Get the current active game."""
#     game = session.exec(select(Game).where(Game.state != GameState.FINISHED)).first()

#     if not game:
#         raise HTTPException(status_code=404, detail="No active game found")

#     return game


# @router.post("/games/{game_id}/start")
# async def start_game(game_id: int, session: Session = Depends(get_session)):
#     """Start the game."""
#     game = session.get(Game, game_id)
#     if not game:
#         raise HTTPException(status_code=404, detail="Game not found")

#     if game.state != GameState.LOBBY:
#         raise HTTPException(status_code=400, detail="Game has already started")

#     game.state = GameState.ACTIVE
#     game.started_at = datetime.utcnow()
#     session.add(game)
#     session.commit()

#     # Notify all players that the game has started
#     await notify_game_state_change(GameState.ACTIVE)

#     return {"message": "Game started successfully"}
