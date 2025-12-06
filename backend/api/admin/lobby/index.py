from uuid import uuid4
import json
import math

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import selectinload
from sqlmodel import Session, select, func
from pydantic import BaseModel
from datetime import datetime, timezone

from backend.custom_logging import api_logger
from backend.database import Lobby, Player, Team, Game, get_session
from backend.database.models import RoundResult
from backend.dependencies import check_admin_token
from backend.schemas import GeneratedNameResponse, LobbyCreate, LobbyInfo, MessageResponse
from backend.utils.name_generator import generate_lobby_name
from backend.websocket.managers import lobby_websocket_manager
from backend.websocket.events import RoundEndedEvent, NewRoundStartedEvent
from backend.game.puzzles import Puzzle as PuzzlePydantic

router = APIRouter(dependencies=[Depends(check_admin_token)])


@router.post("/lobby", response_model=Lobby)
async def create_lobby(
    lobby_data: LobbyCreate,
    db: Session = Depends(get_session),
):
    # Auto-generate lobby name if not provided
    lobby_name = lobby_data.name if lobby_data.name else generate_lobby_name()
    api_logger.info(f"Admin requested lobby creation: name={lobby_name}")
    lobby = Lobby(name=lobby_name, code=uuid4().hex[:6].upper())
    db.add(lobby)
    db.commit()
    db.refresh(lobby)
    api_logger.info(f"Created lobby id={lobby.id} code={lobby.code} name={lobby.name}")
    return lobby


@router.get("/lobby/random-name", response_model=GeneratedNameResponse)
async def get_random_lobby_name():
    """Return a randomly generated lobby name for admins to use in the UI."""
    name = generate_lobby_name()
    api_logger.info(f"Generated random lobby name='{name}'")
    return GeneratedNameResponse(name=name)


@router.get("/lobby", response_model=list[Lobby])
async def get_all_lobbies(db: Session = Depends(get_session)):
    api_logger.info("Admin requested list of all lobbies")
    lobbies = db.exec(select(Lobby)).all()
    api_logger.info(f"Returning {len(lobbies)} lobbies")
    return lobbies


@router.get("/lobby/{lobby_id}", response_model=LobbyInfo)
async def get_lobby_info(lobby_id: int, db: Session = Depends(get_session)):
    api_logger.info(f"Admin requested lobby info: lobby_id={lobby_id}")
    lobby = db.exec(
        select(Lobby).options(selectinload(Lobby.players), selectinload(Lobby.teams)).where(Lobby.id == lobby_id)
    ).first()
    if not lobby:
        api_logger.warning(f"Lobby not found lobby_id={lobby_id}")
        raise HTTPException(status_code=404, detail="Lobby not found")

    players = lobby.players
    teams = lobby.teams
    api_logger.info(f"Found {len(players)} players in lobby_id={lobby.id}")

    players_by_team = {}
    for player in players:
        if player.team_id is None:
            continue
        if player.team_id not in players_by_team:
            players_by_team[player.team_id] = []
        players_by_team[player.team_id].append(player)
    api_logger.info(f"Admin returning lobby info for {lobby_id}: {len(teams)} teams, {len(players)} players")

    return LobbyInfo(lobby=lobby, players=players, players_by_team=players_by_team, teams=teams)


@router.delete("/lobby/player/{player_id}", response_model=MessageResponse)
async def kick_player(
    player_id: int,
    db: Session = Depends(get_session),
):
    api_logger.info(f"Admin requested player kick: player_id={player_id}")

    player = db.get(Player, player_id)
    if not player:
        api_logger.warning(f"Player kick failed: player not found player_id={player_id}")
        raise HTTPException(status_code=404, detail="Player not found")

    player_name = player.name
    lobby_id = player.lobby_id
    player_session_id = player.session_id

    await lobby_websocket_manager.kick_player(lobby_id, player_session_id)

    # Delete player (this will cascade delete related guesses)
    db.delete(player)
    db.commit()

    api_logger.info(f"Successfully kicked player {player_name} (id={player_id}) from lobby_id={lobby_id}")
    return MessageResponse(status=True, message=f"Player '{player_name}' has been kicked from the lobby")


@router.delete("/lobby/{lobby_id}", response_model=MessageResponse)
async def delete_lobby(lobby_id: int, db: Session = Depends(get_session)):
    api_logger.info(f"Admin requested lobby deletion: lobby_id={lobby_id}")
    lobby = db.get(Lobby, lobby_id)
    if not lobby:
        api_logger.warning(f"Delete failed: lobby not found lobby_id={lobby_id}")
        raise HTTPException(status_code=404, detail="Lobby not found")

    # this cascades delete all related players and teams
    db.delete(lobby)
    db.commit()
    api_logger.info(f"Successfully deleted lobby_id={lobby_id} name={lobby.name}")

    return MessageResponse(status=True, message=f"Lobby '{lobby.name}' deleted successfully")


# Response models for game state endpoint
class TeamGameProgress(BaseModel):
    team_id: int
    team_name: str
    puzzle: dict  # Full puzzle with all words visible to admin
    revealed_steps: list[int]
    is_completed: bool
    completed_at: str | None


class GameStateResponse(BaseModel):
    is_game_active: bool
    teams: list[TeamGameProgress]


@router.get("/lobby/{lobby_id}/game-state", response_model=GameStateResponse)
async def get_game_state(lobby_id: int, db: Session = Depends(get_session)):
    """
    Get the current game state for all teams in a lobby.
    Returns full puzzle data (all words visible) and current progress for admin view.
    """
    api_logger.info(f"Admin requested game state: lobby_id={lobby_id}")

    # Check if lobby exists
    lobby = db.get(Lobby, lobby_id)
    if not lobby:
        api_logger.warning(f"Lobby not found lobby_id={lobby_id}")
        raise HTTPException(status_code=404, detail="Lobby not found")

    # Get all teams in the lobby
    teams = db.exec(select(Team).where(Team.lobby_id == lobby_id)).all()

    if not teams:
        api_logger.info(f"No teams found in lobby_id={lobby_id}")
        return GameStateResponse(is_game_active=False, teams=[])

    # Check if any team has a game assigned
    teams_with_games = [team for team in teams if team.game_id is not None]
    if not teams_with_games:
        api_logger.info(f"No active game in lobby_id={lobby_id}")
        return GameStateResponse(is_game_active=False, teams=[])

    # Check if any game has been completed (winner declared)
    # A game is completed when its completed_at field is set
    has_completed_game = False
    for team in teams_with_games:
        if team.game_id:
            game = db.get(Game, team.game_id)
            if game and game.completed_at is not None:
                has_completed_game = True
                break

    # Build progress data for each team
    team_progress_list = []
    for team in teams:
        if not team.game_id:
            continue

        # Get the game (puzzle) for this team
        game = db.get(Game, team.game_id)
        if not game:
            continue

        # Parse revealed steps
        revealed_steps_list = (
            json.loads(team.revealed_steps) if isinstance(team.revealed_steps, str) else team.revealed_steps
        )
        revealed_steps = revealed_steps_list if revealed_steps_list else []

        # Transform puzzle data to flatten structure for frontend
        puzzle_data = game.puzzle_data
        transformed_puzzle = {
            "title": puzzle_data.get("meta", {}).get("title", "Untitled Puzzle"),
            "ladder": puzzle_data.get("ladder", []),
        }

        team_progress = TeamGameProgress(
            team_id=team.id,
            team_name=team.name,
            puzzle=transformed_puzzle,
            revealed_steps=revealed_steps,
            is_completed=team.completed_at is not None,
            completed_at=team.completed_at.isoformat() if team.completed_at else None,
        )
        team_progress_list.append(team_progress)

    api_logger.info(
        f"Returning game state for lobby_id={lobby_id}: {len(team_progress_list)} teams, "
        f"is_game_active={not has_completed_game}"
    )
    return GameStateResponse(is_game_active=not has_completed_game, teams=team_progress_list)


def calculate_points(
    placement: int,
    total_teams: int,
    completion_percentage: float,
    completed: bool,
    worst_finished_points: int,
) -> int:
    """
    Calculate points for a team based on placement and completion.

    Reverse placement for finishers; DNFs get up to 75% of worst finished points,
    scaled by completion pct, ceil, min 1.
    """
    if completed:
        return total_teams - placement + 1
    base = worst_finished_points
    cap = base * 0.75
    return max(1, math.ceil(min(cap, base * completion_percentage)))


@router.post("/lobby/{lobby_id}/end", response_model=MessageResponse)
async def end_game(
    lobby_id: int,
    db: Session = Depends(get_session),
):
    """
    End the current game for a lobby and calculate round results.

    This endpoint:
    1. Determines placements for all teams
    2. Calculates and awards points
    3. Saves round results to database
    4. Updates team statistics
    5. Marks games as completed
    6. Creates a new game for the next round
    7. Broadcasts ROUND_ENDED and NEW_ROUND_STARTED events
    """
    api_logger.info(f"Admin requested to end game: lobby_id={lobby_id}")

    # Check if lobby exists
    lobby = db.get(Lobby, lobby_id)
    if not lobby:
        api_logger.warning(f"End game failed: lobby not found lobby_id={lobby_id}")
        raise HTTPException(status_code=404, detail="Lobby not found")

    # Get all active (not completed) games for this lobby
    active_games = db.exec(select(Game).where(Game.lobby_id == lobby_id).where(Game.completed_at.is_(None))).all()

    if not active_games:
        api_logger.warning(f"End game failed: no active game lobby_id={lobby_id}")
        raise HTTPException(status_code=400, detail="No active game to end")

    # Get all teams in the lobby
    teams = db.exec(select(Team).where(Team.lobby_id == lobby_id)).all()

    if not teams:
        raise HTTPException(status_code=400, detail="No teams in lobby")

    # Separate completed and DNF teams
    completed_teams = [t for t in teams if t.completed_at]
    completed_teams.sort(key=lambda t: (t.completed_at, t.id))  # Sort by completion time, then ID for tie-breaking

    dnf_teams = [t for t in teams if not t.completed_at]

    # Calculate completion percentage for DNF teams
    for team in dnf_teams:
        if not team.game_id:
            team.completion_pct = 0.0
            continue
        game = db.get(Game, team.game_id)
        if not game:
            team.completion_pct = 0.0
            continue
        puzzle = PuzzlePydantic(**game.puzzle_data)
        revealed = json.loads(team.revealed_steps) if team.revealed_steps else []
        team.completion_pct = len(revealed) / len(puzzle.ladder) if len(puzzle.ladder) > 0 else 0.0

    # Sort DNF teams by completion percentage (descending)
    dnf_teams.sort(key=lambda t: t.completion_pct, reverse=True)

    # Combine into ranked list
    all_teams_ranked = completed_teams + dnf_teams

    # Get next round number
    round_number = (
        db.exec(select(func.max(RoundResult.round_number)).where(RoundResult.lobby_id == lobby_id)).first() or 0
    )
    round_number += 1

    # Calculate worst_finished_points: points awarded to the lowest finished placement
    worst_finished_points = len(teams) - len(completed_teams) + 1 if completed_teams else len(teams)

    # Calculate points and save results
    for placement, team in enumerate(all_teams_ranked, start=1):
        completed = team in completed_teams
        completion_pct = 1.0 if completed else getattr(team, "completion_pct", 0.0)

        points = calculate_points(
            placement,
            len(teams),
            completion_pct,
            completed,
            worst_finished_points,
        )

        # Update team totals
        team.total_points += points
        team.rounds_played += 1
        if placement == 1:
            team.rounds_won += 1

        # Calculate time to complete
        time_to_complete = None
        if completed and team.game_id:
            game = db.get(Game, team.game_id)
            if game and game.started_at and team.completed_at:
                time_to_complete = int((team.completed_at - game.started_at).total_seconds())

        # Save round result
        round_result = RoundResult(
            lobby_id=lobby_id,
            game_id=team.game_id if team.game_id else active_games[0].id,
            team_id=team.id,
            round_number=round_number,
            placement=placement,
            points_earned=points,
            completion_percentage=completion_pct,
            time_to_complete=time_to_complete,
            completed_at=team.completed_at,
        )
        db.add(round_result)

    # Mark all games as completed
    completion_time = datetime.now(timezone.utc)
    for game in active_games:
        game.completed_at = completion_time
        db.add(game)

    db.commit()

    # Create a new Game row for next round
    # Use the same difficulty as the last game
    new_game = Game(
        lobby_id=lobby_id,
        difficulty=active_games[0].difficulty if active_games else "medium",
        puzzle_data=active_games[0].puzzle_data if active_games else "{}",
        started_at=datetime.now(tz=timezone.utc),
    )
    db.add(new_game)
    db.commit()
    db.refresh(new_game)

    # Reattach teams to new game and reset per-round fields
    for team in teams:
        team.completed_at = None
        team.revealed_steps = "[]"
        team.last_updated_at = None
        team.game_id = new_game.id
        db.add(team)

    db.commit()

    # Broadcast round ended event
    round_ended_event = RoundEndedEvent(
        lobby_id=lobby_id,
        round_number=round_number,
    )
    await lobby_websocket_manager.broadcast_to_lobby(lobby_id, round_ended_event)

    # Broadcast new round started event
    new_round_event = NewRoundStartedEvent(
        lobby_id=lobby_id,
        game_id=new_game.id,
        round_number=round_number + 1,
    )
    await lobby_websocket_manager.broadcast_to_lobby(lobby_id, new_round_event)

    api_logger.info(f"Successfully ended round {round_number} for lobby_id={lobby_id}")
    return MessageResponse(status=True, message=f"Round {round_number} ended, round {round_number + 1} started")
