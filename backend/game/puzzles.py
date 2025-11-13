"""Puzzle management for team-based games."""

import json
import random
from pathlib import Path
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, validator


class LadderStep(BaseModel):
    """A single step in a word ladder puzzle."""

    word: str
    clue: Optional[str]
    transform: Optional[str]


class PuzzleMeta(BaseModel):
    """Metadata for a puzzle."""

    title: str
    author: Optional[str] = None
    difficulty: str
    theme: Optional[str] = None
    message: Optional[str] = None

    @validator("difficulty")
    def validate_difficulty(cls, v: str) -> str:
        """Validate difficulty is one of the allowed values."""
        allowed = ["easy", "medium", "hard"]
        if v.lower() not in allowed:
            raise ValueError(f"Difficulty must be one of {allowed}, got {v}")
        return v.lower()


class Puzzle(BaseModel):
    """A complete word ladder puzzle."""

    meta: PuzzleMeta
    ladder: List[LadderStep]

    @validator("ladder")
    def validate_ladder_length(cls, v: List[LadderStep]) -> List[LadderStep]:
        """Ensure ladder has at least 5 steps."""
        if len(v) < 5:
            raise ValueError(f"Ladder must have at least 5 steps, got {len(v)}")
        return v


class PuzzleManager:
    """Manages loading and selecting puzzles for games."""

    def __init__(self, puzzle_dir: Optional[Path] = None):
        """
        Initialize the puzzle manager.

        Args:
            puzzle_dir: Directory containing puzzle JSON files.
                       Defaults to puzzles_from_raddle/json_puzzles
        """
        if puzzle_dir is None:
            # Default to the json_puzzles directory
            base_dir = Path(__file__).parent.parent.parent
            puzzle_dir = base_dir / "puzzles_from_raddle" / "json_puzzles"

        self.puzzle_dir = puzzle_dir
        self._cache: Dict[str, List[Puzzle]] = {}  # Cache by difficulty

    def _load_puzzle_from_file(self, file_path: Path) -> Optional[Puzzle]:
        """
        Load a puzzle from a JSON file.

        Args:
            file_path: Path to the puzzle JSON file

        Returns:
            Puzzle object if valid, None if invalid or error
        """
        try:
            with open(file_path, "r") as f:
                data = json.load(f)
                puzzle = Puzzle(**data)
                return puzzle
        except Exception as e:
            # Log the error but don't fail - just skip this puzzle
            print(f"Warning: Failed to load puzzle from {file_path}: {e}")
            return None

    def load_puzzles_by_difficulty(self, difficulty: str) -> List[Puzzle]:
        """
        Load all puzzles of a given difficulty.

        Args:
            difficulty: Difficulty level ("easy", "medium", "hard")

        Returns:
            List of puzzles matching the difficulty
        """
        difficulty = difficulty.lower()

        # Check cache first
        if difficulty in self._cache:
            return self._cache[difficulty]

        puzzles: List[Puzzle] = []

        # Recursively find all JSON files
        for json_file in self.puzzle_dir.rglob("*.json"):
            puzzle = self._load_puzzle_from_file(json_file)
            if puzzle and puzzle.meta.difficulty == difficulty:
                puzzles.append(puzzle)

        # Cache the results
        self._cache[difficulty] = puzzles

        return puzzles

    def get_random_puzzle(self, difficulty: str) -> Optional[Puzzle]:
        """
        Get a random puzzle of a given difficulty.

        Args:
            difficulty: Difficulty level ("easy", "medium", "hard")

        Returns:
            Random puzzle of the specified difficulty, or None if no puzzles found
        """
        puzzles = self.load_puzzles_by_difficulty(difficulty)
        if not puzzles:
            return None
        return random.choice(puzzles)

    def get_puzzles_for_teams(self, num_teams: int, difficulty: str) -> List[Puzzle]:
        """
        Get different puzzles for each team, all of the same difficulty.

        Args:
            num_teams: Number of teams that need puzzles
            difficulty: Difficulty level for all puzzles

        Returns:
            List of puzzles (length = num_teams)

        Raises:
            ValueError: If not enough puzzles available for the difficulty
        """
        puzzles = self.load_puzzles_by_difficulty(difficulty)

        if len(puzzles) < num_teams:
            raise ValueError(f"Not enough {difficulty} puzzles available. " f"Need {num_teams}, found {len(puzzles)}")

        # Randomly select num_teams different puzzles
        return random.sample(puzzles, num_teams)

    def puzzle_to_dict(self, puzzle: Puzzle) -> Dict[str, Any]:
        """
        Convert a Puzzle object to a dictionary for JSON storage.

        Args:
            puzzle: Puzzle object to convert

        Returns:
            Dictionary representation suitable for JSON storage
        """
        return puzzle.dict()

    def validate_puzzle(self, puzzle_data: Dict[str, Any]) -> bool:
        """
        Validate a puzzle dictionary.

        Args:
            puzzle_data: Dictionary containing puzzle data

        Returns:
            True if valid, False otherwise
        """
        try:
            Puzzle(**puzzle_data)
            return True
        except Exception:
            return False


# Global puzzle manager instance
_puzzle_manager: Optional[PuzzleManager] = None


def get_puzzle_manager() -> PuzzleManager:
    """Get or create the global puzzle manager instance."""
    global _puzzle_manager
    if _puzzle_manager is None:
        _puzzle_manager = PuzzleManager()
    return _puzzle_manager
