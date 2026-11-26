"""Cadastro, login, renovação e logout pela API (RF01, RF02, RNF04, ADR 0001)."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import NOME_COOKIE_REFRESH, criar_token
from app.infrastructure.database.models import Usuario

pytestmark = pytest.mark.db

CONTA = {"nome": "João Batista", "email": "joao@exemplo.com", "senha": "pasto-verde-2026"}


def cadastrar(api: TestClient, **dados: str):
    return api.post("/api/v1/auth/register", json={**CONTA, **dados})


def test_cadastro_cria_conta_ativa_e_abre_a_sessao(api: TestClient, session: Session) -> None:
    resposta = cadastrar(api, email="  Joao@Exemplo.COM ")

    assert resposta.status_code == 201
    corpo = resposta.json()
    assert corpo["token_type"] == "bearer"
    assert corpo["expires_in"] == 15 * 60
    assert corpo["usuario"]["nome"] == "João Batista"
    assert corpo["usuario"]["email"] == "joao@exemplo.com"
    usuario = session.scalar(select(Usuario).where(Usuario.email == "joao@exemplo.com"))
    assert usuario is not None and usuario.ativo
    assert usuario.senha_hash.startswith("$argon2id$")


def test_cookie_de_renovacao_segue_o_adr_0001(api: TestClient) -> None:
    cookie = cadastrar(api).headers["set-cookie"]

    assert cookie.startswith(f"{NOME_COOKIE_REFRESH}=")
    assert "HttpOnly" in cookie
    assert "SameSite=strict" in cookie
    assert "Path=/api/v1/auth" in cookie
    assert "Max-Age=604800" in cookie


def test_email_repetido_e_recusado_sem_diferenciar_maiusculas(api: TestClient) -> None:
    cadastrar(api)

    resposta = cadastrar(api, email="JOAO@exemplo.com")

    assert resposta.status_code == 409
    assert resposta.json()["detail"].startswith("Já existe uma conta com este e-mail")


@pytest.mark.parametrize(
    "dados",
    [{"senha": "curta"}, {"email": "sem-arroba"}, {"nome": "   "}],
    ids=["senha-curta", "email-invalido", "nome-vazio"],
)
def test_cadastro_valida_os_campos(api: TestClient, dados: dict[str, str]) -> None:
    assert cadastrar(api, **dados).status_code == 422


def test_login_com_senha_certa_abre_a_sessao(api: TestClient) -> None:
    cadastrar(api)

    resposta = api.post(
        "/api/v1/auth/login", json={"email": "JOAO@exemplo.com", "senha": CONTA["senha"]}
    )

    assert resposta.status_code == 200
    assert resposta.json()["usuario"]["email"] == "joao@exemplo.com"
    assert NOME_COOKIE_REFRESH in resposta.cookies


@pytest.mark.parametrize(
    "credenciais",
    [
        {"email": "joao@exemplo.com", "senha": "senha-errada-123"},
        {"email": "ninguem@exemplo.com", "senha": "pasto-verde-2026"},
    ],
    ids=["senha-errada", "email-inexistente"],
)
def test_login_recusado_nao_revela_se_o_email_existe(
    api: TestClient, credenciais: dict[str, str]
) -> None:
    cadastrar(api)

    resposta = api.post("/api/v1/auth/login", json=credenciais)

    assert resposta.status_code == 401
    assert resposta.json() == {"detail": "E-mail ou senha incorretos."}


def test_conta_inativa_nao_entra(api: TestClient, session: Session) -> None:
    cadastrar(api)
    session.scalar(select(Usuario).where(Usuario.email == CONTA["email"])).ativo = False
    session.flush()

    resposta = api.post(
        "/api/v1/auth/login", json={"email": CONTA["email"], "senha": CONTA["senha"]}
    )

    assert resposta.status_code == 401


def test_renovacao_pelo_cookie_devolve_novo_token(api: TestClient) -> None:
    cadastrar(api)  # o TestClient guarda o cookie

    resposta = api.post("/api/v1/auth/refresh")

    assert resposta.status_code == 200
    token = resposta.json()["access_token"]
    assert (
        api.get("/api/v1/properties", headers={"Authorization": f"Bearer {token}"}).status_code
        == 200
    )


def test_renovacao_sem_cookie_pede_login(api: TestClient) -> None:
    resposta = api.post("/api/v1/auth/refresh")

    assert resposta.status_code == 401
    assert resposta.json() == {"detail": "Sua sessão expirou. Entre novamente."}


def test_token_de_acesso_nao_serve_como_cookie_de_renovacao(api: TestClient) -> None:
    usuario_id = cadastrar(api).json()["usuario"]["id"]
    api.cookies.clear()
    api.cookies.set(NOME_COOKIE_REFRESH, criar_token(usuario_id, "access"))

    resposta = api.post("/api/v1/auth/refresh")

    assert resposta.status_code == 401


def test_cookie_de_renovacao_nao_serve_como_token_de_acesso(api: TestClient) -> None:
    usuario_id = cadastrar(api).json()["usuario"]["id"]
    renovacao = criar_token(usuario_id, "refresh")

    resposta = api.get("/api/v1/properties", headers={"Authorization": f"Bearer {renovacao}"})

    assert resposta.status_code == 401


def test_logout_apaga_o_cookie(api: TestClient) -> None:
    cadastrar(api)

    resposta = api.post("/api/v1/auth/logout")

    assert resposta.status_code == 204
    cookie = resposta.headers["set-cookie"]
    assert cookie.startswith(f'{NOME_COOKIE_REFRESH}=""') or "Max-Age=0" in cookie
    assert "Path=/api/v1/auth" in cookie
    assert api.post("/api/v1/auth/refresh").status_code == 401
