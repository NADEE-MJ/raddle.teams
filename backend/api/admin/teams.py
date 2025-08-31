import random
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from backend.database import get_session
from backend.database.models import Game, Lobby, Player, Team
from backend.dependencies import get_admin_user
from backend.schemas import MessageResponse

router = APIRouter(tags=["Admin Team Management"])


class CreateTeamRequest(BaseModel):
    name: str
    game_id: int


class AssignPlayerToTeamRequest(BaseModel):
    player_id: int
    team_id: int


class AutoAssignTeamsRequest(BaseModel):
    game_id: int
    team_count: int
    team_names: List[str]


@router.post("/team", response_model=dict)
async def create_team(
    request: CreateTeamRequest,
    admin_user: str = Depends(get_admin_user),
    session: Session = Depends(get_session),
):
    """Create a new team for a game."""
    # Verify game exists
    game = session.get(Game, request.game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    # Create team
    team = Team(
        name=request.name,
        lobby_id=game.lobby_id,
        game_id=request.game_id,
        current_word_index=0
    )
    session.add(team)
    session.commit()
    session.refresh(team)
    
    return {
        "id": team.id,
        "name": team.name,
        "lobby_id": team.lobby_id,
        "game_id": team.game_id,
        "current_word_index": team.current_word_index,
        "completed_at": team.completed_at,
        "created_at": team.created_at,
    }


@router.post("/team/assign-player", response_model=MessageResponse)
async def assign_player_to_team(
    request: AssignPlayerToTeamRequest,
    admin_user: str = Depends(get_admin_user),
    session: Session = Depends(get_session),
):
    """Assign a player to a team."""
    # Verify player exists
    player = session.get(Player, request.player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    # Verify team exists
    team = session.get(Team, request.team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Verify player belongs to the same lobby as the team
    if player.lobby_id != team.lobby_id:
        raise HTTPException(status_code=400, detail="Player and team must be in the same lobby")
    
    # Assign player to team
    player.team_id = request.team_id
    session.add(player)
    session.commit()
    
    return MessageResponse(status=True, message="Player assigned to team successfully")


@router.post("/team/auto-assign", response_model=MessageResponse)
async def auto_assign_teams(
    request: AutoAssignTeamsRequest,
    admin_user: str = Depends(get_admin_user),
    session: Session = Depends(get_session),
):
    """Automatically create teams and assign players randomly."""
    # Verify game exists
    game = session.get(Game, request.game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    # Get all players in the lobby
    players = session.exec(
        select(Player).where(Player.lobby_id == game.lobby_id)
    ).all()
    
    if len(players) < request.team_count:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot create {request.team_count} teams with only {len(players)} players"
        )
    
    if len(request.team_names) != request.team_count:
        raise HTTPException(
            status_code=400,
            detail=f"Must provide exactly {request.team_count} team names"
        )
    
    # Delete existing teams for this game
    existing_teams = session.exec(select(Team).where(Team.game_id == request.game_id)).all()
    for team in existing_teams:
        session.delete(team)
    
    # Clear team assignments for players in this lobby
    for player in players:
        player.team_id = None
        session.add(player)
    
    # Create new teams
    teams = []
    for team_name in request.team_names:
        team = Team(
            name=team_name,
            lobby_id=game.lobby_id,
            game_id=request.game_id,
            current_word_index=0
        )
        session.add(team)
        teams.append(team)
    
    session.commit()
    
    # Refresh teams to get IDs
    for team in teams:
        session.refresh(team)
    
    # Randomly assign players to teams
    players_list = list(players)
    random.shuffle(players_list)
    
    for i, player in enumerate(players_list):
        team_index = i % len(teams)
        player.team_id = teams[team_index].id
        session.add(player)
    
    session.commit()
    
    return MessageResponse(status=True, message=f"Successfully created {len(teams)} teams and assigned {len(players)} players")


@router.delete("/team/{team_id}", response_model=MessageResponse)
async def delete_team(
    team_id: int,
    admin_user: str = Depends(get_admin_user),
    session: Session = Depends(get_session),
):
    """Delete a team and unassign all its players."""
    team = session.get(Team, team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Unassign all players from this team
    players = session.exec(select(Player).where(Player.team_id == team_id)).all()
    for player in players:
        player.team_id = None
        session.add(player)
    
    # Delete the team
    session.delete(team)
    session.commit()
    
    return MessageResponse(status=True, message="Team deleted successfully")


@router.get("/team/{team_id}/players", response_model=List[dict])
async def get_team_players(
    team_id: int,
    admin_user: str = Depends(get_admin_user),
    session: Session = Depends(get_session),
):
    """Get all players in a team."""
    team = session.get(Team, team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    players = session.exec(select(Player).where(Player.team_id == team_id)).all()
    
    result = []
    for player in players:
        result.append({
            "id": player.id,
            "name": player.name,
            "session_id": player.session_id,
            "lobby_id": player.lobby_id,
            "team_id": player.team_id,
            "created_at": player.created_at,
        })
    
    return result