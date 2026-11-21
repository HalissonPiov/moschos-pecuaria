/*
 * Aba Movimentações do detalhe do lote (Etapa 2.6) e componente "Quais animais saíram?" (2.8).
 *
 * Parâmetros de URL:
 *   ?estornadas=1   mostra as baixas estornadas (ocultas por padrão)
 * Estados da aba (vazio, carregando, erro) ficam no LotDetailPage: ?aba=movimentacoes&estado=empty|loading|error
 */
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { ArrowDown, ArrowUp, Check, LockKeyhole, RotateCcw, Sprout, Users } from 'lucide-react'
import { TODAY, money, type LivestockRecord } from '@/shared/demo/data'
import { safraAnimals, type LotAnimal } from '@/shared/demo/livestock'
import { animalHasData, animalsForRecord } from '@/features/herd/components/LotAnimals'
import { Button, Field, Modal, StateView, Toast } from '@/shared/ui/UI'

const TODAY_ISO = TODAY.split('/').reverse().join('-')
const isoToBr = (iso: string) => iso.split('-').reverse().join('/')

type Movement = {
  id: string
  kind: 'formacao' | 'entrada' | 'baixa'
  date: string
  heads: number
  type?: 'Morte' | 'Descarte'
  cost?: number
  author: string
  note?: string
  reversedAt?: string
  /** Lançada nesta sessão (não está no saldo do registro ainda). */
  local?: boolean
  /** Já vinha estornada nos dados de exemplo. */
  initiallyReversed?: boolean
}

/** Movimentações de exemplo por registro (formação + entradas + baixas). */
// TODO(integração): buscar as movimentações do registro na API.
function initialMovements(record: LivestockRecord): Movement[] {
  if (record.original === 0) return []
  const list: Movement[] = [
    {
      id: `${record.slug}-formacao`,
      kind: 'formacao',
      date: record.formationDate,
      heads: record.original,
      cost: record.acquisitionCost || undefined,
      author: 'João Batista',
    },
  ]
  record.writeOffs.forEach((writeOff, index) =>
    list.push({
      id: `${record.slug}-baixa-${index}`,
      kind: 'baixa',
      date: writeOff.date,
      heads: writeOff.heads,
      type: writeOff.type,
      author: 'Ana Batista',
    }),
  )
  if (record.slug === 'lote-safra-24') {
    // Baixa lançada por engano e estornada: aparece só com "Mostrar estornadas".
    list.push({
      id: 'safra-baixa-estornada',
      kind: 'baixa',
      date: '22/09/2026',
      heads: 1,
      type: 'Morte',
      author: 'Ana Batista',
      note: 'Animal #14 encontrado no Pasto do Córrego.',
      reversedAt: '18/11/2026',
      initiallyReversed: true,
    })
  }
  return list
}

const sortKey = (date: string) => date.split('/').reverse().join('')

export default function LotMovements({ record }: { record: LivestockRecord }) {
  const individual = record.kind === 'Individual'
  const [params, setParams] = useSearchParams()
  const showReversed = params.get('estornadas') === '1'
  const [movements, setMovements] = useState<Movement[]>(() => initialMovements(record))
  const [action, setAction] = useState<'entry' | 'removal' | null>(null)
  const [reverseTarget, setReverseTarget] = useState<Movement | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // Saldo da tela = saldo do registro ajustado pelas movimentações feitas nesta sessão.
  const balance = movements.reduce((total, m) => {
    const initiallyReversed = Boolean(m.initiallyReversed)
    if (m.kind === 'entrada' && m.local) return total + m.heads
    if (m.kind !== 'baixa') return total
    if (m.local && !m.reversedAt) return total - m.heads
    if (!m.local && m.reversedAt && !initiallyReversed) return total + m.heads
    return total
  }, record.balance)
  const canChange = !record.locked && !record.inactive
  const visible = movements
    .filter((m) => showReversed || !m.reversedAt)
    .sort((a, b) => sortKey(b.date).localeCompare(sortKey(a.date)))
  const hiddenReversed = movements.filter((m) => m.reversedAt).length

  function toggleReversed(value: boolean) {
    const next = new URLSearchParams(params)
    if (value) next.set('estornadas', '1')
    else next.delete('estornadas')
    setParams(next)
  }

  return (
    <section className="movements-tab">
      {record.locked ? (
        <div className="rb-lock-note">
          <LockKeyhole aria-hidden="true" />
          <p>
            <strong>Movimentações travadas</strong>
            <span>
              O lote foi vendido. Para corrigir uma entrada ou baixa, use “Corrigir com
              justificativa” na faixa do topo.
            </span>
          </p>
        </div>
      ) : canChange ? (
        <div className={`movement-actions ${individual ? 'movement-actions--single' : ''}`}>
          {!individual && (
            <button type="button" onClick={() => setAction('entry')}>
              <ArrowUp aria-hidden="true" />
              <span>
                <strong>Entrada de animais</strong>
                <small>Adicione novas cabeças ao lote.</small>
              </span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setAction('removal')}
            disabled={balance === 0}
            aria-describedby={balance === 0 ? 'baixa-sem-saldo' : undefined}
          >
            <ArrowDown aria-hidden="true" />
            <span>
              <strong>Baixa de {individual ? 'animal' : 'animais'}</strong>
              <small id="baixa-sem-saldo">
                {balance === 0 ? 'Sem animais no saldo.' : 'Registre morte ou descarte.'}
              </small>
            </span>
          </button>
        </div>
      ) : null}

      {hiddenReversed > 0 && (
        <label className={`filter-chip rb-reversed-toggle ${showReversed ? 'active' : ''}`}>
          <input
            className="chip-checkbox"
            type="checkbox"
            checked={showReversed}
            onChange={(event) => toggleReversed(event.target.checked)}
          />
          Mostrar estornadas ({hiddenReversed})
        </label>
      )}

      {visible.length === 0 ? (
        <StateView
          type="empty"
          title="Nenhuma movimentação ainda"
          text={
            individual
              ? 'Baixas por morte ou descarte deste animal aparecem aqui.'
              : 'Entradas de animais e baixas por morte ou descarte aparecem aqui.'
          }
          actionLabel=""
        />
      ) : (
        <div className="movement-list">
          {visible.map((movement) => (
            <div key={movement.id} className={movement.reversedAt ? 'is-reversed' : ''}>
              <span
                className={`movement-icon ${movement.kind === 'baixa' ? 'removal' : 'entry'}`}
                aria-hidden="true"
              >
                {movement.kind === 'formacao' ? <Sprout /> : movement.kind === 'entrada' ? <ArrowUp /> : <ArrowDown />}
              </span>
              <p>
                <strong>
                  {movement.kind === 'formacao'
                    ? individual
                      ? 'Cadastro do animal'
                      : `Formação do lote · ${movement.heads} animais`
                    : movement.kind === 'entrada'
                      ? `Entrada de ${movement.heads} ${movement.heads === 1 ? 'animal' : 'animais'}`
                      : `Baixa por ${movement.type?.toLowerCase()}`}
                </strong>
                <small>
                  {movement.date}
                  {movement.kind === 'baixa'
                    ? ` · ${movement.heads} ${movement.heads === 1 ? 'animal' : 'animais'}`
                    : ''}
                  {movement.cost ? ` · custo de aquisição ${money(movement.cost)}` : ''}
                  {` · lançado por ${movement.author}`}
                </small>
                {movement.note && <small>{movement.note}</small>}
              </p>
              <b>
                {movement.kind === 'baixa' ? '−' : '+'} {movement.heads}
              </b>
              {movement.reversedAt ? (
                <em className="rb-reversed-badge">
                  <RotateCcw aria-hidden="true" /> Estornada em {movement.reversedAt}
                </em>
              ) : movement.kind !== 'baixa' ? (
                <em>Não pode ser estornada</em>
              ) : canChange ? (
                <button type="button" onClick={() => setReverseTarget(movement)}>
                  <RotateCcw aria-hidden="true" />
                  Estornar baixa
                </button>
              ) : (
                <em>Somente leitura</em>
              )}
            </div>
          ))}
        </div>
      )}
      <p className="movement-cost-note">
        Animais baixados não levam custo. O custo continua no lote e passa para os que ficaram.
      </p>

      <EntryModal
        open={action === 'entry'}
        onClose={() => setAction(null)}
        onSave={(movement) => {
          setMovements([...movements, movement])
          setAction(null)
          setToast(
            `${movement.heads} ${movement.heads === 1 ? 'animal criado' : 'animais criados'} no lote.`,
          )
        }}
      />
      <RemovalModal
        open={action === 'removal'}
        record={record}
        balance={balance}
        onClose={() => setAction(null)}
        onSave={(movement) => {
          setMovements([...movements, movement])
          setAction(null)
          setToast('Baixa registrada. O custo continua no lote e passou para os animais que ficaram.')
        }}
      />
      <Modal
        open={Boolean(reverseTarget)}
        onClose={() => setReverseTarget(null)}
        title="Estornar esta baixa?"
      >
        <p className="modal-copy">
          {reverseTarget?.heads === 1 ? 'O animal volta' : `Os ${reverseTarget?.heads} animais voltam`}{' '}
          ao saldo do lote e o custo volta a ser dividido entre {reverseTarget?.heads === 1 ? 'ele' : 'eles'}.
          A baixa continua na lista, esmaecida, com o selo “Estornada”.
        </p>
        <div className="modal__actions">
          <Button variant="ghost" onClick={() => setReverseTarget(null)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            icon={<RotateCcw />}
            onClick={() => {
              // TODO(integração): estornar a baixa na API.
              setMovements(
                movements.map((m) => (m.id === reverseTarget?.id ? { ...m, reversedAt: TODAY } : m)),
              )
              setReverseTarget(null)
              setToast('Baixa estornada. Os animais voltaram ao saldo.')
            }}
          >
            Estornar baixa
          </Button>
        </div>
      </Modal>
      <Toast message={toast} onClose={() => setToast(null)} />
    </section>
  )
}

function EntryModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean
  onClose: () => void
  onSave: (movement: Movement) => void
}) {
  const [date, setDate] = useState(TODAY_ISO)
  const [quantity, setQuantity] = useState('5')
  const [cost, setCost] = useState('')
  const [note, setNote] = useState('')
  const [submitted, setSubmitted] = useState(false)
  useEffect(() => {
    if (open) {
      setDate(TODAY_ISO)
      setQuantity('5')
      setCost('')
      setNote('')
      setSubmitted(false)
    }
  }, [open])
  const heads = Number(quantity)
  const quantityError =
    submitted && !(Number.isInteger(heads) && heads >= 1)
      ? 'Informe quantas cabeças entraram (número inteiro, mínimo 1).'
      : undefined
  const dateError = date > TODAY_ISO ? 'A data da entrada não pode ser futura.' : submitted && !date ? 'Informe a data.' : undefined
  const costValue = cost ? Number(cost.replace(/\./g, '').replace(',', '.')) : 0
  const costError = cost && !(costValue >= 0) ? 'Use só números. Ex.: 5.200,00' : undefined
  return (
    <Modal open={open} onClose={onClose} title="Entrada de animais">
      <form
        className="form-stack"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          setSubmitted(true)
          if (!(Number.isInteger(heads) && heads >= 1) || !date || date > TODAY_ISO || costError) return
          // TODO(integração): registrar a entrada e criar um animal para cada cabeça.
          onSave({
            id: `entrada-${Date.now()}`,
            kind: 'entrada',
            date: isoToBr(date),
            heads,
            cost: costValue || undefined,
            note: note.trim() || undefined,
            author: 'João Batista',
            local: true,
          })
        }}
      >
        <div className="form-grid">
          <Field
            label="Data"
            type="date"
            max={TODAY_ISO}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            error={dateError}
          />
          <Field
            label="Quantidade"
            inputMode="numeric"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            error={quantityError}
            suffix={<span className="field-suffix">cabeças</span>}
          />
        </div>
        <Field
          label="Custo de aquisição (opcional)"
          inputMode="decimal"
          value={cost}
          placeholder="0,00"
          onChange={(e) => setCost(e.target.value)}
          error={costError}
          suffix={<span className="field-suffix">R$</span>}
        />
        <label className="textarea-field">
          <span>Observação</span>
          <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <p className="help-note">
          Entradas não podem ser estornadas. Para corrigir, use Corrigir com justificativa.
        </p>
        <div className="modal__actions">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">Salvar entrada</Button>
        </div>
      </form>
    </Modal>
  )
}

function RemovalModal({
  open,
  record,
  balance,
  onClose,
  onSave,
}: {
  open: boolean
  record: LivestockRecord
  balance: number
  onClose: () => void
  onSave: (movement: Movement) => void
}) {
  const individual = record.kind === 'Individual'
  const animals = animalsForRecord(record).filter((animal) => animal.situation === 'Em estoque')
  const hasData = animals.some(animalHasData)
  const [type, setType] = useState<'Morte' | 'Descarte'>('Morte')
  const [date, setDate] = useState(TODAY_ISO)
  const [quantity, setQuantity] = useState(1)
  const [note, setNote] = useState('')
  const [selected, setSelected] = useState<number[]>([])
  const [submitted, setSubmitted] = useState(false)
  useEffect(() => {
    if (open) {
      setType('Morte')
      setDate(TODAY_ISO)
      setQuantity(1)
      setNote('')
      setSelected([])
      setSubmitted(false)
    }
  }, [open])
  const quantityInvalid = !Number.isInteger(quantity) || quantity < 1
  const balanceError = quantity > balance
  const selectionError = !individual && hasData && selected.length !== quantity
  const dateError = date > TODAY_ISO ? 'A data da baixa não pode ser futura.' : undefined
  return (
    <Modal open={open} onClose={onClose} title={individual ? `Baixa do ${record.name}` : 'Baixa de animais'}>
      <form
        className="form-stack"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          setSubmitted(true)
          if (quantityInvalid || balanceError || selectionError || dateError || !date) return
          // TODO(integração): registrar a baixa e marcar os animais escolhidos como baixados.
          onSave({
            id: `baixa-${Date.now()}`,
            kind: 'baixa',
            date: isoToBr(date),
            heads: quantity,
            type,
            note: note.trim() || undefined,
            author: 'João Batista',
            local: true,
          })
        }}
      >
        <div className="form-grid">
          <label className="select-field">
            <span>Tipo</span>
            <select value={type} onChange={(e) => setType(e.target.value as 'Morte' | 'Descarte')}>
              <option>Morte</option>
              <option>Descarte</option>
            </select>
          </label>
          <Field
            label="Data"
            type="date"
            max={TODAY_ISO}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            error={dateError}
          />
          {!individual && (
            <Field
              label="Quantidade"
              inputMode="numeric"
              value={quantity || ''}
              onChange={(event) => setQuantity(Number(event.target.value))}
              error={
                balanceError
                  ? `O saldo é de ${balance} ${balance === 1 ? 'animal' : 'animais'}.`
                  : submitted && quantityInvalid
                    ? 'Informe quantos animais saíram (mínimo 1).'
                    : undefined
              }
              suffix={<span className="field-suffix">cabeças</span>}
            />
          )}
        </div>
        <label className="textarea-field">
          <span>Observação</span>
          <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        {individual ? (
          <p className="help-note">O {record.name} sai do saldo e o registro fica encerrado.</p>
        ) : (
          !quantityInvalid &&
          !balanceError && (
            <AnimalExitSelector
              hasData={hasData}
              quantity={quantity}
              selected={selected}
              setSelected={setSelected}
              error={submitted && selectionError}
              animals={animals}
            />
          )
        )}
        <p className="help-note">
          O custo {individual ? 'deste animal' : 'desses animais'} continua no lote e passa para os
          que ficaram.
        </p>
        <div className="modal__actions">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">Registrar baixa</Button>
        </div>
      </form>
    </Modal>
  )
}

/**
 * "Quais animais saíram?" (Etapa 2.8). Usado na baixa e na venda.
 * Sem dados individuais: escolha automática pela ordem de cadastro. Com dados: lista com contador.
 */
export function AnimalExitSelector({
  hasData,
  quantity,
  selected,
  setSelected,
  error,
  limit,
  animals = safraAnimals,
}: {
  hasData: boolean
  quantity: number
  selected: number[]
  setSelected: (ids: number[]) => void
  error: boolean
  /** Máximo de opções mostradas (padrão: todos os animais em estoque). */
  limit?: number
  /** Animais do registro (padrão: Lote Safra 24). */
  animals?: LotAnimal[]
}) {
  const inStock = animals.filter((animal) => animal.situation === 'Em estoque')
  if (!hasData) {
    const chosen = inStock.slice(0, quantity).map((animal) => animal.order)
    return (
      <div className="automatic-selection">
        <Users aria-hidden="true" />
        <p>
          <strong>Quais animais saíram?</strong>
          <span>
            Os animais deste lote não têm dados individuais. Vamos escolher {quantity}{' '}
            {quantity === 1 ? 'animal' : 'animais'} pela ordem de cadastro.
          </span>
          <small>{chosen.join(', ')}</small>
        </p>
      </div>
    )
  }
  const options = inStock.slice(0, limit ?? inStock.length)
  const ok = selected.length === quantity
  return (
    <fieldset className="exit-selector">
      <legend className="sr-only">Quais animais saíram?</legend>
      <div>
        <strong aria-hidden="true">Quais animais saíram?</strong>
        <span className={ok ? 'selection-ok' : ''} aria-live="polite">
          {ok && <Check aria-hidden="true" />}
          {selected.length} de {quantity} selecionados{ok ? ' · ok' : ''}
        </span>
      </div>
      {options.map((animal) => (
        <label key={animal.id}>
          <input
            type="checkbox"
            checked={selected.includes(animal.id)}
            onChange={(event) =>
              setSelected(
                event.target.checked
                  ? [...selected, animal.id]
                  : selected.filter((id) => id !== animal.id),
              )
            }
          />
          <span>
            <strong>
              {animal.order} · {animal.name || 'Sem identificação'}
            </strong>
            <small>
              {animal.tag ? `Brinco ${animal.tag}` : 'Sem brinco'}
              {animal.breed ? ` · ${animal.breed}` : ''}
            </small>
          </span>
          {selected.includes(animal.id) && <Check aria-hidden="true" />}
        </label>
      ))}
      {error && (
        <p className="field__error" role="alert">
          Selecione exatamente {quantity} {quantity === 1 ? 'animal' : 'animais'}. Agora há{' '}
          {selected.length} {selected.length === 1 ? 'selecionado' : 'selecionados'}.
        </p>
      )}
    </fieldset>
  )
}
