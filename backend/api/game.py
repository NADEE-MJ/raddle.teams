"""Game API endpoints and WebSocket handlers - Simplified authoritative model."""

import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from backend.custom_logging import websocket_logger
from backend.database import get_session
from backend.database.models import Game, Guess, Lobby, Player, Team
from backend.dependencies import check_admin_token
from backend.game.puzzles import Puzzle as PuzzlePydantic
from backend.game.puzzles import get_puzzle_manager
from backend.game.state_machine import GuessResult, TeamState, TeamStateMachine
from backend.websocket.events import (
    AlreadySolvedEvent,
    GameStartedEvent,
    GameWonEvent,
    GuessSubmittedEvent,
    StateUpdateEvent,
    TeamCompletedEvent,
    WordSolvedEvent,
)

router = APIRouter()


####################################################################
# ? REQUEST/RESPONSE MODELS
####################################################################


class StartGameRequest(BaseModel):
    difficulty: str  # "easy", "medium", "hard"


class StartGameResponse(BaseModel):
    success: bool
    game_id: int
    message: str


####################################################################
# ? HELPER FUNCTIONS
####################################################################


def get_team_state_machine(team: Team, game: Game) -> TeamStateMachine:
    """
    Get or create a state machine for a team.

    Args:
        team: Team model
        game: Game model containing the puzzle data

    Returns:
        TeamStateMachine instance
    """
    # Parse puzzle from game
    puzzle = PuzzlePydantic(**game.puzzle_data)

    # Load revealed steps from team
    revealed_steps_list = (
        json.loads(team.revealed_steps) if isinstance(team.revealed_steps, str) else team.revealed_steps
    )
    revealed_steps = set(revealed_steps_list) if revealed_steps_list else {0, len(puzzle.ladder) - 1}

    # Create state from team data
    if team.last_updated_at:
        state = TeamState(
            revealed_steps=revealed_steps,
            is_completed=team.completed_at is not None,
            last_updated_at=team.last_updated_at,
        )
        machine = TeamStateMachine(puzzle, initial_state=state)
    else:
        # New game, create fresh state machine
        machine = TeamStateMachine(puzzle)

    return machine


def save_team_state(team: Team, state: TeamState, session: Session):
    """
    Save team state to database.

    Args:
        team: Team model
        state: Team state
        session: Database session
    """
    team.revealed_steps = json.dumps(sorted(list(state.revealed_steps)))
    team.last_updated_at = state.last_updated_at

    if state.is_completed and not team.completed_at:
        team.completed_at = datetime.now(tz=timezone.utc)

    session.add(team)
    session.commit()
    session.refresh(team)


####################################################################
# ? API ENDPOINTS
####################################################################


@router.post("/admin/lobby/{lobby_id}/start", response_model=StartGameResponse)
async def start_game(
    lobby_id: int,
    request: StartGameRequest,
    session: Session = Depends(get_session),
    is_admin: bool = Depends(check_admin_token),
):
    """
    Start a game for a lobby (admin only).

    This endpoint:
    1. Creates a Game record
    2. Assigns different puzzles to each team (same difficulty)
    3. Initializes team state machines
    4. Broadcasts GAME_STARTED event to all players
    """
    # Check if lobby exists
    lobby = session.get(Lobby, lobby_id)
    if not lobby:
        raise HTTPException(status_code=404, detail="Lobby not found")

    # Check if there's an active (not completed) game
    active_game = session.exec(select(Game).where(Game.lobby_id == lobby_id).where(Game.completed_at.is_(None))).first()
    if active_game:
        raise HTTPException(
            status_code=400,
            detail="A game is currently in progress. Wait for it to complete before starting a new one.",
        )

    # Get all teams in the lobby
    teams = session.exec(select(Team).where(Team.lobby_id == lobby_id)).all()
    if not teams:
        raise HTTPException(status_code=400, detail="No teams in lobby")

    # Get puzzles for each team
    puzzle_manager = get_puzzle_manager()
    try:
        puzzles = puzzle_manager.get_puzzles_for_teams(len(teams), request.difficulty)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Create a Game (puzzle assignment) for each team
    from backend.websocket.managers import lobby_websocket_manager

    for i, team in enumerate(teams):
        puzzle = puzzles[i]

        # Create Game record for this team's puzzle
        game = Game(
            lobby_id=lobby_id,
            difficulty=request.difficulty,
            puzzle_data=puzzle_manager.puzzle_to_dict(puzzle),
        )
        session.add(game)
        session.flush()  # Flush to get game.id

        # Link team to their puzzle
        team.game_id = game.id

        # Initialize state machine
        machine = TeamStateMachine(puzzle)
        initial_state = machine.get_current_state()

        # Save initial state to team
        save_team_state(team, initial_state, session)

        # Register all players in this team for team broadcasts
        players = session.exec(select(Player).where(Player.team_id == team.id)).all()
        for player in players:
            lobby_websocket_manager.register_player_team(player.session_id, team.id)

        # Broadcast GAME_STARTED event to team
        event = GameStartedEvent(
            team_id=team.id,
            puzzle_title=puzzle.meta.title,
            puzzle_length=len(puzzle.ladder),
        )
        await lobby_websocket_manager.broadcast_to_team(lobby_id, team.id, event)

    # Also broadcast GAME_STARTED to lobby (for admins) using the first team's event
    first_team_event = GameStartedEvent(
        team_id=teams[0].id,
        puzzle_title=puzzles[0].meta.title,
        puzzle_length=len(puzzles[0].ladder),
    )
    await lobby_websocket_manager.broadcast_to_lobby(lobby_id, first_team_event)

    session.commit()

    # Return the first game ID (doesn't matter which one for response)
    first_game = session.exec(select(Game).where(Game.lobby_id == lobby_id)).first()

    return StartGameResponse(
        success=True,
        game_id=first_game.id if first_game else 0,
        message=f"Game started with {len(teams)} teams",
    )


@router.get("/game/puzzle")
async def get_team_puzzle(
    session: Session = Depends(get_session),
    player_session_id: str = None,
):
    """
    Get the puzzle and current state for the player's team.

    Returns the full puzzle data and current game state so the frontend can initialize.
    """
    if not player_session_id:
        raise HTTPException(status_code=401, detail="Player session ID required")

    # Get player
    player = session.exec(select(Player).where(Player.session_id == player_session_id)).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    if not player.team_id:
        raise HTTPException(status_code=400, detail="Player not assigned to a team")

    # Get team
    team = session.get(Team, player.team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    if not team.game_id:
        raise HTTPException(status_code=400, detail="Game not started yet")

    # Get game (puzzle)
    game = session.get(Game, team.game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    # Build current team state
    machine = get_team_state_machine(team, game)
    current_state = machine.get_current_state().to_dict()

    # Transform puzzle data to flatten structure for frontend
    puzzle_data = game.puzzle_data
    transformed_puzzle = {
        "title": puzzle_data.get("meta", {}).get("title", "Untitled Puzzle"),
        "ladder": puzzle_data.get("ladder", []),
    }

    # Return puzzle data and state
    return {
        "puzzle": transformed_puzzle,
        "team_id": team.id,
        "team_name": team.name,
        "lobby_id": team.lobby_id,
        "state": current_state,
    }


####################################################################
# ? WEBSOCKET HANDLERS
####################################################################


async def handle_guess_submission(
    lobby_id: int,
    player_session_id: str,
    message: dict,
    websocket_manager,
):
    """
    Handle a guess submission via WebSocket.

    Simplified: Just check if guess is correct for target word_index,
    update revealed_steps, and broadcast to team.

    Args:
        lobby_id: Lobby ID
        player_session_id: Player's session ID
        message: Message data containing the guess and word_index
        websocket_manager: WebSocket manager instance
    """
    from backend.database import get_session_context

    async with get_session_context() as session:
        try:
            # Get player
            player = session.exec(select(Player).where(Player.session_id == player_session_id)).first()
            if not player or not player.team_id:
                websocket_logger.warning(f"Player {player_session_id} not found or not on a team")
                return

            # Get team
            team = session.get(Team, player.team_id)
            if not team:
                websocket_logger.warning(f"Team {player.team_id} not found")
                return

            # Get game assigned to this team
            if not team.game_id:
                websocket_logger.warning(f"Team {team.id} is not assigned to a game")
                return

            game = session.get(Game, team.game_id)
            if not game:
                websocket_logger.warning(f"No active game for team {team.id}")
                return

            # Get state machine
            machine = get_team_state_machine(team, game)

            # Submit guess
            guess_text = message.get("guess", "").strip()
            word_index = message.get("word_index", -1)

            result: GuessResult = machine.submit_guess(guess_text, word_index)

            # Save guess to database (only if we want to track it)
            guess = Guess(
                team_id=team.id,
                player_id=player.id,
                game_id=team.game_id,
                word_index=word_index,
                direction="",  # Direction is client-side only now
                guess=guess_text,
                is_correct=result.is_correct,
            )
            session.add(guess)

            # Handle already solved (race condition)
            if result.already_solved:
                event = AlreadySolvedEvent(
                    team_id=team.id,
                    word_index=word_index,
                )
                # Send only to the player who submitted
                await websocket_manager.send_to_player(lobby_id, player_session_id, event)
                session.commit()
                return

            # Broadcast guess to team
            guess_event = GuessSubmittedEvent(
                team_id=team.id,
                player_id=player.id,
                player_name=player.name,
                word_index=word_index,
                guess=guess_text,
                is_correct=result.is_correct,
                direction="",  # Not relevant anymore
            )
            await websocket_manager.broadcast_to_team(lobby_id, team.id, guess_event)

            # If correct, update state and broadcast
            if result.is_correct and result.new_state:
                # Save new state
                save_team_state(team, result.new_state, session)

                # Broadcast word solved event
                word_solved_event = WordSolvedEvent(
                    team_id=team.id,
                    player_id=player.id,
                    player_name=player.name,
                    word_index=word_index,
                    word=result.expected_word or "",
                    direction="",  # Not relevant
                )
                await websocket_manager.broadcast_to_team(lobby_id, team.id, word_solved_event)

                # Broadcast state update
                state_event = StateUpdateEvent(
                    team_id=team.id,
                    revealed_steps=sorted(list(result.new_state.revealed_steps)),
                    is_completed=result.new_state.is_completed,
                    last_updated_at=result.new_state.last_updated_at.isoformat(),
                )
                await websocket_manager.broadcast_to_team(lobby_id, team.id, state_event)

                # If completed, broadcast team completion
                if result.new_state.is_completed:
                    team_completed_event = TeamCompletedEvent(
                        team_id=team.id,
                        team_name=team.name,
                        completed_at=team.completed_at.isoformat()
                        if team.completed_at
                        else datetime.now(tz=timezone.utc).isoformat(),
                    )
                    await websocket_manager.broadcast_to_team(lobby_id, team.id, team_completed_event)

                    # Check if this is the first team to complete
                    completed_teams = session.exec(
                        select(Team).where(Team.lobby_id == lobby_id).where(Team.completed_at.isnot(None))
                    ).all()

                    if len(completed_teams) == 1:
                        # This team won! Mark their game as completed
                        team_game = session.get(Game, team.game_id)
                        if team_game:
                            team_game.completed_at = datetime.now(tz=timezone.utc)
                            session.add(team_game)

                        # Broadcast win to entire lobby
                        win_event = GameWonEvent(
                            lobby_id=lobby_id,
                            winning_team_id=team.id,
                            winning_team_name=team.name,
                        )
                        await websocket_manager.broadcast_to_lobby(lobby_id, win_event)

            session.commit()

        except Exception as e:
            websocket_logger.exception(f"Error handling guess submission: {e}")
            session.rollback()


# Direction switching handler removed - direction is now client-side only
