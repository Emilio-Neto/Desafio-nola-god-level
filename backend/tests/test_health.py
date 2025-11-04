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
    # Dependência geradora assíncrona que fornece uma sessão dummy
    yield DummySession()


def test_health_ok(monkeypatch):
    # Sobrescreve a dependência do DB para que o endpoint de health não acesse um DB real
    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)

    resp = client.get("/api/v1/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok", "db": "connected"}

    # limpeza da sobrescrita
    app.dependency_overrides.pop(get_db, None)
