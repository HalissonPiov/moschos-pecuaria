/*
 * Aba Animais do detalhe do lote (Etapa 2.4 e 2.5).
 *
 * Parâmetros de URL (todos opcionais, abrem direto por link):
 *   ?buscaAnimal=   busca por nome ou brinco
 *   ?situacao=      Em estoque | Vendido | Baixado (morte) | Baixado (descarte)
 *   ?pastoAnimal=   nome do pasto
 *   ?raca=          raça
 *   ?dados=         Com dados | Sem dados
 *   ?animal=07      abre o detalhe do animal #07
 * Estados da aba (vazio, carregando, erro) ficam no LotDetailPage: ?aba=animais&estado=empty|loading|error
 */
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Beef, Check, ChevronDown, Edit3, Plus, Scale, Search, TrendingUp, X } from 'lucide-react'
import { TODAY, decimal, salesForRecord, type LivestockRecord } from '@/shared/demo/data'
import { pastures, safraAnimals, type LotAnimal } from '@/shared/demo/livestock'
import { Button, Field, Modal, StateView, Toast } from '@/shared/ui/UI'

// ---------------------------------------------------------------------------
// Animais por registro
// ---------------------------------------------------------------------------

/** Animais de cada registro. Só o Lote Safra 24 tem dados individuais nos dados de exemplo. */
// TODO(integração): buscar os animais do registro na API.
export function animalsForRecord(record: Pick<LivestockRecord, 'slug' | 'original' | 'status' | 'pasture' | 'balance'>): LotAnimal[] {
  if (record.slug === 'lote-safra-24') return safraAnimals
  const situation: LotAnimal['situation'] =
    record.status === 'Vendido'
      ? 'Vendido'
      : record.status === 'Encerrado'
        ? 'Baixado (descarte)'
        : 'Em estoque'
  return Array.from({ length: record.original }, (_, index) => ({
    id: index + 1,
    order: `#${String(index + 1).padStart(2, '0')}`,
    name: '',
    tag: '',
    sex: '',
    breed: '',
    color: '',
    birthDate: '',
    approximateDate: false,
    pasture: situation === 'Em estoque' ? record.pasture : '',
    initialWeight: null,
    currentWeight: null,
    note: '',
    situation,
  }))
}

export function animalHasData(animal: LotAnimal) {
  return Boolean(animal.name || animal.tag)
}

type Weighing = { date: string; weight: number; note: string }

/** Pesagens de exemplo coerentes com o peso atual do animal (a última é o peso atual). */
function initialWeighings(animal: LotAnimal): Weighing[] {
  if (!animal.currentWeight) return []
  return [
    { date: '15/02/2026', weight: animal.currentWeight - 54, note: 'Pesagem após manejo.' },
    { date: '18/06/2026', weight: animal.currentWeight - 20, note: 'Bom ganho no período.' },
    { date: '05/11/2026', weight: animal.currentWeight, note: 'Última pesagem.' },
  ]
}

/** Brincos em uso fora deste lote (inclui animal vendido). */
const otherTags = [
  { tag: '0047', owner: 'o Boi 047' },
  { tag: '0231', owner: 'um animal vendido do Lote Recria 23' },
]

const normalizeTag = (tag: string) => tag.trim().replace(/^0+/, '')

const TODAY_ISO = TODAY.split('/').reverse().join('-')

function isoToBr(iso: string) {
  return iso ? iso.split('-').reverse().join('/') : ''
}

function ageFrom(iso: string) {
  if (!iso) return ''
  const [year, month] = iso.split('-').map(Number)
  const [ty, tm] = TODAY_ISO.split('-').map(Number)
  const months = (ty - year) * 12 + (tm - month)
  if (months < 0) return ''
  const y = Math.floor(months / 12)
  const m = months % 12
  const parts = [y ? `${y} ${y === 1 ? 'ano' : 'anos'}` : '', m ? `${m} ${m === 1 ? 'mês' : 'meses'}` : '']
  return parts.filter(Boolean).join(' e ') || 'menos de 1 mês'
}

const pastureOptions = pastures.map((pasture) => pasture.name)
const breedOptions = ['Nelore', 'Cruzado', 'Angus x Nelore']

// ---------------------------------------------------------------------------

export default function LotAnimals({ record }: { record: LivestockRecord }) {
  const [params, setParams] = useSearchParams()
  const [selected, setSelected] = useState<number[]>([])
  const [bulkOpen, setBulkOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const animals = useMemo(() => animalsForRecord(record), [record])
  const query = params.get('buscaAnimal') || ''
  const situation = params.get('situacao') || ''
  const pasture = params.get('pastoAnimal') || ''
  const breed = params.get('raca') || ''
  const dataState = params.get('dados') || ''
  const openId = Number(params.get('animal')) || 0
  const detail = animals.find((animal) => animal.id === openId) ?? null

  function update(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: key.startsWith('busca') })
  }
  function clearFilters() {
    const next = new URLSearchParams(params)
    ;['buscaAnimal', 'situacao', 'pastoAnimal', 'raca', 'dados'].forEach((key) => next.delete(key))
    setParams(next)
  }

  const inStock = animals.filter((animal) => animal.situation === 'Em estoque')
  const withData = inStock.filter(animalHasData).length
  const filtered = animals.filter((animal) => {
    const hasData = animalHasData(animal)
    return (
      `${animal.name} ${animal.tag} ${animal.order}`.toLowerCase().includes(query.toLowerCase()) &&
      (!situation || animal.situation === situation) &&
      (!pasture || animal.pasture === pasture) &&
      (!breed || animal.breed === breed) &&
      (!dataState || (dataState === 'Com dados' ? hasData : !hasData))
    )
  })
  const filterCount = [query, situation, pasture, breed, dataState].filter(Boolean).length

  if (animals.length === 0) {
    return (
      <StateView
        type="empty"
        title="Este lote ainda não tem animais"
        text="Registre uma entrada em Movimentações para criar os animais do lote."
        actionLabel=""
      />
    )
  }

  return (
    <section className="animals-tab">
      <div className="animals-heading">
        <div>
          <span className="eyebrow">DADOS OPCIONAIS</span>
          <h2>
            {withData} de {inStock.length} animais com dados individuais
          </h2>
          <p>
            {animals.length} animais no lote. Os dados abaixo não alteram custo, saldo ou margem.
          </p>
        </div>
        {inStock.length > 0 && !record.locked && (
          <Button
            variant="secondary"
            onClick={() => setSelected(inStock.map((animal) => animal.id))}
          >
            Selecionar todos em estoque
          </Button>
        )}
      </div>
      <div className="animal-toolbar">
        <label className="search-box">
          <span className="sr-only">Buscar por nome ou brinco</span>
          <Search aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => update('buscaAnimal', event.target.value)}
            placeholder="Buscar por nome ou brinco"
          />
          {query && (
            <button type="button" onClick={() => update('buscaAnimal', '')} aria-label="Limpar busca">
              <X aria-hidden="true" />
            </button>
          )}
        </label>
        <AnimalFilter
          label="Situação"
          value={situation}
          options={['Em estoque', 'Vendido', 'Baixado (morte)', 'Baixado (descarte)']}
          onChange={(value) => update('situacao', value)}
        />
        <AnimalFilter
          label="Pasto"
          value={pasture}
          options={pastureOptions}
          onChange={(value) => update('pastoAnimal', value)}
        />
        <AnimalFilter
          label="Raça"
          value={breed}
          options={breedOptions}
          onChange={(value) => update('raca', value)}
        />
        <AnimalFilter
          label="Dados"
          value={dataState}
          options={['Com dados', 'Sem dados']}
          onChange={(value) => update('dados', value)}
        />
        {filterCount > 0 && (
          <button type="button" className="clear-filters" onClick={clearFilters}>
            Limpar filtros
          </button>
        )}
      </div>
      {selected.length > 0 && (
        <div className="bulk-bar">
          <span>
            <Check aria-hidden="true" />
            {selected.length} {selected.length === 1 ? 'selecionado' : 'selecionados'}
          </span>
          <Button icon={<Edit3 />} onClick={() => setBulkOpen(true)}>
            Editar selecionados
          </Button>
          <button type="button" onClick={() => setSelected([])}>
            Limpar seleção
          </button>
        </div>
      )}
      {filtered.length === 0 ? (
        <div className="no-results">
          <Search aria-hidden="true" />
          <h2>Nenhum animal para este filtro</h2>
          <p>Tente outra busca ou remova algum filtro.</p>
          <Button variant="secondary" onClick={clearFilters}>
            Limpar filtros
          </Button>
        </div>
      ) : (
        <div className="animal-table" role="table" aria-label={`Animais do ${record.name}`}>
          <div className="animal-table__head" role="row">
            <span role="columnheader">
              <span className="sr-only">Selecionar</span>
            </span>
            <span role="columnheader">Animal</span>
            <span role="columnheader">Sexo</span>
            <span role="columnheader">Raça</span>
            <span role="columnheader">Pasto</span>
            <span role="columnheader">Peso atual</span>
            <span role="columnheader">Situação</span>
          </div>
          {filtered.map((animal) => {
            const hasData = animalHasData(animal)
            const readonly = animal.situation !== 'Em estoque' || record.locked
            return (
              <article key={animal.id} className={readonly ? 'readonly' : ''} role="row">
                <label role="cell">
                  <input
                    type="checkbox"
                    checked={selected.includes(animal.id)}
                    disabled={readonly}
                    aria-label={`Selecionar ${animal.order}`}
                    onChange={(event) =>
                      setSelected(
                        event.target.checked
                          ? [...selected, animal.id]
                          : selected.filter((id) => id !== animal.id),
                      )
                    }
                  />
                  <span className="animal-order">{animal.order}</span>
                </label>
                <button
                  type="button"
                  role="cell"
                  className="animal-identity"
                  onClick={() => update('animal', String(animal.id).padStart(2, '0'))}
                >
                  <strong>
                    {hasData ? animal.name || `Brinco ${animal.tag}` : 'Sem identificação'}
                  </strong>
                  <small>
                    {hasData
                      ? animal.tag
                        ? `Brinco ${animal.tag}`
                        : 'Sem brinco'
                      : readonly
                        ? 'Ver dados'
                        : 'Toque para completar'}
                  </small>
                </button>
                <span role="cell" data-label="Sexo">{animal.sex || '—'}</span>
                <span role="cell" data-label="Raça">{animal.breed || '—'}</span>
                <span role="cell" data-label="Pasto">{animal.pasture || '—'}</span>
                <strong role="cell" data-label="Peso">
                  {animal.currentWeight ? `${animal.currentWeight} kg` : '—'}
                </strong>
                <span
                  role="cell"
                  data-label="Situação"
                  className={`animal-situation rb-situation rb-situation--${
                    animal.situation === 'Em estoque'
                      ? 'stock'
                      : animal.situation === 'Vendido'
                        ? 'sold'
                        : 'out'
                  }`}
                >
                  {animal.situation === 'Em estoque' ? (
                    <Beef aria-hidden="true" />
                  ) : animal.situation === 'Vendido' ? (
                    <Check aria-hidden="true" />
                  ) : (
                    <X aria-hidden="true" />
                  )}
                  {animal.situation}
                </span>
              </article>
            )
          })}
        </div>
      )}
      <BulkEdit
        open={bulkOpen}
        count={selected.length}
        onClose={() => setBulkOpen(false)}
        onApply={() => {
          setBulkOpen(false)
          setToast(
            `Dados aplicados ${selected.length === 1 ? 'ao animal selecionado' : `aos ${selected.length} animais selecionados`}.`,
          )
          setSelected([])
        }}
      />
      {detail && (
        <AnimalDetail
          key={detail.id}
          animal={detail}
          animals={animals}
          locked={record.locked}
          recordSlug={record.slug}
          onClose={() => update('animal', '')}
          onSaved={(message) => {
            update('animal', '')
            setToast(message)
          }}
        />
      )}
      <Toast message={toast} onClose={() => setToast(null)} />
    </section>
  )
}

function AnimalFilter({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
}) {
  return (
    <label className={`filter-chip ${value ? 'active' : ''}`}>
      <span>{value || label}</span>
      <ChevronDown aria-hidden="true" />
      <select
        value={value}
        aria-label={`Filtrar por ${label.toLowerCase()}`}
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

function BulkEdit({
  open,
  count,
  onClose,
  onApply,
}: {
  open: boolean
  count: number
  onClose: () => void
  onApply: () => void
}) {
  const [sex, setSex] = useState('')
  const [breed, setBreed] = useState('')
  const [pasture, setPasture] = useState('')
  const [color, setColor] = useState('')
  const [error, setError] = useState(false)
  useEffect(() => {
    if (open) {
      setSex('')
      setBreed('')
      setPasture('')
      setColor('')
      setError(false)
    }
  }, [open])
  const label = count === 1 ? 'Aplicar ao animal selecionado' : `Aplicar aos ${count} animais selecionados`
  return (
    <Modal open={open} onClose={onClose} title="Editar animais selecionados">
      <form
        className="form-stack"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          if (!sex && !breed && !pasture && !color.trim()) {
            setError(true)
            return
          }
          // TODO(integração): aplicar só os campos preenchidos aos animais selecionados.
          onApply()
        }}
      >
        <p className="modal-copy">
          Só os campos preenchidos abaixo serão aplicados. Dados já existentes nos outros campos
          serão mantidos.
        </p>
        <div className="form-grid">
          <label className="select-field">
            <span>Sexo</span>
            <select value={sex} onChange={(event) => setSex(event.target.value)}>
              <option value="">Não alterar</option>
              <option>Macho</option>
              <option>Fêmea</option>
            </select>
          </label>
          <label className="select-field">
            <span>Raça</span>
            <select value={breed} onChange={(event) => setBreed(event.target.value)}>
              <option value="">Não alterar</option>
              {breedOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="select-field">
            <span>Pasto</span>
            <select value={pasture} onChange={(event) => setPasture(event.target.value)}>
              <option value="">Não alterar</option>
              {pastureOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <Field
            label="Cor"
            placeholder="Deixe vazio para não alterar"
            value={color}
            onChange={(event) => setColor(event.target.value)}
          />
        </div>
        {error && (
          <p className="field__error" role="alert">
            Preencha pelo menos um campo para aplicar.
          </p>
        )}
        <div className="modal__actions">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">{label}</Button>
        </div>
      </form>
    </Modal>
  )
}

function WeightChart({ items }: { items: Weighing[] }) {
  if (items.length < 2) return null
  const weights = items.map((item) => item.weight)
  const min = Math.min(...weights)
  const max = Math.max(...weights)
  const span = max - min || 1
  const points = items.map((item, index) => {
    const x = 10 + (index * 340) / (items.length - 1)
    const y = 86 - ((item.weight - min) / span) * 70
    return [x, y] as const
  })
  return (
    <svg
      className="weight-chart"
      viewBox="0 0 360 100"
      role="img"
      aria-label={`Evolução de peso: de ${weights[0]} kg em ${items[0].date} para ${weights[weights.length - 1]} kg em ${items[items.length - 1].date}`}
    >
      <path d={`M${points.map(([x, y]) => `${x} ${y}`).join(' L')}`} />
      {points.map(([x, y], index) => (
        <circle key={index} cx={x} cy={y} r="4" />
      ))}
    </svg>
  )
}

function AnimalDetail({
  animal,
  animals,
  locked,
  recordSlug,
  onClose,
  onSaved,
}: {
  animal: LotAnimal
  animals: LotAnimal[]
  locked: boolean
  recordSlug: string
  onClose: () => void
  onSaved: (message: string) => void
}) {
  const readonly = animal.situation !== 'Em estoque' || locked
  const [name, setName] = useState(animal.name)
  const [tag, setTag] = useState(animal.tag)
  const [sex, setSex] = useState(animal.sex)
  const [breed, setBreed] = useState(animal.breed)
  const [color, setColor] = useState(animal.color)
  const [birthDate, setBirthDate] = useState(animal.birthDate)
  const [approximate, setApproximate] = useState(animal.approximateDate)
  const [pasture, setPasture] = useState(animal.pasture)
  const [note, setNote] = useState(animal.note)
  const [items, setItems] = useState<Weighing[]>(() => initialWeighings(animal))
  const [weightOpen, setWeightOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const normalized = normalizeTag(tag)
  const tagOwner = normalized
    ? (animals.find((other) => other.id !== animal.id && other.tag && normalizeTag(other.tag) === normalized)
        ? `o animal ${animals.find((other) => other.id !== animal.id && normalizeTag(other.tag) === normalized)!.order}`
        : otherTags.find((other) => normalizeTag(other.tag) === normalized)?.owner)
    : undefined
  const tagError = tagOwner ? `Brinco ${tag.trim()} já está em uso por ${tagOwner}.` : undefined
  const birthError = birthDate && birthDate > TODAY_ISO ? 'A data de nascimento não pode ser futura.' : undefined
  const age = ageFrom(birthDate)
  const current = items.length ? items[items.length - 1].weight : animal.initialWeight
  const sale = animal.situation === 'Vendido' ? getSaleText(recordSlug) : null

  return (
    <>
      <Modal
        open
        onClose={onClose}
        title={`${animal.order} · ${animal.name || (animal.tag ? `Brinco ${animal.tag}` : 'Sem identificação')}`}
      >
        <form
          className="animal-detail"
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            if (tagError || birthError) return
            // TODO(integração): salvar os dados opcionais do animal.
            onSaved('Dados do animal salvos.')
          }}
        >
          {readonly && (
            <div className="readonly-animal">
              <Beef aria-hidden="true" />
              <span>
                <strong>Somente leitura</strong>
                <small>
                  {sale ??
                    (animal.situation === 'Em estoque'
                      ? 'Lote vendido: os dados estão travados.'
                      : `${animal.situation}. O custo deste animal ficou com os que permaneceram no lote.`)}
                </small>
              </span>
            </div>
          )}
          <div className="form-grid">
            <Field label="Nome (opcional)" value={name} onChange={(e) => setName(e.target.value)} disabled={readonly} />
            <Field
              label="Brinco (opcional)"
              value={tag}
              inputMode="numeric"
              onChange={(event) => setTag(event.target.value)}
              disabled={readonly}
              error={tagError}
            />
            <label className="select-field">
              <span>Sexo</span>
              <select value={sex} onChange={(e) => setSex(e.target.value)} disabled={readonly}>
                <option value="">Não informado</option>
                <option>Macho</option>
                <option>Fêmea</option>
              </select>
            </label>
            <label className="select-field">
              <span>Raça</span>
              <select value={breed} onChange={(e) => setBreed(e.target.value)} disabled={readonly}>
                <option value="">Não informada</option>
                {breedOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
            <Field label="Cor" value={color} onChange={(e) => setColor(e.target.value)} disabled={readonly} />
            <Field
              label="Data de nascimento"
              type="date"
              max={TODAY_ISO}
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              disabled={readonly}
              error={birthError}
            />
          </div>
          <label className="approximate-check">
            <input
              type="checkbox"
              checked={approximate}
              onChange={(e) => setApproximate(e.target.checked)}
              disabled={readonly}
            />
            Data aproximada
            {age && !birthError ? ` · idade calculada: ${approximate ? 'cerca de ' : ''}${age}` : ''}
          </label>
          <label className="select-field">
            <span>Pasto</span>
            <select value={pasture} onChange={(e) => setPasture(e.target.value)} disabled={readonly}>
              <option value="">Não informado</option>
              {pastureOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="textarea-field">
            <span>Observação</span>
            <textarea
              maxLength={200}
              value={note}
              disabled={readonly}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
            />
            <small aria-live="polite">{note.length}/200 caracteres</small>
          </label>
          <section className="weighing-section" aria-labelledby={`pesagens-${animal.id}`}>
            <div className="detail-panel__heading">
              <div>
                <span className="eyebrow">EVOLUÇÃO</span>
                <h2 id={`pesagens-${animal.id}`}>Pesagens</h2>
              </div>
              {!readonly && (
                <Button
                  type="button"
                  variant="secondary"
                  icon={<Plus />}
                  onClick={() => setWeightOpen(true)}
                >
                  Registrar pesagem
                </Button>
              )}
            </div>
            <p className="weighing-note">A pesagem é por animal; o lote não tem pesagem coletiva.</p>
            <div className="weight-current">
              <Scale aria-hidden="true" />
              <span>
                <small>Peso atual {items.length ? '(última pesagem)' : current ? '(peso inicial)' : ''}</small>
                <strong>{current ? `${decimal(current, 0)} kg` : 'Não informado'}</strong>
              </span>
            </div>
            {items.length === 0 ? (
              <p className="rb-empty-line">
                Nenhuma pesagem registrada ainda.
                {!readonly && ' Use “Registrar pesagem” para acompanhar o ganho de peso.'}
              </p>
            ) : (
              <>
                <WeightChart items={items} />
                <div className="weighing-list">
                  {[...items].reverse().map((item) => (
                    <div key={item.date + item.weight}>
                      <time>{item.date}</time>
                      <strong>{item.weight} kg</strong>
                      <span>{item.note || '—'}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
          <div className="modal__actions">
            <Button type="button" variant="ghost" onClick={onClose}>
              {readonly ? 'Fechar' : 'Cancelar'}
            </Button>
            {!readonly && <Button type="submit">Salvar dados do animal</Button>}
          </div>
        </form>
      </Modal>
      <WeighingModal
        open={weightOpen}
        onClose={() => setWeightOpen(false)}
        onSave={(item) => {
          setItems(
            [...items, item].sort((a, b) =>
              a.date.split('/').reverse().join('').localeCompare(b.date.split('/').reverse().join('')),
            ),
          )
          setWeightOpen(false)
          setToast('Pesagem registrada. O peso atual foi atualizado.')
        }}
      />
      <Toast message={toast} onClose={() => setToast(null)} />
    </>
  )
}

function getSaleText(recordSlug: string) {
  const sale = salesForRecord(recordSlug)[0]
  return sale ? `Vendido em ${sale.date} para ${sale.buyer}.` : 'Vendido.'
}

function WeighingModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean
  onClose: () => void
  onSave: (item: Weighing) => void
}) {
  const [date, setDate] = useState(TODAY_ISO)
  const [weight, setWeight] = useState('')
  const [note, setNote] = useState('')
  const [submitted, setSubmitted] = useState(false)
  useEffect(() => {
    if (open) {
      setDate(TODAY_ISO)
      setWeight('')
      setNote('')
      setSubmitted(false)
    }
  }, [open])
  const value = Number(weight.replace(',', '.'))
  const weightError = submitted && !(value > 0) ? 'Informe um peso maior que zero, em kg.' : undefined
  const dateError = !date
    ? submitted
      ? 'Informe a data da pesagem.'
      : undefined
    : date > TODAY_ISO
      ? 'A data da pesagem não pode ser futura.'
      : undefined
  return (
    <Modal open={open} onClose={onClose} title="Registrar pesagem">
      <form
        className="form-stack"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          setSubmitted(true)
          if (!(value > 0) || !date || date > TODAY_ISO) return
          // TODO(integração): gravar a pesagem do animal.
          onSave({ date: isoToBr(date), weight: value, note: note.trim() })
        }}
      >
        <Field
          label="Data"
          type="date"
          max={TODAY_ISO}
          value={date}
          onChange={(event) => setDate(event.target.value)}
          error={dateError}
        />
        <Field
          label="Peso"
          inputMode="decimal"
          value={weight}
          placeholder="Ex.: 480"
          onChange={(event) => setWeight(event.target.value)}
          suffix={<span className="field-suffix">kg</span>}
          error={weightError}
        />
        <Field label="Observação (opcional)" value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="modal__actions">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" icon={<TrendingUp />}>
            Registrar pesagem
          </Button>
        </div>
      </form>
    </Modal>
  )
}
