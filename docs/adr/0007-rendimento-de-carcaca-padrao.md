# 0007. Rendimento de carcaça padrão de 50%, configurável por propriedade

Data: 2026-11-15
Status: aceito

## Contexto

A RN18 converte peso vivo em arrobas: peso vivo × rendimento de carcaça ÷ 15. O rendimento é um parâmetro configurável, com valor padrão a validar com o produtor.

A conversão afeta a receita (RN19), as margens, o ponto de equilíbrio (RN25) e as simulações (RN29). Ainda não se sabe se o produtor vende por peso vivo ou por arrobas de carcaça (premissas do documento de requisitos).

## Decisão

- O padrão é **50%**, em `propriedade.rendimento_carcaca_pct` (`numeric(5,2)`, entre 0 e 100). Pode ser alterado nas configurações da propriedade.
- Toda venda feita por peso vivo grava o rendimento usado em `venda.rendimento_carcaca_pct`. O banco exige isso pelo CHECK `ck_venda_rendimento_peso_vivo`. Uma mudança posterior do parâmetro não altera vendas passadas.
- Quando a venda é informada em arrobas de carcaça, usa-se o valor informado, e o rendimento é opcional.
- As simulações e estimativas usam o parâmetro atual da propriedade e mostram ao usuário o rendimento aplicado.

## Alternativas consideradas

- **Constante no código:** não atende a RN18, que pede um parâmetro configurável.
- **Rendimento por registro de estoque:** é mais preciso por raça ou categoria, mas acrescenta um campo que o produtor dificilmente saberá preencher. Pode ser uma evolução.
- **Outros padrões (52% a 55%):** são comuns para machos terminados, mas sem dado do produtor o valor de 50% é mais conservador, porque não superestima a receita.

## Consequências

- A conversão é uma função pura do domínio, testada com o valor padrão e com o valor informado.
- Quando o produtor confirmar o valor real, basta alterar o parâmetro da propriedade, sem migration.
- Vendas antigas permanecem auditáveis, porque guardam o rendimento que foi usado.
