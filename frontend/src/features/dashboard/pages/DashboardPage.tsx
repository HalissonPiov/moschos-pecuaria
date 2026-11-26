/*
 * Resumo da propriedade (Etapa 5.2, auditoria da Etapa 6).
 *
 * Parâmetros de URL de demonstração (sem botões na interface):
 * - ?estado=loading|error|empty   carregando, erro e vazio do Resumo
 * - ?nova=1                       aviso de propriedade recém-cadastrada
 */
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import {
  AlertTriangle,
  ArrowRight,
  Beef,
  Camera,
  CircleHelp,
  Package,
  Scale,
  Syringe,
  TrendingUp,
  WalletCards,
  Wheat,
} from 'lucide-react'
import { motion } from 'motion/react'
import AppShell from '@/shared/layout/AppShell'
import { Button, Modal, StateView, Toast } from '@/shared/ui/UI'
import {
  TODAY,
  daysBetween,
  money,
  parseBrDate,
  propertyTotalsFor,
  recordsForProperty,
  referenceQuote,
  round2,
  type RecordStatus,
} from '@/shared/demo/data'
import { propertyNotFoundCopy, useActiveProperty } from '@/shared/routing/navigation'
import { CalculationContent, ReferenceQuote, StatusBadge } from '@/shared/ui/BusinessRules'
import { AggregateMarginNote, TODAY_ISO, forecastItems, toBr } from '@/features/sales/pages/SalesPage'

const statusOrder: [RecordStatus, string][] = [
  ['Em produção', 'production'],
  ['Pronto para venda', 'ready'],
  ['Parcialmente vendido', 'partial'],
  ['Vendido', 'sold'],
  ['Encerrado', 'closed'],
]

const categoryIcons: Record<string, typeof Wheat> = {
  Ração: Wheat,
  Suplemento: Package,
  Medicamento: Syringe,
}

/** Custos confirmados no mês atual (novembro/2026). TODO(integração): virá dos lançamentos. */
const monthCosts = [{ date: '05/11/2026', description: 'Sal mineral proteinado', value: 2184.7 }]

/** Contas "A pagar" (mesmos lançamentos da aba Custos → A pagar). */
const bills = [
  { name: 'Locação de pasto · Lote Bezerros Sul', due: '10/11/2026', value: 3250 },
  { name: 'Vacina contra clostridiose · Lote Safra 24', due: '18/11/2026', value: 786.45 },
]
const DUE_SOON_DAYS = 7

const donutColors = ['var(--green-dark)', 'var(--green)', 'var(--sand)', '#bec9b9']

export default function DashboardPage() {
  const [params, setParams] = useSearchParams()
  const state = params.get('estado') as 'loading' | 'error' | 'empty' | null
  const [helpOpen, setHelpOpen] = useState(false)
  const [paidBills, setPaidBills] = useState<string[]>([])
  // ?nova=<n>: chegou do cadastro de propriedade, que criou n categorias sugeridas (RF11).
  const createdCategories = Number(params.get('nova'))
  const [toast, setToast] = useState<string | null>(
    createdCategories > 0
      ? `Propriedade cadastrada. Criamos ${createdCategories} ${
          createdCategories === 1 ? 'categoria' : 'categorias'
        } de custo para você começar.`
      : null,
  )
  const navigate = useNavigate()
  const { base, property, id, found } = useActiveProperty()

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

  const records = recordsForProperty(id)
  const withBalance = records.filter((record) => record.balance > 0)
  const totals = propertyTotalsFor(id)
  const visibleState = records.length ? state : 'empty'
  const lotsStillSelling = records.filter((record) => record.hasSale && record.balance > 0)
  const monthTotal = round2(monthCosts.reduce((total, cost) => total + cost.value, 0))
  const todayLabel = parseBrDate(TODAY)
    .toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
    .toUpperCase()

  // Previstos dos próximos 30 dias (os mesmos do Simulador e do Painel financeiro).
  const limit = parseBrDate(TODAY)
  limit.setDate(limit.getDate() + 30)
  const limitIso = `${limit.getFullYear()}-${String(limit.getMonth() + 1).padStart(2, '0')}-${String(limit.getDate()).padStart(2, '0')}`
  const slugs = new Set(records.map((record) => record.slug))
  const upcoming = forecastItems
    .filter((item) => slugs.has(item.slug) && item.date > TODAY_ISO && item.date <= limitIso)
    .slice()
    .sort((x, y) => x.date.localeCompare(y.date))
  const upcomingTotal = round2(upcoming.reduce((total, item) => total + item.value, 0))

  // Custo confirmado por categoria (sem a aquisição) dos registros com animais.
  const byCategory = new Map<string, number>()
  withBalance.forEach((record) =>
    record.costsByCategory
      .filter((line) => line.kind === 'custo')
      .forEach((line) => byCategory.set(line.category, (byCategory.get(line.category) ?? 0) + line.value)),
  )
  const sortedCategories = Array.from(byCategory.entries()).sort((x, y) => y[1] - x[1])
  const confirmedTotal = round2(sortedCategories.reduce((total, [, value]) => total + value, 0))
  const donutRows: [string, number][] = [
    ...sortedCategories.slice(0, 3),
    ...(sortedCategories.length > 3
      ? [['Outras', sortedCategories.slice(3).reduce((t, [, v]) => t + v, 0)] as [string, number]]
      : []),
  ]
  let cursor = 0
  const donutGradient = confirmedTotal
    ? `conic-gradient(${donutRows
        .map(([, value], index) => {
          const from = cursor
          cursor += (value / confirmedTotal) * 100
          return `${donutColors[index]} ${from.toFixed(2)}% ${cursor.toFixed(2)}%`
        })
        .join(', ')})`
    : undefined

  const dueBills = bills
    .map((bill) => ({ ...bill, days: daysBetween(TODAY, bill.due) }))
    .filter((bill) => bill.days <= DUE_SOON_DAYS)

  return (
    <AppShell>
      {visibleState ? (
        <>
        {/* T9: a página continua com um título principal quando só mostra o estado. */}
        <h1 className="sr-only">Resumo da {property.name}</h1>
        <StateView
          type={visibleState}
          title={
            visibleState === 'empty' && !records.length
              ? 'Ainda não há lotes nesta propriedade'
              : undefined
          }
          text={
            visibleState === 'empty' && !records.length
              ? 'Cadastre o primeiro lote para ver custos, margens e vencimentos no Resumo.'
              : undefined
          }
          actionLabel={visibleState === 'empty' && !records.length ? 'Cadastrar lote' : undefined}
          onAction={() =>
            visibleState === 'empty' && !records.length
              ? navigate(`${base}/rebanho/novo`)
              : setParams({})
          }
        />
        </>
      ) : (
        <motion.div
          className="dashboard"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <header className="dashboard__heading">
            <div>
              <span className="eyebrow">{todayLabel}</span>
              <h1>Bom dia, João.</h1>
              <p>Veja como está a {property.name} hoje.</p>
            </div>
            <div className="market-pill">
              <span>
                <TrendingUp aria-hidden="true" /> {referenceQuote.category} · {referenceQuote.market}
              </span>
              <strong>
                {money(referenceQuote.value)} <small>/ @</small>
              </strong>
              <em>
                registrada em {referenceQuote.date.slice(0, 5)}, há {referenceQuote.age} dias ·{' '}
                {referenceQuote.source}
              </em>
            </div>
          </header>
          <ReferenceQuote />

          <section className="metrics" aria-label="Indicadores principais">
            <Metric
              icon={<Beef aria-hidden="true" />}
              label="Cabeças em estoque"
              value={String(totals.stockHeads)}
              note={`em ${withBalance.length} lotes e animais com saldo`}
            />
            <Metric
              icon={<WalletCards aria-hidden="true" />}
              label="Custos do mês"
              value={money(monthTotal)}
              note={`confirmados em novembro · ${monthCosts.length} ${monthCosts.length === 1 ? 'lançamento' : 'lançamentos'}`}
            />
            <Metric
              icon={<Scale aria-hidden="true" />}
              label="Custo acumulado"
              value={money(totals.accumulatedCost)}
              note="dos lotes com animais · aquisição + custos confirmados"
            />
            <Metric
              icon={<TrendingUp aria-hidden="true" />}
              label="Margem líquida das vendas"
              value={money(Math.abs(totals.salesNetMargin))}
              sign={totals.salesNetMargin < 0 ? '−' : '+'}
              positive={totals.salesNetMargin >= 0}
              onHelp={() => setHelpOpen(true)}
            >
              <AggregateMarginNote records={lotsStillSelling} onHelp={() => setHelpOpen(true)} />
            </Metric>
          </section>

          <section className="dashboard-status-panel">
            <div className="panel__heading">
              <div>
                <span className="eyebrow">REBANHO</span>
                <h2>Lotes por status</h2>
              </div>
            </div>
            <div className="status-segments">
              {statusOrder.map(([status, tone]) => {
                const count = totals.recordsByStatus[status] ?? 0
                return (
                  <button
                    key={status}
                    className={`status-segment status-segment--${tone}`}
                    style={{ flexGrow: Math.max(1, count) }}
                    aria-label={`${count} ${count === 1 ? 'registro' : 'registros'} em ${status}. Ver no Rebanho`}
                    onClick={() => navigate(`${base}/rebanho?status=${encodeURIComponent(status)}`)}
                  >
                    <strong>{count}</strong>
                    <StatusBadge status={status} />
                  </button>
                )
              })}
            </div>
          </section>

          <div className="dashboard-operational-grid">
            <section className="panel lot-cost-list">
              <div className="panel__heading">
                <div>
                  <span className="eyebrow">COMPARATIVO COM A COTAÇÃO</span>
                  <h2>Custo por lote</h2>
                </div>
              </div>
              {withBalance.map((record) => {
                const diff = record.quoteDifference
                const loss = diff !== null && diff < 0
                return (
                  <button key={record.slug} onClick={() => navigate(`${base}/rebanho/${record.slug}`)}>
                    <p>
                      <strong>{record.name}</strong>
                      <small>
                        Acumulado {money(record.accumulatedCost)} · {money(record.costPerHead)} por
                        cabeça
                      </small>
                    </p>
                    <span className={loss ? 'cost-alert' : ''}>
                      {loss && <AlertTriangle aria-hidden="true" />}
                      {record.breakEven !== null ? `${money(record.breakEven)} / @` : '—'}
                      <small>
                        {diff === null
                          ? 'Sem comparativo'
                          : loss
                            ? `${money(Math.abs(diff))} / @ acima da cotação de ${money(referenceQuote.value)} / @: vender agora dá prejuízo`
                            : `Equilíbrio ${money(diff)} / @ abaixo da cotação de referência`}
                      </small>
                    </span>
                  </button>
                )
              })}
            </section>
            <section className="panel due-soon-list">
              <div className="panel__heading">
                <div>
                  <span className="eyebrow">AVISO DE {DUE_SOON_DAYS} DIAS</span>
                  <h2>Próximos vencimentos</h2>
                </div>
                <button className="text-link" onClick={() => navigate(`${base}/custos?aba=pagar`)}>
                  Ver tudo
                </button>
              </div>
              {dueBills.length ? (
                dueBills.map((bill) => {
                  const paid = paidBills.includes(bill.name)
                  const overdue = bill.days < 0 && !paid
                  return (
                    <div className={overdue ? 'overdue' : ''} key={bill.name}>
                      <p>
                        <strong>
                          {overdue && <AlertTriangle aria-hidden="true" />}
                          {bill.name}
                        </strong>
                        <small>
                          {paid
                            ? `Paga · ${money(bill.value)}`
                            : bill.days < 0
                              ? `Vencida em ${bill.due.slice(0, 5)}, há ${-bill.days} ${bill.days === -1 ? 'dia' : 'dias'} · ${money(bill.value)}`
                              : bill.days === 0
                                ? `Vence hoje · ${money(bill.value)}`
                                : `Vence em ${bill.due.slice(0, 5)} · ${money(bill.value)}`}
                        </small>
                      </p>
                      <Button
                        variant="secondary"
                        disabled={paid}
                        onClick={() => {
                          setPaidBills([...paidBills, bill.name])
                          setToast('Conta marcada como paga. O custo acumulado não mudou.')
                        }}
                      >
                        {paid ? 'Paga' : 'Marcar como pago'}
                      </Button>
                    </div>
                  )
                })
              ) : (
                <p className="dashboard-note">Nenhuma conta vence nos próximos {DUE_SOON_DAYS} dias.</p>
              )}
            </section>
          </div>

          <section className="confirm-banner">
            <div className="confirm-banner__number">4</div>
            <div>
              <span className="eyebrow">A CONFIRMAR</span>
              <h2>Tem gasto previsto esperando você</h2>
              <p>Confira se aconteceu e informe o valor final. Só depois ele entra no custo.</p>
            </div>
            <Button variant="secondary" onClick={() => navigate(`${base}/custos?aba=confirmar`)}>
              Revisar lançamentos <ArrowRight aria-hidden="true" />
            </Button>
          </section>

          <div className="dashboard-grid">
            <section className="panel expenses-panel">
              <div className="panel__heading">
                <div>
                  <span className="eyebrow">PRÓXIMOS 30 DIAS · NÃO ENTRAM NO CUSTO</span>
                  <h2>Gastos previstos</h2>
                </div>
                <button
                  className="text-link"
                  onClick={() => navigate(`${base}/custos?aba=projecao`)}
                >
                  Ver todos
                </button>
              </div>
              {upcoming.length ? (
                <>
                  <div className="expense-list">
                    {upcoming.map((item, index) => {
                      const Icon = categoryIcons[item.category] ?? Wheat
                      const recordName = records.find((r) => r.slug === item.slug)?.name ?? ''
                      return (
                        <motion.div
                          className="expense-row"
                          key={`${item.slug}-${item.date}`}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.08 * index }}
                        >
                          <time dateTime={item.date}>{toBr(item.date).slice(0, 5)}</time>
                          <Icon aria-hidden="true" />
                          <div>
                            <strong>{item.category}</strong>
                            <span>{recordName}</span>
                          </div>
                          <b>{money(item.value)}</b>
                        </motion.div>
                      )
                    })}
                  </div>
                  <div className="expense-total">
                    <span>Total previsto</span>
                    <strong>{money(upcomingTotal)}</strong>
                  </div>
                </>
              ) : (
                <p className="dashboard-note">Nenhum gasto previsto para os próximos 30 dias.</p>
              )}
            </section>

            <section className="panel donut-panel">
              <div className="panel__heading">
                <div>
                  <span className="eyebrow">LOTES COM ANIMAIS · SEM A AQUISIÇÃO</span>
                  <h2>Custo confirmado por categoria</h2>
                </div>
              </div>
              <div className="donut-layout">
                <div
                  className="donut"
                  style={donutGradient ? { background: donutGradient } : undefined}
                  role="img"
                  aria-label={`${money(confirmedTotal)} em custos confirmados, por categoria`}
                >
                  <div>
                    <span>Total</span>
                    <strong>{money(confirmedTotal)}</strong>
                  </div>
                </div>
                <ul>
                  {donutRows.map(([category, value], index) => (
                    <li key={category}>
                      <i className="dot" style={{ background: donutColors[index] }} aria-hidden="true" />
                      <span>
                        {category} · {money(value)}
                      </span>
                      <strong>{Math.round((value / confirmedTotal) * 100)}%</strong>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="panel chart-panel">
              <div className="panel__heading">
                <div>
                  <span className="eyebrow">ÚLTIMOS 6 MESES</span>
                  <h2>Evolução do custo mensal</h2>
                </div>
                <div className="chart-legend">
                  <i /> Confirmado <i /> Previsto
                </div>
              </div>
              <div className="line-chart">
                <div className="chart-y">
                  <span>20 mil</span>
                  <span>10 mil</span>
                  <span>0</span>
                </div>
                <svg
                  viewBox="0 0 760 190"
                  role="img"
                  aria-label="O custo mensal confirmado cresceu de maio a outubro"
                >
                  <path className="chart-gridline" d="M0 20H760M0 92H760M0 164H760" />
                  <path
                    className="chart-area"
                    d="M0 138 C70 124 90 132 145 108 S235 112 300 78 S395 90 455 58 S550 85 610 47 S700 55 760 28 V164 H0Z"
                  />
                  <path
                    className="chart-line"
                    d="M0 138 C70 124 90 132 145 108 S235 112 300 78 S395 90 455 58 S550 85 610 47 S700 55 760 28"
                  />
                  <path className="chart-predicted" d="M610 47 C675 42 720 32 760 28" />
                  {[
                    ['0', '138'],
                    ['145', '108'],
                    ['300', '78'],
                    ['455', '58'],
                    ['610', '47'],
                    ['760', '28'],
                  ].map(([cx, cy]) => (
                    <circle key={cx} cx={cx} cy={cy} r="5" />
                  ))}
                </svg>
                <div className="chart-x">
                  <span>Mai</span>
                  <span>Jun</span>
                  <span>Jul</span>
                  <span>Ago</span>
                  <span>Set</span>
                  <span>Out</span>
                </div>
              </div>
            </section>
          </div>

          <section className="quick-actions">
            <div>
              <span className="eyebrow">FAÇA AGORA</span>
              <h2>Atalhos do dia a dia</h2>
            </div>
            <div className="quick-actions__buttons">
              <button onClick={() => navigate(`${base}/custos/nova-compra`)}>
                <Camera />
                <span>
                  <strong>Registrar compra</strong>
                  <small>Fotografe a nota em papel</small>
                </span>
                <ArrowRight />
              </button>
              <button onClick={() => navigate(`${base}/rebanho/novo`)}>
                <Beef />
                <span>
                  <strong>Novo lote</strong>
                  <small>Comece um novo acompanhamento</small>
                </span>
                <ArrowRight />
              </button>
              <button onClick={() => navigate(`${base}/vendas?aba=simulador`)}>
                <TrendingUp />
                <span>
                  <strong>Simular venda</strong>
                  <small>Veja quanto pode sobrar</small>
                </span>
                <ArrowRight />
              </button>
            </div>
          </section>
        </motion.div>
      )}

      <Modal open={helpOpen} onClose={() => setHelpOpen(false)} title="Como calculamos">
        <CalculationContent />
      </Modal>
      <Toast message={toast} onClose={() => setToast(null)} />
    </AppShell>
  )
}

function Metric({
  icon,
  label,
  value,
  note,
  sign,
  positive,
  onHelp,
  children,
}: {
  icon: React.ReactNode
  label: string
  value: string
  note?: string
  sign?: string
  positive?: boolean
  onHelp?: () => void
  children?: React.ReactNode
}) {
  const isMoney = value.startsWith('R$ ')
  return (
    <article className={`metric ${positive ? 'metric--positive' : ''}`}>
      <div className="metric__top">
        <span>
          {icon}
          {label}
        </span>
        {onHelp && (
          <button className="icon-button" onClick={onHelp} aria-label="Como calculamos a margem">
            <CircleHelp aria-hidden="true" />
          </button>
        )}
      </div>
      <strong className="metric__value">
        {sign && <b>{sign}</b>}
        {isMoney ? (
          <>
            <i>R$</i> {value.slice(3)}
          </>
        ) : (
          value
        )}
      </strong>
      {children ?? <small>{note}</small>}
    </article>
  )
}
