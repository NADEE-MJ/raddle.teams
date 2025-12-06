import random

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import selectinload
from sqlmodel import Session, select

from backend.custom_logging import api_logger
from backend.database import Game, Lobby, Player, Team, get_session
from backend.dependencies import check_admin_token
from backend.schemas import MessageResponse, TeamCreate, TeamUpdate
from backend.utils.name_generator import generate_multiple_team_names
from backend.websocket.events import TeamAssignedEvent, TeamChangedEvent
from backend.websocket.managers import lobby_websocket_manager

router = APIRouter(dependencies=[Depends(check_admin_token)])

MAX_TEAMS_PER_LOBBY = 10


def generate_unique_team_name(existing_names: set[str]) -> str:
    """Generate a team name that is unlikely to collide with existing names."""
    # Try a few times to avoid duplicates
    for _ in range(5):
        candidate = generate_multiple_team_names(1)[0]
        if candidate not in existing_names:
            return candidate
    # Fall back to whatever is generated last
    return generate_multiple_team_names(1)[0]


@router.put("/lobby/team/{team_id}/name", response_model=MessageResponse)
async def update_team_name(
    team_id: int,
    team_update: TeamUpdate,
    db: Session = Depends(get_session),
):
    api_logger.info(f"Admin requested team name update: team_id={team_id} new_name={team_update.name}")

    team = db.get(Team, team_id)
    if not team:
        api_logger.warning(f"Team name update failed: team not found team_id={team_id}")
        raise HTTPException(status_code=404, detail="Team not found")

    old_name = team.name
    lobby_id = team.lobby_id
    team.name = team_update.name
    db.add(team)
    db.commit()

    # Broadcast team name change to all players in the lobby
    await lobby_websocket_manager.broadcast_to_lobby(
        lobby_id=lobby_id,
        event=TeamAssignedEvent(lobby_id=lobby_id, player_session_id=""),
    )

    api_logger.info(f"Successfully updated team_id={team_id} name from '{old_name}' to '{team_update.name}'")
    return MessageResponse(status=True, message=f"Team name updated to '{team_update.name}'")


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

    if team_id:
        lobby_websocket_manager.register_player_team(player.session_id, team_id)
    else:
        lobby_websocket_manager.unregister_player_team(player.session_id)

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

    if team_data.num_teams < 2 or team_data.num_teams > MAX_TEAMS_PER_LOBBY:
        raise HTTPException(status_code=400, detail=f"Number of teams must be between 2 and {MAX_TEAMS_PER_LOBBY}")

    players = lobby.players
    if len(players) == 0:
        raise HTTPException(status_code=400, detail="Cannot create teams with no players")

    # Generate funny names for teams
    team_names = generate_multiple_team_names(team_data.num_teams)

    teams = []
    for i in range(team_data.num_teams):
        team = Team(name=team_names[i], lobby_id=lobby_id)
        db.add(team)
        teams.append(team)

    db.commit()

    teams = db.exec(select(Team).where(Team.lobby_id == lobby_id)).all()

    # Convert to regular list before shuffling (SQLAlchemy collections can't be shuffled directly)
    players_list = list(players)
    random.shuffle(players_list)
    for i, player in enumerate(players_list):
        team_index = i % team_data.num_teams
        player.team_id = teams[team_index].id
        db.add(player)

    db.commit()

    # Ensure websocket manager knows each player's team for targeted broadcasts
    for player in players_list:
        if player.team_id:
            lobby_websocket_manager.register_player_team(player.session_id, player.team_id)

    await lobby_websocket_manager.broadcast_to_lobby(
        lobby_id=lobby_id,
        event=TeamAssignedEvent(lobby_id=lobby_id, player_session_id=player.session_id),
    )

    api_logger.info(
        f"Successfully created {team_data.num_teams} teams for lobby_id={lobby_id} with {len(players_list)} players"
    )
    return MessageResponse(status=True, message=f"Created {team_data.num_teams} teams with players randomly assigned")


def lobby_has_active_game(db: Session, lobby_id: int) -> bool:
    return db.exec(select(Game).where(Game.lobby_id == lobby_id).where(Game.completed_at.is_(None))).first() is not None


@router.post("/lobby/{lobby_id}/team/add-one", response_model=MessageResponse)
async def add_single_team(
    lobby_id: int,
    db: Session = Depends(get_session),
):
    api_logger.info(f"Admin requested to add a single team: lobby_id={lobby_id}")

    lobby = db.exec(
        select(Lobby).options(selectinload(Lobby.players), selectinload(Lobby.teams)).where(Lobby.id == lobby_id)
    ).first()
    if not lobby:
        api_logger.warning(f"Add team failed: lobby not found lobby_id={lobby_id}")
        raise HTTPException(status_code=404, detail="Lobby not found")

    if lobby_has_active_game(db, lobby_id):
        raise HTTPException(status_code=400, detail="Cannot modify teams while a game is active")

    if len(lobby.teams) >= MAX_TEAMS_PER_LOBBY:
        raise HTTPException(status_code=400, detail=f"Maximum of {MAX_TEAMS_PER_LOBBY} teams reached")

    existing_names = {team.name for team in lobby.teams}
    new_team_name = generate_unique_team_name(existing_names)
    new_team = Team(name=new_team_name, lobby_id=lobby_id)
    db.add(new_team)
    db.commit()
    db.refresh(new_team)

    await lobby_websocket_manager.broadcast_to_lobby(
        lobby_id=lobby_id,
        event=TeamAssignedEvent(lobby_id=lobby_id, player_session_id=""),
    )

    api_logger.info(f"Successfully added team_id={new_team.id} name='{new_team.name}' to lobby_id={lobby_id}")
    return MessageResponse(status=True, message=f"Added new team '{new_team.name}'")


@router.delete("/lobby/team/{team_id}", response_model=MessageResponse)
async def remove_team(
    team_id: int,
    db: Session = Depends(get_session),
):
    api_logger.info(f"Admin requested to remove team: team_id={team_id}")

    team = db.get(Team, team_id)
    if not team:
        api_logger.warning(f"Remove team failed: team not found team_id={team_id}")
        raise HTTPException(status_code=404, detail="Team not found")

    lobby = db.exec(
        select(Lobby).options(selectinload(Lobby.players), selectinload(Lobby.teams)).where(Lobby.id == team.lobby_id)
    ).first()
    if not lobby:
        api_logger.warning(f"Remove team failed: lobby not found for team_id={team_id}")
        raise HTTPException(status_code=404, detail="Lobby not found")

    if lobby_has_active_game(db, lobby.id):
        raise HTTPException(status_code=400, detail="Cannot modify teams while a game is active")

    if len(lobby.teams) <= 2:
        raise HTTPException(status_code=400, detail="At least two teams are required")

    players_on_team = db.exec(select(Player).where(Player.team_id == team_id)).all()
    for player in players_on_team:
        player.team_id = None
        db.add(player)
    db.delete(team)
    db.commit()

    for player in players_on_team:
        lobby_websocket_manager.unregister_player_team(player.session_id)
        await lobby_websocket_manager.broadcast_to_lobby(
            lobby_id=team.lobby_id,
            event=TeamChangedEvent(
                lobby_id=team.lobby_id,
                player_session_id=player.session_id,
                old_team_id=team_id,
                new_team_id=0,
            ),
        )

    await lobby_websocket_manager.broadcast_to_lobby(
        lobby_id=team.lobby_id,
        event=TeamAssignedEvent(lobby_id=team.lobby_id, player_session_id=""),
    )

    api_logger.info(
        f"Successfully removed team_id={team_id} from lobby_id={team.lobby_id}; unassigned {len(players_on_team)} players"
    )
    return MessageResponse(
        status=True, message=f"Removed team and unassigned {len(players_on_team)} player(s) back to the lobby"
    )
