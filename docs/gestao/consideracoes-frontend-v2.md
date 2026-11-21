# Considerações do front-end V2 para o escopo e o cronograma

| Item | Valor |
| --- | --- |
| Data | 21/11/2026 (semana 2, véspera da revisão do M2) |
| Mudança | As telas de `frontend/` foram substituídas pelo protótipo V2, ajustado aos requisitos v2 e ao modelo de dados v2 |
| Branch | `feature/frontend-v2`, a partir da develop |
| Documentos afetados | escopo.md (controle de mudanças, seção 8), cronograma.md (riscos e acompanhamento, seções 7 e 8) e arquitetura.md (já atualizado) |
| Natureza | Registro de considerações. Este documento não altera o escopo nem o cronograma: as linhas sugeridas no fim entram nesses documentos só se aprovadas. |

## 1. O que mudou

- **Telas.** O front-end tinha as telas do protótipo V1, reorganizadas por domínio. Agora tem as do V2, na mesma organização:
  - todas as telas do núcleo;
  - as telas da Ampliação: convite, animais, movimentações, pesagens, pastos, previstos, recorrência, A pagar, projeção, simulação, ofertas, membros e relatórios.
- **Infraestrutura mantida.** Continuam os mesmos:
  - o projeto Vite com as mesmas dependências, sem nenhuma versão nova;
  - o cliente de API, a configuração e o CI.
- **Infraestrutura descartada.** O Next.js e o Payload CMS do Figma Make não entraram (arquitetura.md, "Tratamento do protótipo").
- **Dados de demonstração.** Estão todos em `frontend/src/shared/demo`:
  - os números de referência são os mesmos do protótipo validado (por exemplo, o Lote Safra 24 com 31 de 38 cabeças e R$ 84.251,84);
  - os pontos de troca pela API estão marcados com `TODO(integração)`, 31 marcações em 16 arquivos.
- **Testes.**
  - antes: 9 testes;
  - agora: 213 testes em 18 arquivos, cobrindo as regras de cálculo (RN17, RN18 e a venda de 28/10), todas as rotas e cenários de integração por tela, tirados do checklist de validação do protótipo;
  - os testes encontraram 2 defeitos funcionais pequenos: a data de pagamento futura aceita na compra e o aviso de troca de propriedade perdido. Os dois foram corrigidos em 21/11, junto com dois textos e três ajustes de interface achados na conferência. O registro está em `docs/interface/pendencias-pos-integracao.md`.
- **Critérios do checklist.** Os três parciais (C1.9, C5.10 e C6.2) foram resolvidos em 21/11. O checklist do protótipo fica com 86 de 86 critérios atendidos.

## 2. Impacto no pacote 3 — Acesso e propriedade

A parte de front-end do pacote 3 (2 h na semana 2) deixa de ser "fazer a tela" e passa a ser "ligar a tela pronta à API". O que já existe e o que falta:

| Tela ou função | Já existe no front | Falta para o pacote 3 |
| --- | --- | --- |
| Login e "Criar conta" | Formulários, validações e mensagens; "Sair" volta a /entrar com aviso | Adaptador `features/auth/api` (cadastro, login, refresh e logout, ADR 0001); guardar a sessão; **rotas protegidas**, que o V2 não tem: hoje qualquer rota abre sem login |
| Confirmação de e-mail (M1) | Telas completas ("Confirme seu e-mail", link expirado, "E-mail confirmado") | **Ocultar.** O cadastro deve ir direto para "Minhas propriedades", conforme o controle de mudanças de 19/11. Hoje o fluxo do protótipo passa pela confirmação. |
| Recuperação de senha | Telas completas | Ocultar até o Complemento C4 (RF02) |
| Minhas propriedades | Cartões com papel, titular e titularidade (RN36); inativa esmaecida; estado vazio | Listar pela API; a "última usada" (P6) passa a vir do localStorage, porque hoje está fixa no dado de demonstração |
| Cadastro de propriedade | Município e UF, área opcional, titular, papel declarado, termo com versão e erro sem aceite | Enviar `papel`, `versao_termo` ("1.0") e o aceite, que vira `aceite_declaracao_em`, e o `titular_nome`; **ocultar logo e capa (M2)** |
| Propriedade ativa (ADR 0002) | Rotas `/fazenda/:propriedadeId/...`; seletor no cabeçalho; estado "Propriedade não encontrada" | Trocar `isPropertyId` (lista fixa de slugs) pela consulta à API. O estado "não encontrada" serve para a resposta 403/404 do isolamento (RNF05). |
| Convite e membros (A5) | Telas completas | Fora do pacote 3; ficam com dados de demonstração até o A5 |

**Recomendação.** Criar no início do pacote 3 o arquivo `frontend/src/shared/config/recursos.ts`, com uma chave por função adiada (M1 a M7), como já recomendado nas divergências. Assim, ocultar a confirmação de e-mail e a logo é uma linha, e religar depois também.

**Pendências de interface do pacote 3.**

- O termo como folha inferior no celular (C1.9) já está resolvido. O cadastro chega ao pacote 3 sem pendência de tela.
- Fica aberto um ponto de acessibilidade: o Resumo de uma propriedade sem lotes, logo depois do cadastro, não tem `h1` (T9 em `docs/interface/pendencias-pos-integracao.md`). Cabe no pacote 3, que integra essa tela.

## 3. Impacto nos demais pacotes

- **Pacotes 4, 5, 7, 8 e 9.** As telas do núcleo estão prontas e mais completas que as do V1. O trabalho de front-end continua sendo a integração, mas há mais estados ligados a cada tela (vazio, erro, validação, confirmação). A estimativa de horas continua a mesma; a revisão do M2 dirá se o fator de velocidade muda.
- **Ampliação e Complementos.** A1 a A14 e C1 a C3 já têm tela. A parte de front-end desses itens passa a ser só integração. Isso pode reduzir a estimativa da fila (escopo.md, seção 5.4), mas a redução só deve entrar na fila depois de medida no primeiro item integrado. Não convém descontar de antemão.
- **Pacote 10.1 (dados de demonstração).** O script de seed deve reproduzir os números de `shared/demo` (Fazenda da Baixada, Lote Safra 24, venda de 28/10, cotação de R$ 318,00). Assim, a apresentação mostra o que foi validado no protótipo, e os testes de integração podem passar a usar os mesmos valores vindos da API.
- **Pacote 10.2 (aceitação).** O fluxo completo (C6.2) foi percorrido em 21/11, em 390 px e 1280 px. A tabela de passos em `docs/interface/pendencias-pos-integracao.md` é a primeira passada do roteiro de aceitação e pode ser reaproveitada com dados reais.
- **Complemento C3 (relatórios).** O filtro de período já funciona na prévia (C5.10). Na integração, o período vira parâmetro do endpoint, e os custos passam a ser somados por data de lançamento.

## 4. Impacto nos testes e na Definição de Pronto

- Os testes de integração de hoje afirmam os números de demonstração. Quando uma tela for integrada:
  - o teste dela passa a simular o adaptador da feature, com `vi.mock` de `features/<domínio>/api`, mantendo o `renderRoute` de `src/test/renderRoute.tsx`;
  - os mesmos cenários continuam valendo, com os dados vindos do mock.
- Um interceptador de rede, como o MSW, seria uma dependência nova. Fica a decidir no pacote 3, se o mock por adaptador ficar repetitivo.
- A DoD já pede "a tela consome a API pelo adaptador da feature, sem dados fixos". Na prática, cada pacote apaga a parte de `shared/demo` que deixou de usar. O pacote 10 confere que `shared/demo` saiu do build de produção, ou ficou só no seed.

## 5. Riscos novos

| ID | Risco | P | I | Resposta |
| --- | --- | --- | --- | --- |
| R10 | Pacote JavaScript único de 870 kB (261 kB comprimido): primeira abertura lenta no celular com sinal fraco | M | M | No 10.2, carregar as rotas sob demanda (`lazy` do React Router) e medir de novo. O build já avisa do tamanho. |
| R11 | CSS herdado do Figma com cerca de 11 mil linhas e regras repetidas: ajustes visuais mais lentos e risco de uma regra vencer a outra | M | B | Não reorganizar agora. Ao mexer numa tela, limpar só as regras dela; os estilos por área já estão em `styles/`. |
| R12 | Dado de demonstração aparecer em produção (por exemplo, membros ou cotações fictícias numa tela ainda não integrada) | M | A | Regra da DoD acima; no 10.2, buscar por `shared/demo` e por `TODO(integração)` no build antes da release. |
| R13 | Função adiada (M1 a M7) aparecer ativa na integração | M | M | `shared/config/recursos.ts` com as chaves M1 a M7 desligadas e um teste que confira que as telas ocultas não aparecem. |

## 6. Pendências de documentação

- **Divergências fora do Git.** O escopo (controle de mudanças de 19/11) cita `docs/divergencias-prototipo-modelo.md`, que está no `.gitignore`. Quem clonar o repositório não encontra o arquivo. Há duas saídas:
  - versionar o arquivo, retirando a linha do `.gitignore`;
  - copiar para o escopo a tabela M1 a M7 e P1 a P7.
- **Critérios parciais.** Os três itens (C1.9, C5.10 e C6.2) foram resolvidos em 21/11. O registro de cada correção está em `docs/interface/pendencias-pos-integracao.md`. Esse arquivo fica fora do Git, como o restante de `docs/interface/`.

## 7. Linhas sugeridas para os documentos de gestão

**escopo.md, seção 8 (controle de mudanças):**

| Data | Mudança | Impacto | Decisão | Observação |
| --- | --- | --- | --- | --- |
| 21/11/2026 | Telas do front-end substituídas pelo protótipo V2 (etapas 0 a 6 do prompt de ajustes), mantendo a estrutura Vite, o cliente de API e o CI; testes de integração por tela | Sem horas novas no núcleo; o front-end dos pacotes passa a ser integração de tela pronta | A aprovar | Funções M1 a M7 continuam ocultas na integração; os critérios parciais C1.9, C5.10 e C6.2 já foram resolvidos (checklist com 86 de 86) |

**cronograma.md, seção 7 (riscos):** acrescentar R10 a R13 da seção 5 deste documento.

**cronograma.md, seção 8 (acompanhamento), linha S2:** registrar as horas reais gastas no ajuste do protótipo e na troca do front-end. Elas não estavam planejadas no núcleo. Se foram feitas no feriado de 20/11, entram como "horas além das 12,5 h" (seção 5), e o fator de velocidade do M2 deve ser calculado sem elas, para não distorcer a medição do núcleo.
