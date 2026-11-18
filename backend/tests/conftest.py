"""Fixtures de banco para os testes de integração.

Os testes marcados com ``db`` usam um PostgreSQL real, em um banco separado
(TEST_DATABASE_URL, padrão ``moschos_test`` no Postgres do docker compose). O banco é
recriado pela migration Alembic no início da sessão de testes. Sem Postgres disponível,
esses testes são pulados localmente e falham no CI.
"""

import os
from collections.abc import Iterator
from pathlib import Path

import pytest
from alembic.config import Config
from sqlalchemy import Engine, create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from alembic import command

BACKEND_DIR = Path(__file__).resolve().parent.parent
TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL", "postgresql+psycopg://moschos:moschos@localhost:5432/moschos_test"
)


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
        if os.environ.get("CI"):
            raise
        pytest.skip(f"PostgreSQL de teste indisponível: {erro.orig}")

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
