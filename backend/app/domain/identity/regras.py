"""Regras do cadastro de usuário (RF01, RNF09)."""

SENHA_TAMANHO_MINIMO = 8
SENHA_TAMANHO_MAXIMO = 128


def normalizar_email(email: str) -> str:
    """E-mail sem espaços e em minúsculas: Joao@X.com e joao@x.com são a mesma conta."""
    return email.strip().lower()
