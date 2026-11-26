/**
 * Funções das telas que ainda não podem aparecer (docs/gestao/escopo.md, seção 5.5).
 *
 * - M1 a M7: dependem de mudança no modelo de dados (divergências entre protótipo e modelo).
 * - Pacotes da Ampliação e dos Complementos ainda não integrados à API.
 * - Funções do protótipo sem requisito: só entram pelo controle de mudanças do escopo.
 *
 * Para ligar uma função, troque false por true no pacote que a integrar. Uma função
 * desligada nunca pode mostrar dados de demonstração (DoD do escopo).
 */
export const recursos = {
  confirmacaoDeEmail: false, // M1
  logoECapaDaPropriedade: false, // M2
  caracteristicasDoLote: false, // M3
  documentosDoLote: false, // M4
  anotacoesDoLote: false, // M5
  corDaCategoria: false, // M6
  telefoneDoUsuario: false, // M7
  parametrosDaPropriedade: false, // A2
  gestaoDeMembros: false, // A5: membros, convites, inativar propriedade e alterar titular
  relatorios: false, // C3
  recuperacaoDeSenha: false, // C4
  cadastrosDaPropriedade: false, // categorias (5), pastos (A3), fornecedores e compradores
  edicaoDoPerfil: false, // sem requisito
  edicaoDaPropriedade: false, // sem requisito
  trocaDeSenha: false, // sem requisito
}

export type Recurso = keyof typeof recursos

export function recursoLigado(recurso: Recurso): boolean {
  return recursos[recurso]
}
