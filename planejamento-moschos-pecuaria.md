# Planejamento Interno

> **Documento histórico, superado pelo Documento-Requisitos-Moschos-Pecuaria.md.** Ele registra o raciocínio do pitch e não deve guiar a implementação. Em caso de divergência, vale o documento de requisitos. Divergências conhecidas:
>
> - A numeração de RF e RNF deste rascunho é diferente da numeração oficial.
> - A regra de custo em vendas parciais aqui ("custo total ÷ quantidade original") foi substituída pela RN17, que divide o custo ainda não alocado pelas cabeças existentes imediatamente antes de cada venda.

**Disciplina:** CSI606 – Sistemas WEB I
**Uso:** Rascunho de conteúdo para montagem dos slides (pitch de 5 minutos)
**Status:** Tópicos do pitch (1 a 8) desenvolvidos, mais a Seção 9 (implementações futuras) e as premissas para a Etapa 3. Escopo: único produto é boi (gado de corte); registro por lote ou individual; custos sempre vinculados a animal/lote; notas fiscais em papel digitalizadas por foto.

---

## 1. Apresentação da empresa ou negócio

- Propriedade rural familiar em Piedade de Ponte Nova (MG), ~70 hectares.
- Propriedade hereditária, em atividade há várias décadas.
- Gestão 100% familiar: 4 pessoas na gestão, poucos funcionários de apoio.
- Foco: pecuária de corte, ~150 cabeças de gado. Ciclo produtivo completo de ~3 anos.
- Rotina: alimentação com vegetação cultivada na própria fazenda, manutenção de infraestrutura, plantio parcial, maquinário básico de apoio (trator, equipamentos de preparo/plantio do solo).

---

## 2. Problema identificado

- **Controle de custos inexistente/informal:** feito por memória, notas fiscais e boletos, acompanhados via DDA no app do banco.
- **Reativo, não preventivo:** o custo só é percebido quando o boleto já foi gerado — dívida já existe, sem chance de antecipação.
- **Sem planejamento futuro:** boletos ainda não emitidos não entram em nenhuma previsão.
- **Sem rastreabilidade:** em meses com muitos boletos, alguns não trazem informação suficiente para identificar o que foi comprado.
- **Notas fiscais apenas em papel:** entregues no momento da compra, sem XML e sem CNPJ do produtor — não são digitalizadas nem organizadas, embora cada boleto tenha uma nota que diria exatamente o que foi comprado, quanto, quando e com que frequência (parte das compras é recorrente).
- **Decisão de venda sem dado estruturado:** baseada em observação visual do animal (maturidade/peso) + acompanhamento informal da cotação do boi gordo (MG) pelo Globo Rural, sem cruzamento com custo acumulado real.

---

## 3. Impactos do problema

- **Não sabe se está tendo lucro ou prejuízo** em nenhum lote — dado inexistente hoje.
- **Vendas em momento desfavorável, de forma recorrente:** casos concretos de venda achando que o preço estava bom, e o preço da arroba subir ainda mais depois.
- **Vendas prematuras por necessidade de caixa**, independente do mercado estar favorável.
- **Ciclo de 3 anos amplia o peso de cada erro** — um timing ruim carrega prejuízo acumulado de anos de custo, não de um mês.
- **Mercado bovino é instável** (acordos comerciais internacionais afetam o preço da carne) — variável que o produtor não controla, mas que hoje ele enfrenta sem nenhum dado de apoio.

---

## 4. Proposta de solução

- Aplicação web com banco de dados para **registro estruturado de estoque, custos e margem do gado de corte**, substituindo o controle reativo por memória/boletos.
- **Escopo do produto: apenas boi.**
- Cada animal ou lote de gado é cadastrado — **o usuário escolhe, no momento do cadastro, se o registro é individual (um animal) ou em lote (grupo de animais)** — com suas **variáveis de custo** (alimentação, insumos, manutenção etc.), lançadas **no momento da compra**, com a **foto da nota fiscal em papel anexada** — e não apenas descobertas quando o boleto chega.
- **Previsibilidade:** compras recorrentes são identificadas e projetadas, permitindo planejar gastos futuros antes de o boleto existir.
- Cálculo automático de **margem bruta e líquida**, comparando custo acumulado com valor de venda.
- Painel de referência com **histórico de cotação do boi gordo**, permitindo comparar o preço atual com o custo acumulado — dando uma base objetiva para decidir o melhor momento de venda, em vez de depender só da observação visual e do noticiário.
- Modelo de dados pensado para permanecer **extensível a outros produtos no futuro** (visão de produto, documentada como trabalho futuro), mas com escopo do MVP acadêmico focado exclusivamente no gado — coerente com o negócio investigado.

---

## 5. Público-alvo

- **Foco primário:** pequenos e médios produtores de pecuária de corte, com gestão familiar e sem controle financeiro estruturado — perfil representado pela propriedade investigada.
- Reforçar que esse é um padrão comum entre pequenos/médios produtores no Brasil, não um caso isolado — dá peso de relevância ao problema.
- Mencionar, brevemente, que o modelo de dados comporta expansão futura para outros produtos/nichos (sem tornar isso o foco do pitch — mantém coerência com o problema investigado, que é especificamente sobre gado).

---

## 6. Principais funcionalidades previstas (requisitos)

### Modelo de dados (resumo)

```
Nota Fiscal (opcional — nota em papel, entregue no momento da compra)
  ├── Foto da nota (imagem anexada pelo celular)
  ├── Fornecedor + data da compra + valor total
  └── Variável de Custo [n]

Variável de Custo → descrição do item + valor + data + Categoria de Custo (livre)
                    + destino: animal/lote específico (obrigatório nesta versão)
                    + recorrente? (sim/não) + periodicidade (se recorrente)
                    + nota fiscal de origem (opcional)

Animal/Lote (único produto do sistema: gado de corte)
  ├── Modo de registro: Individual (1 animal) ou Lote (N animais), à escolha no cadastro
  ├── Quantidade total original
  ├── Atributo do Produto [n]   → nome + valor livre        (ex.: Raça: Nelore)
  ├── Variável de Custo [n]     → custos com destino neste animal/lote
  └── Venda [n]                 → quantidade vendida + valor recebido + data + comprador (opcional)
```

- **Nota Fiscal**: registro da compra com a foto da nota em papel anexada, fornecedor, data e valor total. É opcional — o usuário também pode lançar um custo sem nota. A foto resolve diretamente o problema de rastreabilidade: o que foi comprado fica documentado, em vez de depender de um boleto pouco descritivo.
- **Variável de Custo**: descrição do item, valor, data, categoria de custo e animal/lote de destino (obrigatório nesta versão — não há custos gerais da propriedade). A marcação opcional de recorrência (ex.: compra mensal de ração) alimenta a projeção de custos futuros (RF08).
- **Categoria de Custo**: livre, criada pelo usuário (ex.: "Medicamento", "Suplemento", "Locação") — única forma de categorização do sistema, aplicada às variáveis de custo.
- **Animal/Lote**: unidade de registro, com quantidade total original. Sem categoria de produto (único produto do sistema é boi).
- **Atributo do Produto**: descritivo, nome + valor livre (ex.: raça, cor) — não entra no cálculo de margem.
- **Venda**: registro próprio (não um campo único no lote), já que um lote pode ser vendido em partes, para compradores diferentes, em datas diferentes. Cada venda tem sua própria quantidade, valor recebido, data e comprador opcional.

*Nota de escopo (atualizada):* as notas fiscais da propriedade são exclusivamente físicas (papel), entregues no momento da compra, sem XML e sem CNPJ do produtor. Por isso, importação de XML de NF-e, consulta à SEFAZ e integração com DDA **não se aplicam a este cliente** e ficam como evolução para outras propriedades (ver Seção 9). A solução do MVP é **digitalizar a nota por foto** (armazenada e anexada ao lançamento), com preenchimento assistido por memória de fornecedor e recorrência. A extração automática dos dados da foto (OCR/IA) fica como evolução pós-MVP, com a arquitetura já preparada (nota + imagem + formulário de conferência).

**Regra de cálculo de margem (premissa assumida para o MVP):**
```
Custo médio por animal = custo total acumulado do lote ÷ quantidade total original do lote
Margem de cada venda = valor recebido − (custo médio por animal × quantidade vendida naquela venda)
```
Simplificação consciente: não pondera o momento exato de cada lançamento de custo em relação à data de cada venda parcial — usa custo médio acumulado até o momento da venda. Documentar essa premissa na Etapa 3; pode ser refinada depois se o tempo permitir.

**Decisão — custos "gerais da propriedade"** (ex.: diesel, arame de cerca): ficam **fora do escopo desta versão**. O sistema considera apenas custos vinculados a um animal ou lote específico, e não há rateio. Consequências a documentar na Etapa 3: (a) a margem calculada é uma **margem sobre custos diretos**, portanto maior que a margem econômica real da propriedade; (b) uma compra usada em mais de um lote é lançada como um custo por lote (a mesma nota pode originar vários lançamentos).

### Requisitos funcionais (RF)

- RF01 — Autenticação de usuário (cadastro/login da entidade que gerencia o negócio)
- RF02 — Cadastro de animal/lote, com escolha de modo de registro (individual ou lote) e quantidade total
- RF03 — Cadastro de categorias de custo (livre, criadas pelo usuário)
- RF04 — Registro de nota fiscal: anexar foto da nota em papel (câmera ou galeria do celular), com fornecedor, data da compra e valor total
- RF05 — Lançamento de variáveis de custo (descrição, valor, data, categoria), com ou sem nota associada, sempre vinculado a um animal/lote específico e com a foto da nota visível durante o preenchimento
- RF06 — Memória de fornecedor: sugerir descrição e categoria de custo com base em lançamentos anteriores do mesmo fornecedor
- RF07 — Marcação de variável de custo como recorrente, com periodicidade; o sistema gera o lançamento previsto para o usuário confirmar
- RF08 — Projeção de custos futuros com base nas despesas recorrentes
- RF09 — Cadastro de atributos descritivos do animal/lote (nome + valor livre, ex.: raça)
- RF10 — Registro de referência de mercado/cotação (configurável manualmente)
- RF11 — Registro de vendas realizadas, totais ou parciais (quantidade, valor, data, comprador opcional)
- RF12 — Cálculo automático de margem bruta e líquida, por venda, por animal/lote e por categoria de custo
- RF13 — Consulta de saldo em estoque por lote (quantidade total − quantidade já vendida)
- RF14 — Consulta/histórico de custos, notas e vendas por animal/lote ao longo do tempo
- RF15 — Painel de resumo (dashboard) com indicadores de estoque, custo acumulado e margem, inclusive por categoria de custo
- RF16 — Pesquisa e filtro de animais/lotes e de notas/custos (por status, período, fornecedor, categoria)
- RF17 *(bônus)* — Importação periódica de cotação de referência (ex.: boi gordo CEPEA)
- RF18 *(complemento, se houver tempo)* — Registro de boleto por linha digitável (valor e vencimento), associado a uma nota
- RF19 *(evolução pós-MVP)* — Extração automática dos dados da foto da nota (OCR/IA), pré-preenchendo o formulário para conferência do usuário

### Requisitos não funcionais (RNF)

- RNF01 — Interface responsiva (mobile-first — uso real provável a partir do celular)
- RNF02 — Usabilidade simples, poucos cliques, linguagem acessível a baixo letramento tecnológico
- RNF03 — Segurança de dados (senha com hash, autenticação via token)
- RNF04 — Persistência confiável em banco relacional
- RNF05 — Desempenho adequado para baixo volume de usuários simultâneos (não é requisito de escala no MVP)
- RNF06 — Código versionado (Git), com fluxo de trabalho definido (Gitflow)
- RNF07 — Disponibilidade como aplicação web online (sem exigência de uso offline no MVP)
- RNF08 — Captura de foto diretamente pelo celular, com redução do tamanho da imagem antes do envio
- RNF09 — Armazenamento de imagens com acesso restrito ao dono dos dados, em conformidade com a LGPD (a foto pode conter dados pessoais)
- RNF10 — Extensibilidade: a extração automática (RF19) deve ser implementável como módulo substituível, sem alterar o fluxo de lançamento

### Priorização de implementação (semanas 10–16)

| Prioridade | Requisitos | Observação |
|---|---|---|
| 1 — Base | RF01, RF02 + RNF03, RNF04, RNF06 | Segurança e versionamento desde o primeiro commit |
| 2 — Núcleo de valor | RF03, RF04, RF05, RF09, RF10, RF11, **RF12** + RNF08, RNF09 | RF12 (margem) é o coração da proposta; RF04/RF05 (nota + custo) resolvem a rastreabilidade |
| 3 — Redução de esforço e consulta | RF06, RF07, RF13, RF14, RF16 | Memória de fornecedor e recorrência diminuem a digitação por nota |
| 4 — Visibilidade | RF15 (dashboard), RF08 (projeção), refinamento de RNF01/RNF02 | Dependem dos dados das prioridades 1–3 |
| 5 — Complementos | RF18, RF17 | Só se sobrar tempo |
| Pós-MVP | RF19 | Decidir após testar com notas reais do produtor |

*Nota: RNF01 e RNF02 devem permear todas as entregas desde a prioridade 1, não só o polimento final.*
---

## 7. Tecnologias (decisão final)

**Front-end**
- React (Biblioteca/Framework)
- TypeScript (Linguagem)
- Vite (Build tool)
- React Router (Roteamento)
- Arquivos `.env` do Vite (Configuração)
- Vitest + React Testing Library (Testes)

**Back-end**
- Python (FastAPI)
- PostgreSQL (Banco de Dados)
- SQLAlchemy + Alembic (ORM e Migrations)
- Docker (Virtualização)
- pydantic-settings + .env (Configuração)
- pytest (Testes)
- Vercel Blob em modo privado (armazenamento das fotos das notas): upload feito pelo FastAPI via SDK Python da Vercel, plano Hobby gratuito

**CI/CD**
- GitHub Actions

**Ferramentas gerais**
- Git/GitHub (Versionamento/Hospedagem)
- Gitflow (Modelo de desenvolvimento)

*Notas de decisão:*
- **Banco de dados:** PostgreSQL foi escolhido no lugar do MySQL original, já que a meta de deploy em produção é a Vercel — o Marketplace da Vercel oferece opções de Postgres com plano gratuito (Neon, Supabase), enquanto a opção de MySQL (PlanetScale) deixou de ter plano gratuito. Como já havia bagagem prévia em PostgreSQL, a troca reduz custo e risco.
- **Deploy:** React tem suporte nativo de primeira classe na Vercel (a própria empresa por trás do Next.js), o que reforça a escolha também do ponto de vista de produção.
- **Armazenamento de imagens:** Vercel Blob, por já estar no ecossistema de deploy e ser gratuito no plano Hobby dentro dos limites. Usar store **privado** (a foto pode conter dados pessoais), com upload e leitura sempre intermediados pelo back-end autenticado. Isolar o acesso em uma camada de armazenamento no back-end (guardar no banco apenas o caminho do arquivo), para permitir trocar de provedor depois. Conferir os limites vigentes no painel da Vercel antes de depender deles.

---

## 8. Benefícios esperados

- Visibilidade real do custo por animal/lote — fim do "descobrir o custo só quando a dívida chega".
- Planejamento financeiro preventivo, em vez de reativo.
- Custo registrado no momento da compra, com a nota em papel digitalizada — antes de o boleto existir.
- Previsibilidade de gastos recorrentes, hoje inexistente.
- Rastreabilidade dos gastos por categoria de custo (fim do problema de boletos sem informação suficiente para identificação).
- Decisão de venda apoiada em dado histórico de cotação, não só em observação visual e intuição.
- Redução do risco de repetir vendas em momento desfavorável, como já ocorreu na prática.
- Base de dados construída ao longo do tempo pelo próprio uso, sem depender de fontes externas complexas no MVP.

---

## 9. Implementações futuras

Itens deliberadamente fora do MVP. Cada um indica o que o MVP já deixa preparado, para que a evolução seja uma extensão e não um retrabalho. Esta seção também serve ao item "melhorias futuras" da apresentação final (Etapa 7).

| # | Implementação | Horizonte | O que o MVP já prepara |
|---|---|---|---|
| 9.1 | Extração automática dos dados da foto da nota (abordagem B) | Curto prazo (primeira evolução) | Nota Fiscal com imagem, formulário de conferência, memória de fornecedor, módulo substituível (RNF10) |
| 9.2 | Custos gerais da propriedade e rateio entre lotes | Curto/médio prazo | Variável de Custo com destino; fórmula de custo médio documentada |
| 9.3 | Inteligência de mercado e apoio à decisão de venda | Curto/médio prazo | Referência de cotação manual (RF10); histórico de custos e vendas |
| 9.4 | Automação do registro de custos | Médio prazo | Recorrência marcada pelo usuário (RF07); boleto por linha digitável (RF18, complemento) |
| 9.5 | Evoluções de modelo e de produto | Médio/longo prazo | Modelo genérico de custos e atributos livres |
| 9.6 | Ampliação para outras propriedades (integrações fiscais e bancárias) | Longo prazo | Entidade Nota Fiscal independente da origem do dado |

### 9.1 Extração automática dos dados da foto da nota (abordagem B — RF19)

- **O que é:** ao anexar a foto da nota, o sistema lê fornecedor, data, itens, valores e total (OCR/IA) e pré-preenche o formulário de lançamento. O usuário confere, corrige e confirma. Nenhum dado é gravado sem confirmação.
- **Por que importa:** a digitação por nota é o principal esforço manual do MVP. Reduzi-lo torna viável registrar o custo na hora da compra, que é o ponto central da proposta.
- **Opções de implementação (a escolher após validação):** serviços de OCR de documentos em nuvem; modelos de IA com visão, que devolvem os campos em formato estruturado; OCR local (por exemplo, Tesseract), de custo menor e qualidade geralmente inferior em foto de celular.
- **Riscos:** baixa acurácia em notas manuscritas ou com papel térmico apagado; custo variável por imagem (relevante para monetização); envio da imagem a um terceiro, exigindo informar o usuário (LGPD); dependência de provedor.
- **Validação antes de decidir:** reunir uma amostra de notas reais do produtor (de vários fornecedores), medir o percentual de campos extraídos corretamente e comparar o tempo de lançamento com e sem extração.

### 9.2 Custos gerais da propriedade e rateio entre lotes

- **O que é:** permitir lançar custos que não pertencem a um lote específico (diesel, arame de cerca, sal para todo o rebanho) e distribuí-los entre os lotes ativos.
- **Regras de rateio a avaliar:** proporcional ao número de animais em estoque; ou proporcional a animais-dia (considera quanto tempo cada animal ficou na propriedade no período), mais justa quando há entradas e saídas ao longo do tempo.
- **Impacto no modelo:** novo tipo de destino em Variável de Custo ("geral"), definição do período de rateio e revisão da fórmula de custo médio.
- **Ganho:** a margem deixa de ser apenas "sobre custos diretos" e se aproxima da margem real da propriedade.

### 9.3 Inteligência de mercado e apoio à decisão de venda

- Integração automática com cotação do boi gordo (CEPEA ou provedor de dados agro), com histórico e tendência. Não há API pública gratuita oficial, então envolve coleta programada ou provedor pago (RF17 é o primeiro passo, ainda manual ou semiautomático).
- Sugestão do melhor momento de venda, comparando a cotação com o custo acumulado do lote (ponto de equilíbrio).
- Alertas proativos (por exemplo, margem em queda ou cotação em alta para a categoria do usuário).
- Camada preditiva simples (médias móveis, sazonalidade) sobre o histórico acumulado pelo próprio uso.

### 9.4 Automação do registro de custos

- Detecção automática de recorrência a partir do histórico de compras (no MVP, o usuário marca).
- Registro de boleto por linha digitável (valor e vencimento), associado à nota correspondente, com lembretes de vencimento.

### 9.5 Evoluções de modelo e de produto

- Refinar o cálculo de margem em vendas parciais, ponderando o momento de cada lançamento de custo (hoje usa custo médio simples).
- Incluir outros produtos da propriedade (leite, esterco) e abrir uma categoria de produto livre, generalizando o sistema para outros negócios.
- Modo offline com sincronização, para uso no campo onde a conectividade é irregular.
- Upload de notas em lote e organização por período para prestação de contas.

### 9.6 Ampliação para outras propriedades (integrações fiscais e bancárias)

Abordagens que não se aplicam ao cliente atual (notas só em papel, sem XML, sem CNPJ do produtor), mas fazem sentido para propriedades com outro perfil:

| Abordagem | Quando faz sentido | Observação |
|---|---|---|
| Importação de XML de NF-e | Fornecedores que enviam o XML por e-mail ou WhatsApp | Leitura gratuita, sem API externa; traz itens e parcelas |
| Consulta automática na SEFAZ (Distribuição DF-e) | Produtor com certificado digital | Exige custódia do certificado e manifestação do destinatário; implica LGPD |
| DDA via agregadores e Open Finance | Operação com orçamento para serviços pagos | Produtos comerciais voltados a ERPs; caminho de produto pago |
| Leitura de chave de acesso ou QR code da nota | Notas eletrônicas impressas (DANFE/NFC-e) | Evita duplicidade e pré-identifica o emitente |
