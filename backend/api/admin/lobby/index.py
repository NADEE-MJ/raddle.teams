from uuid import uuid4
import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import selectinload
from sqlmodel import Session, select
from pydantic import BaseModel

from backend.custom_logging import api_logger
from backend.database import Lobby, Player, Team, Game, RoundResult, get_session
from backend.dependencies import check_admin_token
from backend.schemas import GeneratedNameResponse, LobbyCreate, LobbyInfo, MessageResponse
from backend.utils.name_generator import generate_lobby_name
from backend.websocket.managers import lobby_websocket_manager

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
    game_id: int
    puzzle: dict  # Full puzzle with all words visible to admin
    revealed_steps: list[int]
    is_completed: bool
    completed_at: str | None


class GameStateResponse(BaseModel):
    is_game_active: bool
    teams: list[TeamGameProgress]


class RoundHistoryEntry(BaseModel):
    round_number: int
    game_id: int
    started_at: str | None
    completed_at: str | None
    winner_team_id: int | None
    winner_team_name: str | None


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

    games = [db.get(Game, team.game_id) for team in teams_with_games if team.game_id]
    active_games = [g for g in games if g and g.completed_at is None]
    active_games_with_puzzle = [g for g in active_games if len(g.puzzle_data.get("ladder", [])) > 0]

    is_game_active = bool(active_games_with_puzzle)

    if not active_games_with_puzzle:
        api_logger.info(f"No active puzzle data in lobby_id={lobby_id}")
        return GameStateResponse(is_game_active=False, teams=[])

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
            game_id=team.game_id,
            puzzle=transformed_puzzle,
            revealed_steps=revealed_steps,
            is_completed=team.completed_at is not None,
            completed_at=team.completed_at.isoformat() if team.completed_at else None,
        )
        team_progress_list.append(team_progress)

    api_logger.info(
        f"Returning game state for lobby_id={lobby_id}: {len(team_progress_list)} teams, "
        f"is_game_active={is_game_active}"
    )
    return GameStateResponse(is_game_active=is_game_active, teams=team_progress_list)


@router.get("/lobby/{lobby_id}/rounds", response_model=list[RoundHistoryEntry])
async def get_round_history(lobby_id: int, db: Session = Depends(get_session)):
    """
    Return a summary of all completed rounds for a lobby so admins can review past games.
    """
    api_logger.info(f"Admin requested round history: lobby_id={lobby_id}")

    lobby = db.get(Lobby, lobby_id)
    if not lobby:
        api_logger.warning(f"Lobby not found lobby_id={lobby_id}")
        raise HTTPException(status_code=404, detail="Lobby not found")

    round_results = db.exec(
        select(RoundResult)
        .where(RoundResult.lobby_id == lobby_id)
        .order_by(RoundResult.round_number.desc(), RoundResult.placement)
    ).all()

    if not round_results:
        api_logger.info(f"No round history for lobby_id={lobby_id}")
        return []

    game_ids = {rr.game_id for rr in round_results if rr.game_id}
    games = db.exec(select(Game).where(Game.id.in_(list(game_ids)))).all() if game_ids else []
    games_by_id = {g.id: g for g in games}

    team_ids = {rr.team_id for rr in round_results}
    teams = db.exec(select(Team).where(Team.id.in_(list(team_ids)))).all()
    teams_by_id = {t.id: t for t in teams}

    winners_by_game: dict[int, int] = {}
    for rr in round_results:
        if rr.game_id and rr.placement == 1 and rr.game_id not in winners_by_game:
            winners_by_game[rr.game_id] = rr.team_id

    history: list[RoundHistoryEntry] = []
    seen_games: set[int] = set()

    for rr in round_results:
        if not rr.game_id or rr.game_id in seen_games:
            continue

        game = games_by_id.get(rr.game_id)
        winner_team = teams_by_id.get(winners_by_game.get(rr.game_id)) if winners_by_game.get(rr.game_id) else None

        history.append(
            RoundHistoryEntry(
                round_number=rr.round_number,
                game_id=rr.game_id,
                started_at=game.started_at.isoformat() if game else None,
                completed_at=game.completed_at.isoformat() if game and game.completed_at else None,
                winner_team_id=winner_team.id if winner_team else None,
                winner_team_name=winner_team.name if winner_team else None,
            )
        )
        seen_games.add(rr.game_id)

    api_logger.info(f"Returning {len(history)} round history records for lobby_id={lobby_id}")
    return history


@router.get("/lobby/{lobby_id}/round-results/{round_number}", response_model=list[RoundResult])
async def get_round_results(lobby_id: int, round_number: int, db: Session = Depends(get_session)):
    """Get detailed results for a specific round."""
    api_logger.info(f"Admin requested round results: lobby_id={lobby_id}, round_number={round_number}")

    lobby = db.get(Lobby, lobby_id)
    if not lobby:
        api_logger.warning(f"Lobby not found when fetching round results lobby_id={lobby_id}")
        raise HTTPException(status_code=404, detail="Lobby not found")

    results = (
        db.exec(
            select(RoundResult)
            .where(RoundResult.lobby_id == lobby_id)
            .where(RoundResult.round_number == round_number)
            .order_by(RoundResult.placement)
        ).all()
        or []
    )

    api_logger.info(f"Returning {len(results)} round results for lobby_id={lobby_id}, round {round_number}")
    return results


@router.post("/lobby/{lobby_id}/end", response_model=MessageResponse)
async def end_game(
    lobby_id: int,
    db: Session = Depends(get_session),
):
    """
    End the current game for a lobby (admin only).

    This endpoint:
    1. Calculates placements and points for all teams
    2. Saves round results to database
    3. Creates a new game for the next round
    4. Broadcasts ROUND_ENDED and NEW_ROUND_STARTED events
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

    from datetime import datetime, timezone
    import math

    # Separate completed and DNF teams
    completed_teams = [t for t in teams if t.completed_at]
    completed_teams.sort(key=lambda t: (t.completed_at, t.id))

    dnf_teams = [t for t in teams if not t.completed_at]

    # Calculate completion percentage for DNF teams (store in dict, not on model)
    team_completion_pcts = {}
    for team in dnf_teams:
        if not team.game_id:
            team_completion_pcts[team.id] = 0.0
            continue
        game = db.get(Game, team.game_id)
        if not game:
            team_completion_pcts[team.id] = 0.0
            continue
        puzzle_data = game.puzzle_data
        puzzle_length = len(puzzle_data.get("ladder", []))
        revealed = json.loads(team.revealed_steps) if team.revealed_steps else []
        team_completion_pcts[team.id] = len(revealed) / puzzle_length if puzzle_length > 0 else 0.0

    dnf_teams.sort(key=lambda t: team_completion_pcts.get(t.id, 0.0), reverse=True)

    # Determine round number
    from sqlmodel import func as sqlfunc

    last_round_number = (
        db.exec(select(sqlfunc.max(RoundResult.round_number)).where(RoundResult.lobby_id == lobby_id)).first() or 0
    )
    round_number = last_round_number + 1

    # Calculate points based on clarified rules
    total_teams = len(teams)

    # Determine base points for DNFs
    if not completed_teams:
        api_logger.info(f"No teams finished in round {round_number}, using total teams as DNF base")
        worst_finished_points = total_teams
    else:
        # Calculate worst finished points (for DNF cap)
        worst_finished_points = total_teams - len(completed_teams) + 1

    # Rank all teams (completed first, then DNF by completion %)
    all_teams_ranked = completed_teams + dnf_teams

    # Calculate placements handling ties
    placement_data = []
    previous_time = None
    previous_pct = None
    current_placement = 0
    is_completed_section = True

    for idx, team in enumerate(all_teams_ranked):
        is_completed = team in completed_teams

        # Switch from completed to DNF section
        if is_completed_section and not is_completed:
            is_completed_section = False
            previous_time = None
            previous_pct = None

        if is_completed:
            # Handle ties by completion time
            if previous_time is None or team.completed_at != previous_time:
                current_placement = idx + 1
                previous_time = team.completed_at
        else:
            # Handle ties by completion percentage
            team_pct = team_completion_pcts.get(team.id, 0.0)
            if previous_pct is None or abs(team_pct - previous_pct) > 0.001:
                current_placement = idx + 1
                previous_pct = team_pct

        placement_data.append({"team": team, "placement": current_placement, "completed": is_completed})

    # Calculate points for each team
    def calculate_points(placement: int, total_teams: int, completion_pct: float, completed: bool) -> int:
        if completed:
            # Reverse placement: 1st gets n points, 2nd gets n-1, etc.
            # But handle ties: if two teams tie for 1st, both get n points, 3rd gets n-2
            return total_teams - placement + 1

        # DNF teams: up to 75% of worst_finished_points, scaled by completion_pct
        base = worst_finished_points
        cap = base * 0.75
        return max(1, math.ceil(min(cap, base * completion_pct)))

    # Save round results
    results_summary = []
    for data in placement_data:
        team = data["team"]
        placement = data["placement"]
        is_completed = data["completed"]
        completion_pct = 1.0 if is_completed else team_completion_pcts.get(team.id, 0.0)

        points = calculate_points(placement, total_teams, completion_pct, is_completed)

        # Update team totals
        team.total_points += points
        team.rounds_played += 1
        if placement == 1:
            team.rounds_won += 1

        # Calculate time to complete
        time_to_complete = None
        if is_completed and team.game_id:
            game = db.get(Game, team.game_id)
            if game:
                time_to_complete = int((team.completed_at - game.started_at).total_seconds())

        # Create round result
        round_result = RoundResult(
            lobby_id=lobby_id,
            game_id=team.game_id or active_games[0].id,
            team_id=team.id,
            round_number=round_number,
            placement=placement,
            points_earned=points,
            completion_percentage=completion_pct,
            time_to_complete=time_to_complete,
            completed_at=team.completed_at,
        )
        db.add(round_result)

        results_summary.append(
            {
                "team_id": team.id,
                "team_name": team.name,
                "placement": placement,
                "points_earned": points,
            }
        )

    # Mark all games as completed
    for game in active_games:
        game.completed_at = datetime.now(timezone.utc)

    db.commit()

    # Create new placeholder games for next round and reattach teams
    placeholder_puzzle = {"meta": {"title": "Next round pending"}, "ladder": []}
    new_games: list[Game] = []

    for team in teams:
        placeholder_game = Game(
            lobby_id=lobby_id,
            difficulty=active_games[0].difficulty if active_games else "medium",
            puzzle_data=placeholder_puzzle,
            started_at=datetime.now(timezone.utc),
        )
        db.add(placeholder_game)
        db.flush()
        new_games.append(placeholder_game)

        team.completed_at = None
        team.revealed_steps = "[]"
        team.last_updated_at = None
        team.game_id = placeholder_game.id

    db.commit()

    # Broadcast round ended event
    from backend.websocket.events import NewRoundStartedEvent, RoundEndedEvent

    round_ended_event = RoundEndedEvent(lobby_id=lobby_id, round_number=round_number, results=results_summary)
    await lobby_websocket_manager.broadcast_to_lobby(lobby_id, round_ended_event)
    await lobby_websocket_manager.admin_web_socket_manager.broadcast_to_lobby(lobby_id, round_ended_event)

    # Broadcast new round started so clients refresh state/leaderboard
    if new_games:
        new_round_event = NewRoundStartedEvent(
            lobby_id=lobby_id,
            game_id=new_games[0].id,
            round_number=round_number + 1,
        )
        await lobby_websocket_manager.broadcast_to_lobby(lobby_id, new_round_event)
        await lobby_websocket_manager.admin_web_socket_manager.broadcast_to_lobby(lobby_id, new_round_event)

    api_logger.info(f"Successfully ended round {round_number} for lobby_id={lobby_id}")
    return MessageResponse(status=True, message=f"Round {round_number} ended for lobby {lobby.name}")
