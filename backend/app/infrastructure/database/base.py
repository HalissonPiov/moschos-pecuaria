from datetime import datetime
from decimal import Decimal
from enum import StrEnum
from typing import Any, ClassVar

from sqlalchemy import DateTime, Enum, MetaData, Numeric, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.sql.naming import conv

# Nomes estáveis para as restrições, para que as migrations consigam removê-las (ADR 0005).
# Os CHECKs não usam convenção: recebem o nome exato do .dbml com conv().
NAMING_CONVENTION = {
    "ix": "ix_%(table_name)s_%(column_0_N_name)s",
    "uq": "uq_%(table_name)s_%(column_0_N_name)s",
    "fk": "fk_%(table_name)s_%(column_0_N_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}

Dinheiro = Numeric(12, 2)
"""Valores monetários: numeric(12,2) no banco e Decimal no Python."""


class Base(DeclarativeBase):
    """Base comum para os modelos SQLAlchemy."""

    metadata = MetaData(naming_convention=NAMING_CONVENTION)
    type_annotation_map: ClassVar[dict[Any, Any]] = {
        Decimal: Dinheiro,
        datetime: DateTime(timezone=True),
    }


def enum_varchar(enum_cls: type[StrEnum], check_name: str, length: int = 20) -> Enum:
    """Enumerado gravado como varchar com CHECK nomeado (ADR 0005).

    Grava o valor (``"em_producao"``), e não o nome do membro (``EM_PRODUCAO``).
    """
    return Enum(
        enum_cls,
        name=conv(check_name),
        native_enum=False,
        create_constraint=True,
        length=length,
        validate_strings=True,
        values_callable=lambda members: [member.value for member in members],
    )


def criado_em() -> Mapped[datetime]:
    return mapped_column(server_default=func.now())


def atualizado_em() -> Mapped[datetime]:
    return mapped_column(server_default=func.now(), onupdate=func.now())
