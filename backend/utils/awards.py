"""Fun player awards based on game performance."""

from typing import List

from pydantic import BaseModel


class PlayerAward(BaseModel):
    key: str
    title: str
    emoji: str
    description: str


AWARDS_CATALOG = {
    "MVP": PlayerAward(
        key="MVP",
        title="Most Valuable Player",
        emoji="🏆",
        description="Most correct guesses on the team",
    ),
    "SPEED_DEMON": PlayerAward(
        key="SPEED_DEMON",
        title="Speed Demon",
        emoji="⚡",
        description="Fastest to submit correct guesses",
    ),
    "CLUTCH": PlayerAward(
        key="CLUTCH",
        title="Clutch Player",
        emoji="💪",
        description="Solved the final word",
    ),
    "SHARPSHOOTER": PlayerAward(
        key="SHARPSHOOTER",
        title="Sharpshooter",
        emoji="🎯",
        description="Highest accuracy rate (min 5 guesses)",
    ),
    "CREATIVE": PlayerAward(
        key="CREATIVE",
        title="Creative Guesser",
        emoji="🎨",
        description="Most unique wrong guesses",
    ),
    "CHEERLEADER": PlayerAward(
        key="CHEERLEADER",
        title="Team Cheerleader",
        emoji="📣",
        description="Fewest guesses but team still won",
    ),
    "WILDCARD": PlayerAward(
        key="WILDCARD",
        title="Wildcard",
        emoji="🎲",
        description="Most enthusiastic guesser (most total guesses)",
    ),
    "PUZZLE_MASTER": PlayerAward(
        key="PUZZLE_MASTER",
        title="Puzzle Master",
        emoji="🧩",
        description="Solved the most difficult words",
    ),
    "STRATEGIST": PlayerAward(
        key="STRATEGIST",
        title="Strategist",
        emoji="🧠",
        description="Best guess diversity across puzzle",
    ),
    "WORD_WIZARD": PlayerAward(
        key="WORD_WIZARD",
        title="Word Wizard",
        emoji="🪄",
        description="Solved words in unusual order",
    ),
}


def assign_awards(
    team_stats: List[dict],  # plain dicts to avoid circular imports
    puzzle_length: int,
) -> dict[int, List[PlayerAward]]:
    """
    Assign 1-3 awards per player based on performance.

    Args:
        team_stats: List of player stat dicts with keys:
            - player_id: int
            - correct_guesses: int
            - total_guesses: int
            - accuracy_rate: float
            - words_solved: list[int]
            - wrong_guesses: list[str]
        puzzle_length: Number of words in the puzzle

    Returns:
        Dictionary mapping player_id to list of PlayerAward objects
    """
    awards_by_player = {p["player_id"]: [] for p in team_stats}

    if not team_stats:
        return awards_by_player

    # MVP: Most correct guesses
    max_correct = max(p["correct_guesses"] for p in team_stats)
    if max_correct > 0:
        mvp = [p for p in team_stats if p["correct_guesses"] == max_correct][0]
        awards_by_player[mvp["player_id"]].append(AWARDS_CATALOG["MVP"])

    # Sharpshooter: Highest accuracy (min 5 guesses)
    qualified = [p for p in team_stats if p["total_guesses"] >= 5]
    if qualified:
        sharpshooter = max(qualified, key=lambda p: p["accuracy_rate"])
        if sharpshooter["accuracy_rate"] >= 0.7:
            awards_by_player[sharpshooter["player_id"]].append(AWARDS_CATALOG["SHARPSHOOTER"])

    # Clutch: Solved the final word
    final_word_idx = puzzle_length - 1
    for player in team_stats:
        if final_word_idx in player["words_solved"]:
            awards_by_player[player["player_id"]].append(AWARDS_CATALOG["CLUTCH"])
            break

    # Creative: Most wrong guesses
    max_wrong = max(len(p["wrong_guesses"]) for p in team_stats)
    if max_wrong > 0:
        creative = [p for p in team_stats if len(p["wrong_guesses"]) == max_wrong][0]
        awards_by_player[creative["player_id"]].append(AWARDS_CATALOG["CREATIVE"])

    # Wildcard: Most total guesses
    max_guesses = max(p["total_guesses"] for p in team_stats)
    if max_guesses > 0:
        wildcard = [p for p in team_stats if p["total_guesses"] == max_guesses][0]
        # Don't give both MVP and Wildcard to same player
        mvp_id = mvp["player_id"] if max_correct > 0 else None
        if wildcard["player_id"] != mvp_id:
            awards_by_player[wildcard["player_id"]].append(AWARDS_CATALOG["WILDCARD"])

    # Cheerleader: Fewest guesses but team still progressed
    min_guesses = min(p["total_guesses"] for p in team_stats)
    if min_guesses > 0:
        cheerleader = [p for p in team_stats if p["total_guesses"] == min_guesses][0]
        if cheerleader["total_guesses"] < max_guesses * 0.5:
            awards_by_player[cheerleader["player_id"]].append(AWARDS_CATALOG["CHEERLEADER"])

    # Puzzle Master: Solved the most words
    max_solved = max(len(p["words_solved"]) for p in team_stats)
    if max_solved > 0:
        masters = [p for p in team_stats if len(p["words_solved"]) == max_solved]
        mvp_id = mvp["player_id"] if max_correct > 0 else None
        for master in masters:
            if master["player_id"] != mvp_id:
                awards_by_player[master["player_id"]].append(AWARDS_CATALOG["PUZZLE_MASTER"])

    return awards_by_player
