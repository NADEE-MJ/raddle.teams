from uuid import uuid4

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlmodel import Session, select

from backend.database import Lobby, get_session
from backend.dependencies import check_admin_token

router = APIRouter(dependencies=[Depends(check_admin_token)])


class LobbyCreate(BaseModel):
    name: str


@router.post("/lobby", response_model=Lobby)
async def create_lobby(
    lobby_data: LobbyCreate,
    db: Session = Depends(get_session),
):
    lobby = Lobby(**lobby_data.model_dump(), code=uuid4().hex[:6].upper())
    db.add(lobby)
    db.commit()
    db.refresh(lobby)
    return lobby


@router.get("/lobby", response_model=list[Lobby])
async def get_all_lobbies(db: Session = Depends(get_session)):
    return db.exec(select(Lobby)).all()
