import { useParams } from 'react-router'
import { isPropertyId, properties, type PropertyId, type PropertyInfo } from '@/shared/demo/data'

/** Usado quando a rota traz um id de propriedade que não existe. Não tem dados de nenhuma fazenda. */
export const notFoundProperty: PropertyInfo = {
  id: 'nova-propriedade',
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

/** Resolve um id vindo da rota. `found: false` quando o id não existe (sem cair na Baixada). */
export function resolveProperty(rawId: string | undefined) {
  const requestedId = rawId ?? ''
  if (isPropertyId(requestedId)) {
    return {
      id: requestedId,
      property: properties[requestedId],
      base: `/fazenda/${requestedId}`,
      found: true as boolean,
    }
  }
  return {
    // O id da rota é mantido (para links e para nenhum filtro casar com dados de outra fazenda).
    id: requestedId as PropertyId,
    property: { ...notFoundProperty, id: requestedId as PropertyId },
    base: `/fazenda/${requestedId}`,
    found: false as boolean,
  }
}

/**
 * Propriedade ativa pela rota /fazenda/:propriedadeId/...
 * Sem o parâmetro (rotas fora da fazenda) usa a Baixada. Id inválido → `found: false`;
 * a página deve mostrar <PropertyNotFound /> ou StateView com o texto de `propertyNotFoundCopy`.
 */
export function useActiveProperty() {
  const { propriedadeId } = useParams()
  return resolveProperty(propriedadeId ?? 'baixada')
}

/** Textos padrão do estado "Propriedade não encontrada" (para StateView). */
export const propertyNotFoundCopy = {
  title: 'Propriedade não encontrada',
  text: 'O endereço não corresponde a nenhuma propriedade sua. Escolha uma propriedade na lista.',
  actionLabel: 'Ver minhas propriedades',
  to: '/propriedades',
}
