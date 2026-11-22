/*
 * Cadastro e edição de lote ou animal (Etapa 2.2).
 *
 * Rotas: /fazenda/:propriedadeId/rebanho/novo  e  /fazenda/:propriedadeId/rebanho/:registroId/editar
 * Parâmetros de URL:
 *   ?passo=1..4     passo do cadastro (na edição começa no 2; modo e quantidade não mudam)
 *   ?modo=animal    começa o cadastro em "Um animal"
 * Estados de demonstração:
 *   ?estado=loading | error
 */
import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import {
  Beef,
  FileImage,
  FileSpreadsheet,
  FileText,
  Plus,
  Power,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { TODAY, getRecord, recordsForProperty, type LivestockRecord } from '@/shared/demo/data'
import { pastures } from '@/shared/demo/livestock'
import { propertyNotFoundCopy, useActiveProperty } from '@/shared/routing/navigation'
import AppShell from '@/shared/layout/AppShell'
import { SoldLockBanner } from '@/shared/ui/BusinessRules'
import { Button, Field, Modal, StateView, Toast } from '@/shared/ui/UI'

type Attribute = { id: number; name: string; value: string }
type Attachment = {
  id: number
  name: string
  size: string
  type: 'image' | 'pdf' | 'sheet'
}

const TODAY_ISO = TODAY.split('/').reverse().join('-')
const brToIso = (br: string) => br.split('/').reverse().join('-')
const isoToBr = (iso: string) => (iso ? iso.split('-').reverse().join('/') : '—')
const pastureOptions = pastures.map((pasture) => pasture.name)
const breedOptions = ['Nelore', 'Cruzado', 'Angus x Nelore']
/** Aceita "41.800,00", "41800" ou "41800,5". */
const decimalPattern = /^(\d{1,3}(\.\d{3})*|\d+)(,\d{1,2})?$/

function hasLinks(record: LivestockRecord) {
  return (
    record.costsByCategory.length > 0 ||
    record.hasSale ||
    record.writeOffs.length > 0 ||
    record.original > 0
  )
}

function money(value: number) {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function AnimalFormPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { registroId } = useParams()
  const [params, setParams] = useSearchParams()
  const editing = location.pathname.endsWith('/editar')
  const { id: propertyId, base, found } = useActiveProperty()
  const record = editing ? getRecord(registroId) : undefined
  const recordOk = !editing || (record && record.propertyId === propertyId)

  const step = Math.min(4, Math.max(editing ? 2 : 1, Number(params.get('passo')) || (editing ? 2 : 1)))
  function setStep(next: number) {
    const updated = new URLSearchParams(params)
    updated.set('passo', String(next))
    setParams(updated)
  }

  const [mode, setMode] = useState<'individual' | 'lot'>(
    record?.kind === 'Individual' || params.get('modo') === 'animal' ? 'individual' : 'lot',
  )
  const [quantity, setQuantity] = useState(record ? record.original : mode === 'individual' ? 1 : 38)
  const [identification, setIdentification] = useState(record?.name ?? '')
  const [formationDate, setFormationDate] = useState(record ? brToIso(record.formationDate) : TODAY_ISO)
  const [origin, setOrigin] = useState<'birth' | 'purchase'>(
    record?.origin === 'Nascimento' ? 'birth' : 'purchase',
  )
  const [acquisition, setAcquisition] = useState(
    record?.acquisitionCost ? money(record.acquisitionCost) : '',
  )
  const [weight, setWeight] = useState('')
  const [notes, setNotes] = useState(record?.notes ?? '')
  const [attributes, setAttributes] = useState<Attribute[]>(
    (record?.attributes ?? []).map((attribute, index) => ({ id: index + 1, ...attribute })),
  )
  const [files, setFiles] = useState<Attachment[]>(
    (record?.documents ?? []).map((doc, index) => ({
      id: index + 1,
      name: doc.name,
      size: doc.size,
      type: doc.type === 'foto' ? 'image' : doc.type === 'planilha' ? 'sheet' : 'pdf',
    })),
  )
  const [submitted, setSubmitted] = useState(false)
  const [dangerOpen, setDangerOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const forcedState = params.get('estado')

  useEffect(() => {
    // Ao trocar de registro pela rota, recarrega os valores iniciais.
    if (!record) return
    setIdentification(record.name)
    setMode(record.kind === 'Individual' ? 'individual' : 'lot')
    setQuantity(record.original)
  }, [record])

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
  if (!recordOk || (editing && !record)) {
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

  const noun = mode === 'lot' ? 'lote' : 'animal'
  const trimmed = identification.trim().toLowerCase()
  const duplicate = recordsForProperty(propertyId, { includeInactive: true }).some(
    (other) => other.name.toLowerCase() === trimmed && other.slug !== record?.slug,
  )
  const futureDate = formationDate > TODAY_ISO
  const quantityError =
    mode === 'lot' && !(Number.isInteger(quantity) && quantity >= 2)
      ? 'Um lote precisa ter pelo menos 2 cabeças (número inteiro).'
      : undefined
  const identificationError = duplicate
    ? 'Já existe um lote ou animal com este nome nesta propriedade.'
    : submitted && !identification.trim()
      ? 'Informe uma identificação.'
      : undefined
  const dateError = futureDate
    ? 'A data de formação não pode ser futura.'
    : submitted && !formationDate
      ? 'Informe a data de formação.'
      : undefined
  const acquisitionError =
    origin === 'purchase' && acquisition && !decimalPattern.test(acquisition.trim())
      ? 'Use só números, com vírgula nos centavos. Ex.: 41.800,00'
      : undefined
  const weightError =
    weight && !decimalPattern.test(weight.trim()) ? 'Informe o peso em kg. Ex.: 320' : undefined
  const step2Invalid =
    !identification.trim() || duplicate || futureDate || !formationDate || Boolean(acquisitionError) || Boolean(weightError)

  function next2() {
    setSubmitted(true)
    if (step2Invalid) return
    setStep(3)
  }

  function finish() {
    setSubmitted(true)
    if (step2Invalid || (!editing && quantityError)) {
      setStep(!editing && quantityError ? 1 : 2)
      return
    }
    // TODO(integração): criar o registro e um documento de animal para cada cabeça.
    setToast(
      editing
        ? 'Alterações salvas.'
        : mode === 'lot'
          ? `Lote cadastrado. ${quantity} animais criados.`
          : 'Animal cadastrado.',
    )
    window.setTimeout(
      () =>
        navigate(
          `${base}/rebanho/${editing && record ? record.slug : mode === 'lot' ? 'lote-safra-24' : 'boi-047'}?aba=geral`,
        ),
      800,
    )
  }

  const title = editing && record ? record.name : 'Cadastrar no rebanho'
  const linked = record ? hasLinks(record) : false

  return (
    <AppShell>
      <div className="record-form-page">
        <header className="record-form-heading">
          <button
            type="button"
            className="back-link"
            onClick={() =>
              navigate(editing && record ? `${base}/rebanho/${record.slug}?aba=geral` : `${base}/rebanho`)
            }
          >
            ← {editing ? `Voltar para ${record?.name}` : 'Voltar para o rebanho'}
          </button>
          <span className="eyebrow">{editing ? `EDITAR ${noun.toUpperCase()}` : 'NOVO REGISTRO'}</span>
          <h1>{title}</h1>
          <p>Dados individuais são opcionais e não entram nos cálculos.</p>
        </header>

        {forcedState === 'loading' || forcedState === 'error' ? (
          <StateView
            type={forcedState}
            onAction={() => {
              const updated = new URLSearchParams(params)
              updated.delete('estado')
              setParams(updated)
            }}
          />
        ) : record?.locked ? (
          <SoldLockBanner
            item="Lote"
            recordSlug={record.slug}
            target="Dados do lote"
            before={`${record.name} · formado em ${record.formationDate}`}
          />
        ) : (
          <>
            <ol className="stepper stepper--four" aria-label={`Etapa ${step} de 4`}>
              {['Como acompanha', 'Dados', 'Detalhes', 'Revisar'].map((label, index) => (
                <li
                  key={label}
                  className={step >= index + 1 ? 'active' : ''}
                  aria-current={step === index + 1 ? 'step' : undefined}
                >
                  <i>{index + 1}</i>
                  <b>{label}</b>
                </li>
              ))}
            </ol>

            <AnimatePresence mode="wait">
              {step === 1 && !editing && (
                <motion.section
                  className="type-step"
                  key="mode"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                >
                  <div className="type-choices" role="radiogroup" aria-label="Como você acompanha este gado">
                    <button
                      type="button"
                      role="radio"
                      aria-checked={mode === 'individual'}
                      className={mode === 'individual' ? 'active' : ''}
                      onClick={() => {
                        setMode('individual')
                        setQuantity(1)
                      }}
                    >
                      <Beef aria-hidden="true" />
                      <span>
                        <strong>Um animal</strong>
                        <small>Quantidade fixa: 1 animal</small>
                      </span>
                      <i />
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={mode === 'lot'}
                      className={mode === 'lot' ? 'active' : ''}
                      onClick={() => {
                        setMode('lot')
                        setQuantity(Math.max(2, quantity))
                      }}
                    >
                      <Users aria-hidden="true" />
                      <span>
                        <strong>Um lote de animais</strong>
                        <small>Cria um animal para cada cabeça</small>
                      </span>
                      <i />
                    </button>
                  </div>
                  {mode === 'lot' && (
                    <Field
                      label="Quantas cabeças?"
                      inputMode="numeric"
                      value={quantity || ''}
                      onChange={(event) => setQuantity(Number(event.target.value.replace(/\D/g, '')))}
                      error={submitted || quantity ? quantityError : undefined}
                      suffix={<span className="field-suffix">cabeças</span>}
                    />
                  )}
                  <div className="form-footer">
                    <span />
                    <Button
                      onClick={() => {
                        if (quantityError) {
                          setSubmitted(true)
                          return
                        }
                        setStep(2)
                      }}
                    >
                      Continuar
                    </Button>
                  </div>
                </motion.section>
              )}

              {step === 2 && (
                <motion.section
                  className="record-form"
                  key="data"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  {editing && record && (
                    <div className="locked-form-note">
                      <Beef aria-hidden="true" />
                      <span>
                        <strong>
                          {record.kind === 'Individual'
                            ? 'Animal individual · 1 cabeça'
                            : `Lote · ${record.original} cabeças · saldo ${record.balance}`}
                        </strong>
                        <small>
                          O modo e a quantidade não mudam na edição. Para mudar a quantidade, registre
                          uma entrada ou uma baixa em Movimentações.
                        </small>
                      </span>
                    </div>
                  )}
                  <section className="form-section">
                    <div className="form-section__heading">
                      <span>02</span>
                      <div>
                        <h2>Dados do registro</h2>
                        <p>Identificação, formação e origem.</p>
                      </div>
                    </div>
                    <div className="form-grid">
                      <Field
                        label="Identificação"
                        value={identification}
                        onChange={(event) => setIdentification(event.target.value)}
                        placeholder={mode === 'lot' ? 'Ex.: Lote Safra 25' : 'Ex.: Boi 048'}
                        error={identificationError}
                      />
                      <Field
                        label="Data de formação"
                        type="date"
                        value={formationDate}
                        max={TODAY_ISO}
                        onChange={(event) => setFormationDate(event.target.value)}
                        error={dateError}
                      />
                    </div>
                    <div className="role-choices origin-choices" role="radiogroup" aria-label="Origem">
                      <button
                        type="button"
                        role="radio"
                        aria-checked={origin === 'birth'}
                        className={origin === 'birth' ? 'active' : ''}
                        onClick={() => setOrigin('birth')}
                      >
                        <Beef aria-hidden="true" />
                        <span>
                          <strong>Nascimento na propriedade</strong>
                          <small>Animais nascidos nesta fazenda.</small>
                        </span>
                        <i />
                      </button>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={origin === 'purchase'}
                        className={origin === 'purchase' ? 'active' : ''}
                        onClick={() => setOrigin('purchase')}
                      >
                        <Beef aria-hidden="true" />
                        <span>
                          <strong>Compra (aquisição)</strong>
                          <small>Animais comprados de terceiros.</small>
                        </span>
                        <i />
                      </button>
                    </div>
                    {origin === 'purchase' && (
                      <>
                        <Field
                          label="Custo de aquisição (opcional)"
                          inputMode="decimal"
                          value={acquisition}
                          placeholder="0,00"
                          onChange={(event) => setAcquisition(event.target.value)}
                          error={acquisitionError}
                          suffix={<span className="field-suffix">R$</span>}
                        />
                        <p className="field-help">Entra no custo do {noun}.</p>
                      </>
                    )}
                    {mode === 'lot' ? (
                      <>
                        <Field
                          label="Peso médio inicial (opcional)"
                          inputMode="decimal"
                          value={weight}
                          onChange={(event) => setWeight(event.target.value)}
                          error={weightError}
                          suffix={<span className="field-suffix">kg</span>}
                        />
                        <p className="field-help">Vale para todos os animais criados.</p>
                        {!editing && (
                          <div className="optional-animal-block">
                            <div>
                              <strong>Para todos os animais (opcional)</strong>
                              <small>Você pode mudar animal por animal depois.</small>
                            </div>
                            <div className="form-grid">
                              <SelectField label="Pasto" options={pastureOptions} />
                              <SelectField label="Raça" options={breedOptions} />
                              <SelectField label="Sexo" options={['Macho', 'Fêmea']} />
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <IndividualFields record={record} />
                    )}
                  </section>
                  <div className="form-footer">
                    <Button
                      variant="ghost"
                      onClick={() =>
                        editing && record
                          ? navigate(`${base}/rebanho/${record.slug}?aba=geral`)
                          : setStep(1)
                      }
                    >
                      {editing ? 'Cancelar' : 'Voltar'}
                    </Button>
                    <Button onClick={next2}>Continuar</Button>
                  </div>
                </motion.section>
              )}

              {step === 3 && (
                <motion.section
                  className="record-form"
                  key="details"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <section className="form-section">
                    <div className="form-section__heading">
                      <span>03</span>
                      <div>
                        <h2>Características, documentos e anotações</h2>
                        <p>Informações opcionais do {noun}.</p>
                      </div>
                    </div>
                    <div className="attribute-list">
                      {attributes.map((attribute) => (
                        <div className="attribute-row" key={attribute.id}>
                          <label>
                            <span>Nome</span>
                            <input
                              list="attribute-suggestions"
                              value={attribute.name}
                              placeholder="Ex.: Marca"
                              onChange={(event) =>
                                setAttributes(
                                  attributes.map((item) =>
                                    item.id === attribute.id ? { ...item, name: event.target.value } : item,
                                  ),
                                )
                              }
                            />
                          </label>
                          <label>
                            <span>Valor</span>
                            <input
                              value={attribute.value}
                              placeholder="Ex.: FB 24"
                              onChange={(event) =>
                                setAttributes(
                                  attributes.map((item) =>
                                    item.id === attribute.id ? { ...item, value: event.target.value } : item,
                                  ),
                                )
                              }
                            />
                          </label>
                          <button
                            type="button"
                            className="icon-button"
                            onClick={() => setAttributes(attributes.filter((item) => item.id !== attribute.id))}
                            aria-label={`Remover característica ${attribute.name || 'sem nome'}`}
                          >
                            <X aria-hidden="true" />
                          </button>
                        </div>
                      ))}
                      <datalist id="attribute-suggestions">
                        <option value="Marca" />
                        <option value="Cor predominante" />
                        <option value="Linhagem" />
                      </datalist>
                      <Button
                        variant="secondary"
                        icon={<Plus />}
                        onClick={() => setAttributes([...attributes, { id: Date.now(), name: '', value: '' }])}
                      >
                        Adicionar característica
                      </Button>
                    </div>
                    <button
                      type="button"
                      className="document-upload"
                      onClick={() => {
                        // TODO(integração): abrir o seletor de arquivos e enviar (até 10 MB).
                        setFiles([...files, { id: Date.now(), name: 'planilha_animais.xlsx', size: '42 KB', type: 'sheet' }])
                        setToast('Documento anexado.')
                      }}
                    >
                      <Upload aria-hidden="true" />
                      <span>
                        <strong>Anexar documento</strong>
                        <small>Foto, PDF ou planilha · até 10 MB</small>
                      </span>
                    </button>
                    {files.length === 0 ? (
                      <p className="field-help">Nenhum documento anexado.</p>
                    ) : (
                      <ul className="attachment-list">
                        {files.map((file) => (
                          <li key={file.id}>
                            {file.type === 'pdf' ? (
                              <FileText aria-hidden="true" />
                            ) : file.type === 'sheet' ? (
                              <FileSpreadsheet aria-hidden="true" />
                            ) : (
                              <FileImage aria-hidden="true" />
                            )}
                            <span>
                              <strong>{file.name}</strong>
                              <small>{file.size}</small>
                            </span>
                            <button
                              type="button"
                              className="icon-button"
                              onClick={() => setFiles(files.filter((item) => item.id !== file.id))}
                              aria-label={`Remover ${file.name}`}
                            >
                              <Trash2 aria-hidden="true" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    <label className="textarea-field">
                      <span>Anotações</span>
                      <textarea
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                        rows={5}
                        placeholder="Informações importantes sobre o registro..."
                      />
                    </label>
                  </section>
                  <div className="form-footer">
                    <Button variant="ghost" onClick={() => setStep(2)}>
                      Voltar
                    </Button>
                    <Button onClick={() => setStep(4)}>Revisar</Button>
                  </div>
                </motion.section>
              )}

              {step === 4 && (
                <motion.section
                  className="record-form"
                  key="review"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <section className="form-section record-review">
                    <span className="eyebrow">REVISE ANTES DE SALVAR</span>
                    <h2>{identification || 'Sem identificação'}</h2>
                    <dl>
                      <div>
                        <dt>Modo</dt>
                        <dd>{mode === 'lot' ? 'Lote' : 'Individual'}</dd>
                      </div>
                      <div>
                        <dt>Formação</dt>
                        <dd>{isoToBr(formationDate)}</dd>
                      </div>
                      <div>
                        <dt>Origem</dt>
                        <dd>
                          {origin === 'purchase' ? 'Compra (aquisição)' : 'Nascimento na propriedade'}
                          {origin === 'purchase' && acquisition ? ` · R$ ${acquisition}` : ''}
                        </dd>
                      </div>
                      <div>
                        <dt>Quantidade</dt>
                        <dd>
                          {quantity} {quantity === 1 ? 'animal' : 'animais'}
                        </dd>
                      </div>
                    </dl>
                    {!editing && (
                      <div className="creation-note">
                        <Users aria-hidden="true" />
                        <p>
                          <strong>
                            {mode === 'lot'
                              ? `Vamos criar ${quantity} animais neste lote.`
                              : 'Vamos criar 1 animal.'}
                          </strong>
                          <small>Você pode completar os dados de cada um quando quiser.</small>
                        </p>
                      </div>
                    )}
                  </section>
                  <div className="form-footer">
                    <Button variant="ghost" onClick={() => setStep(3)}>
                      Voltar
                    </Button>
                    <Button onClick={finish}>
                      {editing ? 'Salvar alterações' : mode === 'lot' ? 'Cadastrar lote' : 'Cadastrar animal'}
                    </Button>
                  </div>
                </motion.section>
              )}
            </AnimatePresence>

            {editing && record && (
              <section className="danger-zone">
                <div>
                  <h2>Outras ações</h2>
                  <p>
                    {linked
                      ? `Este ${noun} tem histórico, por isso será inativado e não excluído.`
                      : `Este ${noun} não tem custos, vendas nem movimentações e pode ser excluído.`}
                  </p>
                </div>
                <Button
                  variant="danger"
                  icon={linked ? <Power /> : <Trash2 />}
                  onClick={() => setDangerOpen(true)}
                >
                  {linked ? `Inativar ${noun}` : `Excluir ${noun}`}
                </Button>
              </section>
            )}
          </>
        )}
      </div>
      {record && (
        <Modal
          open={dangerOpen}
          onClose={() => setDangerOpen(false)}
          title={linked ? `Inativar ${record.name}?` : `Excluir ${record.name}?`}
        >
          <p className="modal-copy">
            {linked
              ? `O ${noun} sai das listas de escolha, mas animais, custos, vendas e movimentações são preservados. Você pode reativá-lo com “Mostrar inativos” no Rebanho.`
              : `O ${noun} será removido. Esta ação não pode ser desfeita.`}
          </p>
          <div className="modal__actions">
            <Button variant="ghost" onClick={() => setDangerOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
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
      )}
      <Toast message={toast} onClose={() => setToast(null)} />
    </AppShell>
  )
}

function SelectField({
  label,
  options,
  defaultValue = '',
}: {
  label: string
  options: string[]
  defaultValue?: string
}) {
  return (
    <label className="select-field">
      <span>{label}</span>
      <select defaultValue={defaultValue}>
        <option value="">Não informar</option>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  )
}

function IndividualFields({ record }: { record?: LivestockRecord }) {
  const tag = record?.attributes.find((a) => a.name === 'Brinco')?.value ?? ''
  const [note, setNote] = useState('')
  const [birth, setBirth] = useState(record ? '2024-04-15' : '')
  const birthError = birth > TODAY_ISO ? 'A data de nascimento não pode ser futura.' : undefined
  return (
    <div className="individual-fields">
      <div>
        <strong>Dados do animal (opcionais)</strong>
        <small>Nenhum destes campos entra nos cálculos.</small>
      </div>
      <div className="form-grid">
        <Field label="Nome" defaultValue={record?.name ?? ''} />
        <Field label="Brinco" inputMode="numeric" defaultValue={tag} />
        <SelectField label="Sexo" options={['Macho', 'Fêmea']} defaultValue={record ? 'Macho' : ''} />
        <SelectField label="Raça" options={breedOptions} defaultValue={record?.breed ?? ''} />
        <Field label="Cor" defaultValue={record ? 'Branca' : ''} />
        <Field
          label="Data de nascimento"
          type="date"
          max={TODAY_ISO}
          value={birth}
          onChange={(event) => setBirth(event.target.value)}
          error={birthError}
        />
        <label className="approximate-check">
          <input type="checkbox" defaultChecked={Boolean(record)} />
          Data aproximada
        </label>
        <Field
          label="Peso inicial"
          inputMode="decimal"
          suffix={<span className="field-suffix">kg</span>}
        />
        <SelectField label="Pasto" options={pastureOptions} defaultValue={record?.pasture ?? ''} />
      </div>
      <label className="textarea-field">
        <span>Observação</span>
        <textarea maxLength={200} rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
        <small aria-live="polite">{note.length}/200 caracteres</small>
      </label>
    </div>
  )
}
