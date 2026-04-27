"""Unit tests for the PuzzleManager."""

import json
import pytest
from pathlib import Path
from tempfile import TemporaryDirectory
import sys

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from backend.game.puzzles import (
    PuzzleManager,
    Puzzle,
    PuzzleMeta,
    LadderStep,
    get_puzzle_manager,
)


@pytest.fixture
def temp_puzzle_dir():
    """Create a temporary directory with test puzzles."""
    with TemporaryDirectory() as tmpdir:
        puzzle_dir = Path(tmpdir)

        # Create easy puzzles
        easy_dir = puzzle_dir / "easy"
        easy_dir.mkdir()

        for i in range(3):
            puzzle_data = {
                "meta": {
                    "title": f"Easy Puzzle {i}",
                    "difficulty": "easy",
                    "author": "Test Author",
                },
                "ladder": [
                    {"word": "START", "clue": "Begin", "transform": ""},
                    {"word": "STARE", "clue": "Look", "transform": "T->E"},
                    {"word": "SHARE", "clue": "Give", "transform": "T->H"},
                    {"word": "SHORE", "clue": "Beach", "transform": "A->O"},
                    {"word": "FINAL", "clue": "End", "transform": ""},
                ],
            }
            with open(easy_dir / f"puzzle{i}.json", "w") as f:
                json.dump(puzzle_data, f)

        # Create medium puzzles with different lengths
        medium_dir = puzzle_dir / "medium"
        medium_dir.mkdir()

        # 5-word puzzle
        puzzle_data = {
            "meta": {
                "title": "Medium Puzzle Short",
                "difficulty": "medium",
            },
            "ladder": [
                {"word": "WORD1", "clue": "1", "transform": ""},
                {"word": "WORD2", "clue": "2", "transform": ""},
                {"word": "WORD3", "clue": "3", "transform": ""},
                {"word": "WORD4", "clue": "4", "transform": ""},
                {"word": "WORD5", "clue": "5", "transform": ""},
            ],
        }
        with open(medium_dir / "short.json", "w") as f:
            json.dump(puzzle_data, f)

        # 7-word puzzle
        puzzle_data["meta"]["title"] = "Medium Puzzle Long"
        puzzle_data["ladder"].append({"word": "WORD6", "clue": "6", "transform": ""})
        puzzle_data["ladder"].append({"word": "WORD7", "clue": "7", "transform": ""})
        with open(medium_dir / "long.json", "w") as f:
            json.dump(puzzle_data, f)

        # Create hard puzzle
        hard_dir = puzzle_dir / "hard"
        hard_dir.mkdir()

        puzzle_data = {
            "meta": {
                "title": "Hard Puzzle",
                "difficulty": "hard",
            },
            "ladder": [
                {"word": "HARD1", "clue": "1", "transform": ""},
                {"word": "HARD2", "clue": "2", "transform": ""},
                {"word": "HARD3", "clue": "3", "transform": ""},
                {"word": "HARD4", "clue": "4", "transform": ""},
                {"word": "HARD5", "clue": "5", "transform": ""},
            ],
        }
        with open(hard_dir / "puzzle.json", "w") as f:
            json.dump(puzzle_data, f)

        # Create invalid puzzle (too short)
        invalid_puzzle = {
            "meta": {"title": "Invalid", "difficulty": "easy"},
            "ladder": [
                {"word": "ONE", "clue": "1", "transform": ""},
                {"word": "TWO", "clue": "2", "transform": ""},
            ],
        }
        with open(easy_dir / "invalid.json", "w") as f:
            json.dump(invalid_puzzle, f)

        yield puzzle_dir


@pytest.fixture
def puzzle_manager(temp_puzzle_dir):
    """Create a PuzzleManager with test puzzles."""
    return PuzzleManager(temp_puzzle_dir)


class TestPuzzleManagerLoading:
    """Tests for puzzle loading functionality."""

    def test_load_easy_puzzles(self, puzzle_manager):
        """Should load all easy puzzles."""
        puzzles = puzzle_manager.load_puzzles_by_difficulty("easy")
        assert len(puzzles) == 3  # 3 valid easy puzzles
        assert all(p.puzzle.meta.difficulty == "easy" for p in puzzles)

    def test_load_medium_puzzles(self, puzzle_manager):
        """Should load all medium puzzles."""
        puzzles = puzzle_manager.load_puzzles_by_difficulty("medium")
        assert len(puzzles) == 2
        assert all(p.puzzle.meta.difficulty == "medium" for p in puzzles)

    def test_load_hard_puzzles(self, puzzle_manager):
        """Should load all hard puzzles."""
        puzzles = puzzle_manager.load_puzzles_by_difficulty("hard")
        assert len(puzzles) == 1
        assert puzzles[0].puzzle.meta.difficulty == "hard"

    def test_case_insensitive_difficulty(self, puzzle_manager):
        """Difficulty should be case-insensitive."""
        easy1 = puzzle_manager.load_puzzles_by_difficulty("easy")
        easy2 = puzzle_manager.load_puzzles_by_difficulty("EASY")
        easy3 = puzzle_manager.load_puzzles_by_difficulty("Easy")

        assert len(easy1) == len(easy2) == len(easy3)

    def test_caching_puzzles(self, puzzle_manager):
        """Should cache loaded puzzles."""
        # First load
        puzzles1 = puzzle_manager.load_puzzles_by_difficulty("easy")

        # Second load should use cache (same objects)
        puzzles2 = puzzle_manager.load_puzzles_by_difficulty("easy")

        assert puzzles1 is puzzles2  # Same list object from cache

    def test_skip_invalid_puzzles(self, puzzle_manager):
        """Should skip invalid puzzles without crashing."""
        # Invalid puzzle exists but should be skipped
        puzzles = puzzle_manager.load_puzzles_by_difficulty("easy")
        # Should have 3 valid puzzles, not 4
        assert len(puzzles) == 3

    def test_nonexistent_difficulty(self, puzzle_manager):
        """Should return empty list for non-existent difficulty."""
        puzzles = puzzle_manager.load_puzzles_by_difficulty("impossible")
        assert puzzles == []

    def test_load_puzzle_by_path_cached(self, puzzle_manager):
        """Should cache puzzles by their normalized path."""
        puzzle_file = puzzle_manager.get_random_puzzle("easy")
        assert puzzle_file is not None

        puzzle_path = puzzle_manager.normalize_puzzle_path(puzzle_file.path)
        puzzle1 = puzzle_manager.load_puzzle_by_path(puzzle_path)
        puzzle2 = puzzle_manager.load_puzzle_by_path(puzzle_path)

        assert puzzle1 is puzzle2


class TestRandomPuzzleSelection:
    """Tests for random puzzle selection."""

    def test_get_random_puzzle(self, puzzle_manager):
        """Should return a random puzzle of specified difficulty."""
        puzzle_file = puzzle_manager.get_random_puzzle("easy")
        assert puzzle_file is not None
        assert puzzle_file.puzzle.meta.difficulty == "easy"

    def test_get_random_puzzle_nonexistent(self, puzzle_manager):
        """Should return None for non-existent difficulty."""
        puzzle = puzzle_manager.get_random_puzzle("impossible")
        assert puzzle is None

    def test_get_random_puzzle_excludes_used(self, puzzle_manager):
        """Should return None when all puzzles are excluded."""
        puzzles = puzzle_manager.load_puzzles_by_difficulty("easy")
        exclude_paths = {puzzle_manager.normalize_puzzle_path(p.path) for p in puzzles}
        puzzle = puzzle_manager.get_random_puzzle("easy", exclude_paths=exclude_paths)
        assert puzzle is None

    def test_random_puzzle_variability(self, puzzle_manager):
        """Random puzzle should potentially vary across calls."""
        # With 3 easy puzzles, should get different ones eventually
        # (though not guaranteed in a single run)
        puzzles = [puzzle_manager.get_random_puzzle("easy") for _ in range(10)]
        assert all(p is not None for p in puzzles)
        # At least check they're all valid
        assert all(p.puzzle.meta.difficulty == "easy" for p in puzzles if p is not None)


class TestTeamPuzzleAssignment:
    """Tests for assigning puzzles to teams."""

    def test_get_puzzles_for_teams(self, puzzle_manager):
        """Should return different puzzles for each team."""
        puzzles = puzzle_manager.get_puzzles_for_teams(3, "easy")

        assert len(puzzles) == 3
        assert all(p.puzzle.meta.difficulty == "easy" for p in puzzles)

        # All puzzles should be unique
        titles = [p.puzzle.meta.title for p in puzzles]
        assert len(titles) == len(set(titles))

    def test_not_enough_puzzles_raises_error(self, puzzle_manager):
        """Should raise error if not enough puzzles available."""
        with pytest.raises(ValueError, match="Not enough"):
            puzzle_manager.get_puzzles_for_teams(5, "easy")  # Only 3 available

    def test_excluding_puzzles_reduces_available_pool(self, puzzle_manager):
        """Should raise error when excluded puzzles leave too few options."""
        puzzles = puzzle_manager.load_puzzles_by_difficulty("easy")
        exclude_paths = {puzzle_manager.normalize_puzzle_path(p.path) for p in puzzles[:2]}
        with pytest.raises(ValueError, match="Not enough"):
            puzzle_manager.get_puzzles_for_teams(2, "easy", exclude_paths=exclude_paths)

    def test_no_puzzles_for_difficulty(self, puzzle_manager):
        """Should raise error if no puzzles for difficulty."""
        with pytest.raises(ValueError, match="No .* puzzles are available"):
            puzzle_manager.get_puzzles_for_teams(1, "impossible")

    def test_similar_word_counts(self, puzzle_manager):
        """Should try to assign puzzles with similar word counts when possible."""
        # With only 2 medium puzzles of different lengths (5 and 7),
        # this test just verifies the function returns the right number
        puzzles = puzzle_manager.get_puzzles_for_teams(2, "medium")

        assert len(puzzles) == 2
        # Both should be medium difficulty
        assert all(p.puzzle.meta.difficulty == "medium" for p in puzzles)


class TestPuzzleValidation:
    """Tests for puzzle models and validation."""

    def test_ladder_step_creation(self):
        """Should create ladder step with all fields."""
        step = LadderStep(word="TEST", clue="A test", transform="X->Y")
        assert step.word == "TEST"
        assert step.clue == "A test"
        assert step.transform == "X->Y"

    def test_ladder_step_optional_fields(self):
        """Clue and transform should be optional."""
        step = LadderStep(word="TEST", clue=None, transform=None)
        assert step.word == "TEST"
        assert step.clue is None
        assert step.transform is None

    def test_puzzle_meta_difficulty_validation(self):
        """Should validate difficulty values."""
        # Valid difficulties
        for diff in ["easy", "medium", "hard"]:
            meta = PuzzleMeta(title="Test", difficulty=diff)
            assert meta.difficulty == diff

        # Invalid difficulty
        with pytest.raises(ValueError, match="Difficulty must be one of"):
            PuzzleMeta(title="Test", difficulty="impossible")

    def test_puzzle_meta_case_normalization(self):
        """Difficulty should be normalized to lowercase."""
        meta = PuzzleMeta(title="Test", difficulty="EASY")
        assert meta.difficulty == "easy"

    def test_puzzle_minimum_ladder_length(self):
        """Puzzle must have at least 5 steps."""
        # Valid puzzle
        valid_ladder = [LadderStep(word=f"W{i}", clue="", transform="") for i in range(5)]
        puzzle = Puzzle(meta=PuzzleMeta(title="Test", difficulty="easy"), ladder=valid_ladder)
        assert len(puzzle.ladder) == 5

        # Invalid puzzle (too short)
        short_ladder = [LadderStep(word=f"W{i}", clue="", transform="") for i in range(3)]
        with pytest.raises(ValueError, match="at least 5 steps"):
            Puzzle(meta=PuzzleMeta(title="Test", difficulty="easy"), ladder=short_ladder)


class TestPuzzleSerialization:
    """Tests for puzzle serialization."""

    def test_puzzle_to_dict(self, puzzle_manager):
        """Should convert puzzle to dictionary."""
        puzzle_file = puzzle_manager.get_random_puzzle("easy")
        puzzle_dict = puzzle_manager.puzzle_to_dict(puzzle_file.puzzle)

        assert "meta" in puzzle_dict
        assert "ladder" in puzzle_dict
        assert puzzle_dict["meta"]["difficulty"] == "easy"

    def test_validate_puzzle_valid(self, puzzle_manager):
        """Should validate a valid puzzle dictionary."""
        puzzle_file = puzzle_manager.get_random_puzzle("easy")
        puzzle_dict = puzzle_manager.puzzle_to_dict(puzzle_file.puzzle)

        assert puzzle_manager.validate_puzzle(puzzle_dict)

    def test_validate_puzzle_invalid(self, puzzle_manager):
        """Should reject invalid puzzle dictionary."""
        invalid_puzzle = {
            "meta": {"title": "Test", "difficulty": "easy"},
            "ladder": [],  # Empty ladder
        }

        assert not puzzle_manager.validate_puzzle(invalid_puzzle)


class TestGlobalPuzzleManager:
    """Tests for global puzzle manager singleton."""

    def test_get_puzzle_manager_singleton(self):
        """Should return same instance on multiple calls."""
        manager1 = get_puzzle_manager()
        manager2 = get_puzzle_manager()

        assert manager1 is manager2

    def test_global_manager_default_directory(self):
        """Global manager should use default directory."""
        manager = get_puzzle_manager()
        assert manager.puzzle_dir.exists()
        assert "json_puzzles" in str(manager.puzzle_dir)
