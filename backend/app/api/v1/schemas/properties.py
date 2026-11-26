from datetime import datetime
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import BaseModel, Field, StringConstraints

from app.application.properties.casos_de_uso import PropriedadeDoUsuario
from app.domain.properties.enums import PapelPropriedade
from app.domain.properties.regras import UFS, Titularidade


def _texto(tamanho: int) -> StringConstraints:
    return StringConstraints(strip_whitespace=True, min_length=1, max_length=tamanho)


UF = Literal[UFS]  # type: ignore[valid-type]


class NovaPropriedadeIn(BaseModel):
    """RF32 e RN35: dados da propriedade, papel declarado e aceite do termo."""

    nome: Annotated[str, _texto(120)]
    municipio: Annotated[str, _texto(80)]
    uf: UF
    area_hectares: Annotated[Decimal, Field(gt=0, max_digits=10, decimal_places=2)] | None = None
    titular_nome: Annotated[str, _texto(200)]
    papel: PapelPropriedade
    aceite_termo: Literal[True] = Field(description="O usuário marcou o aceite do termo.")
    versao_termo: Annotated[str, _texto(20)]


class PropriedadeOut(BaseModel):
    id: int
    nome: str
    municipio: str | None
    uf: str | None
    area_hectares: Decimal | None
    titular_nome: str
    titularidade: Titularidade
    papel: PapelPropriedade
    aceite_declaracao_em: datetime
    versao_termo: str
    rendimento_carcaca_pct: Decimal
    praca_padrao: str
    dias_alerta_vencimento: int

    @classmethod
    def de(cls, membro: PropriedadeDoUsuario) -> "PropriedadeOut":
        p, v = membro.propriedade, membro.vinculo
        return cls(
            id=p.id,
            nome=p.nome,
            municipio=p.municipio,
            uf=p.uf,
            area_hectares=p.area_hectares,
            titular_nome=p.titular_nome,
            titularidade=membro.titularidade,
            papel=v.papel,
            aceite_declaracao_em=v.aceite_declaracao_em,
            versao_termo=v.versao_termo,
            rendimento_carcaca_pct=p.rendimento_carcaca_pct,
            praca_padrao=p.praca_padrao,
            dias_alerta_vencimento=p.dias_alerta_vencimento,
        )


class PropriedadeCriadaOut(PropriedadeOut):
    categorias_criadas: list[str]
