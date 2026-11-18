from enum import StrEnum


class ModoRegistro(StrEnum):
    """Forma de cadastro do registro de estoque (RF03, RN01)."""

    INDIVIDUAL = "individual"
    LOTE = "lote"


class OrigemRegistro(StrEnum):
    NASCIMENTO = "nascimento"
    AQUISICAO = "aquisicao"


class SituacaoProducao(StrEnum):
    """Decisão do produtor gravada no registro (RN02, ADR 0003).

    "Parcialmente vendido", "Vendido" e "Encerrado" não são gravados: são derivados.
    """

    EM_PRODUCAO = "em_producao"
    PRONTO_PARA_VENDA = "pronto_para_venda"


class Sexo(StrEnum):
    MACHO = "macho"
    FEMEA = "femea"


class TipoMovimentacao(StrEnum):
    """Eventos que alteram o saldo sem gerar receita (RF07)."""

    ENTRADA = "entrada"
    BAIXA_MORTE = "baixa_morte"
    BAIXA_DESCARTE = "baixa_descarte"
