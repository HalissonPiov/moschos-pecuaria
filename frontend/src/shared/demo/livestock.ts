import { herd } from '@/shared/demo/data'

export type AnimalSituation = 'Em estoque' | 'Vendido' | 'Baixado (morte)' | 'Baixado (descarte)'

export type LotAnimal = {
  id: number
  order: string
  name: string
  tag: string
  sex: string
  breed: string
  color: string
  birthDate: string
  approximateDate: boolean
  pasture: string
  initialWeight: number | null
  currentWeight: number | null
  note: string
  situation: AnimalSituation
}

const names = [
  'Estrela',
  'Fortuna',
  'Mimoso',
  'Sereno',
  'Firme',
  'Valente',
  'Pintado',
  'Branco',
  'Nobre',
  'Trovão',
  'Canela',
  'Ligeiro',
]
const breeds = ['Nelore', 'Nelore', 'Cruzado', 'Nelore', 'Angus x Nelore']
// Animais do Lote Safra 24 com dados ficam em três pastos; os sem dados ficam no pasto do lote.
const pastureNames = ['Piquete da Serra', 'Pasto do Córrego', 'Piquete 3']
const SAFRA_DEFAULT_PASTURE = 'Piquete da Serra'

export const safraAnimals: LotAnimal[] = Array.from({ length: 38 }, (_, index) => {
  const hasData = index < 12
  return {
    id: index + 1,
    order: `#${String(index + 1).padStart(2, '0')}`,
    name: hasData ? names[index] : '',
    tag: hasData ? String(470 + index) : '',
    sex: hasData ? (index % 3 === 0 ? 'Fêmea' : 'Macho') : '',
    breed: hasData ? breeds[index % breeds.length] : '',
    color: hasData ? 'Branca' : '',
    birthDate: hasData ? `2024-${String((index % 9) + 1).padStart(2, '0')}-15` : '',
    approximateDate: hasData && index % 4 === 0,
    pasture: hasData ? pastureNames[index % pastureNames.length] : SAFRA_DEFAULT_PASTURE,
    initialWeight: hasData ? 315 + index * 3 : null,
    currentWeight: hasData ? 472 + index * 3 : null,
    note: hasData ? 'Animal acompanhado individualmente.' : '',
    situation: index < 31 ? 'Em estoque' : 'Vendido',
  }
})

export const weighings = [
  { date: '15/02/2026', weight: 418, note: 'Pesagem após manejo.' },
  { date: '18/06/2026', weight: 452, note: 'Bom ganho no período.' },
  { date: '05/11/2026', weight: 472, note: 'Última pesagem.' },
]

const pastureAreas: Record<string, string> = {
  'Piquete da Serra': '12 ha',
  'Pasto do Córrego': '18 ha',
  'Piquete 3': '6 ha',
  'Pasto Alto': 'Área não informada',
}

/**
 * Animais em estoque por pasto, derivado dos animais (Safra 24, animal por animal) e dos
 * demais registros ativos com saldo (todos os animais no pasto do registro).
 * Baixada: Piquete da Serra 23 · Pasto do Córrego 26 · Piquete 3 5 · Pasto Alto 0 (soma 54).
 */
export function pastureCounts() {
  const counts: Record<string, number> = Object.fromEntries(
    Object.keys(pastureAreas).map((name) => [name, 0]),
  )
  for (const animal of safraAnimals) {
    if (animal.situation !== 'Em estoque') continue
    const name = animal.pasture || SAFRA_DEFAULT_PASTURE
    counts[name] = (counts[name] ?? 0) + 1
  }
  for (const record of herd) {
    if (record.slug === 'lote-safra-24' || record.inactive || record.balance <= 0) continue
    counts[record.pasture] = (counts[record.pasture] ?? 0) + record.balance
  }
  return counts
}

const counts = pastureCounts()

export const pastures = Object.keys(pastureAreas).map((name) => ({
  name,
  area: pastureAreas[name],
  animals: counts[name] ?? 0,
}))
