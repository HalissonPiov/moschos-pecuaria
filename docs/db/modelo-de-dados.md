# Modelo de dados: validação e ajustes antes da migration inicial (versão 2)

| Item | Valor |
| --- | --- |
| Modelo avaliado (versão 1) | db/modelo-relacional-logico-v3.dbml e o SQL gerado a partir dele |
| Modelo corrigido (versão 2) | db/modelo-relacional-logico.dbml e o SQL gerado a partir dele (db/modelo-relacional-logico.sql) |
| Base | Documento de requisitos, versão revisada 2 |
| Data da validação | 11/11/2026 |
| Data da versão 2 | 15/11/2026 |
| Situação | Ajustes A1 a A6, B1 a B4 e acréscimos D1 a D7 aplicados e testados. Pendente apenas a confirmação do B5 com o produtor. |
| Uso | Entrada do pacote 2.2 (modelos SQLAlchemy e migration inicial). Os itens da seção 3 entram na migration; os da seção 5 ficam na aplicação. |

## 1. Como foi validado

**Versão 1 (11/11/2026)**

1. O script SQL foi executado em um PostgreSQL limpo. Ele rodou sem erro e criou 20 tabelas, 9 tipos enumerados e 40 chaves estrangeiras.
2. Cada RF e RN foi conferido contra as tabelas e colunas (seção 4).
3. O exemplo numérico da RN17 foi reproduzido sobre o esquema: lote de 10 cabeças com R$ 5.000 de custo, venda de 3 cabeças com R$ 1.500 alocados, novo custo de R$ 700 e saldo de R$ 4.200 para 7 cabeças (R$ 600 por cabeça). **O modelo sustenta a venda parcial**, que era o principal risco (R4 do cronograma).
4. Foram feitas inserções inválidas de propósito para ver o que o banco aceita. Os resultados orientaram a seção 3.

**Versão 2 (15/11/2026)**

1. O SQL gerado a partir do novo .dbml foi executado em um PostgreSQL 16 limpo, sem erro.
2. Contagem do esquema resultante:

| Item | Versão 1 | Versão 2 | Motivo da diferença |
| --- | --- | --- | --- |
| Tabelas | 20 | 20 | Sem tabela nova |
| Tipos enumerados nativos | 9 | 0 | B1: enumerados viraram varchar com CHECK |
| Chaves estrangeiras | 40 | 39 | A4: a FK composta do animal substitui duas FKs simples (registro e propriedade) |
| Restrições CHECK | 0 | 40 | A5 e B1, mais os acréscimos D1 a D7 da seção 3 |
| Colunas de data e hora sem fuso (`timestamp`) | 27 | 0 | A6 |
| Colunas de data e hora com fuso (`timestamptz`) | 0 | 28 | A6: as 27 convertidas mais `movimentacao_estoque.estornada_em` (A1) |

3. Os mesmos testes de dado inválido foram repetidos. Agora o banco recusa o que antes aceitava:

| Teste | Resultado na versão 2 |
| --- | --- |
| Animal da propriedade 2 dentro de lote da propriedade 1 (A4) | Recusado (chave estrangeira) |
| Animal da mesma propriedade do lote | Aceito |
| Custo com valor negativo (A5) | Recusado (CHECK) |
| Custo "previsto" com situação de pagamento "pago" (A5) | Recusado (CHECK) |
| Custo "a pagar" sem data de vencimento (A5) | Recusado (CHECK) |
| Custo "a pagar" com vencimento | Aceito |
| Natureza do custo ou modo de registro fora da lista (B1) | Recusado (CHECK) |
| Rendimento de carcaça de 150% (A5) | Recusado (CHECK) |
| Venda sem peso vivo e sem arrobas informadas (A5) | Recusado (CHECK) |
| Venda com arrobas de carcaça informadas | Aceita |
| Baixa por morte com custo de aquisição | Recusada (CHECK, acréscimo D1) |
| Pesagem de peso zero (A5) | Recusada (CHECK) |
| Convite aceito e revogado ao mesmo tempo (acréscimo D2) | Recusado (CHECK) |
| Dois tokens de recuperação de senha iguais (B3) | Recusado (unicidade) |
| Animal ligado a uma venda e a uma baixa ao mesmo tempo (D4) | Recusado (CHECK) |
| Animal só vendido ou só baixado | Aceito |
| Venda por peso vivo sem rendimento de carcaça (D5) | Recusada (CHECK) |
| Venda por peso vivo com rendimento | Aceita |
| Custo a pagar ou previsto com data de pagamento (D6) | Recusado (CHECK) |
| Custo pago com data de pagamento | Aceito |
| Recorrência ativa com data de encerramento (D7) | Recusada (CHECK) |

4. O cenário do A3 foi executado: lote "pronto para venda", venda parcial de um animal, estorno da venda. O status calculado foi "parcialmente vendido" após a venda e **voltou a "pronto para venda" após o estorno**, que era justamente a falha apontada.

## 2. O que está bem resolvido

- **Propriedade como raiz do isolamento**, com vínculo N:N em usuario_propriedade e o papel no vínculo, como pedem a RN31 e a RN35. Isso deixa o papel de administrador do sistema para um atributo futuro do usuário, sem retrabalho.
- **Um animal por cabeça**, com saldo derivado (animais sem venda e sem baixa) em vez de um contador gravado. O saldo não diverge das movimentações e a RN34 (o estorno devolve os animais) vira apenas limpar a referência.
- **Custos no registro, não no animal** (RN33). A alocação da RN17 continua sendo um custo médio por cabeça.
- **A venda guarda o rendimento usado** e as arrobas resultantes. Uma mudança futura do parâmetro da propriedade não altera vendas passadas.
- **Dinheiro em numeric(12,2)**, compatível com Decimal no Python.
- **Foto fora do banco.** Só o caminho no armazenamento privado é gravado (RNF06, RNF14).
- **Tokens de convite e de recuperação guardados como hash** (RN39).
- **Estorno em vez de exclusão física** para custos, vendas e baixas (RF16, RF24, RN34), e a tabela correcao_justificada para a RN05.
- **Unicidade de negócio no banco:** identificação do registro, brinco, categoria, fornecedor, comprador e cotação por data, praça e fonte (RN26).

## 3. Ajustes aplicados na versão 2

| # | Problema | Como foi aplicado | Situação |
| --- | --- | --- | --- |
| A1 | Não havia como estornar uma baixa (RN34). | Coluna `estornada_em timestamptz` em movimentacao_estoque. O estorno da baixa limpa `animal.movimentacao_baixa_id`. A entrada não é estornável no MVP (ver seção 5). | Aplicado |
| A2 | Não havia como inativar uma propriedade (RN37). | Coluna `ativa boolean not null default true` em propriedade. | Aplicado |
| A3 | O status do produtor se perdia no estorno: "Parcialmente vendido" sobrescrevia "Pronto para venda". | A coluna `status` virou `situacao_producao`, com apenas `em_producao` ou `pronto_para_venda`. "Parcialmente vendido" e "Vendido" são calculados (regra abaixo). O índice passou a usar a nova coluna. | Aplicado |
| A4 | O banco aceitava animal de uma propriedade ligado a lote de outra. | `UNIQUE (id, propriedade_id)` em registro_estoque (nome `uq_registro_estoque_id_propriedade`) e FK composta `animal (registro_estoque_id, propriedade_id)`. A FK simples do animal para propriedade foi retirada, porque a composta já a garante. | Aplicado |
| A5 | Não havia nenhuma restrição CHECK. | CHECKs com nome `ck_<tabela>_<regra>`, com a tabela abreviada quando o nome é longo (`ck_registro_*`, `ck_movimentacao_*`, `ck_convite_*`, `ck_nota_*`, `ck_oferta_*`), conforme a tabela abaixo. | Aplicado |
| A6 | Datas e horas sem fuso. | Todas as colunas de data e hora de registro usam `timestamptz`. As datas de negócio continuam `date`. | Aplicado |

**Regra de derivação do status exibido (A3, RN02):**

| Condição | Status exibido |
| --- | --- |
| Saldo igual a zero e existe venda não estornada | Vendido |
| Saldo maior que zero e existe venda não estornada | Parcialmente vendido |
| Nos demais casos | O valor de `situacao_producao` |

Saldo zero **sem** venda não estornada (todos os animais baixados por morte ou descarte): a regra acima mostraria a última decisão do produtor, o que engana. Nesse caso o status exibido é **"Encerrado"**. É um quinto status exibido, além dos quatro da RN02, registrado no controle de mudanças do escopo (docs/gestao/escopo.md). Não muda o banco.

| Condição | Status exibido |
| --- | --- |
| Saldo igual a zero e nenhuma venda não estornada | Encerrado |

**CHECKs aplicados (A5):**

| Tabela | Restrição | Regra |
| --- | --- | --- |
| custo | `valor > 0` | RN07 |
| custo | `natureza = 'realizado' OR situacao_pagamento IS NULL` | RN12 |
| custo | `situacao_pagamento IS DISTINCT FROM 'a_pagar' OR data_vencimento IS NOT NULL` | RF15 |
| registro_estoque, movimentacao_estoque | `custo_aquisicao >= 0` | RN16 |
| movimentacao_estoque | `quantidade > 0` | RN03 |
| venda | `quantidade_cabecas > 0`, `arrobas_vendidas > 0`, `preco_arroba > 0`, `despesas_venda >= 0`, `custo_alocado >= 0` | RN03, RN19, RN21 |
| venda | `peso_vivo_total_kg IS NOT NULL OR arrobas_carcaca_informadas IS NOT NULL` | RN18 |
| propriedade, venda | `rendimento_carcaca_pct > 0 AND rendimento_carcaca_pct <= 100` | RN18 |
| propriedade | `dias_alerta_vencimento >= 0` | RN13 |
| nota_fiscal, recorrencia | `valor_total > 0`, `valor > 0` | RN07 |
| cotacao, oferta_frigorifico | `valor_arroba > 0`, `preco_arroba > 0` | RNF09 |
| pesagem | `peso_kg > 0` | RNF09 |

**Acréscimos desta versão**, na mesma linha do A5 e de baixo custo. Usam a letra D para não colidir com os códigos da Ampliação (A1 a A14) e dos Complementos (C1 a C5) do escopo. Podem ser retirados sem afetar o restante:

| # | Restrição | Motivo |
| --- | --- | --- |
| D1 | movimentacao_estoque: `tipo = 'entrada' OR custo_aquisicao = 0` | A coluna é "apenas para entradas" (RF07); o banco passa a garantir. |
| D2 | convite_propriedade: validade posterior à criação; não aceito e revogado ao mesmo tempo; `aceito_em` e `aceito_por` preenchidos juntos | RN39: o convite só pode ser revogado enquanto não aceito. |
| D3 | animal.peso_inicial_kg e oferta_frigorifico.quantidade_cabecas maiores que zero quando informados | Coerência com os demais valores positivos. |
| D4 | animal: `venda_id IS NULL OR movimentacao_baixa_id IS NULL` (`ck_animal_saida_unica`) | Um animal sai do saldo uma única vez, por venda ou por baixa. Sem isso, o saldo e o custo alocado (RN03, RN17) podem contar a mesma cabeça duas vezes. |
| D5 | venda: `arrobas_carcaca_informadas IS NOT NULL OR rendimento_carcaca_pct IS NOT NULL` (`ck_venda_rendimento_peso_vivo`) | Venda feita pelo peso vivo precisa guardar o rendimento usado, para que a conversão da RN18 possa ser reconstituída. |
| D6 | custo: `situacao_pagamento IS NOT DISTINCT FROM 'pago' OR data_pagamento IS NULL` (`ck_custo_data_pagamento`) | Só custo pago tem data de pagamento (RN12). |
| D7 | recorrencia: `NOT (ativa AND encerrada_em IS NOT NULL)` (`ck_recorrencia_encerramento`) | Recorrência encerrada não pode continuar gerando custos previstos (RN14). |

## 4. Cobertura dos requisitos

Todos os RFs têm onde morar no modelo. Os itens abaixo são derivados e não precisam de tabela: saldo, status exibido, custo acumulado, margens, custo por arroba, ponto de equilíbrio, projeção de saídas (RF19), sugestão por fornecedor (RF12), simulação (RF28), relatórios (RF31) e titularidade confirmada (RN36).

| Área | Requisitos | Tabelas |
| --- | --- | --- |
| Acesso | RF01, RF02, RF32 a RF36, RN31, RN35 a RN39 | usuario, propriedade, usuario_propriedade, convite_propriedade, recuperacao_senha |
| Estoque | RF03 a RF08, RN01 a RN06, RN32 a RN34 | registro_estoque, animal, pasto, movimentacao_estoque, pesagem |
| Custos | RF09 a RF19, RN07 a RN16 | fornecedor, categoria_custo, nota_fiscal, recorrencia, custo |
| Vendas | RF20 a RF24, RN17 a RN25 | comprador, venda |
| Mercado | RF25 a RF29, RN26 a RN30 | cotacao, oferta_frigorifico, propriedade.praca_padrao |
| Auditoria | RN05 | correcao_justificada |

## 5. Regras que ficam na aplicação

Essas regras não cabem bem em restrições do banco. Cada uma vira um teste no domínio ou no caso de uso.

- **Mesma propriedade nas ligações restantes** (RN31): o animal já é garantido pelo banco (A4). Categoria, fornecedor, nota, comprador, pasto e registro usados num custo, venda ou recorrência pertencem à propriedade ativa. A verificação fica num único ponto: o repositório busca por `id` e `propriedade_id`.
- **Registro individual tem exatamente um animal** (RN01) e não recebe entradas.
- **A quantidade de uma venda ou baixa é igual ao número de animais vinculados**, com seleção automática quando nenhum animal do saldo tem dados individuais (RN32).
- **Custo alocado (RN17):** a coluna venda.custo_alocado é um valor calculado e gravado. Sempre que mudar um custo com data até a última venda, uma venda ou uma baixa, o serviço de domínio recalcula todas as vendas não estornadas do registro em ordem de data e id. A venda que zera o saldo recebe todo o custo restante, para que os centavos de arredondamento não sobrem nem faltem.
- **Cabeças existentes imediatamente antes da venda (RN17):** são os animais criados até a data da venda (formação ou entrada), menos os que saíram antes dela. Vendas no mesmo dia são ordenadas pelo id.
- **Status exibido do registro** (RN02): calculado pela regra da seção 3, por consulta ou view. Não é gravado.
- **Estorno de baixa** (RN34): preenche `movimentacao_estoque.estornada_em` e limpa `animal.movimentacao_baixa_id`. Estorno de entrada não está previsto: a correção de uma entrada errada passa por correção justificada ou, se os animais ainda não têm histórico, pela inativação do registro.
- **Bloqueio após a venda total** (RN05) e permissões por papel (RN37, RN38).
- **`atualizado_em`** é preenchido pelo ORM (`onupdate`), pois o banco não tem gatilho para isso.

## 6. Recomendações menores

| # | Recomendação | Situação | Observação para a implementação |
| --- | --- | --- | --- |
| B1 | Gravar os enumerados como `varchar` com CHECK | Aplicado | No SQLAlchemy, usar `Enum(..., native_enum=False, create_constraint=True, length=...)`. Desde a versão 1.4 o padrão de `create_constraint` é `False`, e sem ele os modelos não declaram o CHECK. O Alembic não detecta mudança em CHECK: incluir um valor novo exige escrever a migration à mão (remover e recriar a restrição). |
| B2 | Índices em `usuario_propriedade (propriedade_id)` e `recorrencia (registro_estoque_id)` | Aplicado | As outras FKs sem índice não pesam no volume do MVP. |
| B3 | `recuperacao_senha.token_hash` único | Aplicado | O token é buscado pelo hash, como no convite. |
| B4 | Manter um só arquivo de modelo | Aplicado | O .dbml em db/ é o único arquivo de modelo e o .sql é regerado a partir dele com o `dbml2sql`. O histórico fica no git. O banco real é criado pelas migrations Alembic; o .dbml e o .sql são referência e diagrama, e os índices sem nome no .dbml podem ter outro nome no banco. |
| B5 | Brinco único inclui animais vendidos | Pendente | Um brinco de animal vendido não pode ser reutilizado. É aceitável, mas precisa ser confirmado com o produtor. |

**Considerado e não aplicado**

- **FKs compostas para as demais ligações** (por exemplo, `animal.venda_id` só para vendas do mesmo registro, ou custo com categoria da mesma propriedade). Cada uma exige outra restrição de unicidade e outra chave composta, e o SQLAlchemy emite avisos de relacionamentos sobrepostos quando várias chaves compartilham a mesma coluna. Como a decisão do projeto é manter essas ligações na aplicação, com teste, não foram incluídas. Reavaliar se algum defeito de isolamento aparecer nos testes.
- **CHECK na coluna `correcao_justificada.entidade`.** A lista de entidades ainda pode crescer.

## 7. Próximo passo

Os modelos SQLAlchemy e a migration inicial (pacote 2.2) são escritos a partir do .dbml da versão 2. Pontos de atenção:

- `DateTime(timezone=True)` em todas as colunas `timestamptz`.
- Enumerados com `native_enum=False` e `create_constraint=True` (B1).
- A FK composta do animal declarada com `ForeignKeyConstraint`, e a unicidade `(id, propriedade_id)` do registro com o nome do .dbml.
- Dar nomes estáveis às restrições. Usar `naming_convention` no `MetaData` para índices, unicidades, chaves estrangeiras e primárias. Os CHECKs recebem o nome completo do .dbml em `CheckConstraint(..., name=conv("ck_registro_modo"))`, porque a convenção `ck_%(table_name)s_...` geraria `ck_registro_estoque_...` e divergiria do .dbml.
- O .sql em db/ não é executado pela aplicação; a migration inicial deve produzir o mesmo esquema (tabelas, colunas, chaves e os 40 CHECKs).

A partir da migration inicial, toda mudança estrutural passa a ser uma migration Alembic, e o .dbml é atualizado junto para continuar servindo de diagrama.

## 8. Histórico de versões

| Versão | Data | Mudança |
| --- | --- | --- |
| 1 | 11/11/2026 | Validação do modelo gerado a partir dos requisitos (revisão 2). Ajustes A1 a A6 e B1 a B5 propostos. |
| 2 | 15/11/2026 | Ajustes A1 a A6 e B1 a B4 aplicados ao .dbml e ao SQL, mais os acréscimos D1 a D7 (40 CHECKs). Status exibido "Encerrado" definido. Testados em PostgreSQL 16. B5 pendente. |
