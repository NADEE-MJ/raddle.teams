"""
Player and team statistics API endpoints.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from backend.database import get_session
from backend.database.models import Game, Guess, Player, RoundResult, Team

router = APIRouter()


class PlayerAward(BaseModel):
    key: str
    title: str
    emoji: str
    description: str


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
    last_round_winner_id: Optional[int]  # for lobby crown display


def get_wrong_guess_label(wrong_count: int) -> str:
    """Generate playful label based on wrong guess count."""
    if wrong_count <= 1:
        return "Laser Focus"
    elif wrong_count <= 4:
        return "Precision Mode"
    elif wrong_count <= 7:
        return "Oops-o-meter"
    elif wrong_count <= 12:
        return "Spice Rack"
    elif wrong_count <= 20:
        return "Chaos Engine"
    else:
        return "Plot Twist Factory"


@router.get("/stats/game/{game_id}", response_model=GameStatsResponse)
async def get_game_stats(game_id: int, session: Session = Depends(get_session)):
    """Get detailed statistics for a specific game/round."""
    # Get game
    game = session.get(Game, game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    # Get all teams in this lobby
    teams = session.exec(select(Team).where(Team.lobby_id == game.lobby_id)).all()

    # Parse puzzle to get ladder length
    puzzle_data = game.puzzle_data
    puzzle_length = len(puzzle_data.get("ladder", []))

    # Get round results if they exist
    round_results = session.exec(
        select(RoundResult).where(RoundResult.game_id == game_id).order_by(RoundResult.placement)
    ).all()

    # Create a mapping of team_id to round result
    round_results_map = {rr.team_id: rr for rr in round_results}

    # Determine round number
    round_number = round_results[0].round_number if round_results else 1

    # Find last round winner
    last_round_winner_id = None
    if round_results:
        first_place = next((rr for rr in round_results if rr.placement == 1), None)
        if first_place:
            last_round_winner_id = first_place.team_id

    team_stats_list = []

    for team in teams:
        # Get team's round result if exists
        round_result = round_results_map.get(team.id)

        # Get all players in this team
        team_players = session.exec(select(Player).where(Player.team_id == team.id)).all()

        # Get all guesses for this team in this game
        team_guesses = session.exec(select(Guess).where(Guess.team_id == team.id).where(Guess.game_id == game_id)).all()
        solved_word_indices = {g.word_index for g in team_guesses if g.is_correct}

        # Calculate player stats
        player_stats_list = []
        player_stats_dicts = []  # for awards calculation

        for player in team_players:
            player_guesses = [g for g in team_guesses if g.player_id == player.id]
            correct = [g for g in player_guesses if g.is_correct]
            wrong = [g.guess for g in player_guesses if not g.is_correct]

            # Find words this player solved first for their team
            words_solved = []
            for word_idx in solved_word_indices:
                first_correct = session.exec(
                    select(Guess)
                    .where(Guess.team_id == team.id)
                    .where(Guess.word_index == word_idx)
                    .where(Guess.is_correct)
                    .where(Guess.game_id == game_id)
                    .order_by(Guess.created_at)
                    .limit(1)
                ).first()
                if first_correct and first_correct.player_id == player.id:
                    words_solved.append(word_idx)

            total_guesses = len(player_guesses)
            accuracy_rate = len(correct) / total_guesses if total_guesses > 0 else 0.0

            player_stat_dict = {
                "player_id": player.id,
                "player_name": player.name,
                "correct_guesses": len(correct),
                "total_guesses": total_guesses,
                "accuracy_rate": accuracy_rate,
                "words_solved": words_solved,
                "wrong_guesses": wrong,
            }
            player_stats_dicts.append(player_stat_dict)

        # Assign awards (will be implemented in Phase 8)
        # For now, use empty awards list
        from backend.utils.awards import assign_awards

        awards_by_player = assign_awards(player_stats_dicts, puzzle_length)

        # Convert dicts to Pydantic models with awards
        for pdict in player_stats_dicts:
            player_stats_list.append(
                PlayerGameStats(
                    **pdict,
                    awards=awards_by_player.get(pdict["player_id"], []),
                )
            )

        # Calculate team metrics
        total_wrong_guesses = sum(len(p.wrong_guesses) for p in player_stats_list)
        total_guesses_team = sum(p.total_guesses for p in player_stats_list)
        wrong_guess_rate = total_wrong_guesses / total_guesses_team if total_guesses_team > 0 else 0.0
        wrong_guess_label = get_wrong_guess_label(total_wrong_guesses)

        # Get completion data from round result or calculate it
        if round_result:
            placement = round_result.placement
            points_earned = round_result.points_earned
            completion_percentage = round_result.completion_percentage
            time_to_complete = round_result.time_to_complete
            completed_at = round_result.completed_at.isoformat() if round_result.completed_at else None
        else:
            # Game not ended yet, calculate current state
            completion_percentage = len(solved_word_indices) / puzzle_length if puzzle_length > 0 else 0.0

            # Determine placement from DB
            completed_teams = session.exec(
                select(Team)
                .where(Team.lobby_id == game.lobby_id)
                .where(Team.completed_at.isnot(None))
                .order_by(Team.completed_at, Team.id)
            ).all()

            placement = 0
            points_earned = 0
            time_to_complete = None
            completed_at = None

            if team.completed_at:
                # Find placement
                previous_time = None
                current_placement = 0
                for idx, t in enumerate(completed_teams, 1):
                    if previous_time is None or t.completed_at != previous_time:
                        current_placement = idx
                        previous_time = t.completed_at
                    if t.id == team.id:
                        placement = current_placement
                        break

                completed_at = team.completed_at.isoformat()
                time_to_complete = int((team.completed_at - game.started_at).total_seconds())

        team_stats_list.append(
            TeamGameStats(
                team_id=team.id,
                team_name=team.name,
                placement=placement,
                points_earned=points_earned,
                wrong_guesses=total_wrong_guesses,
                wrong_guess_rate=wrong_guess_rate,
                wrong_guess_label=wrong_guess_label,
                completed_at=completed_at,
                completion_percentage=completion_percentage,
                time_to_complete=time_to_complete,
                player_stats=player_stats_list,
            )
        )

    # Sort teams by placement
    team_stats_list.sort(key=lambda t: (t.placement if t.placement > 0 else 999, t.team_id))

    return GameStatsResponse(
        game_id=game_id,
        round_number=round_number,
        started_at=game.started_at.isoformat(),
        teams=team_stats_list,
        last_round_winner_id=last_round_winner_id,
    )
