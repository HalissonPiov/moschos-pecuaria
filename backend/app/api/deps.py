from typing import Annotated

from fastapi import Depends, HTTPException, Path, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.application.identity.casos_de_uso import usuario_ativo
from app.application.properties.casos_de_uso import PropriedadeDoUsuario, obter_propriedade
from app.core.security import TokenInvalido, ler_token
from app.infrastructure.database.models import Usuario
from app.infrastructure.database.session import get_db

DbSession = Annotated[Session, Depends(get_db)]

_bearer = HTTPBearer(auto_error=False)

NAO_AUTENTICADO = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Sua sessão expirou. Entre novamente.",
    headers={"WWW-Authenticate": "Bearer"},
)
PROPRIEDADE_NAO_ENCONTRADA = HTTPException(
    status_code=status.HTTP_404_NOT_FOUND, detail="Propriedade não encontrada."
)


def get_current_user(
    db: DbSession,
    credenciais: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> Usuario:
    """Usuário do token de acesso (ADR 0001). Sem token válido ou com conta inativa: 401."""
    if credenciais is None:
        raise NAO_AUTENTICADO
    try:
        usuario_id = ler_token(credenciais.credentials, "access")
    except TokenInvalido:
        raise NAO_AUTENTICADO from None
    usuario = usuario_ativo(db, usuario_id)
    if usuario is None:
        raise NAO_AUTENTICADO
    return usuario


CurrentUser = Annotated[Usuario, Depends(get_current_user)]


def get_current_membership(
    db: DbSession,
    usuario: CurrentUser,
    property_id: Annotated[int, Path(gt=0)],
) -> PropriedadeDoUsuario:
    """Propriedade ativa da rota e o vínculo do usuário com ela (ADR 0002, RNF05).

    Sem vínculo, inexistente ou inativa: 404, para não revelar que a propriedade existe.
    """
    membro = obter_propriedade(db, usuario.id, property_id)
    if membro is None:
        raise PROPRIEDADE_NAO_ENCONTRADA
    return membro


CurrentMembership = Annotated[PropriedadeDoUsuario, Depends(get_current_membership)]
