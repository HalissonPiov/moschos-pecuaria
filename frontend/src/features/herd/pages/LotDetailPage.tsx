/*
 * Detalhe do lote ou animal (Etapa 2.3), com as sete abas.
 *
 * Rota: /fazenda/:propriedadeId/rebanho/:registroId
 * Parâmetros de URL (abrem direto por link):
 *   ?aba=geral | animais | custos | painel | vendas | movimentacoes | historico
 *   ?tipo=        filtro do Histórico (Todos, Custos, Notas, Vendas, Entradas, Baixas, Estornos,
 *                 Previstos, Status, Correções)
 *   ?periodo=     filtro do Histórico (Todo o período | Últimos 30 dias | Este ano)
 *   Aba Animais: ?buscaAnimal= ?situacao= ?pastoAnimal= ?raca= ?dados= ?animal=07
 *   Aba Movimentações: ?estornadas=1
 * Estados de demonstração (valem para a aba aberta):
 *   ?estado=loading | error | empty
 */
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Beef,
  CalendarClock,
  Camera,
  CheckCircle2,
  CircleDot,
  Edit3,
  FileImage,
  FileSpreadsheet,
  FileText,
  Filter,
  LockKeyhole,
  MapPin,
  MoreHorizontal,
  Power,
  RotateCcw,
  Scale,
  SkipForward,
  Tag,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wheat,
} from 'lucide-react'
import { motion } from 'motion/react'
import AppShell from '@/shared/layout/AppShell'
import { Button, Modal, StateView, Toast } from '@/shared/ui/UI'
import {
  DEFAULT_YIELD,
  TODAY,
  daysBetween,
  decimal,
  getRecord,
  money,
  referenceQuote,
  salesForRecord,
  type LivestockRecord,
} from '@/shared/demo/data'
import { useCorrections } from '@/shared/demo/corrections'
import { propertyNotFoundCopy, useActiveProperty } from '@/shared/routing/navigation'
import {
  CalculationContent,
  MarginLabel,
  QuoteComparison,
  ReferenceQuote,
  SoldLockBanner,
  StatusAction,
  StatusBadge,
} from '@/shared/ui/BusinessRules'
import LotAnimals from '@/features/herd/components/LotAnimals'
import LotMovements from '@/features/herd/components/LotMovements'

const allTabs = [
  ['geral', 'Visão geral'],
  ['animais', 'Animais'],
  ['custos', 'Custos'],
  ['painel', 'Painel'],
  ['vendas', 'Vendas'],
  ['movimentacoes', 'Movimentações'],
  ['historico', 'Histórico'],
] as const

type CostEntry = {
  date: string
  category: string
  supplier: string
  item: string
  value: number
  note: boolean
  author: string
}

/** Últimos custos confirmados lançados em cada registro (detalhe; o total vem de costsByCategory). */
// TODO(integração): buscar os lançamentos do registro na API.
const recentCosts: Record<string, CostEntry[]> = {
  'lote-safra-24': [
    { date: '05/11/2026', category: 'Suplemento', supplier: 'Agropecuária Ponte Nova', item: 'Sal mineral proteinado', value: 2184.7, note: true, author: 'João Batista' },
    { date: '22/10/2026', category: 'Medicamento', supplier: 'Vet Rural', item: 'Vermífugo e vacina', value: 786.45, note: true, author: 'Ana Batista' },
    { date: '06/10/2026', category: 'Locação de pasto', supplier: 'Carlos Andrade', item: 'Aluguel de pasto · outubro', value: 3250, note: false, author: 'João Batista' },
    { date: '19/09/2026', category: 'Ração', supplier: 'Casa do Criador', item: 'Ração de engorda', value: 4832.18, note: true, author: 'João Batista' },
  ],
  'lote-bezerros-sul': [
    { date: '30/10/2026', category: 'Ração', supplier: 'Casa do Criador', item: 'Ração inicial', value: 1560, note: true, author: 'Ana Batista' },
    { date: '12/10/2026', category: 'Medicamento', supplier: 'Vet Rural', item: 'Vacina contra aftosa', value: 412.3, note: true, author: 'Ana Batista' },
  ],
  'boi-047': [
    { date: '15/10/2026', category: 'Ração', supplier: 'Casa do Criador', item: 'Ração de terminação', value: 210, note: true, author: 'João Batista' },
  ],
  'lote-recria-23': [
    { date: '20/05/2026', category: 'Ração', supplier: 'Casa do Criador', item: 'Ração de recria', value: 1180, note: true, author: 'João Batista' },
  ],
  'lote-descarte-22': [
    { date: '02/08/2026', category: 'Medicamento', supplier: 'Vet Rural', item: 'Tratamento de casco', value: 320, note: false, author: 'Ana Batista' },
  ],
}

/** Oferta de comprador da referência, usada no bloco de ofertas da aba Vendas. */
const lotOffer = { buyer: 'Frigorífico União', price: 312, date: '12/11/2026' }

const sortKey = (date: string) => date.split('/').reverse().join('')

function hasLinks(record: LivestockRecord) {
  return (
    record.costsByCategory.length > 0 ||
    record.hasSale ||
    record.writeOffs.length > 0 ||
    record.original > 0
  )
}

export default function LotDetailPage() {
  const navigate = useNavigate()
  const { registroId } = useParams()
  const { base, id: propertyId, found } = useActiveProperty()
  const record = getRecord(registroId)
  const [params, setParams] = useSearchParams()
  const [helpOpen, setHelpOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [dangerOpen, setDangerOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  useEffect(() => {
    if (!menuOpen) return
    function close(event: MouseEvent | globalThis.KeyboardEvent) {
      if (event instanceof globalThis.KeyboardEvent) {
        if (event.key === 'Escape') setMenuOpen(false)
        return
      }
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
    }
  }, [menuOpen])

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
  if (!record || record.propertyId !== propertyId) {
    return (
      <AppShell>
        <StateView
          type="empty"
          title="Lote ou animal não encontrado"
          text="Este registro não existe nesta propriedade. Volte ao rebanho e escolha outro."
          actionLabel="Voltar para o rebanho"
          onAction={() => navigate(`${base}/rebanho`)}
        />
      </AppShell>
    )
  }

  const individual = record.kind === 'Individual'
  const noun = individual ? 'animal' : 'lote'
  const tabs = individual ? allTabs.filter(([key]) => key !== 'animais') : allTabs
  const requested = params.get('aba') || 'geral'
  const tab = tabs.some(([key]) => key === requested) ? requested : 'geral'
  const forcedState = params.get('estado') as 'loading' | 'error' | 'empty' | null
  const linked = hasLinks(record)
  const sales = salesForRecord(record.slug)
  const canSell = record.balance > 0 && !record.inactive && !record.locked
  const manualStatus = record.status === 'Em produção' || record.status === 'Pronto para venda'

  function changeTab(next: string) {
    const updated = new URLSearchParams(params)
    updated.set('aba', next)
    updated.delete('estado')
    setParams(updated)
  }

  function onTabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const keys: Record<string, number> = {
      ArrowRight: (index + 1) % tabs.length,
      ArrowLeft: (index - 1 + tabs.length) % tabs.length,
      Home: 0,
      End: tabs.length - 1,
    }
    if (!(event.key in keys)) return
    event.preventDefault()
    const [key] = tabs[keys[event.key]]
    changeTab(key)
    tabRefs.current[key]?.focus()
  }

  const marginValue = record.netMargin

  return (
    <AppShell>
      <div className="lot-detail">
        <button type="button" className="back-link" onClick={() => navigate(`${base}/rebanho`)}>
          ← Voltar para o rebanho
        </button>
        {record.locked && (
          <SoldLockBanner
            item="Lote"
            recordSlug={record.slug}
            target={sales[0] ? `Venda de ${sales[0].date}` : 'Dados do lote'}
            before={
              sales[0]
                ? `${sales[0].heads} animais · ${money(sales[0].revenue)} · ${sales[0].date}`
                : record.name
            }
          />
        )}
        {record.inactive && (
          <div className="rb-lock-note">
            <Power aria-hidden="true" />
            <p>
              <strong>{individual ? 'Animal inativo' : 'Lote inativo'}</strong>
              <span>Ele não aparece nas listas de escolha. Reative para voltar a usá-lo.</span>
            </p>
            <Button variant="secondary" onClick={() => setToast(`${record.name} reativado.`)}>
              Reativar
            </Button>
          </div>
        )}
        <header className="lot-hero">
          <div className="lot-hero__identity">
            <span className="kind-badge">
              <Beef aria-hidden="true" /> {record.kind}
            </span>
            <h1>{record.name}</h1>
            <p>
              <span>{record.origin}</span>
              <span>Formado em {record.formationDate}</span>
              {record.pasture !== '—' && (
                <span>
                  <MapPin aria-hidden="true" />{' '}
                  {record.pastureCount > 1 ? `${record.pastureCount} pastos` : record.pasture}
                </span>
              )}
            </p>
            {!manualStatus && <StatusBadge status={record.status} />}
            <div className="balance-tag">
              <strong>{record.balance}</strong>
              <span>
                de {record.original} {record.original === 1 ? 'animal' : 'animais'}
                <br />
                no saldo
              </span>
            </div>
          </div>
          <div className="lot-hero__actions">
            {!record.locked && !record.inactive && (
              <Button
                variant="secondary"
                icon={<Edit3 />}
                onClick={() => navigate(`${base}/rebanho/${record.slug}/editar`)}
              >
                Editar {noun}
              </Button>
            )}
            <div className="rb-menu" ref={menuRef}>
              <button
                type="button"
                className="icon-button"
                aria-label="Mais opções"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen(!menuOpen)}
              >
                <MoreHorizontal aria-hidden="true" />
              </button>
              {menuOpen && (
                <div className="rb-menu__list" role="menu">
                  {!record.locked && !record.inactive && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => navigate(`${base}/rebanho/${record.slug}/editar`)}
                    >
                      <Edit3 aria-hidden="true" /> Editar {noun}
                    </button>
                  )}
                  {record.inactive ? (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false)
                        setToast(`${record.name} reativado.`)
                      }}
                    >
                      <RotateCcw aria-hidden="true" /> Reativar
                    </button>
                  ) : (
                    <button
                      type="button"
                      role="menuitem"
                      className={linked ? '' : 'rb-danger-link'}
                      onClick={() => {
                        setMenuOpen(false)
                        setDangerOpen(true)
                      }}
                    >
                      {linked ? <Power aria-hidden="true" /> : <Trash2 aria-hidden="true" />}
                      {linked ? `Inativar ${noun}` : `Excluir ${noun}`}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="lot-numbers">
            <LotNumber
              label="Custo acumulado"
              amount={record.accumulatedCost}
              note={<small>aquisição + custos confirmados − estornos</small>}
            />
            <LotNumber
              label="Custo por cabeça no saldo"
              amount={record.balance > 0 ? record.costPerHead : null}
              note={
                <small>
                  {record.balance > 0
                    ? `${money(record.balanceCost)} ÷ ${record.balance} no saldo`
                    : 'saldo zerado'}
                </small>
              }
            />
            <LotNumber
              label="Custo por @ do saldo"
              amount={record.costPerArroba}
              suffix=" / @"
              note={
                <small>
                  {record.costPerArroba !== null
                    ? `custo do saldo ÷ ${decimal(record.balanceArrobas)} @ estimadas`
                    : 'saldo zerado'}
                </small>
              }
            />
            <LotNumber
              label="Margem líquida"
              amount={marginValue}
              signed
              positive={marginValue !== null && marginValue > 0}
              negative={marginValue !== null && marginValue < 0}
              note={
                <>
                  {marginValue === null && <small>sem venda ainda</small>}
                  <MarginLabel
                    balance={record.balance}
                    hasSale={record.hasSale}
                    onHelp={() => setHelpOpen(true)}
                  />
                </>
              }
            />
          </div>
        </header>
        <div className="lot-status-row">
          <StatusAction key={record.slug} status={record.status} />
        </div>
        {record.balance > 0 ? (
          <QuoteComparison record={record} breakEvenLabel="Ponto de equilíbrio do saldo" />
        ) : (
          <p className="rb-muted-line">
            Sem animais no saldo: não há comparativo com a cotação de referência.
          </p>
        )}

        <div className="lot-tabs" aria-label={`Informações do ${noun}`} role="tablist">
          {tabs.map(([key, label], index) => (
            <button
              type="button"
              role="tab"
              id={`aba-${key}`}
              aria-controls={`painel-${key}`}
              aria-selected={tab === key}
              tabIndex={tab === key ? 0 : -1}
              key={key}
              ref={(node) => {
                tabRefs.current[key] = node
              }}
              className={tab === key ? 'active' : ''}
              onClick={() => changeTab(key)}
              onKeyDown={(event) => onTabKey(event, index)}
            >
              {label}
            </button>
          ))}
        </div>

        <motion.div
          className="lot-tab-content"
          key={tab}
          role="tabpanel"
          id={`painel-${tab}`}
          aria-labelledby={`aba-${tab}`}
          tabIndex={0}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
        >
          {forcedState === 'loading' || forcedState === 'error' ? (
            <StateView
              type={forcedState}
              onAction={() => {
                const updated = new URLSearchParams(params)
                updated.delete('estado')
                setParams(updated)
              }}
            />
          ) : forcedState === 'empty' ? (
            <StateView
              type="empty"
              title="Nada por aqui ainda"
              text="Quando houver lançamentos neste registro, eles aparecem nesta aba."
              actionLabel=""
            />
          ) : (
            <>
              {tab === 'geral' && <Overview onTab={changeTab} record={record} />}
              {tab === 'custos' && (
                <Costs record={record} onAll={() => navigate(`${base}/custos?lote=${record.slug}`)} />
              )}
              {tab === 'animais' && !individual && <LotAnimals record={record} />}
              {tab === 'painel' && <LotPanel record={record} onHelp={() => setHelpOpen(true)} />}
              {tab === 'vendas' && (
                <Sales
                  record={record}
                  onHelp={() => setHelpOpen(true)}
                  onSale={(price) =>
                    navigate(
                      `${base}/vendas?acao=registrar&lote=${record.slug}${price ? `&preco=${price}` : ''}`,
                    )
                  }
                  onSimulate={() => navigate(`${base}/vendas?aba=simulador&lote=${record.slug}`)}
                  onOffers={() => navigate(`${base}/vendas?aba=ofertas&lote=${record.slug}`)}
                />
              )}
              {tab === 'movimentacoes' && <LotMovements key={record.slug} record={record} />}
              {tab === 'historico' && <History record={record} />}
            </>
          )}
        </motion.div>

        {!record.locked && !record.inactive && record.balance > 0 && (
          <div className="lot-fixed-actions">
            <Button
              variant="secondary"
              icon={<Camera />}
              onClick={() => window.dispatchEvent(new Event('mochos:purchase'))}
            >
              Registrar compra
            </Button>
            {canSell && (
              <Button icon={<TrendingUp />} onClick={() => changeTab('vendas')}>
                Vender / Simular
              </Button>
            )}
          </div>
        )}
      </div>

      <Modal open={helpOpen} onClose={() => setHelpOpen(false)} title="Como calculamos">
        <CalculationContent />
      </Modal>
      <Modal
        open={dangerOpen}
        onClose={() => setDangerOpen(false)}
        title={linked ? `Inativar ${record.name}?` : `Excluir ${record.name}?`}
      >
        <p className="modal-copy">
          {linked
            ? `O ${noun} sai das listas de escolha, mas animais, custos, vendas e movimentações são preservados. Você pode reativá-lo com “Mostrar inativos” no Rebanho.`
            : `O ${noun} não tem custos, vendas nem movimentações e será removido. Esta ação não pode ser desfeita.`}
        </p>
        <div className="modal__actions">
          <Button variant="ghost" onClick={() => setDangerOpen(false)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            icon={linked ? <Power /> : <Trash2 />}
            onClick={() => {
              // TODO(integração): inativar ou excluir o registro na API.
              setDangerOpen(false)
              setToast(linked ? `${record.name} inativado.` : `${record.name} excluído.`)
              window.setTimeout(() => navigate(`${base}/rebanho`), 800)
            }}
          >
            {linked ? `Inativar ${noun}` : `Excluir ${noun}`}
          </Button>
        </div>
      </Modal>
      <Toast message={toast} onClose={() => setToast(null)} />
    </AppShell>
  )
}

function LotNumber({
  label,
  amount,
  suffix = '',
  note,
  signed,
  positive,
  negative,
}: {
  label: string
  amount: number | null
  suffix?: string
  note: ReactNode
  signed?: boolean
  positive?: boolean
  negative?: boolean
}) {
  return (
    <div className={positive ? 'positive' : negative ? 'rb-negative' : ''}>
      <span>{label}</span>
      <strong>
        {amount === null ? (
          '—'
        ) : (
          <>
            {signed && amount !== 0 ? (amount > 0 ? '+ ' : '− ') : ''}
            <i>R$</i>
            {decimal(Math.abs(amount))}
            {suffix}
          </>
        )}
      </strong>
      {note}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Visão geral
// ---------------------------------------------------------------------------

function DocIcon({ type }: { type: 'pdf' | 'foto' | 'planilha' }) {
  if (type === 'foto') return <FileImage aria-hidden="true" />
  if (type === 'planilha') return <FileSpreadsheet aria-hidden="true" />
  return <FileText aria-hidden="true" />
}

function Overview({ onTab, record }: { onTab: (tab: string) => void; record: LivestockRecord }) {
  const individual = record.kind === 'Individual'
  const maxValue = Math.max(...record.costsByCategory.map((line) => line.value), 1)
  const lines = [...record.costsByCategory].sort((a, b) =>
    a.kind === b.kind ? b.value - a.value : a.kind === 'aquisicao' ? -1 : 1,
  )
  const events = useHistoryEvents(record).slice(0, 3)
  return (
    <div className="overview-grid">
      <section className="detail-panel">
        <div className="detail-panel__heading">
          <div>
            <span className="eyebrow">DESDE {record.formationDate}</span>
            <h2>Resumo do {individual ? 'animal' : 'lote'}</h2>
          </div>
        </div>
        <dl className="lot-facts">
          <div>
            <dt>Raça</dt>
            <dd>{record.breed}</dd>
          </div>
          <div>
            <dt>{individual ? 'Idade' : 'Idade média'}</dt>
            <dd>{record.age}</dd>
          </div>
          <div>
            <dt>Pasto</dt>
            <dd>{record.pastureCount > 1 ? `${record.pastureCount} pastos` : record.pasture}</dd>
          </div>
          <div>
            <dt>Origem</dt>
            <dd>{record.origin === 'Aquisição' ? 'Compra (aquisição)' : 'Nascimento na propriedade'}</dd>
          </div>
          <div>
            <dt>Formação</dt>
            <dd>{record.formationDate}</dd>
          </div>
          <div>
            <dt>Peso médio atual</dt>
            <dd>{record.avgWeightKg ? `${record.avgWeightKg} kg` : '—'}</dd>
          </div>
        </dl>
        {individual && (
          <dl className="lot-facts individual-overview" aria-label="Dados do animal">
            <div>
              <dt>Nome</dt>
              <dd>{record.name}</dd>
            </div>
            <div>
              <dt>Brinco</dt>
              <dd>{record.attributes.find((a) => a.name === 'Brinco')?.value ?? '—'}</dd>
            </div>
            <div>
              <dt>Sexo</dt>
              <dd>Macho</dd>
            </div>
            <div>
              <dt>Nascimento</dt>
              <dd>15/04/2024 · aproximada</dd>
            </div>
            <div>
              <dt>Peso atual</dt>
              <dd>
                {record.avgWeightKg} kg · {decimal(record.balanceArrobas)} @
              </dd>
            </div>
          </dl>
        )}
        <div className="lot-note">
          <strong>Anotações</strong>
          <p>{record.notes || 'Nenhuma anotação.'}</p>
        </div>
        <div className="free-characteristics">
          <strong>Características livres</strong>
          {record.attributes.length === 0 ? (
            <p className="rb-muted-line">Nenhuma característica cadastrada.</p>
          ) : (
            record.attributes.map((attribute) => (
              <span key={attribute.name}>
                <Tag aria-hidden="true" />
                {attribute.name}: {attribute.value}
              </span>
            ))
          )}
        </div>
        <div className="record-documents">
          <strong>Documentos anexos</strong>
          {record.documents.length === 0 ? (
            <p className="rb-muted-line">Nenhum documento anexado.</p>
          ) : (
            <ul className="rb-doc-list">
              {record.documents.map((doc) => (
                <li key={doc.name}>
                  <DocIcon type={doc.type} />
                  <span>
                    {doc.name}
                    <small>
                      {doc.type === 'pdf' ? 'PDF' : doc.type === 'foto' ? 'Foto' : 'Planilha'} ·{' '}
                      {doc.size}
                    </small>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
      <section className="detail-panel">
        <div className="detail-panel__heading">
          <div>
            <span className="eyebrow">CUSTOS POR CATEGORIA</span>
            <h2>{money(record.accumulatedCost)}</h2>
          </div>
          <button type="button" className="text-link" onClick={() => onTab('custos')}>
            Ver custos
          </button>
        </div>
        {lines.length === 0 ? (
          <p className="rb-muted-line">Nenhum custo lançado.</p>
        ) : (
          <div className="category-bars">
            {lines.map((line) => (
              <CategoryBar
                key={line.category}
                label={line.category}
                value={money(line.value)}
                width={`${Math.max(4, Math.round((line.value / maxValue) * 100))}%`}
              />
            ))}
          </div>
        )}
      </section>
      <section className="detail-panel detail-panel--wide">
        <ReferenceQuote />
      </section>
      <section className="detail-panel detail-panel--wide">
        <div className="detail-panel__heading">
          <div>
            <span className="eyebrow">ATIVIDADE RECENTE</span>
            <h2>Últimos acontecimentos</h2>
          </div>
          <button type="button" className="text-link" onClick={() => onTab('historico')}>
            Ver histórico
          </button>
        </div>
        {events.length === 0 ? (
          <p className="rb-muted-line">Nada registrado ainda.</p>
        ) : (
          <ul className="recent-list">
            {events.map(({ id, date, title, text, icon: Icon }) => (
              <li key={id}>
                <span aria-hidden="true">
                  <Icon />
                </span>
                <p>
                  <strong>{title}</strong>
                  <small>{text}</small>
                </p>
                <time>{date}</time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function CategoryBar({ label, value, width }: { label: string; value: string; width: string }) {
  return (
    <div>
      <p>
        <span>{label}</span>
        <strong>{value}</strong>
      </p>
      <i aria-hidden="true">
        <b style={{ width }} />
      </i>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Custos
// ---------------------------------------------------------------------------

function Costs({ record, onAll }: { record: LivestockRecord; onAll: () => void }) {
  const entries = recentCosts[record.slug] ?? []
  const confirmed = record.costsByCategory.filter((line) => line.kind === 'custo')
  const confirmedTotal = confirmed.reduce((total, line) => total + line.value, 0)
  return (
    <section className="detail-panel full-panel">
      <div className="detail-panel__heading">
        <div>
          <span className="eyebrow">CUSTO ACUMULADO</span>
          <h2>{money(record.accumulatedCost)}</h2>
          <p>
            {record.acquisitionCost
              ? `${money(record.acquisitionCost)} de aquisição + ${money(confirmedTotal)} de custos confirmados.`
              : `${money(confirmedTotal)} de custos confirmados.`}{' '}
            Previstos não entram. Custos a pagar já entram.
          </p>
        </div>
        <Button variant="secondary" onClick={onAll}>
          Ver na tela de Custos
        </Button>
      </div>
      {record.locked && (
        <div className="rb-lock-note">
          <LockKeyhole aria-hidden="true" />
          <p>
            <strong>Somente leitura</strong>
            <span>Os custos deste lote estão travados porque ele foi vendido.</span>
          </p>
        </div>
      )}
      {record.costsByCategory.length === 0 ? (
        <StateView
          type="empty"
          title="Nenhum custo lançado"
          text="Use “Registrar compra” para lançar o primeiro custo."
          actionLabel=""
        />
      ) : (
        <>
          <h3 className="rb-subtitle">Por categoria</h3>
          <div className="rb-category-table" role="table" aria-label="Custos por categoria">
            {[...record.costsByCategory]
              .sort((a, b) => (a.kind === b.kind ? b.value - a.value : a.kind === 'aquisicao' ? -1 : 1))
              .map((line) => (
                <div role="row" key={line.category}>
                  <span role="cell">{line.category}</span>
                  <small role="cell">{line.kind === 'aquisicao' ? 'Aquisição' : 'Confirmado'}</small>
                  <b role="cell">{money(line.value)}</b>
                </div>
              ))}
            <div role="row" className="rb-total">
              <span role="cell">Total</span>
              <small role="cell" />
              <b role="cell">{money(record.accumulatedCost)}</b>
            </div>
          </div>
          {entries.length > 0 && (
            <>
              <h3 className="rb-subtitle">Últimos lançamentos</h3>
              <div className="cost-table">
                <div className="cost-table__head">
                  <span>Data</span>
                  <span>Categoria</span>
                  <span>Fornecedor</span>
                  <span>Nota</span>
                  <span>Valor</span>
                </div>
                {entries.map((cost) => (
                  <div className="cost-table__row" key={cost.date + cost.category}>
                    <time>{cost.date}</time>
                    <strong>
                      {cost.category}
                      <small className="rb-author">
                        {cost.item} · Lançado por {cost.author} em {cost.date}
                      </small>
                    </strong>
                    <span>{cost.supplier}</span>
                    <span>{cost.note ? <FileText aria-label="Com nota fiscal" /> : '—'}</span>
                    <b>{money(cost.value)}</b>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Painel
// ---------------------------------------------------------------------------

function LotPanel({ record, onHelp }: { record: LivestockRecord; onHelp: () => void }) {
  const margin = record.netMargin
  return (
    <div className="lot-panel-grid">
      <section className="detail-panel panel-highlight">
        <span className="eyebrow">CUSTO ACUMULADO</span>
        <strong>
          <i>R$</i> {decimal(record.accumulatedCost)}
        </strong>
        <p>Aquisição + custos confirmados</p>
      </section>
      <section className="detail-panel">
        <span className="eyebrow">CUSTO ALOCADO ÀS VENDAS</span>
        <strong>
          <i>R$</i> {decimal(record.allocatedCost)}
        </strong>
        <p>{record.hasSale ? 'Saiu com os animais vendidos' : 'Nenhuma venda ainda'}</p>
      </section>
      <section className="detail-panel">
        <span className="eyebrow">CUSTO DO SALDO</span>
        <strong>
          <i>R$</i> {decimal(record.balanceCost)}
        </strong>
        <p>
          {record.balance > 0
            ? `${money(record.balanceCost)} ÷ ${record.balance} = ${money(record.costPerHead)} por cabeça`
            : 'Saldo zerado'}
        </p>
      </section>
      <section className="detail-panel">
        <span className="eyebrow">CUSTO POR @ DO SALDO</span>
        <strong>
          {record.costPerArroba !== null ? (
            <>
              <i>R$</i> {decimal(record.costPerArroba)} <small>/ @</small>
            </>
          ) : (
            '—'
          )}
        </strong>
        <p>
          {record.costPerArroba !== null && record.avgWeightKg
            ? `${record.balance} × ${record.avgWeightKg} kg × ${DEFAULT_YIELD}% ÷ 15 = ${decimal(record.balanceArrobas)} @ · ${money(record.balanceCost)} ÷ ${decimal(record.balanceArrobas)} @`
            : 'Sem animais no saldo'}
        </p>
      </section>
      <section className={`detail-panel panel-highlight ${margin !== null && margin < 0 ? 'rb-negative' : ''}`}>
        <span className="eyebrow">MARGEM LÍQUIDA</span>
        <strong className={margin !== null && margin > 0 ? 'positive' : ''}>
          {margin === null ? (
            '—'
          ) : (
            <>
              {margin > 0 ? '+ ' : margin < 0 ? '− ' : ''}
              <i>R$</i> {decimal(Math.abs(margin))}
            </>
          )}
        </strong>
        {margin === null && <p>Sem venda ainda</p>}
        <MarginLabel balance={record.balance} hasSale={record.hasSale} onHelp={onHelp} />
      </section>
      <section className="detail-panel detail-panel--wide break-even">
        {record.breakEven !== null ? (
          <>
            <div>
              <span className="eyebrow">PONTO DE EQUILÍBRIO DO SALDO</span>
              <h2>Você precisa receber pelo menos</h2>
              <strong>
                <i>R$</i> {decimal(record.breakEven)} <small>/ @</small>
              </strong>
            </div>
            <div className="scale-visual">
              <Scale aria-hidden="true" />
              <b>
                Cotação de referência: {money(referenceQuote.value)} / @ (
                {record.quoteDifference !== null && record.quoteDifference >= 0
                  ? `${money(record.quoteDifference)} / @ acima`
                  : `${money(Math.abs(record.quoteDifference ?? 0))} / @ abaixo`}
                ). Despesas de venda (frete, taxas) ainda somam a este valor.
              </b>
            </div>
          </>
        ) : (
          <div>
            <span className="eyebrow">PONTO DE EQUILÍBRIO</span>
            <h2>Sem animais no saldo</h2>
            <p>
              {record.hasSale
                ? 'Todo o custo já saiu com as vendas. Veja o equilíbrio de cada venda na aba Vendas.'
                : 'Os animais saíram por baixa, sem venda. O custo ficou sem receita.'}
            </p>
          </div>
        )}
      </section>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Vendas
// ---------------------------------------------------------------------------

function Sales({
  record,
  onHelp,
  onSale,
  onSimulate,
  onOffers,
}: {
  record: LivestockRecord
  onHelp: () => void
  onSale: (price?: number) => void
  onSimulate: () => void
  onOffers: () => void
}) {
  const sales = salesForRecord(record.slug)
  const canSell = record.balance > 0 && !record.locked && !record.inactive
  const vsQuote = lotOffer.price - referenceQuote.value
  const vsBreakEven = record.breakEven !== null ? lotOffer.price - record.breakEven : null
  return (
    <div className="sales-layout">
      {sales.length === 0 ? (
        <section className="detail-panel">
          <StateView
            type="empty"
            title="Nenhuma venda registrada"
            text={
              canSell
                ? 'Simule com a cotação de referência e registre a venda quando fechar negócio.'
                : 'Este registro não tem animais no saldo para vender.'
            }
            actionLabel={canSell ? 'Registrar venda' : ''}
            onAction={() => onSale()}
          />
        </section>
      ) : (
        sales.map((sale) => (
          <section className="detail-panel" key={sale.id}>
            <div className="detail-panel__heading">
              <div>
                <span className="eyebrow">VENDA EM {sale.date}</span>
                <h2>
                  {sale.heads} {sale.heads === 1 ? 'animal vendido' : 'animais vendidos'} ·{' '}
                  {sale.buyer}
                </h2>
              </div>
              <span className="rb-sale-badge">
                <CheckCircle2 aria-hidden="true" /> Registrada
              </span>
            </div>
            <p className="rb-muted-line">
              {decimal(sale.arrobas)} @ × {money(sale.price)} / @ · peso vivo{' '}
              {decimal(sale.liveWeight, 0)} kg · rendimento {sale.yieldRate}%
            </p>
            <dl className="sale-numbers">
              <div>
                <dt>Receita</dt>
                <dd>{money(sale.revenue)}</dd>
              </div>
              <div>
                <dt>Custo alocado ({money(sale.costPerHead)} por cabeça)</dt>
                <dd>− {money(sale.allocatedCost)}</dd>
              </div>
              <div>
                <dt>Margem bruta · sobre custos diretos</dt>
                <dd>{sale.grossMargin >= 0 ? '+' : '−'} {money(Math.abs(sale.grossMargin))}</dd>
              </div>
              <div>
                <dt>
                  Despesas da venda (
                  {sale.expenseLines.map((line) => `${line.name.toLowerCase()} ${money(line.value)}`).join(', ')})
                </dt>
                <dd>− {money(sale.expenses)}</dd>
              </div>
              <div>
                <dt>Margem líquida</dt>
                <dd>{sale.netMargin >= 0 ? '+' : '−'} {money(Math.abs(sale.netMargin))}</dd>
              </div>
              <div>
                <dt>Custo por @ · equilíbrio desta venda</dt>
                <dd>
                  {money(sale.costPerArroba)} / @ · {money(sale.breakEven)} / @
                </dd>
              </div>
            </dl>
            <MarginLabel balance={record.balance} hasSale onHelp={onHelp} />
            <p className="authorship">
              Lançado por {sale.author} em {sale.date}.
            </p>
          </section>
        ))
      )}
      {canSell && (
        <aside className="sale-cta">
          <TrendingUp aria-hidden="true" />
          <h2>Quer vender mais animais?</h2>
          <p>Simule com a cotação de referência antes de decidir.</p>
          <Button onClick={() => onSale()}>Registrar venda</Button>
          <Button variant="secondary" onClick={onSimulate}>
            Simular venda
          </Button>
          <small>
            Cotação registrada: {money(referenceQuote.value)} / @ · {referenceQuote.market} ·{' '}
            {referenceQuote.date}
          </small>
        </aside>
      )}
      {canSell && vsBreakEven !== null && (
        <section className="lot-offer-block">
          <div>
            <span className="eyebrow">OFERTA DE COMPRADOR · {lotOffer.date}</span>
            <h2>
              {lotOffer.buyer} · {money(lotOffer.price)} / @
            </h2>
            <ul className="rb-offer-compare">
              <li className={vsQuote < 0 ? 'loss' : 'gain'}>
                {vsQuote < 0 ? <TrendingDown aria-hidden="true" /> : <TrendingUp aria-hidden="true" />}
                {money(Math.abs(vsQuote))} / @ {vsQuote < 0 ? 'abaixo' : 'acima'} da cotação de
                referência
              </li>
              <li className={vsBreakEven < 0 ? 'loss' : 'gain'}>
                {vsBreakEven < 0 ? <TrendingDown aria-hidden="true" /> : <TrendingUp aria-hidden="true" />}
                {money(Math.abs(vsBreakEven))} / @ {vsBreakEven < 0 ? 'abaixo' : 'acima'} do seu
                ponto de equilíbrio{vsBreakEven < 0 ? ': vender por este preço dá prejuízo' : ''}
              </li>
            </ul>
          </div>
          <div className="rb-offer-actions">
            <Button onClick={() => onSale(lotOffer.price)}>Registrar venda com este preço</Button>
            <Button variant="secondary" onClick={onOffers}>
              Ver ofertas
            </Button>
          </div>
          <small>Oferta é só referência. Ela não vira venda sozinha.</small>
        </section>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Histórico
// ---------------------------------------------------------------------------

type HistoryEvent = {
  id: string
  type: string
  date: string
  title: string
  text: string
  icon: typeof Wheat
  badge?: string
}

function useHistoryEvents(record: LivestockRecord): HistoryEvent[] {
  const corrections = useCorrections(record.slug)
  const individual = record.kind === 'Individual'
  const events: HistoryEvent[] = []
  if (record.original > 0) {
    events.push({
      id: 'formacao',
      type: 'Entradas',
      date: record.formationDate,
      title: individual ? 'Animal cadastrado' : `Lote formado com ${record.original} animais`,
      text:
        (record.acquisitionCost ? `Aquisição ${money(record.acquisitionCost)} · ` : '') +
        'lançado por João Batista',
      icon: ArrowUpRight,
    })
  }
  for (const cost of recentCosts[record.slug] ?? []) {
    events.push({
      id: `custo-${cost.date}-${cost.category}`,
      type: 'Custos',
      date: cost.date,
      title: `${cost.category} · ${cost.item}`,
      text: `${cost.supplier} · ${money(cost.value)} · lançado por ${cost.author}`,
      icon: Wheat,
    })
    if (cost.note) {
      events.push({
        id: `nota-${cost.date}-${cost.category}`,
        type: 'Notas',
        date: cost.date,
        title: 'Nota fiscal anexada',
        text: `${cost.category} · ${cost.supplier} · ${money(cost.value)}`,
        icon: FileText,
      })
    }
  }
  for (const sale of salesForRecord(record.slug)) {
    events.push({
      id: sale.id,
      type: 'Vendas',
      date: sale.date,
      title: `Venda de ${sale.heads} animais · ${sale.buyer}`,
      text: `Margem líquida sobre custos diretos: ${sale.netMargin >= 0 ? '+' : '−'} ${money(Math.abs(sale.netMargin))} · lançado por ${sale.author}`,
      icon: TrendingUp,
    })
    events.push({
      id: `${sale.id}-status`,
      type: 'Status',
      date: sale.date,
      title: 'Status alterado automaticamente',
      text: sale.closesRecord
        ? 'Vendido: o saldo chegou a zero com a venda'
        : `Parcialmente vendido após a venda de ${sale.heads} animais`,
      icon: CircleDot,
    })
  }
  record.writeOffs.forEach((writeOff, index) => {
    events.push({
      id: `baixa-${index}`,
      type: 'Baixas',
      date: writeOff.date,
      title: `Baixa por ${writeOff.type.toLowerCase()} · ${writeOff.heads} animais`,
      text: 'Custo mantido no lote · lançado por Ana Batista',
      icon: ArrowDownLeft,
    })
  })
  if (record.status === 'Encerrado' && record.writeOffs.length) {
    events.push({
      id: 'status-encerrado',
      type: 'Status',
      date: record.writeOffs[record.writeOffs.length - 1].date,
      title: 'Status alterado automaticamente',
      text: 'Encerrado: todos os animais saíram por baixa, sem venda',
      icon: CircleDot,
    })
  }
  if (record.status === 'Pronto para venda') {
    events.push({
      id: 'status-pronto',
      type: 'Status',
      date: '01/11/2026',
      title: 'Marcado como pronto para venda',
      text: 'Alterado por João Batista',
      icon: CircleDot,
    })
  }
  if (record.slug === 'lote-safra-24') {
    events.push(
      {
        id: 'safra-baixa',
        type: 'Baixas',
        date: '22/09/2026',
        title: 'Baixa por morte · 1 animal',
        text: 'Lançada por Ana Batista · estornada em 18/11/2026',
        icon: ArrowDownLeft,
        badge: 'Estornada',
      },
      {
        id: 'safra-estorno',
        type: 'Estornos',
        date: '18/11/2026',
        title: 'Baixa de 22/09/2026 estornada',
        text: 'Animal #14 voltou ao saldo · por João Batista',
        icon: RotateCcw,
      },
      {
        id: 'safra-pulado',
        type: 'Previstos',
        date: '05/10/2026',
        title: 'Ração mensal · previsto de 05/10/2026 pulado',
        text: 'Recorrência mensal · não entrou no custo · por João Batista',
        icon: SkipForward,
        badge: 'Pulado',
      },
    )
  }
  for (const correction of corrections) {
    events.push({
      id: correction.id,
      type: 'Correções',
      date: correction.date,
      title: `Correção com justificativa · ${correction.target}`,
      text: `Antes: ${correction.before} · Depois: ${correction.after} · “${correction.reason}” · por ${correction.author}`,
      icon: Edit3,
      badge: 'Correção',
    })
  }
  return events.sort((a, b) => sortKey(b.date).localeCompare(sortKey(a.date)))
}

const historyTypes = [
  'Todos',
  'Custos',
  'Notas',
  'Vendas',
  'Entradas',
  'Baixas',
  'Estornos',
  'Previstos',
  'Status',
  'Correções',
]

function History({ record }: { record: LivestockRecord }) {
  const [params, setParams] = useSearchParams()
  const filter = params.get('tipo') || 'Todos'
  const period = params.get('periodo') || 'Todo o período'
  const events = useHistoryEvents(record).filter(
    (event) =>
      (filter === 'Todos' || event.type === filter) &&
      (period === 'Todo o período' ||
        (period === 'Últimos 30 dias'
          ? daysBetween(event.date) <= 30
          : event.date.slice(-4) === TODAY.slice(-4))),
  )
  function set(key: string, value: string, fallback: string) {
    const next = new URLSearchParams(params)
    if (value === fallback) next.delete(key)
    else next.set(key, value)
    setParams(next)
  }
  return (
    <section className="detail-panel full-panel">
      <div className="history-toolbar">
        <div>
          <span className="eyebrow">TUDO EM ORDEM</span>
          <h2>Histórico do {record.kind === 'Individual' ? 'animal' : 'lote'}</h2>
        </div>
        <label>
          <Filter aria-hidden="true" />
          Tipo
          <select value={filter} onChange={(event) => set('tipo', event.target.value, 'Todos')}>
            {historyTypes.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </label>
        <label>
          <CalendarClock aria-hidden="true" />
          Período
          <select
            value={period}
            onChange={(event) => set('periodo', event.target.value, 'Todo o período')}
          >
            <option>Todo o período</option>
            <option>Últimos 30 dias</option>
            <option>Este ano</option>
          </select>
        </label>
      </div>
      {events.length === 0 ? (
        <StateView
          type="empty"
          title="Nada neste filtro"
          text="Mude o tipo ou o período para ver outros acontecimentos."
          actionLabel=""
        />
      ) : (
        <ol className="timeline">
          {events.map(({ id, date, title, text, icon: Icon, badge }) => (
            <li key={id} className={badge === 'Estornada' ? 'is-reversed' : ''}>
              <time>{date}</time>
              <span aria-hidden="true">
                <Icon />
              </span>
              <p>
                <strong>
                  {title}
                  {badge && (
                    <em className={`rb-history-badge rb-history-badge--${badge.toLowerCase()}`}>
                      {badge === 'Pulado' ? (
                        <SkipForward aria-hidden="true" />
                      ) : badge === 'Estornada' ? (
                        <RotateCcw aria-hidden="true" />
                      ) : (
                        <Edit3 aria-hidden="true" />
                      )}
                      {badge}
                    </em>
                  )}
                </strong>
                <small>{text}</small>
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
