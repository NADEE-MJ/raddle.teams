from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from backend.database import Lobby, Player, Team, get_session

router = APIRouter()


class LobbyCreate(BaseModel):
    name: str


@router.post("/lobby", response_model=Lobby)
async def create_lobby(lobby_data: LobbyCreate, db: Session = Depends(get_session)):
    lobby = Lobby(**lobby_data.model_dump())
    db.add(lobby)
    db.commit()
    db.refresh(lobby)
    return lobby


class PlayerCreate(BaseModel):
    name: str
    session_id: str


@router.post("/lobby/{lobby_id}/join", response_model=Player)
async def join_lobby(
    lobby_id: int, player_data: PlayerCreate, db: Session = Depends(get_session)
):
    lobby = db.get(Lobby, lobby_id)
    if not lobby:
        raise HTTPException(status_code=404, detail="Lobby not found")

    player = Player(**player_data.model_dump(), lobby_id=lobby.id)
    db.add(player)
    db.commit()
    db.refresh(player)

    # TODO maybe set the session in the cookies or leave it in local storage, not sure what to do here?
    return player


class PlayerRejoin(BaseModel):
    session_id: str


@router.post("/lobby/{lobby_id}/rejoin", response_model=list[Player])
async def rejoin_lobby(
    lobby_id: int, player_data: PlayerRejoin, db: Session = Depends(get_session)
):
    lobby = db.get(Lobby, lobby_id)
    if not lobby:
        raise HTTPException(status_code=404, detail="Lobby not found")

    statement = select(Player).where(
        Player.lobby_id == lobby.id, Player.session_id == player_data.session_id
    )
    results = db.exec(statement)
    players = results.all()

    if not players:
        raise HTTPException(status_code=404, detail="Player not found in this lobby")

    for player in players:
        player.connected = True
        db.add(player)

    db.commit()
    for player in players:
        db.refresh(player)

    return players


class LobbyInfo(BaseModel):
    lobby: Lobby
    players: list[Player]
    players_by_team: dict[str, list[Player]] | None
    teams: list[Team] | None


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
async def get_all_lobbies(db: Session = Depends(get_session)):
    return db.exec(select(Lobby)).all()
