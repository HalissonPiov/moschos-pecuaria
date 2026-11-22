# Arquitetura do Mo$chos Pecuária

Data da decisão: 25 de outubro de 2026. Revisado em 11 de novembro de 2026 para a versão revisada 2 dos requisitos e em 15 de novembro de 2026 para a versão 2 do modelo de dados. O escopo está definido no documento de requisitos do repositório, e o modelo de dados, em db/ (validação em docs/db/modelo-de-dados.md).

## Decisão

O sistema é um monólito modular em um único repositório, com dois aplicativos independentes:

- frontend: React, TypeScript e Vite;
- backend: FastAPI, PostgreSQL, SQLAlchemy e Alembic.

O front-end é organizado por domínio de negócio. O back-end usa API, aplicação, domínio e infraestrutura. Essa combinação preserva a familiaridade com MVC, mas retira regras financeiras de controllers e componentes visuais.

~~~mermaid
flowchart LR
  UI[React: páginas e componentes] --> Feature[Feature e adaptador HTTP]
  Feature --> API[FastAPI: endpoint e schema]
  API --> UseCase[Aplicação: caso de uso]
  UseCase --> Domain[Domínio: regras e cálculos]
  UseCase --> Ports[Repositório e armazenamento]
  Ports --> Infra[PostgreSQL e armazenamento de fotos]
~~~

O MVP tem poucos usuários, mas regras importantes de saldo, venda parcial, custo alocado, margem e recorrência. Microserviços acrescentariam complexidade de implantação e transação sem resolver uma necessidade atual.

## MVC e camadas

| Papel | Local | Responsabilidade |
| --- | --- | --- |
| View | frontend/src/features e shared/ui | Interação, acessibilidade e estado de tela |
| Controller | backend/app/api/v1/endpoints | HTTP, autenticação, entrada e resposta |
| Model | domain e infrastructure/database | Regras e persistência |
| Caso de uso | backend/app/application | Coordenação da transação e das regras |

Assim, endpoint não calcula margem, página não conhece PostgreSQL e repositório não contém regra de negócio.

## Estrutura

~~~
moschos-pecuaria/
├── frontend/
│   ├── public/assets/                 # ativos trazidos do protótipo (Figma Make)
│   └── src/
│       ├── app/                       # bootstrap e rotas
│       ├── features/                  # auth, properties, herd, costs, sales...
│       ├── shared/                    # api, config, demo, layout, routing e ui
│       └── styles/                    # estilos por área (acesso, rebanho, custos, vendas)
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/          # controllers HTTP
│   │   ├── application/               # casos de uso por domínio
│   │   ├── domain/                    # entidades e regras puras
│   │   ├── infrastructure/database/   # SQLAlchemy e sessão
│   │   ├── infrastructure/repositories/
│   │   └── infrastructure/storage/    # provedor de fotos privado
│   ├── alembic/versions/              # migrations
│   └── tests/
├── db/                              # modelo relacional lógico (.dbml) e SQL gerado
├── docs/                            # arquitetura, ADRs, modelo de dados e gestão
└── docker-compose.yml
~~~

As pastas de domínio no back-end foram criadas para identity, properties, herd, costs, sales e market. Elas permanecem vazias até o respectivo caso de uso ser iniciado, evitando um diretório genérico de serviços.

## Tratamento do protótipo

O protótipo do Figma Make passou por duas versões. A primeira foi transferida de Prototipo Navegável Mo$chos para frontend. Em 21/11/2026, as telas foram substituídas pelo protótipo V2, ajustado aos requisitos v2 e ao modelo de dados (etapas 0 a 6 do prompt de ajustes da interface). A estrutura do projeto Vite, o cliente de API, a configuração, os testes e o CI foram mantidos.

| Conteúdo do V2 (src/legacy) | Destino em frontend/src |
| --- | --- |
| pages/LoginPage | features/auth/pages |
| pages/PropertiesPage, pages/InvitePage, components/PropertyRegistration | features/properties |
| pages/DashboardPage | features/dashboard/pages |
| pages/HerdPage, AnimalFormPage, LotDetailPage; components/LotAnimals, LotMovements, PastureSheet | features/herd |
| pages/CostsPage, PurchasePage; components/PredictedCostModal | features/costs |
| pages/FinancialPage, SalesPage, MarketPage, SettingsPage | features do respectivo domínio |
| components/UI, components/BusinessRules | shared/ui |
| components/AppShell | shared/layout |
| app/navigation (propriedade ativa pela rota) | shared/routing |
| app/data, livestock, corrections, demo-backend, backend-data | shared/demo |
| legacy.css e os estilos da etapa 6 | index.css e styles/ |

A infraestrutura do Figma Make não entrou no projeto: Next.js, Payload CMS, a pasta .figma, AGENTS.md, regras de Git LFS e o formatador oxfmt. O `next/image` virou `<img>`, e os tipos que vinham do Payload estão em shared/demo/types.ts. As versões das dependências do front-end continuam as do projeto.

Os valores das telas continuam sendo dados de demonstração, todos em shared/demo, para preservar a navegação. O app/integration-notes.ts diz onde está cada dado fictício, e os pontos de troca estão marcados com `TODO(integração)` nas telas. Para integrar uma tela, a feature deve declarar contratos em shared/api/contracts, implementar seu adaptador em features/nome-do-dominio/api e usar shared/api/client. Páginas e componentes não devem chamar fetch diretamente. Ao integrar, a leitura de shared/demo é trocada pela resposta da API, e o que sobrar de shared/demo é apagado.

As funções do protótipo que o modelo de dados v2 não sustenta (M1 a M7, por exemplo a confirmação de e-mail e a logo da propriedade) ficam ocultas na integração, conforme o controle de mudanças do escopo.

## Fronteira HTTP

A URL da API vem de VITE_API_URL no arquivo frontend/.env. Localmente, o valor padrão é http://localhost:8000/api/v1. Os endpoints GET /health (API no ar) e GET /health/db (conexão com o PostgreSQL) já existem para validar a comunicação.

Os recursos devem respeitar a propriedade como fronteira:

| Domínio | Recursos iniciais |
| --- | --- |
| Acesso | POST auth/register, auth/login, auth/refresh e auth/logout |
| Propriedades | GET/POST properties, GET/PATCH properties/{id}, membros e convites (aceite em invites/{token}) |
| Rebanho | registros de estoque, animais, pastos, movimentações e pesagens |
| Custos | notas (com a foto), categorias, fornecedores, custos, recorrências e projeção |
| Vendas | compradores, vendas, ofertas e simulações por registro |
| Mercado | cotações manuais e cotação de referência |
| Painel | resumo da propriedade |

Exceto acesso, convites e a lista das próprias propriedades, todo recurso fica sob /properties/{property_id}/. Uma dependência do FastAPI resolve a propriedade ativa a partir da rota, confere o vínculo do usuário autenticado e entrega ao caso de uso o vínculo com o papel (RN31, RN37). Os repositórios sempre filtram por propriedade, então um id de outra propriedade é tratado como inexistente (404).

## Regras e integridade

- O saldo de cabeças é derivado dos animais sem venda e sem baixa e nunca fica negativo (RN03).
- Venda e baixa vinculam os animais que saíram, com seleção automática quando nenhum animal tem dados individuais (RN32); o estorno os devolve ao saldo (RN34).
- Venda parcial segue a RN17. O custo alocado é gravado na venda e recalculado por um serviço de domínio sempre que um custo, venda ou baixa o afete.
- Só a decisão do produtor ("Em produção" ou "Pronto para venda") é gravada, na coluna `situacao_producao`. "Parcialmente vendido", "Vendido" e "Encerrado" (saldo zero sem venda, isto é, todos os animais baixados) são calculados a partir do saldo e das vendas não estornadas, por consulta ou view, de modo que o estorno de uma venda não perde a decisão original (RN02).
- Custo previsto não entra no custo acumulado; custo realizado entra mesmo a pagar.
- Venda total bloqueia edição sem justificativa registrada.
- A margem do MVP é sobre custos diretos, como definido nas RN20 a RN22.
- Valores monetários usam Decimal no back-end e NUMERIC no PostgreSQL; float é proibido.
- O banco é criado e alterado somente por migrations Alembic. Toda mudança estrutural gera uma migration, e o .dbml em db/ é atualizado junto, com o .sql regerado por `dbml2sql`. O .dbml e o .sql servem de referência e diagrama; a aplicação não os executa.
- Regras simples de valor ficam também em CHECKs no banco, com nomes no padrão `ck_<tabela>_<regra>`, abreviando a tabela quando o nome é longo (`ck_registro_*`, `ck_movimentacao_*`). Nos modelos SQLAlchemy, o `naming_convention` do `MetaData` nomeia índices e chaves, e cada CHECK recebe o nome do .dbml com `conv()`. O animal só pode apontar para um registro da mesma propriedade (chave estrangeira composta); as demais ligações entre propriedades são verificadas na aplicação, com teste.
- Valores enumerados são gravados como `varchar` com CHECK, usando `Enum(..., native_enum=False, create_constraint=True)` no SQLAlchemy. Incluir um valor novo exige uma migration escrita à mão, pois o Alembic não detecta mudança em CHECK.
- Datas e horas de registro usam `timestamptz` (`DateTime(timezone=True)`); datas de negócio usam `date`.
- Estornos preservam o histórico: custos (`estornado_em`), vendas e baixas (`estornada_em`) recebem a data do estorno em vez de serem apagados, e o estorno de venda ou de baixa devolve os animais ao saldo (RN34).

## Segurança e armazenamento

Senhas devem usar hash forte; tokens e autorização ficam no módulo core. O banco guarda a chave da imagem, não uma URL pública. O adaptador em infrastructure/storage envia e lê fotos somente após a API autenticada autorizar o usuário e a propriedade. Nesta entrega a implementação é um diretório local privado, fora da pasta pública. Essa fronteira permite trocar por um provedor em nuvem (por exemplo, Vercel Blob privado) sem alterar os casos de uso (RNF14).

OCR e cotação automática continuam fora do MVP. Quando existirem, serão adaptadores chamados pela aplicação, nunca dependências diretas de páginas ou regras de domínio.

## Sequência para novas funcionalidades

1. Definir o contrato de entrada e saída.
2. Implementar regra no domínio e caso de uso em application.
3. Criar migration, repositório e endpoint.
4. Criar adaptador da feature no front-end.
5. Substituir o dado de demonstração depois que o endpoint estiver validado.
6. Testar regra e endpoint.

## Testes

- Domínio: pytest puro, sem banco, com os exemplos numéricos do documento de requisitos.
- API: pytest com TestClient. Todo endpoint tem um teste de acesso negado a outra propriedade.
- Front-end: Vitest e Testing Library para componentes com lógica de tela (RNF15).
- O CI roda todas as suítes em cada push e pull request.
