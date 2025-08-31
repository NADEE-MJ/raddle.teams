import pytest


def test_load_tutorial_puzzle_file_skip_if_missing_service():
    pytest.importorskip('backend.services.puzzle_service')
    from backend.services.puzzle_service import PuzzleService

    svc = PuzzleService()
    data = svc.load_puzzle_from_file('tutorial')
    assert data is not None
    # Accept either ladder (new format) or words (older format)
    assert 'ladder' in data or 'words' in data
    items = data.get('ladder') or data.get('words')
    assert len(items) >= 2
    assert items[0].get('word')
