# 0003. Status do registro de estoque derivado do saldo

Data: 2026-11-15
Status: aceito

## Contexto

A RN02 define os status "Em produção", "Pronto para venda", "Parcialmente vendido" e "Vendido". Os dois primeiros são decisão do produtor; os outros dois são atribuídos pelo sistema. Uma venda pode ser estornada (RF24), e então os animais voltam ao saldo (RN34).

Se o status fosse uma única coluna gravada, a venda parcial sobrescreveria "Pronto para venda" com "Parcialmente vendido". Depois do estorno, não haveria como saber qual era a decisão do produtor. Esse problema foi o ajuste A3 da validação do modelo (docs/modelo-de-dados.md).

## Decisão

- Grava-se apenas a decisão do produtor, na coluna `registro_estoque.situacao_producao` (`em_producao` ou `pronto_para_venda`).
- O status exibido é calculado a partir do saldo de cabeças (animais sem venda e sem baixa) e da existência de venda não estornada:

| Saldo | Venda não estornada | Status exibido |
| --- | --- | --- |
| Zero | Sim | Vendido |
| Maior que zero | Sim | Parcialmente vendido |
| Zero | Não | Encerrado (todos os animais baixados) |
| Maior que zero | Não | O valor de `situacao_producao` |

- O cálculo é uma função pura do domínio, coberta por testes unitários. As listagens usam a mesma regra por consulta SQL, com testes que comparam o resultado da consulta com o da função.

## Alternativas consideradas

- **Coluna única de status gravada e atualizada a cada venda:** perde a decisão do produtor no estorno e pode divergir do saldo.
- **Duas colunas gravadas (decisão e status):** evita a perda, mas o status gravado pode ficar desatualizado se alguma rotina esquecer de recalculá-lo.
- **View no banco:** é possível, mas cada mudança de regra exigiria uma migration. Pode ser adotada depois, se as consultas se repetirem.

## Consequências

- O estorno de uma venda devolve automaticamente o status anterior, e o status nunca diverge do saldo.
- Filtrar por "Vendido" ou "Parcialmente vendido" exige uma consulta com agregação, o que não pesa no volume do MVP.
- "Encerrado" é um quinto status exibido, além dos quatro da RN02. Está registrado nas premissas do documento de requisitos e no controle de mudanças do escopo.
