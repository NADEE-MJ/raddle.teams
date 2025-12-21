from uuid import uuid4
import json
import math
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import selectinload
from sqlmodel import Session, func, select
from pydantic import BaseModel

from backend.custom_logging import api_logger
from backend.database import Lobby, Player, Team, Game, get_session
from backend.database.models import RoundResult
from backend.dependencies import check_admin_token
from backend.schemas import GeneratedNameResponse, LobbyCreate, LobbyInfo, MessageResponse
from backend.utils.name_generator import generate_lobby_name
from backend.websocket.events import LobbyDeletedEvent, NewRoundStartedEvent, RoundEndedEvent
from backend.websocket.managers import lobby_websocket_manager
from backend.game.puzzles import get_puzzle_manager

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
    team_id = player.team_id

    # If player was on a team, reset ready status for remaining team members
    if team_id:
        team_players = db.exec(select(Player).where(Player.team_id == team_id).where(Player.id != player_id)).all()
        for team_player in team_players:
            team_player.is_ready = False
            db.add(team_player)
        db.commit()

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

    players = db.exec(select(Player).where(Player.lobby_id == lobby_id)).all()
    await lobby_websocket_manager.broadcast_to_lobby(
        lobby_id,
        LobbyDeletedEvent(lobby_id=lobby_id, player_session_id=""),
    )
    for player in players:
        await lobby_websocket_manager.kick_player(lobby_id, player.session_id)

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

    # Game is active while any assigned game is still incomplete
    active_game_count = db.exec(
        select(Game)
        .join(Team, Team.game_id == Game.id)
        .where(Team.lobby_id == lobby_id)
        .where(Game.completed_at.is_(None))
    ).all()
    has_active_game = len(active_game_count) > 0

    # Build progress data for each team
    team_progress_list = []
    puzzle_manager = get_puzzle_manager()
    for team in teams:
        if not team.game_id:
            continue

        # Get the game (puzzle) for this team
        game = db.get(Game, team.game_id)
        if not game:
            continue

        # Parse revealed steps
        revealed_steps_list = (
            json.loads(game.revealed_steps) if isinstance(game.revealed_steps, str) else game.revealed_steps
        )
        revealed_steps = revealed_steps_list if revealed_steps_list else []

        puzzle_data = puzzle_manager.load_puzzle_by_path(game.puzzle_path).model_dump()
        transformed_puzzle = {
            "title": puzzle_data.get("meta", {}).get("title", "Untitled Puzzle"),
            "ladder": puzzle_data.get("ladder", []),
        }

        team_progress = TeamGameProgress(
            team_id=team.id,
            team_name=team.name,
            puzzle=transformed_puzzle,
            revealed_steps=revealed_steps,
            is_completed=game.completed_at is not None,
            completed_at=game.completed_at.isoformat() if game.completed_at else None,
        )
        team_progress_list.append(team_progress)

    api_logger.info(
        f"Returning game state for lobby_id={lobby_id}: {len(team_progress_list)} teams, "
        f"is_game_active={has_active_game}"
    )
    return GameStateResponse(is_game_active=has_active_game, teams=team_progress_list)


def calculate_points(
    placement: int,
    total_teams: int,
    completion_percentage: float,
    completed: bool,
    worst_finished_points: int,
) -> int:
    """
    Calculate points for a team based on placement and completion.

    Reverse placement for finishers: 1st gets n points, 2nd gets n-1, etc.
    DNFs get up to 75% of worst finished points, scaled by completion %, ceil, min 1.
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
    End the current game and calculate round results.

    This endpoint:
    1. Calculates points for all teams (finished and DNF)
    2. Creates RoundResult records
    3. Updates team tournament statistics
    4. Marks all games as completed
    5. Creates a new Game for the next round
    6. Resets teams for the next round
    7. Broadcasts round ended and new round started events
    """
    api_logger.info(f"Admin requested to end game: lobby_id={lobby_id}")

    # Check if lobby exists
    lobby = db.get(Lobby, lobby_id)
    if not lobby:
        api_logger.warning(f"End game failed: lobby not found lobby_id={lobby_id}")
        raise HTTPException(status_code=404, detail="Lobby not found")

    # Get all teams in the lobby
    teams = db.exec(select(Team).where(Team.lobby_id == lobby_id)).all()

    if not teams:
        api_logger.warning(f"End game failed: no teams in lobby_id={lobby_id}")
        raise HTTPException(status_code=400, detail="No teams in this lobby")

    # Get active games to determine if there's a game to end
    # Filter out games with empty puzzle_path (placeholder games for next round)
    active_games = db.exec(
        select(Game).where(Game.lobby_id == lobby_id).where(Game.completed_at.is_(None)).where(Game.puzzle_path != "")
    ).all()

    if not active_games:
        api_logger.warning(f"End game failed: no active game lobby_id={lobby_id}")
        raise HTTPException(status_code=400, detail="No active game to end")

    # Get the first active game (they should all be from the same round)
    game = active_games[0]
    puzzle_manager = get_puzzle_manager()
    puzzle = puzzle_manager.load_puzzle_by_path(game.puzzle_path)
    puzzle_length = len(puzzle.ladder)

    # Separate completed teams from DNF teams
    completed_teams = []
    dnf_teams = []

    for team in teams:
        if team.game_id is None:
            continue

        team_game = db.get(Game, team.game_id)
        if not team_game:
            continue

        # Check if team completed (game marked as completed for this team)
        if team_game.completed_at is not None:
            completed_teams.append(team)
        else:
            dnf_teams.append(team)

    # Sort completed teams by completed_at
    completed_teams.sort(key=lambda t: db.get(Game, t.game_id).completed_at)

    # Calculate completion percentage for DNF teams - store in dict
    team_completion_pct = {}
    for team in dnf_teams:
        team_game = db.get(Game, team.game_id)
        revealed = json.loads(team_game.revealed_steps) if team_game.revealed_steps else []
        team_completion_pct[team.id] = len(revealed) / puzzle_length if puzzle_length > 0 else 0.0

    # Sort DNF teams by completion percentage (descending)
    dnf_teams.sort(key=lambda t: team_completion_pct[t.id], reverse=True)

    # Combine: completed teams first, then DNF teams
    all_teams_ranked = completed_teams + dnf_teams

    # Determine round number
    round_number = (
        db.exec(select(func.max(RoundResult.round_number)).where(RoundResult.lobby_id == lobby_id)).first() or 0
    )
    round_number += 1

    # Calculate worst_finished_points: points awarded to the lowest finished placement
    if completed_teams:
        worst_finished_points = len(teams) - len(completed_teams) + 1
    else:
        worst_finished_points = len(teams)

    # Calculate points and create round results
    for placement, team in enumerate(all_teams_ranked, start=1):
        completed = team in completed_teams
        completion_pct = 1.0 if completed else team_completion_pct.get(team.id, 0.0)

        points = calculate_points(
            placement,
            len(teams),
            completion_pct,
            completed,
            worst_finished_points,
        )

        # Update team statistics
        team.total_points += points
        team.rounds_played += 1
        if placement == 1:
            team.rounds_won += 1

        # Calculate time to complete
        time_to_complete = None
        completed_at = None
        if completed:
            team_game = db.get(Game, team.game_id)
            time_to_complete = int((team_game.completed_at - team_game.started_at).total_seconds())
            completed_at = team_game.completed_at

        # Create round result
        round_result = RoundResult(
            lobby_id=lobby_id,
            game_id=team.game_id,
            team_id=team.id,
            round_number=round_number,
            placement=placement,
            points_earned=points,
            completion_percentage=completion_pct,
            time_to_complete=time_to_complete,
            completed_at=completed_at,
        )
        db.add(round_result)

        api_logger.info(
            f"Round {round_number} result: team={team.name} placement={placement} "
            f"points={points} completed={completed} completion_pct={completion_pct:.2%}"
        )

    # Reveal all puzzle steps for all teams (so they can see the complete puzzle)
    all_steps = list(range(puzzle_length))
    for game in active_games:
        game.revealed_steps = json.dumps(all_steps)
        game.completed_at = datetime.now(timezone.utc)
        game.last_updated_at = datetime.now(timezone.utc)

    # Reset all players' ready status
    all_players = db.exec(select(Player).where(Player.lobby_id == lobby_id)).all()
    for player in all_players:
        player.is_ready = False
        db.add(player)

    db.commit()

    # Broadcast state updates to all teams so they see the revealed puzzle
    from backend.websocket.events import StateUpdateEvent
    from backend.websocket.managers import lobby_websocket_manager

    for team in teams:
        if team.game_id:
            team_game = db.get(Game, team.game_id)
            if team_game:
                await lobby_websocket_manager.broadcast_to_team(
                    lobby_id,
                    team.id,
                    StateUpdateEvent(
                        team_id=team.id,
                        revealed_steps=all_steps,
                        is_completed=True,
                        last_updated_at=team_game.last_updated_at.isoformat(),
                    ),
                )

    # Create a new Game row for the next round
    new_game = Game(
        lobby_id=lobby_id,
        difficulty=game.difficulty,  # Keep same difficulty
        puzzle_path="",  # Will be set when the next game starts
        started_at=datetime.now(timezone.utc),
    )
    db.add(new_game)
    db.commit()
    db.refresh(new_game)

    # Reattach teams to the new game and reset per-round fields
    for team in teams:
        team.game_id = None  # Will be assigned when next game starts
        db.add(team)

    db.commit()

    # Broadcast round ended event
    await lobby_websocket_manager.broadcast_to_lobby(
        lobby_id,
        RoundEndedEvent(lobby_id=lobby_id, round_number=round_number),
    )

    # Broadcast new round started event
    await lobby_websocket_manager.broadcast_to_lobby(
        lobby_id,
        NewRoundStartedEvent(lobby_id=lobby_id, game_id=new_game.id, round_number=round_number + 1),
    )

    api_logger.info(
        f"Successfully ended round {round_number} for lobby_id={lobby_id}. New Game created: game_id={new_game.id}"
    )
    return MessageResponse(status=True, message=f"Round {round_number} ended for lobby {lobby.name}")


@router.get("/lobby/{lobby_id}/round-results/{round_number}", response_model=list[RoundResult])
async def get_round_results(
    lobby_id: int,
    round_number: int,
    db: Session = Depends(get_session),
):
    """Get detailed results for a specific round."""
    api_logger.info(f"Admin requested round results: lobby_id={lobby_id} round={round_number}")

    # Check if lobby exists
    lobby = db.get(Lobby, lobby_id)
    if not lobby:
        api_logger.warning(f"Lobby not found lobby_id={lobby_id}")
        raise HTTPException(status_code=404, detail="Lobby not found")

    results = db.exec(
        select(RoundResult)
        .where(RoundResult.lobby_id == lobby_id)
        .where(RoundResult.round_number == round_number)
        .order_by(RoundResult.placement)
    ).all()

    api_logger.info(f"Returning {len(results)} round results for lobby_id={lobby_id} round={round_number}")
    return results


class RoundSummary(BaseModel):
    """Summary info for a completed round."""

    round_number: int
    game_id: int


@router.get("/lobby/{lobby_id}/rounds", response_model=list[RoundSummary])
async def get_all_rounds(
    lobby_id: int,
    db: Session = Depends(get_session),
):
    """Get list of all rounds for a lobby."""
    api_logger.info(f"Admin requested all rounds: lobby_id={lobby_id}")

    # Check if lobby exists
    lobby = db.get(Lobby, lobby_id)
    if not lobby:
        api_logger.warning(f"Lobby not found lobby_id={lobby_id}")
        raise HTTPException(status_code=404, detail="Lobby not found")

    # Get all unique round numbers and their game_ids
    # Group by round_number to get one game_id per round (teams share rounds but may have different games)
    results = db.exec(
        select(RoundResult.round_number, func.min(RoundResult.game_id).label("game_id"))
        .where(RoundResult.lobby_id == lobby_id)
        .group_by(RoundResult.round_number)
        .order_by(RoundResult.round_number)
    ).all()

    rounds = [RoundSummary(round_number=r[0], game_id=r[1]) for r in results]

    api_logger.info(f"Returning {len(rounds)} rounds for lobby_id={lobby_id}")
    return rounds
