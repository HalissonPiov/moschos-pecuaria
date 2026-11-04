# **Documento de Requisitos**

Sistema para Gerenciamento de Estoque e Finanças de um Agronegócio

Disciplina: CSI606 \- Sistemas WEB I \- SI-06 \| Professor: Fernando Bernardes de Oliveira, Ph.D Integrantes: Hálisson Piovezana (23.2.8068) e Emerson Ataíde (23.2.8123)

1. # **Introdução**

Este documento especifica os requisitos do sistema web de gerenciamento de estoque (lotes e animais de gado) e finanças para uma propriedade rural familiar de pecuária de corte, localizada em Piedade de Ponte Nova (MG), com cerca de 70 hectares e aproximadamente 150 cabeças de gado. O ciclo produtivo completo dura, em média, 3 anos.

Hoje o controle de custos é feito pela memória do produtor, por notas fiscais em papel (entregues no momento da compra, sem XML e sem CNPJ do produtor) e por boletos acompanhados via DDA. Esse modelo é reativo (o custo só é percebido quando o boleto já existe), não permite planejar gastos futuros, não oferece rastreabilidade (o boleto pode não identificar o que foi comprado) e impede o cálculo do custo real de produção de cada lote. A decisão de venda se apoia na observação visual do animal e no acompanhamento informal da cotação do boi gordo em Minas Gerais, sem cruzamento com o custo acumulado.

O sistema proposto substitui esse controle por um registro estruturado de lotes, custos e vendas. O custo é registrado no momento da compra, com a foto da nota fiscal em papel anexada, e o custo acumulado de cada lote é comparado à cotação de mercado para apoiar a decisão de venda.

1. ## **Escopo do MVP**

**Dentro do escopo:**

* Cadastro e acompanhamento do estoque de gado, com registro individual (um animal) ou em lote, à escolha do usuário.

  * Registro de notas fiscais por foto e lançamento de custos vinculados a um lote ou animal, com categorias, recorrência e custos previstos.

    * Cálculo de custo acumulado, custo por arroba, ponto de equilíbrio e margens bruta e líquida, inclusive em vendas parciais.

    * Registro manual do histórico de cotação do boi gordo, comparação com o custo do lote e simulação de cenários de venda.

    * Painel de resumo com estoque, custos, margem e próximos vencimentos.

**Fora do escopo do MVP** (evolução futura, ver Seção 7; o modelo de dados deve permanecer extensível):

* Receitas avulsas, como leite e esterco.

  * Custos gerais da propriedade (diesel, cercas, uso do trator) e seu rateio entre lotes.

    * Integração automática com fontes externas de cotação.

    * Extração automática dos dados da foto da nota fiscal (OCR/IA).

    * Importação de XML de NF-e, consulta à SEFAZ, integração com DDA ou Open Finance.

    * Outras categorias de produto e outros tipos de propriedade.

    * Modo offline com sincronização.

  2. ## **Perfil dos usuários**

Produtor e familiares envolvidos na gestão (4 pessoas), com baixa afinidade com tecnologia e uso provável a partir do celular. Todos têm o mesmo nível de acesso. Os funcionários de apoio operacional não são usuários do sistema no MVP.

2. # **Objetivos do Sistema**

   1. ## **Objetivo geral**

Fornecer ao produtor rural uma ferramenta web simples para registrar e consultar estoque, custos e margens por lote, apoiando de forma objetiva a decisão de quando vender o gado.

2. ## **Objetivos específicos**

| ID | Objetivo |
| :---- | :---- |
| **OE1** | Substituir o controle reativo (memória, notas e boletos) por um registro estruturado, consultável a qualquer momento. |
| **OE2** | Registrar o custo no momento da compra, digitalizando a nota fiscal em papel por foto, e calcular o custo acumulado de cada lote ou animal. |
| **OE3** | Garantir a rastreabilidade dos gastos, categorizando cada custo no lançamento e mantendo a nota anexada. |
| **OE4** | Permitir o planejamento financeiro preventivo, por meio de custos recorrentes e previstos, projeção de saídas e alertas de vencimento. |
| **OE5** | Reduzir o esforço de digitação, com sugestões a partir do histórico do fornecedor e lançamentos recorrentes. |
| **OE6** | Calcular automaticamente margem bruta e líquida, custo por arroba e ponto de equilíbrio, inclusive em vendas parciais. |
| **OE7** | Manter o histórico de cotação do boi gordo e compará-lo com o custo do lote. |
| **OE8** | Simular cenários de venda, reduzindo o risco de vender em momento desfavorável. |
| **OE9** | Oferecer uma interface simples e responsiva, adequada a usuários com baixa afinidade com tecnologia. |

# 

3. # **Requisitos Funcionais**

Prioridade: **Alta** (essencial ao MVP), **Média** (importante) e **Baixa** (desejável). A prioridade indica a importância do requisito; a ordem de construção, que respeita dependências entre funcionalidades, está na Seção 3.7.

1. ## **Acesso**

| ID | Requisito | Prioridade |
| :---- | :---- | :---- |
| **RF01** | O sistema deve permitir o cadastro e o login de usuários com e-mail e senha, vinculando cada usuário a uma propriedade. | Alta |
| **RF02** | O sistema deve permitir encerrar a sessão (logout) e recuperar a senha. | Baixa |

   2. ## **Gestão de estoque (lotes e animais)**

| ID | Requisito | Prioridade |
| :---- | :---- | :---- |
| **RF03** | O sistema deve permitir cadastrar um registro de estoque escolhendo o modo de registro (individual, com um animal, ou em lote, com vários animais) e informando identificação, data de formação, origem (nascimento ou aquisição), quantidade de cabeças, peso médio inicial (opcional) e custo de aquisição (quando houver). | Alta |
| **RF04** | O sistema deve permitir listar, consultar, editar e inativar registros de estoque, exibindo o saldo de cabeças, raças e permitindo filtrar por status e por modo de registro. | Alta |
| **RF05** | O sistema deve permitir ao usuário marcar o registro como "Em produção" ou "Pronto para venda" e deve atribuir automaticamente os status "Parcialmente vendido" e "Vendido" conforme o saldo de cabeças. | Alta |
| **RF06** | O sistema deve permitir cadastrar atributos descritivos livres do registro (nome e valor), como raça, admitindo mais de um valor por atributo. | Média |
| **RF07** | O sistema deve permitir registrar movimentações do registro: entrada de animais (com custo de aquisição, quando houver) e baixa por morte ou descarte, atualizando o saldo de cabeças. | Média |
| **RF08** | O sistema deve permitir registrar pesagens ao longo do tempo. | Baixa |

   3. ## **Notas fiscais e custos**

| ID | Requisito | Prioridade |
| :---- | :---- | :---- |
| **RF09** | O sistema deve permitir registrar uma nota fiscal em papel por foto, tirada na câmera do celular ou escolhida da galeria, informando fornecedor, data da compra e valor total. | Alta |
| **RF10** | O sistema deve permitir lançar um custo informando descrição, valor, data da compra, categoria e fornecedor, vinculado a um registro de estoque (animal ou lote), com ou sem nota associada. Quando houver nota, a foto deve ficar visível durante o preenchimento, e uma mesma nota pode originar vários lançamentos, inclusive em registros diferentes. | Alta |
| **RF11** | O sistema deve permitir cadastrar e configurar categorias de custo livres (por exemplo: alimentação, sanidade, suplementos, locação, manutenção), com algumas categorias sugeridas inicialmente. | Alta |
| **RF12** | O sistema deve sugerir descrição e categoria no lançamento de custo com base em lançamentos anteriores do mesmo fornecedor, permitindo ao usuário aceitar ou alterar a sugestão. | Média |
| **RF13** | O sistema deve permitir marcar um custo como recorrente, informando a periodicidade, e gerar o próximo lançamento previsto para confirmação do usuário. | Média |
| **RF14** | O sistema deve permitir registrar custos previstos (compras ainda não realizadas), manualmente ou por recorrência, e confirmá-los quando a compra ocorrer, informando valor e data efetivos. | Média |
| **RF15** | O sistema deve permitir informar a situação de pagamento de um custo realizado ("A pagar", com data de vencimento, ou "Pago") e exibir alertas de vencimento próximo. | Média |
| **RF16** | O sistema deve permitir listar, editar e excluir (ou estornar) custos, notas fiscais e categorias, respeitando as regras de bloqueio da Seção 5\. | Alta |
| **RF17** | O sistema deve permitir pesquisar e filtrar custos e notas por período, fornecedor, categoria, registro de estoque e situação de pagamento. | Média |
| **RF18** | O sistema deve exibir o custo acumulado de cada registro, detalhado por categoria. | Alta |
| **RF19** | O sistema deve exibir a projeção das saídas financeiras por mês, considerando custos previstos e custos a pagar. | Média |

   4. ## **Vendas e margem**

| ID | Requisito | Prioridade |
| :---- | :---- | :---- |
| **RF20** | O sistema deve permitir registrar a venda total ou parcial de um registro, informando data, quantidade de cabeças, peso total (vivo) ou arrobas de carcaça, preço por arroba, comprador e despesas de venda. | Alta |
| **RF21** | O sistema deve calcular automaticamente a margem bruta e a margem líquida de cada venda e a margem consolidada do registro. | Alta |
| **RF22** | O sistema deve calcular o custo por arroba e o ponto de equilíbrio (preço mínimo da arroba para não ter prejuízo) de cada registro. | Alta |
| **RF23** | O sistema deve permitir listar, editar e estornar vendas, recalculando as margens. | Média |

   5. ## **Referência de mercado e decisão de venda**

| ID | Requisito | Prioridade |
| :---- | :---- | :---- |
| **RF24** | O sistema deve permitir registrar manualmente cotações do boi gordo (data, valor da arroba, praça e fonte). | Alta |
| **RF25** | O sistema deve exibir o histórico de cotações em gráfico, com filtro por período. | Média |
| **RF26** | O sistema deve comparar a cotação mais recente com o custo por arroba e o ponto de equilíbrio de cada registro e indicar a diferença. | Alta |
| **RF27** | O sistema deve permitir simular cenários de venda (variando preço da arroba, peso e data) e exibir a margem estimada, sem alterar os dados reais. | Média |

   6. ## **Painel e relatórios**

| ID | Requisito | Prioridade |
| :---- | :---- | :---- |
| **RF29** | O sistema deve exibir um painel de resumo com total de cabeças em estoque, registros por status, custos do mês, custo acumulado por registro, margem estimada e próximos vencimentos. | Alta |
| **RF30** | O sistema deve gerar relatórios de custos e margens por registro e por período, com exportação em CSV ou PDF. | Baixa |

4. # **Requisitos Não Funcionais**

| ID | Categoria | Requisito |
| :---- | :---- | :---- |
| **RNF01** | Usabilidade | A interface deve ser simples, com poucos passos por tarefa, rótulos claros e linguagem do campo (por exemplo, "arroba" e "lote"), adequada a usuários com baixa afinidade com tecnologia. |
| **RNF02** | Responsividade | O sistema deve funcionar em celulares, tablets e computadores, com layout adaptável e prioridade para o uso em celular (mobile-first). |
| **RNF03** | Acessibilidade | A interface deve usar fontes legíveis, contraste adequado e áreas de toque amplas, considerando o perfil dos usuários. |
| **RNF04** | Segurança | As senhas devem ser armazenadas com hash seguro, o acesso deve exigir autenticação por token e a comunicação deve ocorrer via HTTPS. |
| **RNF05** | Isolamento de dados | Cada usuário só pode acessar os dados da propriedade à qual pertence. |
| **RNF06** | Proteção de imagens (LGPD) | As fotos das notas devem ficar em armazenamento privado, acessíveis apenas ao dono dos dados por meio do back-end autenticado, e o usuário deve ser informado sobre o tratamento dessas imagens. |
| **RNF07** | Captura de foto | O sistema deve permitir fotografar a nota diretamente pelo celular e reduzir o tamanho da imagem antes do envio. |
| **RNF09** | Integridade | O sistema deve validar os dados de entrada (valores positivos, datas válidas, campos obrigatórios) no front-end e no back-end. |
| **RNF10** | Resiliência | A área rural pode ter conexão instável: o sistema deve exibir mensagens claras em caso de falha de rede, não perder dados já preenchidos nos formulários e permitir reenviar uma foto sem refazer o lançamento. |
| **RNF12** | Portabilidade | A aplicação deve ser empacotada com Docker para facilitar a implantação em diferentes ambientes. |
| **RNF13** | Manutenibilidade | O código deve seguir arquitetura em camadas, com a API em FastAPI separada do front-end em React/TypeScript, e as alterações no banco devem ser versionadas com migrations (Alembic). |
| **RNF14** | Extensibilidade | O acesso ao armazenamento de arquivos deve ser isolado em uma camada própria, permitindo trocar de provedor, e a extração automática de dados da foto deve poder ser adicionada como módulo substituível, sem alterar o fluxo de lançamento. |
| **RNF17** | Compatibilidade | O sistema deve funcionar nas versões atuais dos principais navegadores (Chrome, Edge, Firefox e Safari). |

5. # **Regras de Negócio**

   1. ## **Estoque (lotes e animais)**

| ID | Regra |
| :---- | :---- |
| **RN01** | Um registro individual tem sempre quantidade de uma cabeça. Um registro em lote tem a quantidade de cabeças informada no cadastro. |
| **RN02** | O status do registro é "Em produção", "Pronto para venda", "Parcialmente vendido" ou "Vendido". Marcar um registro como "Pronto para venda" é decisão do produtor (critério visual de maturidade e peso): o sistema não altera esse status automaticamente. Os status "Parcialmente vendido" e "Vendido" são atribuídos pelo sistema: o primeiro após uma venda que deixe saldo e o segundo quando o saldo chega a zero. |
| **RN03** | O saldo de cabeças é a quantidade inicial mais as entradas, menos as baixas e as vendas. O saldo nunca pode ser negativo, e uma venda ou baixa não pode superar o saldo existente. |
| **RN04** | Registros com custos, vendas ou movimentações associados não podem ser excluídos, apenas inativados (exclusão lógica). |
| **RN05** | Após a venda total, os custos e os dados de venda do registro ficam bloqueados para edição, salvo correção justificada, que deve ficar registrada. |
| **RN06** | Atributos descritivos (como a raça) não entram nos cálculos. Um lote pode conter mais de uma raça, informadas como valores do mesmo atributo. |

## 

   2. ## **Notas fiscais e custos**

| ID | Regra |
| :---- | :---- |
| **RN07** | Todo custo deve ter categoria, valor maior que zero e data da compra, e estar vinculado a exatamente um registro de estoque. Nesta versão não há custos gerais da propriedade. |
| **RN08** | Uma compra usada em mais de um lote deve ser lançada como um custo por lote, e a mesma nota pode originar vários lançamentos. Quando a soma dos lançamentos de uma nota diferir do valor total informado, o sistema deve exibir um aviso, sem bloquear o registro. |
| **RN09** | A nota fiscal é opcional: o usuário pode lançar um custo sem nota. A foto original da nota deve ser preservada e permanecer consultável a partir do lançamento. |
| **RN10** | Custo realizado é aquele cuja compra já ocorreu (data igual ou anterior à data atual). Ele compõe o custo acumulado do registro a partir da data da compra, esteja pago ou não. |
| **RN11** | Custo previsto é aquele cuja compra ainda não ocorreu (data futura), lançado manualmente ou gerado por recorrência. Ele não compõe o custo acumulado, apenas a projeção de saídas. Ao ser confirmado, passa a custo realizado, com o valor e a data efetivos. |
| **RN12** | A situação de pagamento ("A pagar" ou "Pago") é independente do custo acumulado: ela afeta apenas os alertas de vencimento e a projeção de saídas. |
| **RN13** | O alerta de vencimento é exibido para custos "A pagar" que vencem dentro de um número de dias configurável (padrão: 7 dias). |
| **RN14** | Ao confirmar um custo recorrente, o sistema gera o próximo lançamento previsto conforme a periodicidade. O usuário pode alterar o valor das próximas ocorrências ou encerrar a recorrência. |
| **RN15** | Sugestões de fornecedor, descrição e categoria são apenas sugestões: o sistema nunca grava uma categoria sem a confirmação do usuário. |

   3. ## **Cálculos financeiros**

| ID | Regra |
| :---- | :---- |
| **RN16** | O custo acumulado do registro é a soma do custo de aquisição (da formação e das entradas) com os custos realizados vinculados ao registro até a data de referência. |
| **RN17** | O custo alocado a uma venda é calculado em duas etapas. Primeiro, o custo por cabeça: o custo acumulado até a data da venda, menos o custo já alocado a vendas anteriores, dividido pelo número de cabeças existentes no registro imediatamente antes da venda. Depois, o custo alocado: o custo por cabeça multiplicado pelas cabeças vendidas. O custo dos animais que morrem ou são descartados permanece no registro e é absorvido pelos animais restantes. *Exemplo: lote de 10 cabeças com R\$ 5.000 de custo acumulado. Na venda de 3 cabeças, o custo por cabeça é R\$ 500 e o custo alocado é R\$ 1.500. Se forem lançados mais R\$ 700, o saldo de custo é R\$ 4.200 para 7 cabeças, ou R\$ 600 por cabeça.* |
| **RN18** | Uma arroba equivale a 15 kg de carcaça. O peso em arrobas, quando estimado a partir do peso vivo, é o peso vivo multiplicado pelo rendimento de carcaça e dividido por 15\. O rendimento de carcaça é um parâmetro configurável, com valor padrão a validar com o produtor. Quando a venda é informada em arrobas de carcaça, usa-se o valor informado. |
| **RN19** | A receita da venda é o total de arrobas vendidas multiplicado pelo preço por arroba negociado. |
| **RN20** | A margem bruta da venda é a receita menos o custo alocado à venda (RN17), que já inclui o custo de aquisição e os custos diretos. |
| **RN21** | A margem líquida da venda é a margem bruta menos as despesas de venda (frete, taxas e outras). |
| **RN22** | As margens consideram apenas os custos vinculados ao registro. Como os custos gerais da propriedade estão fora do escopo, a margem tende a ser maior que a margem econômica real, e o sistema deve informar isso na tela de margens. |
| **RN23** | A margem consolidada do registro é a soma das margens de suas vendas. Enquanto houver saldo em estoque, ela é parcial e deve ser identificada como tal. |
| **RN24** | O custo por arroba de uma venda é o custo alocado dividido pelas arrobas vendidas. O do saldo em estoque é o custo ainda não alocado dividido pelas arrobas estimadas do saldo (peso atual informado, convertido conforme a RN18). |
| **RN25** | O ponto de equilíbrio é o menor preço por arroba que cobre o custo: o custo por arroba mais as despesas de venda por arroba. |

   4. ## **Cotação e simulação**

| ID | Regra |
| :---- | :---- |
| **RN26** | Cada cotação é única por data, praça e fonte. Em caso de duplicidade, o sistema deve avisar e pedir confirmação para substituir. |
| **RN27** | A cotação de referência exibida é a mais recente registrada para a praça configurada (padrão: Minas Gerais), com indicação da data, para que o produtor saiba se ela está desatualizada. |
| **RN28** | O sistema deve sinalizar quando a cotação de referência estiver abaixo do ponto de equilíbrio do registro. |
| **RN29** | Simulações de venda são apenas estimativas, não alteram nenhum dado real e devem ser identificadas como tais na tela. |

   5. ## **Acesso aos dados**

| ID | Regra |
| :---- | :---- |
| **RN31** | Cada usuário só visualiza e altera dados da propriedade à qual está vinculado, e todos os usuários da mesma propriedade têm o mesmo nível de acesso. As fotos das notas só podem ser acessadas por meio do sistema autenticado. |

6. # **Implementações Futuras**

| Implementação | Descrição | O que o MVP já prepara |
| :---- | :---- | :---- |
| **Extração automática da foto da nota** | Ler fornecedor, data, itens e valores da foto (OCR ou IA) e pré-preencher o lançamento. O usuário confere, corrige e confirma; nada é gravado sem confirmação. Exige validar a acurácia com notas reais e considerar custo por imagem e LGPD. | Entidade Nota Fiscal com imagem, formulário de conferência, memória de fornecedor e módulo substituível (RNF14) |
| **Custos gerais e rateio** | Lançar custos sem lote (diesel, cercas, sal para todo o rebanho) e distribuí-los entre os lotes, por número de animais ou por animais-dia. A margem se aproxima da margem real da propriedade. | Custo vinculado a registro; fórmula de alocação documentada (RN17) |
| **Inteligência de mercado** | Integração automática com cotação do boi gordo (CEPEA ou provedor de dados), sugestão do melhor momento de venda, alertas de mercado e previsão simples sobre o histórico. Não há API pública gratuita oficial, o que exige coleta programada ou provedor pago. | Cotação manual com histórico (RF25 a RF28) |

| Implementação | Descrição | O que o MVP já prepara |
| :---- | :---- | :---- |
| **Automação do registro de custos** | Detecção automática de recorrência a partir do histórico e registro de boleto por linha digitável, associado à nota, com lembretes de vencimento. | Recorrência marcada pelo usuário (RF13) e situação de pagamento (RF15) |
| **Evoluções de produto** | Refinar o custo em vendas parciais, incluir outros produtos (leite, esterco) e categoria de produto livre, e oferecer modo offline com sincronização para o uso no campo. | Modelo genérico de custos e atributos livres |
| **Outras propriedades** | Importação de XML de NF-e, consulta à SEFAZ (exige certificado digital), DDA e Open Finance via agregadores, e leitura de chave de acesso ou QR code da nota. Não se aplicam ao cliente atual (notas só em papel, sem XML e sem CNPJ). | Nota Fiscal independente da origem do dado |

