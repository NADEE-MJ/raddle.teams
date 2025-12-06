"""Player and team statistics API."""

import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, func, select

from backend.database import get_session
from backend.database.models import Game, Guess, Player, RoundResult, Team
from backend.game.puzzles import Puzzle as PuzzlePydantic
from backend.utils.awards import PlayerAward, assign_awards

router = APIRouter()


class PlayerGameStats(BaseModel):
    player_id: int
    player_name: str
    correct_guesses: int
    total_guesses: int
    accuracy_rate: float  # 0.0 to 1.0
    words_solved: list[int]  # word indices they got right first
    wrong_guesses: list[str]  # all their incorrect guesses
    awards: list[PlayerAward]  # fun titles


class TeamGameStats(BaseModel):
    team_id: int
    team_name: str
    placement: int
    points_earned: int
    wrong_guesses: int
    wrong_guess_rate: float
    wrong_guess_label: str  # playful tag
    completed_at: Optional[str]
    completion_percentage: float
    time_to_complete: Optional[int]  # seconds
    player_stats: list[PlayerGameStats]


class GameStatsResponse(BaseModel):
    game_id: int
    round_number: int
    started_at: str
    teams: list[TeamGameStats]
    last_round_winner_id: Optional[int]


def get_wrong_guess_label(wrong_guess_count: int) -> str:
    """Get playful label based on wrong guess count."""
    if wrong_guess_count <= 1:
        return "Laser Focus"
    elif wrong_guess_count <= 4:
        return "Precision Mode"
    elif wrong_guess_count <= 7:
        return "Oops-o-meter"
    elif wrong_guess_count <= 12:
        return "Spice Rack"
    elif wrong_guess_count <= 20:
        return "Chaos Engine"
    else:
        return "Plot Twist Factory"


@router.get("/stats/game/{game_id}", response_model=GameStatsResponse)
async def get_game_stats(game_id: int, session: Session = Depends(get_session)):
    """Get detailed statistics for a completed game."""

    # Get the game
    game = session.get(Game, game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    # Parse puzzle to get length
    puzzle = PuzzlePydantic(**game.puzzle_data)
    puzzle_length = len(puzzle.ladder)

    # Get round number if this game has round results
    round_result = session.exec(select(RoundResult).where(RoundResult.game_id == game_id).limit(1)).first()
    round_number = round_result.round_number if round_result else 0

    # Get last round winner for this lobby
    last_round_number = session.exec(
        select(func.max(RoundResult.round_number)).where(RoundResult.lobby_id == game.lobby_id)
    ).first()
    last_round_winner_id = None
    if last_round_number:
        last_winner = session.exec(
            select(RoundResult)
            .where(RoundResult.lobby_id == game.lobby_id)
            .where(RoundResult.round_number == last_round_number)
            .where(RoundResult.placement == 1)
        ).first()
        if last_winner:
            last_round_winner_id = last_winner.team_id

    # Get all teams that played this game
    teams = session.exec(select(Team).where(Team.lobby_id == game.lobby_id)).all()

    team_stats_list = []

    for team in teams:
        # Get round result for this team (if exists)
        team_round_result = session.exec(
            select(RoundResult).where(RoundResult.team_id == team.id).where(RoundResult.game_id == game_id)
        ).first()

        # Calculate placement and points
        if team_round_result:
            placement = team_round_result.placement
            points_earned = team_round_result.points_earned
            completion_percentage = team_round_result.completion_percentage
            time_to_complete = team_round_result.time_to_complete
            completed_at = team_round_result.completed_at.isoformat() if team_round_result.completed_at else None
        else:
            # Game hasn't ended yet, use temporary values
            placement = 0
            points_earned = 0
            revealed_steps = json.loads(team.revealed_steps) if team.revealed_steps else []
            completion_percentage = len(revealed_steps) / puzzle_length if puzzle_length > 0 else 0.0
            time_to_complete = None
            if team.completed_at and game.started_at:
                time_to_complete = int((team.completed_at - game.started_at).total_seconds())
            completed_at = team.completed_at.isoformat() if team.completed_at else None

        # Get all players in this team
        players = session.exec(select(Player).where(Player.team_id == team.id)).all()

        player_stats_list = []
        team_wrong_guesses = 0
        team_total_guesses = 0

        for player in players:
            # Get all guesses for this player in this game
            guesses = session.exec(
                select(Guess).where(Guess.player_id == player.id).where(Guess.game_id == game_id)
            ).all()

            correct_guesses = [g for g in guesses if g.is_correct]
            wrong_guesses = [g.guess for g in guesses if not g.is_correct]
            total_guesses = len(guesses)

            team_wrong_guesses += len(wrong_guesses)
            team_total_guesses += total_guesses

            accuracy_rate = len(correct_guesses) / total_guesses if total_guesses > 0 else 0.0

            # Find words this player solved first
            words_solved = []
            revealed_steps = json.loads(team.revealed_steps) if team.revealed_steps else []
            for word_idx in revealed_steps:
                first_correct = session.exec(
                    select(Guess)
                    .where(Guess.team_id == team.id)
                    .where(Guess.word_index == word_idx)
                    .where(Guess.is_correct.is_(True))
                    .order_by(Guess.created_at)
                    .limit(1)
                ).first()
                if first_correct and first_correct.player_id == player.id:
                    words_solved.append(word_idx)

            player_stats_list.append(
                {
                    "player_id": player.id,
                    "player_name": player.name,
                    "correct_guesses": len(correct_guesses),
                    "total_guesses": total_guesses,
                    "accuracy_rate": accuracy_rate,
                    "words_solved": words_solved,
                    "wrong_guesses": wrong_guesses,
                }
            )

        # Assign awards
        awards_by_player = assign_awards(player_stats_list, puzzle_length)

        # Add awards to player stats
        for player_stat in player_stats_list:
            player_stat["awards"] = awards_by_player.get(player_stat["player_id"], [])

        # Convert to Pydantic models
        player_stats_models = [PlayerGameStats(**ps) for ps in player_stats_list]

        # Calculate team wrong guess rate
        wrong_guess_rate = team_wrong_guesses / team_total_guesses if team_total_guesses > 0 else 0.0
        wrong_guess_label = get_wrong_guess_label(team_wrong_guesses)

        team_stats = TeamGameStats(
            team_id=team.id,
            team_name=team.name,
            placement=placement,
            points_earned=points_earned,
            wrong_guesses=team_wrong_guesses,
            wrong_guess_rate=wrong_guess_rate,
            wrong_guess_label=wrong_guess_label,
            completed_at=completed_at,
            completion_percentage=completion_percentage,
            time_to_complete=time_to_complete,
            player_stats=player_stats_models,
        )
        team_stats_list.append(team_stats)

    # Sort by placement (0 means not yet placed, put at end)
    team_stats_list.sort(key=lambda t: (t.placement == 0, t.placement))

    return GameStatsResponse(
        game_id=game_id,
        round_number=round_number,
        started_at=game.started_at.isoformat(),
        teams=team_stats_list,
        last_round_winner_id=last_round_winner_id,
    )
