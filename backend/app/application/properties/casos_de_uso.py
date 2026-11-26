"""Cadastro, lista e acesso às propriedades do usuário (RF32, RF33, RN31, RN35, RN36)."""

from dataclasses import dataclass
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy.orm import Session

from app.domain.costs.categorias import CATEGORIAS_SUGERIDAS
from app.domain.properties.enums import PapelPropriedade
from app.domain.properties.regras import VERSAO_TERMO_ATUAL, Titularidade, titularidade
from app.infrastructure.database.models import Propriedade, UsuarioPropriedade
from app.infrastructure.repositories.propriedades import PropriedadeRepository


class TermoDesatualizado(Exception):
    """O front-end mostrou uma versão do termo diferente da atual."""


@dataclass(frozen=True)
class NovaPropriedade:
    nome: str
    municipio: str
    uf: str
    area_hectares: Decimal | None
    titular_nome: str
    papel: PapelPropriedade
    versao_termo: str


@dataclass(frozen=True)
class PropriedadeDoUsuario:
    """A propriedade vista por um membro: com o papel dele e a titularidade (RN36)."""

    propriedade: Propriedade
    vinculo: UsuarioPropriedade
    titularidade: Titularidade


def cadastrar_propriedade(
    session: Session, usuario_id: int, dados: NovaPropriedade
) -> PropriedadeDoUsuario:
    """Cria a propriedade, o vínculo com o papel declarado e as categorias sugeridas (RF11)."""
    if dados.versao_termo != VERSAO_TERMO_ATUAL:
        raise TermoDesatualizado
    propriedade = Propriedade(
        nome=dados.nome,
        municipio=dados.municipio,
        uf=dados.uf,
        area_hectares=dados.area_hectares,
        titular_nome=dados.titular_nome,
        cadastrada_por=usuario_id,
    )
    vinculo = UsuarioPropriedade(
        usuario_id=usuario_id,
        papel=dados.papel,
        aceite_declaracao_em=datetime.now(UTC),
        versao_termo=dados.versao_termo,
    )
    PropriedadeRepository(session).adicionar(propriedade, vinculo, CATEGORIAS_SUGERIDAS)
    session.commit()
    session.refresh(propriedade)
    return PropriedadeDoUsuario(propriedade, vinculo, titularidade([dados.papel]))


def listar_propriedades(session: Session, usuario_id: int) -> list[PropriedadeDoUsuario]:
    """Propriedades ativas às quais o usuário está vinculado."""
    repositorio = PropriedadeRepository(session)
    linhas = repositorio.ativas_do_usuario(usuario_id)
    papeis = repositorio.papeis_dos_membros([p.id for p, _ in linhas])
    return [PropriedadeDoUsuario(p, v, titularidade(papeis[p.id])) for p, v in linhas]


def obter_propriedade(
    session: Session, usuario_id: int, propriedade_id: int
) -> PropriedadeDoUsuario | None:
    """A propriedade, se o usuário for membro e ela estiver ativa; senão None (ADR 0002)."""
    repositorio = PropriedadeRepository(session)
    linha = repositorio.vinculo_ativo(usuario_id, propriedade_id)
    if linha is None:
        return None
    propriedade, vinculo = linha
    papeis = repositorio.papeis_dos_membros([propriedade.id])
    return PropriedadeDoUsuario(propriedade, vinculo, titularidade(papeis[propriedade.id]))
