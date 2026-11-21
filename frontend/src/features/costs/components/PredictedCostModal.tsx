import { useState, type FormEvent } from 'react'
import { CalendarClock, Info } from 'lucide-react'
import { Button, Field, Modal } from '@/shared/ui/UI'
import { TODAY, costCategories, parseBrDate, recordsForProperty, suppliers } from '@/shared/demo/data'
import { useActiveProperty } from '@/shared/routing/navigation'

// ---------------------------------------------------------------------------
// Utilitários de custos compartilhados por CostsPage e PurchasePage
// ---------------------------------------------------------------------------

export const periodicities = [
  'Semanal',
  'Quinzenal',
  'Mensal',
  'Bimestral',
  'Trimestral',
  'Semestral',
  'Anual',
] as const
export type Periodicity = (typeof periodicities)[number]

/** "dd/mm/aaaa" → "aaaa-mm-dd" (valor de input type=date). */
export function brToIso(value: string) {
  const [day, month, year] = value.split('/')
  return `${year}-${month}-${day}`
}

/** "aaaa-mm-dd" → "dd/mm/aaaa". */
export function isoToBr(value: string) {
  if (!value) return ''
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

/** "dd/mm/aaaa" → "dd/mm". */
export function shortDate(value: string) {
  return value.slice(0, 5)
}

function formatDate(date: Date) {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${day}/${month}/${date.getFullYear()}`
}

/** Próxima data de uma recorrência ("dd/mm/aaaa"). */
export function addPeriod(value: string, periodicity: string) {
  const date = parseBrDate(value)
  const months: Record<string, number> = {
    Mensal: 1,
    Bimestral: 2,
    Trimestral: 3,
    Semestral: 6,
    Anual: 12,
  }
  if (periodicity === 'Semanal') date.setDate(date.getDate() + 7)
  else if (periodicity === 'Quinzenal') date.setDate(date.getDate() + 15)
  else date.setMonth(date.getMonth() + (months[periodicity] ?? 1))
  return formatDate(date)
}

export const TODAY_ISO = brToIso(TODAY)

/** "1.234,56" → 1234.56 (NaN quando inválido). */
export function parseMoney(value: string) {
  const clean = value.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')
  return clean ? Number(clean) : Number.NaN
}

/** Lotes e animais individuais ATIVOS da propriedade (destinos de custo). */
export function useActiveDestinations() {
  const { id } = useActiveProperty()
  return recordsForProperty(id).filter(
    (record) => record.status !== 'Vendido' && record.status !== 'Encerrado',
  )
}

export const supplierOptions = suppliers.map((name) => name.replace(' (locação)', ''))

export type PredictedDraft = {
  title: string
  value: number
  /** "dd/mm/aaaa" */
  date: string
  category: string
  destination: string
  supplier: string
  recurrence: Periodicity | null
}

type Errors = Partial<Record<'title' | 'value' | 'date' | 'category', string>>

export default function PredictedCostModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  onSaved: (draft: PredictedDraft) => void
}) {
  const destinations = useActiveDestinations()
  const [title, setTitle] = useState('')
  const [value, setValue] = useState('')
  const [date, setDate] = useState('')
  const [category, setCategory] = useState('')
  const [destination, setDestination] = useState(destinations[0]?.name ?? '')
  const [supplier, setSupplier] = useState('')
  const [recurring, setRecurring] = useState(false)
  const [periodicity, setPeriodicity] = useState<Periodicity>('Mensal')
  const [errors, setErrors] = useState<Errors>({})

  function submit(event: FormEvent) {
    event.preventDefault()
    const next: Errors = {}
    const amount = parseMoney(value)
    if (!title.trim()) next.title = 'Informe a descrição'
    if (!(amount > 0)) next.value = 'Informe o valor previsto'
    if (!date) next.date = 'Informe a data prevista'
    else if (date <= TODAY_ISO) next.date = 'A data prevista precisa ser futura'
    if (!category) next.category = 'Escolha a categoria'
    setErrors(next)
    if (Object.keys(next).length) return
    onSaved({
      title: title.trim(),
      value: amount,
      date: isoToBr(date),
      category,
      destination,
      supplier: supplier.trim(),
      recurrence: recurring ? periodicity : null,
    })
  }

  return (
    <Modal open={open} onClose={onClose} title="Lançar previsto">
      <form className="form-stack predicted-form" noValidate onSubmit={submit}>
        <aside className="inline-notice">
          <CalendarClock aria-hidden="true" />
          <p>
            <strong>Previsto não entra no custo. Ele aparece na projeção e em A confirmar.</strong>
          </p>
        </aside>
        <Field
          label="Descrição"
          name="predicted-description"
          placeholder="Ex.: Ração mensal"
          value={title}
          error={errors.title}
          onChange={(event) => {
            setTitle(event.target.value)
            setErrors({ ...errors, title: undefined })
          }}
        />
        <div className="form-grid">
          <Field
            label="Valor previsto"
            name="predicted-value"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0,00"
            value={value}
            error={errors.value}
            onChange={(event) => {
              setValue(event.target.value)
              setErrors({ ...errors, value: undefined })
            }}
            suffix={<span className="field-suffix">R$</span>}
          />
          <Field
            label="Data prevista"
            name="predicted-date"
            type="date"
            min={addIsoDay(TODAY_ISO)}
            value={date}
            error={errors.date}
            onChange={(event) => {
              setDate(event.target.value)
              setErrors({ ...errors, date: undefined })
            }}
          />
        </div>
        <div className="form-grid">
          <label className="select-field">
            <span>Categoria</span>
            <select
              value={category}
              aria-invalid={Boolean(errors.category)}
              onChange={(event) => {
                setCategory(event.target.value)
                setErrors({ ...errors, category: undefined })
              }}
            >
              <option value="">Selecione</option>
              {costCategories.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
            {errors.category && (
              <small className="field__error" role="alert">
                {errors.category}
              </small>
            )}
          </label>
          <label className="select-field">
            <span>Destino</span>
            <select value={destination} onChange={(event) => setDestination(event.target.value)}>
              {destinations.map((record) => (
                <option key={record.slug}>{record.name}</option>
              ))}
            </select>
          </label>
        </div>
        <Field
          label="Fornecedor (opcional)"
          name="predicted-supplier"
          list="predicted-suppliers"
          placeholder="Comece a digitar"
          value={supplier}
          onChange={(event) => setSupplier(event.target.value)}
        />
        <datalist id="predicted-suppliers">
          {supplierOptions.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
        <label className="check-row">
          <input
            type="checkbox"
            checked={recurring}
            onChange={(event) => setRecurring(event.target.checked)}
          />
          Repetir
        </label>
        {recurring && (
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
        <p className="support-copy">
          <Info aria-hidden="true" /> Somente lotes e animais ativos desta propriedade podem
          receber um previsto.
        </p>
        <div className="modal__actions">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" icon={<CalendarClock aria-hidden="true" />}>
            Lançar previsto
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function addIsoDay(iso: string) {
  const [year, month, day] = iso.split('-').map(Number)
  const date = new Date(year, month - 1, day + 1, 12)
  return brToIso(formatDate(date))
}
