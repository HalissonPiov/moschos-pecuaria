# Cronograma de Atividades — Mo$chos Pecuária v1.0

| Item | Valor |
| --- | --- |
| Período | 11/11/2026 a 06/12/2026; apresentação em 07/12/2026 |
| Capacidade | 6 h na semana 1 (já em andamento) e 12,5 h nas semanas seguintes, total de 43,5 h |
| Escopo | escopo.md (os IDs dos pacotes vêm da EAP, seção 5) |
| Versão deste documento | 2.1 — 21/11/2026 (a 2.0, de 11/11, seguia os requisitos v2; a 1.0, de 08/11, a versão anterior) |

## 1. Marcos

| Marco | Data | Critério para considerar atingido |
| --- | --- | --- |
| M0 Planejamento revisado | 11/11 (qua) | Requisitos v2 em Markdown, modelo validado, escopo e cronograma 2.0 commitados |
| M1 Fundação | 15/11 (dom) | ADRs aceitos, modelo ajustado, migration inicial aplicada e Vitest rodando no CI |
| M2 Acesso e rebanho | 22/11 (dom) | Cadastro e login, propriedade com declaração, propriedade ativa, lote com animais e saldo, usuário de outra propriedade bloqueado. **Velocidade medida e fila da Ampliação recalculada** |
| M3 Custos e vendas | 29/11 (dom) | Custo com foto da nota e venda parcial com a RN17 correta (R$ 1.500 e depois R$ 600) |
| M4 Congelamento | 03/12 (qui) | Mercado e painel integrados; daqui em diante só entram correções |
| M5 Release v1.0.0 | 06/12 (dom) | Roteiro de aceitação aprovado; release/1.0.0 integrada à main com a tag v1.0.0 |
| M6 Apresentação | 07/12 (seg) | Apresentação feita com os dados de demonstração |

## 2. Cronograma semanal do núcleo

Desde 21/11 as telas do front-end são as do protótipo V2. Em cada pacote, "Front-end" significa ligar a tela pronta à API e manter ocultas as partes de pacotes ainda não integrados (escopo.md, seção 5.5). As horas não mudaram.

### Semana 1 — 11/11 a 15/11 · fundação · 6 h

| Pacote | Atividade | Horas | Depende de |
| --- | --- | --- | --- |
| 2.1 | Registrar os ADRs (escopo.md, seção 9) | 1 | — |
| 2.2 | Aplicar os ajustes do modelo (docs/modelo-de-dados.md), escrever os modelos SQLAlchemy, gerar a migration inicial e criar as categorias iniciais | 4 | 2.1 |
| 2.3 | Configurar Vitest e Testing Library, criar um teste de exemplo e incluir a etapa no CI | 1 | — |

### Semana 2 — 16/11 a 22/11 · acesso e rebanho · 12,5 h

O feriado de 20/11 (sexta) não entra na capacidade. Se o núcleo estiver em dia, ele é usado para puxar a Ampliação (seção 5).

| Pacote | Atividade | Horas | Depende de |
| --- | --- | --- | --- |
| 3 | Back-end: hash de senha, JWT, cadastro, login, cadastro de propriedade com declaração (RN35), dependência de propriedade ativa e testes de acesso negado | 3 | 2.2 |
| 3 | Front-end: adaptador de autenticação, sessão, rotas protegidas e logout; propriedades e cadastro com termo ligados à API; seletor de propriedade ativa; `shared/config/recursos.ts` com as funções ocultas (M1, M2, recuperação de senha e pacotes não integrados) | 2 | 3 (back) |
| 4 | Back-end: registro com criação dos animais, saldo derivado, edição, inativação (RN04), status e filtros | 2,75 | 3 |
| 4 | Front-end: telas Rebanho, Novo registro e Lote (com lista de animais) integradas | 2,25 | 4 (back) |
| 5 | Back-end: categorias, lançamento, estorno com bloqueio (RN05) e custo acumulado por categoria (RN16) | 2,25 | 4 |
| 1 | Revisão semanal e medição de velocidade | 0,25 | — |

### Semana 3 — 23/11 a 29/11 · custos, nota e vendas · 12,5 h

| Pacote | Atividade | Horas | Depende de |
| --- | --- | --- | --- |
| 5 | Front-end: tela Custos e aba Custos do lote integradas, com aviso da RN08 | 2,25 | 5 (back) |
| 6 | Interface de storage com implementação local, upload e download autenticados e teste de acesso negado à foto | 2 | 5 |
| 6 | Front-end: câmera ou galeria, compressão e foto visível durante o lançamento | 1,5 | 6 (back) |
| 7 | Domínio: conversão para arroba, custo alocado com recálculo, margens, custo por arroba e ponto de equilíbrio, com testes unitários (o exemplo da RN17 é o primeiro) | 3 | 5 |
| 7 | API: venda total ou parcial com seleção automática de animais (RN32) e indicadores do lote | 1,5 | 7 (domínio) |
| 7 | Front-end: registro de venda e indicadores no lote, com os avisos da RN22 e da RN23 | 2 | 7 (API) |
| 1 | Revisão semanal | 0,25 | — |

### Semana 4 — 30/11 a 06/12 · mercado, painel e entrega · 12,5 h

| Pacote | Atividade | Horas | Depende de |
| --- | --- | --- | --- |
| 8 | Cotações com aviso de duplicidade, cotação de referência e comparação com o ponto de equilíbrio (back e front) | 2,5 | 7 |
| 9 | Endpoint de resumo e tela Painel integrada | 2,5 | 7 |
| — | **Congelamento em 03/12** | — | 8, 9 |
| — | Contingência: atrasos do núcleo; se sobrar, o próximo item da Ampliação que caiba antes de 03/12 | 3,25 | — |
| 10.1 | Script de dados de demonstração | 1 | 9 |
| 10.2 | Roteiro de aceitação no celular e no desktop, com correções, no Chrome e no Firefox | 1,5 | 10.1 |
| 10.3 | release/1.0.0, tag v1.0.0, merge na main, slides e ensaio | 1,5 | 10.2 |
| 1 | Revisão final | 0,25 | — |

## 3. Gráfico de Gantt (núcleo)

~~~mermaid
gantt
    title Mo$chos Pecuária v1.0 — núcleo
    dateFormat YYYY-MM-DD
    axisFormat %d/%m

    section Fundação
    2.1 ADRs                         :a1, 2026-11-11, 1d
    2.2 Modelo e migration           :a2, after a1, 2d
    2.3 Vitest no CI                 :a3, 2026-11-14, 1d
    M1 Fundação                      :milestone, m1, 2026-11-15, 0d

    section Acesso e rebanho
    3 Acesso e propriedade           :b1, 2026-11-16, 2d
    4 Rebanho                        :b2, after b1, 3d
    5 Custos (back-end)              :b3, after b2, 1d
    M2 Acesso e rebanho              :milestone, m2, 2026-11-22, 0d

    section Custos e vendas
    5 Custos (front-end)             :c1, 2026-11-23, 1d
    6 Nota fiscal com foto           :c2, after c1, 2d
    7 Vendas e margens               :c3, after c2, 3d
    M3 Custos e vendas               :milestone, m3, 2026-11-29, 0d

    section Entrega
    8 Mercado                        :d1, 2026-11-30, 2d
    9 Painel                         :d2, 2026-11-30, 2d
    M4 Congelamento                  :milestone, m4, 2026-12-03, 0d
    Contingência                     :d3, 2026-12-02, 2d
    10.1 Dados de demonstração       :d4, 2026-12-04, 1d
    10.2 Aceitação e polimento       :d5, after d4, 1d
    10.3 Release e apresentação      :d6, 2026-12-06, 1d
    M5 Release v1.0.0                :milestone, m5, 2026-12-06, 0d
    M6 Apresentação                  :milestone, m6, 2026-12-07, 0d
~~~

## 4. Caminho crítico

2.2 Modelo → 3 Acesso e propriedade → 4 Rebanho → 5 Custos → 7 Vendas e margens → 9 Painel → 10 Encerramento

O pacote 3 entrou no caminho crítico porque todo endpoint depende da propriedade ativa. Os pacotes 2.3, 6 e 8 têm folga de alguns dias dentro da semana.

O pacote 7 continua sendo o de maior risco técnico e o coração do produto. Por isso os cálculos são escritos e testados antes da API e da tela.

## 5. Como a Ampliação entra

A fila está em escopo.md, seção 5.2 (A1 a A14, depois C1 a C5). Um item é puxado em qualquer uma destas situações:

- **Núcleo em dia na revisão semanal** (desvio acumulado menor ou igual a zero): o próximo item da fila entra na semana seguinte, nas horas que o núcleo não usar.
- **Horas além das 12,5 h planejadas** na semana, inclusive o feriado de 20/11: vão para a fila se o núcleo estiver em dia, e para o núcleo se estiver atrasado.
- **Contingência não usada** na semana 4: vai para o próximo item que termine antes do congelamento.

Regras:

- Um item da Ampliação só é integrado à develop completo, testado e dentro da DoD. Item pela metade fica na sua branch.
- Um item que não terminar até 03/12 fica para a versão seguinte, sem prejuízo da entrega.
- Na revisão do M2, divida as horas reais do núcleo pelas planejadas. Esse fator, aplicado às estimativas da fila, mostra até onde a Ampliação deve chegar. Registre isso na seção 8.

## 6. Gatilhos de corte do núcleo

Na revisão de cada marco, compare as horas reais com as planejadas (seção 8).

| Situação na revisão | Ação |
| --- | --- |
| Até 3 h de atraso acumulado | Absorver com a contingência da semana 4; a Ampliação fica parada |
| Mais de 3 h de atraso em M2 | RF04 sem filtros; RF16 só com estorno de custos (edição de notas e categorias vai para a fila) |
| Mais de 6 h de atraso em M3 | Foto da nota sem compressão (RNF07 vai para a fila) e painel com três indicadores (cabeças, custos do mês e margem) |
| Qualquer atraso em M4 | Nenhuma funcionalidade nova; a release sai com o que estiver integrado e aprovado no roteiro |

Nunca cortar: autenticação, propriedade ativa e isolamento (RNF05), foto da nota (RF09), cálculos de margem e ponto de equilíbrio (RF22, RF23), roteiro de aceitação e release.

## 7. Riscos

Probabilidade (P) e impacto (I): A = alto, M = médio, B = baixo.

| ID | Risco | P | I | Resposta |
| --- | --- | --- | --- | --- |
| R1 | Estimativas otimistas | A | A | Contingência, cortes definidos de antemão (seção 6) e medição de velocidade no M2 |
| R2 | Provas e trabalhos de outras disciplinas no fim do semestre | A | A | Caminho crítico nas semanas 1 a 3; Ampliação só com folga real |
| R3 | Erro nos cálculos financeiros (RN17 a RN25) | M | A | Testes unitários com os exemplos do documento antes da tela; Decimal em todo o cálculo; recálculo centralizado em um serviço de domínio |
| R4 | Modelo de dados exigir retrabalho | B | A | Modelo validado em 11/11 (o exemplo da RN17 foi reproduzido); ajustes aplicados antes da migration inicial |
| R5 | Câmera ou upload falharem no celular | M | M | Testar no celular já na semana 3; a galeria serve de alternativa |
| R6 | Escopo total (cerca de 84 h) maior que a capacidade (43,5 h) | A | M | Camadas Núcleo, Ampliação e Complementos, com fila fixa (escopo.md, seção 5.4) |
| R7 | Docker sem permissão na máquina de desenvolvimento (ainda acontece em 11/11) | A | M | Adicionar o usuário ao grupo docker na semana 1; sem isso não há banco local para o pacote 2.2 |
| R8 | Criação em massa de animais deixar o cadastro de lotes grandes lento | B | M | Inserção em lote na mesma transação; testar com 150 cabeças |
| R9 | Falha durante a apresentação ao vivo | B | A | Dados de demonstração, ensaio e vídeo curto do roteiro como reserva |
| R10 | Pacote JavaScript único de 870 kB (262 kB comprimido): primeira abertura lenta no celular com sinal fraco | M | M | No 10.2, carregar as rotas sob demanda (`lazy` do React Router) e medir de novo |
| R11 | CSS herdado do protótipo com cerca de 11 mil linhas e regras repetidas: ajustes visuais mais lentos | M | B | Não reorganizar agora; ao mexer numa tela, limpar só as regras dela |
| R12 | Dado de demonstração aparecer em produção numa parte de tela ainda não integrada | M | A | Regras do escopo.md (seção 5.5 e DoD); no 10.2, buscar `shared/demo` e `TODO(integração)` no build antes da release |
| R13 | Função adiada (M1 a M7) ou de pacote não integrado aparecer ativa | M | M | Chaves em `shared/config/recursos.ts`, desligadas por padrão, com teste que confere que as partes ocultas não aparecem |

## 8. Acompanhamento

Preencher na revisão semanal (domingo). "Desvio" = real − planejado, acumulado. "Fator" = horas reais ÷ planejadas do núcleo.

| Semana | Planejado (h) | Real (h) | Desvio acumulado | Fator | Marco atingido? | Itens da Ampliação concluídos | Observações e cortes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| S1 (11–15/11) | 6 | | | | M1: | | |
| S2 (16–22/11) | 12,5 | | | | M2: | | |
| S3 (23–29/11) | 12,5 | | | | M3: | | |
| S4 (30/11–06/12) | 12,5 | | | | M4/M5: | | |
