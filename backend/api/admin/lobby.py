from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import selectinload
from sqlmodel import Session, select

from backend.custom_logging import api_logger
from backend.database import Lobby, get_session
from backend.dependencies import check_admin_token
from backend.schemas import LobbyInfo, MessageResponse

router = APIRouter(dependencies=[Depends(check_admin_token)])


class LobbyCreate(BaseModel):
    name: str


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
