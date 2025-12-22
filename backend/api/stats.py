import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from backend.database import get_session
from backend.database.models import Game, Guess, Player, RoundResult, Team
from backend.game.puzzles import get_puzzle_manager
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
    placement: Optional[int]
    points_earned: Optional[int]
    wrong_guesses: int
    wrong_guess_rate: float
    wrong_guess_label: str  # playful tag
    completed_at: Optional[str]
    completion_percentage: float
    time_to_complete: Optional[int]  # seconds
    puzzle: dict  # full puzzle data for this team's round
    revealed_steps: list[int]
    player_stats: list[PlayerGameStats]


class GameStatsResponse(BaseModel):
    game_id: int
    round_number: int
    started_at: str
    teams: list[TeamGameStats]
    last_round_winner_id: Optional[int]  # for lobby crown display


def get_wrong_guess_label(wrong_count: int) -> str:
    """Get playful label based on wrong guess count."""
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
    """Get detailed statistics for a completed game."""
    # Get the game
    game = session.get(Game, game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    # Load the puzzle to get ladder length
    puzzle_manager = get_puzzle_manager()
    puzzle = puzzle_manager.load_puzzle_by_path(game.puzzle_path)
    puzzle_length = len(puzzle.ladder)

    # Get all teams in this lobby
    teams = session.exec(select(Team).where(Team.lobby_id == game.lobby_id)).all()

    # First, determine the round number from the given game_id
    sample_result = session.exec(select(RoundResult).where(RoundResult.game_id == game_id)).first()
    round_number = sample_result.round_number if sample_result else 1

    # Get ALL round results for this round (all teams may have different game_ids)
    round_results_map = {}
    round_results = session.exec(
        select(RoundResult).where(RoundResult.lobby_id == game.lobby_id).where(RoundResult.round_number == round_number)
    ).all()
    for result in round_results:
        round_results_map[result.team_id] = result

    # Get last round winner
    last_round_winner_id = None
    if round_results:
        winner = min(round_results, key=lambda r: r.placement)
        last_round_winner_id = winner.team_id

    team_stats_list = []

    for team in teams:
        # Skip teams that didn't participate in this round
        if team.id not in round_results_map:
            continue

        # Get this team's actual game_id for this round
        team_result = round_results_map[team.id]
        team_game_id = team_result.game_id
        team_game = session.get(Game, team_game_id)
        if not team_game:
            continue

        # Get all players in this team
        players = session.exec(select(Player).where(Player.team_id == team.id)).all()

        # Get all guesses for this team using their actual game_id
        guesses = session.exec(
            select(Guess)
            .where(Guess.team_id == team.id)
            .where(Guess.game_id == team_game_id)
            .order_by(Guess.created_at)
        ).all()

        # Calculate revealed steps for this team from their game
        revealed_steps = json.loads(team_game.revealed_steps)

        # Load this team's puzzle to get the correct length
        team_puzzle = puzzle_manager.load_puzzle_by_path(team_game.puzzle_path)
        team_puzzle_data = team_puzzle.model_dump()
        team_puzzle_length = len(team_puzzle.ladder)
        transformed_puzzle = {
            "title": team_puzzle_data.get("meta", {}).get("title", "Untitled Puzzle"),
            "ladder": team_puzzle_data.get("ladder", []),
        }

        # Calculate team-level stats
        team_wrong_guesses = [g for g in guesses if not g.is_correct]
        total_team_guesses = len(guesses)
        wrong_guess_rate = len(team_wrong_guesses) / total_team_guesses if total_team_guesses > 0 else 0.0
        wrong_guess_label = get_wrong_guess_label(len(team_wrong_guesses))

        # Calculate completion percentage
        completion_percentage = len(revealed_steps) / team_puzzle_length if team_puzzle_length > 0 else 0.0

        # Calculate time to complete
        time_to_complete = None
        completed_at_str = None
        if team.game_id == team_game_id and team_game.last_updated_at and team_game.started_at:
            # Use last_updated_at as proxy for completion time
            # Note: This might need adjustment based on actual completion tracking
            time_to_complete = int((team_game.last_updated_at - team_game.started_at).total_seconds())
            completed_at_str = team_game.last_updated_at.isoformat()

        # Get placement and points from round results if available
        placement = None
        points_earned = None
        if team.id in round_results_map:
            result = round_results_map[team.id]
            placement = result.placement
            points_earned = result.points_earned
            completion_percentage = result.completion_percentage
            time_to_complete = result.time_to_complete
            completed_at_str = result.completed_at.isoformat() if result.completed_at else None

        # Calculate per-player stats
        player_stats_list = []
        player_stats_dicts = []  # For awards calculation

        for player in players:
            player_guesses = [g for g in guesses if g.player_id == player.id]
            correct_guesses_list = [g for g in player_guesses if g.is_correct]
            wrong_guesses_list = [g for g in player_guesses if not g.is_correct]

            total_guesses = len(player_guesses)
            correct_guesses = len(correct_guesses_list)
            accuracy_rate = correct_guesses / total_guesses if total_guesses > 0 else 0.0

            # Find words this player solved first (for their team)
            words_solved = []
            for word_idx in revealed_steps:
                # Find first correct guess for this word index by this team
                first_correct = session.exec(
                    select(Guess)
                    .where(Guess.team_id == team.id)
                    .where(Guess.game_id == team_game_id)
                    .where(Guess.word_index == word_idx)
                    .where(Guess.is_correct)
                    .order_by(Guess.created_at)
                    .limit(1)
                ).first()

                if first_correct and first_correct.player_id == player.id:
                    words_solved.append(word_idx)

            # Store dict for awards calculation
            player_dict = {
                "player_id": player.id,
                "player_name": player.name,
                "correct_guesses": correct_guesses,
                "total_guesses": total_guesses,
                "accuracy_rate": accuracy_rate,
                "words_solved": words_solved,
                "wrong_guesses": [g.guess for g in wrong_guesses_list],
            }
            player_stats_dicts.append(player_dict)

        # Assign awards using the awards system
        awards_by_player = assign_awards(player_stats_dicts, puzzle_length) if player_stats_dicts else {}

        # Build PlayerGameStats objects with awards
        for player_dict in player_stats_dicts:
            player_awards = awards_by_player.get(player_dict["player_id"], [])
            player_stats_list.append(
                PlayerGameStats(
                    player_id=player_dict["player_id"],
                    player_name=player_dict["player_name"],
                    correct_guesses=player_dict["correct_guesses"],
                    total_guesses=player_dict["total_guesses"],
                    accuracy_rate=player_dict["accuracy_rate"],
                    words_solved=player_dict["words_solved"],
                    wrong_guesses=player_dict["wrong_guesses"],
                    awards=player_awards,
                )
            )

        team_stats_list.append(
            TeamGameStats(
                team_id=team.id,
                team_name=team.name,
                placement=placement,
                points_earned=points_earned,
                wrong_guesses=len(team_wrong_guesses),
                wrong_guess_rate=wrong_guess_rate,
                wrong_guess_label=wrong_guess_label,
                completed_at=completed_at_str,
                completion_percentage=completion_percentage,
                time_to_complete=time_to_complete,
                puzzle=transformed_puzzle,
                revealed_steps=revealed_steps,
                player_stats=player_stats_list,
            )
        )

    return GameStatsResponse(
        game_id=game_id,
        round_number=round_number,
        started_at=game.started_at.isoformat(),
        teams=team_stats_list,
        last_round_winner_id=last_round_winner_id,
    )
