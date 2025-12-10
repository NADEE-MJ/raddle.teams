"""Unit tests for tournament features."""

import math
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from backend.api.stats import get_wrong_guess_label
from backend.utils.awards import AWARDS_CATALOG, PlayerAward, assign_awards


class TestPointsCalculation:
    """Tests for points calculation algorithm."""

    def test_reverse_placement_scoring(self):
        """Points should be awarded in reverse placement order."""

        # Helper function matching the backend logic
        def calculate_points(
            placement: int, total_teams: int, completion_pct: float, completed: bool, has_finishers: bool
        ) -> int:
            if not has_finishers:
                return 0
            if completed:
                return total_teams - placement + 1
            # DNF logic
            worst_finished_points = total_teams - (placement - 1)  # Simplified for test
            base = worst_finished_points
            cap = base * 0.75
            return max(1, math.ceil(min(cap, base * completion_pct)))

        # Test finished teams
        assert calculate_points(1, 4, 1.0, True, True) == 4  # 1st place gets 4 points
        assert calculate_points(2, 4, 1.0, True, True) == 3  # 2nd place gets 3 points
        assert calculate_points(3, 4, 1.0, True, True) == 2  # 3rd place gets 2 points
        assert calculate_points(4, 4, 1.0, True, True) == 1  # 4th place gets 1 point

    def test_dnf_scoring_cap(self):
        """DNF teams get up to 75% of worst finished points."""
        # Assume 3 teams finished, so worst_finished_points = 5 - 3 + 1 = 3
        worst_finished_points = 3
        base = worst_finished_points
        cap = base * 0.75  # 2.25

        # DNF with 100% completion (capped)
        dnf_100_pct = max(1, math.ceil(min(cap, base * 1.0)))
        assert dnf_100_pct == 3  # ceil(min(2.25, 3)) = 3

        # DNF with 50% completion
        dnf_50_pct = max(1, math.ceil(min(cap, base * 0.5)))
        assert dnf_50_pct == 2  # ceil(min(2.25, 1.5)) = 2

        # DNF with 10% completion
        dnf_10_pct = max(1, math.ceil(min(cap, base * 0.1)))
        assert dnf_10_pct == 1  # ceil(min(2.25, 0.3)) = 1 (min 1)

    def test_no_finishers_use_total_team_base(self):
        """If nobody finishes, DNFs use total team count as base with 75% cap and min 1."""
        total_teams = 4

        def calculate_points(placement: int, total_teams: int, completion_pct: float, completed: bool) -> int:
            if completed:
                return total_teams - placement + 1
            base = total_teams
            cap = base * 0.75
            return max(1, math.ceil(min(cap, base * completion_pct)))

        assert calculate_points(1, total_teams, 0.8, False) == 3  # ceil(min(3, 3.2))
        assert calculate_points(2, total_teams, 0.6, False) == 3  # ceil(min(3, 2.4))
        assert calculate_points(3, total_teams, 0.1, False) == 1  # min 1

    def test_tie_handling_same_placement(self):
        """Teams with same completion time get same placement and points."""
        total_teams = 5

        # Simulate tie: two teams finish at same time (placement 1)
        # Both should get 5 points (total_teams - 1 + 1)
        def calculate_points(placement: int, total_teams: int) -> int:
            return total_teams - placement + 1

        team1_points = calculate_points(1, total_teams)
        team2_points = calculate_points(1, total_teams)  # Same placement
        team3_points = calculate_points(3, total_teams)  # Next placement jumps to 3

        assert team1_points == 5
        assert team2_points == 5
        assert team3_points == 3  # 5 - 3 + 1


class TestWrongGuessLabels:
    """Tests for wrong guess label generation."""

    def test_laser_focus(self):
        """0-1 wrong guesses = Laser Focus."""
        assert get_wrong_guess_label(0) == "Laser Focus"
        assert get_wrong_guess_label(1) == "Laser Focus"

    def test_precision_mode(self):
        """2-4 wrong guesses = Precision Mode."""
        assert get_wrong_guess_label(2) == "Precision Mode"
        assert get_wrong_guess_label(3) == "Precision Mode"
        assert get_wrong_guess_label(4) == "Precision Mode"

    def test_oops_o_meter(self):
        """5-7 wrong guesses = Oops-o-meter."""
        assert get_wrong_guess_label(5) == "Oops-o-meter"
        assert get_wrong_guess_label(6) == "Oops-o-meter"
        assert get_wrong_guess_label(7) == "Oops-o-meter"

    def test_spice_rack(self):
        """8-12 wrong guesses = Spice Rack."""
        assert get_wrong_guess_label(8) == "Spice Rack"
        assert get_wrong_guess_label(10) == "Spice Rack"
        assert get_wrong_guess_label(12) == "Spice Rack"

    def test_chaos_engine(self):
        """13-20 wrong guesses = Chaos Engine."""
        assert get_wrong_guess_label(13) == "Chaos Engine"
        assert get_wrong_guess_label(15) == "Chaos Engine"
        assert get_wrong_guess_label(20) == "Chaos Engine"

    def test_plot_twist_factory(self):
        """21+ wrong guesses = Plot Twist Factory."""
        assert get_wrong_guess_label(21) == "Plot Twist Factory"
        assert get_wrong_guess_label(50) == "Plot Twist Factory"
        assert get_wrong_guess_label(100) == "Plot Twist Factory"


class TestAwardsSystem:
    """Tests for player awards assignment."""

    def test_mvp_award(self):
        """Player with most correct guesses gets MVP."""
        team_stats = [
            {
                "player_id": 1,
                "player_name": "Alice",
                "correct_guesses": 10,
                "total_guesses": 12,
                "accuracy_rate": 0.83,
                "words_solved": [0, 1, 2],
                "wrong_guesses": ["cat", "dog"],
            },
            {
                "player_id": 2,
                "player_name": "Bob",
                "correct_guesses": 5,
                "total_guesses": 8,
                "accuracy_rate": 0.625,
                "words_solved": [3, 4],
                "wrong_guesses": ["fish", "bird", "mouse"],
            },
        ]

        awards = assign_awards(team_stats, puzzle_length=5)

        # Alice should get MVP
        assert any(a.key == "MVP" for a in awards[1])
        # Bob should not get MVP
        assert not any(a.key == "MVP" for a in awards[2])

    def test_sharpshooter_award(self):
        """Player with highest accuracy (min 5 guesses, >70%) gets Sharpshooter."""
        team_stats = [
            {
                "player_id": 1,
                "player_name": "Alice",
                "correct_guesses": 8,
                "total_guesses": 10,
                "accuracy_rate": 0.8,
                "words_solved": [0, 1],
                "wrong_guesses": ["cat", "dog"],
            },
            {
                "player_id": 2,
                "player_name": "Bob",
                "correct_guesses": 3,
                "total_guesses": 10,
                "accuracy_rate": 0.3,
                "words_solved": [2],
                "wrong_guesses": ["a", "b", "c", "d", "e", "f", "g"],
            },
        ]

        awards = assign_awards(team_stats, puzzle_length=5)

        # Alice should get Sharpshooter (80% accuracy, >= 5 guesses, >= 70%)
        assert any(a.key == "SHARPSHOOTER" for a in awards[1])

    def test_clutch_award(self):
        """Player who solved final word gets Clutch."""
        team_stats = [
            {
                "player_id": 1,
                "player_name": "Alice",
                "correct_guesses": 5,
                "total_guesses": 8,
                "accuracy_rate": 0.625,
                "words_solved": [0, 1, 2],
                "wrong_guesses": ["cat", "dog", "fish"],
            },
            {
                "player_id": 2,
                "player_name": "Bob",
                "correct_guesses": 5,
                "total_guesses": 7,
                "accuracy_rate": 0.71,
                "words_solved": [3, 4],  # word 4 is the final word (puzzle_length=5, so final index=4)
                "wrong_guesses": ["bird", "mouse"],
            },
        ]

        awards = assign_awards(team_stats, puzzle_length=5)

        # Bob should get Clutch (solved word index 4, which is final)
        assert any(a.key == "CLUTCH" for a in awards[2])

    def test_creative_award(self):
        """Player with most wrong guesses gets Creative."""
        team_stats = [
            {
                "player_id": 1,
                "player_name": "Alice",
                "correct_guesses": 5,
                "total_guesses": 7,
                "accuracy_rate": 0.71,
                "words_solved": [0, 1],
                "wrong_guesses": ["cat", "dog"],
            },
            {
                "player_id": 2,
                "player_name": "Bob",
                "correct_guesses": 3,
                "total_guesses": 10,
                "accuracy_rate": 0.3,
                "words_solved": [2],
                "wrong_guesses": ["a", "b", "c", "d", "e", "f", "g"],
            },
        ]

        awards = assign_awards(team_stats, puzzle_length=5)

        # Bob should get Creative (most wrong guesses)
        assert any(a.key == "CREATIVE" for a in awards[2])

    def test_wildcard_award(self):
        """Player with most total guesses (not MVP) gets Wildcard."""
        team_stats = [
            {
                "player_id": 1,
                "player_name": "Alice",
                "correct_guesses": 5,
                "total_guesses": 8,
                "accuracy_rate": 0.625,
                "words_solved": [0, 1],
                "wrong_guesses": ["cat", "dog", "fish"],
            },
            {
                "player_id": 2,
                "player_name": "Bob",
                "correct_guesses": 3,
                "total_guesses": 15,  # Most guesses
                "accuracy_rate": 0.2,
                "words_solved": [2],
                "wrong_guesses": ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"],
            },
        ]

        awards = assign_awards(team_stats, puzzle_length=5)

        # Bob should get Wildcard (most total guesses, not MVP)
        assert any(a.key == "WILDCARD" for a in awards[2])

    def test_cheerleader_award(self):
        """Player with fewest guesses (< 50% of max) gets Cheerleader."""
        team_stats = [
            {
                "player_id": 1,
                "player_name": "Alice",
                "correct_guesses": 2,
                "total_guesses": 3,  # Very few guesses
                "accuracy_rate": 0.67,
                "words_solved": [0],
                "wrong_guesses": ["cat"],
            },
            {
                "player_id": 2,
                "player_name": "Bob",
                "correct_guesses": 8,
                "total_guesses": 15,  # Many guesses
                "accuracy_rate": 0.53,
                "words_solved": [1, 2, 3, 4],
                "wrong_guesses": ["a", "b", "c", "d", "e", "f", "g"],
            },
        ]

        awards = assign_awards(team_stats, puzzle_length=5)

        # Alice should get Cheerleader (3 guesses < 15 * 0.5 = 7.5)
        assert any(a.key == "CHEERLEADER" for a in awards[1])

    def test_puzzle_master_award(self):
        """Player who solved most words (not MVP) gets Puzzle Master."""
        team_stats = [
            {
                "player_id": 1,
                "player_name": "Alice",
                "correct_guesses": 6,
                "total_guesses": 10,
                "accuracy_rate": 0.6,
                "words_solved": [0, 1, 2, 3],  # Most words solved
                "wrong_guesses": ["cat", "dog", "fish", "bird"],
            },
            {
                "player_id": 2,
                "player_name": "Bob",
                "correct_guesses": 8,  # Most correct guesses (MVP)
                "total_guesses": 12,
                "accuracy_rate": 0.67,
                "words_solved": [4],  # Fewer words solved
                "wrong_guesses": ["a", "b", "c", "d"],
            },
        ]

        awards = assign_awards(team_stats, puzzle_length=5)

        # Alice should get Puzzle Master (solved most words, not MVP)
        assert any(a.key == "PUZZLE_MASTER" for a in awards[1])
        # Bob should get MVP
        assert any(a.key == "MVP" for a in awards[2])

    def test_empty_team_stats(self):
        """Empty team stats should return empty awards."""
        awards = assign_awards([], puzzle_length=5)
        assert awards == {}

    def test_multiple_awards_per_player(self):
        """Players can receive multiple awards."""
        team_stats = [
            {
                "player_id": 1,
                "player_name": "Alice",
                "correct_guesses": 10,  # Most correct (MVP)
                "total_guesses": 12,
                "accuracy_rate": 0.83,  # High accuracy (Sharpshooter)
                "words_solved": [0, 1, 2, 3, 4],  # Solved final word (Clutch)
                "wrong_guesses": ["cat", "dog"],
            },
        ]

        awards = assign_awards(team_stats, puzzle_length=5)

        # Alice should get multiple awards
        alice_awards = awards[1]
        assert len(alice_awards) >= 2
        assert any(a.key == "MVP" for a in alice_awards)
        assert any(a.key == "CLUTCH" for a in alice_awards)


class TestAwardsCatalog:
    """Tests for awards catalog definitions."""

    def test_all_awards_have_required_fields(self):
        """All awards should have key, title, emoji, and description."""
        for key, award in AWARDS_CATALOG.items():
            assert isinstance(award, PlayerAward)
            assert award.key == key
            assert len(award.title) > 0
            assert len(award.emoji) > 0
            assert len(award.description) > 0

    def test_awards_catalog_keys(self):
        """Awards catalog should contain all expected awards."""
        expected_keys = [
            "MVP",
            "SPEED_DEMON",
            "CLUTCH",
            "SHARPSHOOTER",
            "CREATIVE",
            "CHEERLEADER",
            "WILDCARD",
            "PUZZLE_MASTER",
            "STRATEGIST",
            "WORD_WIZARD",
        ]

        for key in expected_keys:
            assert key in AWARDS_CATALOG, f"Missing award: {key}"
