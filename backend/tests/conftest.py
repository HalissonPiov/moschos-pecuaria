"""Fixtures de banco para os testes de integração.

Os testes marcados com ``db`` usam um PostgreSQL real, em um banco separado. O endereço
vem de TEST_DATABASE_URL; sem ela, é o mesmo servidor e as mesmas credenciais de
DATABASE_URL (backend/.env), com o banco ``moschos_test``. O banco é recriado pela
migration Alembic no início da sessão de testes.

Só pulam localmente quando o servidor está fora do ar. Credenciais erradas fazem os testes
falharem, para que não sejam pulados em silêncio. No CI eles nunca pulam.
"""

import os
from collections.abc import Iterator
from pathlib import Path

import pytest
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import Engine, create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from alembic import command
from app.core.config import get_settings

BACKEND_DIR = Path(__file__).resolve().parent.parent
TEST_DATABASE_NAME = "moschos_test"
TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL") or (
    make_url(get_settings().database_url)
    .set(database=TEST_DATABASE_NAME)
    .render_as_string(hide_password=False)
)

# Sinais de servidor fora do ar. Qualquer outro erro de conexão (senha, usuário) falha.
SERVIDOR_FORA_DO_AR = ("connection refused", "could not connect", "timeout expired")


def _criar_banco_se_preciso(url: str) -> None:
    alvo = make_url(url)
    admin = create_engine(alvo.set(database="postgres"), isolation_level="AUTOCOMMIT")
    try:
        with admin.connect() as conexao:
            existe = conexao.scalar(
                text("SELECT 1 FROM pg_database WHERE datname = :nome"), {"nome": alvo.database}
            )
            if not existe:
                conexao.execute(text(f'CREATE DATABASE "{alvo.database}"'))
    finally:
        admin.dispose()


@pytest.fixture(scope="session")
def engine() -> Iterator[Engine]:
    try:
        _criar_banco_se_preciso(TEST_DATABASE_URL)
    except OperationalError as erro:
        fora_do_ar = any(sinal in str(erro.orig).lower() for sinal in SERVIDOR_FORA_DO_AR)
        if os.environ.get("CI") or not fora_do_ar:
            raise
        pytest.skip(f"PostgreSQL de teste fora do ar: {erro.orig}")

    engine = create_engine(TEST_DATABASE_URL)
    with engine.begin() as conexao:
        conexao.execute(text("DROP SCHEMA public CASCADE; CREATE SCHEMA public;"))

    config = Config(str(BACKEND_DIR / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    config.set_main_option("sqlalchemy.url", TEST_DATABASE_URL.replace("%", "%%"))
    command.upgrade(config, "head")

    yield engine
    engine.dispose()


@pytest.fixture
def session(engine: Engine) -> Iterator[Session]:
    """Sessão dentro de uma transação desfeita ao fim de cada teste."""
    with engine.connect() as conexao:
        transacao = conexao.begin()
        sessao = Session(bind=conexao, join_transaction_mode="create_savepoint")
        try:
            yield sessao
        finally:
            sessao.close()
            transacao.rollback()


@pytest.fixture
def api(session: Session) -> Iterator[TestClient]:
    """Cliente HTTP da API usando a sessão de teste (tudo é desfeito ao fim do teste)."""
    from app.infrastructure.database.session import get_db
    from app.main import app

    app.dependency_overrides[get_db] = lambda: session
    try:
        with TestClient(app) as cliente:
            yield cliente
    finally:
        app.dependency_overrides.pop(get_db, None)
