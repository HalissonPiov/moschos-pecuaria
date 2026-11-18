"""O banco criado pela migration corresponde ao modelo de db/ e aos modelos SQLAlchemy."""

import re
from pathlib import Path

import pytest
from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from sqlalchemy import CheckConstraint, Engine, text

from app.infrastructure.database import models  # noqa: F401  (registra as tabelas)
from app.infrastructure.database.base import Base

pytestmark = pytest.mark.db

DBML = Path(__file__).resolve().parents[2] / "db" / "modelo-relacional-logico.dbml"


def _contar(engine: Engine, sql: str) -> int:
    with engine.connect() as conexao:
        return conexao.scalar(text(sql))


def test_tabelas_do_modelo(engine: Engine) -> None:
    tabelas_dbml = set(re.findall(r"^Table (\w+) \{", DBML.read_text(), re.MULTILINE))
    with engine.connect() as conexao:
        tabelas_banco = set(
            conexao.scalars(
                text(
                    "SELECT table_name FROM information_schema.tables "
                    "WHERE table_schema = 'public' AND table_name <> 'alembic_version'"
                )
            )
        )

    assert len(tabelas_banco) == 20
    assert tabelas_banco == tabelas_dbml


def test_chaves_estrangeiras(engine: Engine) -> None:
    sql = "SELECT count(*) FROM pg_constraint WHERE contype = 'f' AND connamespace = 'public'::regnamespace"
    assert _contar(engine, sql) == 39


def test_checks_tem_os_nomes_do_dbml(engine: Engine) -> None:
    """ADR 0005: cada CHECK do banco tem o nome declarado no .dbml."""
    checks_dbml = set(re.findall(r"name: '(ck_\w+)'", DBML.read_text()))
    with engine.connect() as conexao:
        checks_banco = set(
            conexao.scalars(
                text(
                    "SELECT conname FROM pg_constraint "
                    "WHERE contype = 'c' AND connamespace = 'public'::regnamespace"
                )
            )
        )

    assert len(checks_banco) == 40
    assert checks_banco == checks_dbml


def test_nao_ha_enum_nativo(engine: Engine) -> None:
    sql = (
        "SELECT count(*) FROM pg_type WHERE typtype = 'e' AND typnamespace = 'public'::regnamespace"
    )
    assert _contar(engine, sql) == 0


def test_modelos_e_migration_nao_divergem(engine: Engine) -> None:
    """Se um modelo mudar sem migration nova, este teste falha (equivale a `alembic check`)."""
    with engine.connect() as conexao:
        contexto = MigrationContext.configure(conexao)
        diferencas = compare_metadata(contexto, Base.metadata)

    assert diferencas == []


def test_checks_dos_modelos_tem_os_nomes_do_dbml() -> None:
    """O Alembic não compara CHECKs; este teste cobre a divergência entre modelos e .dbml."""
    checks_dbml = set(re.findall(r"name: '(ck_\w+)'", DBML.read_text()))
    checks_modelos = {
        restricao.name
        for tabela in Base.metadata.tables.values()
        for restricao in tabela.constraints
        if isinstance(restricao, CheckConstraint)
    }

    assert checks_modelos == checks_dbml
