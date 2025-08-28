"""
API routes for the Raddle Teams game.
"""

from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from .database import (
    Game,
    GameState,
    Guess,
    Player,
    Team,
    create_db_and_tables,
    get_session,
)
from .game_logic import game_manager
from .schemas import (
    GameResponse,
    GuessCreate,
    GuessResponse,
    JoinTeamRequest,
    PlayerCreate,
    PlayerResponse,
    TeamCreate,
    TeamResponse,
)
from .websocket import notify_game_state_change, notify_team_guess, notify_team_progress

router = APIRouter()

# Initialize database on startup
create_db_and_tables()


@router.post("/players", response_model=PlayerResponse)
async def create_player(
    player_data: PlayerCreate, session: Session = Depends(get_session)
):
    """Create a new player."""
    # Check if session_id already exists
    existing_player = session.exec(
        select(Player).where(Player.session_id == player_data.session_id)
    ).first()

    if existing_player:
        # Update existing player's name and mark as connected
        existing_player.name = player_data.name
        existing_player.connected = True
        session.add(existing_player)
        session.commit()
        session.refresh(existing_player)
        return existing_player

    # Create new player
    player = Player(
        name=player_data.name, session_id=player_data.session_id, connected=True
    )
    session.add(player)
    session.commit()
    session.refresh(player)
    return player


@router.get("/players", response_model=List[PlayerResponse])
async def get_players(session: Session = Depends(get_session)):
    """Get all players."""
    players = session.exec(select(Player)).all()
    return players


@router.post("/games", response_model=GameResponse)
async def create_game(session: Session = Depends(get_session)):
    """Create a new game."""
    # Check if there's already an active game
    active_game = session.exec(
        select(Game).where(Game.state != GameState.FINISHED)
    ).first()

    if active_game:
        raise HTTPException(status_code=400, detail="A game is already active")

    game = Game(state=GameState.LOBBY)
    session.add(game)
    session.commit()
    session.refresh(game)

    # Set as current game
    game_manager.current_game = game

    return game


@router.get("/games/current", response_model=GameResponse)
async def get_current_game(session: Session = Depends(get_session)):
    """Get the current active game."""
    game = session.exec(select(Game).where(Game.state != GameState.FINISHED)).first()

    if not game:
        raise HTTPException(status_code=404, detail="No active game found")

    return game


@router.post("/teams", response_model=TeamResponse)
async def create_team(team_data: TeamCreate, session: Session = Depends(get_session)):
    """Create a new team."""
    # Get current game
    current_game = session.exec(
        select(Game).where(Game.state != GameState.FINISHED)
    ).first()

    if not current_game:
        raise HTTPException(status_code=404, detail="No active game found")

    team = Team(
        name=team_data.name,
        game_id=current_game.id,
        current_word_index=len(
            game_manager.puzzle_loader.get_word_chain(current_game.puzzle_name)
        )
        // 2,  # Start in middle - teams can work forward or backward
    )
    session.add(team)
    session.commit()
    session.refresh(team)
    return team


@router.get("/teams", response_model=List[TeamResponse])
async def get_teams(session: Session = Depends(get_session)):
    """Get all teams for the current game."""
    current_game = session.exec(
        select(Game).where(Game.state != GameState.FINISHED)
    ).first()

    if not current_game:
        return []

    teams = session.exec(select(Team).where(Team.game_id == current_game.id)).all()
    return teams


@router.post("/teams/{team_id}/join")
async def join_team(
    team_id: int, join_request: JoinTeamRequest, session: Session = Depends(get_session)
):
    """Add a player to a team."""
    # Find player by session_id
    player = session.exec(
        select(Player).where(Player.session_id == join_request.player_session_id)
    ).first()

    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    # Check if team exists
    team = session.get(Team, team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    # Update player's team
    player.team_id = team_id
    session.add(player)
    session.commit()

    # Notify the player via WebSocket if they're connected
    from .websocket import notify_player_team_assignment
    await notify_player_team_assignment(player.session_id, team_id, team.name)

    return {"message": f"Player {player.name} joined team {team.name}"}


@router.post("/guess", response_model=GuessResponse)
async def submit_guess(
    guess_data: GuessCreate, session: Session = Depends(get_session)
):
    """Submit a guess for a word."""
    # Find player
    player = session.exec(
        select(Player).where(Player.session_id == guess_data.player_session_id)
    ).first()

    if not player or not player.team_id:
        raise HTTPException(status_code=404, detail="Player not found or not on a team")

    # Get team
    team = session.get(Team, player.team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    # Get current game
    game = session.get(Game, team.game_id)
    if not game or game.state != GameState.ACTIVE:
        raise HTTPException(status_code=400, detail="Game is not active")

    # Use team lock for optimistic locking
    with game_manager.get_team_lock(team.id):
        # Check if guess is correct
        is_correct = game_manager.check_answer(
            game.puzzle_name,
            team.current_word_index,
            guess_data.guess,
            guess_data.direction,
        )

        # Record the guess
        guess = Guess(
            team_id=team.id,
            player_id=player.id,
            word_index=team.current_word_index,
            direction=guess_data.direction,
            guess=guess_data.guess,
            is_correct=is_correct,
        )
        session.add(guess)

        # If correct, advance team progress
        if is_correct:
            game_manager.advance_team_progress(team, guess_data.direction)
            session.add(team)

            # Check if puzzle is complete
            if game_manager.is_puzzle_complete(game.puzzle_name, team):
                team.completed_at = datetime.utcnow()
                session.add(team)

        session.commit()
        session.refresh(guess)

        # Notify team members of the new guess via WebSocket
        await notify_team_guess(
            team.id,
            {
                "id": guess.id,
                "player_name": player.name,
                "word_index": guess.word_index,
                "direction": guess.direction,
                "guess": guess.guess,
                "is_correct": guess.is_correct,
                "submitted_at": guess.submitted_at.isoformat(),
            },
        )

        # If correct, also notify about progress update
        if is_correct:
            progress_data = {
                "team_id": team.id,
                "current_word_index": team.current_word_index,
                "completed": team.completed_at is not None,
            }
            await notify_team_progress(team.id, progress_data)

        return guess


@router.get("/teams/{team_id}/progress")
async def get_team_progress(team_id: int, session: Session = Depends(get_session)):
    """Get team progress information."""
    team = session.get(Team, team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    game = session.get(Game, team.game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    try:
        words = game_manager.puzzle_loader.get_word_chain(game.puzzle_name)
        current_word = words[team.current_word_index]

        forward_clue = game_manager.get_current_clue(game.puzzle_name, team, "forward")
        backward_clue = game_manager.get_current_clue(
            game.puzzle_name, team, "backward"
        )

        forward_next_length = game_manager.get_next_word_length(
            game.puzzle_name, team.current_word_index, "forward"
        )
        backward_next_length = game_manager.get_next_word_length(
            game.puzzle_name, team.current_word_index, "backward"
        )

        # Get recent guesses for this team's current word
        recent_guesses = session.exec(
            select(Guess)
            .where(Guess.team_id == team_id)
            .where(Guess.word_index == team.current_word_index)
            .order_by(Guess.submitted_at.desc())
            .limit(10)
        ).all()

        return {
            "team_id": team.id,
            "team_name": team.name,
            "current_word": current_word,
            "current_word_index": team.current_word_index,
            "total_words": len(words),
            "forward_clue": forward_clue,
            "backward_clue": backward_clue,
            "forward_next_length": forward_next_length,
            "backward_next_length": backward_next_length,
            "recent_guesses": recent_guesses,
            "completed": team.completed_at is not None,
            "completed_at": team.completed_at,
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error getting team progress: {str(e)}"
        )


@router.post("/games/{game_id}/start")
async def start_game(game_id: int, session: Session = Depends(get_session)):
    """Start the game."""
    game = session.get(Game, game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    if game.state != GameState.LOBBY:
        raise HTTPException(status_code=400, detail="Game has already started")

    game.state = GameState.ACTIVE
    game.started_at = datetime.utcnow()
    session.add(game)
    session.commit()

    # Notify all players that the game has started
    await notify_game_state_change(GameState.ACTIVE)

    return {"message": "Game started successfully"}
