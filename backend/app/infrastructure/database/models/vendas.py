"""Vendas e margem: comprador, venda e oferta de frigorífico."""

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, ForeignKey, Index, Numeric, String, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql.naming import conv

from app.infrastructure.database.base import Base, atualizado_em, criado_em
from app.infrastructure.database.models._comum import pk_id


class Comprador(Base):
    __tablename__ = "comprador"
    __table_args__ = (UniqueConstraint("propriedade_id", "nome"),)

    id: Mapped[int] = pk_id()
    propriedade_id: Mapped[int] = mapped_column(ForeignKey("propriedade.id"))
    nome: Mapped[str] = mapped_column(String(120))
    ativo: Mapped[bool] = mapped_column(server_default=text("true"))


class Venda(Base):
    """RF20 a RF24. Os animais vendidos são os que apontam para a venda (animal.venda_id)."""

    __tablename__ = "venda"
    __table_args__ = (
        Index(None, "registro_estoque_id", "data_venda"),
        CheckConstraint("quantidade_cabecas > 0", name=conv("ck_venda_quantidade")),
        CheckConstraint("arrobas_vendidas > 0", name=conv("ck_venda_arrobas")),
        CheckConstraint("preco_arroba > 0", name=conv("ck_venda_preco_arroba")),
        CheckConstraint("despesas_venda >= 0", name=conv("ck_venda_despesas")),
        CheckConstraint("custo_alocado >= 0", name=conv("ck_venda_custo_alocado")),
        CheckConstraint(
            "peso_vivo_total_kg IS NOT NULL OR arrobas_carcaca_informadas IS NOT NULL",
            name=conv("ck_venda_origem_arrobas"),
        ),
        CheckConstraint(
            "rendimento_carcaca_pct > 0 AND rendimento_carcaca_pct <= 100",
            name=conv("ck_venda_rendimento"),
        ),
        CheckConstraint(
            "arrobas_carcaca_informadas IS NOT NULL OR rendimento_carcaca_pct IS NOT NULL",
            name=conv("ck_venda_rendimento_peso_vivo"),
        ),
    )

    id: Mapped[int] = pk_id()
    registro_estoque_id: Mapped[int] = mapped_column(ForeignKey("registro_estoque.id"))
    comprador_id: Mapped[int | None] = mapped_column(ForeignKey("comprador.id"))
    data_venda: Mapped[date]
    quantidade_cabecas: Mapped[int]
    peso_vivo_total_kg: Mapped[Decimal | None]
    arrobas_carcaca_informadas: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    rendimento_carcaca_pct: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    arrobas_vendidas: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    preco_arroba: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    despesas_venda: Mapped[Decimal] = mapped_column(server_default=text("0"))
    despesas_descricao: Mapped[str | None] = mapped_column(String(200))
    # Calculado e gravado pelo serviço de domínio (RN17, ADR 0004).
    custo_alocado: Mapped[Decimal]
    observacao: Mapped[str | None] = mapped_column(String(200))
    estornada_em: Mapped[datetime | None]
    criado_por: Mapped[int | None] = mapped_column(ForeignKey("usuario.id"))
    criado_em: Mapped[datetime] = criado_em()
    atualizado_em: Mapped[datetime] = atualizado_em()


class OfertaFrigorifico(Base):
    """RF29, RN30. Apenas referência; não gera venda."""

    __tablename__ = "oferta_frigorifico"
    __table_args__ = (
        CheckConstraint("preco_arroba > 0", name=conv("ck_oferta_preco_arroba")),
        CheckConstraint("quantidade_cabecas > 0", name=conv("ck_oferta_quantidade")),
    )

    id: Mapped[int] = pk_id()
    registro_estoque_id: Mapped[int] = mapped_column(ForeignKey("registro_estoque.id"))
    comprador_id: Mapped[int] = mapped_column(ForeignKey("comprador.id"))
    data_oferta: Mapped[date]
    preco_arroba: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    quantidade_cabecas: Mapped[int | None]
    observacao: Mapped[str | None] = mapped_column(String(200))
    criado_em: Mapped[datetime] = criado_em()
