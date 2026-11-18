from app.domain.costs.categorias import CATEGORIAS_SUGERIDAS


def test_categorias_sugeridas_seguem_o_rf11() -> None:
    assert CATEGORIAS_SUGERIDAS == (
        "Alimentação",
        "Sanidade",
        "Suplementos",
        "Locação",
        "Manutenção",
    )


def test_categorias_sugeridas_cabem_na_coluna_e_nao_se_repetem() -> None:
    assert len(set(CATEGORIAS_SUGERIDAS)) == len(CATEGORIAS_SUGERIDAS)
    assert all(len(nome) <= 60 for nome in CATEGORIAS_SUGERIDAS)
