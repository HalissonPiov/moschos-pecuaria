from typing import Annotated, Literal

from pydantic import BaseModel, EmailStr, Field, StringConstraints

from app.domain.identity.regras import SENHA_TAMANHO_MAXIMO, SENHA_TAMANHO_MINIMO

Nome = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
Email = Annotated[EmailStr, Field(max_length=160)]


class CadastroIn(BaseModel):
    nome: Nome
    email: Email
    senha: Annotated[str, Field(min_length=SENHA_TAMANHO_MINIMO, max_length=SENHA_TAMANHO_MAXIMO)]


class LoginIn(BaseModel):
    email: Email
    senha: Annotated[str, Field(min_length=1, max_length=SENHA_TAMANHO_MAXIMO)]


class UsuarioOut(BaseModel):
    id: int
    nome: str
    email: str


class SessaoOut(BaseModel):
    """Token de acesso (fica só em memória no front-end) e o usuário da sessão."""

    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int
    usuario: UsuarioOut
