export type RecordStatus =
  | 'Em produção'
  | 'Pronto para venda'
  | 'Parcialmente vendido'
  | 'Vendido'
  | 'Encerrado'

/** Data de "hoje" usada pelo protótipo (dias desde a cotação, vencimentos etc.). */
export const TODAY = '20/11/2026'

export const user = {
  name: 'João Batista',
  email: 'joao@fazendadabaixada.com.br',
}

// ---------------------------------------------------------------------------
// Utilitários numéricos e de data
// ---------------------------------------------------------------------------

/** Arredonda para 2 casas (centavos). Use só no fim das contas. */
export function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function money(value: number) {
  return `R$ ${value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

/** 1234.5 → "1.234,50" (sem "R$"). */
export function decimal(value: number, digits = 2) {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

/** "dd/mm/aaaa" → Date (meio-dia, para não sofrer com fuso). */
export function parseBrDate(value: string) {
  const [day, month, year] = value.split('/').map(Number)
  return new Date(year, month - 1, day, 12)
}

/** Dias inteiros entre duas datas "dd/mm/aaaa" (to − from). */
export function daysBetween(from: string, to: string = TODAY) {
  const ms = parseBrDate(to).getTime() - parseBrDate(from).getTime()
  return Math.round(ms / 86_400_000)
}

// ---------------------------------------------------------------------------
// Regras de cálculo (Etapa 0.1)
// ---------------------------------------------------------------------------

/** Rendimento de carcaça padrão da propriedade (%). */
export const DEFAULT_YIELD = 50

/** Arrobas = peso vivo (kg) × rendimento (%) ÷ 15. Sem arredondar. */
export function arrobasFromLiveWeight(liveWeightKg: number, yieldPercent = DEFAULT_YIELD) {
  return (liveWeightKg * (yieldPercent / 100)) / 15
}

/**
 * Custo alocado a uma venda (RN17, custo médio móvel).
 * alocado = custo ainda não alocado na data × cabeças vendidas ÷ cabeças no saldo antes da venda.
 * A venda que zera o saldo recebe todo o custo restante. O custo por cabeça não é arredondado
 * antes da multiplicação: só o resultado final vai a 2 casas.
 * Ex.: allocateSaleCost(82067.14, 38, 7) = 15117.63
 */
export function allocateSaleCost(
  unallocatedCostAtDate: number,
  headsBeforeSale: number,
  headsSold: number,
) {
  if (headsBeforeSale <= 0 || headsSold <= 0) return 0
  if (headsSold >= headsBeforeSale) return round2(unallocatedCostAtDate)
  return round2((unallocatedCostAtDate * headsSold) / headsBeforeSale)
}

/** Resultado completo de uma venda negociada em arrobas (valores já arredondados). */
export function computeSale({
  unallocatedCostAtDate,
  headsBeforeSale,
  headsSold,
  arrobas,
  pricePerArroba,
  expenses,
}: {
  unallocatedCostAtDate: number
  headsBeforeSale: number
  headsSold: number
  /** Arrobas da venda (registradas com 2 casas, como no romaneio). */
  arrobas: number
  pricePerArroba: number
  expenses: number
}) {
  const saleArrobas = round2(arrobas)
  const allocatedCost = allocateSaleCost(unallocatedCostAtDate, headsBeforeSale, headsSold)
  const revenue = round2(saleArrobas * pricePerArroba)
  const grossMargin = round2(revenue - allocatedCost)
  const netMargin = round2(grossMargin - expenses)
  return {
    arrobas: saleArrobas,
    revenue,
    allocatedCost,
    costPerHead: round2(allocatedCost / headsSold),
    grossMargin,
    netMargin,
    costPerArroba: saleArrobas ? round2(allocatedCost / saleArrobas) : 0,
    breakEven: saleArrobas ? round2((allocatedCost + expenses) / saleArrobas) : 0,
  }
}

// ---------------------------------------------------------------------------
// Propriedades
// ---------------------------------------------------------------------------

export type PropertyId = 'baixada' | 'serra-bonita' | 'cedro-alto' | 'nova-propriedade'

export type PropertyInfo = {
  id: PropertyId
  name: string
  place: string
  area: string
  role: 'Proprietário' | 'Gestor'
  owner: string
  ownership: 'Titularidade confirmada' | 'Titularidade declarada por gestor'
  members: string
  confirmed: boolean
  municipality: string
  uf: string
  logo: string
  cover: string
  lastUsed: boolean
  /** false = não aparece no seletor nem na lista (ex.: propriedade recém-criada no fluxo de cadastro). */
  listable: boolean
}

const listedProperties = {
  baixada: {
    id: 'baixada',
    name: 'Fazenda da Baixada',
    place: 'Piedade de Ponte Nova/MG',
    area: '70 ha',
    role: 'Proprietário',
    owner: 'João Batista e Maria Aparecida Batista',
    ownership: 'Titularidade confirmada',
    members: 'João Batista (proprietário) e Ana Batista (gestora)',
    confirmed: true,
    municipality: 'Piedade de Ponte Nova',
    uf: 'MG',
    logo: '/assets/fazenda-baixada-logo.png',
    cover: '/assets/fazenda-baixada-aerea.jpg',
    lastUsed: true,
    listable: true,
  },
  'serra-bonita': {
    id: 'serra-bonita',
    name: 'Sítio Serra Bonita',
    place: 'Acaiaca/MG',
    area: '42 ha',
    role: 'Gestor',
    owner: 'Geraldo Fonseca',
    ownership: 'Titularidade declarada por gestor',
    members: 'João Batista (gestor)',
    confirmed: false,
    municipality: 'Acaiaca',
    uf: 'MG',
    logo: '',
    cover: '',
    lastUsed: false,
    listable: true,
  },
  'cedro-alto': {
    id: 'cedro-alto',
    name: 'Fazenda Cedro Alto',
    place: 'Ponte Nova/MG',
    area: '58 ha',
    role: 'Gestor',
    owner: 'Lúcia Andrade',
    ownership: 'Titularidade confirmada',
    members: 'Lúcia Andrade (proprietária) e João Batista (gestor)',
    confirmed: true,
    municipality: 'Ponte Nova',
    uf: 'MG',
    logo: '',
    cover: '',
    lastUsed: false,
    listable: true,
  },
} satisfies Record<Exclude<PropertyId, 'nova-propriedade'>, PropertyInfo>

/** Propriedade criada no fluxo "Cadastrar propriedade" (rota /fazenda/nova-propriedade). */
export const newPropertyDraft: PropertyInfo = {
  id: 'nova-propriedade',
  name: 'Nova propriedade',
  place: 'Município não informado',
  area: 'Área não informada',
  role: 'Proprietário',
  owner: 'João Batista',
  ownership: 'Titularidade confirmada',
  members: 'João Batista (proprietário)',
  confirmed: true,
  municipality: 'Município não informado',
  uf: 'MG',
  logo: '',
  cover: '',
  lastUsed: false,
  listable: false,
}

// TODO(integração): substituir os dados fictícios pelas propriedades da API.
/**
 * Todas as propriedades por id. "nova-propriedade" existe para a rota do cadastro funcionar,
 * mas é NÃO enumerável: não aparece em Object.values/Object.keys (seletor e listas).
 */
export const properties = { ...listedProperties } as Record<PropertyId, PropertyInfo>
Object.defineProperty(properties, 'nova-propriedade', {
  value: newPropertyDraft,
  enumerable: false,
})

/** Propriedades que aparecem em listas e no seletor. */
export const listableProperties: PropertyInfo[] = Object.values(listedProperties)

export function isPropertyId(value: string | undefined): value is PropertyId {
  return Boolean(value) && Object.prototype.hasOwnProperty.call(properties, value as string)
}

/** Membros da Fazenda da Baixada. */
export const members = [
  { name: 'João Batista', email: 'joao@fazendadabaixada.com.br', role: 'Proprietário' as const },
  { name: 'Ana Batista', email: 'ana@fazendadabaixada.com.br', role: 'Gestor' as const },
]

export const suppliers = [
  'Agropecuária Ponte Nova',
  'Casa do Criador',
  'Vet Rural',
  'Carlos Andrade (locação)',
]
export const buyers = ['Frigorífico União', 'José Carlos']
export const costCategories = [
  'Ração',
  'Suplemento',
  'Medicamento',
  'Locação de pasto',
  'Mão de obra',
  'Manutenção',
]

// ---------------------------------------------------------------------------
// Cotação de referência (Etapa 0.8)
// ---------------------------------------------------------------------------

export const QUOTE_STALE_DAYS = 7

export const referenceQuote = {
  category: 'Boi gordo',
  market: 'Minas Gerais',
  value: 318,
  date: '06/11/2026',
  /** Dias desde o registro, em relação a TODAY. */
  age: daysBetween('06/11/2026'),
  source: 'Escritório local',
  author: 'João Batista',
}

export function isQuoteStale(age = referenceQuote.age) {
  return age > QUOTE_STALE_DAYS
}

// ---------------------------------------------------------------------------
// Registros (lotes e animais individuais)
// ---------------------------------------------------------------------------

export type CostLine = {
  category: string
  value: number
  /** 'aquisicao' = linha "Aquisição dos animais"; 'custo' = custos confirmados. */
  kind: 'aquisicao' | 'custo'
}

export type SaleRecord = {
  id: string
  recordSlug: string
  lot: string
  date: string
  buyer: string
  heads: number
  headsBefore: number
  liveWeight: number
  yieldRate: number
  arrobas: number
  price: number
  revenue: number
  allocatedCost: number
  costPerHead: number
  grossMargin: number
  expenses: number
  expenseLines: { name: string; value: number }[]
  netMargin: number
  costPerArroba: number
  breakEven: number
  author: string
  reversed: boolean
  /** true quando a venda zerou o saldo. */
  closesRecord: boolean
}

export type LivestockRecord = {
  slug: string
  name: string
  kind: 'Lote' | 'Individual'
  breed: string
  age: string
  pasture: string
  /** Cabeças no saldo hoje. */
  balance: number
  /** Cabeças na formação + entradas. */
  original: number
  status: RecordStatus
  propertyId: PropertyId
  origin: 'Aquisição' | 'Nascimento'
  formationDate: string
  pastureCount: number
  inactive: boolean
  // Números (Etapa 0.1)
  acquisitionCost: number
  /** Aquisição + custos confirmados não estornados. */
  accumulatedCost: number
  /** Custo já alocado às vendas. */
  allocatedCost: number
  /** Custo ainda não alocado (custo do saldo). */
  balanceCost: number
  /** Custo do saldo ÷ cabeças no saldo (0 sem saldo). Para Recria 23 mantém o último valor. */
  costPerHead: number
  /** Peso médio atual (kg) dos animais no saldo; null sem saldo. */
  avgWeightKg: number | null
  /** Arrobas estimadas do saldo (2 casas); 0 sem saldo. */
  balanceArrobas: number
  /** Custo por @ do saldo; null sem saldo. */
  costPerArroba: number | null
  /** Ponto de equilíbrio do saldo em R$/@ (= custo por @ do saldo, sem despesas estimadas); null sem saldo. */
  breakEven: number | null
  /** Cotação de referência − equilíbrio, em R$/@ (negativo = prejuízo); null sem comparativo. */
  quoteDifference: number | null
  hasSale: boolean
  /** Margem líquida consolidada das vendas não estornadas (null sem venda). */
  netMargin: number | null
  /** true quando há venda e ainda há saldo (selo "parcial"). */
  marginPartial: boolean
  /** Status vendido = custos e vendas somente leitura. */
  locked: boolean
  costsByCategory: CostLine[]
  notes: string
  attributes: { name: string; value: string }[]
  documents: { name: string; type: 'pdf' | 'foto' | 'planilha'; size: string }[]
  /** Baixas (morte/descarte). */
  writeOffs: { date: string; type: 'Morte' | 'Descarte'; heads: number }[]
}

function sumCosts(lines: CostLine[]) {
  return round2(lines.reduce((total, line) => total + line.value, 0))
}

function buildRecord(
  base: Omit<
    LivestockRecord,
    | 'accumulatedCost'
    | 'balanceCost'
    | 'costPerHead'
    | 'balanceArrobas'
    | 'costPerArroba'
    | 'breakEven'
    | 'quoteDifference'
    | 'hasSale'
    | 'netMargin'
    | 'marginPartial'
    | 'locked'
  > & { lastCostPerHead?: number; sales: SaleRecord[] },
): LivestockRecord {
  const { lastCostPerHead, sales: recordSales, ...rest } = base
  const accumulatedCost = sumCosts(base.costsByCategory)
  const balanceCost = base.balance > 0 ? round2(accumulatedCost - base.allocatedCost) : 0
  const activeSales = recordSales.filter((sale) => !sale.reversed)
  const hasSale = activeSales.length > 0
  const exactArrobas =
    base.balance > 0 && base.avgWeightKg
      ? arrobasFromLiveWeight(base.balance * base.avgWeightKg)
      : 0
  const costPerArroba = exactArrobas ? round2(balanceCost / exactArrobas) : null
  return {
    ...rest,
    accumulatedCost,
    balanceCost,
    costPerHead: base.balance > 0 ? round2(balanceCost / base.balance) : (lastCostPerHead ?? 0),
    balanceArrobas: round2(exactArrobas),
    costPerArroba,
    breakEven: costPerArroba,
    quoteDifference: costPerArroba === null ? null : round2(referenceQuote.value - costPerArroba),
    hasSale,
    netMargin: hasSale ? round2(activeSales.reduce((t, s) => t + s.netMargin, 0)) : null,
    marginPartial: hasSale && base.balance > 0,
    locked: base.status === 'Vendido',
  }
}

// Vendas ---------------------------------------------------------------------

const safraSaleCalc = computeSale({
  unallocatedCostAtDate: 82067.14,
  headsBeforeSale: 38,
  headsSold: 7,
  arrobas: arrobasFromLiveWeight(3640),
  pricePerArroba: 312,
  expenses: 1236,
})

const recriaSaleCalc = computeSale({
  unallocatedCostAtDate: 57782.42,
  headsBeforeSale: 19,
  headsSold: 19,
  arrobas: arrobasFromLiveWeight(10070),
  pricePerArroba: 298,
  expenses: 2140,
})

// TODO(integração): vendas virão da API (venda + venda_animal + despesa_venda).
export const sales: SaleRecord[] = [
  {
    id: 'venda-safra-24-2026-10-28',
    recordSlug: 'lote-safra-24',
    lot: 'Lote Safra 24',
    date: '28/10/2026',
    buyer: 'Frigorífico União',
    heads: 7,
    headsBefore: 38,
    liveWeight: 3640,
    yieldRate: 50,
    ...safraSaleCalc, // 121,33 @ · 37.854,96 · 15.117,63 · 22.737,33 · 21.501,33 · 124,60 · 134,79
    expenses: 1236,
    expenseLines: [
      { name: 'Frete', value: 850 },
      { name: 'Taxas', value: 386 },
    ],
    price: 312,
    author: 'João Batista',
    reversed: false,
    closesRecord: false,
  },
  {
    id: 'venda-recria-23-2026-06-03',
    recordSlug: 'lote-recria-23',
    lot: 'Lote Recria 23',
    date: '03/06/2026',
    buyer: 'Frigorífico União',
    heads: 19,
    headsBefore: 19,
    liveWeight: 10070,
    yieldRate: 50,
    ...recriaSaleCalc, // 335,67 @ · 100.029,66 · 57.782,42 · 42.247,24 · 40.107,24 · 172,14 · 178,52
    expenses: 2140,
    expenseLines: [
      { name: 'Frete', value: 1520 },
      { name: 'Taxas', value: 620 },
    ],
    price: 298,
    author: 'João Batista',
    reversed: false,
    closesRecord: true,
  },
]

export function salesForRecord(slug: string, includeReversed = false) {
  return sales.filter((sale) => sale.recordSlug === slug && (includeReversed || !sale.reversed))
}

// TODO(integração): calcular saldos, custos móveis e status automáticos a partir da API.
export const herd: LivestockRecord[] = [
  buildRecord({
    slug: 'lote-safra-24',
    name: 'Lote Safra 24',
    kind: 'Lote',
    breed: 'Nelore e cruzados',
    age: '34 meses',
    pasture: 'Piquete da Serra',
    balance: 31,
    original: 38,
    status: 'Parcialmente vendido',
    propertyId: 'baixada',
    origin: 'Aquisição',
    formationDate: '18/01/2024',
    pastureCount: 3,
    inactive: false,
    acquisitionCost: 41800,
    allocatedCost: 15117.63,
    avgWeightKg: 505,
    costsByCategory: [
      { category: 'Aquisição dos animais', value: 41800, kind: 'aquisicao' },
      { category: 'Ração', value: 15741.47, kind: 'custo' },
      { category: 'Suplemento', value: 14226.38, kind: 'custo' },
      { category: 'Locação de pasto', value: 6500, kind: 'custo' },
      { category: 'Medicamento', value: 4335.29, kind: 'custo' },
      { category: 'Mão de obra', value: 1648.7, kind: 'custo' },
    ],
    notes: 'Lote comprado em Ponte Nova. Rodízio entre Piquete da Serra, Pasto do Córrego e Piquete 3.',
    attributes: [
      { name: 'Marca', value: 'FB 24' },
      { name: 'Cor predominante', value: 'Branca' },
    ],
    documents: [
      { name: 'GTA de entrada.pdf', type: 'pdf', size: '412 KB' },
      { name: 'Foto do lote na chegada.jpg', type: 'foto', size: '2,1 MB' },
    ],
    writeOffs: [],
    sales: salesForRecord('lote-safra-24'),
  }),
  buildRecord({
    slug: 'lote-bezerros-sul',
    name: 'Lote Bezerros Sul',
    kind: 'Lote',
    breed: 'Nelore e cruzados',
    age: '11 meses',
    pasture: 'Pasto do Córrego',
    balance: 22,
    original: 22,
    status: 'Em produção',
    propertyId: 'baixada',
    origin: 'Nascimento',
    formationDate: '12/12/2025',
    pastureCount: 1,
    inactive: false,
    acquisitionCost: 0,
    allocatedCost: 0,
    avgWeightKg: 240,
    costsByCategory: [
      { category: 'Ração', value: 12480, kind: 'custo' },
      { category: 'Suplemento', value: 9860.4, kind: 'custo' },
      { category: 'Medicamento', value: 4215.3, kind: 'custo' },
      { category: 'Mão de obra', value: 6152.14, kind: 'custo' },
    ],
    notes: 'Bezerros nascidos na propriedade, desmamados em agosto.',
    attributes: [{ name: 'Marca', value: 'FB 25' }],
    documents: [],
    writeOffs: [],
    sales: salesForRecord('lote-bezerros-sul'),
  }),
  buildRecord({
    slug: 'boi-047',
    name: 'Boi 047',
    kind: 'Individual',
    breed: 'Nelore',
    age: '29 meses',
    pasture: 'Piquete 3',
    balance: 1,
    original: 1,
    status: 'Pronto para venda',
    propertyId: 'baixada',
    origin: 'Aquisição',
    formationDate: '04/05/2025',
    pastureCount: 1,
    inactive: false,
    acquisitionCost: 3900,
    allocatedCost: 0,
    avgWeightKg: 470,
    costsByCategory: [
      { category: 'Aquisição dos animais', value: 3900, kind: 'aquisicao' },
      { category: 'Ração', value: 812.4, kind: 'custo' },
      { category: 'Suplemento', value: 486.1, kind: 'custo' },
      { category: 'Medicamento', value: 214.3, kind: 'custo' },
    ],
    notes: 'Animal acompanhado individualmente. Brinco 0047.',
    attributes: [{ name: 'Brinco', value: '0047' }],
    documents: [],
    writeOffs: [],
    sales: salesForRecord('boi-047'),
  }),
  buildRecord({
    slug: 'lote-recria-23',
    name: 'Lote Recria 23',
    kind: 'Lote',
    breed: 'Angus x Nelore',
    age: '34 meses',
    pasture: 'Pasto Alto',
    balance: 0,
    original: 19,
    status: 'Vendido',
    propertyId: 'baixada',
    origin: 'Aquisição',
    formationDate: '03/02/2023',
    pastureCount: 1,
    inactive: false,
    acquisitionCost: 34200,
    allocatedCost: 57782.42,
    avgWeightKg: null,
    lastCostPerHead: 3041.18,
    costsByCategory: [
      { category: 'Aquisição dos animais', value: 34200, kind: 'aquisicao' },
      { category: 'Ração', value: 11420.18, kind: 'custo' },
      { category: 'Suplemento', value: 7630.9, kind: 'custo' },
      { category: 'Locação de pasto', value: 3000, kind: 'custo' },
      { category: 'Medicamento', value: 1531.34, kind: 'custo' },
    ],
    notes: 'Lote vendido inteiro ao Frigorífico União em 03/06/2026.',
    attributes: [{ name: 'Marca', value: 'FB 23' }],
    documents: [{ name: 'Romaneio Frigorífico União.pdf', type: 'pdf', size: '286 KB' }],
    writeOffs: [],
    sales: salesForRecord('lote-recria-23'),
  }),
  buildRecord({
    slug: 'lote-descarte-22',
    name: 'Lote Descarte 22',
    kind: 'Lote',
    breed: 'Nelore',
    age: '36 meses',
    pasture: 'Pasto Alto',
    balance: 0,
    original: 5,
    status: 'Encerrado',
    propertyId: 'baixada',
    origin: 'Nascimento',
    formationDate: '11/03/2022',
    pastureCount: 1,
    inactive: false,
    acquisitionCost: 0,
    allocatedCost: 0,
    avgWeightKg: null,
    costsByCategory: [
      { category: 'Ração', value: 3420, kind: 'custo' },
      { category: 'Medicamento', value: 1860, kind: 'custo' },
      { category: 'Mão de obra', value: 900, kind: 'custo' },
    ],
    notes: 'Vacas de descarte. Todas baixadas por descarte; nenhuma venda.',
    attributes: [],
    documents: [],
    writeOffs: [{ date: '14/09/2026', type: 'Descarte', heads: 5 }],
    sales: salesForRecord('lote-descarte-22'),
  }),
  buildRecord({
    slug: 'lote-teste-21',
    name: 'Lote Teste 21',
    kind: 'Lote',
    breed: '—',
    age: '—',
    pasture: '—',
    balance: 0,
    original: 0,
    status: 'Encerrado',
    propertyId: 'baixada',
    origin: 'Nascimento',
    formationDate: '02/02/2026',
    pastureCount: 0,
    inactive: true,
    acquisitionCost: 0,
    allocatedCost: 0,
    avgWeightKg: null,
    costsByCategory: [],
    notes: 'Cadastro de teste, sem animais, custos, vendas ou movimentações.',
    attributes: [],
    documents: [],
    writeOffs: [],
    sales: [],
  }),
]

/** Mesmo array que `herd`, com nome mais claro. */
export const records = herd

export function getRecord(slug: string | undefined) {
  return herd.find((record) => record.slug === slug)
}

export function recordsForProperty(propertyId: string, { includeInactive = false } = {}) {
  return herd.filter(
    (record) => record.propertyId === propertyId && (includeInactive || !record.inactive),
  )
}

// Lote Safra 24 (atalho com os números da Etapa 0.11) ------------------------

const safraRecord = getRecord('lote-safra-24')!

export const safra24 = {
  acquisition: 41800,
  confirmedBeforeSale: 40267.14,
  accumulatedAtSale: 82067.14,
  latestPurchase: 2184.7,
  accumulated: safraRecord.accumulatedCost, // 84.251,84
  balanceCost: safraRecord.balanceCost, // 69.134,21
  balance: 31,
  original: 38,
  costPerHead: safraRecord.costPerHead, // 2.230,14
  averageWeight: 505,
  estimatedArrobas: safraRecord.balanceArrobas, // 521,83
  balanceCostPerArroba: safraRecord.costPerArroba as number, // 132,48
  /** Equilíbrio do saldo (= custo por @ do saldo). */
  balanceBreakEven: safraRecord.breakEven as number, // 132,48
  quoteDifference: safraRecord.quoteDifference as number, // +185,52
  sale: {
    date: '28/10/2026',
    buyer: 'Frigorífico União',
    heads: 7,
    liveWeight: 3640,
    yieldRate: 50,
    arrobas: 121.33,
    price: 312,
    revenue: 37854.96,
    allocatedCost: 15117.63,
    costPerHead: 2159.66,
    grossMargin: 22737.33,
    expenses: 1236,
    freight: 850,
    fees: 386,
    netMargin: 21501.33,
    costPerArroba: 124.6,
    /** Equilíbrio DESTA venda (custo/@ + despesas/@). Não é o equilíbrio do saldo. */
    breakEven: 134.79,
  },
  categories: [
    ['Ração', 15741.47],
    ['Suplemento', 14226.38],
    ['Locação de pasto', 6500],
    ['Medicamento', 4335.29],
    ['Mão de obra', 1648.7],
  ] as const,
}

// Totais da propriedade --------------------------------------------------------

export function propertyTotalsFor(propertyId: string) {
  const active = recordsForProperty(propertyId)
  const withBalance = active.filter((record) => record.balance > 0)
  const slugs = new Set(active.map((record) => record.slug))
  const activeSales = sales.filter((sale) => slugs.has(sale.recordSlug) && !sale.reversed)
  const sum = (values: number[]) => round2(values.reduce((t, v) => t + v, 0))
  return {
    /** Cabeças em estoque (registros ativos). */
    stockHeads: withBalance.reduce((t, r) => t + r.balance, 0),
    /** Custo acumulado dos registros com saldo. */
    accumulatedCost: sum(withBalance.map((r) => r.accumulatedCost)),
    /** Custo do saldo (ainda não alocado) dos registros com saldo. */
    balanceCost: sum(withBalance.map((r) => r.balanceCost)),
    salesCount: activeSales.length,
    salesRevenue: sum(activeSales.map((s) => s.revenue)),
    salesGrossMargin: sum(activeSales.map((s) => s.grossMargin)),
    salesNetMargin: sum(activeSales.map((s) => s.netMargin)),
    recordsByStatus: active.reduce(
      (acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }),
      {} as Partial<Record<RecordStatus, number>>,
    ),
  }
}

/**
 * Totais da Fazenda da Baixada: 54 cabeças · R$ 122.372,48 · receita R$ 137.884,62 ·
 * margem bruta R$ 64.984,57 · margem líquida R$ 61.608,57.
 */
export const propertyTotals = propertyTotalsFor('baixada')

// Relatórios por período (Configurações → Relatórios) ---------------------------

export const REPORT_PERIODS = ['Este ano', 'Últimos 12 meses', 'Ano passado', 'Desde o início'] as const
export type ReportPeriod = (typeof REPORT_PERIODS)[number]

/** Intervalo do período, com as duas pontas incluídas; `from` null = sem limite. */
export function reportPeriodRange(period: ReportPeriod, today: string = TODAY) {
  const end = parseBrDate(today)
  const year = end.getFullYear()
  switch (period) {
    case 'Este ano':
      return { from: new Date(year, 0, 1, 0), to: end }
    case 'Últimos 12 meses':
      return { from: new Date(year - 1, end.getMonth(), end.getDate() + 1, 0), to: end }
    case 'Ano passado':
      return { from: new Date(year - 1, 0, 1, 0), to: new Date(year - 1, 11, 31, 23) }
    case 'Desde o início':
      return { from: null, to: end }
  }
}

function inRange(date: string, range: ReturnType<typeof reportPeriodRange>) {
  const value = parseBrDate(date)
  return (!range.from || value >= range.from) && value <= range.to
}

/** Último dia do registro: a venda que zerou o saldo, a última baixa ou hoje. */
export function recordEndDate(record: LivestockRecord) {
  if (record.status === 'Vendido') {
    const closing = salesForRecord(record.slug).find((sale) => sale.closesRecord)
    if (closing) return closing.date
  }
  if (record.status === 'Encerrado' && record.writeOffs.length) {
    return record.writeOffs[record.writeOffs.length - 1].date
  }
  return TODAY
}

export type ReportRow = {
  slug: string
  name: string
  balance: number
  original: number
  accumulatedCost: number
  costPerHead: number
  /** Margem líquida das vendas do período (null sem venda no período). */
  netMargin: number | null
  /** Há saldo depois das vendas do período. */
  marginPartial: boolean
}

/**
 * Linhas da prévia do relatório.
 * - Custos: registros que existiram em algum dia do período. Os custos de demonstração
 *   não têm data por lançamento, então o valor é o acumulado até hoje.
 * - Margens: registros com venda no período; a margem soma só essas vendas.
 * TODO(integração): o mesmo filtro vira parâmetro do endpoint de relatórios (RF31, C3).
 */
export function reportRowsFor(
  propertyId: string,
  { type, period, lot = 'todos' }: { type: 'custos' | 'margens'; period: ReportPeriod; lot?: string },
): ReportRow[] {
  const range = reportPeriodRange(period)
  return recordsForProperty(propertyId)
    .filter((record) => lot === 'todos' || record.slug === lot)
    .flatMap((record) => {
      const periodSales = salesForRecord(record.slug).filter((sale) => inRange(sale.date, range))
      if (type === 'margens' && periodSales.length === 0) return []
      if (type === 'custos') {
        const start = parseBrDate(record.formationDate)
        const end = parseBrDate(recordEndDate(record))
        if (start > range.to || (range.from && end < range.from)) return []
      }
      return [
        {
          slug: record.slug,
          name: record.name,
          balance: record.balance,
          original: record.original,
          accumulatedCost: record.accumulatedCost,
          costPerHead: record.costPerHead,
          netMargin: periodSales.length
            ? round2(periodSales.reduce((total, sale) => total + sale.netMargin, 0))
            : null,
          marginPartial: periodSales.length > 0 && record.balance > 0,
        },
      ]
    })
}
