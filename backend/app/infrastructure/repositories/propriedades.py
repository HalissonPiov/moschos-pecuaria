from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.properties.enums import PapelPropriedade
from app.infrastructure.database.models import CategoriaCusto, Propriedade, UsuarioPropriedade


class PropriedadeRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def vinculo_ativo(
        self, usuario_id: int, propriedade_id: int
    ) -> tuple[Propriedade, UsuarioPropriedade] | None:
        """Propriedade ativa e o vínculo do usuário com ela, ou None (ADR 0002)."""
        linha = self.session.execute(
            select(Propriedade, UsuarioPropriedade)
            .join(UsuarioPropriedade, UsuarioPropriedade.propriedade_id == Propriedade.id)
            .where(
                UsuarioPropriedade.usuario_id == usuario_id,
                Propriedade.id == propriedade_id,
                Propriedade.ativa.is_(True),
            )
        ).one_or_none()
        return None if linha is None else (linha[0], linha[1])

    def ativas_do_usuario(self, usuario_id: int) -> list[tuple[Propriedade, UsuarioPropriedade]]:
        linhas = self.session.execute(
            select(Propriedade, UsuarioPropriedade)
            .join(UsuarioPropriedade, UsuarioPropriedade.propriedade_id == Propriedade.id)
            .where(UsuarioPropriedade.usuario_id == usuario_id, Propriedade.ativa.is_(True))
            .order_by(Propriedade.nome, Propriedade.id)
        ).all()
        return [(linha[0], linha[1]) for linha in linhas]

    def papeis_dos_membros(
        self, propriedade_ids: Sequence[int]
    ) -> dict[int, list[PapelPropriedade]]:
        """Papéis de todos os membros de cada propriedade (para a RN36)."""
        papeis: dict[int, list[PapelPropriedade]] = {pid: [] for pid in propriedade_ids}
        if not propriedade_ids:
            return papeis
        linhas = self.session.execute(
            select(UsuarioPropriedade.propriedade_id, UsuarioPropriedade.papel).where(
                UsuarioPropriedade.propriedade_id.in_(propriedade_ids)
            )
        ).all()
        for propriedade_id, papel in linhas:
            papeis[propriedade_id].append(papel)
        return papeis

    def adicionar(
        self,
        propriedade: Propriedade,
        vinculo: UsuarioPropriedade,
        categorias: Sequence[str],
    ) -> Propriedade:
        """Grava a propriedade, o vínculo de quem cadastrou e as categorias sugeridas."""
        self.session.add(propriedade)
        self.session.flush()
        vinculo.propriedade_id = propriedade.id
        self.session.add(vinculo)
        self.session.add_all(
            CategoriaCusto(propriedade_id=propriedade.id, nome=nome, sugerida=True)
            for nome in categorias
        )
        self.session.flush()
        return propriedade
