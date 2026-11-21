/*
 * Mercado — cotações (Etapa 5.1).
 * Parâmetros na URL:
 *   ?uf=MG|SP|...            praça selecionada no mapa ilustrativo
 *   ?periodo=30 dias|6 meses|12 meses|Tudo   período do gráfico ilustrativo
 *   ?historico=30 dias|6 meses|12 meses|Tudo período do histórico de cotações registradas (padrão 6 meses)
 *   ?acao=registrar          abre "Registrar cotação"
 * Demonstração de estados do histórico: ?estado=vazio | carregando | erro
 */
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Calendar, Edit3, Heart, MapPin, Plus, Trash2, TrendingUp } from 'lucide-react'
import { gsap } from 'gsap'
import AppShell from '@/shared/layout/AppShell'
import { Button, Field, Modal, StateView, Toast } from '@/shared/ui/UI'
import { ReferenceQuote } from '@/shared/ui/BusinessRules'
import { useBackendData } from '@/shared/demo/backend-data'
import { useActiveProperty } from '@/shared/routing/navigation'
import { decimal, money, parseBrDate, referenceQuote, TODAY, user } from '@/shared/demo/data'

const TODAY_ISO = TODAY.split('/').reverse().join('-')
const SOURCES = ['Escritório local', 'Frigorífico', 'Sindicato rural', 'CEPEA (consulta manual)']
const PERIODS = ['30 dias', '6 meses', '12 meses', 'Tudo'] as const
const PERIOD_DAYS: Record<string, number> = { '30 dias': 30, '6 meses': 183, '12 meses': 365 }
const SERIES_STYLE = [
  { dash: '', marker: 'circle', label: 'linha contínua, círculos' },
  { dash: '8 5', marker: 'square', label: 'linha tracejada, quadrados' },
  { dash: '2 5', marker: 'diamond', label: 'linha pontilhada, losangos' },
] as const

type QuoteRow = {
  id: string
  date: string // aaaa-mm-dd
  market: string
  value: number
  source: string
  author: string
}

const isoToBr = (iso: string) => iso.split('-').reverse().join('/')
const isoTime = (iso: string) => parseBrDate(isoToBr(iso)).getTime()
const parseMoney = (raw: string) => Number(raw.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'))

function Marker({ shape, x, y }: { shape: string; x: number; y: number }) {
  if (shape === 'square') return <rect x={x - 4} y={y - 4} width={8} height={8} />
  if (shape === 'diamond')
    return <polygon points={`${x},${y - 5} ${x + 5},${y} ${x},${y + 5} ${x - 5},${y}`} />
  return <circle cx={x} cy={y} r={4} />
}

function QuoteHistoryChart({ rows, period }: { rows: QuoteRow[]; period: string }) {
  const width = 760
  const height = 170
  const pad = { left: 52, right: 130, top: 16, bottom: 28 }
  const end = isoTime(TODAY_ISO)
  const start =
    PERIOD_DAYS[period] !== undefined
      ? end - PERIOD_DAYS[period] * 86_400_000
      : Math.min(...rows.map((row) => isoTime(row.date)))
  const values = rows.map((row) => row.value)
  const min = Math.floor(Math.min(...values) - 4)
  const max = Math.ceil(Math.max(...values) + 4)
  const x = (iso: string) =>
    pad.left + ((isoTime(iso) - start) / Math.max(1, end - start)) * (width - pad.left - pad.right)
  const y = (value: number) =>
    pad.top + (1 - (value - min) / Math.max(1, max - min)) * (height - pad.top - pad.bottom)
  const markets = Array.from(new Set(rows.map((row) => row.market)))
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Histórico das cotações registradas por praça, ${period}: ${markets
        .map((market) => {
          const last = rows.filter((row) => row.market === market).at(-1)!
          return `${market}, última ${money(last.value)} em ${isoToBr(last.date)}`
        })
        .join('; ')}`}
    >
      {[min, (min + max) / 2, max].map((tick) => (
        <g key={tick} className="quote-history__grid">
          <line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} />
          <text x={pad.left - 8} y={y(tick) + 4} textAnchor="end">
            {decimal(tick, 0)}
          </text>
        </g>
      ))}
      <text className="quote-history__axis" x={pad.left} y={height - 6}>
        {isoToBr(new Date(start).toISOString().slice(0, 10))}
      </text>
      <text className="quote-history__axis" x={width - pad.right} y={height - 6} textAnchor="end">
        {TODAY}
      </text>
      {markets.map((market, index) => {
        const style = SERIES_STYLE[index % SERIES_STYLE.length]
        const points = rows.filter((row) => row.market === market)
        const last = points[points.length - 1]
        return (
          <g key={market} className={`quote-history__series quote-history__series--${index % 3}`}>
            <polyline
              points={points.map((row) => `${x(row.date)},${y(row.value)}`).join(' ')}
              strokeDasharray={style.dash || undefined}
            />
            {points.map((row) => (
              <Marker key={row.id} shape={style.marker} x={x(row.date)} y={y(row.value)} />
            ))}
            <text x={x(last.date) + 10} y={y(last.value) + 4}>
              {market} · {decimal(last.value)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

const states = [
  {
    id: 'MG',
    name: 'Minas Gerais',
    quote: 324.85,
    change: '+1,8%',
    tone: 4,
    path: '138,150 214,142 246,177 220,230 156,222 120,183',
  },
  {
    id: 'SP',
    name: 'São Paulo',
    quote: 331.2,
    change: '+0,9%',
    tone: 5,
    path: '105,222 156,222 220,230 203,266 137,281 91,255',
  },
  {
    id: 'GO',
    name: 'Goiás',
    quote: 318.4,
    change: '+1,2%',
    tone: 3,
    path: '115,101 180,100 214,142 138,150 120,183 84,150',
  },
  {
    id: 'MS',
    name: 'Mato Grosso do Sul',
    quote: 315.7,
    change: '−0,4%',
    tone: 3,
    path: '43,177 120,183 156,222 105,222 91,255 42,238',
  },
  {
    id: 'MT',
    name: 'Mato Grosso',
    quote: 308.9,
    change: '+0,6%',
    tone: 2,
    path: '33,80 115,101 84,150 120,183 43,177 12,125',
  },
  {
    id: 'BA',
    name: 'Bahia',
    quote: 302.6,
    change: '+0,3%',
    tone: 2,
    path: '214,90 277,107 300,158 246,177 214,142 180,100',
  },
  {
    id: 'PA',
    name: 'Pará',
    quote: 296.8,
    change: '−0,2%',
    tone: 1,
    path: '74,25 190,29 214,90 180,100 115,101 33,80',
  },
  {
    id: 'PR',
    name: 'Paraná',
    quote: 326.1,
    change: '+1,1%',
    tone: 4,
    path: '137,281 203,266 207,296 159,316 119,300',
  },
]

export default function MarketPage() {
  const mapRef = useRef<SVGSVGElement>(null)
  const navigate = useNavigate()
  const { base } = useActiveProperty()
  const [params, setParams] = useSearchParams()
  const selected = states.find((state) => state.id === params.get('uf')) || states[0]
  const period = params.get('periodo') || '30 dias'
  const historyPeriod = params.get('historico') || '6 meses'
  const listState = params.get('estado') as 'vazio' | 'carregando' | 'erro' | null
  const manualOpen = params.get('acao') === 'registrar'
  const [favorite, setFavorite] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const backend = useBackendData()
  const [quotes, setQuotes] = useState<QuoteRow[]>(() =>
    backend.quotes.map((quote) => ({
      id: String(quote.id),
      date: String(quote.date).slice(0, 10),
      market: String(quote.market),
      value: Number(quote.value),
      source: String(quote.source),
      // TODO(integração): autor real da cotação (createdBy) quando houver usuários do app.
      author: referenceQuote.author,
    })),
  )
  // Formulário
  const [editingId, setEditingId] = useState<string | null>(null)
  const [quoteDate, setQuoteDate] = useState(TODAY_ISO)
  const [market, setMarket] = useState(referenceQuote.market)
  const [newMarket, setNewMarket] = useState(false)
  const [newMarketName, setNewMarketName] = useState('')
  const [valueRaw, setValueRaw] = useState('')
  const [source, setSource] = useState(referenceQuote.source)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [duplicate, setDuplicate] = useState<QuoteRow | null>(null)
  const [deleting, setDeleting] = useState<QuoteRow | null>(null)

  const marketOptions = useMemo(
    () => Array.from(new Set([referenceQuote.market, 'Triângulo Mineiro', 'Zona da Mata — MG', ...quotes.map((quote) => quote.market)])),
    [quotes],
  )

  const visibleQuotes = useMemo(() => {
    if (listState === 'vazio') return []
    const days = PERIOD_DAYS[historyPeriod]
    const end = isoTime(TODAY_ISO)
    return quotes
      .filter((quote) => days === undefined || end - isoTime(quote.date) <= days * 86_400_000)
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [quotes, historyPeriod, listState])

  useLayoutEffect(() => {
    if (!mapRef.current) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const context = gsap.context(() => {
      gsap.from('.market-state', {
        opacity: 0,
        scale: 0.9,
        transformOrigin: 'center',
        stagger: 0.06,
        duration: 0.55,
        ease: 'back.out(1.4)',
      })
      gsap.from('.map-marker', {
        opacity: 0,
        y: -12,
        stagger: 0.1,
        delay: 0.45,
        duration: 0.4,
      })
    }, mapRef)
    return () => context.revert()
  }, [])

  function updateRoute(key: string, value: string | null) {
    const next = new URLSearchParams(params)
    if (value === null) next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true })
  }

  function selectState(id: string) {
    updateRoute('uf', id)
  }

  function openForm(quote?: QuoteRow) {
    setEditingId(quote?.id ?? null)
    setQuoteDate(quote?.date ?? TODAY_ISO)
    const knownMarket = !quote || marketOptions.includes(quote.market)
    setMarket(quote?.market ?? referenceQuote.market)
    setNewMarket(!knownMarket)
    setNewMarketName('')
    setValueRaw(quote ? decimal(quote.value) : '')
    setSource(quote?.source ?? referenceQuote.source)
    setFormErrors({})
    updateRoute('acao', 'registrar')
  }

  function closeForm() {
    setDuplicate(null)
    updateRoute('acao', null)
  }

  function saveQuote(row: QuoteRow, replaceId?: string) {
    setQuotes((current) => [
      ...current.filter((quote) => quote.id !== row.id && quote.id !== replaceId),
      row,
    ])
  }

  function submitQuote(event: React.FormEvent) {
    event.preventDefault()
    const marketName = newMarket ? newMarketName.trim() : market
    const value = parseMoney(valueRaw)
    const errors: Record<string, string> = {}
    if (!quoteDate) errors.date = 'Informe a data da cotação.'
    else if (quoteDate > TODAY_ISO) errors.date = `A data não pode ser depois de hoje (${TODAY}).`
    if (!marketName) errors.market = 'Informe o nome da nova praça.'
    if (!valueRaw.trim()) errors.value = 'Informe o valor da arroba.'
    else if (!Number.isFinite(value) || value <= 0)
      errors.value = 'Informe um valor válido, por exemplo 318,00.'
    if (!source.trim()) errors.source = 'Informe a fonte da cotação.'
    setFormErrors(errors)
    if (Object.keys(errors).length) return
    // TODO(integração): persistir criação/substituição via Server Action autenticada.
    const row: QuoteRow = {
      id: editingId ?? `local-${Date.now()}`,
      date: quoteDate,
      market: marketName,
      value,
      source: source.trim(),
      author: user.name,
    }
    const existing = quotes.find(
      (quote) =>
        quote.id !== editingId &&
        quote.date === row.date &&
        quote.market.toLowerCase() === row.market.toLowerCase() &&
        quote.source.toLowerCase() === row.source.toLowerCase(),
    )
    if (existing) {
      setDuplicate(existing)
      return
    }
    saveQuote(row)
    closeForm()
    setToast(editingId ? 'Cotação atualizada.' : 'Cotação registrada no histórico.')
  }

  function confirmReplace() {
    if (!duplicate) return
    saveQuote(
      {
        id: editingId ?? `local-${Date.now()}`,
        date: quoteDate,
        market: newMarket ? newMarketName.trim() : market,
        value: parseMoney(valueRaw),
        source: source.trim(),
        author: user.name,
      },
      duplicate.id,
    )
    closeForm()
    setToast('Cotação substituída pelo novo valor.')
  }

  return (
    <AppShell>
      <div className="market-page">
        <header className="section-heading market-heading">
          <div>
            <span className="eyebrow">REFERÊNCIA DE MERCADO</span>
            <h1>Cotações da arroba</h1>
            <p>Referências registradas e dados ilustrativos para apoiar suas decisões.</p>
          </div>
          <Button variant="secondary" icon={<Plus aria-hidden="true" />} onClick={() => openForm()}>
            Registrar cotação
          </Button>
        </header>
        <div className="market-disclaimer">
          <TrendingUp aria-hidden="true" />
          <span>
            <strong>Integração automática com o CEPEA em breve</strong>
            <small>
              O mapa mostra dados ilustrativos. Para as contas, vale a cotação que você registrar.
            </small>
          </span>
        </div>
        <ReferenceQuote onRegister={() => openForm()} />

        <div className="market-layout">
          <section className="map-panel">
            <div className="map-toolbar">
              <div>
                <span className="eyebrow">BRASIL · DADOS ILUSTRATIVOS</span>
                <h2>Preço da arroba por praça</h2>
              </div>
              <span className="map-date">
                <Calendar aria-hidden="true" /> Referência ilustrativa de 08/11/2026
              </span>
            </div>
            <svg
              className="brazil-map"
              ref={mapRef}
              viewBox="0 0 330 350"
              role="img"
              aria-label="Mapa do Brasil com cotações ilustrativas por praça"
            >
              <path
                className="map-outline"
                d="M72 18L194 24L235 64L286 95L317 158L287 206L237 228L216 301L169 340L115 307L80 265L32 247L6 180L13 116L31 72Z"
              />
              {states.map((state) => (
                <polygon
                  key={state.id}
                  points={state.path}
                  tabIndex={0}
                  role="button"
                  aria-label={`${state.name}, referência ilustrativa: R$ ${state.quote.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} por arroba`}
                  aria-pressed={selected.id === state.id}
                  className={`market-state market-state--${state.tone} ${
                    selected.id === state.id ? 'selected' : ''
                  }`}
                  onClick={() => selectState(state.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      selectState(state.id)
                    }
                  }}
                >
                  <title>
                    {state.name}: referência ilustrativa R${' '}
                    {state.quote.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    })}{' '}
                    / @
                  </title>
                </polygon>
              ))}
              <g
                className="map-marker"
                tabIndex={0}
                role="button"
                aria-label="Selecionar Triângulo Mineiro"
                onClick={() => selectState('MG')}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') selectState('MG')
                }}
              >
                <circle cx="177" cy="182" r="8" />
                <circle cx="177" cy="182" r="3" />
                <text x="188" y="185">
                  Triângulo
                </text>
              </g>
              <g
                className="map-marker"
                tabIndex={0}
                role="button"
                aria-label="Selecionar Araçatuba"
                onClick={() => selectState('SP')}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') selectState('SP')
                }}
              >
                <circle cx="151" cy="250" r="8" />
                <circle cx="151" cy="250" r="3" />
                <text x="162" y="253">
                  Araçatuba
                </text>
              </g>
              <g
                className="map-marker"
                tabIndex={0}
                role="button"
                aria-label="Selecionar Goiânia"
                onClick={() => selectState('GO')}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') selectState('GO')
                }}
              >
                <circle cx="150" cy="124" r="8" />
                <circle cx="150" cy="124" r="3" />
                <text x="161" y="127">
                  Goiânia
                </text>
              </g>
            </svg>
            <div className="map-legend">
              <span>Menor preço</span>
              {[1, 2, 3, 4, 5].map((tone) => (
                <i className={`market-state--${tone}`} key={tone} />
              ))}
              <span>Maior preço</span>
            </div>
          </section>

          <aside className="quote-panel">
            <div className="quote-panel__mobile-handle" aria-hidden="true" />
            <div className="quote-panel__head">
              <div>
                <span className="eyebrow">PRAÇA SELECIONADA · DADOS ILUSTRATIVOS</span>
                <h2>{selected.name}</h2>
              </div>
              <button
                aria-pressed={favorite}
                className={favorite ? 'favorite active' : 'favorite'}
                onClick={() => setFavorite(!favorite)}
                aria-label={favorite ? 'Remover praça dos favoritos' : 'Marcar praça favorita'}
              >
                <Heart aria-hidden="true" />
              </button>
            </div>
            <div className="current-quote">
              <span>Referência ilustrativa</span>
              <strong>
                <i>R$</i> {decimal(selected.quote)} <small>/ @</small>
              </strong>
              <b>{selected.change} no período · não usada nas contas</b>
            </div>
            <div className="quote-period" role="group" aria-label="Período do gráfico ilustrativo">
              {PERIODS.map((item) => (
                <button
                  key={item}
                  aria-pressed={period === item}
                  className={period === item ? 'active' : ''}
                  onClick={() => updateRoute('periodo', item)}
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="quote-chart">
              <svg
                viewBox="0 0 340 120"
                role="img"
                aria-label={`Evolução ilustrativa da arroba em ${selected.name}, ${period}`}
              >
                <path className="quote-area" d={`${ILLUSTRATIVE_PATHS[period] ?? ILLUSTRATIVE_PATHS['30 dias']} L340 120L0 120Z`} />
                <path className="quote-line" d={ILLUSTRATIVE_PATHS[period] ?? ILLUSTRATIVE_PATHS['30 dias']} />
              </svg>
              <div>
                <span>{ILLUSTRATIVE_START[period] ?? '10 out'}</span>
                <span>R$ {decimal(selected.quote)}</span>
                <span>08 nov</span>
              </div>
            </div>
            <section className="regions-list">
              <span>PRAÇAS COM DADOS ILUSTRATIVOS</span>
              <ul>
                {(selected.id === 'MG'
                  ? [
                      ['Triângulo Mineiro', 326.4],
                      ['Belo Horizonte', 324.1],
                      ['Norte de Minas', 319.8],
                    ]
                  : [['Praça principal', selected.quote]]
                ).map(([region, value]) => (
                  <li key={String(region)}>
                    <MapPin aria-hidden="true" />
                    <span>
                      <strong>{region}</strong>
                      <small>R$ {decimal(Number(value))} / @</small>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
            <p className="quote-panel__note">
              O simulador usa a sua cotação de referência: {referenceQuote.market},{' '}
              {money(referenceQuote.value)} / @ em {referenceQuote.date} ({referenceQuote.source}).
            </p>
            <Button
              onClick={() =>
                navigate(`${base}/vendas?aba=simulador&preco=${referenceQuote.value}`)
              }
            >
              Usar a cotação de referência no simulador
            </Button>
          </aside>
        </div>

        <section className="manual-history" aria-labelledby="registered-quotes-title">
          <div className="finance-panel__heading">
            <div>
              <span className="eyebrow">SUAS REFERÊNCIAS</span>
              <h2 id="registered-quotes-title">Cotações registradas</h2>
              <p>Valores inseridos manualmente não alteram a referência ilustrativa do mapa.</p>
            </div>
            <div
              className="quote-period"
              role="group"
              aria-label="Período das cotações registradas"
            >
              {PERIODS.map((item) => (
                <button
                  key={item}
                  aria-pressed={historyPeriod === item}
                  className={historyPeriod === item ? 'active' : ''}
                  onClick={() => updateRoute('historico', item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          {listState === 'carregando' ? (
            <StateView type="loading" title="Buscando suas cotações…" />
          ) : listState === 'erro' ? (
            <StateView
              type="error"
              title="Não conseguimos carregar as cotações"
              onAction={() => updateRoute('estado', null)}
            />
          ) : visibleQuotes.length === 0 ? (
            <StateView
              type="empty"
              title="Nenhuma cotação registrada neste período"
              text="Registre a cotação que você conseguiu com o escritório, o frigorífico ou o sindicato."
              actionLabel="Registrar cotação"
              onAction={() => openForm()}
            />
          ) : (
            <>
              <div className="registered-quote-chart">
                <QuoteHistoryChart rows={visibleQuotes} period={historyPeriod} />
                <ul className="quote-history__legend">
                  {Array.from(new Set(visibleQuotes.map((quote) => quote.market))).map(
                    (name, index) => (
                      <li key={name} className={`quote-history__series--${index % 3}`}>
                        <svg width="34" height="12" aria-hidden="true">
                          <line
                            x1="0"
                            x2="34"
                            y1="6"
                            y2="6"
                            strokeDasharray={SERIES_STYLE[index % 3].dash || undefined}
                          />
                          <Marker shape={SERIES_STYLE[index % 3].marker} x={17} y={6} />
                        </svg>
                        {name}
                        <span className="sr-only"> ({SERIES_STYLE[index % 3].label})</span>
                      </li>
                    ),
                  )}
                </ul>
              </div>
              {[...visibleQuotes].reverse().map((quote) => (
                <div key={quote.id} className="quote-history__row">
                  <time dateTime={quote.date}>{isoToBr(quote.date)}</time>
                  <span>
                    <MapPin aria-hidden="true" />
                    {quote.market} · {quote.source}
                  </span>
                  <small>Lançado por {quote.author}</small>
                  <strong>{money(quote.value)} / @</strong>
                  <button
                    className="icon-button"
                    aria-label={`Editar cotação de ${quote.market} em ${isoToBr(quote.date)}`}
                    onClick={() => openForm(quote)}
                  >
                    <Edit3 aria-hidden="true" />
                  </button>
                  <button
                    className="icon-button danger-icon"
                    aria-label={`Excluir cotação de ${quote.market} em ${isoToBr(quote.date)}`}
                    onClick={() => setDeleting(quote)}
                  >
                    <Trash2 aria-hidden="true" />
                  </button>
                </div>
              ))}
            </>
          )}
        </section>
      </div>

      <Modal
        open={manualOpen && !duplicate}
        onClose={closeForm}
        title={editingId ? 'Editar cotação' : 'Registrar cotação'}
      >
        <form className="form-stack" onSubmit={submitQuote} noValidate>
          <div className="form-grid">
            <Field
              label="Data"
              type="date"
              max={TODAY_ISO}
              value={quoteDate}
              onChange={(event) => setQuoteDate(event.target.value)}
              error={formErrors.date}
              required
            />
            <Field
              label="Valor da arroba (R$ / @)"
              inputMode="decimal"
              autoComplete="off"
              value={valueRaw}
              onChange={(event) => setValueRaw(event.target.value)}
              error={formErrors.value}
              suffix={<span className="field-suffix">R$</span>}
              required
            />
          </div>
          <label className="select-field" htmlFor="quote-market">
            <span>Praça</span>
            <select
              id="quote-market"
              value={newMarket ? 'nova' : market}
              onChange={(event) => {
                if (event.target.value === 'nova') setNewMarket(true)
                else {
                  setNewMarket(false)
                  setMarket(event.target.value)
                }
              }}
              required
            >
              {marketOptions.map((item) => (
                <option key={item}>{item}</option>
              ))}
              <option value="nova">+ Nova praça</option>
            </select>
          </label>
          {newMarket && (
            <Field
              label="Nome da nova praça"
              value={newMarketName}
              onChange={(event) => setNewMarketName(event.target.value)}
              error={formErrors.market}
              required
            />
          )}
          <Field
            label="Fonte"
            list="quote-sources"
            value={source}
            onChange={(event) => setSource(event.target.value)}
            error={formErrors.source}
            required
          />
          <datalist id="quote-sources">
            {SOURCES.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
          <div className="modal__actions">
            <Button type="button" variant="ghost" onClick={closeForm}>
              Cancelar
            </Button>
            <Button type="submit">Salvar cotação</Button>
          </div>
        </form>
      </Modal>
      <Modal open={Boolean(duplicate)} onClose={() => setDuplicate(null)} title="Cotação já registrada">
        {duplicate && (
          <p className="modal-copy">
            Já existe uma cotação de {duplicate.market} em {isoToBr(duplicate.date)} pelo{' '}
            {duplicate.source} ({money(duplicate.value)}). Substituir pelo novo valor?
          </p>
        )}
        <div className="modal__actions">
          <Button variant="ghost" onClick={() => setDuplicate(null)}>
            Cancelar
          </Button>
          <Button onClick={confirmReplace}>Substituir</Button>
        </div>
      </Modal>
      <Modal open={Boolean(deleting)} onClose={() => setDeleting(null)} title="Excluir cotação?">
        {deleting && (
          <p className="modal-copy">
            A cotação de {deleting.market} em {isoToBr(deleting.date)} ({money(deleting.value)})
            sai do histórico. Vendas e simulações já registradas não mudam.
          </p>
        )}
        <div className="modal__actions">
          <Button variant="ghost" onClick={() => setDeleting(null)}>
            Manter cotação
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              setQuotes((current) => current.filter((quote) => quote.id !== deleting?.id))
              setDeleting(null)
              setToast('Cotação excluída do histórico.')
            }}
          >
            Excluir
          </Button>
        </div>
      </Modal>
      <Toast message={toast} onClose={() => setToast(null)} />
    </AppShell>
  )
}

const ILLUSTRATIVE_PATHS: Record<string, string> = {
  '30 dias': 'M0 95 C35 90 40 70 78 76 S130 62 164 65 S225 35 263 45 S305 24 340 20',
  '6 meses': 'M0 90 C48 55 82 78 110 70 S165 40 205 60 S262 25 300 38 S326 20 340 28',
  '12 meses': 'M0 100 C40 92 70 96 110 80 S170 70 210 58 S270 46 300 40 S326 30 340 26',
  Tudo: 'M0 108 C50 104 90 98 130 88 S190 80 230 64 S280 50 310 42 S330 32 340 28',
}
const ILLUSTRATIVE_START: Record<string, string> = {
  '30 dias': '10 out',
  '6 meses': 'mai 2026',
  '12 meses': 'nov 2025',
  Tudo: '2024',
}
