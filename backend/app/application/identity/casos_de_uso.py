"""Cadastro e login de usuários (RF01)."""

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import gerar_hash_senha, verificar_senha
from app.domain.identity.regras import normalizar_email
from app.infrastructure.database.models import Usuario
from app.infrastructure.repositories.usuarios import UsuarioRepository


class EmailJaCadastrado(Exception):
    pass


class CredenciaisInvalidas(Exception):
    """E-mail inexistente, senha errada ou conta inativa: a resposta é a mesma."""


def cadastrar_usuario(session: Session, nome: str, email: str, senha: str) -> Usuario:
    """Cria a conta já ativa. Não há confirmação de e-mail na v1.0 (divergência M1)."""
    repositorio = UsuarioRepository(session)
    email = normalizar_email(email)
    if repositorio.por_email(email) is not None:
        raise EmailJaCadastrado
    usuario = Usuario(nome=nome.strip(), email=email, senha_hash=gerar_hash_senha(senha))
    try:
        repositorio.adicionar(usuario)
        session.commit()
    except IntegrityError as erro:  # cadastro simultâneo com o mesmo e-mail
        session.rollback()
        raise EmailJaCadastrado from erro
    return usuario


def autenticar(session: Session, email: str, senha: str) -> Usuario:
    usuario = UsuarioRepository(session).por_email(normalizar_email(email))
    senha_ok = verificar_senha(senha, usuario.senha_hash if usuario else None)
    if usuario is None or not senha_ok or not usuario.ativo:
        raise CredenciaisInvalidas
    return usuario


def usuario_ativo(session: Session, usuario_id: int) -> Usuario | None:
    usuario = UsuarioRepository(session).por_id(usuario_id)
    return usuario if usuario is not None and usuario.ativo else None
