/*
 * Painel financeiro do registro: /fazenda/:propriedadeId/rebanho/:registroId/painel
 * O seletor "Lote analisado" troca o :registroId da rota.
 *
 * Parâmetros de URL de demonstração (sem botões na interface):
 * - ?estado=loading|error|empty   carregando, erro e vazio do painel
 */
import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import {
  ArrowLeft,
  CalendarClock,
  ChevronDown,
  CircleDollarSign,
  ExternalLink,
  Info,
  Scale,
  TrendingUp,
} from 'lucide-react'
import AppShell from '@/shared/layout/AppShell'
import { Button, Field, StateView } from '@/shared/ui/UI'
import {
  DEFAULT_YIELD,
  arrobasFromLiveWeight,
  decimal,
  getRecord,
  money,
  recordsForProperty,
  referenceQuote,
  round2,
  salesForRecord,
} from '@/shared/demo/data'
import { propertyNotFoundCopy, useActiveProperty } from '@/shared/routing/navigation'
import {
  CalculationHelp,
  MarginLabel,
  QuoteComparison,
  ReferenceQuote,
  SoldLockBanner,
  StatusBadge,
} from '@/shared/ui/BusinessRules'
import { TODAY_ISO, forecastItems } from '@/features/sales/pages/SalesPage'

/** Cores da composição (mesma ordem das fatias da rosca). */
const tones = ['#3f5f3f', '#5f845e', '#a7875b', '#b8c4ae', '#d4d1c8', '#e6dcc8']

/** Fatores do histórico ilustrativo do custo por @ do saldo (último mês = valor atual). */
const costHistory = [0.85, 0.89, 0.92, 0.95, 0.98, 1]
const quoteHistory = [301, 305, 309, 312, 316, referenceQuote.value]
const months = ['Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov']
const CHART_MIN = 100
const CHART_MAX = 350

export default function FinancialPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { registroId } = useParams()
  const { base, id, found } = useActiveProperty()
  const record = getRecord(registroId)
  const [helpOpen, setHelpOpen] = useState(false)
  const [weightInput, setWeightInput] = useState<string | null>(null)
  const estado = params.get('estado') as 'loading' | 'error' | 'empty' | null

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
  if (!record || record.propertyId !== id || estado === 'empty') {
    return (
      <AppShell>
        <StateView
          type="empty"
          title="Registro não encontrado"
          text="Este lote ou animal não existe nesta propriedade. Escolha um registro no Rebanho."
          actionLabel="Ir para o Rebanho"
          onAction={() => navigate(`${base}/rebanho`)}
        />
      </AppShell>
    )
  }
  if (estado === 'loading' || estado === 'error') {
    return (
      <AppShell>
        <StateView
          type={estado}
          title={estado === 'loading' ? 'Calculando o painel do lote…' : undefined}
          onAction={() => setParams({})}
        />
      </AppShell>
    )
  }

  const options = recordsForProperty(id)
  const recordSales = salesForRecord(record.slug)
  const hasBalance = record.balance > 0
  const weight = weightInput === null ? (record.avgWeightKg ?? 0) : Number(weightInput.replace(',', '.'))
  const weightError =
    hasBalance && !(weight > 0) ? 'Informe o peso médio em kg (maior que zero)' : undefined
  const arrobas = hasBalance && weight > 0 ? arrobasFromLiveWeight(record.balance * weight) : 0
  const costPerArroba = arrobas ? round2(record.balanceCost / arrobas) : null
  // Equilíbrio do saldo = custo por @ do saldo (sem despesas de venda estimadas).
  const breakEven = costPerArroba
  const forecasts = forecastItems.filter(
    (item) => item.slug === record.slug && item.date > TODAY_ISO,
  )
  const forecastByMonth = forecasts.reduce<Record<string, number>>((acc, item) => {
    const key = item.date.slice(0, 7)
    acc[key] = round2((acc[key] ?? 0) + item.value)
    return acc
  }, {})
  const maxForecast = Math.max(1, ...Object.values(forecastByMonth))
  const sliceStops = record.costsByCategory.reduce<{ from: number; to: number }[]>(
    (acc, line) => {
      const from = acc.length ? acc[acc.length - 1].to : 0
      return [...acc, { from, to: from + (line.value / record.accumulatedCost) * 100 }]
    },
    [],
  )
  const donut = sliceStops.length
    ? `conic-gradient(${sliceStops
        .map((s, i) => `${tones[i % tones.length]} ${s.from.toFixed(2)}% ${s.to.toFixed(2)}%`)
        .join(', ')})`
    : undefined

  function chartY(value: number) {
    const clamped = Math.min(CHART_MAX, Math.max(CHART_MIN, value))
    return 200 - ((clamped - CHART_MIN) / (CHART_MAX - CHART_MIN)) * 180
  }
  function chartPath(values: number[]) {
    return values
      .map((value, index) => `${index ? 'L' : 'M'}${(index * 800) / (values.length - 1)} ${chartY(value).toFixed(1)}`)
      .join(' ')
  }
  const costSeries = costPerArroba ? costHistory.map((f) => round2(costPerArroba * f)) : []

  return (
    <AppShell>
      <div className="financial-page">
        <button className="back-link" onClick={() => navigate(`${base}/rebanho/${record.slug}`)}>
          <ArrowLeft aria-hidden="true" /> Voltar para {record.name}
        </button>
        <header className="financial-header">
          <div>
            <span className="eyebrow">PAINEL FINANCEIRO</span>
            <h1>Quanto custa e quanto pode sobrar</h1>
            <p>Todos os números abaixo são exclusivos do registro selecionado.</p>
          </div>
          <label className="lot-selector">
            <span>Lote analisado</span>
            <strong>{record.name}</strong>
            <small>
              {hasBalance
                ? `${record.balance} de ${record.original} ${record.original === 1 ? 'animal' : 'animais'} em estoque`
                : 'Sem animais no saldo'}
            </small>
            <ChevronDown aria-hidden="true" />
            <select
              aria-label="Trocar o lote analisado"
              value={record.slug}
              onChange={(event) => {
                setWeightInput(null)
                navigate(`${base}/rebanho/${event.target.value}/painel`)
              }}
            >
              {options.map((option) => (
                <option key={option.slug} value={option.slug}>
                  {option.name}
                </option>
              ))}
            </select>
          </label>
        </header>
        <div className="financial-status">
          <StatusBadge status={record.status} />
        </div>
        {record.locked && (
          <SoldLockBanner
            item={record.kind === 'Individual' ? 'Animal' : 'Lote'}
            recordSlug={record.slug}
            target="Venda total do lote"
            before={
              recordSales[0]
                ? `${recordSales[0].heads} animais · ${recordSales[0].date}`
                : 'Venda total do lote'
            }
          />
        )}

        <section className="financial-kpis financial-kpis--six" aria-label="Números principais">
          <article>
            <span>Custo acumulado</span>
            <strong>{money(record.accumulatedCost)}</strong>
            <small>
              {record.acquisitionCost
                ? `Aquisição de ${money(record.acquisitionCost)} + custos confirmados`
                : 'Custos confirmados (origem nascimento, sem aquisição)'}
            </small>
          </article>
          <article>
            <span>Custo já alocado às vendas</span>
            <strong>{money(record.allocatedCost)}</strong>
            <small>
              {recordSales.length
                ? recordSales.map((sale) => `${sale.heads} animais em ${sale.date}`).join(' · ')
                : 'Nenhuma venda registrada'}
            </small>
          </article>
          <article>
            <span>Custo do saldo</span>
            <strong>{money(record.balanceCost)}</strong>
            <small>
              {hasBalance
                ? `${record.balance} ${record.balance === 1 ? 'animal' : 'animais'} ainda no registro`
                : 'Saldo zerado'}
            </small>
          </article>
          <article className="featured">
            <span>Custo por cabeça no saldo</span>
            <strong>{hasBalance ? money(record.costPerHead) : '—'}</strong>
            <small>
              {hasBalance
                ? `${money(record.balanceCost)} ÷ ${record.balance} no saldo`
                : 'Sem animais no saldo'}
            </small>
          </article>
          <article>
            <span>Custo por @ do saldo</span>
            <strong>{costPerArroba !== null ? `${money(costPerArroba)} / @` : '—'}</strong>
            <small>Rendimento da propriedade: {DEFAULT_YIELD}%</small>
          </article>
          <article>
            <span>Ponto de equilíbrio do saldo</span>
            <strong>{breakEven !== null ? `${money(breakEven)} / @` : '—'}</strong>
            <small>Preço mínimo da @ para cobrir os custos diretos do saldo</small>
          </article>
        </section>

        {hasBalance ? (
          <section className="balance-weight-card">
            <div>
              <span className="eyebrow">ARROBAS ESTIMADAS DO SALDO</span>
              <h2 aria-live="polite">
                {record.balance} {record.balance === 1 ? 'animal' : 'animais'} ×{' '}
                {decimal(weight || 0, 0)} kg × {DEFAULT_YIELD}% ÷ 15 = {decimal(arrobas)} @
              </h2>
              <p>
                Usamos o peso médio da última pesagem. Ajuste a estimativa quando não houver uma
                pesagem recente.
              </p>
            </div>
            <Field
              label="Peso médio atual estimado (kg)"
              inputMode="decimal"
              value={weightInput ?? String(record.avgWeightKg ?? '')}
              error={weightError}
              onChange={(event) => setWeightInput(event.target.value)}
              suffix={<span className="field-suffix">kg</span>}
            />
          </section>
        ) : (
          <p className="financial-note">
            <Info aria-hidden="true" /> {record.name} não tem animais no saldo: custo por @,
            equilíbrio e comparativo com a cotação não se aplicam.
          </p>
        )}

        <div className="financial-grid">
          <section className="finance-panel category-composition">
            <div className="finance-panel__heading">
              <div>
                <span className="eyebrow">COMPOSIÇÃO</span>
                <h2>De onde vem o custo</h2>
              </div>
              <button
                className="text-link"
                onClick={() => navigate(`${base}/rebanho/${record.slug}?aba=custos`)}
              >
                Ver lançamentos
              </button>
            </div>
            {record.costsByCategory.length ? (
              <div className="composition-layout">
                <div
                  className="finance-donut"
                  style={donut ? { background: donut } : undefined}
                  role="img"
                  aria-label={`Custo acumulado de ${money(record.accumulatedCost)} dividido por categoria`}
                >
                  <div>
                    <strong>{money(record.accumulatedCost)}</strong>
                    <small>acumulado</small>
                  </div>
                </div>
                <div className="composition-list">
                  {record.costsByCategory.map((line, index) => (
                    <button
                      key={line.category}
                      onClick={() =>
                        navigate(
                          line.kind === 'aquisicao'
                            ? `${base}/custos?aba=notas&lote=${record.slug}`
                            : `${base}/custos?lote=${record.slug}&categoria=${encodeURIComponent(line.category)}`,
                        )
                      }
                      aria-label={`${line.category}: ${money(line.value)}. Ver lançamentos e notas de origem`}
                    >
                      <i style={{ background: tones[index % tones.length] }} aria-hidden="true" />
                      <span>
                        <strong>{line.category}</strong>
                        <small>
                          {decimal((line.value / record.accumulatedCost) * 100, 1)}% do custo
                          acumulado
                        </small>
                      </span>
                      <b>{money(line.value)}</b>
                      <ExternalLink aria-hidden="true" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="financial-note">Nenhum custo lançado neste registro.</p>
            )}
          </section>

          <section className="finance-panel balance-panel">
            <div className="finance-panel__heading">
              <div>
                <span className="eyebrow">PREÇO MÍNIMO</span>
                <h2>Ponto de equilíbrio do saldo</h2>
              </div>
              <Scale aria-hidden="true" />
            </div>
            <strong>{breakEven !== null ? `${money(breakEven)} / @` : '—'}</strong>
            <p>Preço mínimo da arroba para cobrir os custos diretos dos animais no saldo.</p>
            {hasBalance && (
              <div>
                <Info aria-hidden="true" />
                <span>
                  Custo do saldo ({money(record.balanceCost)}) ÷ {decimal(arrobas)} @ estimadas,
                  com rendimento de {DEFAULT_YIELD}%. Despesas de venda ainda não entram.
                </span>
              </div>
            )}
          </section>

          {costPerArroba !== null && (
            <section className="finance-panel finance-chart-panel">
              <div className="finance-panel__heading">
                <div>
                  <span className="eyebrow">EVOLUÇÃO · ÚLTIMOS 6 MESES</span>
                  <h2>Custo por @ do saldo ao longo do tempo</h2>
                  <p>Comparado à cotação de referência · {referenceQuote.market}.</p>
                </div>
                <div className="line-legend">
                  <span>
                    <i />
                    Custo por @ do saldo
                  </span>
                  <span>
                    <i />
                    Cotação de referência · {referenceQuote.market}
                  </span>
                </div>
              </div>
              <div className="finance-line-chart">
                <div className="chart-labels" aria-hidden="true">
                  <span>R$ 350 / @</span>
                  <span>R$ 225 / @</span>
                  <span>R$ 100 / @</span>
                </div>
                <svg
                  viewBox="0 0 800 220"
                  role="img"
                  aria-label={`Custo por @ do saldo subiu para ${money(costPerArroba)} / @ em novembro; cotação de referência de ${referenceQuote.market} em ${money(referenceQuote.value)} / @.`}
                >
                  <path className="finance-gridline" d="M0 20H800M0 110H800M0 200H800" />
                  <path className="finance-cost-line" d={chartPath(costSeries)} />
                  <path className="finance-quote-line" d={chartPath(quoteHistory)} />
                </svg>
                <div className="chart-months" aria-hidden="true">
                  {months.map((month) => (
                    <span key={month}>{month}</span>
                  ))}
                </div>
              </div>
            </section>
          )}

          <section className="finance-panel margin-panel">
            <div className="finance-panel__heading">
              <div>
                <span className="eyebrow">SOBRE CUSTOS DIRETOS</span>
                <h2>Margem das vendas</h2>
              </div>
            </div>
            {record.netMargin !== null ? (
              <>
                <div className="margin-total">
                  <span>Margem líquida consolidada</span>
                  <strong>
                    {record.netMargin < 0 ? '− ' : '+ '}
                    {money(Math.abs(record.netMargin))}
                  </strong>
                  <MarginLabel
                    balance={record.balance}
                    hasSale={record.hasSale}
                    onHelp={() => setHelpOpen(true)}
                  />
                </div>
                {recordSales.map((sale) => (
                  <button
                    type="button"
                    className="sale-margin-row"
                    key={sale.id}
                    onClick={() => navigate(`${base}/vendas?venda=${sale.id}`)}
                  >
                    <span aria-hidden="true">
                      <TrendingUp />
                    </span>
                    <p>
                      <strong>Venda para {sale.buyer}</strong>
                      <small>
                        {sale.date} · {sale.heads} animais · {decimal(sale.arrobas)} @
                      </small>
                    </p>
                    <div>
                      <small>Bruta · sobre custos diretos</small>
                      <b>{money(sale.grossMargin)}</b>
                    </div>
                    <div>
                      <small>Líquida · sobre custos diretos</small>
                      <b>{money(sale.netMargin)}</b>
                    </div>
                  </button>
                ))}
              </>
            ) : (
              <p className="financial-note">
                Ainda não há vendas deste registro. A margem aparece depois da primeira venda.
              </p>
            )}
          </section>

          <section className="finance-panel forecast-panel">
            <div className="finance-panel__heading">
              <div>
                <span className="eyebrow">NÃO ENTRA NO CUSTO AINDA</span>
                <h2>Previstos dos próximos meses</h2>
              </div>
              <CalendarClock aria-hidden="true" />
            </div>
            {Object.keys(forecastByMonth).length ? (
              Object.entries(forecastByMonth).map(([month, value]) => (
                <div className="forecast-row" key={month}>
                  <span>{monthName(month)}</span>
                  <i aria-hidden="true">
                    <b style={{ width: `${(value / maxForecast) * 100}%` }} />
                  </i>
                  <strong>{money(value)}</strong>
                </div>
              ))
            ) : (
              <p className="financial-note">Nenhum gasto previsto para este registro.</p>
            )}
            <button
              className="text-link"
              onClick={() => navigate(`${base}/custos?aba=projecao&lote=${record.slug}`)}
            >
              Abrir projeção completa
            </button>
          </section>
        </div>

        <ReferenceQuote />
        <QuoteComparison
          costPerArroba={costPerArroba}
          breakEven={breakEven}
          breakEvenLabel="Ponto de equilíbrio do saldo"
        />
        {hasBalance && !record.locked && (
          <div className="finance-actions">
            <Button
              variant="secondary"
              icon={<CircleDollarSign aria-hidden="true" />}
              onClick={() => navigate(`${base}/vendas?aba=simulador&lote=${record.slug}`)}
            >
              Simular venda
            </Button>
            <Button
              icon={<TrendingUp aria-hidden="true" />}
              onClick={() =>
                navigate(
                  `${base}/vendas?acao=registrar&lote=${record.slug}${weight > 0 ? `&peso=${Math.round(weight * Math.min(7, record.balance))}` : ''}`,
                )
              }
            >
              Registrar venda
            </Button>
          </div>
        )}
      </div>
      <CalculationHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
    </AppShell>
  )
}

function monthName(isoMonth: string) {
  const [year, month] = isoMonth.split('-').map(Number)
  const name = new Date(year, month - 1, 1).toLocaleDateString('pt-BR', { month: 'long' })
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} de ${year}`
}
