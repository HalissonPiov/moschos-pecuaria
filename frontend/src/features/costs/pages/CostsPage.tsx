/*
 * Custos — sub-abas Lançamentos · Notas · A confirmar · A pagar · Projeção · Categorias.
 *
 * Estado na rota (abre direto por link):
 *   ?aba=lancamentos|notas|confirmar|pagar|projecao|categorias
 *   Lançamentos: busca, periodo (30|ano), pagamento (pago|a-pagar|vencido), vence7=1,
 *                fornecedor, categoria, lote, estornados=1, ordem=valor, lancamento=<id>
 *   Notas: situacao (pago|a-pagar), nota=<id>
 *   A confirmar: historico=1 (mostra pulados, cancelados e encerrados)
 *   Projeção: meses=3|6|12, lote
 *   Categorias: inativas=1
 *   novo=previsto abre "Lançar previsto".
 *
 * Parâmetros de demonstração (sem botões na interface):
 *   ?estado=loading|error|empty  mostra o estado da sub-aba aberta.
 */
import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import {
  Ban,
  CalendarClock,
  CalendarX,
  Camera,
  Check,
  ChevronRight,
  CircleDollarSign,
  Edit3,
  FileText,
  Info,
  Lock,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Repeat,
  Search,
  SkipForward,
  TriangleAlert,
  Undo2,
  WalletCards,
  X,
} from 'lucide-react'
import { motion } from 'motion/react'
import AppShell from '@/shared/layout/AppShell'
import PredictedCostModal, {
  TODAY_ISO,
  addPeriod,
  brToIso,
  isoToBr,
  parseMoney,
  periodicities,
  shortDate,
  useActiveDestinations,
  type Periodicity,
  type PredictedDraft,
} from '@/features/costs/components/PredictedCostModal'
import { SoldLockBanner } from '@/shared/ui/BusinessRules'
import { Button, Field, Modal, StateView, Toast } from '@/shared/ui/UI'
import { TODAY, daysBetween, decimal, herd, money, parseBrDate } from '@/shared/demo/data'
import { propertyNotFoundCopy, useActiveProperty } from '@/shared/routing/navigation'

// ---------------------------------------------------------------------------
// Dados de demonstração (coerentes com a Etapa 0.11; hoje = 20/11/2026)
// ---------------------------------------------------------------------------

/** Prazo de alerta de vencimento da Fazenda da Baixada (dias). */
const DUE_ALERT_DAYS = 7

type Payment = { status: 'paid'; paidOn: string } | { status: 'payable'; due: string }

export type Entry = {
  id: string
  date: string
  description: string
  supplier: string
  category: string
  value: number
  destination: string
  payment: Payment
  author: string
  noteId: string | null
  recurrence: string | null
  reversedOn?: string
}

const initialEntries: Entry[] = [
  {
    id: 'e1',
    date: '05/11/2026',
    description: 'Sal mineral proteinado',
    supplier: 'Agropecuária Ponte Nova',
    category: 'Suplemento',
    value: 2184.7,
    destination: 'Lote Safra 24',
    payment: { status: 'paid', paidOn: '05/11/2026' },
    author: 'João Batista',
    noteId: 'n1',
    recurrence: null,
  },
  {
    id: 'e8',
    date: '14/11/2026',
    description: 'Ração de crescimento 20%',
    supplier: 'Casa do Criador',
    category: 'Ração',
    value: 2150,
    destination: 'Lote Bezerros Sul',
    payment: { status: 'payable', due: '15/12/2026' },
    author: 'Ana Batista',
    noteId: 'n5',
    recurrence: null,
  },
  {
    id: 'e2',
    date: '22/10/2026',
    description: 'Vacina contra clostridiose',
    supplier: 'Vet Rural',
    category: 'Medicamento',
    value: 786.45,
    destination: 'Lote Safra 24',
    payment: { status: 'payable', due: '25/11/2026' },
    author: 'Ana Batista',
    noteId: 'n2',
    recurrence: null,
  },
  {
    id: 'e3',
    date: '06/10/2026',
    description: 'Locação de pasto',
    supplier: 'Carlos Andrade',
    category: 'Locação de pasto',
    value: 3250,
    destination: 'Lote Safra 24',
    payment: { status: 'payable', due: '18/11/2026' },
    author: 'João Batista',
    noteId: null,
    recurrence: null,
  },
  {
    id: 'e4',
    date: '19/09/2026',
    description: 'Ração de recria 18%',
    supplier: 'Casa do Criador',
    category: 'Ração',
    value: 4832.18,
    destination: 'Lote Safra 24',
    payment: { status: 'paid', paidOn: '19/09/2026' },
    author: 'João Batista',
    noteId: 'n3',
    recurrence: null,
  },
  {
    id: 'e5',
    date: '19/09/2026',
    description: 'Sal comum 25 kg',
    supplier: 'Casa do Criador',
    category: 'Suplemento',
    value: 342.8,
    destination: 'Boi 047',
    payment: { status: 'paid', paidOn: '19/09/2026' },
    author: 'João Batista',
    noteId: 'n3',
    recurrence: null,
  },
  {
    id: 'e6',
    date: '02/09/2026',
    description: 'Reparo da cerca do curral',
    supplier: 'Casa do Criador',
    category: 'Manutenção',
    value: 640,
    destination: 'Lote Safra 24',
    payment: { status: 'paid', paidOn: '02/09/2026' },
    author: 'Ana Batista',
    noteId: 'n4',
    recurrence: null,
    reversedOn: '10/09/2026',
  },
  {
    id: 'e7',
    date: '03/05/2026',
    description: 'Ração de terminação',
    supplier: 'Agropecuária Ponte Nova',
    category: 'Ração',
    value: 5120,
    destination: 'Lote Recria 23',
    payment: { status: 'paid', paidOn: '03/05/2026' },
    author: 'João Batista',
    noteId: null,
    recurrence: null,
  },
]

type Receipt = {
  id: string
  supplier: string
  date: string
  total: number
  number: string | null
  author: string
  tone: string
}

const initialReceipts: Receipt[] = [
  {
    id: 'n5',
    supplier: 'Casa do Criador',
    date: '14/11/2026',
    total: 2150,
    number: 'NF 01277',
    author: 'Ana Batista',
    tone: 'green',
  },
  {
    id: 'n1',
    supplier: 'Agropecuária Ponte Nova',
    date: '05/11/2026',
    total: 2400,
    number: 'NF 18492',
    author: 'João Batista',
    tone: 'green',
  },
  {
    id: 'n2',
    supplier: 'Vet Rural',
    date: '22/10/2026',
    total: 786.45,
    number: 'NF 00983',
    author: 'Ana Batista',
    tone: 'sand',
  },
  {
    id: 'n3',
    supplier: 'Casa do Criador',
    date: '19/09/2026',
    total: 5174.98,
    number: null,
    author: 'João Batista',
    tone: 'navy',
  },
  {
    id: 'n4',
    supplier: 'Casa do Criador',
    date: '02/09/2026',
    total: 640,
    number: 'NF 55120',
    author: 'Ana Batista',
    tone: 'pale',
  },
]

type PendingStatus = 'ativo' | 'pulado' | 'cancelado' | 'encerrado'

export type PendingItem = {
  id: string
  title: string
  /** Como o item aparece no toast de confirmação ("A próxima ração..."). */
  shortName: string
  destination: string
  date: string
  value: number
  category: string
  supplier: string
  recurrence: Periodicity | null
  status: PendingStatus
  endedOn?: string
}

const initialPending: PendingItem[] = [
  {
    id: 'p1',
    title: 'Ração mensal',
    shortName: 'ração',
    destination: 'Lote Safra 24',
    date: '05/11/2026',
    value: 4680,
    category: 'Ração',
    supplier: 'Agropecuária Ponte Nova',
    recurrence: 'Mensal',
    status: 'ativo',
  },
  {
    id: 'p2',
    title: 'Sal mineral proteinado',
    shortName: 'compra de sal mineral',
    destination: 'Lote Bezerros Sul',
    date: '12/12/2026',
    value: 1240,
    category: 'Suplemento',
    supplier: 'Agropecuária Ponte Nova',
    recurrence: 'Mensal',
    status: 'ativo',
  },
  {
    id: 'p3',
    title: 'Manutenção do curral',
    shortName: 'manutenção do curral',
    destination: 'Lote Safra 24',
    date: '15/12/2026',
    value: 850,
    category: 'Manutenção',
    supplier: 'Casa do Criador',
    recurrence: null,
    status: 'ativo',
  },
]

type Category = {
  name: string
  count: number
  color: string
  active: boolean
  suggested: boolean
}

const categoryColors = [
  ['green', 'Verde'],
  ['olive', 'Oliva'],
  ['sand', 'Areia'],
  ['navy', 'Azul-marinho'],
  ['gray', 'Cinza'],
] as const

const initialCategories: Category[] = [
  'Ração',
  'Suplemento',
  'Medicamento',
  'Locação de pasto',
  'Mão de obra',
  'Manutenção',
].map((name, index) => ({
  name,
  count: [42, 31, 18, 9, 4, 0][index],
  color: ['green', 'olive', 'sand', 'navy', 'gray', 'gray'][index],
  active: true,
  suggested: true,
}))

// ---------------------------------------------------------------------------
// Utilitários
// ---------------------------------------------------------------------------

function isOverdue(entry: Entry) {
  return entry.payment.status === 'payable' && daysBetween(entry.payment.due) > 0
}
function daysUntilDue(entry: Entry) {
  return entry.payment.status === 'payable' ? daysBetween(TODAY, entry.payment.due) : Infinity
}
function isActivePayable(entry: Entry) {
  return entry.payment.status === 'payable' && !entry.reversedOn
}
function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`
}
function recordFor(name: string) {
  return herd.find((record) => record.name === name)
}
function isLocked(entry: Entry) {
  return Boolean(recordFor(entry.destination)?.locked)
}

function PaymentBadge({ entry }: { entry: Entry }) {
  let kind = 'payable'
  let icon: ReactNode = <CalendarClock aria-hidden="true" />
  let text = ''
  if (entry.reversedOn) {
    kind = 'reversed'
    icon = <Undo2 aria-hidden="true" />
    text = `Estornado em ${shortDate(entry.reversedOn)}`
  } else if (entry.payment.status === 'paid') {
    kind = 'paid'
    icon = <Check aria-hidden="true" />
    text = 'Pago'
  } else {
    const late = daysBetween(entry.payment.due)
    if (late > 0) {
      kind = 'overdue'
      icon = <TriangleAlert aria-hidden="true" />
      text = `Vencido há ${plural(late, 'dia', 'dias')}`
    } else if (late === 0) {
      kind = 'overdue'
      icon = <TriangleAlert aria-hidden="true" />
      text = 'Vence hoje'
    } else {
      text = `A pagar · vence ${shortDate(entry.payment.due)}`
    }
  }
  return (
    <span className={`payment-badge payment-badge--${kind}`}>
      {icon}
      {text}
    </span>
  )
}

type ToastState = {
  message: string
  action?: { label: string; onClick: () => void }
  tone?: 'success' | 'error' | 'info'
}

const tabLabels: [string, string][] = [
  ['lancamentos', 'Lançamentos'],
  ['notas', 'Notas'],
  ['confirmar', 'A confirmar'],
  ['pagar', 'A pagar'],
  ['projecao', 'Projeção'],
  ['categorias', 'Categorias'],
]

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

export default function CostsPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const tab = params.get('aba') || 'lancamentos'
  const demoState = params.get('estado') as 'loading' | 'error' | 'empty' | null
  const { base, id, found } = useActiveProperty()
  const [entries, setEntries] = useState(initialEntries)
  const [receipts, setReceipts] = useState(initialReceipts)
  const [pending, setPending] = useState(initialPending)
  const [categories, setCategories] = useState(initialCategories)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [payingId, setPayingId] = useState<string | null>(null)
  const [reversingId, setReversingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const predictedOpen = params.get('novo') === 'previsto'

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next)
  }

  function changeTab(next: string) {
    const nextParams = new URLSearchParams()
    if (next !== 'lancamentos') nextParams.set('aba', next)
    setParams(nextParams)
  }

  function notify(message: string, action?: ToastState['action']) {
    setToast({ message, action })
  }

  function updateEntry(entryId: string, patch: Partial<Entry>) {
    setEntries((rows) => rows.map((row) => (row.id === entryId ? { ...row, ...patch } : row)))
  }

  function savePredicted(draft: PredictedDraft) {
    const item: PendingItem = {
      id: `p-${Date.now()}`,
      title: draft.title,
      shortName: draft.title.toLowerCase(),
      destination: draft.destination,
      date: draft.date,
      value: draft.value,
      category: draft.category,
      supplier: draft.supplier,
      recurrence: draft.recurrence,
      status: 'ativo',
    }
    setPending((rows) => [...rows, item])
    setParam('novo', null)
    notify(`Previsto lançado para ${draft.date}. Ele aparece em A confirmar e na projeção.`)
  }

  const activePending = pending.filter((item) => item.status === 'ativo')
  const payables = entries.filter(isActivePayable)
  const counts: Record<string, number> = {
    confirmar: activePending.length,
    pagar: payables.length,
  }
  const paying = entries.find((entry) => entry.id === payingId) ?? null
  const reversing = entries.find((entry) => entry.id === reversingId) ?? null
  const editing = entries.find((entry) => entry.id === editingId) ?? null

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

  let content: ReactNode
  if (id !== 'baixada' || demoState === 'empty') {
    content = (
      <StateView
        type="empty"
        title="Ainda não há custos nesta propriedade"
        text="Registre a primeira compra para acompanhar o custo de cada lote."
        actionLabel="Registrar compra"
        onAction={() => navigate(`${base}/custos/nova-compra`)}
      />
    )
  } else if (demoState === 'loading') {
    content = <StateView type="loading" title="Buscando os custos..." />
  } else if (demoState === 'error') {
    content = <StateView type="error" onAction={() => setParam('estado', null)} />
  } else {
    content = (
      <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        {tab === 'lancamentos' && <EntriesTab entries={entries} />}
        {tab === 'notas' && (
          <ReceiptsTab
            receipts={receipts}
            entries={entries}
            onUpdate={(receiptId, patch) =>
              setReceipts((rows) =>
                rows.map((row) => (row.id === receiptId ? { ...row, ...patch } : row)),
              )
            }
            onDelete={(receiptId) => {
              setReceipts((rows) => rows.filter((row) => row.id !== receiptId))
              setParam('nota', null)
              notify('Nota excluída.')
            }}
            onToast={notify}
          />
        )}
        {tab === 'confirmar' && (
          <ConfirmTab
            items={pending}
            setItems={setPending}
            onConfirmed={(entry) => setEntries((rows) => [entry, ...rows])}
            onToast={notify}
            onPredict={() => setParam('novo', 'previsto')}
          />
        )}
        {tab === 'pagar' && <PayablesTab entries={entries} onPay={setPayingId} />}
        {tab === 'projecao' && <ProjectionTab entries={entries} pending={pending} />}
        {tab === 'categorias' && (
          <CategoriesTab categories={categories} setCategories={setCategories} onToast={notify} />
        )}
      </motion.div>
    )
  }

  return (
    <AppShell>
      <div className="costs-page">
        <header className="section-heading costs-heading">
          <div>
            <span className="eyebrow">DINHEIRO BEM CUIDADO</span>
            <h1>Custos</h1>
            <p>Registre gastos, organize notas e antecipe os próximos meses.</p>
          </div>
          <div className="heading-actions">
            {(tab === 'lancamentos' || tab === 'confirmar' || tab === 'projecao') && (
              <Button
                variant="secondary"
                icon={<CalendarClock aria-hidden="true" />}
                onClick={() => setParam('novo', 'previsto')}
              >
                Lançar previsto
              </Button>
            )}
            <Button
              icon={<Camera aria-hidden="true" />}
              onClick={() => navigate(`${base}/custos/nova-compra`)}
            >
              Registrar compra
            </Button>
          </div>
        </header>
        <nav className="cost-tabs" aria-label="Áreas de custos" role="tablist">
          {tabLabels.map(([key, label]) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              className={tab === key ? 'active' : ''}
              onClick={() => changeTab(key)}
            >
              {label}
              {counts[key] ? <b>{counts[key]}</b> : null}
            </button>
          ))}
        </nav>
        {content}
      </div>

      <EntryDetail
        entry={entries.find((entry) => entry.id === params.get('lancamento')) ?? null}
        onClose={() => setParam('lancamento', null)}
        onReverse={(entryId) => {
          setParam('lancamento', null)
          setReversingId(entryId)
        }}
        onPay={(entryId) => {
          setParam('lancamento', null)
          setPayingId(entryId)
        }}
        onEdit={(entryId) => {
          setParam('lancamento', null)
          setEditingId(entryId)
        }}
      />

      {paying && (
        <PayModal
          entry={paying}
          onClose={() => setPayingId(null)}
          onConfirm={(paidOn) => {
            const previous = paying.payment
            updateEntry(paying.id, { payment: { status: 'paid', paidOn } })
            setPayingId(null)
            notify(`Pagamento registrado em ${paidOn}. O custo do lote não muda.`, {
              label: 'Desfazer',
              onClick: () => updateEntry(paying.id, { payment: previous }),
            })
          }}
        />
      )}

      <Modal
        open={Boolean(reversing)}
        onClose={() => setReversingId(null)}
        title="Estornar este lançamento?"
      >
        {reversing && (
          <>
            <p className="modal-copy">
              O valor sai do custo do {reversing.destination} e as margens são recalculadas.
            </p>
            <p className="support-copy">
              {reversing.description} · {money(reversing.value)}. O lançamento continua no
              histórico, marcado como estornado.
            </p>
            <div className="modal__actions">
              <Button variant="ghost" onClick={() => setReversingId(null)}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                icon={<Undo2 aria-hidden="true" />}
                onClick={() => {
                  const target = reversing
                  updateEntry(target.id, { reversedOn: TODAY })
                  setReversingId(null)
                  setParam('lancamento', null)
                  notify(`Lançamento estornado. O custo do ${target.destination} foi recalculado.`, {
                    label: 'Desfazer',
                    onClick: () => updateEntry(target.id, { reversedOn: undefined }),
                  })
                }}
              >
                Estornar
              </Button>
            </div>
          </>
        )}
      </Modal>

      {editing && (
        <EditEntryModal
          entry={editing}
          categories={categories.filter((category) => category.active).map((c) => c.name)}
          onClose={() => setEditingId(null)}
          onSave={(patch) => {
            updateEntry(editing.id, patch)
            setEditingId(null)
            notify('Lançamento atualizado. Os totais do lote foram recalculados.')
          }}
        />
      )}

      {predictedOpen && (
        <PredictedCostModal
          open
          onClose={() => setParam('novo', null)}
          onSaved={savePredicted}
        />
      )}
      <Toast
        message={toast?.message ?? null}
        action={toast?.action}
        tone={toast?.tone}
        onClose={() => setToast(null)}
      />
    </AppShell>
  )
}

// ---------------------------------------------------------------------------
// Lançamentos
// ---------------------------------------------------------------------------

function EntriesTab({ entries }: { entries: Entry[] }) {
  const [params, setParams] = useSearchParams()
  const query = params.get('busca') || ''
  const period = params.get('periodo') || ''
  const payment = params.get('pagamento') || ''
  const due7 = params.get('vence7') === '1'
  const supplier = params.get('fornecedor') || ''
  const category = params.get('categoria') || ''
  const destination = params.get('lote') || ''
  const showReversed = params.get('estornados') === '1'
  const order = params.get('ordem') || 'recentes'

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: key === 'busca' })
  }

  function clearFilters() {
    const next = new URLSearchParams()
    setParams(next)
  }

  const rows = useMemo(() => {
    const filtered = entries.filter((entry) => {
      if (entry.reversedOn && !showReversed) return false
      if (query && !Object.values(entry).join(' ').toLowerCase().includes(query.toLowerCase()))
        return false
      if (period === '30' && daysBetween(entry.date) > 30) return false
      if (period === 'ano' && !entry.date.endsWith('/2026')) return false
      if (payment === 'pago' && entry.payment.status !== 'paid') return false
      if (payment === 'a-pagar' && entry.payment.status !== 'payable') return false
      if (payment === 'vencido' && !isOverdue(entry)) return false
      if (due7 && !(isActivePayable(entry) && daysUntilDue(entry) <= DUE_ALERT_DAYS)) return false
      if (supplier && entry.supplier !== supplier) return false
      if (category && entry.category !== category) return false
      if (destination && entry.destination !== destination) return false
      return true
    })
    return filtered.sort((a, b) =>
      order === 'valor'
        ? b.value - a.value
        : parseBrDate(b.date).getTime() - parseBrDate(a.date).getTime(),
    )
  }, [entries, query, period, payment, due7, supplier, category, destination, showReversed, order])

  const counted = rows.filter((entry) => !entry.reversedOn)
  const total = counted.reduce((sum, entry) => sum + entry.value, 0)
  const paid = counted.filter((entry) => entry.payment.status === 'paid')
  const open = counted.filter((entry) => entry.payment.status === 'payable')
  const sum = (list: Entry[]) => list.reduce((acc, entry) => acc + entry.value, 0)
  const unique = (key: 'supplier' | 'category' | 'destination') =>
    Array.from(new Set(entries.map((entry) => entry[key]))).sort()
  const hasFilters = Boolean(
    query || period || payment || due7 || supplier || category || destination || showReversed,
  )

  return (
    <>
      <section className="cost-summary">
        <div>
          <span>Total no filtro</span>
          <strong>
            <i>R$</i> {decimal(total)}
          </strong>
          <small>Pago ou a pagar, tudo já está no custo</small>
        </div>
        <div>
          <span>Pago</span>
          <strong>
            <i>R$</i> {decimal(sum(paid))}
          </strong>
          <small>{plural(paid.length, 'lançamento', 'lançamentos')}</small>
        </div>
        <div>
          <span>A pagar</span>
          <strong>
            <i>R$</i> {decimal(sum(open))}
          </strong>
          <small>{plural(open.length, 'conta em aberto', 'contas em aberto')}</small>
        </div>
      </section>
      <section className="cost-toolbar">
        <label className="search-box">
          <span className="sr-only">Buscar lançamentos</span>
          <Search aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setParam('busca', event.target.value)}
            placeholder="Buscar descrição, fornecedor ou destino"
          />
          {query && (
            <button onClick={() => setParam('busca', null)} aria-label="Limpar busca">
              <X aria-hidden="true" />
            </button>
          )}
        </label>
        <label className="cost-order">
          Ordenar
          <select
            value={order}
            onChange={(event) =>
              setParam('ordem', event.target.value === 'recentes' ? null : event.target.value)
            }
          >
            <option value="recentes">Mais recentes</option>
            <option value="valor">Maior valor</option>
          </select>
        </label>
        <div className="cost-filter-row costs-filters">
          <FilterSelect
            label="Período"
            value={period}
            onChange={(value) => setParam('periodo', value)}
            options={[
              ['30', 'Últimos 30 dias'],
              ['ano', 'Este ano'],
            ]}
          />
          <FilterSelect
            label="Pagamento"
            value={payment}
            onChange={(value) => setParam('pagamento', value)}
            options={[
              ['pago', 'Pago'],
              ['a-pagar', 'A pagar'],
              ['vencido', 'Vencido'],
            ]}
          />
          <button
            type="button"
            aria-pressed={due7}
            className={due7 ? 'active' : ''}
            onClick={() => setParam('vence7', due7 ? null : '1')}
          >
            <CalendarClock aria-hidden="true" />
            Vence em até 7 dias
          </button>
          <FilterSelect
            label="Fornecedor"
            value={supplier}
            onChange={(value) => setParam('fornecedor', value)}
            options={unique('supplier').map((name) => [name, name])}
          />
          <FilterSelect
            label="Categoria"
            value={category}
            onChange={(value) => setParam('categoria', value)}
            options={unique('category').map((name) => [name, name])}
          />
          <FilterSelect
            label="Destino"
            value={destination}
            onChange={(value) => setParam('lote', value)}
            options={unique('destination').map((name) => [name, name])}
          />
        </div>
        <label className="inactive-filter">
          <input
            type="checkbox"
            checked={showReversed}
            onChange={(event) => setParam('estornados', event.target.checked ? '1' : null)}
          />
          Mostrar estornados
        </label>
        {hasFilters && (
          <button type="button" className="text-link" onClick={clearFilters}>
            Limpar filtros
          </button>
        )}
      </section>
      {rows.length ? (
        <div className="entry-list">
          {rows.map((entry) => (
            <button
              className={`entry-row entry-row--payment ${entry.reversedOn ? 'is-reversed' : ''}`}
              key={entry.id}
              onClick={() => setParam('lancamento', entry.id)}
            >
              <time>{shortDate(entry.date)}</time>
              <span className="entry-icon">
                {isLocked(entry) ? (
                  <Lock aria-hidden="true" />
                ) : (
                  <CircleDollarSign aria-hidden="true" />
                )}
              </span>
              <span className="entry-main">
                <strong>{entry.description}</strong>
                <small>
                  {entry.supplier} · por {entry.author}
                  {isLocked(entry) ? ' · somente leitura' : ''}
                </small>
              </span>
              <span className="category-chip">{entry.category}</span>
              <span className="entry-destination">{entry.destination}</span>
              <PaymentBadge entry={entry} />
              <b>{money(entry.value)}</b>
              <ChevronRight aria-hidden="true" />
            </button>
          ))}
        </div>
      ) : (
        <StateView
          type="empty"
          title="Nenhum lançamento com estes filtros"
          text="Mude ou limpe os filtros para ver os lançamentos."
          actionLabel="Limpar filtros"
          onAction={clearFilters}
        />
      )}
    </>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string | null) => void
  options: (readonly [string, string])[]
}) {
  return (
    <label className={`filter-chip ${value ? 'active' : ''}`}>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value || null)}>
        <option value="">Todos</option>
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  )
}

function EntryDetail({
  entry,
  onClose,
  onReverse,
  onPay,
  onEdit,
}: {
  entry: Entry | null
  onClose: () => void
  onReverse: (id: string) => void
  onPay: (id: string) => void
  onEdit: (id: string) => void
}) {
  const record = entry ? recordFor(entry.destination) : undefined
  const locked = Boolean(record?.locked)
  return (
    <Modal open={Boolean(entry)} onClose={onClose} title="Detalhe do lançamento">
      {entry && (
        <div className="entry-detail">
          <div className="entry-detail__value">
            <PaymentBadge entry={entry} />
            <strong>
              <i>R$</i> {decimal(entry.value)}
            </strong>
          </div>
          <div className="detail-kv">
            <span>
              Descrição<strong>{entry.description}</strong>
            </span>
            <span>
              Destino<strong>{entry.destination}</strong>
            </span>
            <span>
              Fornecedor<strong>{entry.supplier}</strong>
            </span>
            <span>
              Categoria<strong>{entry.category}</strong>
            </span>
            <span>
              Pagamento
              <strong>
                {entry.payment.status === 'paid'
                  ? `Pago em ${entry.payment.paidOn}`
                  : `A pagar · vence ${entry.payment.due}`}
              </strong>
            </span>
            <span>
              Recorrência<strong>{entry.recurrence ?? 'Não recorrente'}</strong>
            </span>
          </div>
          <p className="authorship">
            Lançado por {entry.author} em {entry.date}.
            {entry.reversedOn ? ` Estornado em ${entry.reversedOn}.` : ''}
          </p>
          {locked && record ? (
            <SoldLockBanner
              item="Lote"
              recordSlug={record.slug}
              target={`${entry.description} (${entry.date})`}
              before={money(entry.value)}
            />
          ) : entry.reversedOn ? (
            <p className="support-copy">
              Este lançamento foi estornado e não conta mais no custo do {entry.destination}.
            </p>
          ) : (
            <div className="modal__actions">
              <Button
                variant="ghost"
                icon={<Undo2 aria-hidden="true" />}
                onClick={() => onReverse(entry.id)}
              >
                Estornar
              </Button>
              {entry.payment.status === 'payable' && (
                <Button
                  variant="secondary"
                  icon={<Check aria-hidden="true" />}
                  onClick={() => onPay(entry.id)}
                >
                  Marcar como pago
                </Button>
              )}
              <Button icon={<Edit3 aria-hidden="true" />} onClick={() => onEdit(entry.id)}>
                Editar
              </Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

function PayModal({
  entry,
  onClose,
  onConfirm,
}: {
  entry: Entry
  onClose: () => void
  onConfirm: (paidOn: string) => void
}) {
  const [date, setDate] = useState(TODAY_ISO)
  const [error, setError] = useState('')
  return (
    <Modal open onClose={onClose} title="Marcar como pago">
      <form
        className="form-stack"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          if (!date) return setError('Informe a data do pagamento')
          if (date > TODAY_ISO) return setError('A data do pagamento não pode ser futura')
          onConfirm(isoToBr(date))
        }}
      >
        <p className="modal-copy">
          {entry.description} · {entry.supplier} · {money(entry.value)}. Já está no custo do{' '}
          {entry.destination}; marcar como pago não muda o custo.
        </p>
        <Field
          label="Data do pagamento"
          type="date"
          max={TODAY_ISO}
          value={date}
          error={error}
          onChange={(event) => {
            setDate(event.target.value)
            setError('')
          }}
        />
        <div className="modal__actions">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" icon={<Check aria-hidden="true" />}>
            Marcar como pago
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function EditEntryModal({
  entry,
  categories,
  onClose,
  onSave,
}: {
  entry: Entry
  categories: string[]
  onClose: () => void
  onSave: (patch: Partial<Entry>) => void
}) {
  const [description, setDescription] = useState(entry.description)
  const [value, setValue] = useState(decimal(entry.value))
  const [category, setCategory] = useState(entry.category)
  const [errors, setErrors] = useState<{ description?: string; value?: string }>({})
  return (
    <Modal open onClose={onClose} title="Editar lançamento">
      <form
        className="form-stack"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          const amount = parseMoney(value)
          const next = {
            description: description.trim() ? undefined : 'Informe a descrição',
            value: amount > 0 ? undefined : 'Informe o valor',
          }
          setErrors(next)
          if (next.description || next.value) return
          onSave({ description: description.trim(), value: amount, category })
        }}
      >
        <Field
          label="Descrição"
          value={description}
          error={errors.description}
          onChange={(event) => setDescription(event.target.value)}
        />
        <Field
          label="Valor"
          inputMode="decimal"
          autoComplete="off"
          value={value}
          error={errors.value}
          onChange={(event) => setValue(event.target.value)}
          suffix={<span className="field-suffix">R$</span>}
        />
        <label className="select-field">
          <span>Categoria</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            {Array.from(new Set([entry.category, ...categories])).map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
        <div className="modal__actions">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">Salvar alterações</Button>
        </div>
      </form>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Notas
// ---------------------------------------------------------------------------

function ReceiptsTab({
  receipts,
  entries,
  onUpdate,
  onDelete,
  onToast,
}: {
  receipts: Receipt[]
  entries: Entry[]
  onUpdate: (id: string, patch: Partial<Receipt>) => void
  onDelete: (id: string) => void
  onToast: (message: string) => void
}) {
  const [params, setParams] = useSearchParams()
  const situation = params.get('situacao') || ''
  const openId = params.get('nota')
  const activeEntries = (receiptId: string) =>
    entries.filter((entry) => entry.noteId === receiptId && !entry.reversedOn)

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next)
  }

  const visible = receipts.filter((receipt) => {
    const linked = activeEntries(receipt.id)
    if (situation === 'pago')
      return linked.length > 0 && linked.every((entry) => entry.payment.status === 'paid')
    if (situation === 'a-pagar') return linked.some((entry) => entry.payment.status === 'payable')
    return true
  })
  const open = receipts.find((receipt) => receipt.id === openId) ?? null

  return (
    <>
      <section className="gallery-toolbar">
        <div>
          <span className="eyebrow">ARQUIVO DIGITAL</span>
          <h2>Suas notas em um só lugar</h2>
          <p>Número, autoria e lançamentos vinculados.</p>
        </div>
        <FilterSelect
          label="Pagamento dos lançamentos"
          value={situation}
          onChange={(value) => setParam('situacao', value)}
          options={[
            ['pago', 'Pago'],
            ['a-pagar', 'A pagar'],
          ]}
        />
      </section>
      {visible.length ? (
        <div className="receipt-gallery">
          {visible.map((receipt) => {
            const linked = activeEntries(receipt.id).length
            return (
              <article className="receipt-card" key={receipt.id}>
                <button
                  className={`receipt-card__image tone-${receipt.tone}`}
                  onClick={() => setParam('nota', receipt.id)}
                  aria-label={`Abrir a nota de ${receipt.supplier} de ${receipt.date}`}
                >
                  <ReceiptMock compact />
                  <span>
                    <FileText aria-hidden="true" />{' '}
                    {plural(linked, 'lançamento ativo', 'lançamentos ativos')}
                  </span>
                </button>
                <div className="receipt-card__body">
                  <p>
                    <strong>{receipt.supplier}</strong>
                    <small>
                      {receipt.number ?? 'Sem número'} · {receipt.date}
                    </small>
                    <small>Por {receipt.author}</small>
                  </p>
                  <b>{money(receipt.total)}</b>
                  <button
                    className="icon-button"
                    aria-label={`Ações da nota de ${receipt.supplier}`}
                    onClick={() => setParam('nota', receipt.id)}
                  >
                    <MoreHorizontal aria-hidden="true" />
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <StateView
          type="empty"
          title="Nenhuma nota com este filtro"
          text="Mude o filtro de pagamento para ver outras notas."
          actionLabel="Ver todas"
          onAction={() => setParam('situacao', null)}
        />
      )}
      {open && (
        <ReceiptDetail
          key={open.id}
          receipt={open}
          linked={activeEntries(open.id)}
          onClose={() => setParam('nota', null)}
          onUpdate={(patch) => {
            onUpdate(open.id, patch)
            onToast('Dados da nota atualizados.')
          }}
          onDelete={() => onDelete(open.id)}
          onToast={onToast}
        />
      )}
    </>
  )
}

function ReceiptDetail({
  receipt,
  linked,
  onClose,
  onUpdate,
  onDelete,
  onToast,
}: {
  receipt: Receipt
  linked: Entry[]
  onClose: () => void
  onUpdate: (patch: Partial<Receipt>) => void
  onDelete: () => void
  onToast: (message: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [supplier, setSupplier] = useState(receipt.supplier)
  const [number, setNumber] = useState(receipt.number ?? '')
  if (confirmDelete) {
    return (
      <Modal open onClose={() => setConfirmDelete(false)} title="Excluir esta nota?">
        <p className="modal-copy">
          A nota de {receipt.supplier} de {receipt.date} não tem lançamentos ativos. A foto e os
          dados da nota serão removidos.
        </p>
        <div className="modal__actions">
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
            Voltar
          </Button>
          <Button variant="danger" onClick={onDelete}>
            Excluir nota
          </Button>
        </div>
      </Modal>
    )
  }
  return (
    <Modal open onClose={onClose} title="Nota da compra">
      <div className="receipt-detail">
        <ReceiptMock compact={false} />
        {editing ? (
          <form
            className="form-stack"
            onSubmit={(event: FormEvent) => {
              event.preventDefault()
              onUpdate({ supplier: supplier.trim() || receipt.supplier, number: number.trim() || null })
              setEditing(false)
            }}
          >
            <Field
              label="Fornecedor"
              value={supplier}
              onChange={(event) => setSupplier(event.target.value)}
            />
            <Field
              label="Número da nota (opcional)"
              value={number}
              onChange={(event) => setNumber(event.target.value)}
            />
            <div className="modal__actions">
              <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar dados</Button>
            </div>
          </form>
        ) : (
          <>
            <div className="detail-kv">
              <span>
                Fornecedor<strong>{receipt.supplier}</strong>
              </span>
              <span>
                Número da nota<strong>{receipt.number ?? 'Sem número'}</strong>
              </span>
              <span>
                Data<strong>{receipt.date}</strong>
              </span>
              <span>
                Autor<strong>{receipt.author}</strong>
              </span>
            </div>
            {linked.length > 0 && (
              <ul className="receipt-linked">
                {linked.map((entry) => (
                  <li key={entry.id}>
                    {entry.description} · {entry.destination} · {money(entry.value)}
                  </li>
                ))}
              </ul>
            )}
            {linked.length > 0 ? (
              <p className="support-copy">
                <Info aria-hidden="true" /> Esta nota tem{' '}
                {plural(linked.length, 'lançamento', 'lançamentos')}. Estorne os lançamentos antes
                de excluir a nota.
              </p>
            ) : (
              <p className="support-copy">Esta nota não tem lançamentos ativos.</p>
            )}
            <div className="modal__actions">
              <label className="button button--secondary">
                <RefreshCw aria-hidden="true" />
                Trocar foto
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="sr-only"
                  onChange={() => onToast('Foto da nota trocada.')}
                />
              </label>
              <Button
                variant="secondary"
                icon={<Edit3 aria-hidden="true" />}
                onClick={() => setEditing(true)}
              >
                Editar dados
              </Button>
              {linked.length === 0 && (
                <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                  Excluir nota
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// A confirmar (previstos)
// ---------------------------------------------------------------------------

type PendingDialog =
  | { kind: 'confirm' | 'skip' | 'end' | 'cancel' | 'edit' | 'future'; item: PendingItem }
  | null

function ConfirmTab({
  items,
  setItems,
  onConfirmed,
  onToast,
  onPredict,
}: {
  items: PendingItem[]
  setItems: (updater: (rows: PendingItem[]) => PendingItem[]) => void
  onConfirmed: (entry: Entry) => void
  onToast: (message: string, action?: ToastState['action']) => void
  onPredict: () => void
}) {
  const [params, setParams] = useSearchParams()
  const showHistory = params.get('historico') === '1'
  const [dialog, setDialog] = useState<PendingDialog>(null)

  function patch(id: string, change: Partial<PendingItem>) {
    setItems((rows) => rows.map((row) => (row.id === id ? { ...row, ...change } : row)))
  }

  function nextOccurrence(item: PendingItem): PendingItem {
    const date = addPeriod(item.date, item.recurrence ?? 'Mensal')
    return { ...item, id: `${item.id}-${brToIso(date)}`, date, status: 'ativo' }
  }

  function skip(item: PendingItem) {
    const next = nextOccurrence(item)
    setItems((rows) => [
      ...rows.map((row) => (row.id === item.id ? { ...row, status: 'pulado' as const } : row)),
      next,
    ])
    setDialog(null)
    onToast(`${item.title} de ${shortDate(item.date)} pulada. A próxima ficou prevista para ${next.date}.`, {
      label: 'Desfazer',
      onClick: () =>
        setItems((rows) =>
          rows
            .filter((row) => row.id !== next.id)
            .map((row) => (row.id === item.id ? { ...row, status: 'ativo' as const } : row)),
        ),
    })
  }

  const visible = items
    .filter((item) => showHistory || item.status === 'ativo')
    .sort((a, b) => parseBrDate(a.date).getTime() - parseBrDate(b.date).getTime())
  const hasActive = items.some((item) => item.status === 'ativo')

  return (
    <div className="confirm-layout">
      <aside className="confirm-notice">
        <CalendarClock aria-hidden="true" />
        <div>
          <strong>Previstos só entram no custo depois que você confirma.</strong>
          <p>Confira valor, data e pagamento. Pular uma ocorrência não encerra a recorrência.</p>
        </div>
      </aside>
      <div className="pending-list">
        <div className="list-toolbar">
          <label className="inactive-filter">
            <input
              type="checkbox"
              checked={showHistory}
              onChange={(event) => {
                const next = new URLSearchParams(params)
                if (event.target.checked) next.set('historico', '1')
                else next.delete('historico')
                setParams(next)
              }}
            />
            Mostrar pulados, cancelados e encerrados
          </label>
        </div>
        {!hasActive && (
          <StateView
            type="empty"
            title="Tudo confirmado por aqui."
            text="Os próximos previstos e recorrências aparecem aqui quando chegar a data."
            actionLabel="Lançar previsto"
            onAction={onPredict}
          />
        )}
        {visible.map((item) => (
          <article
            className={`pending-card ${item.status !== 'ativo' ? 'is-history' : ''}`}
            key={item.id}
          >
            <div className="pending-date">
              <PendingBadge item={item} />
              <strong>{shortDate(item.date)}</strong>
            </div>
            <div className="pending-main">
              <span className="category-chip">{item.category}</span>
              <h2>{item.title}</h2>
              <p>
                {item.destination}
                {item.supplier ? ` · ${item.supplier}` : ''} ·{' '}
                {item.recurrence
                  ? `Recorrente · ${item.recurrence.toLowerCase()}`
                  : 'Previsto avulso'}
              </p>
            </div>
            <strong className="pending-value">{money(item.value)}</strong>
            <div className="pending-actions">
              {item.status === 'ativo' && (
                <>
                  <Button
                    icon={<Check aria-hidden="true" />}
                    onClick={() => setDialog({ kind: 'confirm', item })}
                  >
                    Confirmar
                  </Button>
                  <Button
                    variant="secondary"
                    icon={<Edit3 aria-hidden="true" />}
                    onClick={() => setDialog({ kind: 'edit', item })}
                  >
                    Editar valor/data
                  </Button>
                  {item.recurrence ? (
                    <>
                      <button onClick={() => setDialog({ kind: 'skip', item })}>
                        <SkipForward aria-hidden="true" />
                        Pular desta vez
                      </button>
                      <button onClick={() => setDialog({ kind: 'future', item })}>
                        <Repeat aria-hidden="true" />
                        Alterar próximas ocorrências
                      </button>
                      <button onClick={() => setDialog({ kind: 'end', item })}>
                        <CalendarX aria-hidden="true" />
                        Encerrar recorrência
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setDialog({ kind: 'cancel', item })}>
                      <Ban aria-hidden="true" />
                      Cancelar previsto
                    </button>
                  )}
                </>
              )}
            </div>
          </article>
        ))}
      </div>

      {dialog?.kind === 'confirm' && (
        <ConfirmPendingModal
          item={dialog.item}
          onClose={() => setDialog(null)}
          onConfirm={(entry) => {
            const item = dialog.item
            const next = item.recurrence ? nextOccurrence(item) : null
            setItems((rows) => [...rows.filter((row) => row.id !== item.id), ...(next ? [next] : [])])
            onConfirmed(entry)
            setDialog(null)
            onToast(
              next
                ? `Confirmado. A próxima ${item.shortName} ficou prevista para ${next.date}.`
                : `Confirmado. O valor entrou no custo do ${item.destination}.`,
            )
          }}
        />
      )}

      <Modal
        open={dialog?.kind === 'skip'}
        onClose={() => setDialog(null)}
        title="Pular desta vez?"
      >
        {dialog?.kind === 'skip' && (
          <>
            <p className="modal-copy">
              Pular a {dialog.item.title} de {shortDate(dialog.item.date)}? Ela não entra no custo
              nem na projeção. A próxima continua prevista para{' '}
              {addPeriod(dialog.item.date, dialog.item.recurrence ?? 'Mensal')}.
            </p>
            <div className="modal__actions">
              <Button variant="ghost" onClick={() => setDialog(null)}>
                Voltar
              </Button>
              <Button icon={<SkipForward aria-hidden="true" />} onClick={() => skip(dialog.item)}>
                Pular desta vez
              </Button>
            </div>
          </>
        )}
      </Modal>

      <Modal
        open={dialog?.kind === 'end'}
        onClose={() => setDialog(null)}
        title="Encerrar recorrência?"
      >
        {dialog?.kind === 'end' && (
          <>
            <p className="modal-copy">
              Não serão criados novos previstos. O previsto de {shortDate(dialog.item.date)} também
              sai da lista.
            </p>
            <p className="support-copy">O que já foi confirmado continua no custo.</p>
            <div className="modal__actions">
              <Button variant="ghost" onClick={() => setDialog(null)}>
                Voltar
              </Button>
              <Button
                variant="danger"
                icon={<CalendarX aria-hidden="true" />}
                onClick={() => {
                  const item = dialog.item
                  patch(item.id, { status: 'encerrado', endedOn: TODAY })
                  setDialog(null)
                  onToast(`Recorrência encerrada em ${TODAY}.`, {
                    label: 'Desfazer',
                    onClick: () => patch(item.id, { status: 'ativo', endedOn: undefined }),
                  })
                }}
              >
                Encerrar recorrência
              </Button>
            </div>
          </>
        )}
      </Modal>

      <Modal
        open={dialog?.kind === 'cancel'}
        onClose={() => setDialog(null)}
        title="Cancelar previsto?"
      >
        {dialog?.kind === 'cancel' && (
          <>
            <p className="modal-copy">
              Cancelar o previsto {dialog.item.title} de {shortDate(dialog.item.date)}? Ele sai da
              lista e da projeção e não entra no custo.
            </p>
            <div className="modal__actions">
              <Button variant="ghost" onClick={() => setDialog(null)}>
                Voltar
              </Button>
              <Button
                variant="danger"
                icon={<Ban aria-hidden="true" />}
                onClick={() => {
                  const item = dialog.item
                  patch(item.id, { status: 'cancelado' })
                  setDialog(null)
                  onToast('Previsto cancelado.', {
                    label: 'Desfazer',
                    onClick: () => patch(item.id, { status: 'ativo' }),
                  })
                }}
              >
                Cancelar previsto
              </Button>
            </div>
          </>
        )}
      </Modal>

      {dialog?.kind === 'edit' && (
        <OccurrenceModal
          item={dialog.item}
          mode="edit"
          onClose={() => setDialog(null)}
          onSave={(change) => {
            patch(dialog.item.id, change)
            setDialog(null)
            onToast('Ocorrência atualizada. As próximas continuam como estavam.')
          }}
        />
      )}
      {dialog?.kind === 'future' && (
        <OccurrenceModal
          item={dialog.item}
          mode="future"
          onClose={() => setDialog(null)}
          onSave={(change) => {
            patch(dialog.item.id, change)
            setDialog(null)
            onToast('Próximas ocorrências alteradas. O que já foi confirmado não mudou.')
          }}
        />
      )}
    </div>
  )
}

function PendingBadge({ item }: { item: PendingItem }) {
  if (item.status === 'pulado')
    return (
      <span className="pending-badge pending-badge--skipped">
        <SkipForward aria-hidden="true" /> Pulado
      </span>
    )
  if (item.status === 'cancelado')
    return (
      <span className="pending-badge pending-badge--muted">
        <Ban aria-hidden="true" /> Cancelado
      </span>
    )
  if (item.status === 'encerrado')
    return (
      <span className="pending-badge pending-badge--muted">
        <CalendarX aria-hidden="true" /> Encerrada em {item.endedOn}
      </span>
    )
  return (
    <span className="pending-badge">
      <CalendarClock aria-hidden="true" /> Previsto
    </span>
  )
}

function ConfirmPendingModal({
  item,
  onClose,
  onConfirm,
}: {
  item: PendingItem
  onClose: () => void
  onConfirm: (entry: Entry) => void
}) {
  const defaultDate = parseBrDate(item.date) > parseBrDate(TODAY) ? TODAY : item.date
  const [value, setValue] = useState(decimal(item.value))
  const [date, setDate] = useState(brToIso(defaultDate))
  const [payment, setPayment] = useState<'paid' | 'payable'>('paid')
  const [due, setDue] = useState('')
  const [errors, setErrors] = useState<{ value?: string; date?: string; due?: string }>({})
  return (
    <Modal open onClose={onClose} title={`Confirmar ${item.title}`}>
      <form
        className="form-stack"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          const amount = parseMoney(value)
          const next = {
            value: amount > 0 ? undefined : 'Informe o valor efetivo',
            date: !date
              ? 'Informe a data efetiva'
              : date > TODAY_ISO
                ? 'A data efetiva não pode ser futura. Se ainda não aconteceu, deixe como previsto.'
                : undefined,
            due: payment === 'payable' && !due ? 'Informe o vencimento' : undefined,
          }
          setErrors(next)
          if (next.value || next.date || next.due) return
          onConfirm({
            id: `e-${Date.now()}`,
            date: isoToBr(date),
            description: item.title,
            supplier: item.supplier || '—',
            category: item.category,
            value: amount,
            destination: item.destination,
            payment:
              payment === 'paid'
                ? { status: 'paid', paidOn: isoToBr(date) }
                : { status: 'payable', due: isoToBr(due) },
            author: 'João Batista',
            noteId: null,
            recurrence: item.recurrence,
          })
        }}
      >
        <p className="modal-copy">
          Previsto para {item.date} · {item.destination}. Ao confirmar, o valor entra no custo.
        </p>
        <div className="form-grid">
          <Field
            label="Valor efetivo"
            inputMode="decimal"
            autoComplete="off"
            value={value}
            error={errors.value}
            onChange={(event) => setValue(event.target.value)}
            suffix={<span className="field-suffix">R$</span>}
          />
          <Field
            label="Data efetiva"
            type="date"
            max={TODAY_ISO}
            value={date}
            error={errors.date}
            onChange={(event) => setDate(event.target.value)}
          />
        </div>
        <PaymentChoice value={payment} onChange={setPayment} />
        {payment === 'payable' && (
          <Field
            label="Data de vencimento"
            type="date"
            value={due}
            error={errors.due}
            onChange={(event) => setDue(event.target.value)}
          />
        )}
        <label className="receipt-upload">
          <Camera aria-hidden="true" />
          <span>
            <strong>Anexar foto da nota agora</strong>
            <small>Opcional · JPG, PNG ou PDF</small>
          </span>
          <input type="file" accept="image/*,application/pdf" className="sr-only" />
        </label>
        <div className="modal__actions">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" icon={<Check aria-hidden="true" />}>
            Confirmar
          </Button>
        </div>
      </form>
    </Modal>
  )
}

/** Escolha Pago / A pagar (radiogroup). Exportada para Registrar compra. */
export function PaymentChoice({
  value,
  onChange,
  label = 'Situação de pagamento',
}: {
  value: 'paid' | 'payable'
  onChange: (value: 'paid' | 'payable') => void
  label?: string
}) {
  const options: ['paid' | 'payable', string, ReactNode][] = [
    ['paid', 'Pago', <Check aria-hidden="true" key="paid" />],
    ['payable', 'A pagar', <CalendarClock aria-hidden="true" key="payable" />],
  ]
  return (
    <fieldset className="payment-choice-group">
      <legend>{label}</legend>
      <div role="radiogroup" aria-label={label}>
        {options.map(([key, text, icon]) => (
          <label key={key} className={value === key ? 'active' : ''}>
            <input
              type="radio"
              name={`pagamento-${label}`}
              checked={value === key}
              onChange={() => onChange(key)}
            />
            {icon}
            {text}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function OccurrenceModal({
  item,
  mode,
  onClose,
  onSave,
}: {
  item: PendingItem
  mode: 'edit' | 'future'
  onClose: () => void
  onSave: (change: Partial<PendingItem>) => void
}) {
  const [value, setValue] = useState(decimal(item.value))
  const [date, setDate] = useState(brToIso(item.date))
  const [periodicity, setPeriodicity] = useState<Periodicity>(item.recurrence ?? 'Mensal')
  const [error, setError] = useState('')
  return (
    <Modal
      open
      onClose={onClose}
      title={mode === 'edit' ? 'Editar valor/data' : 'Alterar próximas ocorrências'}
    >
      <form
        className="form-stack"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          const amount = parseMoney(value)
          if (!(amount > 0)) return setError('Informe o valor')
          onSave(
            mode === 'edit'
              ? { value: amount, date: isoToBr(date) }
              : { value: amount, recurrence: periodicity },
          )
        }}
      >
        <p className="modal-copy">
          {mode === 'edit'
            ? `Muda só a ocorrência de ${item.date}. As próximas continuam como estão.`
            : 'Muda o valor e/ou a periodicidade daqui em diante. O que já foi confirmado não muda.'}
        </p>
        <Field
          label={mode === 'edit' ? 'Valor desta ocorrência' : 'Novo valor'}
          inputMode="decimal"
          autoComplete="off"
          value={value}
          error={error}
          onChange={(event) => {
            setValue(event.target.value)
            setError('')
          }}
          suffix={<span className="field-suffix">R$</span>}
        />
        {mode === 'edit' ? (
          <Field
            label="Data prevista"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        ) : (
          <label className="select-field">
            <span>Periodicidade</span>
            <select
              value={periodicity}
              onChange={(event) => setPeriodicity(event.target.value as Periodicity)}
            >
              {periodicities.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
        )}
        <div className="modal__actions">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">Salvar</Button>
        </div>
      </form>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// A pagar
// ---------------------------------------------------------------------------

function PayablesTab({ entries, onPay }: { entries: Entry[]; onPay: (id: string) => void }) {
  const rows = entries
    .filter(isActivePayable)
    .sort((a, b) => daysUntilDue(a) - daysUntilDue(b))
  const groups: [string, Entry[]][] = [
    ['Vencidos', rows.filter((entry) => daysUntilDue(entry) < 0)],
    [
      `Vencem em até ${DUE_ALERT_DAYS} dias`,
      rows.filter((entry) => daysUntilDue(entry) >= 0 && daysUntilDue(entry) <= DUE_ALERT_DAYS),
    ],
    ['Mais tarde', rows.filter((entry) => daysUntilDue(entry) > DUE_ALERT_DAYS)],
  ]
  const sum = (list: Entry[]) => list.reduce((acc, entry) => acc + entry.value, 0)

  if (!rows.length) {
    return (
      <StateView
        type="empty"
        title="Nenhuma conta a pagar"
        text="Quando uma compra for registrada como A pagar, ela aparece aqui pelo vencimento."
        actionLabel=""
      />
    )
  }

  return (
    <>
      <section className="cost-summary payable-summary">
        <div>
          <span>Total a pagar</span>
          <strong>
            <i>R$</i> {decimal(sum(rows))}
          </strong>
          <small>{plural(rows.length, 'conta em aberto', 'contas em aberto')}</small>
        </div>
        <div>
          <span>Vencido</span>
          <strong>
            <i>R$</i> {decimal(sum(groups[0][1]))}
          </strong>
          <small>{plural(groups[0][1].length, 'conta', 'contas')}</small>
        </div>
        <div>
          <span>Próximos {DUE_ALERT_DAYS} dias</span>
          <strong>
            <i>R$</i> {decimal(sum(groups[1][1]))}
          </strong>
          <small>{plural(groups[1][1].length, 'conta', 'contas')}</small>
        </div>
      </section>
      <p className="payable-note">
        <Info aria-hidden="true" /> Já está no custo do lote; aqui é só para não esquecer de pagar.
      </p>
      <div className="payable-groups">
        {groups.map(([title, list]) => (
          <section key={title} aria-label={title}>
            <h2>
              {title} <small>{plural(list.length, 'conta', 'contas')}</small>
            </h2>
            {list.length === 0 && <p className="payable-empty">Nenhuma conta neste grupo.</p>}
            {list.map((entry) => (
              <div key={entry.id}>
                <span>
                  <WalletCards aria-hidden="true" />
                </span>
                <p>
                  <strong>{entry.description}</strong>
                  <small>
                    {entry.supplier} · {entry.destination}
                  </small>
                  <PaymentBadge entry={entry} />
                </p>
                <b>{money(entry.value)}</b>
                <Button
                  variant="secondary"
                  icon={<Check aria-hidden="true" />}
                  onClick={() => onPay(entry.id)}
                >
                  Marcar como pago
                </Button>
              </div>
            ))}
          </section>
        ))}
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Projeção
// ---------------------------------------------------------------------------

const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function ProjectionTab({ entries, pending }: { entries: Entry[]; pending: PendingItem[] }) {
  const [params, setParams] = useSearchParams()
  const destinations = useActiveDestinations()
  const months = Number(params.get('meses') || '6')
  const lot = params.get('lote') || ''
  function update(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next)
  }

  const today = parseBrDate(TODAY)
  const startIndex = today.getFullYear() * 12 + today.getMonth()
  const monthIndex = (date: string) => {
    const parsed = parseBrDate(date)
    return Math.max(0, parsed.getFullYear() * 12 + parsed.getMonth() - startIndex)
  }
  const matchesLot = (destination: string) => !lot || destination === lot

  const columns = Array.from({ length: months }, (_, index) => ({
    label: monthNames[(today.getMonth() + index) % 12],
    year: today.getFullYear() + Math.floor((today.getMonth() + index) / 12),
    payable: 0,
    predicted: 0,
  }))
  const payables = entries.filter((entry) => isActivePayable(entry) && matchesLot(entry.destination))
  payables.forEach((entry) => {
    if (entry.payment.status !== 'payable') return
    const index = monthIndex(entry.payment.due)
    if (index < months) columns[index].payable += entry.value
  })
  const activePending = pending.filter(
    (item) => item.status === 'ativo' && matchesLot(item.destination),
  )
  activePending.forEach((item) => {
    let date = item.date
    let guard = 0
    while (monthIndex(date) < months && guard < 400) {
      columns[monthIndex(date)].predicted += item.value
      if (!item.recurrence) break
      date = addPeriod(date, item.recurrence)
      guard += 1
    }
  })
  const totals = columns.map((column) => column.payable + column.predicted)
  const total = totals.reduce((sum, value) => sum + value, 0)
  const max = Math.max(...totals, 1)
  const thousand = (value: number) => `R$ ${decimal(value / 1000, 1)} mil`

  const groups: [string, ReactNode, { title: string; detail: string; value: number }[]][] = [
    [
      'Recorrências ativas',
      <Repeat aria-hidden="true" key="r" />,
      activePending
        .filter((item) => item.recurrence)
        .map((item) => ({
          title: item.title,
          detail: `${item.recurrence} · próxima ${shortDate(item.date)} · ${item.destination}`,
          value: item.value,
        })),
    ],
    [
      'Previstos avulsos',
      <CalendarClock aria-hidden="true" key="a" />,
      activePending
        .filter((item) => !item.recurrence)
        .map((item) => ({
          title: item.title,
          detail: `Previsto avulso · ${shortDate(item.date)} · ${item.destination}`,
          value: item.value,
        })),
    ],
    [
      'Contas a pagar',
      <WalletCards aria-hidden="true" key="p" />,
      payables.map((entry) => ({
        title: entry.description,
        detail: `Vence ${entry.payment.status === 'payable' ? shortDate(entry.payment.due) : ''} · ${entry.destination}`,
        value: entry.value,
      })),
    ],
  ]

  return (
    <>
      <section className="projection-hero">
        <div>
          <span className="eyebrow">PROJEÇÃO · PRÓXIMOS {months} MESES</span>
          <h2>
            <i>R$</i> {decimal(total)}
          </h2>
          <p>Soma dos previstos e das contas a pagar, mês a mês.</p>
        </div>
        <div className="period-switch" role="group" aria-label="Período da projeção">
          {['3', '6', '12'].map((option) => (
            <button
              className={String(months) === option ? 'active' : ''}
              aria-pressed={String(months) === option}
              onClick={() => update('meses', option)}
              key={option}
            >
              {option} meses
            </button>
          ))}
        </div>
        <label className="filter-chip">
          <span className="sr-only">Lote</span>
          <select value={lot} onChange={(event) => update('lote', event.target.value)}>
            <option value="">Todos os lotes</option>
            {destinations.map((record) => (
              <option key={record.slug}>{record.name}</option>
            ))}
          </select>
        </label>
      </section>
      <aside className="projection-explanation">
        <Info aria-hidden="true" />
        <p>
          <strong>
            Esta previsão soma os gastos previstos e as contas a pagar. Previstos pulados ou
            cancelados não entram.
          </strong>
        </p>
      </aside>
      <section className="projection-panel">
        <div
          className={`projection-chart projection-chart--${months}`}
          style={{ gridTemplateColumns: `repeat(${months}, minmax(0, 1fr))` }}
        >
          {columns.map((column, index) => (
            <div className="projection-column" key={`${column.label}-${column.year}`}>
              <div
                className="projection-stack"
                style={{ height: `${Math.max((totals[index] / max) * 100, totals[index] ? 4 : 0)}%` }}
                aria-hidden="true"
              >
                {column.predicted > 0 && (
                  <i className="predicted-fill" style={{ flex: column.predicted }} />
                )}
                {column.payable > 0 && (
                  <i className="payable-fill" style={{ flex: column.payable }} />
                )}
              </div>
              <strong>{column.label}</strong>
              <small>{thousand(totals[index])}</small>
              <span className="sr-only">
                {column.label}/{column.year}: a pagar {money(column.payable)}; previsto{' '}
                {money(column.predicted)}.
              </span>
            </div>
          ))}
        </div>
        <div className="projection-legend">
          <span>
            <i className="payable-fill" aria-hidden="true" />
            Conta a pagar (preenchido)
          </span>
          <span>
            <i className="predicted-fill" aria-hidden="true" />
            Previsto (hachurado)
          </span>
        </div>
      </section>
      <div className="projection-groups">
        {groups.map(([title, icon, list]) => (
          <section className="recurring-list" key={title}>
            <div className="detail-panel__heading">
              <div>
                <span className="eyebrow">BASE DA PROJEÇÃO</span>
                <h2>{title}</h2>
              </div>
            </div>
            {list.length === 0 && <p className="payable-empty">Nada neste grupo.</p>}
            {list.map((row) => (
              <div key={row.title + row.detail}>
                <span>{icon}</span>
                <p>
                  <strong>{row.title}</strong>
                  <small>{row.detail}</small>
                </p>
                <b>{money(row.value)}</b>
              </div>
            ))}
          </section>
        ))}
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Categorias
// ---------------------------------------------------------------------------

function CategoriesTab({
  categories,
  setCategories,
  onToast,
}: {
  categories: Category[]
  setCategories: (updater: (rows: Category[]) => Category[]) => void
  onToast: (message: string, action?: ToastState['action']) => void
}) {
  const [params, setParams] = useSearchParams()
  const showInactive = params.get('inativas') === '1'
  const [modal, setModal] = useState<'add' | 'rename' | null>(null)
  const [pendingRemoval, setPendingRemoval] = useState<Category | null>(null)
  const [name, setName] = useState('')
  const [color, setColor] = useState('green')
  const [editingName, setEditingName] = useState('')
  const [error, setError] = useState('')

  function openModal(kind: 'add' | 'rename', category?: Category) {
    setName(category?.name ?? '')
    setColor(category?.color ?? 'green')
    setEditingName(category?.name ?? '')
    setError('')
    setModal(kind)
  }

  function save() {
    const trimmed = name.trim()
    if (!trimmed) return setError('Informe um nome')
    const duplicated = categories.some(
      (category) =>
        category.name !== editingName && category.name.toLowerCase() === trimmed.toLowerCase(),
    )
    if (duplicated) return setError('Já existe uma categoria com este nome')
    if (modal === 'rename') {
      setCategories((rows) =>
        rows.map((row) => (row.name === editingName ? { ...row, name: trimmed, color } : row)),
      )
      onToast('Categoria atualizada.')
    } else {
      setCategories((rows) => [
        ...rows,
        { name: trimmed, count: 0, color, active: true, suggested: false },
      ])
      onToast('Categoria criada.')
    }
    setModal(null)
  }

  function confirmRemoval(category: Category) {
    if (category.count) {
      setCategories((rows) =>
        rows.map((row) => (row.name === category.name ? { ...row, active: false } : row)),
      )
      onToast(`Categoria ${category.name} inativada.`, {
        label: 'Desfazer',
        onClick: () =>
          setCategories((rows) =>
            rows.map((row) => (row.name === category.name ? { ...row, active: true } : row)),
          ),
      })
    } else {
      setCategories((rows) => rows.filter((row) => row.name !== category.name))
      onToast(`Categoria ${category.name} excluída.`)
    }
    setPendingRemoval(null)
  }

  return (
    <>
      <section className="gallery-toolbar">
        <div>
          <span className="eyebrow">ORGANIZAÇÃO</span>
          <h2>Categorias de custo</h2>
          <p>Nome e cor de cada categoria, sem perder o histórico.</p>
        </div>
        <Button icon={<Plus aria-hidden="true" />} onClick={() => openModal('add')}>
          Nova categoria
        </Button>
      </section>
      <label className="inactive-filter">
        <input
          type="checkbox"
          checked={showInactive}
          onChange={(event) => {
            const next = new URLSearchParams(params)
            if (event.target.checked) next.set('inativas', '1')
            else next.delete('inativas')
            setParams(next)
          }}
        />
        Mostrar inativas
      </label>
      <div className="category-manager">
        {categories
          .filter((category) => category.active || showInactive)
          .map((category) => (
            <div className={!category.active ? 'is-inactive' : ''} key={category.name}>
              <span
                className={`category-color category-color--${category.color}`}
                aria-hidden="true"
              />
              <p>
                <strong>
                  {category.name}{' '}
                  {category.suggested && <em className="suggested-badge">Sugerida</em>}
                </strong>
                <small>
                  {plural(category.count, 'lançamento', 'lançamentos')} ·{' '}
                  {category.active ? 'Ativa' : 'Inativa'}
                </small>
              </p>
              <Button
                variant="ghost"
                icon={<Edit3 aria-hidden="true" />}
                onClick={() => openModal('rename', category)}
              >
                Editar
              </Button>
              {category.active ? (
                <Button
                  variant={category.count ? 'secondary' : 'danger'}
                  onClick={() => setPendingRemoval(category)}
                >
                  {category.count ? 'Inativar' : 'Excluir'}
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setCategories((rows) =>
                      rows.map((row) =>
                        row.name === category.name ? { ...row, active: true } : row,
                      ),
                    )
                    onToast('Categoria reativada.')
                  }}
                >
                  Reativar
                </Button>
              )}
            </div>
          ))}
      </div>
      <Modal
        open={Boolean(pendingRemoval)}
        onClose={() => setPendingRemoval(null)}
        title={
          pendingRemoval
            ? `${pendingRemoval.count ? 'Inativar' : 'Excluir'} ${pendingRemoval.name}?`
            : ''
        }
      >
        {pendingRemoval && (
          <>
            <p className="modal-copy">
              {pendingRemoval.count
                ? `Ela some das opções de novas compras; os ${pendingRemoval.count} lançamentos continuam com esta categoria.`
                : 'Esta categoria não tem lançamentos. Ela será removida da lista.'}
            </p>
            <div className="modal__actions">
              <Button variant="ghost" onClick={() => setPendingRemoval(null)}>
                Voltar
              </Button>
              <Button
                variant={pendingRemoval.count ? 'primary' : 'danger'}
                onClick={() => confirmRemoval(pendingRemoval)}
              >
                {pendingRemoval.count ? 'Inativar' : 'Excluir'}
              </Button>
            </div>
          </>
        )}
      </Modal>
      <Modal
        open={Boolean(modal)}
        onClose={() => setModal(null)}
        title={modal === 'rename' ? 'Editar categoria' : 'Nova categoria'}
      >
        <form
          className="form-stack"
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            save()
          }}
        >
          <Field
            label="Nome da categoria"
            value={name}
            error={error}
            onChange={(event) => {
              setName(event.target.value)
              setError('')
            }}
          />
          <fieldset className="color-picker">
            <legend>Cor</legend>
            <div>
              {categoryColors.map(([key, label]) => (
                <button
                  type="button"
                  className={`category-color category-color--${key} ${color === key ? 'active' : ''}`}
                  key={key}
                  aria-label={label}
                  aria-pressed={color === key}
                  onClick={() => setColor(key)}
                >
                  {color === key && <Check aria-hidden="true" />}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="modal__actions">
            <Button type="button" variant="ghost" onClick={() => setModal(null)}>
              Cancelar
            </Button>
            <Button type="submit">Salvar</Button>
          </div>
        </form>
      </Modal>
    </>
  )
}

// ---------------------------------------------------------------------------

export function ReceiptMock({ compact }: { compact: boolean }) {
  return (
    <div className={`receipt-mock ${compact ? 'receipt-mock--compact' : ''}`} aria-hidden="true">
      <div className="receipt-mock__logo">APN</div>
      <strong>AGROPECUÁRIA PONTE NOVA</strong>
      <small>CNPJ 18.043.221/0001-09</small>
      <i />
      <p>01 SAL MINERAL PROTEINADO</p>
      <p>02 SACOS 30KG</p>
      <i />
      <b>TOTAL R$ 2.184,70</b>
      <small>05/11/2026 09:42</small>
      <div className="receipt-bars">|||| ||| |||| || |||||</div>
    </div>
  )
}
