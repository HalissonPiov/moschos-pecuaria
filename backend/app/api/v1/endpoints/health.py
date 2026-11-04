from fastapi import APIRouter, HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.api.deps import DbSession

router = APIRouter()


@router.get("/health", summary="Verifica a disponibilidade da API")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/health/db", summary="Verifica a conexão com o banco de dados")
def database_health_check(db: DbSession) -> dict[str, str]:
    try:
        db.execute(text("SELECT 1"))
    except SQLAlchemyError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Banco de dados indisponível.",
        ) from error
    return {"status": "ok"}
