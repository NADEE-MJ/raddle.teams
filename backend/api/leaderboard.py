"""
Tournament leaderboard API endpoints.
"""

from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlmodel import Session, case, func, select

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
    # Get all teams in this lobby, ordered by points
    teams = session.exec(
        select(Team).where(Team.lobby_id == lobby_id).order_by(Team.total_points.desc(), Team.id)
    ).all()

    if not teams:
        # No teams yet, return empty leaderboard
        return LeaderboardResponse(teams=[], current_round=0, total_rounds=0, last_round_game_id=None)

    # Get last round number and winner
    last_round_number = session.exec(
        select(func.max(RoundResult.round_number)).where(RoundResult.lobby_id == lobby_id)
    ).first()

    last_round_winner_id = None
    last_round_game_id = None

    if last_round_number:
        last_round_winner = session.exec(
            select(RoundResult)
            .where(RoundResult.lobby_id == lobby_id)
            .where(RoundResult.round_number == last_round_number)
            .where(RoundResult.placement == 1)
            .limit(1)
        ).first()

        if last_round_winner:
            last_round_winner_id = last_round_winner.team_id
            last_round_game_id = last_round_winner.game_id

    # Build leaderboard entries
    entries = []

    for team in teams:
        # Get placement breakdown for this team
        # Count placements: 1st, 2nd, 3rd, DNF (where completed_at is null)
        placements = session.exec(
            select(
                func.count(case((RoundResult.placement == 1, 1))).label("first"),
                func.count(case((RoundResult.placement == 2, 1))).label("second"),
                func.count(case((RoundResult.placement == 3, 1))).label("third"),
                func.count(case((RoundResult.completed_at.is_(None), 1))).label("dnf"),
            ).where(RoundResult.team_id == team.id)
        ).first()

        # Handle case where team has no round results yet
        if placements:
            first, second, third, dnf = placements
        else:
            first, second, third, dnf = 0, 0, 0, 0

        entries.append(
            TeamLeaderboardEntry(
                team_id=team.id,
                team_name=team.name,
                total_points=team.total_points,
                rounds_won=team.rounds_won,
                rounds_played=team.rounds_played,
                placement_breakdown=PlacementBreakdown(
                    first=first or 0, second=second or 0, third=third or 0, dnf=dnf or 0
                ),
                last_round_winner=(team.id == last_round_winner_id) if last_round_winner_id else False,
            )
        )

    current_round = last_round_number or 0

    return LeaderboardResponse(
        teams=entries,
        current_round=current_round,
        total_rounds=current_round,
        last_round_game_id=last_round_game_id,
    )
