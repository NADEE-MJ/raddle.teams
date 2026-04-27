"""Puzzle management for team-based games."""

import json
import random
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Set

from pydantic import BaseModel, field_validator


class LadderStep(BaseModel):
    """A single step in a word ladder puzzle."""

    word: str
    clue: Optional[str] = None
    transform: Optional[str] = None


class PuzzleMeta(BaseModel):
    """Metadata for a puzzle."""

    title: str
    author: Optional[str] = None
    difficulty: Optional[str] = None
    theme: Optional[str] = None
    message: Optional[str] = None

    @field_validator("difficulty")
    @classmethod
    def validate_difficulty(cls, v: Optional[str]) -> Optional[str]:
        """Validate difficulty is one of the allowed values."""
        if v is None:
            return None
        allowed = ["easy", "medium", "hard"]
        if v.lower() not in allowed:
            raise ValueError(f"Difficulty must be one of {allowed}, got {v}")
        return v.lower()


class Puzzle(BaseModel):
    """A complete word ladder puzzle."""

    meta: PuzzleMeta
    ladder: List[LadderStep]

    @field_validator("ladder")
    @classmethod
    def validate_ladder_length(cls, v: List[LadderStep]) -> List[LadderStep]:
        """Ensure ladder has at least 5 steps."""
        if len(v) < 5:
            raise ValueError(f"Ladder must have at least 5 steps, got {len(v)}")
        return v


@dataclass(frozen=True)
class PuzzleFile:
    puzzle: Puzzle
    path: Path


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
        self._cache: Dict[str, List[PuzzleFile]] = {}  # Cache by difficulty
        self._puzzle_cache: Dict[str, Puzzle] = {}  # Cache by normalized puzzle path

    def _cache_key(self, puzzle_path: Path | str) -> str:
        if isinstance(puzzle_path, Path):
            return self.normalize_puzzle_path(puzzle_path)
        return self.normalize_puzzle_path(self.resolve_puzzle_path(puzzle_path))

    def cache_puzzle(self, puzzle_path: Path | str, puzzle: Puzzle) -> None:
        """Cache a puzzle using the normalized path as the key."""
        cache_key = self._cache_key(puzzle_path)
        self._puzzle_cache[cache_key] = puzzle

    def _load_puzzle_from_file(self, file_path: Path) -> Optional[PuzzleFile]:
        """
        Load a puzzle from a JSON file.

        Args:
            file_path: Path to the puzzle JSON file

        Returns:
            Puzzle object if valid, None if invalid or error
        """
        cache_key = self._cache_key(file_path)
        cached = self._puzzle_cache.get(cache_key)
        if cached:
            return PuzzleFile(puzzle=cached, path=file_path)
        try:
            with open(file_path, "r") as f:
                data = json.load(f)
                puzzle = Puzzle(**data)
                self.cache_puzzle(file_path, puzzle)
                return PuzzleFile(puzzle=puzzle, path=file_path)
        except Exception as e:
            # Log the error but don't fail - just skip this puzzle
            print(f"Warning: Failed to load puzzle from {file_path}: {e}")
            return None

    def load_puzzles_by_difficulty(self, difficulty: str) -> List[PuzzleFile]:
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

        puzzles: List[PuzzleFile] = []

        # Recursively find all JSON files
        for json_file in self.puzzle_dir.rglob("*.json"):
            puzzle = self._load_puzzle_from_file(json_file)
            if puzzle and puzzle.puzzle.meta.difficulty == difficulty:
                puzzles.append(puzzle)

        # Cache the results
        self._cache[difficulty] = puzzles

        return puzzles

    def _normalize_exclude_paths(self, exclude_paths: Optional[Iterable[str]]) -> Set[str]:
        if not exclude_paths:
            return set()
        normalized = set()
        for puzzle_path in exclude_paths:
            normalized.add(self.normalize_puzzle_path(self.resolve_puzzle_path(puzzle_path)))
        return normalized

    def _filter_unused_puzzles(
        self, puzzles: List[PuzzleFile], exclude_paths: Optional[Iterable[str]]
    ) -> List[PuzzleFile]:
        normalized_excludes = self._normalize_exclude_paths(exclude_paths)
        if not normalized_excludes:
            return puzzles
        return [puzzle for puzzle in puzzles if self.normalize_puzzle_path(puzzle.path) not in normalized_excludes]

    def get_random_puzzle(self, difficulty: str, exclude_paths: Optional[Iterable[str]] = None) -> Optional[PuzzleFile]:
        """
        Get a random puzzle of a given difficulty.

        Args:
            difficulty: Difficulty level ("easy", "medium", "hard")
            exclude_paths: Puzzle paths to exclude from selection

        Returns:
            Random puzzle of the specified difficulty, or None if no puzzles found
        """
        puzzles = self._filter_unused_puzzles(self.load_puzzles_by_difficulty(difficulty), exclude_paths)
        if not puzzles:
            return None
        return random.choice(puzzles)

    def get_same_puzzle_for_teams(
        self, num_teams: int, difficulty: str, exclude_paths: Optional[Iterable[str]] = None
    ) -> List[PuzzleFile]:
        """
        Get the same puzzle for all teams.

        Args:
            num_teams: Number of teams that will use this puzzle
            difficulty: Difficulty level for the puzzle
            exclude_paths: Puzzle paths to exclude from selection

        Returns:
            List of the same puzzle repeated num_teams times

        Raises:
            ValueError: If no puzzles available for the difficulty
        """
        puzzle_file = self.get_random_puzzle(difficulty, exclude_paths=exclude_paths)
        if not puzzle_file:
            raise ValueError(
                f"No unused {difficulty} puzzles are available yet. "
                "Add some puzzles for this difficulty or choose another one."
            )
        # Return the same puzzle for all teams
        return [puzzle_file] * num_teams

    def get_puzzles_for_teams(
        self,
        num_teams: int,
        difficulty: str,
        word_count_mode: str = "balanced",
        exclude_paths: Optional[Iterable[str]] = None,
    ) -> List[PuzzleFile]:
        """
        Get different puzzles for each team, all of the same difficulty.

        Args:
            num_teams: Number of teams that need puzzles
            difficulty: Difficulty level for all puzzles
            word_count_mode: "exact" for same word count, "balanced" for ±1 words
            exclude_paths: Puzzle paths to exclude from selection

        Returns:
            List of puzzles (length = num_teams)

        Raises:
            ValueError: If not enough puzzles available for the difficulty
        """
        puzzles = self._filter_unused_puzzles(self.load_puzzles_by_difficulty(difficulty), exclude_paths)

        if not puzzles:
            raise ValueError(
                f"No unused {difficulty} puzzles are available yet. "
                "Add some puzzles for this difficulty or choose another one."
            )

        if len(puzzles) < num_teams:
            raise ValueError(f"Not enough {difficulty} puzzles available. Need {num_teams}, found {len(puzzles)}")

        # Group puzzles by word count (ladder length)
        puzzles_by_length: Dict[int, List[PuzzleFile]] = {}
        for puzzle_file in puzzles:
            length = len(puzzle_file.puzzle.ladder)
            if length not in puzzles_by_length:
                puzzles_by_length[length] = []
            puzzles_by_length[length].append(puzzle_file)

        # Sort by length to prefer balanced puzzles
        sorted_lengths = sorted(puzzles_by_length.keys())

        if word_count_mode == "exact":
            # Find a word count that has enough puzzles for exact match
            for target_length in sorted_lengths:
                if len(puzzles_by_length[target_length]) >= num_teams:
                    return random.sample(puzzles_by_length[target_length], num_teams)

            # If no exact match available, raise error
            raise ValueError(
                f"Not enough {difficulty} puzzles with the same word count. "
                "Try 'balanced' mode or a different difficulty."
            )
        else:
            # Balanced mode: ±1 word (default)
            # Strategy: Pick one puzzle first, then find others within ±1 of its size

            # Pick the first puzzle randomly from all available
            first_puzzle = random.choice(puzzles)
            selected = [first_puzzle]

            # Get the target length from the first puzzle
            target_length = len(first_puzzle.puzzle.ladder)

            # Collect all other puzzles within ±1 words of the target
            candidates = []
            for length in range(target_length - 1, target_length + 2):
                if length in puzzles_by_length:
                    candidates.extend(puzzles_by_length[length])

            # Remove the first puzzle from candidates to avoid duplication
            candidates = [p for p in candidates if p != first_puzzle]

            # Check if we have enough puzzles in this range
            if len(candidates) >= num_teams - 1:
                # Randomly select the remaining puzzles from candidates
                selected.extend(random.sample(candidates, num_teams - 1))
                return selected

            # Fallback: if we don't have enough puzzles in the ±1 range,
            # just select randomly from all available (excluding the first)
            remaining = [p for p in puzzles if p != first_puzzle]
            if len(remaining) >= num_teams - 1:
                selected.extend(random.sample(remaining, num_teams - 1))
                return selected

            # Edge case: not enough total puzzles
            raise ValueError(f"Not enough {difficulty} puzzles available. Need {num_teams}, found {len(puzzles)}")

    def puzzle_to_dict(self, puzzle: Puzzle) -> Dict[str, Any]:
        """
        Convert a Puzzle object to a dictionary for JSON storage.

        Args:
            puzzle: Puzzle object to convert

        Returns:
            Dictionary representation suitable for JSON storage
        """
        return puzzle.model_dump()

    def normalize_puzzle_path(self, file_path: Path) -> str:
        """Store puzzle paths relative to puzzle_dir when possible."""
        try:
            return file_path.relative_to(self.puzzle_dir).as_posix()
        except ValueError:
            return file_path.as_posix()

    def resolve_puzzle_path(self, puzzle_path: str) -> Path:
        """Resolve a stored puzzle path to an absolute Path."""
        candidate = Path(puzzle_path)
        if candidate.is_absolute():
            return candidate
        return self.puzzle_dir / candidate

    def load_puzzle_by_path(self, puzzle_path: str) -> Puzzle:
        """Load a puzzle from a stored path string."""
        cache_key = self._cache_key(puzzle_path)
        cached = self._puzzle_cache.get(cache_key)
        if cached:
            return cached
        file_path = self.resolve_puzzle_path(puzzle_path)
        puzzle_file = self._load_puzzle_from_file(file_path)
        if not puzzle_file:
            raise ValueError(f"Failed to load puzzle from {file_path}")
        return puzzle_file.puzzle

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
