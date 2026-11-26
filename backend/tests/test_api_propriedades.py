"""Propriedades, declaração e isolamento (RF32, RF33, RN31, RN35, RN36, RNF05, ADR 0002)."""

from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.costs.categorias import CATEGORIAS_SUGERIDAS
from app.domain.properties.enums import PapelPropriedade
from app.infrastructure.database.models import CategoriaCusto, Propriedade, UsuarioPropriedade

pytestmark = pytest.mark.db

NOVA = {
    "nome": "Fazenda da Baixada",
    "municipio": "Piedade de Ponte Nova",
    "uf": "MG",
    "area_hectares": "70",
    "titular_nome": "João Batista e Maria Aparecida Batista",
    "papel": "proprietario",
    "aceite_termo": True,
    "versao_termo": "1.0",
}


def entrar(api: TestClient, email: str) -> dict[str, str]:
    """Cria uma conta e devolve o cabeçalho com o token de acesso dela."""
    resposta = api.post(
        "/api/v1/auth/register",
        json={"nome": email.split("@")[0].title(), "email": email, "senha": "pasto-verde-2026"},
    )
    assert resposta.status_code == 201
    return {"Authorization": f"Bearer {resposta.json()['access_token']}"}


def cadastrar(api: TestClient, cabecalho: dict[str, str], **dados: object) -> dict:
    resposta = api.post("/api/v1/properties", json={**NOVA, **dados}, headers=cabecalho)
    assert resposta.status_code == 201, resposta.text
    return resposta.json()


def test_cadastro_grava_propriedade_vinculo_e_categorias(api: TestClient, session: Session) -> None:
    joao = entrar(api, "joao@exemplo.com")

    corpo = cadastrar(api, joao)

    assert corpo["nome"] == "Fazenda da Baixada"
    assert corpo["area_hectares"] == "70.00"
    assert corpo["papel"] == "proprietario"
    assert corpo["titularidade"] == "confirmada"
    assert corpo["versao_termo"] == "1.0"
    assert corpo["rendimento_carcaca_pct"] == "50.00"  # ADR 0007
    assert corpo["praca_padrao"] == "Minas Gerais"
    assert corpo["categorias_criadas"] == list(CATEGORIAS_SUGERIDAS)

    propriedade = session.get(Propriedade, corpo["id"])
    vinculo = session.scalar(
        select(UsuarioPropriedade).where(UsuarioPropriedade.propriedade_id == corpo["id"])
    )
    assert propriedade.cadastrada_por == vinculo.usuario_id
    assert vinculo.papel is PapelPropriedade.PROPRIETARIO
    assert abs(datetime.now(UTC) - vinculo.aceite_declaracao_em).total_seconds() < 60
    categorias = session.scalars(
        select(CategoriaCusto.nome).where(
            CategoriaCusto.propriedade_id == corpo["id"], CategoriaCusto.sugerida.is_(True)
        )
    ).all()
    assert sorted(categorias) == sorted(CATEGORIAS_SUGERIDAS)


def test_gestor_cadastra_com_titularidade_declarada(api: TestClient) -> None:
    ana = entrar(api, "ana@exemplo.com")

    corpo = cadastrar(api, ana, papel="gestor", titular_nome="Geraldo Fonseca", area_hectares=None)

    assert corpo["titularidade"] == "declarada_por_gestor"
    assert corpo["area_hectares"] is None


def test_titularidade_fica_confirmada_quando_um_proprietario_entra(
    api: TestClient, session: Session
) -> None:
    ana = entrar(api, "ana@exemplo.com")
    joao = entrar(api, "joao@exemplo.com")
    propriedade_id = cadastrar(api, ana, papel="gestor")["id"]
    joao_id = api.post("/api/v1/auth/refresh").json()["usuario"]["id"]
    # O convite (A5) ainda não existe: o vínculo do proprietário é criado direto no banco.
    session.add(
        UsuarioPropriedade(
            usuario_id=joao_id,
            propriedade_id=propriedade_id,
            papel=PapelPropriedade.PROPRIETARIO,
            aceite_declaracao_em=datetime.now(UTC),
            versao_termo="1.0",
        )
    )
    session.flush()

    vista_pela_ana = api.get(f"/api/v1/properties/{propriedade_id}", headers=ana).json()
    vista_pelo_joao = api.get(f"/api/v1/properties/{propriedade_id}", headers=joao).json()

    assert vista_pela_ana["titularidade"] == "confirmada"
    assert vista_pela_ana["papel"] == "gestor"
    assert vista_pelo_joao["papel"] == "proprietario"


@pytest.mark.parametrize(
    "alteracao",
    [
        {"aceite_termo": False},
        {"titular_nome": "  "},
        {"nome": ""},
        {"municipio": ""},
        {"uf": "XX"},
        {"area_hectares": "0"},
        {"area_hectares": "-5"},
        {"papel": "dono"},
    ],
    ids=["sem-aceite", "sem-titular", "sem-nome", "sem-municipio", "uf-invalida",
         "area-zero", "area-negativa", "papel-invalido"],
)  # fmt: skip
def test_cadastro_valida_os_campos(api: TestClient, alteracao: dict[str, object]) -> None:
    joao = entrar(api, "joao@exemplo.com")

    resposta = api.post("/api/v1/properties", json={**NOVA, **alteracao}, headers=joao)

    assert resposta.status_code == 422


def test_cadastro_recusa_termo_de_outra_versao(api: TestClient) -> None:
    joao = entrar(api, "joao@exemplo.com")

    resposta = api.post("/api/v1/properties", json={**NOVA, "versao_termo": "0.9"}, headers=joao)

    assert resposta.status_code == 422
    assert "termo" in resposta.json()["detail"]


def test_lista_so_as_propriedades_ativas_do_proprio_usuario(
    api: TestClient, session: Session
) -> None:
    joao = entrar(api, "joao@exemplo.com")
    ana = entrar(api, "ana@exemplo.com")
    baixada = cadastrar(api, joao, nome="Fazenda da Baixada")["id"]
    inativa = cadastrar(api, joao, nome="Fazenda Boa Esperança")["id"]
    cadastrar(api, ana, nome="Sítio Serra Bonita", papel="gestor")
    session.get(Propriedade, inativa).ativa = False
    session.flush()

    lista = api.get("/api/v1/properties", headers=joao).json()

    assert [p["id"] for p in lista] == [baixada]


def test_usuario_novo_nao_tem_propriedades(api: TestClient) -> None:
    assert api.get("/api/v1/properties", headers=entrar(api, "novo@exemplo.com")).json() == []


# --- Isolamento (RNF05, ADR 0002) ---------------------------------------------------------


def test_membro_consulta_a_propriedade(api: TestClient) -> None:
    joao = entrar(api, "joao@exemplo.com")
    propriedade_id = cadastrar(api, joao)["id"]

    resposta = api.get(f"/api/v1/properties/{propriedade_id}", headers=joao)

    assert resposta.status_code == 200
    assert resposta.json()["id"] == propriedade_id


def test_usuario_de_outra_propriedade_recebe_404(api: TestClient) -> None:
    joao = entrar(api, "joao@exemplo.com")
    ana = entrar(api, "ana@exemplo.com")
    propriedade_do_joao = cadastrar(api, joao)["id"]
    cadastrar(api, ana, nome="Sítio Serra Bonita", papel="gestor")

    resposta = api.get(f"/api/v1/properties/{propriedade_do_joao}", headers=ana)

    assert resposta.status_code == 404
    assert resposta.json() == {"detail": "Propriedade não encontrada."}


def test_propriedade_inexistente_e_alheia_recebem_a_mesma_resposta(api: TestClient) -> None:
    joao = entrar(api, "joao@exemplo.com")
    ana = entrar(api, "ana@exemplo.com")
    propriedade_do_joao = cadastrar(api, joao)["id"]

    alheia = api.get(f"/api/v1/properties/{propriedade_do_joao}", headers=ana)
    inexistente = api.get("/api/v1/properties/999999", headers=ana)

    assert (alheia.status_code, alheia.json()) == (inexistente.status_code, inexistente.json())


def test_propriedade_inativa_recebe_404(api: TestClient, session: Session) -> None:
    joao = entrar(api, "joao@exemplo.com")
    propriedade_id = cadastrar(api, joao)["id"]
    session.get(Propriedade, propriedade_id).ativa = False
    session.flush()

    assert api.get(f"/api/v1/properties/{propriedade_id}", headers=joao).status_code == 404


@pytest.mark.parametrize(
    ("metodo", "caminho"),
    [("get", "/api/v1/properties"), ("post", "/api/v1/properties"),
     ("get", "/api/v1/properties/1")],
)  # fmt: skip
def test_sem_token_a_api_pede_login(api: TestClient, metodo: str, caminho: str) -> None:
    resposta = api.request(metodo, caminho, json=NOVA if metodo == "post" else None)

    assert resposta.status_code == 401
    assert resposta.headers["www-authenticate"] == "Bearer"
