"""Unit tests for the awards system."""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from backend.utils.awards import AWARDS_CATALOG, assign_awards


def test_mvp_award():
    """Test that MVP award is given to player with most correct guesses."""
    team_stats = [
        {
            "player_id": 1,
            "player_name": "Alice",
            "correct_guesses": 5,
            "total_guesses": 10,
            "accuracy_rate": 0.5,
            "words_solved": [0, 1, 2],
            "wrong_guesses": ["test", "wrong"],
        },
        {
            "player_id": 2,
            "player_name": "Bob",
            "correct_guesses": 3,
            "total_guesses": 8,
            "accuracy_rate": 0.375,
            "words_solved": [3],
            "wrong_guesses": ["bad", "guess"],
        },
    ]

    awards = assign_awards(team_stats, puzzle_length=5)

    assert AWARDS_CATALOG["MVP"] in awards[1]
    assert AWARDS_CATALOG["MVP"] not in awards[2]


def test_sharpshooter_award():
    """Test that Sharpshooter award is given to player with highest accuracy."""
    team_stats = [
        {
            "player_id": 1,
            "player_name": "Alice",
            "correct_guesses": 7,
            "total_guesses": 10,
            "accuracy_rate": 0.7,
            "words_solved": [0, 1],
            "wrong_guesses": ["a", "b", "c"],
        },
        {
            "player_id": 2,
            "player_name": "Bob",
            "correct_guesses": 3,
            "total_guesses": 10,
            "accuracy_rate": 0.3,
            "words_solved": [2],
            "wrong_guesses": ["x", "y", "z"],
        },
    ]

    awards = assign_awards(team_stats, puzzle_length=5)

    assert AWARDS_CATALOG["SHARPSHOOTER"] in awards[1]


def test_sharpshooter_requires_minimum_guesses():
    """Test that Sharpshooter requires at least 5 guesses."""
    team_stats = [
        {
            "player_id": 1,
            "player_name": "Alice",
            "correct_guesses": 3,
            "total_guesses": 3,
            "accuracy_rate": 1.0,
            "words_solved": [0, 1, 2],
            "wrong_guesses": [],
        },
    ]

    awards = assign_awards(team_stats, puzzle_length=5)

    # Should not get Sharpshooter because only 3 guesses
    assert AWARDS_CATALOG["SHARPSHOOTER"] not in awards[1]


def test_clutch_award():
    """Test that Clutch award is given to player who solved final word."""
    team_stats = [
        {
            "player_id": 1,
            "player_name": "Alice",
            "correct_guesses": 3,
            "total_guesses": 10,
            "accuracy_rate": 0.3,
            "words_solved": [0, 1],
            "wrong_guesses": ["test"],
        },
        {
            "player_id": 2,
            "player_name": "Bob",
            "correct_guesses": 2,
            "total_guesses": 8,
            "accuracy_rate": 0.25,
            "words_solved": [2, 4],  # 4 is the last word (index)
            "wrong_guesses": ["bad"],
        },
    ]

    awards = assign_awards(team_stats, puzzle_length=5)

    assert AWARDS_CATALOG["CLUTCH"] in awards[2]
    assert AWARDS_CATALOG["CLUTCH"] not in awards[1]


def test_creative_award():
    """Test that Creative award is given to player with most wrong guesses."""
    team_stats = [
        {
            "player_id": 1,
            "player_name": "Alice",
            "correct_guesses": 2,
            "total_guesses": 5,
            "accuracy_rate": 0.4,
            "words_solved": [0],
            "wrong_guesses": ["a", "b", "c"],
        },
        {
            "player_id": 2,
            "player_name": "Bob",
            "correct_guesses": 3,
            "total_guesses": 4,
            "accuracy_rate": 0.75,
            "words_solved": [1],
            "wrong_guesses": ["x"],
        },
    ]

    awards = assign_awards(team_stats, puzzle_length=5)

    assert AWARDS_CATALOG["CREATIVE"] in awards[1]


def test_wildcard_award():
    """Test that Wildcard award is given to player with most total guesses."""
    team_stats = [
        {
            "player_id": 1,
            "player_name": "Alice",
            "correct_guesses": 10,
            "total_guesses": 20,
            "accuracy_rate": 0.5,
            "words_solved": [0, 1, 2],
            "wrong_guesses": ["a"] * 10,
        },
        {
            "player_id": 2,
            "player_name": "Bob",
            "correct_guesses": 2,
            "total_guesses": 5,
            "accuracy_rate": 0.4,
            "words_solved": [3],
            "wrong_guesses": ["x", "y", "z"],
        },
    ]

    awards = assign_awards(team_stats, puzzle_length=5)

    # Alice should get both MVP and Wildcard, but Wildcard is not awarded to MVP
    assert AWARDS_CATALOG["MVP"] in awards[1]
    assert AWARDS_CATALOG["WILDCARD"] not in awards[1]


def test_cheerleader_award():
    """Test that Cheerleader award is given to player with fewest guesses."""
    team_stats = [
        {
            "player_id": 1,
            "player_name": "Alice",
            "correct_guesses": 2,
            "total_guesses": 3,
            "accuracy_rate": 0.67,
            "words_solved": [0, 1],
            "wrong_guesses": ["a"],
        },
        {
            "player_id": 2,
            "player_name": "Bob",
            "correct_guesses": 5,
            "total_guesses": 15,
            "accuracy_rate": 0.33,
            "words_solved": [2, 3],
            "wrong_guesses": ["x"] * 10,
        },
    ]

    awards = assign_awards(team_stats, puzzle_length=5)

    # Alice should get Cheerleader (3 guesses < 15 * 0.5)
    assert AWARDS_CATALOG["CHEERLEADER"] in awards[1]


def test_puzzle_master_award():
    """Test that Puzzle Master award is given to player who solved most words."""
    team_stats = [
        {
            "player_id": 1,
            "player_name": "Alice",
            "correct_guesses": 3,
            "total_guesses": 10,
            "accuracy_rate": 0.3,
            "words_solved": [0],
            "wrong_guesses": ["test"] * 7,
        },
        {
            "player_id": 2,
            "player_name": "Bob",
            "correct_guesses": 4,
            "total_guesses": 8,
            "accuracy_rate": 0.5,
            "words_solved": [1, 2, 3],
            "wrong_guesses": ["bad"] * 4,
        },
    ]

    awards = assign_awards(team_stats, puzzle_length=5)

    # Bob solved most words but also has most correct guesses (MVP)
    # So Puzzle Master shouldn't be awarded to MVP
    assert AWARDS_CATALOG["MVP"] in awards[2]
    assert AWARDS_CATALOG["PUZZLE_MASTER"] not in awards[2]


def test_empty_team_stats():
    """Test that empty team stats returns empty awards dict."""
    awards = assign_awards([], puzzle_length=5)
    assert awards == {}


def test_single_player():
    """Test awards for a single player team."""
    team_stats = [
        {
            "player_id": 1,
            "player_name": "Alice",
            "correct_guesses": 5,
            "total_guesses": 10,
            "accuracy_rate": 0.5,
            "words_solved": [0, 1, 2, 3, 4],
            "wrong_guesses": ["a", "b", "c", "d", "e"],
        },
    ]

    awards = assign_awards(team_stats, puzzle_length=5)

    # Single player should get multiple awards
    assert AWARDS_CATALOG["MVP"] in awards[1]
    assert AWARDS_CATALOG["CLUTCH"] in awards[1]
    assert AWARDS_CATALOG["CREATIVE"] in awards[1]
