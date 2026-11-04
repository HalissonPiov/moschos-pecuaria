from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError

from app.infrastructure.database.session import get_db
from app.main import app


class FakeSession:
    def __init__(self, error: Exception | None = None) -> None:
        self.error = error

    def execute(self, _statement: object) -> None:
        if self.error:
            raise self.error


@pytest.fixture
def client() -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_health_check(client: TestClient) -> None:
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_database_health_check(client: TestClient) -> None:
    app.dependency_overrides[get_db] = lambda: FakeSession()

    response = client.get("/api/v1/health/db")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_database_health_check_when_database_is_down(client: TestClient) -> None:
    error = OperationalError("SELECT 1", {}, Exception("connection refused"))
    app.dependency_overrides[get_db] = lambda: FakeSession(error)

    response = client.get("/api/v1/health/db")

    assert response.status_code == 503
    assert response.json() == {"detail": "Banco de dados indisponível."}
