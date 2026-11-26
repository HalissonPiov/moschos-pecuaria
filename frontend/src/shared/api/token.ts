/**
 * Token de acesso da sessão (ADR 0001). Fica só em memória: um script injetado na
 * página não o encontra no localStorage, e ao recarregar a página ele é obtido de novo
 * pelo cookie HttpOnly de renovação.
 */
let accessToken: string | null = null
const ouvintes = new Set<() => void>()

export function getAccessToken() {
  return accessToken
}

export function setAccessToken(token: string | null) {
  accessToken = token
}

/** Avisa quem precisa saber que a sessão acabou (a renovação falhou). */
export function onSessaoExpirada(ouvinte: () => void) {
  ouvintes.add(ouvinte)
  return () => {
    ouvintes.delete(ouvinte)
  }
}

export function avisarSessaoExpirada() {
  accessToken = null
  ouvintes.forEach((ouvinte) => ouvinte())
}
