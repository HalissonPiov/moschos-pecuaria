from enum import StrEnum


class NaturezaCusto(StrEnum):
    """Previsto não compõe o custo acumulado (RN11); realizado compõe (RN10)."""

    PREVISTO = "previsto"
    REALIZADO = "realizado"


class SituacaoPagamento(StrEnum):
    """Só se aplica a custo realizado (RN12)."""

    A_PAGAR = "a_pagar"
    PAGO = "pago"


class Periodicidade(StrEnum):
    """Periodicidade de um custo recorrente (RF13, RN14)."""

    SEMANAL = "semanal"
    QUINZENAL = "quinzenal"
    MENSAL = "mensal"
    BIMESTRAL = "bimestral"
    TRIMESTRAL = "trimestral"
    SEMESTRAL = "semestral"
    ANUAL = "anual"
