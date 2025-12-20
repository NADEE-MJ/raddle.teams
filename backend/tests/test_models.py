"""Unit tests for database models."""

from datetime import datetime
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from backend.database.models import Player, Team, Lobby, Game, Guess


class TestPlayerModel:
    """Tests for Player model."""

    def test_player_creation(self):
        """Player can be created with required fields."""
        player = Player(name="TestPlayer", session_id="test-session-123", lobby_id=1)

        assert player.name == "TestPlayer"
        assert player.session_id == "test-session-123"
        assert player.lobby_id == 1
        assert player.team_id is None
        assert player.id is None  # Not saved yet

    def test_player_with_team(self):
        """Player can have a team_id."""
        player = Player(name="TestPlayer", session_id="test-session-456", lobby_id=1, team_id=5)

        assert player.team_id == 5

    def test_player_created_at_default(self):
        """Player should have created_at set by default."""
        player = Player(name="TestPlayer", session_id="test-session-789", lobby_id=1)

        assert player.created_at is not None
        assert isinstance(player.created_at, datetime)


class TestTeamModel:
    """Tests for Team model."""

    def test_team_creation(self):
        """Team can be created with required fields."""
        team = Team(name="Test Team", lobby_id=1)

        assert team.name == "Test Team"
        assert team.lobby_id == 1
        assert team.game_id is None
        assert team.current_word_index == 0

    def test_team_with_game(self):
        """Team can have a game_id."""
        team = Team(name="Test Team", lobby_id=1, game_id=10)

        assert team.game_id == 10

    def test_team_created_at_default(self):
        """Team should have created_at set by default."""
        team = Team(name="Test Team", lobby_id=1)

        assert team.created_at is not None
        assert isinstance(team.created_at, datetime)


class TestLobbyModel:
    """Tests for Lobby model."""

    def test_lobby_creation(self):
        """Lobby can be created with required fields."""
        lobby = Lobby(code="ABC123", name="Test Lobby")

        assert lobby.code == "ABC123"
        assert lobby.name == "Test Lobby"
        assert lobby.id is None  # Not saved yet

    def test_lobby_created_at_default(self):
        """Lobby should have created_at set by default."""
        lobby = Lobby(code="XYZ789", name="Test Lobby")

        assert lobby.created_at is not None
        assert isinstance(lobby.created_at, datetime)


class TestGameModel:
    """Tests for Game model."""

    def test_game_creation(self):
        """Game can be created with required fields."""
        game = Game(lobby_id=1, difficulty="medium", puzzle_path="easy/puzzle.json")

        assert game.lobby_id == 1
        assert game.difficulty == "medium"
        assert game.puzzle_path == "easy/puzzle.json"
        assert game.completed_at is None
        assert game.revealed_steps == "[]"

    def test_game_started_at_default(self):
        """Game should have started_at set by default."""
        game = Game(lobby_id=1, difficulty="easy", puzzle_path="easy/puzzle.json")

        assert game.started_at is not None
        assert isinstance(game.started_at, datetime)

    def test_game_difficulty_values(self):
        """Game can have different difficulty values."""
        for difficulty in ["easy", "medium", "hard"]:
            game = Game(lobby_id=1, difficulty=difficulty, puzzle_path="easy/puzzle.json")
            assert game.difficulty == difficulty


class TestGuessModel:
    """Tests for Guess model."""

    def test_guess_creation(self):
        """Guess can be created with required fields."""
        guess = Guess(team_id=1, player_id=2, word_index=3, direction="down", guess="TEST", is_correct=True)

        assert guess.team_id == 1
        assert guess.player_id == 2
        assert guess.word_index == 3
        assert guess.direction == "down"
        assert guess.guess == "TEST"
        assert guess.is_correct is True

    def test_guess_created_at_default(self):
        """Guess should have created_at set by default."""
        guess = Guess(team_id=1, player_id=2, word_index=0, direction="up", guess="WORD", is_correct=False)

        assert guess.created_at is not None
        assert isinstance(guess.created_at, datetime)
