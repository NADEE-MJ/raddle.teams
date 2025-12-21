"""Game API endpoints and WebSocket handlers - Simplified authoritative model."""

import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, func, select

from backend.custom_logging import websocket_logger
from backend.database import get_session
from backend.database.models import Game, Guess, Lobby, Player, Team
from backend.dependencies import check_admin_token
from backend.game.puzzles import get_puzzle_manager
from backend.game.state_machine import GuessResult, TeamState, TeamStateMachine
from backend.schemas import AdminStartGameRequest
from backend.websocket.events import (
    AlreadySolvedEvent,
    GameStartedEvent,
    GuessSubmittedEvent,
    StateUpdateEvent,
    TeamCompletedEvent,
    TeamPlacedEvent,
    WordSolvedEvent,
)

router = APIRouter()


####################################################################
# ? REQUEST/RESPONSE MODELS
####################################################################


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
    puzzle_manager = get_puzzle_manager()
    puzzle = puzzle_manager.load_puzzle_by_path(game.puzzle_path)

    # Load revealed steps from game
    revealed_steps_list = (
        json.loads(game.revealed_steps) if isinstance(game.revealed_steps, str) else game.revealed_steps
    )
    revealed_steps = set(revealed_steps_list) if revealed_steps_list else {0, len(puzzle.ladder) - 1}

    # Create state from game data
    if game.last_updated_at:
        state = TeamState(
            revealed_steps=revealed_steps,
            is_completed=game.completed_at is not None,
            last_updated_at=game.last_updated_at,
        )
        machine = TeamStateMachine(puzzle, initial_state=state)
    else:
        # New game, create fresh state machine
        machine = TeamStateMachine(puzzle)

    return machine


def save_game_state(game: Game, state: TeamState, session: Session):
    """
    Save team state to database.

    Args:
        team: Team model
        state: Team state
        session: Database session
    """
    game.revealed_steps = json.dumps(sorted(list(state.revealed_steps)))
    game.last_updated_at = state.last_updated_at

    if state.is_completed and not game.completed_at:
        game.completed_at = datetime.now(tz=timezone.utc)

    session.add(game)
    session.commit()
    session.refresh(game)


####################################################################
# ? API ENDPOINTS
####################################################################


@router.post("/admin/lobby/{lobby_id}/start", response_model=StartGameResponse)
async def start_game(
    lobby_id: int,
    request: AdminStartGameRequest,
    session: Session = Depends(get_session),
    is_admin: bool = Depends(check_admin_token),
):
    """
    Start a game for a lobby (admin only).

    This endpoint:
    1. Creates a Game record
    2. Assigns puzzles to each team based on configuration (same or different)
    3. Initializes team state machines
    4. Broadcasts GAME_STARTED event to all players
    """
    # Validate puzzle_mode and word_count_mode
    if request.puzzle_mode not in ["same", "different"]:
        raise HTTPException(status_code=400, detail="puzzle_mode must be 'same' or 'different'")
    if request.word_count_mode not in ["exact", "balanced"]:
        raise HTTPException(status_code=400, detail="word_count_mode must be 'exact' or 'balanced'")

    # Check if lobby exists
    lobby = session.get(Lobby, lobby_id)
    if not lobby:
        raise HTTPException(status_code=404, detail="Lobby not found")

    # Check if there's an active (not completed) game assigned to any team
    active_game = session.exec(
        select(Game)
        .join(Team, Team.game_id == Game.id)
        .where(Team.lobby_id == lobby_id)
        .where(Game.completed_at.is_(None))
    ).first()
    if active_game:
        raise HTTPException(
            status_code=400,
            detail="A game is currently in progress. Wait for it to complete before starting a new one.",
        )

    # Get all teams in the lobby
    teams = session.exec(select(Team).where(Team.lobby_id == lobby_id)).all()
    if not teams:
        raise HTTPException(status_code=400, detail="No teams in lobby")

    # Validate all players with teams are ready
    all_players = session.exec(select(Player).where(Player.lobby_id == lobby_id)).all()
    players_with_teams = [p for p in all_players if p.team_id is not None]

    if not players_with_teams:
        raise HTTPException(status_code=400, detail="No players assigned to teams")

    unready_players = [p for p in players_with_teams if not p.is_ready]
    if unready_players:
        unready_names = ", ".join([p.name for p in unready_players])
        raise HTTPException(status_code=400, detail=f"Not all players are ready. Waiting for: {unready_names}")

    used_puzzle_paths = session.exec(select(Game.puzzle_path).where(Game.lobby_id == lobby_id)).all()
    used_puzzle_paths = {path for path in used_puzzle_paths if path}

    # Get puzzles for each team based on configuration
    puzzle_manager = get_puzzle_manager()
    try:
        if request.puzzle_mode == "same":
            # All teams get the same puzzle
            puzzles = puzzle_manager.get_same_puzzle_for_teams(
                len(teams), request.difficulty, exclude_paths=used_puzzle_paths
            )
        else:
            # Each team gets a different puzzle
            puzzles = puzzle_manager.get_puzzles_for_teams(
                len(teams),
                request.difficulty,
                request.word_count_mode,
                exclude_paths=used_puzzle_paths,
            )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Create a Game (puzzle assignment) for each team
    from backend.websocket.managers import lobby_websocket_manager

    for i, team in enumerate(teams):
        puzzle_file = puzzles[i]
        puzzle = puzzle_file.puzzle
        puzzle_path = puzzle_manager.normalize_puzzle_path(puzzle_file.path)
        puzzle_manager.cache_puzzle(puzzle_path, puzzle)

        # Create Game record for this team's puzzle
        game = Game(
            lobby_id=lobby_id,
            difficulty=request.difficulty,
            puzzle_path=puzzle_path,
        )
        session.add(game)
        session.flush()  # Flush to get game.id

        # Link team to their puzzle
        team.game_id = game.id

        # Initialize state machine
        machine = TeamStateMachine(puzzle)
        initial_state = machine.get_current_state()

        # Save initial state to game
        save_game_state(game, initial_state, session)

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
        puzzle_title=puzzles[0].puzzle.meta.title,
        puzzle_length=len(puzzles[0].puzzle.ladder),
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
    puzzle_data = machine.puzzle.model_dump()
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
                save_game_state(game, result.new_state, session)

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
                # Also broadcast to admins so they can see team progress
                await websocket_manager.admin_web_socket_manager.broadcast_to_lobby(lobby_id, state_event)

                # If completed, broadcast team completion
                if result.new_state.is_completed:
                    team_completed_event = TeamCompletedEvent(
                        team_id=team.id,
                        team_name=team.name,
                        completed_at=game.completed_at.isoformat()
                        if game.completed_at
                        else datetime.now(tz=timezone.utc).isoformat(),
                    )
                    await websocket_manager.broadcast_to_team(lobby_id, team.id, team_completed_event)
                    # Also broadcast to admins
                    await websocket_manager.admin_web_socket_manager.broadcast_to_lobby(lobby_id, team_completed_event)

                    # Calculate placement by counting prior completions (ordered by completed_at, then id for tiebreaker)
                    prior_completions = (
                        session.exec(
                            select(func.count(Team.id))
                            .join(Game, Team.game_id == Game.id)
                            .where(Team.lobby_id == lobby_id)
                            .where(Game.completed_at.isnot(None))
                            .where(
                                (Game.completed_at < game.completed_at)
                                | ((Game.completed_at == game.completed_at) & (Team.id < team.id))
                            )
                        ).first()
                        or 0
                    )
                    placement = prior_completions + 1

                    # Get the current first place team
                    first_place_team = session.exec(
                        select(Team)
                        .join(Game, Team.game_id == Game.id)
                        .where(Team.lobby_id == lobby_id)
                        .where(Game.completed_at.isnot(None))
                        .order_by(Game.completed_at, Team.id)
                        .limit(1)
                    ).first()
                    first_place_team_name = first_place_team.name if first_place_team else team.name

                    # Broadcast TEAM_PLACED to entire lobby so all teams see placements
                    team_placed_event = TeamPlacedEvent(
                        team_id=team.id,
                        team_name=team.name,
                        placement=placement,
                        points_earned=0,  # Will be calculated in Phase 5
                        completed_at=game.completed_at.isoformat()
                        if game.completed_at
                        else datetime.now(tz=timezone.utc).isoformat(),
                        first_place_team_name=first_place_team_name,
                    )
                    await websocket_manager.broadcast_to_lobby(lobby_id, team_placed_event)

                    incomplete_games = (
                        session.exec(
                            select(func.count(Game.id))
                            .join(Team, Team.game_id == Game.id)
                            .where(Team.lobby_id == lobby_id)
                            .where(Game.completed_at.is_(None))
                        ).first()
                        or 0
                    )
                    if incomplete_games == 0:
                        ready_players = session.exec(
                            select(Player).where(Player.lobby_id == lobby_id, Player.is_ready.is_(True))
                        ).all()
                        if ready_players:
                            for ready_player in ready_players:
                                ready_player.is_ready = False
                                session.add(ready_player)
                            session.commit()

                            await websocket_manager.broadcast_to_lobby(
                                lobby_id,
                                {"type": "game_ended", "lobby_id": lobby_id},
                            )

            session.commit()

        except Exception as e:
            websocket_logger.exception(f"Error handling guess submission: {e}")
            session.rollback()


# Direction switching handler removed - direction is now client-side only
