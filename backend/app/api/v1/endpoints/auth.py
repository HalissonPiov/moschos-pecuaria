"""Cadastro, login, renovação e logout (RF01, RF02, ADR 0001)."""

from typing import Annotated

from fastapi import APIRouter, Cookie, HTTPException, Response, status

from app.api.deps import NAO_AUTENTICADO, DbSession
from app.api.v1.schemas.auth import CadastroIn, LoginIn, SessaoOut, UsuarioOut
from app.application.identity.casos_de_uso import (
    CredenciaisInvalidas,
    EmailJaCadastrado,
    autenticar,
    cadastrar_usuario,
    usuario_ativo,
)
from app.core.config import get_settings
from app.core.security import (
    NOME_COOKIE_REFRESH,
    TokenInvalido,
    criar_token,
    ler_token,
    validade,
)
from app.infrastructure.database.models import Usuario

router = APIRouter(prefix="/auth")


def _caminho_cookie() -> str:
    return f"{get_settings().api_v1_prefix}/auth"


def _abrir_sessao(response: Response, usuario: Usuario) -> SessaoOut:
    """Grava o refresh token no cookie e devolve o token de acesso."""
    response.set_cookie(
        NOME_COOKIE_REFRESH,
        criar_token(usuario.id, "refresh"),
        max_age=int(validade("refresh").total_seconds()),
        path=_caminho_cookie(),
        httponly=True,
        secure=get_settings().cookie_secure,
        samesite="strict",
    )
    return SessaoOut(
        access_token=criar_token(usuario.id, "access"),
        expires_in=int(validade("access").total_seconds()),
        usuario=UsuarioOut(id=usuario.id, nome=usuario.nome, email=usuario.email),
    )


@router.post(
    "/register",
    status_code=status.HTTP_201_CREATED,
    summary="Cria a conta e já abre a sessão",
)
def register(dados: CadastroIn, response: Response, db: DbSession) -> SessaoOut:
    try:
        usuario = cadastrar_usuario(db, dados.nome, dados.email, dados.senha)
    except EmailJaCadastrado:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Já existe uma conta com este e-mail. Entre ou use outro e-mail.",
        ) from None
    return _abrir_sessao(response, usuario)


@router.post("/login", summary="Entra com e-mail e senha")
def login(dados: LoginIn, response: Response, db: DbSession) -> SessaoOut:
    try:
        usuario = autenticar(db, dados.email, dados.senha)
    except CredenciaisInvalidas:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha incorretos.",
        ) from None
    return _abrir_sessao(response, usuario)


@router.post("/refresh", summary="Renova o token de acesso pelo cookie")
def refresh(
    db: DbSession,
    refresh_token: Annotated[str | None, Cookie(alias=NOME_COOKIE_REFRESH)] = None,
) -> SessaoOut:
    if refresh_token is None:
        raise NAO_AUTENTICADO
    try:
        usuario_id = ler_token(refresh_token, "refresh")
    except TokenInvalido:
        raise NAO_AUTENTICADO from None
    usuario = usuario_ativo(db, usuario_id)
    if usuario is None:
        raise NAO_AUTENTICADO
    return SessaoOut(
        access_token=criar_token(usuario.id, "access"),
        expires_in=int(validade("access").total_seconds()),
        usuario=UsuarioOut(id=usuario.id, nome=usuario.nome, email=usuario.email),
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT, summary="Encerra a sessão")
def logout(response: Response) -> None:
    response.delete_cookie(
        NOME_COOKIE_REFRESH,
        path=_caminho_cookie(),
        httponly=True,
        secure=get_settings().cookie_secure,
        samesite="strict",
    )
