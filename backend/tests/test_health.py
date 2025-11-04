from fastapi.testclient import TestClient
from app.main import app
from app.database import get_db


class DummyResult:
    def scalar(self):
        return 1


class DummySession:
    async def execute(self, *_args, **_kwargs):
        return DummyResult()


async def override_get_db():
    # Async generator dependency that yields a dummy session
    yield DummySession()


def test_health_ok(monkeypatch):
    # Override the DB dependency so the health endpoint doesn't hit a real DB
    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)

    resp = client.get("/api/v1/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok", "db": "connected"}

    # cleanup override
    app.dependency_overrides.pop(get_db, None)
