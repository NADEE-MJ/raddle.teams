"""Test database models."""

from backend.database.models import Player, Room, PersonInPool, Score


def test_create_room(session):
    """Test creating a room."""
    room = Room(code="ABC123", name="Test Room", status="lobby", current_round=0)
    session.add(room)
    session.commit()

    assert room.id is not None
    assert room.code == "ABC123"
    assert room.status == "lobby"


def test_create_player(session):
    """Test creating a player."""
    room = Room(code="ABC123", name="Test Room", status="lobby", current_round=0)
    session.add(room)
    session.commit()

    player = Player(name="Alice", session_id="test-session", room_id=room.id, is_host=True)
    session.add(player)
    session.commit()

    assert player.id is not None
    assert player.name == "Alice"
    assert player.is_host is True


def test_person_in_pool(session):
    """Test creating a person in pool."""
    room = Room(code="ABC123", name="Test Room", status="lobby", current_round=0)
    session.add(room)
    session.commit()

    person = PersonInPool(room_id=room.id, name="Bob", is_player=False)
    session.add(person)
    session.commit()

    assert person.id is not None
    assert person.name == "Bob"
    assert person.is_player is False


def test_score(session):
    """Test creating a score."""
    room = Room(code="ABC123", name="Test Room", status="lobby", current_round=0)
    session.add(room)
    session.commit()

    player = Player(name="Alice", session_id="test-session", room_id=room.id, is_host=False)
    session.add(player)
    session.commit()

    score = Score(player_id=player.id, room_id=room.id, total_score=120)
    session.add(score)
    session.commit()

    assert score.id is not None
    assert score.total_score == 120
