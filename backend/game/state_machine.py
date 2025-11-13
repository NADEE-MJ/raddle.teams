"""Simplified team-based state management for word puzzle gameplay.

This is a fully authoritative server model - the server is the single source of truth.
Clients send guesses and receive state updates; they don't maintain game logic themselves.
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Dict, Optional, Set

from backend.game.puzzles import Puzzle


@dataclass
class TeamState:
    """Simplified state for a team's game progress.

    The server only tracks which words have been revealed and if the puzzle is complete.
    Direction, current question/answer, etc. are calculated client-side.
    """

    revealed_steps: Set[int]  # Indices of revealed words in the ladder
    is_completed: bool
    last_updated_at: datetime = field(default_factory=lambda: datetime.now(tz=timezone.utc))

    def to_dict(self) -> Dict:
        """Convert state to dictionary for serialization."""
        return {
            "revealed_steps": sorted(list(self.revealed_steps)),
            "is_completed": self.is_completed,
            "last_updated_at": self.last_updated_at.isoformat(),
        }

    @classmethod
    def from_dict(cls, data: Dict) -> "TeamState":
        """Create state from dictionary."""
        return cls(
            revealed_steps=set(data["revealed_steps"]),
            is_completed=data["is_completed"],
            last_updated_at=datetime.fromisoformat(data["last_updated_at"]),
        )


@dataclass
class GuessResult:
    """Result of a guess submission."""

    is_correct: bool
    already_solved: bool = False  # Word was already revealed
    word_index: int = -1
    expected_word: Optional[str] = None
    new_state: Optional[TeamState] = None


class TeamStateMachine:
    """
    Simplified authoritative state machine for team gameplay.

    The server:
    1. Receives guess with target word_index
    2. Checks if word_index is already revealed (early return)
    3. Checks if guess matches the word at that index
    4. If correct: reveals word, broadcasts update to team
    5. If wrong: just tells that player it's wrong

    No optimistic locking, no direction tracking, no phase management.
    """

    def __init__(self, puzzle: Puzzle, initial_state: Optional[TeamState] = None):
        """
        Initialize the state machine.

        Args:
            puzzle: The puzzle for this team
            initial_state: Optional initial state (for restoring from database)
        """
        self.puzzle = puzzle
        self.state = initial_state or self._get_initial_state()

    def _get_initial_state(self) -> TeamState:
        """Get the initial state for a new game."""
        if len(self.puzzle.ladder) < 5:
            raise ValueError("Puzzle must have at least 5 steps in the ladder")

        # Initially reveal first and last words
        revealed_steps = {0, len(self.puzzle.ladder) - 1}

        return TeamState(
            revealed_steps=revealed_steps,
            is_completed=False,
        )

    def get_current_state(self) -> TeamState:
        """Get the current state."""
        return TeamState(
            revealed_steps=set(self.state.revealed_steps),
            is_completed=self.state.is_completed,
            last_updated_at=self.state.last_updated_at,
        )

    def submit_guess(self, guess: str, word_index: int) -> GuessResult:
        """
        Submit a guess for a specific word index.

        Args:
            guess: The guessed word (already uppercased)
            word_index: Index in the ladder being guessed

        Returns:
            GuessResult with outcome
        """
        # Check if word is already revealed
        if word_index in self.state.revealed_steps:
            return GuessResult(
                is_correct=False,
                already_solved=True,
                word_index=word_index,
            )

        # Get expected word
        if word_index < 0 or word_index >= len(self.puzzle.ladder):
            return GuessResult(
                is_correct=False,
                word_index=word_index,
                expected_word=None,
            )

        expected_word = self.puzzle.ladder[word_index].word.upper()

        # Check if guess is correct
        is_correct = guess.upper() == expected_word

        if not is_correct:
            return GuessResult(
                is_correct=False,
                word_index=word_index,
                expected_word=expected_word,
            )

        # Correct guess - reveal the word
        self.state.revealed_steps.add(word_index)
        self.state.last_updated_at = datetime.now(tz=timezone.utc)

        # Check if puzzle is completed (all words revealed)
        if len(self.state.revealed_steps) >= len(self.puzzle.ladder):
            self.state.is_completed = True

        return GuessResult(
            is_correct=True,
            word_index=word_index,
            expected_word=expected_word,
            new_state=self.get_current_state(),
        )

    def is_completed(self) -> bool:
        """Check if the puzzle is completed."""
        return self.state.is_completed
