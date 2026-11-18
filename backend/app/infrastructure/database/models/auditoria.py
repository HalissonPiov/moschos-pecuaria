"""Auditoria: correções justificadas."""

from datetime import datetime
from typing import Any

from sqlalchemy import ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.database.base import Base, criado_em
from app.infrastructure.database.models._comum import pk_id


class CorrecaoJustificada(Base):
    """RN05. Correções feitas após a venda total do registro."""

    __tablename__ = "correcao_justificada"
    __table_args__ = (Index(None, "entidade", "entidade_id"),)

    id: Mapped[int] = pk_id()
    propriedade_id: Mapped[int] = mapped_column(ForeignKey("propriedade.id"))
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuario.id"))
    entidade: Mapped[str] = mapped_column(String(40))
    entidade_id: Mapped[int]
    justificativa: Mapped[str] = mapped_column(Text)
    dados_anteriores: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    criado_em: Mapped[datetime] = criado_em()
