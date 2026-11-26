from sqlalchemy import select
from sqlalchemy.orm import Session

from app.infrastructure.database.models import Usuario


class UsuarioRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def por_id(self, usuario_id: int) -> Usuario | None:
        return self.session.get(Usuario, usuario_id)

    def por_email(self, email: str) -> Usuario | None:
        return self.session.scalar(select(Usuario).where(Usuario.email == email))

    def adicionar(self, usuario: Usuario) -> Usuario:
        self.session.add(usuario)
        self.session.flush()
        return usuario
