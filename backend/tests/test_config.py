import pytest
from pydantic import ValidationError

from app.core.config import DEFAULT_SECRET_KEY, Settings


def test_desenvolvimento_aceita_a_chave_padrao() -> None:
    assert Settings(environment="development", secret_key=DEFAULT_SECRET_KEY).cookie_secure is False


@pytest.mark.parametrize("chave", [DEFAULT_SECRET_KEY, "curta-demais"])
def test_fora_do_desenvolvimento_exige_chave_propria_e_longa(chave: str) -> None:
    with pytest.raises(ValidationError):
        Settings(environment="production", secret_key=chave)


def test_fora_do_desenvolvimento_o_cookie_exige_https() -> None:
    settings = Settings(environment="production", secret_key="x" * 48)

    assert settings.cookie_secure is True
