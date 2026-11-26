"""Propriedades do usuário (RF32, RF33, RN35, RN36) e propriedade ativa (ADR 0002)."""

from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentMembership, CurrentUser, DbSession
from app.api.v1.schemas.properties import NovaPropriedadeIn, PropriedadeCriadaOut, PropriedadeOut
from app.application.properties.casos_de_uso import (
    NovaPropriedade,
    TermoDesatualizado,
    cadastrar_propriedade,
    listar_propriedades,
)
from app.domain.costs.categorias import CATEGORIAS_SUGERIDAS

router = APIRouter(prefix="/properties")


@router.get("", summary="Lista as propriedades ativas do usuário")
def list_properties(usuario: CurrentUser, db: DbSession) -> list[PropriedadeOut]:
    return [PropriedadeOut.de(membro) for membro in listar_propriedades(db, usuario.id)]


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    summary="Cadastra uma propriedade com a declaração do papel",
)
def create_property(
    dados: NovaPropriedadeIn, usuario: CurrentUser, db: DbSession
) -> PropriedadeCriadaOut:
    try:
        membro = cadastrar_propriedade(
            db,
            usuario.id,
            NovaPropriedade(
                nome=dados.nome,
                municipio=dados.municipio,
                uf=dados.uf,
                area_hectares=dados.area_hectares,
                titular_nome=dados.titular_nome,
                papel=dados.papel,
                versao_termo=dados.versao_termo,
            ),
        )
    except TermoDesatualizado:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="O termo de declaração mudou. Leia a versão atual e aceite de novo.",
        ) from None
    return PropriedadeCriadaOut(
        **PropriedadeOut.de(membro).model_dump(), categorias_criadas=list(CATEGORIAS_SUGERIDAS)
    )


@router.get("/{property_id}", summary="Consulta a propriedade ativa")
def get_property(membro: CurrentMembership) -> PropriedadeOut:
    return PropriedadeOut.de(membro)
