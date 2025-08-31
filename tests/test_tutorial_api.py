import pytest


def test_get_tutorial_endpoint_skip_if_no_fastapi():
    # Skip this test if FastAPI (and TestClient) are not available in the environment
    pytest.importorskip('fastapi')
    from fastapi.testclient import TestClient
    from backend.main import app

    client = TestClient(app)
    resp = client.get('/api/tutorial')
    assert resp.status_code == 200
    data = resp.json()
    # basic shape
    assert 'ladder' in data or 'words' in data
    # ensure at least two entries
    ladder = data.get('ladder') or data.get('words')
    assert len(ladder) >= 2
    assert isinstance(ladder[0].get('word'), str) or isinstance(ladder[0].get('word'), str)
