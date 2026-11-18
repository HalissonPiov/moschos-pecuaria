"""Modelo inicial: as 20 tabelas de db/modelo-relacional-logico.dbml (versão 2).

Os CHECKs têm os nomes do .dbml (ADR 0005). Os enumerados são varchar com CHECK.

Revision ID: 0001
Revises:
Create Date: 2026-11-16 23:21:34.445532

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0001"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "usuario",
        sa.Column("id", sa.Integer(), sa.Identity(always=False), nullable=False),
        sa.Column("nome", sa.String(length=120), nullable=False),
        sa.Column("email", sa.String(length=160), nullable=False),
        sa.Column("senha_hash", sa.String(length=255), nullable=False),
        sa.Column("ativo", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column(
            "criado_em", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_usuario")),
        sa.UniqueConstraint("email", name=op.f("uq_usuario_email")),
    )
    op.create_table(
        "propriedade",
        sa.Column("id", sa.Integer(), sa.Identity(always=False), nullable=False),
        sa.Column("nome", sa.String(length=120), nullable=False),
        sa.Column("municipio", sa.String(length=80), nullable=True),
        sa.Column("uf", sa.CHAR(length=2), nullable=True),
        sa.Column("area_hectares", sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column("titular_nome", sa.String(length=200), nullable=False),
        sa.Column("cadastrada_por", sa.Integer(), nullable=False),
        sa.Column(
            "rendimento_carcaca_pct",
            sa.Numeric(precision=5, scale=2),
            server_default=sa.text("50"),
            nullable=False,
        ),
        sa.Column(
            "praca_padrao", sa.String(length=60), server_default="Minas Gerais", nullable=False
        ),
        sa.Column(
            "dias_alerta_vencimento", sa.SmallInteger(), server_default=sa.text("7"), nullable=False
        ),
        sa.Column("ativa", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column(
            "criado_em", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.CheckConstraint("dias_alerta_vencimento >= 0", name=op.f("ck_propriedade_dias_alerta")),
        sa.CheckConstraint(
            "rendimento_carcaca_pct > 0 AND rendimento_carcaca_pct <= 100",
            name=op.f("ck_propriedade_rendimento"),
        ),
        sa.ForeignKeyConstraint(
            ["cadastrada_por"], ["usuario.id"], name=op.f("fk_propriedade_cadastrada_por_usuario")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_propriedade")),
    )
    op.create_table(
        "recuperacao_senha",
        sa.Column("id", sa.Integer(), sa.Identity(always=False), nullable=False),
        sa.Column("usuario_id", sa.Integer(), nullable=False),
        sa.Column("token_hash", sa.String(length=255), nullable=False),
        sa.Column("expira_em", sa.DateTime(timezone=True), nullable=False),
        sa.Column("usado_em", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "criado_em", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.ForeignKeyConstraint(
            ["usuario_id"], ["usuario.id"], name=op.f("fk_recuperacao_senha_usuario_id_usuario")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_recuperacao_senha")),
        sa.UniqueConstraint("token_hash", name=op.f("uq_recuperacao_senha_token_hash")),
    )
    op.create_table(
        "categoria_custo",
        sa.Column("id", sa.Integer(), sa.Identity(always=False), nullable=False),
        sa.Column("propriedade_id", sa.Integer(), nullable=False),
        sa.Column("nome", sa.String(length=60), nullable=False),
        sa.Column("sugerida", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("ativa", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.ForeignKeyConstraint(
            ["propriedade_id"],
            ["propriedade.id"],
            name=op.f("fk_categoria_custo_propriedade_id_propriedade"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_categoria_custo")),
        sa.UniqueConstraint(
            "propriedade_id", "nome", name=op.f("uq_categoria_custo_propriedade_id_nome")
        ),
    )
    op.create_table(
        "comprador",
        sa.Column("id", sa.Integer(), sa.Identity(always=False), nullable=False),
        sa.Column("propriedade_id", sa.Integer(), nullable=False),
        sa.Column("nome", sa.String(length=120), nullable=False),
        sa.Column("ativo", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.ForeignKeyConstraint(
            ["propriedade_id"],
            ["propriedade.id"],
            name=op.f("fk_comprador_propriedade_id_propriedade"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_comprador")),
        sa.UniqueConstraint(
            "propriedade_id", "nome", name=op.f("uq_comprador_propriedade_id_nome")
        ),
    )
    op.create_table(
        "convite_propriedade",
        sa.Column("id", sa.Integer(), sa.Identity(always=False), nullable=False),
        sa.Column("propriedade_id", sa.Integer(), nullable=False),
        sa.Column(
            "papel",
            sa.Enum(
                "proprietario",
                "gestor",
                name="ck_convite_papel",
                native_enum=False,
                create_constraint=True,
                length=20,
            ),
            nullable=False,
        ),
        sa.Column("token_hash", sa.String(length=255), nullable=False),
        sa.Column("criado_por", sa.Integer(), nullable=False),
        sa.Column(
            "criado_em", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.Column("expira_em", sa.DateTime(timezone=True), nullable=False),
        sa.Column("aceito_em", sa.DateTime(timezone=True), nullable=True),
        sa.Column("aceito_por", sa.Integer(), nullable=True),
        sa.Column("revogado_em", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "(aceito_em IS NULL) = (aceito_por IS NULL)", name=op.f("ck_convite_aceite")
        ),
        sa.CheckConstraint(
            "NOT (aceito_em IS NOT NULL AND revogado_em IS NOT NULL)",
            name=op.f("ck_convite_estado"),
        ),
        sa.CheckConstraint("expira_em > criado_em", name=op.f("ck_convite_validade")),
        sa.ForeignKeyConstraint(
            ["aceito_por"], ["usuario.id"], name=op.f("fk_convite_propriedade_aceito_por_usuario")
        ),
        sa.ForeignKeyConstraint(
            ["criado_por"], ["usuario.id"], name=op.f("fk_convite_propriedade_criado_por_usuario")
        ),
        sa.ForeignKeyConstraint(
            ["propriedade_id"],
            ["propriedade.id"],
            name=op.f("fk_convite_propriedade_propriedade_id_propriedade"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_convite_propriedade")),
        sa.UniqueConstraint("token_hash", name=op.f("uq_convite_propriedade_token_hash")),
    )
    op.create_index(
        op.f("ix_convite_propriedade_propriedade_id"),
        "convite_propriedade",
        ["propriedade_id"],
        unique=False,
    )
    op.create_table(
        "correcao_justificada",
        sa.Column("id", sa.Integer(), sa.Identity(always=False), nullable=False),
        sa.Column("propriedade_id", sa.Integer(), nullable=False),
        sa.Column("usuario_id", sa.Integer(), nullable=False),
        sa.Column("entidade", sa.String(length=40), nullable=False),
        sa.Column("entidade_id", sa.Integer(), nullable=False),
        sa.Column("justificativa", sa.Text(), nullable=False),
        sa.Column("dados_anteriores", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "criado_em", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.ForeignKeyConstraint(
            ["propriedade_id"],
            ["propriedade.id"],
            name=op.f("fk_correcao_justificada_propriedade_id_propriedade"),
        ),
        sa.ForeignKeyConstraint(
            ["usuario_id"], ["usuario.id"], name=op.f("fk_correcao_justificada_usuario_id_usuario")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_correcao_justificada")),
    )
    op.create_index(
        op.f("ix_correcao_justificada_entidade_entidade_id"),
        "correcao_justificada",
        ["entidade", "entidade_id"],
        unique=False,
    )
    op.create_table(
        "cotacao",
        sa.Column("id", sa.Integer(), sa.Identity(always=False), nullable=False),
        sa.Column("propriedade_id", sa.Integer(), nullable=False),
        sa.Column("data_cotacao", sa.Date(), nullable=False),
        sa.Column("praca", sa.String(length=60), nullable=False),
        sa.Column("valor_arroba", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("fonte", sa.String(length=80), nullable=False),
        sa.Column(
            "criado_em", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.CheckConstraint("valor_arroba > 0", name=op.f("ck_cotacao_valor_arroba")),
        sa.ForeignKeyConstraint(
            ["propriedade_id"],
            ["propriedade.id"],
            name=op.f("fk_cotacao_propriedade_id_propriedade"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_cotacao")),
        sa.UniqueConstraint(
            "propriedade_id",
            "data_cotacao",
            "praca",
            "fonte",
            name=op.f("uq_cotacao_data_praca_fonte"),
        ),
    )
    op.create_index(
        op.f("ix_cotacao_propriedade_id_praca_data_cotacao"),
        "cotacao",
        ["propriedade_id", "praca", "data_cotacao"],
        unique=False,
    )
    op.create_table(
        "fornecedor",
        sa.Column("id", sa.Integer(), sa.Identity(always=False), nullable=False),
        sa.Column("propriedade_id", sa.Integer(), nullable=False),
        sa.Column("nome", sa.String(length=120), nullable=False),
        sa.Column("ativo", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.ForeignKeyConstraint(
            ["propriedade_id"],
            ["propriedade.id"],
            name=op.f("fk_fornecedor_propriedade_id_propriedade"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_fornecedor")),
        sa.UniqueConstraint(
            "propriedade_id", "nome", name=op.f("uq_fornecedor_propriedade_id_nome")
        ),
    )
    op.create_table(
        "pasto",
        sa.Column("id", sa.Integer(), sa.Identity(always=False), nullable=False),
        sa.Column("propriedade_id", sa.Integer(), nullable=False),
        sa.Column("nome", sa.String(length=80), nullable=False),
        sa.Column("area_hectares", sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column("ativo", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.ForeignKeyConstraint(
            ["propriedade_id"], ["propriedade.id"], name=op.f("fk_pasto_propriedade_id_propriedade")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_pasto")),
        sa.UniqueConstraint("propriedade_id", "nome", name=op.f("uq_pasto_propriedade_id_nome")),
    )
    op.create_table(
        "registro_estoque",
        sa.Column("id", sa.Integer(), sa.Identity(always=False), nullable=False),
        sa.Column("propriedade_id", sa.Integer(), nullable=False),
        sa.Column("identificacao", sa.String(length=80), nullable=False),
        sa.Column(
            "modo_registro",
            sa.Enum(
                "individual",
                "lote",
                name="ck_registro_modo",
                native_enum=False,
                create_constraint=True,
                length=20,
            ),
            nullable=False,
        ),
        sa.Column("data_formacao", sa.Date(), nullable=False),
        sa.Column(
            "origem",
            sa.Enum(
                "nascimento",
                "aquisicao",
                name="ck_registro_origem",
                native_enum=False,
                create_constraint=True,
                length=20,
            ),
            nullable=False,
        ),
        sa.Column(
            "custo_aquisicao",
            sa.Numeric(precision=12, scale=2),
            server_default=sa.text("0"),
            nullable=False,
        ),
        sa.Column(
            "situacao_producao",
            sa.Enum(
                "em_producao",
                "pronto_para_venda",
                name="ck_registro_situacao_producao",
                native_enum=False,
                create_constraint=True,
                length=20,
            ),
            server_default="em_producao",
            nullable=False,
        ),
        sa.Column("ativo", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column(
            "criado_em", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.Column(
            "atualizado_em",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("custo_aquisicao >= 0", name=op.f("ck_registro_custo_aquisicao")),
        sa.ForeignKeyConstraint(
            ["propriedade_id"],
            ["propriedade.id"],
            name=op.f("fk_registro_estoque_propriedade_id_propriedade"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_registro_estoque")),
        sa.UniqueConstraint(
            "id", "propriedade_id", name=op.f("uq_registro_estoque_id_propriedade")
        ),
        sa.UniqueConstraint(
            "propriedade_id",
            "identificacao",
            name=op.f("uq_registro_estoque_propriedade_id_identificacao"),
        ),
    )
    op.create_index(
        op.f("ix_registro_estoque_propriedade_id_situacao_producao"),
        "registro_estoque",
        ["propriedade_id", "situacao_producao"],
        unique=False,
    )
    op.create_table(
        "usuario_propriedade",
        sa.Column("usuario_id", sa.Integer(), nullable=False),
        sa.Column("propriedade_id", sa.Integer(), nullable=False),
        sa.Column(
            "papel",
            sa.Enum(
                "proprietario",
                "gestor",
                name="ck_usuario_propriedade_papel",
                native_enum=False,
                create_constraint=True,
                length=20,
            ),
            nullable=False,
        ),
        sa.Column("aceite_declaracao_em", sa.DateTime(timezone=True), nullable=False),
        sa.Column("versao_termo", sa.String(length=20), nullable=False),
        sa.Column(
            "criado_em", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.ForeignKeyConstraint(
            ["propriedade_id"],
            ["propriedade.id"],
            name=op.f("fk_usuario_propriedade_propriedade_id_propriedade"),
        ),
        sa.ForeignKeyConstraint(
            ["usuario_id"], ["usuario.id"], name=op.f("fk_usuario_propriedade_usuario_id_usuario")
        ),
        sa.PrimaryKeyConstraint(
            "usuario_id", "propriedade_id", name=op.f("pk_usuario_propriedade")
        ),
    )
    op.create_index(
        op.f("ix_usuario_propriedade_propriedade_id"),
        "usuario_propriedade",
        ["propriedade_id"],
        unique=False,
    )
    op.create_table(
        "movimentacao_estoque",
        sa.Column("id", sa.Integer(), sa.Identity(always=False), nullable=False),
        sa.Column("registro_estoque_id", sa.Integer(), nullable=False),
        sa.Column(
            "tipo",
            sa.Enum(
                "entrada",
                "baixa_morte",
                "baixa_descarte",
                name="ck_movimentacao_tipo",
                native_enum=False,
                create_constraint=True,
                length=20,
            ),
            nullable=False,
        ),
        sa.Column("data_movimentacao", sa.Date(), nullable=False),
        sa.Column("quantidade", sa.Integer(), nullable=False),
        sa.Column(
            "custo_aquisicao",
            sa.Numeric(precision=12, scale=2),
            server_default=sa.text("0"),
            nullable=False,
        ),
        sa.Column("observacao", sa.String(length=200), nullable=True),
        sa.Column("estornada_em", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "criado_em", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.CheckConstraint(
            "tipo = 'entrada' OR custo_aquisicao = 0", name=op.f("ck_movimentacao_custo_so_entrada")
        ),
        sa.CheckConstraint("custo_aquisicao >= 0", name=op.f("ck_movimentacao_custo_aquisicao")),
        sa.CheckConstraint("quantidade > 0", name=op.f("ck_movimentacao_quantidade")),
        sa.ForeignKeyConstraint(
            ["registro_estoque_id"],
            ["registro_estoque.id"],
            name=op.f("fk_movimentacao_estoque_registro_estoque_id_registro_estoque"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_movimentacao_estoque")),
    )
    op.create_index(
        op.f("ix_movimentacao_estoque_registro_estoque_id_data_movimentacao"),
        "movimentacao_estoque",
        ["registro_estoque_id", "data_movimentacao"],
        unique=False,
    )
    op.create_table(
        "nota_fiscal",
        sa.Column("id", sa.Integer(), sa.Identity(always=False), nullable=False),
        sa.Column("propriedade_id", sa.Integer(), nullable=False),
        sa.Column("fornecedor_id", sa.Integer(), nullable=False),
        sa.Column("numero_documento", sa.String(length=60), nullable=True),
        sa.Column("data_compra", sa.Date(), nullable=False),
        sa.Column("valor_total", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("imagem_caminho", sa.String(length=500), nullable=False),
        sa.Column("imagem_mime", sa.String(length=60), nullable=True),
        sa.Column("criado_por", sa.Integer(), nullable=True),
        sa.Column(
            "criado_em", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.CheckConstraint("valor_total > 0", name=op.f("ck_nota_valor_total")),
        sa.ForeignKeyConstraint(
            ["criado_por"], ["usuario.id"], name=op.f("fk_nota_fiscal_criado_por_usuario")
        ),
        sa.ForeignKeyConstraint(
            ["fornecedor_id"],
            ["fornecedor.id"],
            name=op.f("fk_nota_fiscal_fornecedor_id_fornecedor"),
        ),
        sa.ForeignKeyConstraint(
            ["propriedade_id"],
            ["propriedade.id"],
            name=op.f("fk_nota_fiscal_propriedade_id_propriedade"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_nota_fiscal")),
    )
    op.create_index(
        op.f("ix_nota_fiscal_fornecedor_id"), "nota_fiscal", ["fornecedor_id"], unique=False
    )
    op.create_index(
        op.f("ix_nota_fiscal_propriedade_id_data_compra"),
        "nota_fiscal",
        ["propriedade_id", "data_compra"],
        unique=False,
    )
    op.create_table(
        "oferta_frigorifico",
        sa.Column("id", sa.Integer(), sa.Identity(always=False), nullable=False),
        sa.Column("registro_estoque_id", sa.Integer(), nullable=False),
        sa.Column("comprador_id", sa.Integer(), nullable=False),
        sa.Column("data_oferta", sa.Date(), nullable=False),
        sa.Column("preco_arroba", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("quantidade_cabecas", sa.Integer(), nullable=True),
        sa.Column("observacao", sa.String(length=200), nullable=True),
        sa.Column(
            "criado_em", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.CheckConstraint("preco_arroba > 0", name=op.f("ck_oferta_preco_arroba")),
        sa.CheckConstraint("quantidade_cabecas > 0", name=op.f("ck_oferta_quantidade")),
        sa.ForeignKeyConstraint(
            ["comprador_id"],
            ["comprador.id"],
            name=op.f("fk_oferta_frigorifico_comprador_id_comprador"),
        ),
        sa.ForeignKeyConstraint(
            ["registro_estoque_id"],
            ["registro_estoque.id"],
            name=op.f("fk_oferta_frigorifico_registro_estoque_id_registro_estoque"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_oferta_frigorifico")),
    )
    op.create_table(
        "recorrencia",
        sa.Column("id", sa.Integer(), sa.Identity(always=False), nullable=False),
        sa.Column("registro_estoque_id", sa.Integer(), nullable=False),
        sa.Column("categoria_custo_id", sa.Integer(), nullable=False),
        sa.Column("fornecedor_id", sa.Integer(), nullable=True),
        sa.Column("descricao", sa.String(length=200), nullable=False),
        sa.Column("valor", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column(
            "periodicidade",
            sa.Enum(
                "semanal",
                "quinzenal",
                "mensal",
                "bimestral",
                "trimestral",
                "semestral",
                "anual",
                name="ck_recorrencia_periodicidade",
                native_enum=False,
                create_constraint=True,
                length=20,
            ),
            nullable=False,
        ),
        sa.Column("proxima_data", sa.Date(), nullable=False),
        sa.Column("ativa", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("encerrada_em", sa.Date(), nullable=True),
        sa.Column(
            "criado_em", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.CheckConstraint(
            "NOT (ativa AND encerrada_em IS NOT NULL)", name=op.f("ck_recorrencia_encerramento")
        ),
        sa.CheckConstraint("valor > 0", name=op.f("ck_recorrencia_valor")),
        sa.ForeignKeyConstraint(
            ["categoria_custo_id"],
            ["categoria_custo.id"],
            name=op.f("fk_recorrencia_categoria_custo_id_categoria_custo"),
        ),
        sa.ForeignKeyConstraint(
            ["fornecedor_id"],
            ["fornecedor.id"],
            name=op.f("fk_recorrencia_fornecedor_id_fornecedor"),
        ),
        sa.ForeignKeyConstraint(
            ["registro_estoque_id"],
            ["registro_estoque.id"],
            name=op.f("fk_recorrencia_registro_estoque_id_registro_estoque"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_recorrencia")),
    )
    op.create_index(
        op.f("ix_recorrencia_registro_estoque_id"),
        "recorrencia",
        ["registro_estoque_id"],
        unique=False,
    )
    op.create_table(
        "venda",
        sa.Column("id", sa.Integer(), sa.Identity(always=False), nullable=False),
        sa.Column("registro_estoque_id", sa.Integer(), nullable=False),
        sa.Column("comprador_id", sa.Integer(), nullable=True),
        sa.Column("data_venda", sa.Date(), nullable=False),
        sa.Column("quantidade_cabecas", sa.Integer(), nullable=False),
        sa.Column("peso_vivo_total_kg", sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column("arrobas_carcaca_informadas", sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column("rendimento_carcaca_pct", sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column("arrobas_vendidas", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("preco_arroba", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column(
            "despesas_venda",
            sa.Numeric(precision=12, scale=2),
            server_default=sa.text("0"),
            nullable=False,
        ),
        sa.Column("despesas_descricao", sa.String(length=200), nullable=True),
        sa.Column("custo_alocado", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("observacao", sa.String(length=200), nullable=True),
        sa.Column("estornada_em", sa.DateTime(timezone=True), nullable=True),
        sa.Column("criado_por", sa.Integer(), nullable=True),
        sa.Column(
            "criado_em", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.Column(
            "atualizado_em",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "arrobas_carcaca_informadas IS NOT NULL OR rendimento_carcaca_pct IS NOT NULL",
            name=op.f("ck_venda_rendimento_peso_vivo"),
        ),
        sa.CheckConstraint("arrobas_vendidas > 0", name=op.f("ck_venda_arrobas")),
        sa.CheckConstraint("custo_alocado >= 0", name=op.f("ck_venda_custo_alocado")),
        sa.CheckConstraint("despesas_venda >= 0", name=op.f("ck_venda_despesas")),
        sa.CheckConstraint(
            "peso_vivo_total_kg IS NOT NULL OR arrobas_carcaca_informadas IS NOT NULL",
            name=op.f("ck_venda_origem_arrobas"),
        ),
        sa.CheckConstraint("preco_arroba > 0", name=op.f("ck_venda_preco_arroba")),
        sa.CheckConstraint("quantidade_cabecas > 0", name=op.f("ck_venda_quantidade")),
        sa.CheckConstraint(
            "rendimento_carcaca_pct > 0 AND rendimento_carcaca_pct <= 100",
            name=op.f("ck_venda_rendimento"),
        ),
        sa.ForeignKeyConstraint(
            ["comprador_id"], ["comprador.id"], name=op.f("fk_venda_comprador_id_comprador")
        ),
        sa.ForeignKeyConstraint(
            ["criado_por"], ["usuario.id"], name=op.f("fk_venda_criado_por_usuario")
        ),
        sa.ForeignKeyConstraint(
            ["registro_estoque_id"],
            ["registro_estoque.id"],
            name=op.f("fk_venda_registro_estoque_id_registro_estoque"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_venda")),
    )
    op.create_index(
        op.f("ix_venda_registro_estoque_id_data_venda"),
        "venda",
        ["registro_estoque_id", "data_venda"],
        unique=False,
    )
    op.create_table(
        "animal",
        sa.Column("id", sa.Integer(), sa.Identity(always=False), nullable=False),
        sa.Column("registro_estoque_id", sa.Integer(), nullable=False),
        sa.Column("propriedade_id", sa.Integer(), nullable=False),
        sa.Column("nome", sa.String(length=80), nullable=True),
        sa.Column("brinco", sa.String(length=40), nullable=True),
        sa.Column(
            "sexo",
            sa.Enum(
                "macho",
                "femea",
                name="ck_animal_sexo",
                native_enum=False,
                create_constraint=True,
                length=10,
            ),
            nullable=True,
        ),
        sa.Column("raca", sa.String(length=60), nullable=True),
        sa.Column("cor", sa.String(length=40), nullable=True),
        sa.Column("data_nascimento", sa.Date(), nullable=True),
        sa.Column(
            "nascimento_estimado", sa.Boolean(), server_default=sa.text("false"), nullable=False
        ),
        sa.Column("peso_inicial_kg", sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column("pasto_id", sa.Integer(), nullable=True),
        sa.Column("observacao", sa.String(length=200), nullable=True),
        sa.Column("movimentacao_entrada_id", sa.Integer(), nullable=True),
        sa.Column("venda_id", sa.Integer(), nullable=True),
        sa.Column("movimentacao_baixa_id", sa.Integer(), nullable=True),
        sa.Column(
            "criado_em", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.Column(
            "atualizado_em",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("peso_inicial_kg > 0", name=op.f("ck_animal_peso_inicial")),
        sa.CheckConstraint(
            "venda_id IS NULL OR movimentacao_baixa_id IS NULL", name=op.f("ck_animal_saida_unica")
        ),
        sa.ForeignKeyConstraint(
            ["movimentacao_baixa_id"],
            ["movimentacao_estoque.id"],
            name=op.f("fk_animal_movimentacao_baixa_id_movimentacao_estoque"),
        ),
        sa.ForeignKeyConstraint(
            ["movimentacao_entrada_id"],
            ["movimentacao_estoque.id"],
            name=op.f("fk_animal_movimentacao_entrada_id_movimentacao_estoque"),
        ),
        sa.ForeignKeyConstraint(["pasto_id"], ["pasto.id"], name=op.f("fk_animal_pasto_id_pasto")),
        sa.ForeignKeyConstraint(
            ["registro_estoque_id", "propriedade_id"],
            ["registro_estoque.id", "registro_estoque.propriedade_id"],
            name=op.f("fk_animal_registro_estoque_id_propriedade_id_registro_estoque"),
        ),
        sa.ForeignKeyConstraint(["venda_id"], ["venda.id"], name=op.f("fk_animal_venda_id_venda")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_animal")),
        sa.UniqueConstraint(
            "propriedade_id", "brinco", name=op.f("uq_animal_propriedade_id_brinco")
        ),
    )
    op.create_index(op.f("ix_animal_pasto_id"), "animal", ["pasto_id"], unique=False)
    op.create_index(
        op.f("ix_animal_registro_estoque_id"), "animal", ["registro_estoque_id"], unique=False
    )
    op.create_index(op.f("ix_animal_venda_id"), "animal", ["venda_id"], unique=False)
    op.create_table(
        "custo",
        sa.Column("id", sa.Integer(), sa.Identity(always=False), nullable=False),
        sa.Column("registro_estoque_id", sa.Integer(), nullable=False),
        sa.Column("categoria_custo_id", sa.Integer(), nullable=False),
        sa.Column("nota_fiscal_id", sa.Integer(), nullable=True),
        sa.Column("fornecedor_id", sa.Integer(), nullable=True),
        sa.Column("recorrencia_id", sa.Integer(), nullable=True),
        sa.Column("descricao", sa.String(length=200), nullable=False),
        sa.Column("valor", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("data_compra", sa.Date(), nullable=False),
        sa.Column(
            "natureza",
            sa.Enum(
                "previsto",
                "realizado",
                name="ck_custo_natureza",
                native_enum=False,
                create_constraint=True,
                length=20,
            ),
            server_default="realizado",
            nullable=False,
        ),
        sa.Column(
            "situacao_pagamento",
            sa.Enum(
                "a_pagar",
                "pago",
                name="ck_custo_situacao_pagamento",
                native_enum=False,
                create_constraint=True,
                length=20,
            ),
            nullable=True,
        ),
        sa.Column("data_vencimento", sa.Date(), nullable=True),
        sa.Column("data_pagamento", sa.Date(), nullable=True),
        sa.Column("estornado_em", sa.DateTime(timezone=True), nullable=True),
        sa.Column("criado_por", sa.Integer(), nullable=True),
        sa.Column(
            "criado_em", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.Column(
            "atualizado_em",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "natureza = 'realizado' OR situacao_pagamento IS NULL",
            name=op.f("ck_custo_pagamento_so_realizado"),
        ),
        sa.CheckConstraint(
            "situacao_pagamento IS DISTINCT FROM 'a_pagar' OR data_vencimento IS NOT NULL",
            name=op.f("ck_custo_vencimento_a_pagar"),
        ),
        sa.CheckConstraint(
            "situacao_pagamento IS NOT DISTINCT FROM 'pago' OR data_pagamento IS NULL",
            name=op.f("ck_custo_data_pagamento"),
        ),
        sa.CheckConstraint("valor > 0", name=op.f("ck_custo_valor")),
        sa.ForeignKeyConstraint(
            ["categoria_custo_id"],
            ["categoria_custo.id"],
            name=op.f("fk_custo_categoria_custo_id_categoria_custo"),
        ),
        sa.ForeignKeyConstraint(
            ["criado_por"], ["usuario.id"], name=op.f("fk_custo_criado_por_usuario")
        ),
        sa.ForeignKeyConstraint(
            ["fornecedor_id"], ["fornecedor.id"], name=op.f("fk_custo_fornecedor_id_fornecedor")
        ),
        sa.ForeignKeyConstraint(
            ["nota_fiscal_id"], ["nota_fiscal.id"], name=op.f("fk_custo_nota_fiscal_id_nota_fiscal")
        ),
        sa.ForeignKeyConstraint(
            ["recorrencia_id"], ["recorrencia.id"], name=op.f("fk_custo_recorrencia_id_recorrencia")
        ),
        sa.ForeignKeyConstraint(
            ["registro_estoque_id"],
            ["registro_estoque.id"],
            name=op.f("fk_custo_registro_estoque_id_registro_estoque"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_custo")),
    )
    op.create_index(
        op.f("ix_custo_fornecedor_id_data_compra"),
        "custo",
        ["fornecedor_id", "data_compra"],
        unique=False,
    )
    op.create_index(op.f("ix_custo_nota_fiscal_id"), "custo", ["nota_fiscal_id"], unique=False)
    op.create_index(
        op.f("ix_custo_registro_estoque_id_natureza"),
        "custo",
        ["registro_estoque_id", "natureza"],
        unique=False,
    )
    op.create_index(
        op.f("ix_custo_situacao_pagamento_data_vencimento"),
        "custo",
        ["situacao_pagamento", "data_vencimento"],
        unique=False,
    )
    op.create_table(
        "pesagem",
        sa.Column("id", sa.Integer(), sa.Identity(always=False), nullable=False),
        sa.Column("animal_id", sa.Integer(), nullable=False),
        sa.Column("data_pesagem", sa.Date(), nullable=False),
        sa.Column("peso_kg", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("observacao", sa.String(length=200), nullable=True),
        sa.CheckConstraint("peso_kg > 0", name=op.f("ck_pesagem_peso")),
        sa.ForeignKeyConstraint(
            ["animal_id"], ["animal.id"], name=op.f("fk_pesagem_animal_id_animal")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_pesagem")),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table("pesagem")
    op.drop_index(op.f("ix_custo_situacao_pagamento_data_vencimento"), table_name="custo")
    op.drop_index(op.f("ix_custo_registro_estoque_id_natureza"), table_name="custo")
    op.drop_index(op.f("ix_custo_nota_fiscal_id"), table_name="custo")
    op.drop_index(op.f("ix_custo_fornecedor_id_data_compra"), table_name="custo")
    op.drop_table("custo")
    op.drop_index(op.f("ix_animal_venda_id"), table_name="animal")
    op.drop_index(op.f("ix_animal_registro_estoque_id"), table_name="animal")
    op.drop_index(op.f("ix_animal_pasto_id"), table_name="animal")
    op.drop_table("animal")
    op.drop_index(op.f("ix_venda_registro_estoque_id_data_venda"), table_name="venda")
    op.drop_table("venda")
    op.drop_index(op.f("ix_recorrencia_registro_estoque_id"), table_name="recorrencia")
    op.drop_table("recorrencia")
    op.drop_table("oferta_frigorifico")
    op.drop_index(op.f("ix_nota_fiscal_propriedade_id_data_compra"), table_name="nota_fiscal")
    op.drop_index(op.f("ix_nota_fiscal_fornecedor_id"), table_name="nota_fiscal")
    op.drop_table("nota_fiscal")
    op.drop_index(
        op.f("ix_movimentacao_estoque_registro_estoque_id_data_movimentacao"),
        table_name="movimentacao_estoque",
    )
    op.drop_table("movimentacao_estoque")
    op.drop_index(op.f("ix_usuario_propriedade_propriedade_id"), table_name="usuario_propriedade")
    op.drop_table("usuario_propriedade")
    op.drop_index(
        op.f("ix_registro_estoque_propriedade_id_situacao_producao"), table_name="registro_estoque"
    )
    op.drop_table("registro_estoque")
    op.drop_table("pasto")
    op.drop_table("fornecedor")
    op.drop_index(op.f("ix_cotacao_propriedade_id_praca_data_cotacao"), table_name="cotacao")
    op.drop_table("cotacao")
    op.drop_index(
        op.f("ix_correcao_justificada_entidade_entidade_id"), table_name="correcao_justificada"
    )
    op.drop_table("correcao_justificada")
    op.drop_index(op.f("ix_convite_propriedade_propriedade_id"), table_name="convite_propriedade")
    op.drop_table("convite_propriedade")
    op.drop_table("comprador")
    op.drop_table("categoria_custo")
    op.drop_table("recuperacao_senha")
    op.drop_table("propriedade")
    op.drop_table("usuario")
