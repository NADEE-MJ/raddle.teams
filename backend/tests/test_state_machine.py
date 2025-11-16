"""Unit tests for the TeamStateMachine."""

import pytest
from datetime import datetime, timezone
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from backend.game.state_machine import TeamStateMachine, TeamState, GuessResult
from backend.game.puzzles import Puzzle, LadderStep, PuzzleMeta


@pytest.fixture
def sample_puzzle():
    """Create a sample puzzle for testing."""
    return Puzzle(
        meta=PuzzleMeta(
            title="Test Puzzle",
            difficulty="easy",
            author="Test Author",
        ),
        ladder=[
            LadderStep(word="START", clue="Beginning word", transform=""),
            LadderStep(word="STARE", clue="Look at", transform="T->E"),
            LadderStep(word="SHARE", clue="Give to others", transform="T->H"),
            LadderStep(word="SHORE", clue="Beach", transform="A->O"),
            LadderStep(word="SCORE", clue="Points", transform="H->C"),
            LadderStep(word="SCARE", clue="Frighten", transform="O->A"),
            LadderStep(word="SCALE", clue="Fish covering", transform="R->L"),
            LadderStep(word="FINAL", clue="Last word", transform=""),
        ],
    )


@pytest.fixture
def state_machine(sample_puzzle):
    """Create a state machine with sample puzzle."""
    return TeamStateMachine(sample_puzzle)


class TestTeamStateInitialization:
    """Tests for state machine initialization."""

    def test_initial_state_reveals_first_and_last(self, state_machine):
        """Initial state should reveal first (0) and last (7) words."""
        assert 0 in state_machine.state.revealed_steps
        assert 7 in state_machine.state.revealed_steps
        assert len(state_machine.state.revealed_steps) == 2

    def test_initial_state_not_completed(self, state_machine):
        """Initial state should not be completed."""
        assert not state_machine.state.is_completed
        assert not state_machine.is_completed()

    def test_puzzle_must_have_minimum_length(self):
        """Puzzle must have at least 5 steps."""
        # Puzzle validation will reject short ladders
        with pytest.raises(ValueError, match="at least 5 steps"):
            Puzzle(
                meta=PuzzleMeta(title="Too Short", difficulty="easy"),
                ladder=[
                    LadderStep(word="ONE", clue="1", transform=""),
                    LadderStep(word="TWO", clue="2", transform=""),
                    LadderStep(word="THREE", clue="3", transform=""),
                ],
            )


class TestGuessSubmission:
    """Tests for guess submission functionality."""

    def test_correct_guess_reveals_word(self, state_machine):
        """Correct guess should reveal the word."""
        result = state_machine.submit_guess("STARE", 1)

        assert result.is_correct
        assert not result.already_solved
        assert result.word_index == 1
        assert result.expected_word == "STARE"
        assert 1 in state_machine.state.revealed_steps

    def test_incorrect_guess_does_not_reveal(self, state_machine):
        """Incorrect guess should not reveal the word."""
        result = state_machine.submit_guess("WRONG", 1)

        assert not result.is_correct
        assert not result.already_solved
        assert result.word_index == 1
        assert result.expected_word == "STARE"
        assert 1 not in state_machine.state.revealed_steps

    def test_guess_already_revealed_word(self, state_machine):
        """Guessing an already revealed word should return already_solved."""
        # First reveal word 1
        state_machine.submit_guess("STARE", 1)

        # Try to guess it again
        result = state_machine.submit_guess("STARE", 1)

        assert not result.is_correct
        assert result.already_solved
        assert result.word_index == 1

    def test_guess_is_case_insensitive(self, state_machine):
        """Guesses should work regardless of case."""
        result_lower = state_machine.submit_guess("stare", 1)
        assert result_lower.is_correct

        result_mixed = state_machine.submit_guess("ShArE", 2)
        assert result_mixed.is_correct

    def test_out_of_bounds_guess_index(self, state_machine):
        """Guessing an out-of-bounds index should fail gracefully."""
        result_negative = state_machine.submit_guess("ANYTHING", -1)
        assert not result_negative.is_correct
        assert result_negative.expected_word is None

        result_too_high = state_machine.submit_guess("ANYTHING", 100)
        assert not result_too_high.is_correct
        assert result_too_high.expected_word is None

    def test_correct_guess_updates_timestamp(self, state_machine):
        """Correct guess should update last_updated_at."""
        original_time = state_machine.state.last_updated_at
        result = state_machine.submit_guess("STARE", 1)

        assert result.is_correct
        assert state_machine.state.last_updated_at > original_time


class TestPuzzleCompletion:
    """Tests for puzzle completion detection."""

    def test_all_words_revealed_marks_completed(self, state_machine):
        """Revealing all words should mark puzzle as completed."""
        # Reveal all middle words (0 and 7 are already revealed)
        for i in range(1, 7):
            word = state_machine.puzzle.ladder[i].word
            result = state_machine.submit_guess(word, i)
            assert result.is_correct

        # Check completion
        assert state_machine.is_completed()
        assert state_machine.state.is_completed

    def test_not_completed_until_all_revealed(self, state_machine):
        """Puzzle should not be completed until all words are revealed."""
        # Reveal all but one word
        for i in range(1, 6):
            word = state_machine.puzzle.ladder[i].word
            state_machine.submit_guess(word, i)

        # Should not be completed yet (missing word 6)
        assert not state_machine.is_completed()

        # Reveal last word
        state_machine.submit_guess("SCALE", 6)

        # Now should be completed
        assert state_machine.is_completed()


class TestStateManagement:
    """Tests for state management and serialization."""

    def test_get_current_state_returns_copy(self, state_machine):
        """get_current_state should return a copy of the state."""
        state1 = state_machine.get_current_state()
        state2 = state_machine.get_current_state()

        # Should be equal but not the same object
        assert state1.revealed_steps == state2.revealed_steps
        assert state1 is not state2
        assert state1.revealed_steps is not state2.revealed_steps

    def test_state_to_dict_serialization(self, state_machine):
        """State should serialize to dictionary correctly."""
        state_dict = state_machine.state.to_dict()

        assert "revealed_steps" in state_dict
        assert "is_completed" in state_dict
        assert "last_updated_at" in state_dict
        assert isinstance(state_dict["revealed_steps"], list)
        assert sorted(state_dict["revealed_steps"]) == state_dict["revealed_steps"]  # Should be sorted

    def test_state_from_dict_deserialization(self):
        """State should deserialize from dictionary correctly."""
        state_dict = {
            "revealed_steps": [0, 2, 4],
            "is_completed": False,
            "last_updated_at": datetime.now(tz=timezone.utc).isoformat(),
        }

        state = TeamState.from_dict(state_dict)

        assert state.revealed_steps == {0, 2, 4}
        assert not state.is_completed
        assert isinstance(state.last_updated_at, datetime)

    def test_state_roundtrip_serialization(self, state_machine):
        """State should survive roundtrip serialization."""
        original_state = state_machine.get_current_state()
        state_dict = original_state.to_dict()
        restored_state = TeamState.from_dict(state_dict)

        assert original_state.revealed_steps == restored_state.revealed_steps
        assert original_state.is_completed == restored_state.is_completed

    def test_restore_state_from_initial(self, sample_puzzle):
        """Should be able to restore state from saved state."""
        # Create initial machine
        machine1 = TeamStateMachine(sample_puzzle)
        machine1.submit_guess("STARE", 1)
        machine1.submit_guess("SHARE", 2)

        # Save state
        saved_state = machine1.get_current_state()

        # Create new machine with saved state
        machine2 = TeamStateMachine(sample_puzzle, saved_state)

        # Should have same revealed steps
        assert machine2.state.revealed_steps == saved_state.revealed_steps
        assert 1 in machine2.state.revealed_steps
        assert 2 in machine2.state.revealed_steps


class TestGuessResult:
    """Tests for GuessResult dataclass."""

    def test_guess_result_correct(self, state_machine):
        """Correct guess should have proper result."""
        result = state_machine.submit_guess("STARE", 1)

        assert result.is_correct
        assert not result.already_solved
        assert result.word_index == 1
        assert result.expected_word == "STARE"
        assert result.new_state is not None

    def test_guess_result_incorrect(self, state_machine):
        """Incorrect guess should have proper result."""
        result = state_machine.submit_guess("WRONG", 1)

        assert not result.is_correct
        assert not result.already_solved
        assert result.word_index == 1
        assert result.expected_word == "STARE"
        assert result.new_state is None

    def test_guess_result_already_solved(self, state_machine):
        """Already solved word should have proper result."""
        state_machine.submit_guess("STARE", 1)
        result = state_machine.submit_guess("STARE", 1)

        assert not result.is_correct
        assert result.already_solved
        assert result.word_index == 1
