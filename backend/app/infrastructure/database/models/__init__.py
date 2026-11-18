"""Modelos SQLAlchemy. Importar este pacote registra todas as tabelas no metadata."""

from app.infrastructure.database.models.acesso import (
    ConvitePropriedade,
    Propriedade,
    RecuperacaoSenha,
    Usuario,
    UsuarioPropriedade,
)
from app.infrastructure.database.models.auditoria import CorrecaoJustificada
from app.infrastructure.database.models.custos import (
    CategoriaCusto,
    Custo,
    Fornecedor,
    NotaFiscal,
    Recorrencia,
)
from app.infrastructure.database.models.estoque import (
    Animal,
    MovimentacaoEstoque,
    Pasto,
    Pesagem,
    RegistroEstoque,
)
from app.infrastructure.database.models.mercado import Cotacao
from app.infrastructure.database.models.vendas import Comprador, OfertaFrigorifico, Venda

__all__ = [
    "Animal",
    "CategoriaCusto",
    "Comprador",
    "ConvitePropriedade",
    "CorrecaoJustificada",
    "Cotacao",
    "Custo",
    "Fornecedor",
    "MovimentacaoEstoque",
    "NotaFiscal",
    "OfertaFrigorifico",
    "Pasto",
    "Pesagem",
    "Propriedade",
    "Recorrencia",
    "RecuperacaoSenha",
    "RegistroEstoque",
    "Usuario",
    "UsuarioPropriedade",
    "Venda",
]
