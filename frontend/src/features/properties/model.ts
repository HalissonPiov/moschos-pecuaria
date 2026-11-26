import type { PropertyId, PropertyInfo } from '@/shared/demo/data'
import type { Propriedade } from '@/features/properties/api'

/** Versão do texto do termo de declaração exibido no cadastro (RN35). */
export const VERSAO_TERMO = '1.0'

/** Por usuário: duas contas no mesmo aparelho não misturam a preferência. */
const chaveUltima = (usuarioId: number) => `moschos:ultima-propriedade:${usuarioId}`

/** Última propriedade aberta neste aparelho (P6): só preferência de tela, nunca autorização. */
export function lerUltimaPropriedade(usuarioId: number): string | null {
  try {
    return localStorage.getItem(chaveUltima(usuarioId))
  } catch {
    return null
  }
}

export function guardarUltimaPropriedade(usuarioId: number, id: string) {
  try {
    localStorage.setItem(chaveUltima(usuarioId), id)
  } catch {
    // Sem localStorage (aba anônima, bloqueio): a lista só não marca a última usada.
  }
}

/** "70.00" → "70 ha"; "42.50" → "42,5 ha". */
export function formatarArea(area: string | null) {
  if (area === null) return 'Área não informada'
  return `${Number(area).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ha`
}

/**
 * Converte a propriedade da API para o formato que as telas do protótipo usam.
 * Logo e capa ficam vazias (divergência M2); membros chegam com o A5.
 */
export function paraPropertyInfo(propriedade: Propriedade, ultimaUsada?: string | null): PropertyInfo {
  const confirmada = propriedade.titularidade === 'confirmada'
  const municipio = propriedade.municipio ?? 'Município não informado'
  const uf = propriedade.uf ?? ''
  return {
    id: propriedade.id as PropertyId,
    name: propriedade.nome,
    place: uf ? `${municipio}/${uf}` : municipio,
    area: formatarArea(propriedade.area_hectares),
    role: propriedade.papel === 'proprietario' ? 'Proprietário' : 'Gestor',
    owner: propriedade.titular_nome,
    ownership: confirmada ? 'Titularidade confirmada' : 'Titularidade declarada por gestor',
    members: '—',
    confirmed: confirmada,
    municipality: municipio,
    uf,
    logo: '',
    cover: '',
    lastUsed: propriedade.id === ultimaUsada,
    listable: true,
  }
}
