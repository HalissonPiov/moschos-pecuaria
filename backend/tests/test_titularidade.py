"""RN36 e normalização do e-mail, sem banco."""

from app.domain.identity.regras import normalizar_email
from app.domain.properties.enums import PapelPropriedade
from app.domain.properties.regras import Titularidade, titularidade

P, G = PapelPropriedade.PROPRIETARIO, PapelPropriedade.GESTOR


def test_titularidade_confirmada_com_ao_menos_um_proprietario() -> None:
    assert titularidade([P]) is Titularidade.CONFIRMADA
    assert titularidade([G, P, G]) is Titularidade.CONFIRMADA


def test_titularidade_declarada_por_gestor_sem_proprietario() -> None:
    assert titularidade([G]) is Titularidade.DECLARADA_POR_GESTOR
    assert titularidade([G, G]) is Titularidade.DECLARADA_POR_GESTOR


def test_email_e_comparado_sem_espacos_e_sem_maiusculas() -> None:
    assert normalizar_email("  Joao.Batista@Fazenda.COM ") == "joao.batista@fazenda.com"
