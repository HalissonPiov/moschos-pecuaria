# Cronograma de Atividades — Mo$chos Pecuária v1.0

| Item | Valor |
| --- | --- |
| Período | 09/11/2026 a 06/12/2026 (4 semanas); apresentação em 07/12/2026 |
| Capacidade | 12,5 h por semana em média, total de 50 h |
| Escopo | escopo.md (os IDs dos pacotes vêm da EAP, seção 5) |
| Versão deste documento | 1.0 — 08/11/2026 |

## 1. Marcos

| Marco | Data | Critério para considerar atingido |
| --- | --- | --- |
| M0 Planejamento aprovado | 08/11 (dom) | Escopo e cronograma revisados e commitados |
| M1 Fundação e acesso | 15/11 (dom) | Banco migrado; cadastro e login funcionando do front ao banco; usuário de outra propriedade recebe acesso negado |
| M2 Rebanho e custos | 22/11 (dom) | Lote cadastrado com custos (um deles com foto) e custo acumulado por categoria visível na tela do lote |
| M3 Congelamento de funcionalidades | 29/11 (dom) | Vendas, margens, cotação e painel integrados; daqui em diante só entram correções |
| M4 Release v1.0.0 | 06/12 (dom) | Roteiro de aceitação (escopo.md, seção 6) aprovado; release/1.0.0 integrada à main com a tag v1.0.0 |
| M5 Apresentação | 07/12 (seg) | Apresentação feita com os dados de demonstração |

## 2. Cronograma semanal

### Semana 1 — 09/11 a 15/11 · fundação e acesso · 13 h

| Pacote | Atividade | Horas | Depende de |
| --- | --- | --- | --- |
| 2.1 | Registrar os ADRs das decisões pendentes (escopo.md, seção 9) | 1 | — |
| 2.2 | Concluir o modelo lógico (db/) e convertê-lo em modelos SQLAlchemy, migration inicial e categorias iniciais | 4 | 2.1 |
| 3 | Back-end: hash de senha, JWT, cadastro, login, dependência de usuário atual e vínculo com a propriedade, com testes | 3 | 2.2 |
| 3 | Front-end: login e cadastro integrados, armazenamento do token, rotas protegidas, logout e propriedade atual nas rotas | 2 | 3 (back) |
| 4 | Back-end do rebanho: criação e listagem de registros, saldo por movimentações | 2,75 | 2.2 |
| 1.1 | Revisão semanal | 0,25 | — |

### Semana 2 — 16/11 a 22/11 · rebanho, custos e nota · 12,5 h

O feriado de 20/11 (sexta) pode ser usado para adiantar trabalho, mas não entra na capacidade.

| Pacote | Atividade | Horas | Depende de |
| --- | --- | --- | --- |
| 4 | Back-end: edição, inativação (RN04), status (RN02) e filtros | 1,25 | 4 (S1) |
| 4 | Front-end: telas Rebanho, Novo registro e Lote integradas | 2 | 4 (back) |
| 5 | Back-end: categorias, custos, custo acumulado por categoria (RN16) e bloqueio após a venda total (RN05) | 3 | 4 |
| 5 | Front-end: tela Custos e aba Custos do lote integradas | 2 | 5 (back) |
| 6 | Interface de storage com implementação local, upload e download autenticados e teste de acesso negado à foto | 2,5 | 5 |
| 6 | Front-end: captura pela câmera ou galeria, compressão e foto visível durante o lançamento | 1,5 | 6 (back) |
| 1.1 | Revisão semanal | 0,25 | — |

### Semana 3 — 23/11 a 29/11 · vendas, mercado e painel · 13,25 h

| Pacote | Atividade | Horas | Depende de |
| --- | --- | --- | --- |
| 7 | Domínio: conversão para arroba, custo alocado, margens, custo por arroba e ponto de equilíbrio, com testes unitários (o exemplo da RN17 é o primeiro teste) | 3,5 | 5 |
| 7 | API: registrar venda total ou parcial, atualizar o status e expor os indicadores do lote | 1,5 | 7 (domínio) |
| 7 | Front-end: registro de venda e indicadores na tela do lote, com o aviso da RN22 | 2 | 7 (API) |
| 8 | Cotações: cadastro com aviso de duplicidade, cotação de referência e comparação com o ponto de equilíbrio (back e front) | 3 | 7 |
| 9 | Endpoint de resumo e tela Painel integrada | 3 | 7 |
| 1.1 | Revisão semanal e verificação do congelamento | 0,25 | — |

### Semana 4 — 30/11 a 06/12 · estabilização e entrega · 11,25 h

| Pacote | Atividade | Horas | Depende de |
| --- | --- | --- | --- |
| — | Contingência: atrasos das semanas anteriores; se sobrar, itens Should em ordem (escopo.md, seção 5) | 6 | — |
| 10.1 | Script de dados de demonstração | 1 | 9 |
| 10.2 | Roteiro de aceitação no celular e no desktop, correções e conferência no Chrome e no Firefox | 2 | 10.1 |
| 10.3 | release/1.0.0, tag v1.0.0, merge na main, slides e ensaio | 2 | 10.2 |
| 1.1 | Revisão final | 0,25 | — |

## 3. Gráfico de Gantt

~~~mermaid
gantt
    title Mo$chos Pecuária v1.0
    dateFormat YYYY-MM-DD
    axisFormat %d/%m

    section Fundação
    2.1 ADRs                         :a1, 2026-11-09, 1d
    2.2 Modelo e migration           :a2, after a1, 2d
    M1 Fundação e acesso             :milestone, m1, 2026-11-15, 0d

    section Acesso
    3 Autenticação e propriedade     :b1, after a2, 3d

    section Rebanho
    4 Back-end (criação e saldo)     :c1, after a2, 3d
    4 Edição, status e telas         :c2, 2026-11-16, 2d

    section Custos e nota
    5 Custos e custo acumulado       :d1, after c2, 3d
    6 Nota fiscal com foto           :d2, after d1, 2d
    M2 Rebanho e custos              :milestone, m2, 2026-11-22, 0d

    section Vendas e mercado
    7 Domínio e testes               :e1, 2026-11-23, 2d
    7 API e telas de venda           :e2, after e1, 2d
    8 Mercado                        :e3, after e2, 2d
    9 Painel                         :e4, after e2, 2d
    M3 Congelamento                  :milestone, m3, 2026-11-29, 0d

    section Entrega
    Contingência e itens Should      :f1, 2026-11-30, 4d
    10.1 Dados de demonstração       :f2, 2026-12-03, 1d
    10.2 Aceitação e polimento       :f3, after f2, 1d
    10.3 Release e apresentação      :f4, after f3, 2d
    M4 Release v1.0.0                :milestone, m4, 2026-12-06, 0d
    M5 Apresentação                  :milestone, m5, 2026-12-07, 0d
~~~

## 4. Caminho crítico

2.1 ADRs → 2.2 Modelo → 4 Rebanho → 5 Custos → 7 Vendas e margens → 9 Painel → 10 Encerramento

Um atraso em qualquer um desses pacotes atrasa a entrega. Os pacotes 3 (acesso), 6 (nota), 8 (mercado) e os itens Should têm folga relativa: podem escorregar alguns dias dentro da semana sem mover os marcos.

O pacote 7 é o de maior risco técnico e o coração do produto. Por isso os cálculos são escritos e testados antes da API e da tela.

## 5. Gatilhos de corte de escopo

Na revisão de cada marco, compare as horas reais com as planejadas (seção 7).

| Situação na revisão | Ação |
| --- | --- |
| Até 3 h de atraso acumulado | Absorver com a contingência da semana 4 |
| Mais de 3 h de atraso em M1 ou M2 | Cancelar todos os itens Should e reduzir RF04 a criar, listar e inativar (sem edição nem filtros) |
| Mais de 6 h de atraso em M2 | Também reduzir RF16 a excluir (sem editar) e entregar a foto da nota sem compressão (RNF07) |
| Qualquer atraso em M3 | Painel com três indicadores (cabeças, custos do mês e margem), sem custo acumulado por registro |

Nunca cortar: autenticação e isolamento por propriedade (RNF05), cálculos de margem e ponto de equilíbrio (RF21, RF22), roteiro de aceitação e release.

## 6. Riscos

Probabilidade (P) e impacto (I): A = alto, M = médio, B = baixo.

| ID | Risco | P | I | Resposta |
| --- | --- | --- | --- | --- |
| R1 | Estimativas otimistas para quem desenvolve sozinho | A | A | Contingência de 6 h, cortes definidos de antemão (seção 5), revisão semanal com horas reais |
| R2 | Provas e trabalhos de outras disciplinas no fim do semestre | A | A | Concentrar o caminho crítico nas semanas 1 a 3; usar o feriado de 20/11 como folga |
| R3 | Erro nos cálculos financeiros (RN17 a RN25) | M | A | Testes unitários com os exemplos do documento de requisitos antes da tela; Decimal em todo o cálculo |
| R4 | Modelo de dados exigir retrabalho depois do pacote 4 | M | A | ADRs antes dos modelos; validar o modelo contra o fluxo de venda parcial antes da migration inicial |
| R5 | Câmera ou upload falhar no celular | M | M | Testar no celular já na semana 2 (o Vite está exposto na rede local); a galeria serve de alternativa |
| R6 | Escopo crescer durante o desenvolvimento | M | M | Registro de mudanças (escopo.md, seção 8) e congelamento em 29/11 |
| R7 | Docker sem permissão na máquina de desenvolvimento | A | B | Adicionar o usuário ao grupo docker na semana 1; o PostgreSQL também pode rodar fora do Docker |
| R8 | Falha durante a apresentação ao vivo | B | A | Dados de demonstração, ensaio e vídeo curto do roteiro como reserva |

## 7. Acompanhamento

Preencher na revisão semanal (domingo). "Desvio" = real − planejado, acumulado.

| Semana | Planejado (h) | Real (h) | Desvio acumulado | Marco atingido? | Observações e cortes aplicados |
| --- | --- | --- | --- | --- | --- |
| S1 (09–15/11) | 13 | | | M1: | |
| S2 (16–22/11) | 12,5 | | | M2: | |
| S3 (23–29/11) | 13,25 | | | M3: | |
| S4 (30/11–06/12) | 11,25 | | | M4: | |
