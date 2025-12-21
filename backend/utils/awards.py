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
    "LUCKY_CHARM": PlayerAward(
        key="LUCKY_CHARM",
        title="Lucky Charm",
        emoji="🍀",
        description="Perfect accuracy with minimal guesses",
    ),
    "ONE_HIT_WONDER": PlayerAward(
        key="ONE_HIT_WONDER",
        title="One Hit Wonder",
        emoji="🎤",
        description="Got exactly one word - but nailed it!",
    ),
    "PARTICIPATION_TROPHY": PlayerAward(
        key="PARTICIPATION_TROPHY",
        title="Participation Trophy",
        emoji="🎖️",
        description="Showed up, that's what counts!",
    ),
    "COMEBACK_KID": PlayerAward(
        key="COMEBACK_KID",
        title="Comeback Kid",
        emoji="🔥",
        description="Slow start but strong finish",
    ),
    "SPRINT_STARTER": PlayerAward(
        key="SPRINT_STARTER",
        title="Sprint Starter",
        emoji="🏃",
        description="First out of the gate",
    ),
    "CLOSE_BUT_NO_CIGAR": PlayerAward(
        key="CLOSE_BUT_NO_CIGAR",
        title="Close But No Cigar",
        emoji="🚬",
        description="So many almost-correct guesses",
    ),
    "ALPHABET_SOUP": PlayerAward(
        key="ALPHABET_SOUP",
        title="Alphabet Soup",
        emoji="🔤",
        description="Guessed through the whole dictionary",
    ),
    "SILENT_ASSASSIN": PlayerAward(
        key="SILENT_ASSASSIN",
        title="Silent Assassin",
        emoji="🥷",
        description="Few words, maximum impact",
    ),
    "DICTIONARY_DIVER": PlayerAward(
        key="DICTIONARY_DIVER",
        title="Dictionary Diver",
        emoji="📖",
        description="Tried every obscure word imaginable",
    ),
    "PATTERN_RECOGNIZER": PlayerAward(
        key="PATTERN_RECOGNIZER",
        title="Pattern Recognizer",
        emoji="🧬",
        description="Found the pattern early",
    ),
    "CHAOS_COORDINATOR": PlayerAward(
        key="CHAOS_COORDINATOR",
        title="Chaos Coordinator",
        emoji="🌪️",
        description="Guesses were all over the map",
    ),
    "LATE_BLOOMER": PlayerAward(
        key="LATE_BLOOMER",
        title="Late Bloomer",
        emoji="🌸",
        description="Found their rhythm halfway through",
    ),
    "PERFECTIONIST": PlayerAward(
        key="PERFECTIONIST",
        title="Perfectionist",
        emoji="💯",
        description="100% accuracy rate",
    ),
    "SUPPORT_CLASS": PlayerAward(
        key="SUPPORT_CLASS",
        title="Support Class",
        emoji="🛡️",
        description="Didn't lead, but held the team together",
    ),
}


def assign_awards(
    team_stats: List[dict],  # plain dicts to avoid circular imports
    puzzle_length: int,
) -> dict[int, List[PlayerAward]]:
    """
    Assign 1-3 awards per player based on performance
    """
    awards_by_player = {p["player_id"]: [] for p in team_stats}

    if not team_stats:
        return awards_by_player

    # MVP: Most correct guesses
    max_correct = max(p["correct_guesses"] for p in team_stats)
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

    # Wildcard: Most total guesses (if not already MVP)
    max_guesses = max(p["total_guesses"] for p in team_stats)
    wildcard = [p for p in team_stats if p["total_guesses"] == max_guesses][0]
    if wildcard["player_id"] != mvp["player_id"]:
        awards_by_player[wildcard["player_id"]].append(AWARDS_CATALOG["WILDCARD"])

    # Cheerleader: Fewest guesses (if significantly less than max)
    min_guesses = min(p["total_guesses"] for p in team_stats)
    cheerleader = [p for p in team_stats if p["total_guesses"] == min_guesses][0]
    if cheerleader["total_guesses"] < max_guesses * 0.5:
        awards_by_player[cheerleader["player_id"]].append(AWARDS_CATALOG["CHEERLEADER"])

    # Puzzle Master: Solved the most words (if not already MVP)
    max_solved = max(len(p["words_solved"]) for p in team_stats)
    if max_solved > 0:
        masters = [p for p in team_stats if len(p["words_solved"]) == max_solved]
        for master in masters:
            if master["player_id"] != mvp["player_id"]:
                awards_by_player[master["player_id"]].append(AWARDS_CATALOG["PUZZLE_MASTER"])

    # Perfectionist: 100% accuracy (min 3 guesses to qualify)
    perfectionists = [p for p in team_stats if p["total_guesses"] >= 3 and p["accuracy_rate"] == 1.0]
    for perfect in perfectionists:
        awards_by_player[perfect["player_id"]].append(AWARDS_CATALOG["PERFECTIONIST"])

    # Lucky Charm: Perfect accuracy with very few guesses (1-2 guesses, all correct)
    lucky_ones = [p for p in team_stats if 1 <= p["total_guesses"] <= 2 and p["accuracy_rate"] == 1.0]
    for lucky in lucky_ones:
        if AWARDS_CATALOG["PERFECTIONIST"] not in awards_by_player[lucky["player_id"]]:
            awards_by_player[lucky["player_id"]].append(AWARDS_CATALOG["LUCKY_CHARM"])

    # One Hit Wonder: Got exactly one word right
    one_hitters = [p for p in team_stats if p["correct_guesses"] == 1]
    for one_hit in one_hitters:
        if len(awards_by_player[one_hit["player_id"]]) == 0:  # Only if they don't have other awards
            awards_by_player[one_hit["player_id"]].append(AWARDS_CATALOG["ONE_HIT_WONDER"])

    # Silent Assassin: High accuracy with very few guesses (3-5 guesses, >80% accuracy)
    silent_types = [p for p in team_stats if 3 <= p["total_guesses"] <= 5 and p["accuracy_rate"] >= 0.8]
    for silent in silent_types:
        if silent["player_id"] != cheerleader["player_id"]:
            awards_by_player[silent["player_id"]].append(AWARDS_CATALOG["SILENT_ASSASSIN"])

    # Sprint Starter: Solved the first word
    for player in team_stats:
        if 0 in player["words_solved"]:
            awards_by_player[player["player_id"]].append(AWARDS_CATALOG["SPRINT_STARTER"])
            break

    # Pattern Recognizer: Solved 3+ words in sequence
    for player in team_stats:
        words = sorted(player["words_solved"])
        if len(words) >= 3:
            # Check for consecutive sequences
            for i in range(len(words) - 2):
                if words[i + 1] == words[i] + 1 and words[i + 2] == words[i] + 2:
                    awards_by_player[player["player_id"]].append(AWARDS_CATALOG["PATTERN_RECOGNIZER"])
                    break

    # Comeback Kid: Solved more words in second half than first half
    if puzzle_length >= 4:
        mid_point = puzzle_length // 2
        for player in team_stats:
            first_half = sum(1 for w in player["words_solved"] if w < mid_point)
            second_half = sum(1 for w in player["words_solved"] if w >= mid_point)
            if second_half > first_half and second_half >= 2:
                awards_by_player[player["player_id"]].append(AWARDS_CATALOG["COMEBACK_KID"])

    # Late Bloomer: Similar to comeback kid but for guessing activity
    for player in team_stats:
        if player["total_guesses"] >= 4:
            # Would need guess timestamps to determine this properly
            # For now, award if they solved words in the latter half
            if len(player["words_solved"]) >= 2:
                avg_word_idx = sum(player["words_solved"]) / len(player["words_solved"])
                if avg_word_idx > puzzle_length * 0.6:
                    awards_by_player[player["player_id"]].append(AWARDS_CATALOG["LATE_BLOOMER"])

    # Alphabet Soup: Lots of total guesses relative to team
    if max_guesses >= 15:
        for player in team_stats:
            if player["total_guesses"] >= max_guesses * 0.8 and player["player_id"] != wildcard["player_id"]:
                awards_by_player[player["player_id"]].append(AWARDS_CATALOG["ALPHABET_SOUP"])

    # Chaos Coordinator: Low accuracy with many guesses
    chaos_candidates = [p for p in team_stats if p["total_guesses"] >= 8 and p["accuracy_rate"] < 0.4]
    if chaos_candidates:
        for chaos in chaos_candidates:
            awards_by_player[chaos["player_id"]].append(AWARDS_CATALOG["CHAOS_COORDINATOR"])

    # Dictionary Diver: Most unique long wrong guesses (>6 characters)
    for player in team_stats:
        long_wrong = [g for g in player["wrong_guesses"] if len(g) > 6]
        if len(long_wrong) >= 5:
            awards_by_player[player["player_id"]].append(AWARDS_CATALOG["DICTIONARY_DIVER"])

    # Support Class: Moderate contribution (not highest, not lowest, but consistent)
    if len(team_stats) >= 3:
        middle_performers = [
            p
            for p in team_stats
            if p["player_id"] != mvp["player_id"]
            and p["player_id"] != cheerleader["player_id"]
            and 0.3 <= p["accuracy_rate"] <= 0.7
            and 3 <= p["total_guesses"] <= 10
        ]
        for support in middle_performers:
            if len(awards_by_player[support["player_id"]]) <= 1:  # Don't have many awards yet
                awards_by_player[support["player_id"]].append(AWARDS_CATALOG["SUPPORT_CLASS"])
                break  # Only give to one person

    # Participation Trophy: Very few guesses and low accuracy (the "showed up" award)
    for player in team_stats:
        if player["total_guesses"] <= 2 and player["correct_guesses"] == 0:
            if len(awards_by_player[player["player_id"]]) == 0:
                awards_by_player[player["player_id"]].append(AWARDS_CATALOG["PARTICIPATION_TROPHY"])

    return awards_by_player
