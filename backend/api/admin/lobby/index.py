from uuid import uuid4
import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import selectinload
from sqlmodel import Session, select
from pydantic import BaseModel

from backend.custom_logging import api_logger
from backend.database import Lobby, Player, Team, Game, get_session
from backend.dependencies import check_admin_token
from backend.schemas import LobbyCreate, LobbyInfo, MessageResponse
from backend.websocket.managers import lobby_websocket_manager

router = APIRouter(dependencies=[Depends(check_admin_token)])


@router.post("/lobby", response_model=Lobby)
async def create_lobby(
    lobby_data: LobbyCreate,
    db: Session = Depends(get_session),
):
    api_logger.info(f"Admin requested lobby creation: name={lobby_data.name}")
    lobby = Lobby(**lobby_data.model_dump(), code=uuid4().hex[:6].upper())
    db.add(lobby)
    db.commit()
    db.refresh(lobby)
    api_logger.info(f"Created lobby id={lobby.id} code={lobby.code} name={lobby.name}")
    return lobby


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

    api_logger.info(f"Returning game state for lobby_id={lobby_id}: {len(team_progress_list)} teams")
    return GameStateResponse(is_game_active=True, teams=team_progress_list)
