# 0004. Custo alocado gravado na venda e recalculado pelo domínio

Data: 2026-11-15
Status: aceito

## Contexto

A RN17 define o custo alocado a uma venda como custo médio móvel por cabeça. É o custo acumulado até a data da venda, menos o que já foi alocado a vendas anteriores, dividido pelas cabeças existentes imediatamente antes da venda, e multiplicado pelas cabeças vendidas. Esse valor alimenta as margens (RN20, RN21).

O valor de uma venda depende de tudo o que veio antes dela: custos com data até a venda, vendas anteriores e baixas. Se um custo antigo for lançado, corrigido ou estornado, ou se uma venda anterior for estornada, as alocações seguintes mudam.

Dinheiro não pode ter erro de arredondamento acumulado: a soma das alocações de um lote vendido por inteiro deve ser igual ao custo total.

## Decisão

- `venda.custo_alocado` é **gravado** (`numeric(12,2)`) e tratado como valor calculado, nunca editado diretamente.
- Um serviço de domínio puro, `alocar_custos(registro)`, recebe a lista de eventos do registro em ordem de data e id (formação, entradas, custos realizados não estornados, vendas e baixas não estornadas). Ele devolve o custo alocado de cada venda, usando `Decimal` e arredondamento comercial (`ROUND_HALF_UP`) em centavos.
- **A venda que zera o saldo recebe todo o custo restante.** Assim os centavos de arredondamento não sobram nem faltam.
- Todo caso de uso que cria, altera ou estorna um custo, uma venda ou uma baixa chama o serviço para o registro, dentro da mesma transação, e grava os valores que mudaram.
- O exemplo numérico da RN17 é o primeiro teste unitário do serviço.

## Alternativas consideradas

- **Calcular na leitura, sem gravar:** o valor nunca desatualiza, mas cada tela de venda, painel ou relatório teria de reprocessar toda a história do lote. Além disso, não haveria um valor fixo para auditar após a venda total (RN05).
- **Gravar uma vez e nunca recalcular:** é simples, mas um custo lançado com atraso ficaria fora de todas as vendas já feitas, e as margens ficariam erradas.
- **Gatilho no banco:** a regra é extensa e dependente da ordem dos eventos. Ela ficaria difícil de testar e espalhada fora do domínio, contrariando docs/arquitetura.md.

## Consequências

- As leituras são simples: a margem é calculada direto a partir da venda.
- Toda operação que afeta o custo de um registro precisa chamar o recálculo. O risco de esquecer é reduzido com um teste de caso de uso para cada uma (lançar, corrigir e estornar custo; registrar e estornar venda; registrar e estornar baixa).
- Recalcular um registro custa uma leitura de seus eventos, o que é pequeno no volume do MVP.
- Depois da venda total, uma correção justificada (RN05) também passa pelo recálculo, e o valor anterior fica em `correcao_justificada.dados_anteriores`.
