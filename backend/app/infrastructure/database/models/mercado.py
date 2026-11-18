"""Referência de mercado: cotações manuais."""

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, ForeignKey, Index, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql.naming import conv

from app.infrastructure.database.base import Base, criado_em
from app.infrastructure.database.models._comum import pk_id


class Cotacao(Base):
    """RF25, RN26. Cotação registrada manualmente."""

    __tablename__ = "cotacao"
    __table_args__ = (
        UniqueConstraint(
            "propriedade_id",
            "data_cotacao",
            "praca",
            "fonte",
            name=conv("uq_cotacao_data_praca_fonte"),
        ),
        Index(None, "propriedade_id", "praca", "data_cotacao"),
        CheckConstraint("valor_arroba > 0", name=conv("ck_cotacao_valor_arroba")),
    )

    id: Mapped[int] = pk_id()
    propriedade_id: Mapped[int] = mapped_column(ForeignKey("propriedade.id"))
    data_cotacao: Mapped[date]
    praca: Mapped[str] = mapped_column(String(60))
    valor_arroba: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    fonte: Mapped[str] = mapped_column(String(80))
    criado_em: Mapped[datetime] = criado_em()
