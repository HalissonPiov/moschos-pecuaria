# Mo$chos Pecuária

Sistema web para controle de rebanho, custos diretos, vendas e apoio à decisão de venda.

Leia docs/arquitetura.md para entender a estrutura e as decisões adotadas. Os requisitos de negócio estão no arquivo Documento-Requisitos-Moschos-Pecuaria.md, que é a fonte oficial do escopo. Decisões de arquitetura ficam registradas em docs/adr. O modelo relacional está em db/, com a validação em docs/modelo-de-dados.md. O escopo da entrega v1.0 e o cronograma estão em docs/gestao.

## Execução local

Pré-requisitos: Node.js 22+, pnpm (ou `corepack enable`), Python 3.12+ e Docker.

~~~
cp .env.example .env
docker compose up -d db

cd backend
cp .env.example .env
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
alembic upgrade head
uvicorn app.main:app --reload
~~~

As credenciais de desenvolvimento em .env.example (raiz) e backend/.env.example são as mesmas. Se alterar uma, altere a outra.

Em outro terminal:

~~~
cd frontend
cp .env.example .env
pnpm install
pnpm dev
~~~

O front-end abre em http://localhost:5173. A API responde em http://localhost:8000/api/v1/health, a conexão com o banco é verificada em http://localhost:8000/api/v1/health/db e a documentação interativa fica em http://localhost:8000/docs.

## Docker

~~~
cp .env.example .env
docker compose up --build
~~~

O compose inicia PostgreSQL e API, aplicando as migrations na subida da API; durante o desenvolvimento o front-end roda localmente para manter o hot reload. No Linux, se aparecer "permission denied" no socket do Docker, adicione seu usuário ao grupo docker (`sudo usermod -aG docker $USER`) e abra uma nova sessão.

## Verificações

As mesmas verificações rodam no GitHub Actions a cada push em main e develop e em pull requests.

Os testes marcados com `db` usam um PostgreSQL real: o banco `moschos_test` é criado no Postgres do docker compose e recriado pela migration a cada execução (outro endereço pode ser informado em `TEST_DATABASE_URL`). Sem o banco no ar, esses testes são pulados localmente; no CI eles sempre rodam.

~~~
cd backend && ruff check . && ruff format --check . && pytest
cd frontend && pnpm test && pnpm build
~~~

## Fluxo de trabalho

O repositório segue Gitflow: main recebe apenas versões entregues, develop integra o trabalho em andamento e cada funcionalidade nasce em feature/nome-curto a partir de develop. As mensagens de commit seguem Conventional Commits (feat, fix, docs, chore, ci, refactor, test).
