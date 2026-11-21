/*
 * Registrar compra — foto → dados da nota (com "Como foi pago?") → itens → revisar e salvar.
 *
 * Estado na rota:
 *   ?origem=camera|galeria|sem-nota   como a compra começou
 *   ?etapa=1|2|3|4|concluida          etapa atual (1 = foto; sem nota começa na 2)
 *
 * Parâmetros de demonstração (sem botões na interface):
 *   ?conexao=off   faixa "Sem conexão. Nada do que você preencheu foi perdido."
 *   ?foto=falha    falha no envio da foto, com "Enviar a foto de novo" (precisa de origem com foto)
 *   ?rascunho=1    pergunta "Continuar a compra iniciada hoje às 09:42?"
 */
import { useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import {
  ArrowLeft,
  CalendarClock,
  Camera,
  Check,
  ChevronRight,
  Eye,
  FileImage,
  ImagePlus,
  Info,
  Lock,
  Maximize2,
  Plus,
  RefreshCw,
  RotateCw,
  Save,
  ScanLine,
  Split,
  Trash2,
  WifiOff,
  ZoomIn,
} from 'lucide-react'
import { motion } from 'motion/react'
import AppShell from '@/shared/layout/AppShell'
import { Button, Field, Modal, StateView, Toast } from '@/shared/ui/UI'
import { PaymentChoice, ReceiptMock } from '@/features/costs/pages/CostsPage'
import {
  TODAY_ISO,
  addPeriod,
  isoToBr,
  parseMoney,
  periodicities,
  supplierOptions,
  useActiveDestinations,
  type Periodicity,
} from '@/features/costs/components/PredictedCostModal'
import { costCategories, decimal, money } from '@/shared/demo/data'
import { propertyNotFoundCopy, useActiveProperty } from '@/shared/routing/navigation'

type Source = 'camera' | 'galeria' | 'sem-nota'
type PaymentMode = 'paid' | 'payable'

type PaymentState = { mode: PaymentMode; paidDate: string; dueDate: string }

type Item = {
  id: number
  description: string
  value: string
  category: string
  destination: string
  split: boolean
  shares: Record<string, string>
  recurring: boolean
  periodicity: Periodicity
  /** null = calculada pela periodicidade. */
  nextDate: string | null
  /** null = usa o pagamento da nota. */
  payment: PaymentState | null
}

type NoteState = {
  supplier: string
  number: string
  date: string
  total: string
  payment: PaymentState
}

/** Última compra de cada fornecedor (para a sugestão RN15). */
const lastPurchase: Record<string, { description: string; category: string }> = {
  'Agropecuária Ponte Nova': { description: 'Sal mineral proteinado', category: 'Suplemento' },
  'Vet Rural': { description: 'Vacina contra clostridiose', category: 'Medicamento' },
  'Casa do Criador': { description: 'Ração de recria 18%', category: 'Ração' },
  'Carlos Andrade': { description: 'Locação de pasto', category: 'Locação de pasto' },
}

const initialNote: NoteState = {
  supplier: 'Agropecuária Ponte Nova',
  number: '',
  date: '2026-11-05',
  total: '2.400,00',
  payment: { mode: 'paid', paidDate: '', dueDate: '' },
}

function newItem(id: number, destination: string): Item {
  return {
    id,
    description: '',
    value: id === 1 ? '2.184,70' : '',
    category: '',
    destination,
    split: false,
    shares: {},
    recurring: false,
    periodicity: 'Mensal',
    nextDate: null,
    payment: null,
  }
}

function nextDateOf(item: Item, purchaseDate: string) {
  return item.nextDate ?? brIso(addPeriod(isoToBr(purchaseDate), item.periodicity))
}
function brIso(value: string) {
  const [day, month, year] = value.split('/')
  return `${year}-${month}-${day}`
}
function paymentLabel(payment: PaymentState, purchaseDate: string) {
  return payment.mode === 'paid'
    ? `Pago em ${isoToBr(payment.paidDate || purchaseDate)}`
    : `A pagar · vence ${isoToBr(payment.dueDate)}`
}

/** Lançamentos gerados por um item (um por lote quando dividido). */
function postingsOf(item: Item) {
  const value = parseMoney(item.value) || 0
  if (!item.split) return [{ destination: item.destination, value, share: 100 }]
  return Object.entries(item.shares).map(([destination, share]) => {
    const pct = parseMoney(share) || 0
    return { destination, value: Math.round(value * pct) / 100, share: pct }
  })
}

export default function PurchasePage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { base, found } = useActiveProperty()
  const destinations = useActiveDestinations()
  const source = (params.get('origem') as Source | null) ?? null
  const hasPhoto = source === 'camera' || source === 'galeria'
  const rawStep = params.get('etapa')
  const done = rawStep === 'concluida'
  const step = Math.min(Math.max(Number(rawStep) || (hasPhoto ? 1 : 2), hasPhoto ? 1 : 2), 4)
  const offline = params.get('conexao') === 'off'
  const uploadFailed = params.get('foto') === 'falha' && hasPhoto
  const draftAvailable = params.get('rascunho') === '1'

  const [note, setNote] = useState<NoteState>(initialNote)
  const [items, setItems] = useState<Item[]>([newItem(1, destinations[0]?.name ?? '')])
  const [compressing, setCompressing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [photoOpen, setPhotoOpen] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [zoomed, setZoomed] = useState(false)
  const [toast, setToast] = useState<{ message: string; tone?: 'success' | 'error' } | null>(
    null,
  )

  function go(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params)
    Object.entries(changes).forEach(([key, value]) => {
      if (value) next.set(key, value)
      else next.delete(key)
    })
    setParams(next)
  }

  function chooseSource(next: Source) {
    if (next === 'sem-nota') {
      go({ origem: next, etapa: '2' })
      return
    }
    go({ origem: next, etapa: '1' })
    setCompressing(true)
    setProgress(18)
    window.setTimeout(() => setProgress(68), 350)
    window.setTimeout(() => {
      setProgress(100)
      setCompressing(false)
    }, 800)
  }

  function restart() {
    setNote(initialNote)
    setItems([newItem(1, destinations[0]?.name ?? '')])
    setParams(new URLSearchParams())
  }

  function updateItem(id: number, patch: Partial<Item>) {
    setItems((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)))
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

  const totalSteps = hasPhoto ? 4 : 3
  const stepNumber = hasPhoto ? step : step - 1

  return (
    <AppShell>
      <div className="purchase-page">
        <header className="purchase-header">
          <button className="back-link" onClick={() => navigate(`${base}/custos`)}>
            <ArrowLeft aria-hidden="true" /> Voltar para custos
          </button>
          <div>
            <span className="eyebrow">NOVA COMPRA</span>
            <h1>Registrar compra</h1>
            <p>Da nota ao custo do lote, sem complicação.</p>
          </div>
          {!done && source && (
            <div className="purchase-progress">
              <span>
                Etapa {stepNumber} de {totalSteps}
              </span>
              <div aria-hidden="true">
                {Array.from({ length: totalSteps }, (_, index) => (
                  <i className={index < stepNumber ? 'active' : ''} key={index} />
                ))}
              </div>
            </div>
          )}
        </header>
        {draftAvailable && !done && (
          <aside className="draft-banner">
            <Save aria-hidden="true" />
            <span>
              <strong>Continuar a compra iniciada hoje às 09:42?</strong>
              <small>O rascunho ficou guardado neste aparelho.</small>
            </span>
            <Button
              variant="secondary"
              onClick={() => {
                go({ rascunho: null, origem: 'camera', etapa: '3' })
                setToast({ message: 'Compra retomada de onde você parou.' })
              }}
            >
              Continuar
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                go({ rascunho: null })
                setToast({ message: 'Rascunho descartado.' })
              }}
            >
              Descartar
            </Button>
          </aside>
        )}
        {offline && (
          <aside className="offline-banner" role="status">
            <WifiOff aria-hidden="true" />
            <span>
              <strong>Sem conexão. Nada do que você preencheu foi perdido.</strong>
            </span>
            <Button variant="secondary" onClick={() => go({ conexao: null })}>
              Tentar de novo
            </Button>
          </aside>
        )}

        {done ? (
          <Success
            items={items}
            purchaseDate={note.date}
            onRestart={restart}
            onDone={() => navigate(`${base}/custos`)}
          />
        ) : source === null ? (
          <SourceChoice onChoose={chooseSource} />
        ) : (
          <div className={`purchase-workspace ${!hasPhoto ? 'purchase-workspace--no-photo' : ''}`}>
            {hasPhoto && (
              <ReceiptAside
                onOpen={() => setPhotoOpen(true)}
                onRotate={() => {
                  setRotation((value) => (value + 90) % 360)
                  setPhotoOpen(true)
                }}
                onRetake={() => go({ origem: null, etapa: null })}
              />
            )}
            <motion.main
              className="purchase-form"
              key={step}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
            >
              {uploadFailed && (
                <aside className="upload-error" role="alert">
                  <WifiOff aria-hidden="true" />
                  <p>
                    <strong>Não conseguimos enviar a foto. Seus dados estão guardados.</strong>
                  </p>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      go({ foto: null })
                      setToast({ message: 'Foto enviada.' })
                    }}
                  >
                    Enviar a foto de novo
                  </Button>
                </aside>
              )}
              {compressing ? (
                <Compressing progress={progress} />
              ) : (
                <>
                  {step === 1 && (
                    <PhotoStep
                      onNext={() => go({ etapa: '2' })}
                      onRetake={() => go({ origem: null, etapa: null })}
                    />
                  )}
                  {step === 2 && (
                    <NoteDataStep
                      note={note}
                      setNote={setNote}
                      noPhoto={!hasPhoto}
                      onAttach={() => go({ origem: 'galeria' })}
                      onNext={() => go({ etapa: '3' })}
                      onBack={() =>
                        hasPhoto ? go({ etapa: '1' }) : go({ origem: null, etapa: null })
                      }
                      onPredicted={() => navigate(`${base}/custos?aba=confirmar&novo=previsto`)}
                    />
                  )}
                  {step === 3 && (
                    <ItemsStep
                      note={note}
                      items={items}
                      setItems={setItems}
                      updateItem={updateItem}
                      hasPhoto={hasPhoto}
                      onNext={() => go({ etapa: '4' })}
                      onBack={() => go({ etapa: '2' })}
                    />
                  )}
                  {step === 4 && (
                    <ReviewStep
                      hasPhoto={hasPhoto}
                      note={note}
                      items={items}
                      onBack={() => go({ etapa: '3' })}
                      onSave={() => {
                        if (offline) {
                          setToast({
                            message:
                              'Sem conexão. A compra fica guardada no aparelho; tente salvar de novo quando a conexão voltar.',
                            tone: 'error',
                          })
                          return
                        }
                        go({ etapa: 'concluida' })
                        setToast({ message: 'Compra salva. O custo já entrou nos destinos escolhidos.' })
                      }}
                    />
                  )}
                </>
              )}
            </motion.main>
          </div>
        )}
      </div>
      <Modal open={photoOpen} onClose={() => setPhotoOpen(false)} title="Foto da nota">
        <div className="receipt-fullscreen">
          <div
            className="receipt-photo"
            style={{ transform: `rotate(${rotation}deg) scale(${zoomed ? 1.4 : 1})` }}
          >
            <ReceiptMock compact={false} />
          </div>
          <div className="photo-tools">
            <Button
              variant="secondary"
              icon={<ZoomIn aria-hidden="true" />}
              aria-pressed={zoomed}
              onClick={() => setZoomed(!zoomed)}
            >
              {zoomed ? 'Afastar' : 'Aproximar'}
            </Button>
            <Button
              variant="secondary"
              icon={<RotateCw aria-hidden="true" />}
              onClick={() => setRotation((value) => (value + 90) % 360)}
            >
              Girar
            </Button>
          </div>
        </div>
      </Modal>
      <Toast message={toast?.message ?? null} tone={toast?.tone} onClose={() => setToast(null)} />
    </AppShell>
  )
}

function SourceChoice({ onChoose }: { onChoose: (source: Source) => void }) {
  return (
    <section className="source-choice">
      <div className="source-choice__intro">
        <span className="eyebrow">COMO QUER COMEÇAR?</span>
        <h2>A nota ajuda você a guardar cada detalhe</h2>
        <p>Escolha uma opção. Você poderá revisar tudo antes de salvar.</p>
      </div>
      <div className="source-grid">
        <button className="source-card source-card--featured" onClick={() => onChoose('camera')}>
          <span>
            <Camera aria-hidden="true" />
          </span>
          <div>
            <strong>Tirar foto da nota</strong>
            <small>Abra a câmera e enquadre o documento</small>
          </div>
          <ChevronRight aria-hidden="true" />
        </button>
        <button className="source-card" onClick={() => onChoose('galeria')}>
          <span>
            <ImagePlus aria-hidden="true" />
          </span>
          <div>
            <strong>Escolher da galeria</strong>
            <small>Use uma foto que já está no aparelho</small>
          </div>
          <ChevronRight aria-hidden="true" />
        </button>
        <button className="source-card" onClick={() => onChoose('sem-nota')}>
          <span>
            <FileImage aria-hidden="true" />
          </span>
          <div>
            <strong>Lançar sem nota</strong>
            <small>Registre o custo e anexe uma foto depois</small>
          </div>
          <ChevronRight aria-hidden="true" />
        </button>
      </div>
      <div className="privacy-note">
        <Lock aria-hidden="true" />
        <span>
          <strong>Sua privacidade vem primeiro</strong>
          <small>Só os membros desta propriedade veem as fotos das notas.</small>
        </span>
      </div>
      <button className="auto-read" disabled>
        <ScanLine aria-hidden="true" />
        <span>
          <strong>Ler nota automaticamente</strong>
          <small>Em breve</small>
        </span>
      </button>
    </section>
  )
}

function ReceiptAside({
  onOpen,
  onRotate,
  onRetake,
}: {
  onOpen: () => void
  onRotate: () => void
  onRetake: () => void
}) {
  return (
    <aside className="receipt-aside compact">
      <div className="receipt-aside__heading">
        <span>
          <Eye aria-hidden="true" /> NOTA SEMPRE À VISTA
        </span>
        <button onClick={onOpen}>
          <Maximize2 aria-hidden="true" />
          Ampliar
        </button>
      </div>
      <button className="receipt-photo" onClick={onOpen} aria-label="Ampliar a foto da nota">
        <ReceiptMock compact={false} />
        <span>
          <ZoomIn aria-hidden="true" /> Toque para ampliar
        </span>
      </button>
      <div className="receipt-aside__actions">
        <button onClick={onRotate}>
          <RotateCw aria-hidden="true" />
          Girar
        </button>
        <button onClick={onRetake}>
          <RefreshCw aria-hidden="true" />
          Refazer
        </button>
      </div>
      <p>
        <Lock aria-hidden="true" /> Só os membros desta propriedade veem as fotos das notas.
      </p>
    </aside>
  )
}

function Compressing({ progress }: { progress: number }) {
  return (
    <div className="compressing" role="status" aria-live="polite">
      <span>
        <FileImage aria-hidden="true" />
      </span>
      <h2>Reduzindo o tamanho da imagem…</h2>
      <p>Assim a foto abre mais rápido, sem perder a leitura.</p>
      <div>
        <i style={{ transform: `scaleX(${progress / 100})` }} />
      </div>
      <strong>{progress}%</strong>
    </div>
  )
}

function StepHeading({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <div className="purchase-step-heading">
      <span>{number}</span>
      <div>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
    </div>
  )
}

function PhotoStep({ onNext, onRetake }: { onNext: () => void; onRetake: () => void }) {
  return (
    <>
      <StepHeading
        number="01"
        title="Confira a foto"
        text="Veja se todas as informações estão nítidas antes de continuar."
      />
      <div className="photo-mobile-preview">
        <ReceiptMock compact={false} />
      </div>
      <div className="framing-tip">
        <Info aria-hidden="true" />
        <p>
          <strong>Deixe a nota inteira na foto, com boa luz.</strong>
          <small>Evite sombras e confira se o valor total aparece.</small>
        </p>
      </div>
      <div className="form-footer">
        <Button variant="ghost" icon={<RefreshCw aria-hidden="true" />} onClick={onRetake}>
          Refazer
        </Button>
        <Button onClick={onNext}>
          Usar esta foto <ChevronRight aria-hidden="true" />
        </Button>
      </div>
    </>
  )
}

/** Pagamento: escolha + data (pago) ou vencimento (a pagar). */
function PaymentFields({
  payment,
  purchaseDate,
  dueError,
  onChange,
  label,
}: {
  payment: PaymentState
  purchaseDate: string
  dueError?: string
  onChange: (payment: PaymentState) => void
  label: string
}) {
  return (
    <>
      <PaymentChoice
        label={label}
        value={payment.mode}
        onChange={(mode) => onChange({ ...payment, mode })}
      />
      {payment.mode === 'paid' ? (
        <Field
          label="Data do pagamento"
          type="date"
          max={TODAY_ISO}
          value={payment.paidDate || purchaseDate}
          onChange={(event) => onChange({ ...payment, paidDate: event.target.value })}
        />
      ) : (
        <Field
          label="Vencimento"
          type="date"
          value={payment.dueDate}
          error={dueError}
          onChange={(event) => onChange({ ...payment, dueDate: event.target.value })}
        />
      )}
    </>
  )
}

function NoteDataStep({
  note,
  setNote,
  noPhoto,
  onAttach,
  onNext,
  onBack,
  onPredicted,
}: {
  note: NoteState
  setNote: (note: NoteState) => void
  noPhoto: boolean
  onAttach: () => void
  onNext: () => void
  onBack: () => void
  onPredicted: () => void
}) {
  const [dueError, setDueError] = useState('')
  const futureDate = note.date > TODAY_ISO
  function validate() {
    if (futureDate) return
    if (note.payment.mode === 'payable' && !note.payment.dueDate) {
      setDueError('Informe o vencimento')
      return
    }
    onNext()
  }
  return (
    <>
      <StepHeading
        number={noPhoto ? '01' : '02'}
        title={noPhoto ? 'Dados da compra' : 'Dados da nota'}
        text="Identifique a compra para encontrar esta nota facilmente depois."
      />
      {noPhoto && (
        <button className="attach-later" onClick={onAttach}>
          <ImagePlus aria-hidden="true" />
          <span>
            <strong>Anexar foto agora</strong>
            <small>Ou continue e anexe depois</small>
          </span>
          <ChevronRight aria-hidden="true" />
        </button>
      )}
      <div className="form-section purchase-section">
        <Field
          label={noPhoto ? 'Fornecedor (opcional)' : 'Fornecedor'}
          autoComplete="organization"
          value={note.supplier}
          placeholder="Comece a digitar para ver sugestões"
          onChange={(event) => setNote({ ...note, supplier: event.target.value })}
          list="purchase-suppliers"
        />
        <datalist id="purchase-suppliers">
          {supplierOptions.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
        {!noPhoto && (
          <Field
            label="Número da nota (opcional)"
            placeholder="Ex.: 18492"
            autoComplete="off"
            inputMode="numeric"
            value={note.number}
            onChange={(event) => setNote({ ...note, number: event.target.value })}
          />
        )}
        <div className="form-grid">
          <Field
            label="Data da compra"
            type="date"
            value={note.date}
            error={futureDate ? 'A compra ainda não aconteceu? Use Lançar previsto.' : undefined}
            onChange={(event) => setNote({ ...note, date: event.target.value })}
          />
          <Field
            label={noPhoto ? 'Valor total (opcional)' : 'Valor total'}
            inputMode="decimal"
            autoComplete="off"
            value={note.total}
            onChange={(event) => setNote({ ...note, total: event.target.value })}
            suffix={<span className="field-suffix">R$</span>}
          />
        </div>
        {futureDate && (
          <button className="inline-shortcut" onClick={onPredicted}>
            <CalendarClock aria-hidden="true" /> Lançar previsto
          </button>
        )}
      </div>
      <section className="form-section purchase-section payment-note">
        <PaymentFields
          label="Como foi pago?"
          payment={note.payment}
          purchaseDate={note.date}
          dueError={dueError}
          onChange={(payment) => {
            setNote({ ...note, payment })
            setDueError('')
          }}
        />
        <p className="field-help">
          Vale para todos os itens. Em Itens e custos, use “Definir por item” para mudar em uma
          linha.
        </p>
        <p className="payment-note__copy">
          <Info aria-hidden="true" /> Pago ou a pagar, a compra já entra no custo do lote. A
          situação serve para lembrar dos vencimentos.
        </p>
      </section>
      <div className="form-footer">
        <Button variant="ghost" onClick={onBack}>
          Voltar
        </Button>
        <Button onClick={validate} disabled={futureDate}>
          Continuar <ChevronRight aria-hidden="true" />
        </Button>
      </div>
    </>
  )
}

type ItemErrors = Record<number, { category?: string; value?: string; split?: string; due?: string }>

function ItemsStep({
  note,
  items,
  setItems,
  updateItem,
  hasPhoto,
  onNext,
  onBack,
}: {
  note: NoteState
  items: Item[]
  setItems: (updater: (rows: Item[]) => Item[]) => void
  updateItem: (id: number, patch: Partial<Item>) => void
  hasPhoto: boolean
  onNext: () => void
  onBack: () => void
}) {
  const destinations = useActiveDestinations()
  const [errors, setErrors] = useState<ItemErrors>({})
  const [extraCategories, setExtraCategories] = useState<string[]>([])
  const categories = [...costCategories, ...extraCategories]
  const noteTotal = parseMoney(note.total)
  const itemsTotal = items.reduce((sum, item) => sum + (parseMoney(item.value) || 0), 0)
  const missing = Number.isNaN(noteTotal) ? 0 : Math.round((noteTotal - itemsTotal) * 100) / 100

  function validate() {
    const next: ItemErrors = {}
    items.forEach((item) => {
      const itemErrors: ItemErrors[number] = {}
      if (!item.category) itemErrors.category = 'Escolha a categoria'
      if (!(parseMoney(item.value) > 0)) itemErrors.value = 'Informe o valor do item'
      if (item.split) {
        const sum = Object.values(item.shares).reduce((acc, share) => acc + (parseMoney(share) || 0), 0)
        if (Object.keys(item.shares).length < 2) itemErrors.split = 'Escolha pelo menos dois lotes'
        else if (Math.abs(sum - 100) > 0.01) itemErrors.split = 'A divisão precisa somar 100%'
      }
      if (item.payment?.mode === 'payable' && !item.payment.dueDate)
        itemErrors.due = 'Informe o vencimento'
      if (Object.keys(itemErrors).length) next[item.id] = itemErrors
    })
    setErrors(next)
    if (!Object.keys(next).length) onNext()
  }

  return (
    <>
      <StepHeading
        number={hasPhoto ? '03' : '02'}
        title="Itens e custos"
        text="Diga o que foi comprado e para onde esse custo deve ir."
      />
      {hasPhoto && (
        <div className="read-banner">
          <ScanLine aria-hidden="true" />
          <span>
            <strong>Confira os itens olhando a foto ao lado</strong>
            <small>A leitura automática da nota ainda não está disponível.</small>
          </span>
          <b>EM BREVE</b>
        </div>
      )}
      {items.map((item, index) => (
        <ItemEditor
          key={item.id}
          item={item}
          index={index}
          note={note}
          categories={categories}
          destinations={destinations.map((record) => ({ name: record.name, kind: record.kind }))}
          errors={errors[item.id] ?? {}}
          canRemove={items.length > 1}
          onRemove={() => setItems((rows) => rows.filter((row) => row.id !== item.id))}
          onChange={(patch) => {
            updateItem(item.id, patch)
            setErrors((current) => ({ ...current, [item.id]: {} }))
          }}
          onAddCategory={(name) => setExtraCategories((rows) => [...rows, name])}
        />
      ))}
      <Button
        variant="secondary"
        icon={<Plus aria-hidden="true" />}
        className="add-item-button"
        onClick={() =>
          setItems((rows) => [
            ...rows,
            { ...newItem(Math.max(...rows.map((row) => row.id)) + 1, destinations[0]?.name ?? ''), value: '' },
          ])
        }
      >
        Adicionar outro item
      </Button>
      {missing !== 0 && (
        <div className="sum-warning">
          <Info aria-hidden="true" />
          <span>
            <strong>
              {missing > 0
                ? `Falta lançar ${money(missing)}`
                : `Os itens passam o total da nota em ${money(-missing)}`}
            </strong>
            <small>
              Soma dos itens: {money(itemsTotal)} · Total da nota: {money(noteTotal)}
            </small>
          </span>
          <em>Isso não impede salvar</em>
        </div>
      )}
      <section className="bill-section bill-section--disabled">
        <button disabled aria-disabled="true">
          <span>
            <strong>Boleto desta nota</strong>
            <small>Registrar o boleto pela linha digitável</small>
          </span>
          <b>Em breve</b>
        </button>
      </section>
      <div className="form-footer">
        <Button variant="ghost" onClick={onBack}>
          Voltar
        </Button>
        <Button onClick={validate}>
          Revisar compra <ChevronRight aria-hidden="true" />
        </Button>
      </div>
    </>
  )
}

function ItemEditor({
  item,
  index,
  note,
  categories,
  destinations,
  errors,
  canRemove,
  onRemove,
  onChange,
  onAddCategory,
}: {
  item: Item
  index: number
  note: NoteState
  categories: string[]
  destinations: { name: string; kind: string }[]
  errors: ItemErrors[number]
  canRemove: boolean
  onRemove: () => void
  onChange: (patch: Partial<Item>) => void
  onAddCategory: (name: string) => void
}) {
  const [newCategoryOpen, setNewCategoryOpen] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const [newCategoryError, setNewCategoryError] = useState('')
  const supplierKey = note.supplier.replace(' (locação)', '').trim()
  const suggestion = lastPurchase[supplierKey]
  const showSuggestion = suggestion && !item.category
  const lots = destinations.filter((record) => record.kind === 'Lote')
  const label = `ITEM ${String(index + 1).padStart(2, '0')}`

  function toggleSplit() {
    if (item.split) {
      onChange({ split: false, shares: {} })
      return
    }
    const [first, second] = lots
    const shares: Record<string, string> = {}
    if (first) shares[first.name] = second ? '60' : '100'
    if (second) shares[second.name] = '40'
    onChange({ split: true, shares })
  }

  return (
    <section className="item-editor" aria-label={label}>
      <div className="item-editor__top">
        <span>{label}</span>
        {canRemove && (
          <button aria-label={`Remover ${label.toLowerCase()} deste rascunho`} onClick={onRemove}>
            <Trash2 aria-hidden="true" />
          </button>
        )}
      </div>
      <Field
        label="Descrição do item"
        autoComplete="off"
        value={item.description}
        placeholder={suggestion ? suggestion.description : 'Ex.: Sal mineral proteinado'}
        onChange={(event) => onChange({ description: event.target.value })}
      />
      {showSuggestion && (
        <>
          <div className="suggested-label">
            <RefreshCw aria-hidden="true" /> Sugerido pela última compra de {supplierKey}
          </div>
          <button
            className="suggestion-card"
            onClick={() =>
              onChange({
                category: suggestion.category,
                description: item.description || suggestion.description,
              })
            }
          >
            <span>
              <strong>{suggestion.description}</strong>
              <small>Categoria {suggestion.category}</small>
            </span>
            Usar sugestão
          </button>
        </>
      )}
      <div className="form-grid">
        <Field
          label="Valor"
          inputMode="decimal"
          autoComplete="off"
          value={item.value}
          error={errors.value}
          onChange={(event) => onChange({ value: event.target.value })}
          suffix={<span className="field-suffix">R$</span>}
        />
        {!item.split && (
          <label className="select-field">
            <span>Destino</span>
            <select
              value={item.destination}
              onChange={(event) => onChange({ destination: event.target.value })}
            >
              {destinations.map((record) => (
                <option key={record.name}>{record.name}</option>
              ))}
            </select>
          </label>
        )}
      </div>
      <p className="field-help">
        O custo fica no lote. Se a compra foi para um animal de dentro de um lote, escolha o lote:
        o valor é dividido entre todas as cabeças.
      </p>
      <fieldset className="category-choice">
        <legend>Categoria</legend>
        <div>
          {categories.map((option) => (
            <button
              type="button"
              aria-pressed={item.category === option}
              className={item.category === option ? 'active' : ''}
              key={option}
              onClick={() => onChange({ category: option })}
            >
              {item.category === option && <Check aria-hidden="true" />}
              {option}
            </button>
          ))}
          <button
            type="button"
            aria-expanded={newCategoryOpen}
            onClick={() => setNewCategoryOpen(!newCategoryOpen)}
          >
            <Plus aria-hidden="true" /> nova categoria
          </button>
        </div>
        {newCategoryOpen && (
          <div className="new-category-inline">
            <Field
              label="Nome da nova categoria"
              value={newCategory}
              error={newCategoryError}
              onChange={(event) => {
                setNewCategory(event.target.value)
                setNewCategoryError('')
              }}
            />
            <Button
              variant="secondary"
              onClick={() => {
                const name = newCategory.trim()
                if (!name) return setNewCategoryError('Informe um nome')
                if (categories.some((option) => option.toLowerCase() === name.toLowerCase()))
                  return setNewCategoryError('Já existe uma categoria com este nome')
                onAddCategory(name)
                onChange({ category: name })
                setNewCategory('')
                setNewCategoryOpen(false)
              }}
            >
              Criar e usar
            </Button>
          </div>
        )}
        {errors.category && (
          <small className="field__error" role="alert">
            {errors.category}
          </small>
        )}
      </fieldset>
      <button
        type="button"
        aria-pressed={item.split}
        className={`split-button ${item.split ? 'active' : ''}`}
        onClick={toggleSplit}
      >
        <Split aria-hidden="true" />
        <span>
          <strong>Dividir entre lotes</strong>
          <small>Cria um lançamento para cada lote</small>
        </span>
        <i>{item.split && <Check aria-hidden="true" />}</i>
      </button>
      {item.split && (
        <div className="split-box">
          {lots.map((lot) => {
            const checked = lot.name in item.shares
            const share = item.shares[lot.name] ?? ''
            const value = ((parseMoney(item.value) || 0) * (parseMoney(share) || 0)) / 100
            return (
              <div className="split-row" key={lot.name}>
                <label>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => {
                      const shares = { ...item.shares }
                      if (event.target.checked) shares[lot.name] = '0'
                      else delete shares[lot.name]
                      onChange({ shares })
                    }}
                  />
                  {lot.name}
                </label>
                {checked && (
                  <>
                    <Field
                      label={`Percentual de ${lot.name}`}
                      inputMode="decimal"
                      value={share}
                      onChange={(event) =>
                        onChange({ shares: { ...item.shares, [lot.name]: event.target.value } })
                      }
                      suffix={<span className="field-suffix">%</span>}
                    />
                    <span>{money(value)}</span>
                  </>
                )}
              </div>
            )
          })}
          {errors.split && (
            <small className="field__error" role="alert">
              {errors.split}
            </small>
          )}
        </div>
      )}
      <label className="recurring-toggle">
        <span>
          <strong>Compra recorrente</strong>
          <small>Cria o próximo previsto para você confirmar</small>
        </span>
        <input
          type="checkbox"
          checked={item.recurring}
          onChange={(event) => onChange({ recurring: event.target.checked })}
        />
        <i />
      </label>
      {item.recurring && (
        <div className="recurring-fields">
          <label className="select-field">
            <span>Periodicidade</span>
            <select
              value={item.periodicity}
              onChange={(event) =>
                onChange({ periodicity: event.target.value as Periodicity, nextDate: null })
              }
            >
              {periodicities.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <Field
            label="Próxima data prevista"
            type="date"
            value={nextDateOf(item, note.date)}
            onChange={(event) => onChange({ nextDate: event.target.value })}
          />
          <small className="field-help">
            Calculada pela periodicidade a partir da data da compra. Você pode mudar.
          </small>
        </div>
      )}
      <section className="item-payment">
        {item.payment ? (
          <>
            <PaymentFields
              label={`Pagamento do ${label.toLowerCase()}`}
              payment={item.payment}
              purchaseDate={note.date}
              dueError={errors.due}
              onChange={(payment) => onChange({ payment })}
            />
            <button type="button" className="text-link" onClick={() => onChange({ payment: null })}>
              Usar o pagamento da nota
            </button>
          </>
        ) : (
          <p>
            <span>
              Pagamento: <strong>{paymentLabel(note.payment, note.date)}</strong> (igual à nota)
            </span>
            <button
              type="button"
              className="text-link"
              onClick={() => onChange({ payment: { ...note.payment } })}
            >
              Definir por item
            </button>
          </p>
        )}
      </section>
    </section>
  )
}

function ReviewStep({
  hasPhoto,
  note,
  items,
  onBack,
  onSave,
}: {
  hasPhoto: boolean
  note: NoteState
  items: Item[]
  onBack: () => void
  onSave: () => void
}) {
  const rows = items.flatMap((item) =>
    postingsOf(item).map((posting) => ({ item, ...posting })),
  )
  const total = rows.reduce((sum, row) => sum + row.value, 0)
  const noteTotal = parseMoney(note.total)
  const difference = Number.isNaN(noteTotal) ? null : Math.round((noteTotal - total) * 100) / 100
  return (
    <>
      <StepHeading
        number={hasPhoto ? '04' : '03'}
        title="Revise e salve"
        text="Confira cada lançamento que entra no custo."
      />
      <section className="review-card">
        <div className="review-note">
          {hasPhoto ? (
            <div className="review-thumb">
              <ReceiptMock compact />
            </div>
          ) : (
            <div className="review-no-photo">
              <FileImage aria-hidden="true" />
              <span>
                Sem foto<small>Você pode anexar depois</small>
              </span>
            </div>
          )}
          <div>
            <span>FORNECEDOR</span>
            <strong>{note.supplier || 'Sem fornecedor'}</strong>
            <small>
              {isoToBr(note.date)}
              {note.number ? ` · NF ${note.number}` : ''}
              {Number.isNaN(noteTotal) ? '' : ` · Total da nota ${money(noteTotal)}`}
            </small>
          </div>
        </div>
        {rows.map((row, index) => {
          const payment = row.item.payment ?? note.payment
          return (
            <div className="review-posting" key={`${row.item.id}-${row.destination}`}>
              <span className="review-posting__title">
                Lançamento {index + 1}
                <strong>{row.item.description || 'Item sem descrição'}</strong>
              </span>
              <span>
                Destino
                <strong>
                  {row.destination}
                  {row.item.split ? ` (${decimal(row.share, 0)}%)` : ''}
                </strong>
              </span>
              <span>
                Categoria<strong>{row.item.category}</strong>
              </span>
              <span>
                Valor<strong>{money(row.value)}</strong>
              </span>
              <span>
                Recorrência
                <strong>
                  {row.item.recurring
                    ? `${row.item.periodicity} · próxima ${isoToBr(nextDateOf(row.item, note.date))}`
                    : 'Não recorrente'}
                </strong>
              </span>
              <span>
                Pagamento<strong>{paymentLabel(payment, note.date)}</strong>
              </span>
            </div>
          )
        })}
        <div className="review-total">
          <span>
            Total dos lançamentos
            {difference ? <small>Diferença para a nota: {money(difference)}</small> : null}
          </span>
          <strong>{money(total)}</strong>
        </div>
      </section>
      <div className="save-note">
        <Check aria-hidden="true" />
        <p>
          <strong>Pronto para salvar</strong>
          <small>Pago ou a pagar, o custo passa a contar nos destinos escolhidos.</small>
        </p>
      </div>
      <p className="integration-note">
        {/* TODO(integração): persistir compra, nota e lançamentos na API. */}
        Se a conexão cair, manteremos o rascunho neste aparelho para você tentar novamente.
      </p>
      <div className="form-footer">
        <Button variant="ghost" onClick={onBack}>
          Voltar e editar
        </Button>
        <Button icon={<Check aria-hidden="true" />} onClick={onSave}>
          Salvar compra
        </Button>
      </div>
    </>
  )
}

function Success({
  items,
  purchaseDate,
  onRestart,
  onDone,
}: {
  items: Item[]
  purchaseDate: string
  onRestart: () => void
  onDone: () => void
}) {
  const postings = items.flatMap(postingsOf)
  const total = postings.reduce((sum, posting) => sum + posting.value, 0)
  const destinations = Array.from(new Set(postings.map((posting) => posting.destination)))
  const recurring = items.filter((item) => item.recurring)
  const summary: ReactNode[] = recurring.map((item) => (
    <div key={item.id}>
      <CalendarClock aria-hidden="true" />
      <span>
        <small>
          {item.description || 'Item'} · {item.periodicity}
        </small>
        <strong>Próximo previsto em {isoToBr(nextDateOf(item, purchaseDate))}</strong>
      </span>
    </div>
  ))
  return (
    <motion.section
      className="purchase-success"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <span>
        <Check aria-hidden="true" />
      </span>
      <div className="eyebrow">COMPRA SALVA</div>
      <h2>Tudo certo por aqui</h2>
      <p>
        O custo de <strong>{money(total)}</strong> já entrou em {destinations.join(' e ')}. A nota
        está guardada com segurança.
      </p>
      {summary.length > 0 && <div className="success-summary">{summary}</div>}
      <div className="success-actions">
        <Button icon={<Plus aria-hidden="true" />} onClick={onRestart}>
          Registrar outra
        </Button>
        <Button variant="secondary" onClick={onDone}>
          Ver lançamentos
        </Button>
      </div>
    </motion.section>
  )
}
