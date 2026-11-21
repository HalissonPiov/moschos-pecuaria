/*
 * Vendas · Registradas · Simulador · Ofertas (Etapa 4, auditoria da Etapa 6).
 *
 * Parâmetros de URL (tudo abre direto por link):
 * - ?aba=registradas|simulador|ofertas          sub-aba (padrão: registradas)
 * - ?busca=texto · ?periodo=30|180|2026 · ?lote=<slug> · ?comprador=<nome> · ?estornadas=1
 *                                               filtros da lista de vendas registradas
 * - ?venda=<id>                                 detalhe da venda (ex.: venda-safra-24-2026-10-28)
 * - ?acao=registrar[&lote=&preco=&qtd=&peso=&comprador=]
 *                                               abre "Registrar venda" já preenchido
 * - ?acao=editar&venda=<id>                     abre a venda para edição (bloqueada em lote vendido)
 * - ?passo=1|2                                  passo do "Registrar venda"
 * Demonstração de estados (sem botões na interface):
 * - ?estado=loading|error|empty                 carregando, erro e vazio da sub-aba atual
 * - ?envio=erro                                 a primeira tentativa de salvar a venda falha
 */
import { useEffect, useRef, useState, type FormEvent, type ReactNode, type RefObject } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Edit3,
  ExternalLink,
  Info,
  LoaderCircle,
  Minus,
  Plus,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
  Undo2,
  X,
} from 'lucide-react'
import { motion } from 'motion/react'
import AppShell from '@/shared/layout/AppShell'
import { AnimalExitSelector } from '@/features/herd/components/LotMovements'
import { Button, Field, Modal, StateView, Toast } from '@/shared/ui/UI'
import {
  DEFAULT_YIELD,
  TODAY,
  arrobasFromLiveWeight,
  buyers,
  computeSale,
  daysBetween,
  decimal,
  getRecord,
  money,
  recordsForProperty,
  referenceQuote,
  round2,
  safra24,
  sales,
  type LivestockRecord,
  type SaleRecord,
} from '@/shared/demo/data'
import { propertyNotFoundCopy, useActiveProperty } from '@/shared/routing/navigation'
import {
  CalculationHelp,
  MarginLabel,
  ReferenceQuote,
  SoldLockBanner,
} from '@/shared/ui/BusinessRules'

// ---------------------------------------------------------------------------
// Apoio
// ---------------------------------------------------------------------------

type Fee = { name: string; value: number; mode?: 'R$' | '%' }

export function toIso(br: string) {
  const [day, month, year] = br.split('/')
  return `${year}-${month}-${day}`
}
export function toBr(iso: string) {
  const [year, month, day] = iso.split('-')
  return `${day}/${month}/${year}`
}
export const TODAY_ISO = toIso(TODAY)

/**
 * Gastos previstos por registro (não entram no custo até serem confirmados).
 * TODO(integração): virão de custo_previsto na API. Usados pelo Simulador, pelo Painel
 * financeiro e pelo Resumo, para que os três mostrem os mesmos valores.
 */
export const forecastItems = [
  { slug: 'lote-safra-24', date: '2026-12-05', category: 'Ração', value: 3460 },
  { slug: 'lote-safra-24', date: '2026-12-12', category: 'Suplemento', value: 2460 },
  { slug: 'lote-safra-24', date: '2027-01-05', category: 'Ração', value: 3460 },
  { slug: 'lote-safra-24', date: '2027-02-05', category: 'Ração', value: 3460 },
  { slug: 'lote-bezerros-sul', date: '2026-12-15', category: 'Medicamento', value: 412.3 },
  { slug: 'lote-bezerros-sul', date: '2027-01-15', category: 'Ração', value: 1980 },
  { slug: 'boi-047', date: '2026-12-10', category: 'Suplemento', value: 96.5 },
] as const

/** Soma dos previstos de um registro entre amanhã e a data informada (ISO). */
export function forecastUntil(slug: string, isoDate: string) {
  return round2(
    forecastItems
      .filter((item) => item.slug === slug && item.date > TODAY_ISO && item.date <= isoDate)
      .reduce((total, item) => total + item.value, 0),
  )
}

/** Custo ainda não alocado no momento da venda (RN17) — usado ao editar uma venda. */
function unallocatedAtSale(sale: SaleRecord) {
  if (sale.closesRecord) return sale.allocatedCost
  if (sale.recordSlug === 'lote-safra-24') return safra24.accumulatedAtSale
  return round2((sale.allocatedCost * sale.headsBefore) / sale.heads)
}

function sumFees(fees: Fee[], revenue: number) {
  return round2(
    fees.reduce(
      (total, fee) => total + (fee.mode === '%' ? (revenue * fee.value) / 100 : fee.value),
      0,
    ),
  )
}

function signed(value: number) {
  return `${value < 0 ? '− ' : '+ '}${money(Math.abs(value))}`
}

type SalePrefill = {
  slug?: string
  price?: number
  heads?: number
  liveWeight?: number
  buyer?: string
}

type Offer = {
  id: string
  slug: string
  buyer: string
  date: string
  price: number
  heads: number | null
  note: string
}

const initialOffers: Offer[] = [
  {
    id: 'oferta-1',
    slug: 'lote-safra-24',
    buyer: 'Frigorífico União',
    date: '06/11/2026',
    price: 312,
    heads: 7,
    note: 'Retirada na fazenda',
  },
  {
    id: 'oferta-2',
    slug: 'lote-safra-24',
    buyer: 'José Carlos',
    date: '04/11/2026',
    price: 322,
    heads: 10,
    note: 'Pagamento em 7 dias',
  },
]

const periodOptions = [
  ['', 'Todo o período'],
  ['30', 'Últimos 30 dias'],
  ['180', 'Últimos 6 meses'],
  ['2026', 'Ano de 2026'],
] as const

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

export default function SalesPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const tab = params.get('aba') || 'registradas'
  const action = params.get('acao')
  const estado = params.get('estado') as 'loading' | 'error' | 'empty' | null
  const [toast, setToast] = useState<{ message: string; undo?: () => void } | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [offers, setOffers] = useState<Offer[]>(initialOffers)
  const { base, id, found } = useActiveProperty()

  // Venda de lote vendido (travado) não abre para edição: fica no detalhe com "Corrigir com justificativa".
  const editingSale =
    action === 'editar'
      ? sales.find(
          (sale) => sale.id === params.get('venda') && !getRecord(sale.recordSlug)?.locked,
        )
      : undefined
  const registerOpen = action === 'registrar' || Boolean(editingSale)
  const prefill: SalePrefill = {
    slug: params.get('lote') || undefined,
    price: Number(params.get('preco')) || undefined,
    heads: Number(params.get('qtd')) || undefined,
    liveWeight: Number(params.get('peso')) || undefined,
    buyer: params.get('comprador') || undefined,
  }
  // A chave remonta o formulário sempre que o preenchimento vindo da rota muda.
  const registerKey = [action, params.get('venda'), ...Object.values(prefill)].join('|')

  function changeTab(next: string) {
    setParams(next === 'registradas' ? {} : { aba: next })
  }
  function openRegister(data: SalePrefill = {}) {
    const next = new URLSearchParams(params)
    ;['preco', 'qtd', 'peso', 'comprador', 'passo', 'venda'].forEach((key) => next.delete(key))
    next.set('acao', 'registrar')
    if (data.slug) next.set('lote', data.slug)
    if (data.price) next.set('preco', String(data.price))
    if (data.heads) next.set('qtd', String(data.heads))
    if (data.liveWeight) next.set('peso', String(data.liveWeight))
    if (data.buyer) next.set('comprador', data.buyer)
    setParams(next)
  }
  function closeRegister() {
    const next = new URLSearchParams(params)
    ;['acao', 'preco', 'qtd', 'peso', 'comprador', 'passo', 'envio'].forEach((key) =>
      next.delete(key),
    )
    setParams(next, { replace: true })
  }
  function setStep(step: number) {
    const next = new URLSearchParams(params)
    next.set('passo', String(step))
    setParams(next)
  }

  if (!found) {
    return (
      <AppShell>
        <StateView
          type="empty"
          title={propertyNotFoundCopy.title}
          text={propertyNotFoundCopy.text}
          actionLabel={propertyNotFoundCopy.actionLabel}
          onAction={() => navigate(propertyNotFoundCopy.to)}
        />
      </AppShell>
    )
  }

  const retry = () => {
    const next = new URLSearchParams(params)
    next.delete('estado')
    setParams(next)
  }

  return (
    <AppShell>
      <div className="sales-page">
        <header className="section-heading">
          <div>
            <span className="eyebrow">NEGOCIAÇÃO EM ARROBAS</span>
            <h1>Vendas</h1>
            <p>Registre vendas, teste cenários e compare ofertas.</p>
          </div>
          <Button icon={<TrendingUp aria-hidden="true" />} onClick={() => openRegister()}>
            Registrar venda
          </Button>
        </header>
        <nav className="cost-tabs sales-tabs" role="tablist" aria-label="Áreas de vendas">
          {[
            ['registradas', 'Registradas'],
            ['simulador', 'Simulador'],
            ['ofertas', 'Ofertas'],
          ].map(([key, label]) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              className={tab === key ? 'active' : ''}
              onClick={() => changeTab(key)}
            >
              {label}
            </button>
          ))}
        </nav>
        {estado === 'loading' || estado === 'error' ? (
          <StateView
            type={estado}
            title={estado === 'loading' ? 'Buscando as vendas…' : undefined}
            onAction={retry}
          />
        ) : (
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            {tab === 'registradas' && (
              <RegisteredSales
                propertyId={id}
                forceEmpty={estado === 'empty'}
                hideDetail={registerOpen}
                onRegister={() => openRegister()}
                onHelp={() => setHelpOpen(true)}
                onToast={setToast}
              />
            )}
            {tab === 'simulador' && (
              <Simulator
                propertyId={id}
                forceEmpty={estado === 'empty'}
                onRegister={openRegister}
                onHelp={() => setHelpOpen(true)}
              />
            )}
            {tab === 'ofertas' && (
              <Offers
                propertyId={id}
                offers={estado === 'empty' ? [] : offers}
                setOffers={setOffers}
                onRegister={openRegister}
                onToast={(message) => setToast({ message })}
              />
            )}
          </motion.div>
        )}
      </div>
      {registerOpen && (
        <RegisterSale
          key={registerKey}
          propertyId={id}
          base={base}
          prefill={prefill}
          editing={editingSale}
          step={params.get('passo') === '2' ? 2 : 1}
          onStep={setStep}
          failFirstSave={params.get('envio') === 'erro'}
          onClose={closeRegister}
          onSaved={(message) => {
            closeRegister()
            setToast({ message })
          }}
        />
      )}
      <Toast
        message={toast?.message ?? null}
        action={toast?.undo ? { label: 'Desfazer', onClick: toast.undo } : undefined}
        onClose={() => setToast(null)}
      />
      <CalculationHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
    </AppShell>
  )
}

// ---------------------------------------------------------------------------
// Vendas registradas
// ---------------------------------------------------------------------------

function RegisteredSales({
  propertyId,
  forceEmpty,
  hideDetail,
  onRegister,
  onHelp,
  onToast,
}: {
  propertyId: string
  forceEmpty: boolean
  hideDetail: boolean
  onRegister: () => void
  onHelp: () => void
  onToast: (toast: { message: string; undo?: () => void }) => void
}) {
  const [params, setParams] = useSearchParams()
  const [reversedIds, setReversedIds] = useState<string[]>([])
  const [reverseTarget, setReverseTarget] = useState<SaleRecord | null>(null)
  const propertyRecords = recordsForProperty(propertyId, { includeInactive: true })
  const slugs = new Set(propertyRecords.map((record) => record.slug))
  const propertySales = forceEmpty ? [] : sales.filter((sale) => slugs.has(sale.recordSlug))
  const isReversed = (sale: SaleRecord) => sale.reversed || reversedIds.includes(sale.id)

  const query = params.get('busca') || ''
  const period = params.get('periodo') || ''
  const lotFilter = params.get('lote') || ''
  const buyerFilter = params.get('comprador') || ''
  const showReversed = params.get('estornadas') === '1'
  const hasFilters = Boolean(query || period || lotFilter || buyerFilter)

  function update(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next)
  }
  function clearFilters() {
    const next = new URLSearchParams(params)
    ;['busca', 'periodo', 'lote', 'comprador'].forEach((key) => next.delete(key))
    setParams(next)
  }

  const filtered = propertySales.filter((sale) => {
    if (isReversed(sale) && !showReversed) return false
    if (lotFilter && sale.recordSlug !== lotFilter) return false
    if (buyerFilter && sale.buyer !== buyerFilter) return false
    if (period === '2026' && !sale.date.endsWith('/2026')) return false
    if ((period === '30' || period === '180') && daysBetween(sale.date) > Number(period))
      return false
    return `${sale.lot} ${sale.buyer}`.toLowerCase().includes(query.toLowerCase())
  })
  const active = filtered.filter((sale) => !isReversed(sale))
  const totals = {
    revenue: round2(active.reduce((t, s) => t + s.revenue, 0)),
    net: round2(active.reduce((t, s) => t + s.netMargin, 0)),
    heads: active.reduce((t, s) => t + s.heads, 0),
  }
  const lotsWithBalance = Array.from(new Set(active.map((sale) => sale.recordSlug)))
    .map((slug) => getRecord(slug))
    .filter((record): record is LivestockRecord => Boolean(record && record.balance > 0))
  const saleLots = Array.from(new Set(propertySales.map((sale) => sale.recordSlug)))
    .map((slug) => getRecord(slug))
    .filter((record): record is LivestockRecord => Boolean(record))

  const detail = hideDetail
    ? undefined
    : propertySales.find((sale) => sale.id === params.get('venda'))
  const detailRecord = detail ? getRecord(detail.recordSlug) : undefined

  function openDetail(sale: SaleRecord) {
    update('venda', sale.id)
  }
  function closeDetail() {
    update('venda', '')
  }
  function editSale(sale: SaleRecord) {
    const next = new URLSearchParams(params)
    next.set('acao', 'editar')
    next.set('venda', sale.id)
    setParams(next)
  }
  function confirmReverse(sale: SaleRecord) {
    setReverseTarget(null)
    setReversedIds((ids) => [...ids, sale.id])
    onToast({
      message: `Venda estornada. Os ${sale.heads} animais voltaram ao saldo do ${sale.lot}.`,
      undo: () => setReversedIds((ids) => ids.filter((id) => id !== sale.id)),
    })
  }

  if (!propertySales.length) {
    return (
      <>
        <ReferenceQuote />
        <StateView
          type="empty"
          title="Nenhuma venda registrada"
          text="Quando você vender animais, cada venda aparece aqui com arrobas, preço por @ e margem."
          actionLabel="Registrar venda"
          onAction={onRegister}
        />
      </>
    )
  }

  return (
    <>
      <ReferenceQuote />
      <section className="sales-summary" aria-label="Totais das vendas no filtro">
        <div>
          <span>Receita calculada</span>
          <strong>{money(totals.revenue)}</strong>
          <small>
            {active.length === 1 ? '1 venda ativa' : `${active.length} vendas ativas`} no filtro
          </small>
        </div>
        <div>
          <span>Margem líquida</span>
          <strong>{signed(totals.net)}</strong>
          <AggregateMarginNote records={lotsWithBalance} onHelp={onHelp} />
        </div>
        <div>
          <span>Cabeças vendidas</span>
          <strong>{totals.heads}</strong>
          <small>Somente vendas não estornadas</small>
        </div>
      </section>
      <section className="sales-toolbar" aria-label="Filtros das vendas">
        <label className="search-box">
          <span className="sr-only">Buscar venda</span>
          <Search aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => update('busca', e.target.value)}
            placeholder="Buscar lote ou comprador"
          />
        </label>
        <FilterSelect
          label="Período"
          value={period}
          onChange={(value) => update('periodo', value)}
          options={periodOptions.map(([value, text]) => [value, text])}
        />
        <FilterSelect
          label="Lote"
          value={lotFilter}
          onChange={(value) => update('lote', value)}
          options={[['', 'Todos os lotes'], ...saleLots.map((r) => [r.slug, r.name])]}
        />
        <FilterSelect
          label="Comprador"
          value={buyerFilter}
          onChange={(value) => update('comprador', value)}
          options={[['', 'Todos os compradores'], ...buyers.map((b) => [b, b])]}
        />
        <label className="inactive-filter">
          <input
            type="checkbox"
            checked={showReversed}
            onChange={(e) => update('estornadas', e.target.checked ? '1' : '')}
          />{' '}
          Mostrar estornadas
        </label>
        {hasFilters && (
          <button type="button" className="text-link" onClick={clearFilters}>
            Limpar filtros
          </button>
        )}
      </section>
      {filtered.length ? (
        <div className="sales-list sales-list--detailed">
          <div className="sales-list-head">
            <span>Data / lote</span>
            <span>Cabeças</span>
            <span>Arrobas</span>
            <span>Preço / @</span>
            <span>Receita</span>
            <span>Comprador</span>
            <span>Margem líquida · sobre custos diretos</span>
            <span>Autor</span>
          </div>
          {filtered.map((sale) => (
            <button
              key={sale.id}
              className={`sale-list-row ${isReversed(sale) ? 'is-reversed' : ''}`}
              onClick={() => openDetail(sale)}
            >
              <p>
                <strong>{sale.lot}</strong>
                <small>
                  {sale.date}
                  {isReversed(sale) && (
                    <span className="sale-reversed-tag">
                      <Undo2 aria-hidden="true" /> Estornada
                    </span>
                  )}
                </small>
              </p>
              <b>{sale.heads}</b>
              <b>{decimal(sale.arrobas)} @</b>
              <b>{money(sale.price)} / @</b>
              <b>{money(sale.revenue)}</b>
              <span>{sale.buyer}</span>
              <b className={sale.netMargin < 0 ? 'negative' : 'positive'}>
                {signed(sale.netMargin)}
              </b>
              <span>{sale.author}</span>
              <ChevronRight aria-hidden="true" />
            </button>
          ))}
        </div>
      ) : (
        <div className="no-results">
          <TrendingUp aria-hidden="true" />
          <h2>Nenhuma venda encontrada</h2>
          <p>Nenhuma venda combina com estes filtros.</p>
          <Button variant="secondary" onClick={clearFilters}>
            Limpar filtros
          </Button>
        </div>
      )}
      <Modal
        open={Boolean(detail)}
        onClose={closeDetail}
        title={detail ? `Venda de ${detail.date}` : 'Detalhe da venda'}
      >
        {detail && detailRecord && (
          <div className="sale-detail">
            <div className="detail-sale-heading">
              <span>
                <small>
                  {detail.lot.toUpperCase()} · {detail.buyer}
                </small>
                <strong>
                  {detail.heads} animais · {decimal(detail.arrobas)} @
                </strong>
              </span>
              {isReversed(detail) && (
                <span className="sale-reversed-tag">
                  <Undo2 aria-hidden="true" /> Estornada
                </span>
              )}
            </div>
            <SaleNumbers sale={detail} />
            <section className="sold-animals">
              <h3>Animais vendidos</h3>
              <p>
                {Array.from({ length: detail.heads }, (_, index) => {
                  const order = detail.headsBefore - detail.heads + index + 1
                  return `#${String(order).padStart(2, '0')}`
                }).join(', ')}
              </p>
            </section>
            <p className="authorship">
              Registrada por {detail.author} em {detail.date}.
            </p>
            {detailRecord.locked ? (
              <SoldLockBanner
                item="Lote"
                recordSlug={detailRecord.slug}
                target={`Venda de ${detail.date}`}
                before={`${detail.heads} animais · ${decimal(detail.arrobas)} @ · ${money(detail.price)} / @`}
              />
            ) : isReversed(detail) ? (
              <p className="modal-copy">
                Esta venda foi estornada: os animais voltaram ao saldo e as margens foram
                recalculadas.
              </p>
            ) : (
              <div className="modal__actions">
                <Button
                  variant="ghost"
                  icon={<Undo2 aria-hidden="true" />}
                  onClick={() => setReverseTarget(detail)}
                >
                  Estornar
                </Button>
                <Button icon={<Edit3 aria-hidden="true" />} onClick={() => editSale(detail)}>
                  Editar
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
      <Modal
        open={Boolean(reverseTarget)}
        onClose={() => setReverseTarget(null)}
        title="Estornar venda?"
      >
        {reverseTarget && (
          <>
            <p className="modal-copy">
              Os {reverseTarget.heads} animais voltam ao saldo do {reverseTarget.lot}, o status
              volta a ser o anterior e as margens são recalculadas. A venda continua visível com o
              selo “Estornada”.
            </p>
            <div className="modal__actions">
              <Button variant="ghost" onClick={() => setReverseTarget(null)}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={() => confirmReverse(reverseTarget)}>
                Estornar venda
              </Button>
            </div>
          </>
        )}
      </Modal>
    </>
  )
}

/** Rótulo da margem somada de várias vendas: "sobre custos diretos" e "parcial" se algum lote tem saldo. */
export function AggregateMarginNote({
  records,
  onHelp,
}: {
  records: Pick<LivestockRecord, 'name' | 'balance'>[]
  onHelp: () => void
}) {
  return (
    <span className="margin-label aggregate-margin">
      sobre custos diretos
      {records.length ? <b>parcial</b> : null}
      <button type="button" className="icon-button" onClick={onHelp} aria-label="Abrir Como calculamos">
        <Info aria-hidden="true" />
      </button>
      {records.length ? (
        <small>
          {records.map((record) => `${record.name} ainda tem ${record.balance}`).join(' · ')}{' '}
          {records.length === 1 && records[0].balance === 1 ? 'animal' : 'animais'}. A margem
          final depende das próximas vendas.
        </small>
      ) : null}
    </span>
  )
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: (readonly [string, string] | string[])[]
  onChange: (value: string) => void
}) {
  const current = options.find(([key]) => key === value)
  return (
    <label className={`filter-chip ${value ? 'active' : ''}`}>
      <span>
        {label}
        {value && current ? `: ${current[1]}` : ''}
      </span>
      <ChevronDown aria-hidden="true" />
      <select aria-label={`Filtrar por ${label.toLowerCase()}`} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([key, text]) => (
          <option key={key} value={key}>
            {text}
          </option>
        ))}
      </select>
    </label>
  )
}

function SaleNumbers({ sale }: { sale: SaleRecord }) {
  const rows: [string, ReactNode][] = [
    ['Arrobas', `${decimal(sale.arrobas)} @`],
    ['Preço por @', `${money(sale.price)} / @`],
    ['Receita', money(sale.revenue)],
    ['Custo alocado', `${money(sale.allocatedCost)} (${money(sale.costPerHead)} por cabeça)`],
    ['Margem bruta · sobre custos diretos', signed(sale.grossMargin)],
    [
      'Despesas',
      `− ${money(sale.expenses)} (${sale.expenseLines.map((line) => `${line.name} ${money(line.value)}`).join(' · ')})`,
    ],
    ['Margem líquida · sobre custos diretos', signed(sale.netMargin)],
    ['Custo por @', `${money(sale.costPerArroba)} / @`],
    ['Ponto de equilíbrio da venda', `${money(sale.breakEven)} / @`],
    [
      'Saldo após a venda',
      `${sale.headsBefore - sale.heads} animais · ${sale.closesRecord ? 'Vendido' : 'Parcialmente vendido'}`,
    ],
  ]
  return (
    <div className="sale-number-grid compact">
      {rows.map(([label, value]) => (
        <div key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Registrar / editar venda
// ---------------------------------------------------------------------------

const FOCUSABLE =
  "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [href], [tabindex]:not([tabindex='-1'])"

function RegisterSale({
  propertyId,
  base,
  prefill,
  editing,
  step,
  onStep,
  failFirstSave,
  onClose,
  onSaved,
}: {
  propertyId: string
  base: string
  prefill: SalePrefill
  editing?: SaleRecord
  step: number
  onStep: (step: number) => void
  failFirstSave: boolean
  onClose: () => void
  onSaved: (message: string) => void
}) {
  const navigate = useNavigate()
  const options = editing
    ? [getRecord(editing.recordSlug)].filter((r): r is LivestockRecord => Boolean(r))
    : recordsForProperty(propertyId).filter((record) => record.balance > 0 && !record.locked)
  const initialRecord = options.find((r) => r.slug === prefill.slug) ?? options[0]
  const initialHeads = editing?.heads ?? Math.min(prefill.heads ?? 7, initialRecord?.balance ?? 1)

  const [slug, setSlug] = useState(initialRecord?.slug ?? '')
  const [quantity, setQuantity] = useState(initialHeads)
  const [date, setDate] = useState(editing ? toIso(editing.date) : TODAY_ISO)
  const [selected, setSelected] = useState(range(initialHeads))
  const [mode, setMode] = useState<'live' | 'carcass'>('live')
  const [liveWeight, setLiveWeight] = useState(
    editing?.liveWeight ??
      prefill.liveWeight ??
      Math.round(initialHeads * (initialRecord?.avgWeightKg ?? 0)),
  )
  const [yieldRate, setYieldRate] = useState(editing?.yieldRate ?? DEFAULT_YIELD)
  const [carcassArrobas, setCarcassArrobas] = useState(editing?.arrobas ?? 0)
  const [price, setPrice] = useState(editing?.price ?? prefill.price ?? referenceQuote.value)
  const [buyer, setBuyer] = useState(editing?.buyer ?? prefill.buyer ?? '')
  const [fees, setFees] = useState<Fee[]>(
    editing?.expenseLines.map((line) => ({ ...line })) ?? [{ name: 'Frete', value: 0 }],
  )
  const [note, setNote] = useState('')
  const [dirty, setDirty] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [closingOpen, setClosingOpen] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const panelRef = useRef<HTMLElement>(null)
  const nestedOpen = useRef(false)
  nestedOpen.current = closingOpen || discardOpen || helpOpen
  const dirtyRef = useRef(dirty)
  dirtyRef.current = dirty
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const record = getRecord(slug)

  function requestClose() {
    if (dirtyRef.current) setDiscardOpen(true)
    else onCloseRef.current()
  }

  // Foco inicial, Esc para fechar (com confirmação) e foco preso no painel.
  useEffect(() => {
    const restore = document.activeElement as HTMLElement | null
    panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus()
    function onKeydown(event: KeyboardEvent) {
      if (nestedOpen.current || !panelRef.current) return
      if (event.key === 'Escape') {
        event.preventDefault()
        requestClose()
        return
      }
      if (event.key !== 'Tab') return
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeydown)
    return () => {
      document.removeEventListener('keydown', onKeydown)
      restore?.focus()
    }
  }, [])

  useEffect(() => {
    panelRef.current?.querySelector<HTMLElement>('.sale-register-step, .sale-register-grid')
      ?.querySelector<HTMLElement>(FOCUSABLE)
      ?.focus()
  }, [step])

  function touch<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value)
      setDirty(true)
    }
  }

  if (!record) {
    return (
      <RegisterShell panelRef={panelRef} title="Registrar venda" step={1} onClose={requestClose}>
        <StateView
          type="empty"
          title="Nenhum lote com saldo"
          text="Só lotes e animais com saldo podem ser vendidos. Cadastre um lote no Rebanho."
          actionLabel="Ir para o Rebanho"
          onAction={() => navigate(`${base}/rebanho`)}
        />
      </RegisterShell>
    )
  }

  const headsBefore = editing ? editing.headsBefore : record.balance
  const unallocated = editing ? unallocatedAtSale(editing) : record.balanceCost
  const individual = record.kind === 'Individual'
  const arrobasInput =
    mode === 'live' ? arrobasFromLiveWeight(liveWeight, yieldRate) : carcassArrobas
  const expenses = sumFees(fees, 0)
  const result = computeSale({
    unallocatedCostAtDate: unallocated,
    headsBeforeSale: headsBefore,
    headsSold: quantity,
    arrobas: arrobasInput,
    pricePerArroba: price,
    expenses,
  })
  const remaining = Math.max(0, headsBefore - quantity)
  const useAnimalData = record.slug === 'lote-safra-24' && !editing && quantity <= 12

  const quantityError =
    !Number.isInteger(quantity) || quantity < 1
      ? 'Informe pelo menos 1 animal'
      : quantity > headsBefore
        ? `O saldo do ${record.name} é de ${headsBefore} ${headsBefore === 1 ? 'animal' : 'animais'}`
        : undefined
  const dateError = !date
    ? 'Informe a data da venda'
    : date > TODAY_ISO
      ? 'A data da venda não pode ser futura'
      : undefined
  const selectionError = useAnimalData && selected.length !== quantity
  const step1Invalid = Boolean(quantityError || dateError || selectionError)

  const weightError =
    mode === 'live' && !(liveWeight > 0) ? 'Informe o peso vivo total da venda' : undefined
  const yieldError =
    mode === 'live' && !(yieldRate >= 1 && yieldRate <= 100)
      ? 'O rendimento fica entre 1% e 100%'
      : undefined
  const carcassError =
    mode === 'carcass' && !(carcassArrobas > 0)
      ? 'Informe as arrobas do romaneio do frigorífico'
      : undefined
  const priceError = !(price > 0) ? 'Informe o preço por arroba' : undefined
  const feeErrors = fees.map((fee) =>
    fee.value < 0
      ? 'O valor não pode ser negativo'
      : fee.value > 0 && !fee.name.trim()
        ? 'Dê um nome à despesa'
        : undefined,
  )
  const step2Invalid = Boolean(
    weightError || yieldError || carcassError || priceError || feeErrors.some(Boolean),
  )
  const show = (error?: string) => (submitted ? error : undefined)

  function changeLot(nextSlug: string) {
    const next = getRecord(nextSlug)
    if (!next) return
    const heads = Math.min(quantity, next.balance)
    setSlug(nextSlug)
    setQuantity(heads)
    setSelected(range(heads))
    setLiveWeight(Math.round(heads * (next.avgWeightKg ?? 0)))
    setDirty(true)
  }
  function changeQuantity(value: number) {
    setQuantity(value)
    setSelected(range(Math.max(0, Math.min(value, 12))))
    setDirty(true)
  }

  function persist() {
    setSaving(true)
    setSaveError(false)
    const attempt = attempts + 1
    setAttempts(attempt)
    window.setTimeout(() => {
      setSaving(false)
      if (failFirstSave && attempt === 1) {
        setSaveError(true)
        return
      }
      onSaved(
        editing
          ? `Venda de ${editing.date} atualizada. Margens recalculadas.`
          : `Venda registrada: ${quantity} ${quantity === 1 ? 'animal' : 'animais'} do ${record!.name}, ${decimal(result.arrobas)} @ por ${money(result.revenue)}.`,
      )
    }, 700)
  }
  function save(event?: FormEvent) {
    event?.preventDefault()
    setSubmitted(true)
    if (step1Invalid) {
      onStep(1)
      return
    }
    if (step2Invalid || saving) return
    if (remaining === 0 && !editing) {
      setClosingOpen(true)
      return
    }
    persist()
  }

  const title = editing ? `Editar venda de ${editing.date}` : 'Registrar venda'

  return (
    <RegisterShell panelRef={panelRef} title={title} step={step} onClose={requestClose}>
      {step === 1 ? (
        <div className="sale-register-step">
          <div className="sim-section__heading">
            <span>01</span>
            <div>
              <h2>O que foi vendido?</h2>
              <p>Somente lotes e animais com saldo podem ser selecionados.</p>
            </div>
          </div>
          <label className="select-field">
            <span>Lote ou animal</span>
            <select
              value={slug}
              disabled={Boolean(editing)}
              onChange={(e) => changeLot(e.target.value)}
            >
              {options.map((option) => (
                <option key={option.slug} value={option.slug}>
                  {option.name} — saldo {editing ? editing.headsBefore : option.balance}
                </option>
              ))}
            </select>
          </label>
          <div className="form-grid">
            <Field
              label="Quantidade de cabeças"
              type="number"
              inputMode="numeric"
              min="1"
              max={headsBefore}
              value={quantity}
              disabled={individual}
              error={quantityError}
              onChange={(e) => changeQuantity(Number(e.target.value))}
            />
            <Field
              label="Data da venda"
              type="date"
              max={TODAY_ISO}
              value={date}
              error={dateError}
              onChange={(e) => touch(setDate)(e.target.value)}
            />
          </div>
          {individual ? (
            <p className="live-equation">{record.name} · animal acompanhado individualmente.</p>
          ) : editing ? (
            <div className="automatic-selection">
              <p>
                <strong>Animais desta venda</strong>
                <span>
                  {Array.from({ length: editing.heads }, (_, i) => {
                    const order = editing.headsBefore - editing.heads + i + 1
                    return `#${String(order).padStart(2, '0')}`
                  }).join(', ')}
                </span>
              </p>
            </div>
          ) : (
            <AnimalExitSelector
              hasData={useAnimalData}
              quantity={quantity}
              selected={selected}
              setSelected={touch(setSelected)}
              error={selectionError}
              limit={record.balance}
            />
          )}
          <div className="form-footer">
            <Button variant="ghost" onClick={requestClose}>
              Cancelar
            </Button>
            <Button disabled={step1Invalid} onClick={() => onStep(2)}>
              Continuar <ArrowRight aria-hidden="true" />
            </Button>
          </div>
        </div>
      ) : (
        <form className="sale-register-grid" onSubmit={save} noValidate>
          <div className="sale-register-fields">
            <button type="button" className="back-link" onClick={() => onStep(1)}>
              <ArrowLeft aria-hidden="true" /> Voltar ao passo 1 ({quantity}{' '}
              {quantity === 1 ? 'animal' : 'animais'} do {record.name})
            </button>
            <section className="sim-section">
              <div className="sim-section__heading">
                <span>02</span>
                <div>
                  <h2>Como foi a venda?</h2>
                  <p>O valor recebido é calculado pelas arrobas e pelo preço.</p>
                </div>
              </div>
              <div className="sale-mode" role="radiogroup" aria-label="Forma de pesagem">
                {[
                  ['live', 'Pelo peso vivo'],
                  ['carcass', 'Por arrobas de carcaça'],
                ].map(([key, label]) => (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={mode === key}
                    className={mode === key ? 'active' : ''}
                    onClick={() => touch(setMode)(key as 'live' | 'carcass')}
                    key={key}
                  >
                    {mode === key && <Check aria-hidden="true" />}
                    {label}
                  </button>
                ))}
              </div>
              {mode === 'live' ? (
                <>
                  <div className="form-grid">
                    <Field
                      label="Peso vivo total"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      value={liveWeight}
                      error={show(weightError)}
                      onChange={(e) => touch(setLiveWeight)(Number(e.target.value))}
                      suffix={<span className="field-suffix">kg</span>}
                    />
                    <Field
                      label="Rendimento de carcaça"
                      type="number"
                      inputMode="decimal"
                      min="1"
                      max="100"
                      value={yieldRate}
                      error={yieldError}
                      onChange={(e) => touch(setYieldRate)(Number(e.target.value))}
                      suffix={<span className="field-suffix">%</span>}
                    />
                  </div>
                  <p className="live-equation" aria-live="polite">
                    {decimal(liveWeight, 0)} kg × {decimal(yieldRate, 0)}% ÷ 15 ={' '}
                    <strong>{decimal(result.arrobas)} @</strong>
                    <small>Rendimento padrão da propriedade: {DEFAULT_YIELD}%</small>
                  </p>
                </>
              ) : (
                <Field
                  label="Arrobas informadas pelo frigorífico"
                  type="number"
                  inputMode="decimal"
                  step=".01"
                  min="0"
                  value={carcassArrobas}
                  error={show(carcassError)}
                  onChange={(e) => touch(setCarcassArrobas)(Number(e.target.value))}
                  suffix={<span className="field-suffix">@</span>}
                />
              )}
              <Field
                label="Preço por arroba"
                type="number"
                inputMode="decimal"
                step=".01"
                min="0"
                value={price}
                error={show(priceError)}
                onChange={(e) => touch(setPrice)(Number(e.target.value))}
                suffix={<span className="field-suffix">R$ / @</span>}
              />
              {price !== referenceQuote.value && (
                <button
                  type="button"
                  className="inline-shortcut"
                  onClick={() => touch(setPrice)(referenceQuote.value)}
                >
                  Usar a cotação de referência ({money(referenceQuote.value)} em{' '}
                  {referenceQuote.date.slice(0, 5)})
                </button>
              )}
            </section>
            <section className="sim-section">
              <h3>Comprador e despesas</h3>
              <Field
                label="Comprador (opcional)"
                list="property-buyers"
                value={buyer}
                placeholder="Busque ou digite um novo nome"
                onChange={(event) => touch(setBuyer)(event.target.value)}
              />
              <datalist id="property-buyers">
                {buyers.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
              {buyer.trim() && !buyers.includes(buyer.trim()) ? (
                <p className="field-hint">
                  <Plus aria-hidden="true" /> Novo comprador: “{buyer.trim()}” será adicionado aos
                  cadastros ao salvar.
                </p>
              ) : (
                <p className="field-hint">
                  Compradores da propriedade: {buyers.join(' e ')}. Para um novo, digite o nome.
                </p>
              )}
              <FeeLines fees={fees} setFees={touch(setFees)} errors={submitted ? feeErrors : []} currencyOnly />
              <Field
                label="Observação (opcional)"
                value={note}
                onChange={(e) => touch(setNote)(e.target.value)}
                placeholder="Condições combinadas, prazo ou detalhes"
              />
            </section>
          </div>
          <aside className="sale-live-card" aria-label="Resumo ao vivo">
            <span className="eyebrow">RESUMO AO VIVO</span>
            <h2>{signed(result.netMargin)}</h2>
            <p>Margem líquida</p>
            <MarginLabel balance={remaining} hasSale onHelp={() => setHelpOpen(true)} />
            <div className="sale-result-list">
              <Result
                label="Arrobas"
                value={`${decimal(result.arrobas)} @`}
                source={mode === 'live' ? 'calculado' : 'digitado'}
              />
              <Result label="Preço" value={`${money(price)} / @`} source="digitado" />
              <Result label="Receita" value={money(result.revenue)} source="calculado" />
              <Result
                label="Custo alocado"
                value={`− ${money(result.allocatedCost)}`}
                source="do sistema"
                detail={`${money(unallocated / headsBefore)} por cabeça × ${quantity}`}
                onOpen={() => navigate(`${base}/rebanho/${record.slug}?aba=custos`)}
              />
              <Result
                label="Margem bruta · sobre custos diretos"
                value={signed(result.grossMargin)}
                source="calculado"
              />
              <Result label="Despesas" value={`− ${money(expenses)}`} source="digitado" />
              <Result
                label="Margem líquida · sobre custos diretos"
                value={signed(result.netMargin)}
                source="calculado"
              />
              <Result
                label="Custo por @"
                value={`${money(result.costPerArroba)} / @`}
                source="calculado"
              />
              <Result
                label="Ponto de equilíbrio da venda"
                value={`${money(result.breakEven)} / @`}
                source="calculado"
              />
              <Result
                label="Saldo restante"
                value={`${remaining} ${remaining === 1 ? 'animal' : 'animais'}`}
                source="do sistema"
              />
              <Result
                label="Status após a venda"
                value={remaining ? 'Parcialmente vendido' : 'Vendido'}
                source="do sistema"
              />
            </div>
            {saveError && (
              <div className="register-error" role="alert">
                <AlertCircle aria-hidden="true" />
                <span>
                  <strong>Não conseguimos salvar a venda.</strong>
                  <small>Nada foi gravado. Confira a internet e tente de novo.</small>
                </span>
              </div>
            )}
            {submitted && step2Invalid && (
              <p className="field__error" role="alert">
                <AlertCircle size={16} aria-hidden="true" /> Corrija os campos marcados para salvar.
              </p>
            )}
            <Button
              type="submit"
              disabled={saving}
              icon={
                saving ? (
                  <LoaderCircle className="spin" aria-hidden="true" />
                ) : (
                  <Check aria-hidden="true" />
                )
              }
            >
              {saving ? 'Salvando…' : saveError ? 'Tentar de novo' : editing ? 'Salvar alterações' : 'Salvar venda'}
            </Button>
          </aside>
        </form>
      )}
      <Modal
        open={closingOpen}
        onClose={() => setClosingOpen(false)}
        title="Esta venda encerra o lote"
      >
        <p className="modal-copy">
          Esta venda encerra o lote. Depois, custos e vendas ficam travados.
        </p>
        <div className="modal__actions">
          <Button variant="ghost" onClick={() => setClosingOpen(false)}>
            Revisar
          </Button>
          <Button
            onClick={() => {
              setClosingOpen(false)
              persist()
            }}
          >
            Confirmar e encerrar
          </Button>
        </div>
      </Modal>
      <Modal
        open={discardOpen}
        onClose={() => setDiscardOpen(false)}
        title="Descartar esta venda?"
      >
        <p className="modal-copy">
          Os dados que você preencheu não foram salvos e serão perdidos.
        </p>
        <div className="modal__actions">
          <Button variant="ghost" onClick={() => setDiscardOpen(false)}>
            Continuar preenchendo
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              setDiscardOpen(false)
              onClose()
            }}
          >
            Descartar
          </Button>
        </div>
      </Modal>
      <CalculationHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
    </RegisterShell>
  )
}

function RegisterShell({
  panelRef,
  title,
  step,
  onClose,
  children,
}: {
  panelRef: RefObject<HTMLElement | null>
  title: string
  step: number
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div className="sale-register-backdrop" onMouseDown={onClose}>
      <section
        ref={panelRef}
        className="sale-register-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="register-sale-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Fechar">
            <X aria-hidden="true" />
          </button>
          <div>
            <span className="eyebrow">VENDA EM ARROBAS · PASSO {step} DE 2</span>
            <h2 id="register-sale-title">{title}</h2>
          </div>
          <div className="stepper-mini" aria-hidden="true">
            <i className="active" />
            <i className={step === 2 ? 'active' : ''} />
          </div>
        </header>
        {children}
      </section>
    </div>
  )
}

function range(length: number) {
  return Array.from({ length: Math.max(0, length) }, (_, index) => index + 1)
}

// ---------------------------------------------------------------------------
// Simulador
// ---------------------------------------------------------------------------

function Simulator({
  propertyId,
  forceEmpty,
  onRegister,
  onHelp,
}: {
  propertyId: string
  forceEmpty: boolean
  onRegister: (prefill: SalePrefill) => void
  onHelp: () => void
}) {
  const navigate = useNavigate()
  const { base } = useActiveProperty()
  const [params, setParams] = useSearchParams()
  const options = forceEmpty
    ? []
    : recordsForProperty(propertyId).filter((record) => record.balance > 0 && !record.locked)
  const record = options.find((r) => r.slug === params.get('lote')) ?? options[0]
  const [quantity, setQuantity] = useState(Math.min(7, record?.balance ?? 1))
  const [weight, setWeight] = useState(record?.avgWeightKg ?? 0)
  const [yieldRate, setYieldRate] = useState(DEFAULT_YIELD)
  const [quote, setQuote] = useState(referenceQuote.value)
  const [date, setDate] = useState('2027-01-15')
  const [fees, setFees] = useState<Fee[]>([
    { name: 'Frete', value: 850, mode: 'R$' },
    { name: 'Comissão', value: 1.5, mode: '%' },
  ])

  if (!record) {
    return (
      <StateView
        type="empty"
        title="Nenhum lote com saldo para simular"
        text="O simulador usa o saldo e o peso dos animais. Cadastre um lote no Rebanho."
        actionLabel="Ir para o Rebanho"
        onAction={() => navigate(`${base}/rebanho`)}
      />
    )
  }

  function changeLot(slug: string) {
    const next = getRecord(slug)
    const nextParams = new URLSearchParams(params)
    nextParams.set('lote', slug)
    setParams(nextParams, { replace: true })
    if (next) {
      setQuantity((q) => Math.min(q, next.balance))
      setWeight(next.avgWeightKg ?? 0)
    }
  }

  const quantityError =
    quantity < 1 || !Number.isInteger(quantity)
      ? 'Informe pelo menos 1 animal'
      : quantity > record.balance
        ? `O saldo do ${record.name} é de ${record.balance} ${record.balance === 1 ? 'animal' : 'animais'}`
        : undefined
  const dateError = !date
    ? 'Informe a data prevista'
    : date < TODAY_ISO
      ? 'A data prevista não pode ser passada'
      : undefined
  const weightError = weight > 0 ? undefined : 'Informe o peso vivo médio'
  const yieldError = yieldRate >= 1 && yieldRate <= 100 ? undefined : 'Entre 1% e 100%'
  const invalid = Boolean(quantityError || dateError || weightError || yieldError || !(quote > 0))

  const forecast = date && !dateError ? forecastUntil(record.slug, date) : 0
  const arrobas = round2(arrobasFromLiveWeight(quantity * weight, yieldRate))
  const revenue = round2(arrobas * quote)
  const expense = sumFees(fees, revenue)
  const result = computeSale({
    unallocatedCostAtDate: record.balanceCost + forecast,
    headsBeforeSale: record.balance,
    headsSold: Math.max(1, Math.min(quantity, record.balance)),
    arrobas,
    pricePerArroba: quote,
    expenses: expense,
  })
  const dateLabel = date ? toBr(date) : '—'

  return (
    <div className="simulator-layout">
      <div className="simulator-form">
        <section className="sim-section">
          <div className="sim-section__heading">
            <span>01</span>
            <div>
              <h2>Cenário da venda</h2>
              <p>Use o saldo e o peso atual para estimar as arrobas.</p>
            </div>
          </div>
          <label className="select-field">
            <span>Lote</span>
            <select value={record.slug} onChange={(e) => changeLot(e.target.value)}>
              {options.map((option) => (
                <option key={option.slug} value={option.slug}>
                  {option.name} — {option.balance} {option.balance === 1 ? 'animal' : 'animais'}
                </option>
              ))}
            </select>
          </label>
          <div className="form-grid">
            <Field
              label="Quantidade"
              type="number"
              inputMode="numeric"
              min="1"
              max={record.balance}
              value={quantity}
              error={quantityError}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
            <Field
              label="Peso vivo médio estimado"
              type="number"
              inputMode="decimal"
              value={weight}
              error={weightError}
              onChange={(e) => setWeight(Number(e.target.value))}
              suffix={<span className="field-suffix">kg</span>}
            />
            <Field
              label="Rendimento"
              type="number"
              inputMode="decimal"
              value={yieldRate}
              error={yieldError}
              onChange={(e) => setYieldRate(Number(e.target.value))}
              suffix={<span className="field-suffix">%</span>}
            />
            <Field
              label="Data prevista da venda"
              type="date"
              min={TODAY_ISO}
              value={date}
              error={dateError}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <aside className="estimated-cost" aria-live="polite">
            <Clock aria-hidden="true" />
            <p>
              <strong>
                {forecast > 0
                  ? `Até ${dateLabel}, o lote deve somar mais ${money(forecast)} de previstos.`
                  : `Até ${dateLabel}, não há gastos previstos lançados para este lote.`}
              </strong>
              <small>estimado · previstos não entram no custo confirmado</small>
            </p>
          </aside>
        </section>
        <section className="sim-section">
          <div className="sim-section__heading">
            <span>02</span>
            <div>
              <h2>Preço e despesas</h2>
              <p>
                Cotação de referência: {money(referenceQuote.value)} / @ em {referenceQuote.date} ·{' '}
                {referenceQuote.source}.
              </p>
            </div>
          </div>
          <div className="quote-input-row">
            <Field
              label="Preço da @"
              type="number"
              inputMode="decimal"
              value={quote}
              error={quote > 0 ? undefined : 'Informe o preço da @'}
              onChange={(e) => setQuote(Number(e.target.value))}
              suffix={<span className="field-suffix">R$ / @</span>}
            />
            <label className="select-field">
              <span>Praça</span>
              <select>
                <option>{referenceQuote.market}</option>
              </select>
            </label>
            <Button variant="secondary" disabled icon={<Search aria-hidden="true" />}>
              Buscar do CEPEA · Em breve
            </Button>
          </div>
          <FeeLines fees={fees} setFees={setFees} errors={[]} />
        </section>
      </div>
      <aside className="simulation-output">
        <b className="simulation-seal">Simulação: não altera nenhum dado.</b>
        <span className="eyebrow">CENÁRIO EM {decimal(result.arrobas)} @ · {dateLabel}</span>
        <h2>Venda prevista</h2>
        <div className="simulation-primary">
          <small>Margem líquida</small>
          <strong>{signed(result.netMargin)}</strong>
          <span>sobre custos diretos · estimado</span>
        </div>
        <div className="simulation-numbers">
          <Result label="Receita" value={money(result.revenue)} source="calculado" />
          <Result
            label="Custo alocado estimado"
            value={`− ${money(result.allocatedCost)}`}
            source="estimado"
            detail={
              forecast > 0 ? `inclui ${money(forecast)} de previstos até ${dateLabel}` : undefined
            }
          />
          <Result label="Despesas" value={`− ${money(expense)}`} source="digitado" />
          <Result
            label="Margem bruta · sobre custos diretos"
            value={signed(result.grossMargin)}
            source="estimado"
          />
          <Result
            label="Margem líquida · sobre custos diretos"
            value={signed(result.netMargin)}
            source="estimado"
          />
          <Result
            label="Custo por @"
            value={`${money(result.costPerArroba)} / @`}
            source="estimado"
          />
          <Result
            label="Ponto de equilíbrio"
            value={`${money(result.breakEven)} / @`}
            source="estimado"
          />
        </div>
        <button type="button" className="text-link" onClick={onHelp}>
          Como calculamos
        </button>
        <label className="quote-slider">
          <span>
            <strong>E se a arroba for…</strong>
            <b>{money(quote)}</b>
          </span>
          <input
            type="range"
            min="220"
            max="400"
            step=".5"
            value={quote}
            aria-label="Preço da arroba na simulação"
            onChange={(e) => setQuote(Number(e.target.value))}
          />
          <small>
            <i>R$ 220</i>
            <i>R$ 400</i>
          </small>
        </label>
        <div className="simulation-actions">
          <Button
            icon={<ArrowRight aria-hidden="true" />}
            disabled={invalid}
            onClick={() =>
              onRegister({
                slug: record.slug,
                price: quote,
                heads: quantity,
                liveWeight: Math.round(quantity * weight),
              })
            }
          >
            Transformar em venda
          </Button>
        </div>
      </aside>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Ofertas
// ---------------------------------------------------------------------------

function Offers({
  propertyId,
  offers,
  setOffers,
  onRegister,
  onToast,
}: {
  propertyId: string
  offers: Offer[]
  setOffers: (offers: Offer[]) => void
  onRegister: (prefill: SalePrefill) => void
  onToast: (message: string) => void
}) {
  const options = recordsForProperty(propertyId).filter((r) => r.balance > 0 && !r.locked)
  const slugs = new Set(options.map((r) => r.slug))
  const visible = offers.filter((offer) => slugs.has(offer.slug))
  const [open, setOpen] = useState(false)
  const emptyForm = {
    slug: options[0]?.slug ?? '',
    buyer: '',
    date: TODAY_ISO,
    price: '',
    heads: '',
    note: '',
  }
  const [form, setForm] = useState(emptyForm)
  const [submitted, setSubmitted] = useState(false)
  const formRecord = getRecord(form.slug)
  const price = Number(form.price.replace(',', '.'))
  const heads = form.heads ? Number(form.heads) : null
  const errors = {
    buyer: form.buyer.trim() ? undefined : 'Informe quem fez a oferta',
    date: !form.date
      ? 'Informe a data da oferta'
      : form.date > TODAY_ISO
        ? 'A data da oferta não pode ser futura'
        : undefined,
    price: price > 0 ? undefined : 'Informe o preço por @',
    heads:
      heads === null
        ? undefined
        : !Number.isInteger(heads) || heads < 1
          ? 'Use um número inteiro de cabeças'
          : formRecord && heads > formRecord.balance
            ? `O saldo do ${formRecord.name} é de ${formRecord.balance} animais`
            : undefined,
  }
  const invalid = Object.values(errors).some(Boolean)
  const set = (key: keyof typeof form) => (value: string) => setForm({ ...form, [key]: value })

  function openForm() {
    setForm(emptyForm)
    setSubmitted(false)
    setOpen(true)
  }
  function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    if (invalid || !formRecord) return
    setOffers([
      {
        id: `oferta-${Date.now()}`,
        slug: form.slug,
        buyer: form.buyer.trim(),
        date: toBr(form.date),
        price,
        heads,
        note: form.note.trim(),
      },
      ...offers,
    ])
    setOpen(false)
    onToast('Oferta registrada para comparação. Ela não altera nenhum número do lote.')
  }
  const show = (error?: string) => (submitted ? error : undefined)

  return (
    <>
      <aside className="offer-disclaimer">
        <Info aria-hidden="true" />
        <span>
          <strong>Oferta é só referência. Ela não vira venda sozinha.</strong>
          <small>
            Compare preços e transforme em venda somente quando o negócio estiver fechado.
          </small>
        </span>
        <Button icon={<Plus aria-hidden="true" />} onClick={openForm} disabled={!options.length}>
          Registrar oferta
        </Button>
      </aside>
      {visible.length ? (
        <div className="offers-grid">
          {visible.map((offer) => {
            const record = getRecord(offer.slug)!
            return (
              <article className="offer-card" key={offer.id}>
                <header>
                  <span>
                    <small>OFERTA EM {offer.date}</small>
                    <h2>{offer.buyer}</h2>
                  </span>
                  <strong>
                    {money(offer.price)} <small>/ @</small>
                  </strong>
                </header>
                <p>
                  {offer.heads ? `${offer.heads} cabeças · ` : ''}
                  {record.name}
                  {offer.note ? ` · ${offer.note}` : ''}
                </p>
                <OfferComparison price={offer.price} record={record} />
                <Button
                  variant="secondary"
                  icon={<ArrowRight aria-hidden="true" />}
                  onClick={() =>
                    onRegister({
                      slug: offer.slug,
                      price: offer.price,
                      heads: offer.heads ?? undefined,
                      buyer: offer.buyer,
                    })
                  }
                >
                  Registrar venda com este preço
                </Button>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="no-results">
          <TrendingUp aria-hidden="true" />
          <h2>Nenhuma oferta registrada</h2>
          <p>
            Quando um frigorífico ou comprador fizer uma proposta, registre aqui para comparar com a
            cotação e com o seu ponto de equilíbrio.
          </p>
          {options.length ? <Button onClick={openForm}>Registrar oferta</Button> : null}
        </div>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="Registrar oferta">
        <form className="form-stack" onSubmit={submit} noValidate>
          <label className="select-field">
            <span>Lote</span>
            <select value={form.slug} onChange={(e) => set('slug')(e.target.value)}>
              {options.map((option) => (
                <option key={option.slug} value={option.slug}>
                  {option.name} — saldo {option.balance}
                </option>
              ))}
            </select>
          </label>
          <Field
            label="Comprador"
            list="offer-buyers"
            value={form.buyer}
            error={show(errors.buyer)}
            placeholder="Busque ou digite um novo nome"
            onChange={(e) => set('buyer')(e.target.value)}
          />
          <datalist id="offer-buyers">
            {buyers.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          {form.buyer.trim() && !buyers.includes(form.buyer.trim()) && (
            <p className="field-hint">
              <Plus aria-hidden="true" /> Novo comprador: será adicionado aos cadastros.
            </p>
          )}
          <div className="form-grid">
            <Field
              label="Data"
              type="date"
              max={TODAY_ISO}
              value={form.date}
              error={show(errors.date)}
              onChange={(e) => set('date')(e.target.value)}
            />
            <Field
              label="Preço por @"
              inputMode="decimal"
              value={form.price}
              error={show(errors.price)}
              placeholder="Ex.: 315,00"
              onChange={(e) => set('price')(e.target.value)}
              suffix={<span className="field-suffix">R$ / @</span>}
            />
            <Field
              label="Quantidade de cabeças (opcional)"
              inputMode="numeric"
              value={form.heads}
              error={show(errors.heads)}
              onChange={(e) => set('heads')(e.target.value)}
            />
          </div>
          <Field
            label="Observação (opcional)"
            value={form.note}
            onChange={(e) => set('note')(e.target.value)}
          />
          {price > 0 && formRecord && <OfferComparison price={price} record={formRecord} />}
          <div className="modal__actions">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Registrar oferta</Button>
          </div>
        </form>
      </Modal>
    </>
  )
}

function OfferComparison({ price, record }: { price: number; record: LivestockRecord }) {
  const toQuote = round2(price - referenceQuote.value)
  const toBreakEven = record.breakEven === null ? null : round2(price - record.breakEven)
  return (
    <div className="offer-comparisons">
      <ComparisonLine
        diff={toQuote}
        text={(abs, word) => `${abs} / @ ${word} da cotação de referência`}
        evenText="Igual à cotação de referência"
      />
      {toBreakEven !== null && (
        <ComparisonLine
          diff={toBreakEven}
          text={(abs, word) =>
            `${abs} / @ ${word} do seu ponto de equilíbrio${toBreakEven < 0 ? ': dá prejuízo' : ''}`
          }
          evenText="Igual ao seu ponto de equilíbrio: não dá lucro"
        />
      )}
    </div>
  )
}

function ComparisonLine({
  diff,
  text,
  evenText,
}: {
  diff: number
  text: (abs: string, word: 'acima' | 'abaixo') => string
  evenText: string
}) {
  const tone = diff < 0 ? 'below' : diff > 0 ? 'above' : 'even'
  const Icon = tone === 'below' ? TrendingDown : tone === 'above' ? TrendingUp : Minus
  return (
    <span className={tone}>
      <Icon aria-hidden="true" />
      <strong>
        {tone === 'even'
          ? evenText
          : `${diff < 0 ? '−' : '+'} ${text(money(Math.abs(diff)), diff < 0 ? 'abaixo' : 'acima')}`}
      </strong>
    </span>
  )
}

// ---------------------------------------------------------------------------
// Partes compartilhadas
// ---------------------------------------------------------------------------

function FeeLines({
  fees,
  setFees,
  errors,
  currencyOnly = false,
}: {
  fees: Fee[]
  setFees: (fees: Fee[]) => void
  errors: (string | undefined)[]
  currencyOnly?: boolean
}) {
  const directTotal = round2(fees.reduce((sum, fee) => sum + (fee.mode === '%' ? 0 : fee.value), 0))
  const hasPercent = fees.some((fee) => fee.mode === '%')
  return (
    <fieldset className="fee-editor">
      <legend>Despesas da venda (opcional)</legend>
      {fees.length ? (
        <div className="fee-lines">
          {fees.map((fee, index) => (
            <div key={index}>
              <label>
                <span className="fee-lines__label">Despesa</span>
                <input
                  value={fee.name}
                  placeholder="Frete, comissão, taxa"
                  aria-invalid={Boolean(errors[index])}
                  onChange={(e) =>
                    setFees(fees.map((f, i) => (i === index ? { ...f, name: e.target.value } : f)))
                  }
                />
              </label>
              <label>
                <span className="fee-lines__label">Valor {fee.mode === '%' ? '(%)' : '(R$)'}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  value={fee.value}
                  aria-invalid={Boolean(errors[index])}
                  onChange={(e) =>
                    setFees(
                      fees.map((f, i) => (i === index ? { ...f, value: Number(e.target.value) } : f)),
                    )
                  }
                />
              </label>
              {!currencyOnly && (
                <label>
                  <span className="fee-lines__label">Unidade</span>
                  <select
                    value={fee.mode ?? 'R$'}
                    onChange={(e) =>
                      setFees(
                        fees.map((f, i) =>
                          i === index ? { ...f, mode: e.target.value as 'R$' | '%' } : f,
                        ),
                      )
                    }
                  >
                    <option>R$</option>
                    <option>%</option>
                  </select>
                </label>
              )}
              <button
                type="button"
                aria-label={`Remover ${fee.name || 'despesa'}`}
                onClick={() => setFees(fees.filter((_, i) => i !== index))}
              >
                <Trash2 aria-hidden="true" />
              </button>
              {errors[index] && (
                <small className="field__error">
                  <AlertCircle size={16} aria-hidden="true" /> {errors[index]}
                </small>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="field-hint">Sem despesas nesta venda.</p>
      )}
      <Button
        type="button"
        variant="secondary"
        icon={<Plus aria-hidden="true" />}
        onClick={() => setFees([...fees, { name: '', value: 0, mode: 'R$' }])}
      >
        Adicionar despesa
      </Button>
      <p className="fee-total">
        <span>Total das despesas</span>
        <strong>
          {hasPercent && !currencyOnly
            ? `${money(directTotal)} + % sobre a receita (no resumo)`
            : money(directTotal)}
        </strong>
      </p>
    </fieldset>
  )
}

function Result({
  label,
  value,
  source,
  detail,
  onOpen,
}: {
  label: string
  value: string
  source: string
  detail?: string
  onOpen?: () => void
}) {
  return (
    <div>
      <span>
        {label}
        <small className={`source-tag source-tag--${source.replace(' ', '-')}`}>{source}</small>
        {detail && <em>{detail}</em>}
      </span>
      <strong>{value}</strong>
      {onOpen && (
        <button type="button" onClick={onOpen} aria-label={`Ver os custos que formam o ${label.toLowerCase()}`}>
          <ExternalLink aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

