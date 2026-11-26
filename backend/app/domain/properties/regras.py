"""Regras de propriedade e titularidade (RF32, RN35, RN36)."""

from collections.abc import Iterable
from enum import StrEnum

from app.domain.properties.enums import PapelPropriedade

# Versão do texto do termo de declaração exibido no cadastro. Muda quando o texto mudar.
VERSAO_TERMO_ATUAL = "1.0"

UFS: tuple[str, ...] = (
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
    "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
)  # fmt: skip


class Titularidade(StrEnum):
    """Como a titularidade é exibida (RN36)."""

    CONFIRMADA = "confirmada"
    DECLARADA_POR_GESTOR = "declarada_por_gestor"


def titularidade(papeis_dos_membros: Iterable[PapelPropriedade]) -> Titularidade:
    """Confirmada quando há ao menos um membro proprietário; senão, declarada por gestor."""
    if PapelPropriedade.PROPRIETARIO in set(papeis_dos_membros):
        return Titularidade.CONFIRMADA
    return Titularidade.DECLARADA_POR_GESTOR
