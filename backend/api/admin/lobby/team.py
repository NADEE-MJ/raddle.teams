import random

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import selectinload
from sqlmodel import Session, select

from backend.custom_logging import api_logger
from backend.database import Lobby, Player, Team, get_session
from backend.dependencies import check_admin_token
from backend.schemas import MessageResponse, TeamCreate
from backend.websocket.events import TeamAssignedEvent, TeamChangedEvent
from backend.websocket.managers import lobby_websocket_manager

router = APIRouter(dependencies=[Depends(check_admin_token)])


@router.put("/lobby/team/{team_id}/player/{player_id}", response_model=MessageResponse)
async def move_player_to_team(
    team_id: int,
    player_id: int,
    db: Session = Depends(get_session),
):
    api_logger.info(f"Admin requested player team move: player_id={player_id} team_id={team_id}")

    player = db.get(Player, player_id)
    if not player:
        api_logger.warning(f"Player move failed: player not found player_id={player_id}")
        raise HTTPException(status_code=404, detail="Player not found")

    if team_id == 0:
        team_id = None
    else:
        team = db.get(Team, team_id)
        if not team:
            raise HTTPException(status_code=404, detail="Team not found")
        if team.lobby_id != player.lobby_id:
            raise HTTPException(status_code=400, detail="Team is not in the same lobby as player")

    old_team_id = player.team_id or 0
    player.team_id = team_id
    db.add(player)
    db.commit()

    await lobby_websocket_manager.broadcast_to_lobby(
        lobby_id=player.lobby_id,
        event=TeamChangedEvent(
            lobby_id=player.lobby_id,
            player_session_id=player.session_id,
            old_team_id=old_team_id,
            new_team_id=team_id or 0,
        ),
    )

    api_logger.info(f"Successfully moved player_id={player_id} from team {old_team_id} to team {team_id}")
    return MessageResponse(status=True, message="Player moved successfully")


@router.post("/lobby/{lobby_id}/team", response_model=MessageResponse)
async def create_teams(
    lobby_id: int,
    team_data: TeamCreate,
    db: Session = Depends(get_session),
):
    api_logger.info(f"Admin requested team creation: lobby_id={lobby_id} num_teams={team_data.num_teams}")

    lobby = db.exec(
        select(Lobby).options(selectinload(Lobby.players), selectinload(Lobby.teams)).where(Lobby.id == lobby_id)
    ).first()
    if not lobby:
        api_logger.warning(f"Team creation failed: lobby not found lobby_id={lobby_id}")
        raise HTTPException(status_code=404, detail="Lobby not found")

    if lobby.teams:
        api_logger.warning(f"Team creation failed: teams already exist lobby_id={lobby_id}")
        raise HTTPException(status_code=400, detail="Teams already exist for this lobby")

    if team_data.num_teams < 2 or team_data.num_teams > 10:
        raise HTTPException(status_code=400, detail="Number of teams must be between 2 and 10")

    players = lobby.players
    if len(players) == 0:
        raise HTTPException(status_code=400, detail="Cannot create teams with no players")

    teams = []
    for i in range(team_data.num_teams):
        team = Team(name=f"Team {i + 1}", lobby_id=lobby_id)
        db.add(team)
        teams.append(team)

    db.commit()

    teams = db.exec(select(Team).where(Team.lobby_id == lobby_id)).all()

    random.shuffle(players)
    for i, player in enumerate(players):
        team_index = i % team_data.num_teams
        player.team_id = teams[team_index].id
        db.add(player)

    db.commit()

    await lobby_websocket_manager.broadcast_to_lobby(
        lobby_id=lobby_id,
        event=TeamAssignedEvent(lobby_id=lobby_id, player_session_id=player.session_id),
    )

    api_logger.info(
        f"Successfully created {team_data.num_teams} teams for lobby_id={lobby_id} with {len(players)} players"
    )
    return MessageResponse(status=True, message=f"Created {team_data.num_teams} teams with players randomly assigned")
