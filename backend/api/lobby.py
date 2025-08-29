from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from backend.database import Lobby, Player, Team, get_session
from backend.dependencies import check_admin_token

router = APIRouter()


class LobbyCreate(BaseModel):
    name: str


@router.post("/lobby", response_model=Lobby)
async def create_lobby(
    lobby_data: LobbyCreate,
    db: Session = Depends(get_session),
    authenticated: bool = Depends(check_admin_token),
):
    lobby = Lobby(**lobby_data.model_dump(), code=uuid4().hex[:6])
    db.add(lobby)
    db.commit()
    db.refresh(lobby)
    return lobby


class PlayerCreate(BaseModel):
    name: str
    session_id: str


@router.post("/lobby/{lobby_code}/join", response_model=Player)
async def join_lobby(
    lobby_code: str, player_data: PlayerCreate, db: Session = Depends(get_session)
):
    lobby = db.exec(select(Lobby).where(Lobby.code == lobby_code)).first()
    if not lobby:
        raise HTTPException(status_code=404, detail="Lobby not found")

    player = Player(**player_data.model_dump(), lobby_id=lobby.id)
    db.add(player)
    db.commit()
    db.refresh(player)

    # TODO maybe set the session in the cookies or leave it in local storage, not sure what to do here?
    return player


class LobbyInfo(BaseModel):
    lobby: Lobby
    players: list[Player]
    players_by_team: dict[str, list[Player]] | None
    teams: list[Team] | None
    game: None = None


@router.get("/lobby/{lobby_id}", response_model=LobbyInfo)
async def get_lobby(lobby_id: int, db: Session = Depends(get_session)):
    lobby = db.get(Lobby, lobby_id)
    if not lobby:
        raise HTTPException(status_code=404, detail="Lobby not found")

    players = db.exec(select(Player).where(Player.lobby_id == lobby.id)).all()

    players_by_team = {}
    for player in players:
        if player.team_id not in players_by_team:
            players_by_team[player.team_id] = []
        players_by_team[player.team_id].append(player)

    teams = db.exec(select(Team).where(Team.lobby_id == lobby.id)).all()

    return LobbyInfo(
        lobby=lobby, players=players, players_by_team=players_by_team, teams=teams
    )


@router.get("/lobby", response_model=list[Lobby])
async def get_all_lobbies(
    db: Session = Depends(get_session), authenticated: bool = Depends(check_admin_token)
):
    return db.exec(select(Lobby)).all()
