"""Restrições do banco: o que deve ser recusado e o que deve ser aceito.

Repete os testes de dado inválido de docs/db/modelo-de-dados.md (seção 1) sobre o banco
criado pela migration, usando os modelos SQLAlchemy.
"""

from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal

import pytest
from sqlalchemy import select, text, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.domain.costs.enums import NaturezaCusto, Periodicidade, SituacaoPagamento
from app.domain.herd.enums import ModoRegistro, OrigemRegistro, SituacaoProducao, TipoMovimentacao
from app.domain.properties.enums import PapelPropriedade
from app.infrastructure.database.models import (
    Animal,
    CategoriaCusto,
    ConvitePropriedade,
    Custo,
    MovimentacaoEstoque,
    Pesagem,
    Propriedade,
    Recorrencia,
    RecuperacaoSenha,
    RegistroEstoque,
    Usuario,
    Venda,
)

pytestmark = pytest.mark.db

HOJE = date(2026, 3, 1)


@dataclass
class Cenario:
    """Duas propriedades, um lote de 10 animais na primeira e uma categoria de custo."""

    usuario: Usuario
    propriedade: Propriedade
    outra_propriedade: Propriedade
    lote: RegistroEstoque
    animais: list[Animal]
    categoria: CategoriaCusto


@pytest.fixture
def cenario(session: Session) -> Cenario:
    usuario = Usuario(nome="Ana", email="ana@example.com", senha_hash="hash")
    session.add(usuario)
    session.flush()
    propriedade = Propriedade(nome="Fazenda 1", titular_nome="Ana", cadastrada_por=usuario.id)
    outra = Propriedade(nome="Fazenda 2", titular_nome="Bruno", cadastrada_por=usuario.id)
    session.add_all([propriedade, outra])
    session.flush()
    lote = RegistroEstoque(
        propriedade_id=propriedade.id,
        identificacao="Lote 1",
        modo_registro=ModoRegistro.LOTE,
        data_formacao=date(2026, 1, 1),
        origem=OrigemRegistro.AQUISICAO,
        custo_aquisicao=Decimal("4000.00"),
        situacao_producao=SituacaoProducao.PRONTO_PARA_VENDA,
    )
    session.add(lote)
    session.flush()
    animais = [
        Animal(registro_estoque_id=lote.id, propriedade_id=propriedade.id) for _ in range(10)
    ]
    categoria = CategoriaCusto(propriedade_id=propriedade.id, nome="Alimentação")
    session.add_all([*animais, categoria])
    session.flush()
    return Cenario(usuario, propriedade, outra, lote, animais, categoria)


def custo(c: Cenario, **campos: object) -> Custo:
    dados = {
        "registro_estoque_id": c.lote.id,
        "categoria_custo_id": c.categoria.id,
        "descricao": "Ração",
        "valor": Decimal("100.00"),
        "data_compra": HOJE,
    } | campos
    return Custo(**dados)


def venda(c: Cenario, **campos: object) -> Venda:
    dados = {
        "registro_estoque_id": c.lote.id,
        "data_venda": HOJE,
        "quantidade_cabecas": 1,
        "arrobas_carcaca_informadas": Decimal("10.00"),
        "arrobas_vendidas": Decimal("10.00"),
        "preco_arroba": Decimal("300.00"),
        "custo_alocado": Decimal("500.00"),
    } | campos
    return Venda(**dados)


def baixa(c: Cenario, **campos: object) -> MovimentacaoEstoque:
    dados = {
        "registro_estoque_id": c.lote.id,
        "tipo": TipoMovimentacao.BAIXA_MORTE,
        "data_movimentacao": HOJE,
        "quantidade": 1,
    } | campos
    return MovimentacaoEstoque(**dados)


def recorrencia(c: Cenario, **campos: object) -> Recorrencia:
    dados = {
        "registro_estoque_id": c.lote.id,
        "categoria_custo_id": c.categoria.id,
        "descricao": "Aluguel de pasto",
        "valor": Decimal("500.00"),
        "periodicidade": Periodicidade.MENSAL,
        "proxima_data": date(2026, 4, 1),
    } | campos
    return Recorrencia(**dados)


def convite(c: Cenario, **campos: object) -> ConvitePropriedade:
    agora = datetime.now(UTC)
    dados = {
        "propriedade_id": c.propriedade.id,
        "papel": PapelPropriedade.GESTOR,
        "token_hash": "hash-do-token",
        "criado_por": c.usuario.id,
        "expira_em": agora + timedelta(days=1),
    } | campos
    return ConvitePropriedade(**dados)


def _ligar_animal(session: Session, c: Cenario, animal: Animal, **saidas: object) -> None:
    session.flush()
    session.execute(update(Animal).where(Animal.id == animal.id).values(**saidas))


def _vendido_e_baixado(session: Session, c: Cenario) -> None:
    v, b = venda(c), baixa(c)
    session.add_all([v, b])
    session.flush()
    _ligar_animal(session, c, c.animais[0], venda_id=v.id, movimentacao_baixa_id=b.id)


def _token_repetido(session: Session, c: Cenario) -> None:
    expira = datetime.now(UTC) + timedelta(hours=1)
    session.add_all(
        [
            RecuperacaoSenha(usuario_id=c.usuario.id, token_hash="t", expira_em=expira),
            RecuperacaoSenha(usuario_id=c.usuario.id, token_hash="t", expira_em=expira),
        ]
    )


def _rendimento_150(session: Session, c: Cenario) -> None:
    c.propriedade.rendimento_carcaca_pct = Decimal(150)


def _natureza_invalida(session: Session, c: Cenario) -> None:
    session.flush()
    session.execute(
        text(
            "INSERT INTO custo (registro_estoque_id, categoria_custo_id, descricao, valor, "
            "data_compra, natureza) VALUES (:r, :c, 'x', 5, :d, 'xyz')"
        ),
        {"r": c.lote.id, "c": c.categoria.id, "d": HOJE},
    )


def _adicionar(fabrica: Callable[[Cenario], object]) -> Callable[[Session, Cenario], None]:
    return lambda session, c: session.add(fabrica(c))


# (caso, restrição que deve ser violada) -> operação
RECUSADOS: dict[tuple[str, str], Callable[[Session, Cenario], None]] = {
    (
        "A4 animal de outra propriedade no lote",
        "fk_animal_registro_estoque_id_propriedade_id_registro_estoque",
    ): _adicionar(
        lambda c: Animal(registro_estoque_id=c.lote.id, propriedade_id=c.outra_propriedade.id)
    ),
    ("A5 custo com valor negativo", "ck_custo_valor"): _adicionar(
        lambda c: custo(c, valor=Decimal(-5))
    ),
    ("A5 custo previsto com situação de pagamento", "ck_custo_pagamento_so_realizado"): _adicionar(
        lambda c: custo(
            c,
            natureza=NaturezaCusto.PREVISTO,
            situacao_pagamento=SituacaoPagamento.PAGO,
            data_compra=date(2027, 1, 1),
        )
    ),
    ("A5 custo a pagar sem vencimento", "ck_custo_vencimento_a_pagar"): _adicionar(
        lambda c: custo(c, situacao_pagamento=SituacaoPagamento.A_PAGAR)
    ),
    ("B1 natureza fora da lista", "ck_custo_natureza"): _natureza_invalida,
    ("A5 rendimento de carcaça de 150%", "ck_propriedade_rendimento"): _rendimento_150,
    ("A5 venda sem peso vivo e sem arrobas", "ck_venda_origem_arrobas"): _adicionar(
        lambda c: venda(c, arrobas_carcaca_informadas=None)
    ),
    ("D1 baixa com custo de aquisição", "ck_movimentacao_custo_so_entrada"): _adicionar(
        lambda c: baixa(c, custo_aquisicao=Decimal(100))
    ),
    ("A5 pesagem de peso zero", "ck_pesagem_peso"): _adicionar(
        lambda c: Pesagem(animal_id=c.animais[0].id, data_pesagem=HOJE, peso_kg=Decimal(0))
    ),
    ("D2 convite aceito e revogado", "ck_convite_estado"): _adicionar(
        lambda c: convite(
            c,
            aceito_em=datetime.now(UTC),
            aceito_por=c.usuario.id,
            revogado_em=datetime.now(UTC),
        )
    ),
    ("D2 convite aceito sem quem aceitou", "ck_convite_aceite"): _adicionar(
        lambda c: convite(c, aceito_em=datetime.now(UTC))
    ),
    ("B3 token de recuperação repetido", "uq_recuperacao_senha_token_hash"): _token_repetido,
    ("D4 animal vendido e baixado", "ck_animal_saida_unica"): _vendido_e_baixado,
    ("D5 venda por peso vivo sem rendimento", "ck_venda_rendimento_peso_vivo"): _adicionar(
        lambda c: venda(c, arrobas_carcaca_informadas=None, peso_vivo_total_kg=Decimal(500))
    ),
    ("D6 custo a pagar com data de pagamento", "ck_custo_data_pagamento"): _adicionar(
        lambda c: custo(
            c,
            situacao_pagamento=SituacaoPagamento.A_PAGAR,
            data_vencimento=date(2026, 4, 1),
            data_pagamento=HOJE,
        )
    ),
    ("D7 recorrência ativa e encerrada", "ck_recorrencia_encerramento"): _adicionar(
        lambda c: recorrencia(c, encerrada_em=HOJE)
    ),
}


def _vendido(session: Session, c: Cenario) -> None:
    v = venda(c)
    session.add(v)
    session.flush()
    _ligar_animal(session, c, c.animais[0], venda_id=v.id)


def _baixado(session: Session, c: Cenario) -> None:
    b = baixa(c)
    session.add(b)
    session.flush()
    _ligar_animal(session, c, c.animais[0], movimentacao_baixa_id=b.id)


ACEITOS: dict[str, Callable[[Session, Cenario], None]] = {
    "animal da mesma propriedade do lote": _adicionar(
        lambda c: Animal(registro_estoque_id=c.lote.id, propriedade_id=c.propriedade.id)
    ),
    "custo realizado sem situação de pagamento": _adicionar(custo),
    "custo a pagar com vencimento": _adicionar(
        lambda c: custo(
            c, situacao_pagamento=SituacaoPagamento.A_PAGAR, data_vencimento=date(2026, 4, 1)
        )
    ),
    "custo pago com data de pagamento": _adicionar(
        lambda c: custo(c, situacao_pagamento=SituacaoPagamento.PAGO, data_pagamento=HOJE)
    ),
    "venda por arrobas de carcaça informadas": _adicionar(venda),
    "venda por peso vivo com rendimento": _adicionar(
        lambda c: venda(
            c,
            arrobas_carcaca_informadas=None,
            peso_vivo_total_kg=Decimal(500),
            rendimento_carcaca_pct=Decimal(50),
        )
    ),
    "animal só vendido": _vendido,
    "animal só baixado": _baixado,
    "entrada com custo de aquisição": _adicionar(
        lambda c: baixa(c, tipo=TipoMovimentacao.ENTRADA, custo_aquisicao=Decimal(800))
    ),
    "recorrência encerrada e inativa": _adicionar(
        lambda c: recorrencia(c, ativa=False, encerrada_em=HOJE)
    ),
    "convite aceito": _adicionar(
        lambda c: convite(c, aceito_em=datetime.now(UTC), aceito_por=c.usuario.id)
    ),
}


@pytest.mark.parametrize(
    ("restricao", "operacao"),
    [(restricao, operacao) for (_, restricao), operacao in RECUSADOS.items()],
    ids=[caso for caso, _ in RECUSADOS],
)
def test_banco_recusa(
    session: Session,
    cenario: Cenario,
    restricao: str,
    operacao: Callable[[Session, Cenario], None],
) -> None:
    with pytest.raises(IntegrityError, match=f'"{restricao}"'):
        operacao(session, cenario)
        session.flush()


@pytest.mark.parametrize("operacao", ACEITOS.values(), ids=ACEITOS.keys())
def test_banco_aceita(
    session: Session, cenario: Cenario, operacao: Callable[[Session, Cenario], None]
) -> None:
    operacao(session, cenario)
    session.flush()


def test_enumerado_grava_o_valor_e_nao_o_nome(session: Session, cenario: Cenario) -> None:
    """``SituacaoProducao.PRONTO_PARA_VENDA`` é gravado como 'pronto_para_venda' (ADR 0005)."""
    gravado = session.scalar(
        text("SELECT situacao_producao FROM registro_estoque WHERE id = :id"),
        {"id": cenario.lote.id},
    )
    assert gravado == "pronto_para_venda"

    lido = session.scalar(select(RegistroEstoque.situacao_producao))
    assert lido is SituacaoProducao.PRONTO_PARA_VENDA


def test_valores_padrao_do_banco(session: Session, cenario: Cenario) -> None:
    session.refresh(cenario.propriedade)
    assert cenario.propriedade.rendimento_carcaca_pct == Decimal("50.00")  # ADR 0007
    assert cenario.propriedade.praca_padrao == "Minas Gerais"  # RN27
    assert cenario.propriedade.dias_alerta_vencimento == 7  # RN13
    assert cenario.propriedade.ativa is True

    novo = custo(cenario)
    session.add(novo)
    session.flush()
    session.refresh(novo)
    assert novo.natureza is NaturezaCusto.REALIZADO
    assert novo.criado_em.tzinfo is not None  # timestamptz (A6)
