import type { PropertyId, PropertyInfo } from '@/shared/demo/data'
import { paraPropertyInfo } from '@/features/properties/model'
import {
  propertyNotFoundCopy,
  usePropriedadeAtiva,
} from '@/features/properties/components/PropriedadeAtivaRoute'

export { propertyNotFoundCopy }

/** Usado fora de uma rota de propriedade. Não tem dados de nenhuma fazenda. */
export const notFoundProperty: PropertyInfo = {
  id: '' as PropertyId,
  name: 'Propriedade não encontrada',
  place: '—',
  area: '—',
  role: 'Gestor',
  owner: '—',
  ownership: 'Titularidade declarada por gestor',
  members: '—',
  confirmed: false,
  municipality: '—',
  uf: '—',
  logo: '',
  cover: '',
  lastUsed: false,
  listable: false,
}

/**
 * Propriedade ativa da rota /fazenda/:propriedadeId/... (RF33, ADR 0002), já conferida na
 * API por PropriedadeAtivaRoute. `lista` alimenta o seletor de propriedades.
 */
export function useActiveProperty() {
  const ativa = usePropriedadeAtiva()
  if (!ativa) {
    return {
      id: '' as PropertyId,
      property: notFoundProperty,
      base: '/propriedades',
      found: false as boolean,
      list: [] as PropertyInfo[],
    }
  }
  const property = paraPropertyInfo(ativa.propriedade)
  return {
    id: property.id,
    property,
    base: `/fazenda/${ativa.propriedade.id}`,
    found: true as boolean,
    list: ativa.lista.map((item) => paraPropertyInfo(item)),
  }
}
