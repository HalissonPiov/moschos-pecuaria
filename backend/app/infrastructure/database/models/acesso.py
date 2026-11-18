"""Acesso: propriedade, usuário, vínculo, convite e recuperação de senha."""

from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    CHAR,
    CheckConstraint,
    ForeignKey,
    Index,
    Numeric,
    SmallInteger,
    String,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql.naming import conv

from app.domain.properties.enums import PapelPropriedade
from app.infrastructure.database.base import Base, criado_em, enum_varchar
from app.infrastructure.database.models._comum import pk_id


class Propriedade(Base):
    """Raiz do isolamento de dados (RNF05, RN31)."""

    __tablename__ = "propriedade"
    __table_args__ = (
        CheckConstraint(
            "rendimento_carcaca_pct > 0 AND rendimento_carcaca_pct <= 100",
            name=conv("ck_propriedade_rendimento"),
        ),
        CheckConstraint("dias_alerta_vencimento >= 0", name=conv("ck_propriedade_dias_alerta")),
    )

    id: Mapped[int] = pk_id()
    nome: Mapped[str] = mapped_column(String(120))
    municipio: Mapped[str | None] = mapped_column(String(80))
    uf: Mapped[str | None] = mapped_column(CHAR(2))
    area_hectares: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    titular_nome: Mapped[str] = mapped_column(String(200))
    cadastrada_por: Mapped[int] = mapped_column(ForeignKey("usuario.id"))
    rendimento_carcaca_pct: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), server_default=text("50")
    )
    praca_padrao: Mapped[str] = mapped_column(String(60), server_default="Minas Gerais")
    dias_alerta_vencimento: Mapped[int] = mapped_column(SmallInteger, server_default=text("7"))
    ativa: Mapped[bool] = mapped_column(server_default=text("true"))
    criado_em: Mapped[datetime] = criado_em()


class Usuario(Base):
    __tablename__ = "usuario"

    id: Mapped[int] = pk_id()
    nome: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(160), unique=True)
    senha_hash: Mapped[str] = mapped_column(String(255))
    ativo: Mapped[bool] = mapped_column(server_default=text("true"))
    criado_em: Mapped[datetime] = criado_em()


class UsuarioPropriedade(Base):
    """Vínculo N:N com o papel declarado (RF32, RN35)."""

    __tablename__ = "usuario_propriedade"
    __table_args__ = (Index(None, "propriedade_id"),)

    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuario.id"), primary_key=True)
    propriedade_id: Mapped[int] = mapped_column(ForeignKey("propriedade.id"), primary_key=True)
    papel: Mapped[PapelPropriedade] = mapped_column(
        enum_varchar(PapelPropriedade, "ck_usuario_propriedade_papel")
    )
    aceite_declaracao_em: Mapped[datetime]
    versao_termo: Mapped[str] = mapped_column(String(20))
    criado_em: Mapped[datetime] = criado_em()


class ConvitePropriedade(Base):
    """Convite por link de uso único, com validade (RF34, RF35, RN39)."""

    __tablename__ = "convite_propriedade"
    __table_args__ = (
        CheckConstraint("expira_em > criado_em", name=conv("ck_convite_validade")),
        CheckConstraint(
            "NOT (aceito_em IS NOT NULL AND revogado_em IS NOT NULL)",
            name=conv("ck_convite_estado"),
        ),
        CheckConstraint(
            "(aceito_em IS NULL) = (aceito_por IS NULL)", name=conv("ck_convite_aceite")
        ),
        Index(None, "propriedade_id"),
    )

    id: Mapped[int] = pk_id()
    propriedade_id: Mapped[int] = mapped_column(ForeignKey("propriedade.id"))
    papel: Mapped[PapelPropriedade] = mapped_column(
        enum_varchar(PapelPropriedade, "ck_convite_papel")
    )
    token_hash: Mapped[str] = mapped_column(String(255), unique=True)
    criado_por: Mapped[int] = mapped_column(ForeignKey("usuario.id"))
    criado_em: Mapped[datetime] = criado_em()
    expira_em: Mapped[datetime]
    aceito_em: Mapped[datetime | None]
    aceito_por: Mapped[int | None] = mapped_column(ForeignKey("usuario.id"))
    revogado_em: Mapped[datetime | None]


class RecuperacaoSenha(Base):
    """RF02. O token é buscado pelo hash."""

    __tablename__ = "recuperacao_senha"

    id: Mapped[int] = pk_id()
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuario.id"))
    token_hash: Mapped[str] = mapped_column(String(255), unique=True)
    expira_em: Mapped[datetime]
    usado_em: Mapped[datetime | None]
    criado_em: Mapped[datetime] = criado_em()
