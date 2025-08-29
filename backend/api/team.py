from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

router = APIRouter()


@router.post("/teams", response_model=TeamResponse)
async def create_team(team_data: TeamCreate, session: Session = Depends(get_session)):
    """Create a new team."""
    # Get current game
    current_game = session.exec(
        select(Game).where(Game.state != GameState.FINISHED)
    ).first()

    if not current_game:
        raise HTTPException(status_code=404, detail="No active game found")

    team = Team(
        name=team_data.name,
        game_id=current_game.id,
        current_word_index=len(
            game_manager.puzzle_loader.get_word_chain(current_game.puzzle_name)
        )
        // 2,  # Start in middle - teams can work forward or backward
    )
    session.add(team)
    session.commit()
    session.refresh(team)
    return team


@router.post("/teams/{team_id}/join")
async def join_team(
    team_id: int, join_request: JoinTeamRequest, session: Session = Depends(get_session)
):
    """Add a player to a team."""
    # Find player by session_id
    player = session.exec(
        select(Player).where(Player.session_id == join_request.player_session_id)
    ).first()

    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    # Check if team exists
    team = session.get(Team, team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    # Update player's team
    player.team_id = team_id
    session.add(player)
    session.commit()

    # Notify the player via WebSocket if they're connected
    from .websocket.managers import notify_player_team_assignment

    await notify_player_team_assignment(player.session_id, team_id, team.name)

    return {"message": f"Player {player.name} joined team {team.name}"}
