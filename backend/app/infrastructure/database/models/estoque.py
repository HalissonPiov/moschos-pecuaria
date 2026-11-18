"""Estoque: registro, pasto, animal, movimentação e pesagem."""

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    CheckConstraint,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Numeric,
    String,
    UniqueConstraint,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql.naming import conv

from app.domain.herd.enums import (
    ModoRegistro,
    OrigemRegistro,
    Sexo,
    SituacaoProducao,
    TipoMovimentacao,
)
from app.infrastructure.database.base import Base, atualizado_em, criado_em, enum_varchar
from app.infrastructure.database.models._comum import pk_id


class RegistroEstoque(Base):
    """Agrupamento de animais que carrega custos, vendas e a decisão de produção (RF03 a RF05)."""

    __tablename__ = "registro_estoque"
    __table_args__ = (
        UniqueConstraint("propriedade_id", "identificacao"),
        # Sustenta a chave estrangeira composta do animal (A4).
        UniqueConstraint("id", "propriedade_id", name=conv("uq_registro_estoque_id_propriedade")),
        Index(None, "propriedade_id", "situacao_producao"),
        CheckConstraint("custo_aquisicao >= 0", name=conv("ck_registro_custo_aquisicao")),
    )

    id: Mapped[int] = pk_id()
    propriedade_id: Mapped[int] = mapped_column(ForeignKey("propriedade.id"))
    identificacao: Mapped[str] = mapped_column(String(80))
    modo_registro: Mapped[ModoRegistro] = mapped_column(
        enum_varchar(ModoRegistro, "ck_registro_modo")
    )
    data_formacao: Mapped[date]
    origem: Mapped[OrigemRegistro] = mapped_column(
        enum_varchar(OrigemRegistro, "ck_registro_origem")
    )
    custo_aquisicao: Mapped[Decimal] = mapped_column(server_default=text("0"))
    situacao_producao: Mapped[SituacaoProducao] = mapped_column(
        enum_varchar(SituacaoProducao, "ck_registro_situacao_producao"),
        server_default=SituacaoProducao.EM_PRODUCAO.value,
    )
    ativo: Mapped[bool] = mapped_column(server_default=text("true"))
    criado_em: Mapped[datetime] = criado_em()
    atualizado_em: Mapped[datetime] = atualizado_em()


class Pasto(Base):
    """RF06."""

    __tablename__ = "pasto"
    __table_args__ = (UniqueConstraint("propriedade_id", "nome"),)

    id: Mapped[int] = pk_id()
    propriedade_id: Mapped[int] = mapped_column(ForeignKey("propriedade.id"))
    nome: Mapped[str] = mapped_column(String(80))
    area_hectares: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    ativo: Mapped[bool] = mapped_column(server_default=text("true"))


class Animal(Base):
    """Uma linha por cabeça (RF03, RN01, RN06). O saldo é derivado destas linhas."""

    __tablename__ = "animal"
    __table_args__ = (
        # O animal só aponta para um registro da mesma propriedade (A4).
        ForeignKeyConstraint(
            ["registro_estoque_id", "propriedade_id"],
            ["registro_estoque.id", "registro_estoque.propriedade_id"],
        ),
        Index(None, "registro_estoque_id"),
        UniqueConstraint("propriedade_id", "brinco"),
        Index(None, "pasto_id"),
        Index(None, "venda_id"),
        CheckConstraint("peso_inicial_kg > 0", name=conv("ck_animal_peso_inicial")),
        CheckConstraint(
            "venda_id IS NULL OR movimentacao_baixa_id IS NULL",
            name=conv("ck_animal_saida_unica"),
        ),
    )

    id: Mapped[int] = pk_id()
    registro_estoque_id: Mapped[int]
    propriedade_id: Mapped[int]
    nome: Mapped[str | None] = mapped_column(String(80))
    brinco: Mapped[str | None] = mapped_column(String(40))
    sexo: Mapped[Sexo | None] = mapped_column(enum_varchar(Sexo, "ck_animal_sexo", length=10))
    raca: Mapped[str | None] = mapped_column(String(60))
    cor: Mapped[str | None] = mapped_column(String(40))
    data_nascimento: Mapped[date | None]
    nascimento_estimado: Mapped[bool] = mapped_column(server_default=text("false"))
    peso_inicial_kg: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    pasto_id: Mapped[int | None] = mapped_column(ForeignKey("pasto.id"))
    observacao: Mapped[str | None] = mapped_column(String(200))
    movimentacao_entrada_id: Mapped[int | None] = mapped_column(
        ForeignKey("movimentacao_estoque.id")
    )
    venda_id: Mapped[int | None] = mapped_column(ForeignKey("venda.id"))
    movimentacao_baixa_id: Mapped[int | None] = mapped_column(ForeignKey("movimentacao_estoque.id"))
    criado_em: Mapped[datetime] = criado_em()
    atualizado_em: Mapped[datetime] = atualizado_em()


class MovimentacaoEstoque(Base):
    """Entrada ou baixa: altera o saldo sem gerar receita (RF07)."""

    __tablename__ = "movimentacao_estoque"
    __table_args__ = (
        Index(None, "registro_estoque_id", "data_movimentacao"),
        CheckConstraint("quantidade > 0", name=conv("ck_movimentacao_quantidade")),
        CheckConstraint("custo_aquisicao >= 0", name=conv("ck_movimentacao_custo_aquisicao")),
        CheckConstraint(
            "tipo = 'entrada' OR custo_aquisicao = 0", name=conv("ck_movimentacao_custo_so_entrada")
        ),
    )

    id: Mapped[int] = pk_id()
    registro_estoque_id: Mapped[int] = mapped_column(ForeignKey("registro_estoque.id"))
    tipo: Mapped[TipoMovimentacao] = mapped_column(
        enum_varchar(TipoMovimentacao, "ck_movimentacao_tipo")
    )
    data_movimentacao: Mapped[date]
    quantidade: Mapped[int]
    custo_aquisicao: Mapped[Decimal] = mapped_column(server_default=text("0"))
    observacao: Mapped[str | None] = mapped_column(String(200))
    estornada_em: Mapped[datetime | None]
    criado_em: Mapped[datetime] = criado_em()


class Pesagem(Base):
    """RF08."""

    __tablename__ = "pesagem"
    __table_args__ = (CheckConstraint("peso_kg > 0", name=conv("ck_pesagem_peso")),)

    id: Mapped[int] = pk_id()
    animal_id: Mapped[int] = mapped_column(ForeignKey("animal.id"))
    data_pesagem: Mapped[date]
    peso_kg: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    observacao: Mapped[str | None] = mapped_column(String(200))
