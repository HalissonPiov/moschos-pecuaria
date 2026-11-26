# Status atual — Mo$chos Pecuária v1.0

| Item | Valor |
| --- | --- |
| Atualizado em | 24/11/2026 (semana 3, fim do pacote 3) |
| Como usar | Retrato curto do andamento. É atualizado e versionado ao fim de cada pacote e na revisão semanal. Não substitui as fontes abaixo. |
| Fontes da verdade | Requisitos: Documento-Requisitos-Moschos-Pecuaria.md · Escopo e fila: escopo.md · Datas e riscos: cronograma.md · Decisões: docs/adr · Modelo: db/ e docs/db/modelo-de-dados.md · Estrutura: docs/arquitetura.md |

## Pacotes do núcleo (escopo.md, seção 5.1)

| Pacote | Situação | Observação |
| --- | --- | --- |
| 1 Gerenciamento | Concluído até a S2 | A revisão semanal continua a cada domingo |
| 2 Fundação | Concluído | ADRs 0001 a 0007; modelo v2 com migration 0001; Vitest no CI |
| 3 Acesso e propriedade | Concluído | Validado no navegador contra a API real e integrado à develop |
| 4 a 10 | Não iniciados | Próximo: 4 Rebanho |

O que o pacote 3 entrega:

- **Acesso:** cadastro, login, renovação da sessão e logout (ADR 0001).
- **Propriedade:** cadastro com declaração do papel e aceite do termo, que cria as categorias sugeridas (RN35).
- **Propriedade ativa e isolamento:** seletor de propriedade ativa e rotas protegidas. Quem não é membro, ou acessa uma propriedade inexistente ou inativa, recebe 404 (RNF05, ADR 0002).
- **Testes:** 94 no back-end e 254 no front-end.

## Decisões e mudanças de escopo aprovadas

| Data | Decisão | Registro |
| --- | --- | --- |
| 11/11 | Requisitos v2: animal por cabeça, papéis e convites, Vitest | escopo.md, seção 8 |
| 15/11 | Modelo de dados v2 e status "Encerrado" | escopo.md, seção 8; docs/db/modelo-de-dados.md |
| 15/11 | JWT com refresh em cookie, propriedade na rota, status derivado, custo alocado gravado, enumerados com CHECK, fotos privadas, rendimento de 50% | ADRs 0001 a 0007 |
| 19/11 | Funções do protótipo sem suporte no modelo (M1 a M7) adiadas para depois da v1.0; P1 a P7 com solução provisória | escopo.md, seção 8 |
| 21/11 | Telas do protótipo V2 no front-end; cada parte de tela fica oculta até o pacote dela; edição dos parâmetros da propriedade entra no A2 (+0,5 h) | escopo.md, seções 5.5 e 8; cronograma.md 2.1 |

## Fora do escopo da v1.0

- **Fora do MVP:** receitas avulsas, custos gerais com rateio, cotação automática, OCR da nota, integrações fiscais e bancárias, outros produtos e modo offline (escopo.md, seção 4.3).
- **Adiado por mudança de modelo:** confirmação de e-mail, logo e capa da propriedade, características, documentos e anotações do lote, cor da categoria e telefone (M1 a M7).
- **Sem requisito, oculto:** troca de senha, edição do perfil e dos dados da propriedade, cadastros de fornecedores e compradores e evolução do custo mensal (escopo.md, seção 5.5).
- **Ampliação e Complementos:** entram pela fila (escopo.md, seções 5.2 e 5.3) quando houver folga. Nenhum foi iniciado.

## Estado transitório e pendências

- As telas dos pacotes 4 a 9 ainda não foram integradas. Para uma propriedade real, mostram estados vazios, mas alguns dados de demonstração globais ainda aparecem: a cotação de R$ 318,00 e os contadores "A confirmar" e "A pagar". Eles saem nos pacotes 5 e 8.
- O CI no GitHub precisa ser conferido depois do push da develop.
- Limitação aceita (ADR 0001): o logout não invalida um refresh token já copiado, que vale até expirar (7 dias).
