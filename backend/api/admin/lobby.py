from uuid import uuid4

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlmodel import Session, select

from backend.custom_logging import api_logger
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


@router.get("/check", response_model=dict)
async def check_admin_credentials():
    api_logger.info("Admin credentials check endpoint called")
    return {"status": "authenticated", "message": "Admin credentials are valid"}
