import { useState } from 'react'
import { useNavigate } from 'react-router'
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  CircleDot,
  CircleHelp,
  LockKeyhole,
  PackageCheck,
  RotateCcw,
  Sprout,
  TrendingUp,
} from 'lucide-react'
import type { LivestockRecord, RecordStatus } from '@/shared/demo/data'
import { isQuoteStale, money, QUOTE_STALE_DAYS, referenceQuote, round2 } from '@/shared/demo/data'
import { addCorrection } from '@/shared/demo/corrections'
import { useActiveProperty } from '@/shared/routing/navigation'
import { Button, Field, Modal, Toast } from '@/shared/ui/UI'

const statusConfig = {
  'Em produção': { icon: Sprout, tone: 'production' },
  'Pronto para venda': { icon: PackageCheck, tone: 'ready' },
  'Parcialmente vendido': { icon: CircleDot, tone: 'partial' },
  Vendido: { icon: CheckCircle2, tone: 'sold' },
  Encerrado: { icon: Ban, tone: 'closed' },
} satisfies Record<RecordStatus, { icon: typeof Sprout; tone: string }>

export function StatusBadge({ status }: { status: RecordStatus }) {
  const { icon: Icon, tone } = statusConfig[status]
  return (
    <span className={`status-badge status-badge--${tone}`}>
      <Icon aria-hidden="true" />
      {status}
    </span>
  )
}

export function StatusAction({
  status,
  kind = 'Lote',
  onChange,
}: {
  status: RecordStatus
  /** Define o sujeito do aviso: "Lote …" ou "Animal …". */
  kind?: 'Lote' | 'Individual'
  /** Sem onChange, o componente guarda o status localmente e avisa com um toast. */
  onChange?: (next: RecordStatus) => void
}) {
  const [localStatus, setLocalStatus] = useState<RecordStatus>(status)
  const [toast, setToast] = useState<string | null>(null)
  const current = onChange ? status : localStatus
  if (current !== 'Em produção' && current !== 'Pronto para venda') {
    return (
      <p className="status-explainer">
        Este status é automático e muda conforme as vendas ou baixas.
      </p>
    )
  }
  const next: RecordStatus = current === 'Em produção' ? 'Pronto para venda' : 'Em produção'
  return (
    <div className="status-action">
      {!onChange && <StatusBadge status={current} />}
      <Button
        variant="secondary"
        onClick={() => {
          if (onChange) onChange(next)
          else setLocalStatus(next)
          setToast(
            next === 'Pronto para venda'
              ? `${kind === 'Individual' ? 'Animal marcado' : 'Lote marcado'} como pronto para venda.`
              : `${kind === 'Individual' ? 'Animal voltou' : 'Lote voltou'} para em produção.`,
          )
        }}
      >
        {current === 'Em produção' ? 'Marcar como pronto para venda' : 'Voltar para em produção'}
      </Button>
      <small>Os status de venda e encerramento são definidos automaticamente.</small>
      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  )
}

export function CalculationContent() {
  return (
    <div className="calculation-help">
      <p>O custo acompanha os animais que ainda estão no lote e usa somente valores confirmados.</p>
      <ol>
        <li>
          <span>1</span>
          <div>
            <strong>Atualizamos o custo por cabeça</strong>
            <p>
              Um lote de 10 cabeças gastou R$ 5.000,00. Você vendeu 3: cada cabeça custou R$ 500,00,
              então R$ 1.500,00 saíram com a venda. Depois você gastou mais R$ 700,00. Agora sobram
              R$ 4.200,00 para 7 cabeças: R$ 600,00 por cabeça.
            </p>
          </div>
        </li>
        <li>
          <span>2</span>
          <div>
            <strong>Calculamos as arrobas</strong>
            <p>
              Uma arroba equivale a 15 kg de carcaça. Quando há peso vivo, usamos: peso vivo ×
              rendimento de carcaça ÷ 15. O padrão da Fazenda da Baixada é 50%.
            </p>
          </div>
        </li>
        <li>
          <span>3</span>
          <div>
            <strong>Encontramos o ponto de equilíbrio</strong>
            <p>
              Somamos o custo por arroba às despesas de venda por arroba. Esse é o valor mínimo em
              R$ / @ para não ter prejuízo sobre custos diretos.
            </p>
          </div>
        </li>
        <li>
          <span>4</span>
          <div>
            <strong>Separamos previsto de confirmado</strong>
            <p>
              Um gasto previsto pode mudar ou nem acontecer. Por isso, só entra no custo depois que
              você confirma.
            </p>
          </div>
        </li>
      </ol>
      <div className="help-note">
        <AlertTriangle /> A margem considera só os custos ligados ao lote. Custos gerais da
        propriedade (diesel, cercas, trator) ainda não entram, então a margem real tende a ser
        menor.
      </div>
    </div>
  )
}

export function CalculationHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Como calculamos">
      <CalculationContent />
    </Modal>
  )
}

export function MarginLabel({
  balance,
  hasSale,
  onHelp,
}: {
  balance?: number
  /**
   * Há venda não estornada no registro. "parcial" só aparece com venda E saldo > 0.
   * Se não for informado, mantém o comportamento antigo (só o saldo) — passe sempre.
   */
  hasSale?: boolean
  onHelp: () => void
}) {
  const withBalance = typeof balance === 'number' && balance > 0
  const partial = withBalance && (hasSale ?? true)
  return (
    <span className="margin-label">
      sobre custos diretos
      {partial ? <b>parcial</b> : null}
      <button
        type="button"
        className="icon-button"
        onClick={onHelp}
        aria-label="Abrir Como calculamos"
      >
        <CircleHelp aria-hidden="true" />
      </button>
      {partial ? (
        <small>
          {balance === 1
            ? 'Ainda há 1 animal no lote. A margem final depende das próximas vendas.'
            : `Ainda há ${balance} animais no lote. A margem final depende das próximas vendas.`}
        </small>
      ) : null}
    </span>
  )
}

type QuoteInfo = {
  category: string
  market: string
  value: number
  date: string
  age: number
  source: string
}

export function ReferenceQuote({
  onRegister,
  quote = referenceQuote,
}: {
  /** Sem onRegister, o botão leva a /fazenda/:id/mercado?acao=registrar. */
  onRegister?: () => void
  quote?: QuoteInfo
}) {
  const navigate = useNavigate()
  const { base } = useActiveProperty()
  const stale = isQuoteStale(quote.age)
  const register = onRegister ?? (() => navigate(`${base}/mercado?acao=registrar`))
  return (
    <article className="reference-quote">
      <div>
        <TrendingUp aria-hidden="true" />
        <span>
          <strong>Cotação de referência</strong>
          <small>
            {quote.category} · {quote.market} · {money(quote.value)} / @ · registrada em{' '}
            {quote.date}, {quote.age === 0 ? 'hoje' : quote.age === 1 ? 'há 1 dia' : `há ${quote.age} dias`}{' '}
            · fonte: {quote.source}
          </small>
        </span>
      </div>
      {stale ? (
        <div className="quote-stale">
          <AlertTriangle aria-hidden="true" />
          <span>
            <strong>Pode estar desatualizada</strong>
            <small>Esta cotação tem mais de {QUOTE_STALE_DAYS} dias.</small>
          </span>
          <button type="button" onClick={register}>
            Registrar cotação de hoje
          </button>
        </div>
      ) : null}
    </article>
  )
}

export function QuoteComparison({
  costPerArroba,
  breakEven,
  record,
  quoteValue = referenceQuote.value,
  breakEvenLabel = 'Ponto de equilíbrio',
}: {
  costPerArroba?: number | null
  breakEven?: number | null
  /** Usa costPerArroba e breakEven do registro. Registro sem saldo não mostra o comparativo. */
  record?: Pick<LivestockRecord, 'costPerArroba' | 'breakEven'>
  quoteValue?: number
  breakEvenLabel?: string
}) {
  const cost = record ? record.costPerArroba : costPerArroba
  const even = record ? record.breakEven : breakEven
  if (cost == null || even == null) return null
  const difference = round2(quoteValue - even)
  const tone = difference < 0 ? 'loss' : difference > 0 ? 'gain' : 'even'
  const Icon = tone === 'loss' ? AlertTriangle : tone === 'gain' ? TrendingUp : CircleDot
  return (
    <section className="quote-comparison" aria-label="Comparativo com a cotação de referência">
      <div>
        <span>Cotação de referência</span>
        <strong>{money(quoteValue)} / @</strong>
      </div>
      <div>
        <span>Custo por arroba</span>
        <strong>{money(cost)} / @</strong>
      </div>
      <div>
        <span>{breakEvenLabel}</span>
        <strong>{money(even)} / @</strong>
      </div>
      <div className={`quote-${tone}`}>
        <Icon aria-hidden="true" />
        <span>
          <strong>
            {tone === 'loss'
              ? `${money(Math.abs(difference))} / @ abaixo`
              : tone === 'gain'
                ? `${money(difference)} / @ acima`
                : 'Empatada'}
          </strong>
          <small>
            {tone === 'loss'
              ? `A cotação está ${money(Math.abs(difference))} / @ abaixo do seu ponto de equilíbrio. Vender agora dá prejuízo.`
              : tone === 'gain'
                ? `A cotação está ${money(difference)} / @ acima do seu ponto de equilíbrio.`
                : 'A cotação está igual ao seu ponto de equilíbrio. Vender agora não dá lucro.'}
          </small>
        </span>
      </div>
    </section>
  )
}

export function SoldLockBanner({
  item = 'Lote',
  recordSlug = 'lote-recria-23',
  target = 'Venda total do lote',
  before = '19 animais · 03/06/2026',
}: {
  item?: string
  /** Registro que recebe a correção no Histórico. */
  recordSlug?: string
  target?: string
  before?: string
}) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [newValue, setNewValue] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const reasonInvalid = reason.trim().length < 10
  const valueInvalid = newValue.trim().length === 0
  const reasonErrorId = `correcao-motivo-erro-${recordSlug}`
  return (
    <>
      <section className="sold-lock">
        <LockKeyhole aria-hidden="true" />
        <div>
          <strong>{item} vendido. Os dados estão travados para manter o resultado correto.</strong>
          <small>Custos e vendas ficam somente leitura.</small>
        </div>
        <Button variant="secondary" onClick={() => setOpen(true)}>
          Corrigir com justificativa
        </Button>
      </section>
      <Modal open={open} onClose={() => setOpen(false)} title="Corrigir com justificativa">
        <form
          className="form-stack"
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            setSubmitted(true)
            if (reasonInvalid || valueInvalid) return
            addCorrection({ recordSlug, target, before, after: newValue.trim(), reason: reason.trim() })
            setOpen(false)
            setReason('')
            setNewValue('')
            setSubmitted(false)
            setToast('Correção salva no Histórico do lote.')
          }}
        >
          <p className="modal-copy">
            A correção ficará registrada com autor, data, justificativa e valores anteriores.
          </p>
          <div className="correction-values">
            <div>
              <span>O que será corrigido</span>
              <strong>{target}</strong>
            </div>
            <div>
              <span>Antes</span>
              <strong>{before}</strong>
            </div>
          </div>
          <Field
            label="Novo valor"
            name={`correcao-novo-valor-${recordSlug}`}
            value={newValue}
            onChange={(event) => setNewValue(event.target.value)}
            placeholder={before}
            error={submitted && valueInvalid ? 'Informe o novo valor.' : undefined}
          />
          <label className="textarea-field">
            <span>Por que esta correção?</span>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={4}
              aria-invalid={submitted && reasonInvalid}
              aria-describedby={submitted && reasonInvalid ? reasonErrorId : undefined}
              placeholder="Explique o motivo em pelo menos 10 caracteres."
            />
            {submitted && reasonInvalid && (
              <small className="field__error" id={reasonErrorId}>
                Escreva pelo menos 10 caracteres para justificar.
              </small>
            )}
          </label>
          <div className="modal__actions">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" icon={<RotateCcw aria-hidden="true" />}>
              Salvar correção
            </Button>
          </div>
        </form>
      </Modal>
      <Toast message={toast} onClose={() => setToast(null)} />
    </>
  )
}
