# Arquitetura do Mo$chos Pecuária

Data da decisão: 25 de outubro de 2026. O escopo está definido no documento de requisitos do repositório.

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
  Ports --> Infra[PostgreSQL e Blob]
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
│       └── shared/                    # api, config, layout e ui
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
├── docs/
└── docker-compose.yml
~~~

As pastas de domínio no back-end foram criadas para identity, properties, herd, costs, sales e market. Elas permanecem vazias até o respectivo caso de uso ser iniciado, evitando um diretório genérico de serviços.

## Tratamento do protótipo

O protótipo foi preservado e transferido de Prototipo Navegável Mo$chos para frontend.

| Conteúdo original | Destino |
| --- | --- |
| Login | features/auth/pages |
| Propriedades | features/properties/pages |
| Painel | features/dashboard/pages |
| Rebanho e lote | features/herd/pages |
| Custos e compra | features/costs/pages |
| Vendas, mercado, finanças e configurações | features do respectivo domínio |
| UI.tsx | shared/ui |
| AppShell.tsx | shared/layout |
| public/assets | preservado em frontend/public/assets |

A infraestrutura específica do Figma Make (pasta .figma, plugins do vite.config.ts, AGENTS.md, regras de Git LFS e o formatador oxfmt) foi removida. O front-end é um projeto Vite comum, sem dependência da plataforma de prototipação.

Os valores das telas continuam sendo dados de demonstração para preservar a navegação do protótipo. Para integrar uma tela, a feature deve declarar contratos em shared/api/contracts, implementar seu adaptador em features/nome-do-dominio/api e usar shared/api/client. Páginas e componentes não devem chamar fetch diretamente.

## Fronteira HTTP

A URL da API vem de VITE_API_URL no arquivo frontend/.env. Localmente, o valor padrão é http://localhost:8000/api/v1. Os endpoints GET /health (API no ar) e GET /health/db (conexão com o PostgreSQL) já existem para validar a comunicação.

Os recursos devem respeitar a propriedade como fronteira:

| Domínio | Recursos iniciais |
| --- | --- |
| Acesso | POST auth/register, auth/login e auth/refresh |
| Propriedades | GET/POST properties e GET/PATCH properties por id |
| Rebanho | registros de estoque, movimentos, pesagens e atributos |
| Custos | notas, categorias, custos, recorrências e projeções |
| Vendas | vendas e simulações por registro |
| Mercado | cotações manuais |
| Painel | resumo por propriedade |

O identificador da propriedade vem da rota ou sessão selecionada. Cada caso de uso verifica a associação do usuário autenticado antes de consultar ou alterar qualquer dado.

## Regras e integridade

- Saldo de cabeças nunca fica negativo.
- Venda parcial segue a RN17 para alocação de custo.
- Custo previsto não entra no custo acumulado; custo realizado entra mesmo a pagar.
- Venda total bloqueia edição sem justificativa registrada.
- A margem do MVP é sobre custos diretos, como definido nas RN20 a RN22.
- Valores monetários usam Decimal no back-end e NUMERIC no PostgreSQL; float é proibido.
- Toda mudança estrutural de banco gera migration Alembic.

## Segurança e armazenamento

Senhas devem usar hash forte; tokens e autorização ficam no módulo core. O banco guarda a chave da imagem, não uma URL pública. O adaptador em infrastructure/storage envia e lê fotos somente após a API autenticada autorizar o usuário e a propriedade. Essa fronteira permite usar Vercel Blob privado agora e trocar o provedor depois.

OCR e cotação automática continuam fora do MVP. Quando existirem, serão adaptadores chamados pela aplicação, nunca dependências diretas de páginas ou regras de domínio.

## Sequência para novas funcionalidades

1. Definir o contrato de entrada e saída.
2. Implementar regra no domínio e caso de uso em application.
3. Criar migration, repositório e endpoint.
4. Criar adaptador da feature no front-end.
5. Substituir o dado de demonstração depois que o endpoint estiver validado.
6. Testar regra e endpoint.
