import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload

from backend.custom_logging import api_logger
from backend.database import Lobby, Player, get_session
from backend.dependencies import require_player_session
from backend.schemas import LobbyInfo, MessageResponse, PlayerCreate
from backend.websocket.events import DisconnectedLobbyEvent, JoinedLobbyEvent
from backend.websocket.managers import lobby_websocket_manager

router = APIRouter()


@router.post("/lobby/{lobby_code}", response_model=Player)
async def join_lobby(
    lobby_code: str,
    player_data: PlayerCreate,
    db: Session = Depends(get_session),
):
    lobby = db.exec(select(Lobby).where(Lobby.code == lobby_code)).first()
    if not lobby:
        api_logger.warning(f"Join failed: lobby not found for code={lobby_code}")
        raise HTTPException(status_code=404, detail="Lobby not found")

    session_id = str(uuid.uuid4())

    player = Player(
        **player_data.model_dump(), session_id=session_id, lobby_id=lobby.id
    )
    db.add(player)
    db.commit()
    db.refresh(player)
    api_logger.info(
        f"New player created session_id={player.session_id} lobby_id={lobby.id} name={player.name}"
    )

    try:
        await lobby_websocket_manager.broadcast_to_lobby(
            lobby.id,
            JoinedLobbyEvent(lobby_id=lobby.id, player_session_id=player.session_id),
        )
    except Exception as e:
        api_logger.exception(
            f"Failed to broadcast lobby join for session {player.session_id}: {e}"
        )

    return player


@router.get("/lobby/active", response_model=Player)
async def get_active_user(
    player: Player = Depends(require_player_session),
):
    api_logger.info(
        f"Player requesting active user info: session_id={player.session_id}"
    )

    api_logger.info(
        f"Returning active user session_id={player.session_id} lobby_id={player.lobby_id}"
    )
    return player


@router.get("/lobby", response_model=Lobby)
async def get_current_lobby(
    player: Player = Depends(require_player_session),
    db: Session = Depends(get_session),
):
    api_logger.info(f"Player requesting current lobby: session_id={player.session_id}")

    # Use the relationship to get the lobby
    db.refresh(player, ["lobby"])
    lobby = player.lobby
    if not lobby:
        api_logger.warning(
            f"Current lobby fetch failed: lobby not found for player session_id={player.session_id} lobby_id={player.lobby_id}"
        )
        raise HTTPException(status_code=404, detail="Lobby not found")

    api_logger.info(
        f"Returning current lobby id={lobby.id} for player session_id={player.session_id}"
    )
    return lobby


@router.delete("/lobby", response_model=MessageResponse)
async def leave_current_lobby(
    player: Player = Depends(require_player_session),
    db: Session = Depends(get_session),
):
    """Remove the authenticated player from their current lobby and notify others."""
    api_logger.info(f"Player leave request: session_id={player.session_id}")

    lobby_id = player.lobby_id
    try:
        db.delete(player)
        db.commit()
        api_logger.info(
            f"Player deleted session_id={player.session_id} lobby_id={lobby_id}"
        )
    except Exception as e:
        api_logger.exception(f"Failed to delete player {player.session_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to remove player")

    try:
        await lobby_websocket_manager.broadcast_to_lobby(
            lobby_id,
            DisconnectedLobbyEvent(
                lobby_id=lobby_id, player_session_id=player.session_id
            ),
        )
    except Exception as e:
        api_logger.exception(
            f"Failed to broadcast player left for session {player.session_id}: {e}"
        )

    return MessageResponse(status=True, message="Player left lobby successfully")


@router.get("/lobby/{lobby_id}", response_model=LobbyInfo)
async def get_lobby_info(
    lobby_id: int,
    player: Player = Depends(require_player_session),
    db: Session = Depends(get_session),
):
    api_logger.info(
        f"Player requesting lobby info: lobby_id={lobby_id}, session_id={player.session_id}"
    )
    # Use eager loading to get lobby with relationships
    lobby = db.exec(
        select(Lobby)
        .options(selectinload(Lobby.players), selectinload(Lobby.teams))
        .where(Lobby.id == lobby_id)
    ).first()
    if not lobby:
        api_logger.warning(f"Lobby not found lobby_id={lobby_id}")
        raise HTTPException(status_code=404, detail="Lobby not found")

    players = lobby.players
    teams = lobby.teams
    api_logger.info(f"Found {len(players)} players in lobby_id={lobby.id}")

    players_by_team = {}
    for p in players:
        if p.team_id is None:
            continue
        if p.team_id not in players_by_team:
            players_by_team[p.team_id] = []
        players_by_team[p.team_id].append(p)
    api_logger.info(
        f"Player returning lobby info for {lobby_id}: {len(teams)} teams, {len(players)} players"
    )

    return LobbyInfo(
        lobby=lobby, players=players, players_by_team=players_by_team, teams=teams
    )
