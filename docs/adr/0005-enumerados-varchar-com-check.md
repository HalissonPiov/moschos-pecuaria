# 0005. Enumerados como varchar com CHECK e nomes de restrições estáveis

Data: 2026-11-15
Status: aceito

## Contexto

O modelo tem várias colunas com lista fechada de valores, como modo do registro, origem, natureza do custo, situação de pagamento, tipo de movimentação, periodicidade e papel. Algumas listas devem crescer, por exemplo novas periodicidades ou novos papéis.

As alterações no banco são versionadas com Alembic (RNF13). O Alembic não detecta sozinho mudanças em tipos `ENUM` nativos do PostgreSQL nem em CHECKs.

As migrations também precisam gerar sempre os mesmos nomes de restrição, para que uma migration futura consiga removê-las pelo nome.

## Decisão

- Cada enumerado é uma coluna `varchar` com CHECK, declarada no SQLAlchemy como `Enum(..., native_enum=False, create_constraint=True, length=20)`. Os valores ficam em classes `enum.StrEnum` do domínio.
- O `MetaData` da base declarativa usa `naming_convention` para índices (`ix_`), unicidades (`uq_`), chaves estrangeiras (`fk_`) e primárias (`pk_`).
- Os CHECKs recebem o nome exato do `db/modelo-relacional-logico.dbml`, com `conv()`, por exemplo `CheckConstraint("custo_aquisicao >= 0", name=conv("ck_registro_custo_aquisicao"))`. O padrão do modelo é `ck_<tabela>_<regra>`, com a tabela abreviada quando o nome é longo. Uma convenção automática com `%(table_name)s` geraria `ck_registro_estoque_...` e divergiria do modelo.
- O banco é criado e alterado somente por migrations Alembic. O `.dbml` e o `.sql` de `db/` são referência e diagrama.

## Alternativas consideradas

- **`ENUM` nativo do PostgreSQL:** é compacto, mas incluir um valor exige `ALTER TYPE`, que o Alembic não gera, e remover um valor exige recriar o tipo.
- **Tabela de domínio com FK:** é flexível, mas acrescenta tabelas e junções para listas pequenas e estáveis.
- **`varchar` sem CHECK, validado só na aplicação:** um valor inválido vindo de script ou de correção manual entraria no banco sem erro.

## Consequências

- Incluir um valor novo é uma migration escrita à mão: remover o CHECK e recriá-lo com a nova lista. O nome estável torna essa migration simples.
- A migration inicial deve produzir o mesmo esquema de `db/modelo-relacional-logico.sql`: 20 tabelas, 39 chaves estrangeiras e 40 CHECKs. Um teste de integração compara essas contagens com o banco migrado.
- Os nomes de índices sem nome no `.dbml` podem ser diferentes no banco. Isso é aceito, porque o banco real vem da migration.
