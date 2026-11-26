# Gerenciamento do Escopo — Mo$chos Pecuária v1.0

| Item | Valor |
| --- | --- |
| Projeto | Mo$chos Pecuária (CSI606 – Sistemas WEB I) |
| Entrega | v1.0.0, apresentada em 07/12/2026 |
| Responsável | Hálisson Piovezana (gestão e desenvolvimento) |
| Base | Documento-Requisitos-Moschos-Pecuaria.md, versão revisada 2 (fonte oficial dos requisitos) |
| Modelo de dados | db/ e a validação em docs/db/modelo-de-dados.md |
| Versão deste documento | 2.3 — 21/11/2026 (a 2.2, de 19/11, registrou as divergências do protótipo; a 2.1, de 15/11, incorporou o modelo de dados v2; a 2.0, de 11/11, seguia os requisitos v2; a 1.0, de 08/11, a versão anterior) |
| Cronograma associado | cronograma.md |

## 1. Objetivo

Este documento define a ordem em que o produto descrito no documento de requisitos é construído até 07/12, quebra o trabalho em pacotes estimados e fixa como o escopo pode mudar.

A meta é implementar todos os requisitos. Para que a apresentação nunca dependa do que ficou por último, eles foram divididos em três camadas:

- **Núcleo:** uma versão válida e completa do fluxo principal. Ele é construído primeiro e protegido por contingência.
- **Ampliação:** o restante dos requisitos de prioridade Média, em ordem fixa. Cada item é puxado assim que o núcleo permitir.
- **Complementos:** os requisitos de prioridade Baixa e a infraestrutura de produção. Entram quando a Ampliação terminar.

Nada fica descartado. Um item que não couber até 07/12 continua no produto e passa para a versão seguinte.

## 2. Declaração do escopo

O **núcleo (v1.0)** permite que o produtor:

1. crie uma conta, cadastre sua propriedade declarando ser proprietário ou gestor, escolha a propriedade ativa e acesse somente os dados dela;
2. cadastre lotes ou animais individuais, com um animal criado por cabeça, e acompanhe o saldo e o status;
3. lance custos por categoria, com ou sem foto da nota em papel, e veja o custo acumulado de cada registro;
4. registre vendas totais ou parciais e veja a margem bruta, a margem líquida, o custo por arroba e o ponto de equilíbrio;
5. registre a cotação do boi gordo e compare com o ponto de equilíbrio de cada registro;
6. veja um painel resumido com estoque, custos do mês, custo acumulado e margem.

O núcleo atende os objetivos OE1, OE2, OE3, OE6, OE7 e OE9. A Ampliação completa o OE4 (planejamento preventivo), o OE5 (sugestões) e o OE8 (simulação).

## 3. Premissas e restrições

| Tipo | Descrição |
| --- | --- |
| Restrição | Prazo fixo: código congelado em 06/12/2026 e apresentação em 07/12/2026. |
| Restrição | Capacidade de 10 a 15 horas por semana, a partir de 11/11. A capacidade planejada é de **43,5 h** até 06/12 (seção 6 do cronograma). |
| Restrição | Stack definida: React/TypeScript/Vite, FastAPI, PostgreSQL, SQLAlchemy/Alembic, Docker, pytest e Vitest (RNF12, RNF13, RNF15). |
| Premissa | As horas planejadas são só as do responsável. O documento de requisitos também lista Emerson Ataíde como integrante. Se ele contribuir, os itens da Ampliação que não dependem uns dos outros podem andar em paralelo (seção 5.3). |
| Premissa | As estimativas consideram desenvolvimento com apoio de assistente de código. A velocidade real é medida no marco M2 (cronograma, seção 7). |
| Premissa | As telas do protótipo V2 já estão em frontend/, inclusive as da Ampliação e dos Complementos. O trabalho no front-end de cada pacote é ligar a tela à API e manter oculto o que pertence a pacotes ainda não integrados (seção 5.5). |
| Premissa | A apresentação roda localmente com docker compose e dados de demonstração. Deploy em nuvem com HTTPS é um Complemento. |
| Premissa | O rendimento de carcaça padrão usa **50%**, o valor do modelo de dados, até ser validado com o produtor (RN18). |
| Premissa | As fotos ficam em armazenamento local privado, servido pela API autenticada, atrás de uma interface de storage (RNF14). |
| Premissa | Se o prazo apertar, o vínculo de familiares é feito por script durante a demonstração, como o próprio documento de requisitos admite (seção 6). |

## 4. Escopo por camada

Legenda: **N** = Núcleo, **A** = Ampliação (com a posição na fila), **C** = Complemento.

### 4.1 Requisitos funcionais

| Requisito | Prioridade (doc.) | Camada | Recorte no núcleo |
| --- | --- | --- | --- |
| RF01 Cadastro e login | Alta | **N** | Com escolha da propriedade ativa quando houver mais de uma |
| RF02 Logout e recuperação de senha | Baixa | **N** (logout) / C4 (recuperação) | A recuperação exige um serviço de e-mail |
| RF32 Cadastro de propriedade com declaração | Alta | **N** | Declaração de papel, aceite do termo e titular (RN35); titularidade exibida (RN36) |
| RF33 Alternar propriedade ativa | Alta | **N** | Seletor no layout |
| RF34 Convite por link | Média | A5 | — |
| RF35 Aceitar convite | Média | A5 | — |
| RF36 Listar e remover membros | Média | A5 | Inclui RN37 e RN38 |
| RF03 Cadastro de registro com animais | Alta | **N** | Criação em massa dos animais, com peso médio inicial opcional |
| RF04 Listar, consultar, editar e inativar | Alta | **N** | Lista de animais do registro e filtros por status e modo |
| RF05 Status manual e automático | Alta | **N** | Status exibido derivado (ajuste A3 do modelo) |
| RF06 Dados individuais e pastos | Média | A3 | Inclui a seleção manual de animais da RN32 |
| RF07 Entradas e baixas | Média | A4 | Inclui o estorno de baixa (RN34) |
| RF08 Pesagens | Baixa | C1 | — |
| RF09 Nota fiscal por foto | Alta | **N** | Câmera ou galeria, com redução no navegador |
| RF10 Lançamento de custo | Alta | **N** | Com ou sem nota, foto visível no formulário e aviso da RN08 |
| RF11 Categorias livres com sugestões | Alta | **N** | Categorias iniciais criadas junto com a propriedade |
| RF12 Sugestão pelo fornecedor | Média | A12 | — |
| RF13 Custos recorrentes | Média | A7 | — |
| RF14 Custos previstos | Média | A6 | — |
| RF15 Situação de pagamento e alertas | Média | A2 | Completa os vencimentos do painel |
| RF16 Editar e estornar custos, notas e categorias | Alta | **N** | Com bloqueio após a venda total; a correção justificada é A13 |
| RF17 Pesquisa e filtros | Média | A9 | — |
| RF18 Custo acumulado por categoria | Alta | **N** | Completo (RN16) |
| RF19 Projeção de saídas | Média | A8 | Depende de A2 e A6 |
| RF20 Venda total ou parcial | Alta | **N** | Seleção automática de animais (RN32) |
| RF21 Conversão para arrobas | Alta | **N** | Peso vivo ou arrobas de carcaça |
| RF22 Margens bruta, líquida e consolidada | Alta | **N** | Completo (RN17 a RN23) |
| RF23 Custo por arroba e ponto de equilíbrio | Alta | **N** | Completo (RN24, RN25) |
| RF24 Editar e estornar vendas | Média | A1 | Recalcula a RN17 do registro |
| RF25 Registro de cotações | Alta | **N** | Com aviso de duplicidade (RN26) |
| RF26 Gráfico de cotações | Média | A11 | — |
| RF27 Comparar cotação e ponto de equilíbrio | Alta | **N** | Com alerta abaixo do equilíbrio (RN28) |
| RF28 Simulação de cenários | Média | A10 | Reaproveita o domínio de vendas |
| RF29 Ofertas de frigoríficos | Baixa | C2 | — |
| RF30 Painel de resumo | Alta | **N** | Vencimentos aparecem quando A2 entrar |
| RF31 Relatórios CSV e PDF | Baixa | C3 | CSV primeiro |

### 4.2 Requisitos não funcionais

| Requisito | Camada | Como é atendido |
| --- | --- | --- |
| RNF01 a RNF03 Usabilidade, responsividade, acessibilidade | **N** | Protótipo mobile-first; cada tela é conferida na largura de celular (DoD) |
| RNF04 Segurança | **N** (hash e token) / C5 (HTTPS) | O HTTPS depende do deploy |
| RNF05 Isolamento | **N** | Dependência de propriedade ativa em todo endpoint, FK composta e teste de acesso negado |
| RNF06 Fotos privadas (LGPD) | **N** | Armazenamento fora da pasta pública, servido só pela API, e aviso de tratamento |
| RNF07 Captura e redução | **N** | Redimensionamento no navegador |
| RNF08 Backup | C5 | Depende da hospedagem |
| RNF09 Validação | **N** | Pydantic, CHECKs no banco e validação nos formulários |
| RNF10 Resiliência | A14 | O cliente HTTP já trata falhas; faltam o rascunho do formulário e o reenvio da foto |
| RNF11 Desempenho | **N** | Volume pequeno; conferido no roteiro de aceitação |
| RNF12 Docker | **N** | Concluído na Fase 0 |
| RNF13 Camadas e migrations | **N** | docs/arquitetura.md |
| RNF14 Storage substituível | **N** | Interface com uma implementação local |
| RNF15 Testes e CI | **N** | pytest já no CI; Vitest e Testing Library entram no pacote 2.3 |
| RNF16 Gitflow | **N** | Em uso |
| RNF17 Navegadores | **N** (Chrome, Firefox) / C (Edge, Safari) | Roteiro de aceitação |

### 4.3 Fora do MVP

Continua fora, conforme a seção 1.1 do documento de requisitos: receitas avulsas, custos gerais e rateio, cotação automática, OCR, integrações fiscais e bancárias, outros produtos e modo offline.

## 5. Estrutura Analítica do Projeto (EAP)

Cada pacote vira uma branch `feature/` e um PR para a develop.

### 5.1 Núcleo

| ID | Pacote de trabalho | Entregável | Requisitos | Estimativa |
| --- | --- | --- | --- | --- |
| **1** | **Gerenciamento** | Revisão semanal (3 × 15 min) e acompanhamento no cronograma | — | **0,75 h** |
| **2** | **Fundação** | | | **6 h** |
| 2.1 | Decisões de arquitetura | ADRs das decisões da seção 9 | RNF13, RNF14 | 1 h |
| 2.2 | Modelo e migration inicial | Ajustes do modelo (docs/db/modelo-de-dados.md), modelos SQLAlchemy, migration aplicada e categorias iniciais | RN07, RN16, RN31 | 4 h |
| 2.3 | Testes de front-end | Vitest e Testing Library configurados, um teste de exemplo e etapa no CI | RNF15 | 1 h |
| **3** | **Acesso e propriedade** | Cadastro, login, logout, cadastro de propriedade com declaração, propriedade ativa, rotas protegidas, chaves de recursos (seção 5.5) e isolamento testado | RF01, RF02 (logout), RF32, RF33, RN31, RN35, RN36, RNF04, RNF05 | **5 h** |
| **4** | **Rebanho** | Registro com criação dos animais, listagem com saldo, detalhe com animais, edição, inativação e status | RF03, RF04, RF05, RN01–RN04, RN06 | **5 h** |
| **5** | **Custos** | Categorias, lançamento, edição, estorno com bloqueio, custo acumulado por categoria e tela integrada | RF10, RF11, RF16, RF18, RN05 (bloqueio), RN07–RN10, RN16 | **4,5 h** |
| **6** | **Nota fiscal com foto** | Interface de storage, upload e download autenticados, compressão no navegador e foto no lançamento | RF09, RN08, RN09, RNF06, RNF07, RNF14 | **3,5 h** |
| **7** | **Vendas e margens** | Domínio com testes (a RN17 é o primeiro), venda com seleção automática de animais e indicadores no lote | RF20–RF23, RN17–RN25, RN32 (automática), RN33 | **6,5 h** |
| **8** | **Mercado** | Cotações, cotação de referência e comparação com o ponto de equilíbrio | RF25, RF27, RN26–RN28 | **2,5 h** |
| **9** | **Painel** | Endpoint de resumo e tela integrada | RF30 | **2,5 h** |
| **10** | **Encerramento** | | | **4 h** |
| 10.1 | Dados de demonstração | Script de seed com propriedade, membros, lotes, custos, vendas e cotações | — | 1 h |
| 10.2 | Aceitação e polimento | Roteiro da seção 6 no celular e no desktop, com correções | RNF01–RNF03, RNF17 | 1,5 h |
| 10.3 | Release e apresentação | release/1.0.0, tag, merge na main, slides e ensaio | — | 1,5 h |
| | **Total do núcleo** | | | **40,25 h** |
| | Contingência | | | 3,25 h |
| | **Capacidade planejada** | | | **43,5 h** |

### 5.2 Ampliação (fila em ordem)

A ordem combina valor para o produtor e dependências. Um item só começa quando o anterior estiver pronto ou bloqueado.

| Fila | Pacote | Requisitos | Estimativa | Por que nesta posição |
| --- | --- | --- | --- | --- |
| A1 | Editar e estornar vendas | RF24, RN34 (venda) | 2 h | Fecha a correção de erros no fluxo principal |
| A2 | Situação de pagamento, alertas e parâmetros | RF15, RN12, RN13, RN18, RN27 | 2,5 h | Completa o painel (vencimentos). Inclui a edição dos parâmetros da propriedade (dias de aviso, rendimento e praça); até lá valem os padrões do banco |
| A3 | Dados individuais, edição em massa, pastos e seleção manual | RF06, RN32 (manual) | 3,5 h | Dá sentido ao animal por cabeça |
| A4 | Entradas e baixas | RF07, RN32, RN34 (baixa) | 2,5 h | Depende de A3 para a seleção de animais |
| A5 | Convites e membros | RF34, RF35, RF36, RN37–RN39 | 5 h | Independente; a demonstração pode usar o script de seed |
| A6 | Custos previstos | RF14, RN11 | 2 h | Base do OE4 |
| A7 | Recorrência | RF13, RN14 | 2,5 h | Depende de A6 |
| A8 | Projeção de saídas | RF19 | 1,5 h | Depende de A2 e A6 |
| A9 | Pesquisa e filtros | RF17 | 1,5 h | — |
| A10 | Simulação de venda | RF28, RN29 | 2 h | Reaproveita o domínio do pacote 7 |
| A11 | Gráfico de cotações | RF26 | 1,5 h | — |
| A12 | Sugestão pelo fornecedor | RF12, RN15 | 1 h | — |
| A13 | Correção justificada | RN05 | 2 h | O bloqueio já existe no núcleo |
| A14 | Resiliência de rede | RNF10 | 1,5 h | — |
| | **Total da Ampliação** | | **31 h** | |

### 5.3 Complementos

| ID | Pacote | Requisitos | Estimativa |
| --- | --- | --- | --- |
| C1 | Pesagens | RF08 | 2 h |
| C2 | Ofertas de frigoríficos | RF29, RN30 | 1,5 h |
| C3 | Relatórios (CSV, depois PDF) | RF31 | 3 h |
| C4 | Recuperação de senha | RF02 | 3 h |
| C5 | Deploy com HTTPS e backup | RNF04, RNF08 | 3 h |
| | **Total** | | **12,5 h** |

### 5.4 Leitura honesta dos números

O produto completo soma cerca de **84 h**: 40,25 h de núcleo, 31 h de Ampliação e 12,5 h de Complementos. A capacidade planejada é de 43,5 h. Para implementar tudo até 07/12, é preciso uma destas três coisas, ou uma combinação delas:

- uma velocidade real perto do dobro da estimada;
- cerca de 20 h por semana em vez de 12,5 h;
- a participação de um segundo desenvolvedor. A5, A9 a A12 e C1 a C3 são independentes entre si e podem ser feitos em paralelo.

O plano não aposta nisso: ele garante o núcleo e puxa a Ampliação conforme a velocidade medida. Na revisão do M2 (22/11) já dá para saber quanto da fila cabe.

### 5.5 Telas do front-end V2 por pacote

Desde 21/11 o front-end tem as telas do protótipo V2 (docs/gestao/consideracoes-frontend-v2.md). Elas já mostram funções da Ampliação e dos Complementos. Integrar uma tela do núcleo não liga essas funções.

A regra de integração é:

- cada parte de tela pertence a um pacote e só aparece quando os dados dela vêm da API;
- até lá, a parte fica oculta por uma chave em `frontend/src/shared/config/recursos.ts`, criado no pacote 3, junto com as chaves M1 a M7 das divergências;
- uma parte oculta nunca mostra dados de demonstração;
- filtros e ordenações feitos no navegador sobre dados já vindos da API podem ficar visíveis.

| Tela | Integrada no núcleo (pacote) | Oculta até |
| --- | --- | --- |
| Entrar e Criar conta | Login, cadastro e "Sair" (3). O cadastro segue direto para "Minhas propriedades". | Confirmação de e-mail: M1. "Esqueci minha senha": C4. |
| Minhas propriedades e cadastro | Lista, cadastro com declaração e termo, e seletor de propriedade ativa (3) | Logo e capa: M2. "Mostrar inativas", alterar titular e inativar: A5. Editar dados: sem requisito. |
| Convite | — | A5 |
| Resumo | Cabeças, lotes por status, custos do mês, custo acumulado, margem, custo por categoria e comparativo com a cotação (9) | Vencimentos e "Marcar como pago": A2. Previstos e "A confirmar": A6. Evolução do custo mensal: sem requisito. |
| Rebanho, novo registro e edição | Lista com saldo e filtros por status e modo; registro com criação dos animais; edição e inativação (4) | Pastos e filtro por pasto: A3. |
| Detalhe do lote | Visão geral e lista de animais (4); Custos (5); Vendas e Painel (7) | Edição dos animais: A3. Movimentações e Histórico: A4. Correção justificada: A13. Características, documentos e anotações: M3 a M5. |
| Custos | Lançamentos e Categorias (5); Notas (6) | A pagar: A2. A confirmar e "Lançar previsto": A6. Recorrência: A7. Projeção: A8. Filtros por período, fornecedor, pagamento e destino: A9. Cor da categoria: M6. |
| Registrar compra | Nota com foto e lançamentos (5 e 6) | Sugestão pelo fornecedor: A12. Rascunho: A14. |
| Vendas | Registrar venda e lista de vendas (7) | Editar e estornar: A1. Simulador: A10. Ofertas: C2. |
| Mercado | Registrar cotação e cotação de referência (8) | Gráfico de cotações: A11. O mapa continua visível, marcado como ilustrativo. |
| Configurações | "Sair" (3); propriedade ativa com titular e termo (3); categorias em Cadastros (5) | Parâmetros: A2. Pastos: A3. Membros, convites, inativar propriedade e alterar titular: A5. Relatórios: C3. Telefone: M7. Editar perfil e editar dados da propriedade: sem requisito. |

**Funções do V2 sem requisito.** São elas:

- troca de senha;
- edição do perfil (nome e e-mail) e dos dados da propriedade;
- cadastros de fornecedores e de compradores, com renomear, inativar e excluir;
- evolução do custo mensal no painel.

O fornecedor e o comprador continuam sendo escolhidos ou criados no próprio lançamento e na venda. Essas funções ficam ocultas na v1.0 e só entram pelo controle de mudanças (seção 8).

## 6. Critério de aceitação do núcleo

A v1.0 está aceita quando este roteiro funciona do início ao fim, no celular e no desktop, a partir de um banco vazio:

1. Criar uma conta e cadastrar a propriedade, declarando ser proprietário e aceitando o termo. A titularidade aparece como "confirmada" e as categorias iniciais são criadas.
2. Cadastrar um lote de 10 cabeças com custo de aquisição. O lote mostra 10 animais e saldo 10.
3. Lançar custos que somem R$ 5.000 de custo acumulado, um deles com foto da nota tirada pelo celular. Ver o custo por categoria.
4. Registrar a cotação da arroba em Minas Gerais.
5. Vender 3 cabeças sem dados individuais. O sistema escolhe 3 animais, o custo alocado é R$ 1.500 (exemplo da RN17) e o lote aparece como "Parcialmente vendido".
6. Lançar mais R$ 700. O custo por cabeça do saldo passa a R$ 600.
7. Ver margem bruta, margem líquida, custo por arroba e ponto de equilíbrio, com o aviso da RN22 e a margem identificada como parcial (RN23).
8. Ver no painel o saldo de 7 cabeças, os custos do mês e a margem.
9. Entrar com um usuário de outra propriedade e confirmar que ele não vê nem acessa os dados do primeiro, inclusive a foto da nota.
10. Entrar com um usuário ligado às duas propriedades e alternar entre elas (RF33).

Cada item da Ampliação que entrar acrescenta o seu passo ao roteiro. Por exemplo, A1 acrescenta: estornar a venda, ver os 3 animais voltarem ao saldo e o status voltar ao anterior.

## 7. Definição de Pronto (DoD)

Um pacote de trabalho só está concluído quando:

- as regras de negócio estão no domínio, com testes unitários, e os cálculos financeiros usam Decimal;
- o endpoint usa a dependência de propriedade ativa e tem teste de acesso negado;
- a migration, quando houver, foi gerada, aplicada e o .dbml foi atualizado junto;
- a tela consome a API pelo adaptador da feature, sem dados fixos, e tem teste de componente quando há lógica de tela (RNF15);
- as partes da tela de pacotes ainda não integrados estão ocultas por `shared/config/recursos.ts`, e o que a tela deixou de usar em `shared/demo` foi apagado (seção 5.5);
- o CI está verde no PR, o PR foi integrado à develop e a lista de commits foi aprovada antes;
- o funcionamento foi conferido na largura de celular.

## 8. Controle de mudanças de escopo

- Toda ideia nova entra no registro abaixo, e não no código.
- Antes de aceitar uma mudança, estime as horas. Ela entra no núcleo só se couber na contingência ou se outro item de tamanho igual sair. Caso contrário, entra na fila da Ampliação.
- A partir do congelamento (03/12), só entram correções de defeitos.
- Toda mudança aceita atualiza este documento, o cronograma e, se mudar uma regra, o documento de requisitos.

| Data | Mudança | Estimativa | Decisão | Impacto |
| --- | --- | --- | --- | --- |
| 11/11/2026 | Documento de requisitos v2: animal por cabeça (RF03, RN01, RN06, RN32–RN34), papéis e convites (RF32–RF36, RN35–RN39), renumeração de RF20 a RF31 e Vitest no RNF15 | Núcleo de 40,25 h; Ampliação de 30,5 h | Aceita | Escopo e cronograma reescritos (versão 2.0). Recuperação de senha, recorrência, previstos e pesagens deixam de ser "Won't" e entram na fila. |
| 15/11/2026 | Modelo de dados versão 2 (docs/db/modelo-de-dados.md): ajustes A1–A6 e B1–B4, 40 CHECKs (acréscimos D1–D7) e status exibido "Encerrado" para registro com saldo zero sem venda (todos os animais baixados), além dos quatro status da RN02 | Absorvida no pacote 2.2 (4 h) | Aceita | Sem mudança de horas. A RN02 ganha um quinto status exibido, apenas derivado; o banco não muda. |
| 19/11/2026 | Protótipo ajustado aos requisitos v2 (etapas 0 a 6 do prompt de ajustes). Funções sem suporte no modelo v2: confirmação de e-mail, logo e capa da propriedade, características livres, documentos e anotações do lote, cor da categoria e telefone do usuário (docs/divergencias-prototipo-modelo.md, M1 a M7) | Sem horas no núcleo | Aceita com adiamento | O modelo v2 não muda até a v1.0. M1 a M7 ficam ocultos na integração e são reavaliados após 07/12; P1 a P7 são integrados com solução provisória, sem mudar o banco. |
| 21/11/2026 | Telas do front-end substituídas pelo protótipo V2 (branch feature/frontend-v2), mantendo o projeto Vite, o cliente de API, a configuração e o CI, com 213 testes de tela (docs/gestao/consideracoes-frontend-v2.md) | Sem horas novas no núcleo; edição dos parâmetros da propriedade (RN13, RN18, RN27), que não tinha pacote, entra em A2 (+0,5 h) | Aceita | O front-end de cada pacote passa a ser integração de tela pronta. As partes de pacotes ainda não integrados e as funções sem requisito ficam ocultas (seção 5.5). Nenhuma redução de estimativa antes de medir o primeiro item integrado. |

## 9. Decisões a registrar em ADR (pacote 2.1)

O modelo de dados e os requisitos v2 já resolveram o vínculo usuário–propriedade (N:N com papel) e o modelo do estoque (registro com um animal por cabeça). As decisões abaixo foram registradas em 15/11/2026 como ADRs 0001 a 0007, na mesma ordem (docs/adr):

| # | Decisão | Recomendação | Bloqueia |
| --- | --- | --- | --- |
| 1 | Autenticação | JWT de acesso curto e refresh token em cookie httpOnly; o Vite faz proxy de /api para a API ficar na mesma origem | Pacote 3 |
| 2 | Propriedade ativa | No caminho da URL (`/properties/{id}/...`), validada por uma dependência que confere o vínculo; o front guarda a última escolhida | Pacotes 3 a 9 |
| 3 | Status do registro | Gravar só a decisão do produtor e derivar "Parcialmente vendido", "Vendido" e "Encerrado" (ajuste A3 do modelo) | Pacotes 4 e 7 |
| 4 | Custo alocado | Valor gravado e recalculado pelo serviço de domínio a cada mudança que o afete; a última venda absorve os centavos | Pacote 7 |
| 5 | Enumerados | `varchar` com CHECK (`native_enum=False`) | Pacote 2.2 |
| 6 | Storage das fotos | Interface com implementação local nesta entrega | Pacote 6 |
| 7 | Rendimento de carcaça padrão | 50%, configurável por propriedade, a validar com o produtor | Só os valores exibidos |
