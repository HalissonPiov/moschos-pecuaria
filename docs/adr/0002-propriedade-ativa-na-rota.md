# 0002. Propriedade ativa no caminho da URL

Data: 2026-11-15
Status: aceito

## Contexto

Um usuário pode estar vinculado a várias propriedades e age em uma de cada vez (RF01, RF33, RN31). Cada usuário só acessa dados das propriedades às quais está vinculado (RNF05). O papel do vínculo (proprietário ou gestor) define o que ele pode fazer na gestão de membros (RN37).

Isso significa que toda requisição precisa responder a duas perguntas: qual é a propriedade, e se o usuário tem vínculo com ela.

## Decisão

- Todo recurso de uma propriedade fica sob `/api/v1/properties/{property_id}/...`. As exceções são as rotas de autenticação, a lista das próprias propriedades e o aceite de convite.
- Uma dependência do FastAPI (`CurrentMembership`) lê o `property_id` da rota e busca o vínculo do usuário autenticado em `usuario_propriedade`. Se o vínculo não existir ou a propriedade estiver inativa, a resposta é **404**. Se existir, a dependência entrega ao caso de uso o vínculo, com o id da propriedade e o papel.
- Os repositórios recebem sempre o `propriedade_id` e filtram por ele. Um id de outra propriedade é tratado como inexistente (404), e não como proibido (403), para não revelar que o registro existe.
- O front-end guarda a última propriedade escolhida para abrir nela no próximo acesso. Essa informação é só uma preferência de tela; a autorização não depende dela.

## Alternativas consideradas

- **Propriedade ativa dentro do token (claim do JWT):** trocar de propriedade exigiria emitir outro token, e um token antigo continuaria apontando para uma propriedade da qual o usuário pode ter sido removido.
- **Cabeçalho `X-Property-Id`:** funciona, mas esconde a propriedade da URL, dificulta testar pelo `/docs` e deixa o vínculo com o recurso menos evidente.
- **Propriedade ativa guardada no servidor (sessão):** contraria o ADR 0001, que não usa sessão no servidor.

## Consequências

- O isolamento fica concentrado em um ponto, a dependência, e é fácil de testar. Todo endpoint ganha um teste de acesso a outra propriedade, que deve receber 404 (seção Testes de docs/arquitetura.md).
- Remover um membro corta o acesso na requisição seguinte, sem esperar o token expirar.
- O vínculo é consultado a cada requisição. Essa consulta é feita pela chave primária e não pesa no volume do MVP.
- As URLs ficam mais longas, e o adaptador HTTP do front-end monta o prefixo a partir da propriedade ativa.
