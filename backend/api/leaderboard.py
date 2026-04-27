from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlmodel import Session, func, select

from backend.database import get_session
from backend.database.models import RoundResult, Team

router = APIRouter()


class PlacementBreakdown(BaseModel):
    first: int
    second: int
    third: int
    dnf: int


class TeamLeaderboardEntry(BaseModel):
    team_id: int
    team_name: str
    total_points: int
    rounds_won: int
    rounds_played: int
    placement_breakdown: PlacementBreakdown
    last_round_winner: bool  # for crown marker in lobby recap


class LeaderboardResponse(BaseModel):
    teams: list[TeamLeaderboardEntry]
    current_round: int
    total_rounds: int
    last_round_game_id: Optional[int]  # to link to last results modal in lobby


@router.get("/lobby/{lobby_id}/leaderboard", response_model=LeaderboardResponse)
async def get_leaderboard(lobby_id: int, session: Session = Depends(get_session)):
    """Get tournament leaderboard for a lobby."""
    # Get all teams sorted by total points
    teams = session.exec(select(Team).where(Team.lobby_id == lobby_id).order_by(Team.total_points.desc())).all()

    # Get last round number
    last_round_number = session.exec(
        select(func.max(RoundResult.round_number)).where(RoundResult.lobby_id == lobby_id)
    ).first()

    # Get last round winner and game_id
    last_round_winner_id = None
    last_round_game_id = None
    if last_round_number:
        last_round_winner = session.exec(
            select(RoundResult)
            .where(RoundResult.lobby_id == lobby_id)
            .where(RoundResult.round_number == last_round_number)
            .order_by(RoundResult.placement)
            .limit(1)
        ).first()
        if last_round_winner:
            last_round_winner_id = last_round_winner.team_id
            last_round_game_id = last_round_winner.game_id

    entries = []
    for team in teams:
        # Get placement breakdown for this team
        results = session.exec(select(RoundResult).where(RoundResult.team_id == team.id)).all()

        first_count = sum(1 for r in results if r.placement == 1)
        second_count = sum(1 for r in results if r.placement == 2)
        third_count = sum(1 for r in results if r.placement == 3)
        dnf_count = sum(1 for r in results if r.completed_at is None)

        entries.append(
            TeamLeaderboardEntry(
                team_id=team.id,
                team_name=team.name,
                total_points=team.total_points,
                rounds_won=team.rounds_won,
                rounds_played=team.rounds_played,
                placement_breakdown=PlacementBreakdown(
                    first=first_count,
                    second=second_count,
                    third=third_count,
                    dnf=dnf_count,
                ),
                last_round_winner=team.id == last_round_winner_id,
            )
        )

    current_round = last_round_number or 0

    return LeaderboardResponse(
        teams=entries,
        current_round=current_round,
        total_rounds=current_round,
        last_round_game_id=last_round_game_id,
    )
