"""Notas fiscais e custos: fornecedor, categoria, nota, recorrência e custo."""

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, ForeignKey, Index, String, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql.naming import conv

from app.domain.costs.enums import NaturezaCusto, Periodicidade, SituacaoPagamento
from app.infrastructure.database.base import Base, atualizado_em, criado_em, enum_varchar
from app.infrastructure.database.models._comum import pk_id


class Fornecedor(Base):
    """Base da memória de fornecedor (RF12)."""

    __tablename__ = "fornecedor"
    __table_args__ = (UniqueConstraint("propriedade_id", "nome"),)

    id: Mapped[int] = pk_id()
    propriedade_id: Mapped[int] = mapped_column(ForeignKey("propriedade.id"))
    nome: Mapped[str] = mapped_column(String(120))
    ativo: Mapped[bool] = mapped_column(server_default=text("true"))


class CategoriaCusto(Base):
    """RF11. Categorias livres; as sugeridas são criadas com a propriedade."""

    __tablename__ = "categoria_custo"
    __table_args__ = (UniqueConstraint("propriedade_id", "nome"),)

    id: Mapped[int] = pk_id()
    propriedade_id: Mapped[int] = mapped_column(ForeignKey("propriedade.id"))
    nome: Mapped[str] = mapped_column(String(60))
    sugerida: Mapped[bool] = mapped_column(server_default=text("false"))
    ativa: Mapped[bool] = mapped_column(server_default=text("true"))


class NotaFiscal(Base):
    """RF09. A foto fica no armazenamento privado; o banco guarda só a chave (ADR 0006)."""

    __tablename__ = "nota_fiscal"
    __table_args__ = (
        Index(None, "propriedade_id", "data_compra"),
        Index(None, "fornecedor_id"),
        CheckConstraint("valor_total > 0", name=conv("ck_nota_valor_total")),
    )

    id: Mapped[int] = pk_id()
    propriedade_id: Mapped[int] = mapped_column(ForeignKey("propriedade.id"))
    fornecedor_id: Mapped[int] = mapped_column(ForeignKey("fornecedor.id"))
    numero_documento: Mapped[str | None] = mapped_column(String(60))
    data_compra: Mapped[date]
    valor_total: Mapped[Decimal]
    imagem_caminho: Mapped[str] = mapped_column(String(500))
    imagem_mime: Mapped[str | None] = mapped_column(String(60))
    criado_por: Mapped[int | None] = mapped_column(ForeignKey("usuario.id"))
    criado_em: Mapped[datetime] = criado_em()


class Recorrencia(Base):
    """RF13, RN14. Modelo do custo recorrente; gera os custos previstos."""

    __tablename__ = "recorrencia"
    __table_args__ = (
        Index(None, "registro_estoque_id"),
        CheckConstraint("valor > 0", name=conv("ck_recorrencia_valor")),
        CheckConstraint(
            "NOT (ativa AND encerrada_em IS NOT NULL)", name=conv("ck_recorrencia_encerramento")
        ),
    )

    id: Mapped[int] = pk_id()
    registro_estoque_id: Mapped[int] = mapped_column(ForeignKey("registro_estoque.id"))
    categoria_custo_id: Mapped[int] = mapped_column(ForeignKey("categoria_custo.id"))
    fornecedor_id: Mapped[int | None] = mapped_column(ForeignKey("fornecedor.id"))
    descricao: Mapped[str] = mapped_column(String(200))
    valor: Mapped[Decimal]
    periodicidade: Mapped[Periodicidade] = mapped_column(
        enum_varchar(Periodicidade, "ck_recorrencia_periodicidade")
    )
    proxima_data: Mapped[date]
    ativa: Mapped[bool] = mapped_column(server_default=text("true"))
    encerrada_em: Mapped[date | None]
    criado_em: Mapped[datetime] = criado_em()


class Custo(Base):
    """RF10, RF14, RF15. Só custos realizados e não estornados compõem o custo (RN10, RN16)."""

    __tablename__ = "custo"
    __table_args__ = (
        Index(None, "registro_estoque_id", "natureza"),
        Index(None, "nota_fiscal_id"),
        Index(None, "situacao_pagamento", "data_vencimento"),
        Index(None, "fornecedor_id", "data_compra"),
        CheckConstraint("valor > 0", name=conv("ck_custo_valor")),
        CheckConstraint(
            "natureza = 'realizado' OR situacao_pagamento IS NULL",
            name=conv("ck_custo_pagamento_so_realizado"),
        ),
        CheckConstraint(
            "situacao_pagamento IS DISTINCT FROM 'a_pagar' OR data_vencimento IS NOT NULL",
            name=conv("ck_custo_vencimento_a_pagar"),
        ),
        CheckConstraint(
            "situacao_pagamento IS NOT DISTINCT FROM 'pago' OR data_pagamento IS NULL",
            name=conv("ck_custo_data_pagamento"),
        ),
    )

    id: Mapped[int] = pk_id()
    registro_estoque_id: Mapped[int] = mapped_column(ForeignKey("registro_estoque.id"))
    categoria_custo_id: Mapped[int] = mapped_column(ForeignKey("categoria_custo.id"))
    nota_fiscal_id: Mapped[int | None] = mapped_column(ForeignKey("nota_fiscal.id"))
    fornecedor_id: Mapped[int | None] = mapped_column(ForeignKey("fornecedor.id"))
    recorrencia_id: Mapped[int | None] = mapped_column(ForeignKey("recorrencia.id"))
    descricao: Mapped[str] = mapped_column(String(200))
    valor: Mapped[Decimal]
    data_compra: Mapped[date]
    natureza: Mapped[NaturezaCusto] = mapped_column(
        enum_varchar(NaturezaCusto, "ck_custo_natureza"),
        server_default=NaturezaCusto.REALIZADO.value,
    )
    situacao_pagamento: Mapped[SituacaoPagamento | None] = mapped_column(
        enum_varchar(SituacaoPagamento, "ck_custo_situacao_pagamento")
    )
    data_vencimento: Mapped[date | None]
    data_pagamento: Mapped[date | None]
    estornado_em: Mapped[datetime | None]
    criado_por: Mapped[int | None] = mapped_column(ForeignKey("usuario.id"))
    criado_em: Mapped[datetime] = criado_em()
    atualizado_em: Mapped[datetime] = atualizado_em()
