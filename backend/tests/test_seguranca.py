"""Senha e tokens (RNF04, ADR 0001), sem banco."""

from datetime import UTC, datetime, timedelta

import jwt
import pytest

from app.core.config import get_settings
from app.core.security import (
    TokenInvalido,
    criar_token,
    gerar_hash_senha,
    ler_token,
    verificar_senha,
)


def test_hash_usa_argon2id_e_nao_guarda_a_senha() -> None:
    senha_hash = gerar_hash_senha("pasto-verde-2026")

    assert senha_hash.startswith("$argon2id$")
    assert "pasto-verde-2026" not in senha_hash
    assert verificar_senha("pasto-verde-2026", senha_hash)
    assert not verificar_senha("pasto-verde-2025", senha_hash)


def test_sem_usuario_a_verificacao_sempre_falha() -> None:
    assert not verificar_senha("qualquer-coisa", None)


@pytest.mark.parametrize("tipo", ["access", "refresh"])
def test_token_devolve_o_usuario(tipo: str) -> None:
    assert ler_token(criar_token(42, tipo), tipo) == 42  # type: ignore[arg-type]


def test_token_de_acesso_vale_15_minutos_e_o_de_renovacao_7_dias() -> None:
    agora = datetime(2026, 11, 22, 12, 0, tzinfo=UTC)
    segredo = get_settings().secret_key

    acesso = jwt.decode(criar_token(1, "access", agora), segredo, algorithms=["HS256"],
                        options={"verify_exp": False})  # fmt: skip
    renovacao = jwt.decode(criar_token(1, "refresh", agora), segredo, algorithms=["HS256"],
                           options={"verify_exp": False})  # fmt: skip

    assert acesso["exp"] - acesso["iat"] == 15 * 60
    assert renovacao["exp"] - renovacao["iat"] == 7 * 24 * 60 * 60


def test_token_de_um_tipo_nao_serve_como_o_outro() -> None:
    with pytest.raises(TokenInvalido):
        ler_token(criar_token(1, "refresh"), "access")
    with pytest.raises(TokenInvalido):
        ler_token(criar_token(1, "access"), "refresh")


def test_token_expirado_e_recusado() -> None:
    ontem = datetime.now(UTC) - timedelta(days=1)

    with pytest.raises(TokenInvalido):
        ler_token(criar_token(1, "access", ontem), "access")


def test_token_assinado_com_outra_chave_e_recusado() -> None:
    falso = jwt.encode(
        {"sub": "1", "typ": "access", "exp": datetime.now(UTC) + timedelta(minutes=5)},
        "outra-chave-com-tamanho-suficiente-para-hs256",
        algorithm="HS256",
    )

    with pytest.raises(TokenInvalido):
        ler_token(falso, "access")


@pytest.mark.parametrize("token", ["", "abc", "a.b.c"])
def test_token_malformado_e_recusado(token: str) -> None:
    with pytest.raises(TokenInvalido):
        ler_token(token, "access")
