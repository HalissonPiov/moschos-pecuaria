# Registros de decisão de arquitetura (ADR)

Cada decisão que afeta a estrutura do sistema ganha um arquivo numerado nesta pasta, por exemplo 0001-modelo-do-registro-de-estoque.md. Um ADR aceito não é editado: se a decisão mudar, crie um novo ADR que substitua o anterior e atualize o status do antigo.

A decisão inicial (monólito modular, camadas e fronteira HTTP) está em ../arquitetura.md.

## Modelo

~~~
# NNNN. Título curto da decisão

Data: AAAA-MM-DD
Status: proposto | aceito | substituído por NNNN

## Contexto
O problema, as restrições e os requisitos envolvidos (cite RF, RNF e RN).

## Decisão
O que foi decidido, em uma ou duas frases diretas.

## Alternativas consideradas
Cada opção descartada e o motivo.

## Consequências
O que fica mais fácil, o que fica mais difícil e o que precisa ser feito.
~~~

## Índice

| Nº | Decisão | Status |
| --- | --- | --- |
| [0001](0001-autenticacao-jwt-e-refresh-em-cookie.md) | Autenticação com JWT de acesso e refresh token em cookie | aceito |
| [0002](0002-propriedade-ativa-na-rota.md) | Propriedade ativa no caminho da URL | aceito |
| [0003](0003-status-do-registro-derivado.md) | Status do registro de estoque derivado do saldo | aceito |
| [0004](0004-custo-alocado-gravado-e-recalculado.md) | Custo alocado gravado na venda e recalculado pelo domínio | aceito |
| [0005](0005-enumerados-varchar-com-check.md) | Enumerados como varchar com CHECK e nomes de restrições estáveis | aceito |
| [0006](0006-armazenamento-privado-das-fotos.md) | Armazenamento privado das fotos das notas atrás de uma interface | aceito |
| [0007](0007-rendimento-de-carcaca-padrao.md) | Rendimento de carcaça padrão de 50%, configurável por propriedade | aceito |
