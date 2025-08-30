from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from backend.database import Lobby, Player, Team, get_session
from backend.websocket.events import DisconnectedLobbyEvent, JoinedLobbyEvent
from backend.websocket.managers import lobby_websocket_manager
from custom_logging import file_logger

router = APIRouter()


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

    # check if that session_id already exists and if so, move this player to this lobby
    existing_player = db.exec(
        select(Player).where(Player.session_id == player_data.session_id)
    ).first()
    if existing_player:
        existing_player.name = player_data.name  # Update the player's name
        existing_player.lobby_id = lobby.id
        db.add(existing_player)
        db.commit()
        db.refresh(existing_player)
        # notify connected websockets that a player joined/changed
        try:
            await lobby_websocket_manager.broadcast_to_lobby(
                lobby.id,
                JoinedLobbyEvent(
                    lobby_id=lobby.id, player_session_id=existing_player.session_id
                ),
            )
        except Exception as e:
            file_logger.exception(
                f"Failed to broadcast lobby join for session {existing_player.session_id}: {e}"
            )

        return existing_player

    player = Player(**player_data.model_dump(), lobby_id=lobby.id)
    db.add(player)
    db.commit()
    db.refresh(player)

    # TODO maybe set the session in the cookies or leave it in local storage, not sure what to do here?
    # notify connected websockets that a new player joined
    try:
        await lobby_websocket_manager.broadcast_to_lobby(
            lobby.id,
            JoinedLobbyEvent(lobby_id=lobby.id, player_session_id=player.session_id),
        )
    except Exception as e:
        file_logger.exception(
            f"Failed to broadcast lobby join for session {player.session_id}: {e}"
        )

    return player


@router.delete("/player/{session_id}/leave")
async def leave_lobby(session_id: str, db: Session = Depends(get_session)):
    """Remove the player identified by session_id from their lobby and notify others."""
    player = db.exec(select(Player).where(Player.session_id == session_id)).first()
    if not player:
        # Nothing to do
        return {"status": "ok", "message": "player not found"}

    lobby_id = player.lobby_id
    try:
        db.delete(player)
        db.commit()
    except Exception as e:
        file_logger.exception(f"Failed to delete player {session_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to remove player")

    # Broadcast disconnect event
    try:
        await lobby_websocket_manager.broadcast_to_lobby(
            lobby_id,
            DisconnectedLobbyEvent(lobby_id=lobby_id, player_session_id=session_id),
        )
    except Exception as e:
        file_logger.exception(
            f"Failed to broadcast player left for session {session_id}: {e}"
        )

    return {"status": "ok", "message": "left"}


@router.get("/player/{session_id}/lobby", response_model=Lobby)
async def get_lobby_for_player_by_session(
    session_id: str, db: Session = Depends(get_session)
):
    player = db.exec(select(Player).where(Player.session_id == session_id)).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    lobby = db.get(Lobby, player.lobby_id)
    if not lobby:
        raise HTTPException(status_code=404, detail="Lobby not found")

    return lobby


class LobbyInfo(BaseModel):
    lobby: Lobby
    players: list[Player]
    players_by_team: dict[int, list[Player]] | None
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
        if player.team_id is None:
            continue
        if player.team_id not in players_by_team:
            players_by_team[player.team_id] = []
        players_by_team[player.team_id].append(player)

    teams = db.exec(select(Team).where(Team.lobby_id == lobby.id)).all()

    return LobbyInfo(
        lobby=lobby, players=players, players_by_team=players_by_team, teams=teams
    )
