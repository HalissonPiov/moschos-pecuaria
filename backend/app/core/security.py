"""Senhas e tokens (RNF04, ADR 0001).

A senha é guardada com Argon2id (pwdlib). O acesso usa dois JWT assinados com
SECRET_KEY (HS256): o de acesso, curto, enviado no cabeçalho Authorization, e o de
renovação, longo, que só trafega no cookie HttpOnly de /api/v1/auth.
"""

from datetime import UTC, datetime, timedelta
from functools import lru_cache
from typing import Literal

import jwt
from pwdlib import PasswordHash

from app.core.config import get_settings

TipoToken = Literal["access", "refresh"]
ALGORITMO = "HS256"
NOME_COOKIE_REFRESH = "moschos_refresh"

_hasher = PasswordHash.recommended()


class TokenInvalido(Exception):
    """Token ausente, adulterado, expirado ou de outro tipo."""


def gerar_hash_senha(senha: str) -> str:
    return _hasher.hash(senha)


@lru_cache
def _hash_ficticio() -> str:
    return _hasher.hash("senha-ficticia-para-tempo-constante")


def verificar_senha(senha: str, senha_hash: str | None) -> bool:
    """Confere a senha. Sem usuário, verifica um hash fictício para gastar o mesmo tempo
    e não revelar pelo tempo de resposta se o e-mail existe."""
    if senha_hash is None:
        _hasher.verify(senha, _hash_ficticio())
        return False
    return _hasher.verify(senha, senha_hash)


def validade(tipo: TipoToken) -> timedelta:
    settings = get_settings()
    if tipo == "access":
        return timedelta(minutes=settings.access_token_minutes)
    return timedelta(days=settings.refresh_token_days)


def criar_token(usuario_id: int, tipo: TipoToken, agora: datetime | None = None) -> str:
    emitido = agora or datetime.now(UTC)
    payload = {
        "sub": str(usuario_id),
        "typ": tipo,
        "iat": emitido,
        "exp": emitido + validade(tipo),
    }
    return jwt.encode(payload, get_settings().secret_key, algorithm=ALGORITMO)


def ler_token(token: str, tipo: TipoToken) -> int:
    """Devolve o id do usuário do token, ou lança TokenInvalido."""
    try:
        payload = jwt.decode(
            token,
            get_settings().secret_key,
            algorithms=[ALGORITMO],
            options={"require": ["sub", "typ", "exp"]},
        )
    except jwt.PyJWTError as erro:
        raise TokenInvalido from erro
    if payload["typ"] != tipo:
        raise TokenInvalido
    try:
        return int(payload["sub"])
    except ValueError as erro:
        raise TokenInvalido from erro
