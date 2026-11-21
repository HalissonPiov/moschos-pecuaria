/*
 * Rebanho (Etapa 2.1).
 *
 * Parâmetros de URL (tudo abre direto por link):
 *   ?busca=        nome, brinco, raça ou pasto
 *   ?status=       Em produção | Pronto para venda | Parcialmente vendido | Vendido | Encerrado
 *   ?modo=         Lote | Individual
 *   ?pasto=        nome do pasto (casa com qualquer pasto onde o registro tenha animais)
 *   ?origem=       Nascimento | Aquisição
 *   ?periodo=      Últimos 30 dias | Este ano | Todo o período  (data de formação)
 *   ?inativos=1    mostra os inativos (ex.: Lote Teste 21)
 *   ?ordem=        recentes | nome | custo
 *   ?visual=lista  lista em vez de cartões
 *   ?pastos=1      abre a folha de pastos (veja PastureSheet.tsx para os estados dela)
 * Estados de demonstração:
 *   ?estado=loading | error | empty
 */
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import {
  BarChart3,
  Beef,
  ChevronDown,
  CircleDollarSign,
  CircleDot,
  LayoutGrid,
  List,
  MapPin,
  Plus,
  Power,
  ReceiptText,
  Search,
  Tags,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react'
import { motion } from 'motion/react'
import {
  TODAY,
  daysBetween,
  decimal,
  money,
  recordsForProperty,
  type LivestockRecord,
  type RecordStatus,
} from '@/shared/demo/data'
import { pastures, safraAnimals } from '@/shared/demo/livestock'
import { propertyNotFoundCopy, useActiveProperty } from '@/shared/routing/navigation'
import { StatusBadge } from '@/shared/ui/BusinessRules'
import AppShell from '@/shared/layout/AppShell'
import PastureSheet from '@/features/herd/components/PastureSheet'
import { Button, StateView, Toast } from '@/shared/ui/UI'

const filters = {
  status: [
    'Em produção',
    'Pronto para venda',
    'Parcialmente vendido',
    'Vendido',
    'Encerrado',
  ] as RecordStatus[],
  mode: ['Lote', 'Individual'],
  pasture: pastures.map((pasture) => pasture.name),
  origin: ['Nascimento', 'Aquisição'],
  period: ['Últimos 30 dias', 'Este ano', 'Todo o período'],
}

/** Pastos onde o registro tem animais em estoque. */
function recordPastures(record: LivestockRecord) {
  if (record.slug === 'lote-safra-24') {
    return Array.from(
      new Set(safraAnimals.filter((a) => a.situation === 'Em estoque').map((a) => a.pasture)),
    )
  }
  return record.balance > 0 && record.pasture !== '—' ? [record.pasture] : []
}

/** Texto pesquisável: nome, raça, pastos, brincos e nomes dos animais, características. */
function searchText(record: LivestockRecord) {
  const animals =
    record.slug === 'lote-safra-24'
      ? safraAnimals.map((animal) => `${animal.name} ${animal.tag}`).join(' ')
      : ''
  const attributes = record.attributes.map((a) => `${a.name} ${a.value}`).join(' ')
  return `${record.name} ${record.breed} ${record.pasture} ${recordPastures(record).join(' ')} ${animals} ${attributes}`.toLowerCase()
}

function inPeriod(record: LivestockRecord, period: string) {
  if (!period || period === 'Todo o período') return true
  if (period === 'Últimos 30 dias') return daysBetween(record.formationDate) <= 30
  return record.formationDate.slice(-4) === TODAY.slice(-4)
}

const sortKey = (date: string) => date.split('/').reverse().join('')

export default function HerdPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { id: propertyId, base, found } = useActiveProperty()
  const [toast, setToast] = useState<string | null>(null)
  const view = params.get('visual') === 'lista' ? 'list' : 'cards'
  const query = params.get('busca') || ''
  const status = params.get('status') || ''
  const mode = params.get('modo') || ''
  const pasture = params.get('pasto') || ''
  const origin = params.get('origem') || ''
  const period = params.get('periodo') || ''
  const order = params.get('ordem') || 'recentes'
  const showInactive = params.get('inativos') === '1'
  const forcedState = params.get('estado')
  const pasturesOpen = params.get('pastos') === '1'
  const pastureState = params.get('estadoPastos') as 'empty' | 'loading' | 'error' | null

  function update(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: key === 'busca' })
  }
  function clearFilters() {
    const next = new URLSearchParams()
    if (view === 'list') next.set('visual', 'lista')
    if (params.get('ordem')) next.set('ordem', order)
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

  const allRecords = recordsForProperty(propertyId, { includeInactive: true })
  const activeRecords = allRecords.filter((record) => !record.inactive)
  const filtered = allRecords
    .filter(
      (item) =>
        (showInactive || !item.inactive) &&
        searchText(item).includes(query.trim().toLowerCase()) &&
        (!status || item.status === status) &&
        (!mode || item.kind === mode) &&
        (!pasture || recordPastures(item).includes(pasture)) &&
        (!origin || item.origin === origin) &&
        inPeriod(item, period),
    )
    .sort((a, b) =>
      order === 'nome'
        ? a.name.localeCompare(b.name, 'pt-BR')
        : order === 'custo'
          ? b.accumulatedCost - a.accumulatedCost
          : sortKey(b.formationDate).localeCompare(sortKey(a.formationDate)),
    )

  const activeCount = [query, status, mode, pasture, origin, period, showInactive].filter(Boolean).length
  const isEmpty = forcedState === 'empty' || (activeRecords.length === 0 && !showInactive)

  return (
    <AppShell>
      <div className="herd-page">
        <header className="section-heading">
          <div>
            <span className="eyebrow">SEU GADO</span>
            <h1>Rebanho</h1>
            <p>Lotes e animais da propriedade ativa, sem misturar fazendas.</p>
          </div>
          <div className="herd-heading-actions">
            <Button variant="secondary" icon={<MapPin />} onClick={() => update('pastos', '1')}>
              Pastos
            </Button>
            <Button icon={<Plus />} onClick={() => navigate(`${base}/rebanho/novo`)}>
              Novo animal ou lote
            </Button>
          </div>
        </header>

        {forcedState === 'loading' || forcedState === 'error' ? (
          <StateView type={forcedState} onAction={() => update('estado', '')} />
        ) : isEmpty ? (
          <div className="no-results herd-empty">
            <Beef aria-hidden="true" />
            <h2>Cadastre seu primeiro lote ou animal</h2>
            <p>
              Ao criar um lote, cada cabeça também vira um animal que você pode completar depois.
            </p>
            <Button onClick={() => navigate(`${base}/rebanho/novo`)}>Cadastrar no rebanho</Button>
          </div>
        ) : (
          <>
            <section className="herd-tools" aria-label="Busca e filtros">
              <label className="search-box">
                <span className="sr-only">Buscar no rebanho</span>
                <Search aria-hidden="true" />
                <input
                  value={query}
                  onChange={(event) => update('busca', event.target.value)}
                  placeholder="Buscar por nome, brinco, raça ou pasto"
                />
                {query && (
                  <button type="button" onClick={() => update('busca', '')} aria-label="Limpar busca">
                    <X aria-hidden="true" />
                  </button>
                )}
              </label>
              <div className="filter-chips">
                <FilterSelect label="Status" value={status} options={filters.status} onChange={(v) => update('status', v)} />
                <FilterSelect label="Modo" value={mode} options={filters.mode} onChange={(v) => update('modo', v)} />
                <FilterSelect label="Pasto" value={pasture} options={filters.pasture} onChange={(v) => update('pasto', v)} />
                <FilterSelect label="Origem" value={origin} options={filters.origin} onChange={(v) => update('origem', v)} />
                <FilterSelect label="Formação" value={period} options={filters.period} onChange={(v) => update('periodo', v)} />
                <label className={`filter-chip ${showInactive ? 'active' : ''}`}>
                  <input
                    className="chip-checkbox"
                    type="checkbox"
                    checked={showInactive}
                    onChange={(event) => update('inativos', event.target.checked ? '1' : '')}
                  />
                  Mostrar inativos
                </label>
                {activeCount > 0 && (
                  <button type="button" className="clear-filters" onClick={clearFilters}>
                    Limpar filtros
                  </button>
                )}
              </div>
              <div className="view-toggle" role="group" aria-label="Forma de exibir">
                <button
                  type="button"
                  className={view === 'cards' ? 'active' : ''}
                  aria-pressed={view === 'cards'}
                  onClick={() => update('visual', '')}
                  aria-label="Ver cartões"
                >
                  <LayoutGrid aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={view === 'list' ? 'active' : ''}
                  aria-pressed={view === 'list'}
                  onClick={() => update('visual', 'lista')}
                  aria-label="Ver lista"
                >
                  <List aria-hidden="true" />
                </button>
              </div>
            </section>
            <div className="results-line">
              <span aria-live="polite">
                <strong>{filtered.length}</strong>{' '}
                {filtered.length === 1 ? 'resultado' : 'resultados'}
              </span>
              <label>
                Ordenar por{' '}
                <select value={order} onChange={(event) => update('ordem', event.target.value)}>
                  <option value="recentes">Formação mais recente</option>
                  <option value="nome">Nome</option>
                  <option value="custo">Maior custo acumulado</option>
                </select>
              </label>
            </div>
            {filtered.length === 0 ? (
              <div className="no-results">
                <Search aria-hidden="true" />
                <h2>Nenhum resultado para o filtro</h2>
                <p>Tente remover algum filtro ou buscar por outro nome.</p>
                <Button variant="secondary" onClick={clearFilters}>
                  Limpar filtros
                </Button>
              </div>
            ) : (
              <motion.div
                className={`herd-items herd-items--${view}`}
                initial="hidden"
                animate="show"
                variants={{ show: { transition: { staggerChildren: 0.05 } } }}
              >
                {filtered.map((item) => (
                  <HerdCard
                    key={item.slug}
                    item={item}
                    onOpen={() => navigate(`${base}/rebanho/${item.slug}?aba=geral`)}
                    onPanel={() => navigate(`${base}/rebanho/${item.slug}?aba=painel`)}
                    onCosts={() => navigate(`${base}/rebanho/${item.slug}?aba=custos`)}
                    onSales={() => navigate(`${base}/rebanho/${item.slug}?aba=vendas`)}
                    onSell={() => navigate(`${base}/vendas?acao=registrar&lote=${item.slug}`)}
                    onReactivate={() => setToast(`${item.name} reativado.`)}
                  />
                ))}
              </motion.div>
            )}
          </>
        )}
      </div>
      <PastureSheet
        open={pasturesOpen}
        onClose={() => {
          const next = new URLSearchParams(params)
          ;['pastos', 'estadoPastos', 'pastosInativos'].forEach((key) => next.delete(key))
          setParams(next)
        }}
        state={pastureState}
        showInactive={params.get('pastosInativos') === '1'}
        onShowInactive={(value) => update('pastosInativos', value ? '1' : '')}
        onRetry={() => update('estadoPastos', '')}
      />
      <Toast message={toast} onClose={() => setToast(null)} />
    </AppShell>
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
  options: readonly string[]
  onChange: (value: string) => void
}) {
  return (
    <label className={`filter-chip ${value ? 'active' : ''}`}>
      <span>{value || label}</span>
      <ChevronDown aria-hidden="true" />
      <select
        aria-label={`Filtrar por ${label.toLowerCase()}`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{label}: todos</option>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  )
}

function HerdCard({
  item,
  onOpen,
  onPanel,
  onCosts,
  onSales,
  onSell,
  onReactivate,
}: {
  item: LivestockRecord
  onOpen: () => void
  onPanel: () => void
  onCosts: () => void
  onSales: () => void
  onSell: () => void
  onReactivate: () => void
}) {
  const difference = item.quoteDifference
  const tone = difference === null ? null : difference < 0 ? 'loss' : difference > 0 ? 'gain' : 'even'
  const pastureList = recordPastures(item)
  return (
    <motion.article
      className={`herd-card ${item.inactive ? 'rb-inactive-card' : ''}`}
      variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
    >
      <button type="button" className="herd-card__main" onClick={onOpen}>
        <div className="herd-card__top">
          <span className="kind-badge">
            <Tags aria-hidden="true" />
            {item.kind}
          </span>
          <StatusBadge status={item.status} />
          {item.inactive && (
            <span className="rb-inactive-tag">
              <Power aria-hidden="true" /> Inativo
            </span>
          )}
        </div>
        <h2>{item.name}</h2>
        <div className="herd-meta">
          <span>{item.origin}</span>
          {item.breed !== '—' && <span>{item.breed}</span>}
          <span>
            <MapPin aria-hidden="true" />
            {pastureList.length > 1
              ? `${pastureList.length} pastos`
              : pastureList[0] ?? 'Sem animais em pasto'}
          </span>
        </div>
        <dl>
          <div>
            <dt>Saldo</dt>
            <dd>
              {item.balance} de {item.original}
            </dd>
          </div>
          <div>
            <dt>{item.balance > 0 ? 'Custo por cabeça' : 'Custo acumulado'}</dt>
            <dd>
              <i>R$</i>{' '}
              {money(item.balance > 0 ? item.costPerHead : item.accumulatedCost).replace('R$ ', '')}
            </dd>
          </div>
        </dl>
        {tone && difference !== null && (
          <span className={`market-comparison-chip ${tone === 'loss' ? 'loss' : 'gain'}`}>
            {tone === 'loss' ? (
              <TrendingDown aria-hidden="true" />
            ) : tone === 'gain' ? (
              <TrendingUp aria-hidden="true" />
            ) : (
              <CircleDot aria-hidden="true" />
            )}
            {tone === 'even'
              ? 'Cotação igual ao equilíbrio'
              : `R$ ${decimal(Math.abs(difference))} / @ ${tone === 'loss' ? 'abaixo' : 'acima'} do equilíbrio`}
          </span>
        )}
      </button>
      <div className="herd-actions">
        <button type="button" onClick={onCosts}>
          <CircleDollarSign aria-hidden="true" />
          Custos
        </button>
        <button type="button" onClick={onPanel}>
          <BarChart3 aria-hidden="true" />
          Painel
        </button>
        {item.inactive ? (
          <button type="button" onClick={onReactivate}>
            <Power aria-hidden="true" />
            Reativar
          </button>
        ) : item.balance > 0 ? (
          <button type="button" onClick={onSell}>
            <Beef aria-hidden="true" />
            Vender
          </button>
        ) : (
          <button type="button" onClick={onSales}>
            <ReceiptText aria-hidden="true" />
            Vendas
          </button>
        )}
      </div>
    </motion.article>
  )
}
