from enum import StrEnum


class PapelPropriedade(StrEnum):
    """Papel declarado do usuário em uma propriedade (RN35, RN37)."""

    PROPRIETARIO = "proprietario"
    GESTOR = "gestor"
