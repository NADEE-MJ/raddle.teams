"""Unit tests for the name generator utility."""

import pytest
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from backend.utils.name_generator import (
    generate_team_name,
    generate_lobby_name,
    generate_multiple_team_names,
    TEAM_ADJECTIVES,
    TEAM_NOUNS,
    LOBBY_ADJECTIVES,
    LOBBY_NOUNS,
)


class TestTeamNameGeneration:
    """Tests for team name generation."""

    def test_generate_team_name_format(self):
        """Team name should be in 'Adjective Noun' format."""
        name = generate_team_name()
        parts = name.split()
        
        assert len(parts) == 2
        assert parts[0] in TEAM_ADJECTIVES
        assert parts[1] in TEAM_NOUNS

    def test_generate_team_name_multiple_calls(self):
        """Generating multiple team names should work."""
        names = [generate_team_name() for _ in range(10)]
        
        assert len(names) == 10
        for name in names:
            parts = name.split()
            assert len(parts) == 2

    def test_generate_multiple_team_names_unique(self):
        """Should generate unique team names."""
        count = 5
        names = generate_multiple_team_names(count)
        
        assert len(names) == count
        assert len(set(names)) == count  # All unique

    def test_generate_multiple_team_names_valid_format(self):
        """Generated team names should all have valid format."""
        names = generate_multiple_team_names(5)
        
        for name in names:
            parts = name.split()
            assert len(parts) == 2
            assert parts[0] in TEAM_ADJECTIVES
            assert parts[1] in TEAM_NOUNS

    def test_generate_multiple_team_names_max_limit(self):
        """Should raise error when requesting more than possible combinations."""
        max_combinations = len(TEAM_ADJECTIVES) * len(TEAM_NOUNS)
        
        with pytest.raises(ValueError, match="Cannot generate"):
            generate_multiple_team_names(max_combinations + 1)

    def test_generate_multiple_team_names_at_limit(self):
        """Should handle generating up to maximum combinations."""
        # Test with a reasonable subset
        count = min(100, len(TEAM_ADJECTIVES) * len(TEAM_NOUNS))
        names = generate_multiple_team_names(count)
        
        assert len(names) == count
        assert len(set(names)) == count


class TestLobbyNameGeneration:
    """Tests for lobby name generation."""

    def test_generate_lobby_name_format(self):
        """Lobby name should be in 'Adjective Noun' format."""
        name = generate_lobby_name()
        parts = name.split()
        
        assert len(parts) == 2
        assert parts[0] in LOBBY_ADJECTIVES
        assert parts[1] in LOBBY_NOUNS

    def test_generate_lobby_name_multiple_calls(self):
        """Generating multiple lobby names should work."""
        names = [generate_lobby_name() for _ in range(10)]
        
        assert len(names) == 10
        for name in names:
            parts = name.split()
            assert len(parts) == 2

    def test_lobby_adjectives_not_empty(self):
        """Lobby adjectives list should not be empty."""
        assert len(LOBBY_ADJECTIVES) > 0

    def test_lobby_nouns_not_empty(self):
        """Lobby nouns list should not be empty."""
        assert len(LOBBY_NOUNS) > 0

    def test_team_adjectives_not_empty(self):
        """Team adjectives list should not be empty."""
        assert len(TEAM_ADJECTIVES) > 0

    def test_team_nouns_not_empty(self):
        """Team nouns list should not be empty."""
        assert len(TEAM_NOUNS) > 0
