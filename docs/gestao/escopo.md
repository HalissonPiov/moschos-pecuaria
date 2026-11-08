# Gerenciamento do Escopo — Mo$chos Pecuária v1.0

| Item | Valor |
| --- | --- |
| Projeto | Mo$chos Pecuária (CSI606 – Sistemas WEB I) |
| Entrega | v1.0.0, apresentada em 07/12/2026 |
| Responsável | Hálisson Piovezana (gestão e desenvolvimento) |
| Base | Documento-Requisitos-Moschos-Pecuaria.md (fonte oficial dos requisitos) |
| Versão deste documento | 1.0 — 08/11/2026 |
| Cronograma associado | cronograma.md |

## 1. Objetivo

Definir o que a entrega de 07/12 contém e o que fica fora dela, quebrar o trabalho em pacotes estimados e fixar como o escopo pode mudar. O documento de requisitos descreve o produto completo. Este documento descreve a parte dele que cabe no prazo.

## 2. Declaração do escopo da entrega

A v1.0 permite que o produtor:

1. crie uma conta e acesse somente os dados da sua propriedade;
2. cadastre lotes ou animais e acompanhe o saldo de cabeças e o status;
3. lance custos por categoria, com ou sem foto da nota em papel, e veja o custo acumulado de cada registro;
4. registre vendas totais ou parciais e veja a margem bruta, a margem líquida, o custo por arroba e o ponto de equilíbrio;
5. registre a cotação do boi gordo e compare com o ponto de equilíbrio de cada registro;
6. veja um painel resumido com estoque, custos do mês e margem.

Esse conjunto atende os objetivos centrais OE1, OE2, OE3, OE6 e OE7, e o OE9 por meio do protótipo já validado. Os objetivos OE4 (planejamento preventivo), OE5 (sugestões) e OE8 (simulação) ficam parcial ou totalmente para depois (seção 4).

## 3. Premissas e restrições

| Tipo | Descrição |
| --- | --- |
| Restrição | Prazo fixo: código congelado em 06/12/2026 e apresentação em 07/12/2026. |
| Restrição | Um único desenvolvedor, com 10 a 15 horas por semana. A capacidade planejada é de 50 horas, entre 09/11 e 06/12. |
| Restrição | A stack está definida: React/TypeScript/Vite, FastAPI, PostgreSQL, SQLAlchemy/Alembic e Docker (RNF12, RNF13). |
| Premissa | O protótipo navegável já cobre o layout e a usabilidade. O trabalho no front-end é integrar as telas à API, e não redesenhá-las. |
| Premissa | A apresentação roda localmente com docker compose, com dados de demonstração. O deploy em nuvem não é obrigatório. |
| Premissa | O rendimento de carcaça padrão (RN18) usa provisoriamente 52%, o valor do protótipo, até ser validado com o produtor. |
| Premissa | As fotos das notas ficam em um armazenamento local privado, servido pela API autenticada, atrás de uma interface de storage (RNF14). Trocar para o Vercel Blob é uma evolução que não altera os casos de uso. |
| Premissa | A Fase 0 (estrutura, Docker, CI e documentação) está concluída na branch develop. |

## 4. Escopo priorizado (MoSCoW)

Legenda:
- **Must:** sem isso não há entrega.
- **Should:** entra se a contingência permitir.
- **Could:** só se tudo o mais estiver pronto.
- **Won't:** fora desta entrega, mas continua no produto.

### 4.1 Requisitos funcionais

| Requisito | Prioridade (doc.) | Nesta entrega | Recorte |
| --- | --- | --- | --- |
| RF01 Cadastro e login com vínculo à propriedade | Alta | **Must** | Cadastro cria o usuário e a propriedade |
| RF02 Logout e recuperação de senha | Baixa | **Must** (logout) / Won't (recuperação) | A recuperação de senha exige envio de e-mail |
| RF03 Cadastro de registro de estoque | Alta | **Must** | Completo |
| RF04 Listar, consultar, editar e inativar registros | Alta | **Must** | Filtros por status e modo de registro |
| RF05 Status manual e automático | Alta | **Must** | Completo (RN02) |
| RF06 Atributos descritivos (raça) | Média | Could | Inicialmente, raça como texto livre no registro |
| RF07 Entradas e baixas por morte ou descarte | Média | Should | O saldo já é calculado por movimentações, então a tela é o que falta |
| RF08 Pesagens | Baixa | Won't | — |
| RF09 Nota fiscal por foto | Alta | **Must** | Câmera ou galeria, com redução de tamanho no navegador |
| RF10 Lançamento de custo vinculado ao registro | Alta | **Must** | Com ou sem nota, e foto visível no formulário |
| RF11 Categorias de custo livres com sugestões | Alta | **Must** | Categorias iniciais criadas junto com a propriedade |
| RF12 Sugestão a partir do fornecedor | Média | Could | — |
| RF13 Custos recorrentes | Média | Won't | — |
| RF14 Custos previstos | Média | Won't | — |
| RF15 Situação de pagamento e alertas | Média | Should | Campo de situação e lista de vencimentos no painel |
| RF16 Editar e excluir custos, notas e categorias | Alta | **Must** | Inclui o bloqueio após a venda total (RN05), sem fluxo de correção justificada |
| RF17 Pesquisa e filtros de custos | Média | Should | Período, categoria e registro |
| RF18 Custo acumulado por registro e categoria | Alta | **Must** | Completo (RN16) |
| RF19 Projeção mensal de saídas | Média | Won't | Depende de RF13 e RF14 |
| RF20 Venda total ou parcial | Alta | **Must** | Peso vivo ou arrobas de carcaça |
| RF21 Margem bruta, líquida e consolidada | Alta | **Must** | Completo (RN17 a RN23) |
| RF22 Custo por arroba e ponto de equilíbrio | Alta | **Must** | Completo (RN24, RN25) |
| RF23 Editar e estornar vendas | Média | Should | Primeiro o estorno; a edição pode ficar de fora |
| RF24 Registro manual de cotações | Alta | **Must** | Inclui o aviso de duplicidade (RN26) |
| RF25 Gráfico do histórico de cotações | Média | Should | — |
| RF26 Comparar cotação e ponto de equilíbrio | Alta | **Must** | Inclui o alerta abaixo do equilíbrio (RN28) |
| RF27 Simulação de cenários de venda | Média | Should | Reaproveita os cálculos de RF21 e RF22 sem gravar nada |
| RF29 Painel de resumo | Alta | **Must** | Cabeças, registros por status, custos do mês, custo acumulado e margem estimada; vencimentos só se RF15 entrar |
| RF30 Relatórios CSV e PDF | Baixa | Won't | — |

### 4.2 Requisitos não funcionais

| Requisito | Nesta entrega | Como é atendido |
| --- | --- | --- |
| RNF01, RNF02, RNF03 Usabilidade, responsividade e acessibilidade | **Must** | Protótipo mobile-first já validado; conferência em celular antes do congelamento |
| RNF04 Segurança | **Must** (hash e token) / Could (HTTPS) | O HTTPS depende de deploy em nuvem |
| RNF05 Isolamento por propriedade | **Must** | Verificação de vínculo em todo caso de uso, com teste automatizado |
| RNF06 Fotos privadas (LGPD) | **Must** | Armazenamento fora da pasta pública, servido só pela API autenticada, e aviso de tratamento na tela |
| RNF07 Captura e redução da foto | **Must** | Redimensionamento no navegador antes do envio |
| RNF09 Validação em front e back | **Must** | Schemas Pydantic e validação dos formulários |
| RNF10 Resiliência de rede | Should | Mensagens claras já vêm do apiClient; manter o formulário preenchido é Should |
| RNF12 Docker | **Must** | Concluído na Fase 0 |
| RNF13 Camadas e migrations | **Must** | Arquitetura definida em docs/arquitetura.md |
| RNF14 Storage substituível | **Must** | Interface de storage com uma implementação local |
| RNF17 Navegadores | **Must** (Chrome e Firefox) / Could (Safari e Edge) | Teste manual no roteiro de aceitação |

### 4.3 Exclusões explícitas

Além do que o documento de requisitos já põe fora do MVP (receitas avulsas, rateio de custos gerais, OCR, integrações fiscais e bancárias, cotação automática, modo offline), esta entrega exclui: recuperação de senha, recorrência, custos previstos, projeção de saídas, pesagens, relatórios, deploy em produção com domínio próprio e o fluxo de correção justificada após a venda total.

## 5. Estrutura Analítica do Projeto (EAP)

As estimativas já consideram que o protótipo reduz o trabalho de front-end. Cada pacote vira uma branch `feature/` e um PR para a develop.

| ID | Pacote de trabalho | Entregável | Requisitos | Estimativa |
| --- | --- | --- | --- | --- |
| **1** | **Gerenciamento** | | | **1 h** |
| 1.1 | Revisão semanal (4 × 15 min) | Planilha de acompanhamento atualizada (cronograma.md) | — | 1 h |
| **2** | **Fundação de dados** | | | **5 h** |
| 2.1 | Decisões de arquitetura pendentes | ADRs: modelo do registro de estoque, vínculo usuário–propriedade, autenticação, storage | RNF13, RNF14 | 1 h |
| 2.2 | Modelo de dados e migration inicial | Modelos SQLAlchemy a partir do modelo lógico em db/, migration aplicável e categorias iniciais | RN07, RN11, RN16 | 4 h |
| **3** | **Acesso e propriedade** | Cadastro, login, logout, rota protegida e propriedade atual | RF01, RF02 (logout), RNF04, RNF05, RN31 | **5 h** |
| **4** | **Rebanho** | CRUD de registros, saldo por movimentações, status e telas Rebanho e Lote integradas | RF03, RF04, RF05, RN01–RN04 | **6 h** |
| **5** | **Custos** | Categorias, lançamento, edição e exclusão com bloqueio, custo acumulado por categoria e tela Custos integrada | RF10, RF11, RF16, RF18, RN05, RN07, RN09, RN10, RN16 | **5 h** |
| **6** | **Nota fiscal com foto** | Upload e download autenticados, interface de storage, compressão no navegador e foto visível no lançamento | RF09, RNF06, RNF07, RNF14, RN08 | **4 h** |
| **7** | **Vendas e margens** | Cálculos de domínio com testes unitários (exemplo da RN17 como caso de teste), venda parcial ou total e indicadores no lote | RF20, RF21, RF22, RN17–RN25 | **7 h** |
| **8** | **Mercado** | Cadastro de cotação, cotação de referência e comparação com o ponto de equilíbrio | RF24, RF26, RN26–RN28 | **3 h** |
| **9** | **Painel** | Endpoint de resumo e tela Painel integrada | RF29 | **3 h** |
| **10** | **Encerramento** | | | **5 h** |
| 10.1 | Dados de demonstração | Script de seed com propriedade, lotes, custos, vendas e cotações | — | 1 h |
| 10.2 | Aceitação e polimento | Roteiro da seção 6 executado no celular e no desktop; ajustes | RNF01–RNF03, RNF17 | 2 h |
| 10.3 | Release e apresentação | Branch release/1.0.0, tag v1.0.0, merge na main, slides e ensaio | — | 2 h |
| | **Total Must** | | | **44 h** |
| | Contingência (12%) | Absorve atrasos; se sobrar, financia os itens Should | | 6 h |
| | **Capacidade planejada** | | | **50 h** |

Ordem dos itens Should, caso sobre contingência: RF15 → RF27 → RF07 → RF23 → RF17 → RF25 → RNF10.

## 6. Critério de aceitação da entrega

A v1.0 está aceita quando este roteiro funciona do início ao fim, no celular e no desktop, a partir de um banco vazio:

1. Criar uma conta; a propriedade e as categorias iniciais são criadas.
2. Cadastrar um lote de 10 cabeças com custo de aquisição.
3. Lançar custos que somem R$ 5.000 de custo acumulado, um deles com foto da nota tirada pelo celular.
4. Registrar a cotação da arroba em Minas Gerais.
5. Vender 3 cabeças: o custo alocado deve ser R$ 1.500 (exemplo da RN17) e o lote passa a "Parcialmente vendido".
6. Lançar mais R$ 700: o custo por cabeça do saldo deve ser R$ 600.
7. Ver margem bruta, margem líquida, custo por arroba e ponto de equilíbrio do lote, com o aviso de que a margem é sobre custos diretos (RN22).
8. Ver no painel o saldo de 7 cabeças, os custos do mês e a margem.
9. Entrar com um segundo usuário de outra propriedade e confirmar que ele não vê nem acessa os dados do primeiro, inclusive a foto da nota.

## 7. Definição de Pronto (DoD)

Um pacote de trabalho só está concluído quando:

- as regras de negócio estão no domínio, com testes unitários, e os cálculos financeiros usam Decimal;
- o endpoint verifica o vínculo com a propriedade e tem teste de acesso negado;
- a migration foi gerada e aplicada sem erro;
- a tela correspondente consome a API pelo adaptador da feature, sem dados fixos;
- o CI está verde no PR, o PR foi integrado à develop e a lista de commits foi aprovada antes;
- o funcionamento foi conferido na largura de celular.

## 8. Controle de mudanças de escopo

- Toda ideia nova entra no registro abaixo, e não no código.
- Antes de aceitar uma mudança, estime as horas. Ela só entra se cabe na contingência restante ou se sai da entrega um item Must de tamanho igual ou maior.
- A partir de 29/11 (congelamento de funcionalidades), só entram correções de defeitos.
- Toda mudança aceita atualiza este documento, o cronograma e, se mudar uma regra, o documento de requisitos.

| Data | Mudança proposta | Estimativa | Decisão | Impacto |
| --- | --- | --- | --- | --- |
| — | — | — | — | — |

## 9. Decisões pendentes que afetam o escopo

Devem ser tomadas no pacote 2.1, antes de escrever os modelos:

| Decisão | Recomendação | Impacto se adiada |
| --- | --- | --- |
| Vínculo usuário–propriedade | Tabela de vínculo (N:N); na v1.0, o cadastro cria uma única propriedade | Retrabalho no modelo e em todos os endpoints |
| Autenticação | JWT de acesso curto, mais refresh token em cookie httpOnly | Bloqueia o pacote 3 |
| Modelo do registro de estoque | Entidade única com modo individual ou lote; saldo derivado de movimentações | Bloqueia os pacotes 4, 5 e 7 |
| Storage das fotos | Interface com implementação local nesta entrega | Bloqueia o pacote 6 |
| Rendimento de carcaça padrão | 52% provisório, configurável | Afeta só os valores exibidos |
