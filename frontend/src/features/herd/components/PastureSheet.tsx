/*
 * Folha "Pastos" (Etapa 2.7), aberta pelo botão "Pastos" do Rebanho.
 *
 * Parâmetros de URL (controlados pelo HerdPage):
 *   ?pastos=1                         abre a folha
 *   ?pastos=1&estadoPastos=empty      lista vazia
 *   ?pastos=1&estadoPastos=loading    carregando
 *   ?pastos=1&estadoPastos=error      erro com "Tentar de novo"
 *   ?pastos=1&pastosInativos=1        mostra os pastos inativos
 */
import { useEffect, useState } from 'react'
import { Edit3, MapPin, Plus, Power, RotateCcw, Trash2 } from 'lucide-react'
import { pastures as basePastures } from '@/shared/demo/livestock'
import { Button, Field, Modal, StateView, Toast } from '@/shared/ui/UI'

type Pasture = {
  name: string
  area: string
  animals: number
  /** Já teve animais (histórico): só pode ser inativado, não excluído. */
  hasHistory: boolean
  inactive: boolean
}

type Dialog =
  | { kind: 'create' }
  | { kind: 'rename'; pasture: Pasture }
  | { kind: 'inactivate'; pasture: Pasture }
  | { kind: 'blocked'; pasture: Pasture }
  | { kind: 'delete'; pasture: Pasture }
  | null

export default function PastureSheet({
  open,
  onClose,
  state,
  showInactive = false,
  onShowInactive,
  onRetry,
}: {
  open: boolean
  onClose: () => void
  /** Estado de demonstração vindo da rota. */
  state?: 'empty' | 'loading' | 'error' | null
  showInactive?: boolean
  onShowInactive?: (value: boolean) => void
  onRetry?: () => void
}) {
  // TODO(integração): buscar e gravar os pastos da propriedade na API.
  const [list, setList] = useState<Pasture[]>(() =>
    basePastures.map((pasture) => ({ ...pasture, hasHistory: true, inactive: false })),
  )
  const [dialog, setDialog] = useState<Dialog>(null)
  const [toast, setToast] = useState<string | null>(null)
  const visible = state === 'empty' ? [] : list.filter((p) => showInactive || !p.inactive)
  const inactiveCount = list.filter((p) => p.inactive).length

  function save(name: string, area: string) {
    if (dialog?.kind === 'rename') {
      setList(list.map((p) => (p.name === dialog.pasture.name ? { ...p, name, area: area ? `${area} ha` : p.area } : p)))
      setToast(`Pasto renomeado para “${name}”.`)
    } else {
      setList([...list, { name, area: area ? `${area} ha` : 'Área não informada', animals: 0, hasHistory: false, inactive: false }])
      setToast(`Pasto “${name}” criado.`)
    }
    setDialog(null)
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title="Pastos">
        <div className="pasture-sheet">
          <div className="pasture-sheet__intro">
            <p>Organize onde os animais estão. A área é opcional.</p>
            <Button icon={<Plus />} onClick={() => setDialog({ kind: 'create' })}>
              Novo pasto
            </Button>
          </div>
          {state === 'loading' || state === 'error' ? (
            <StateView type={state} onAction={onRetry} />
          ) : visible.length === 0 ? (
            <StateView
              type="empty"
              title="Cadastre seu primeiro pasto"
              text="Ex.: Piquete da Serra, Pasto do Córrego. Depois você indica onde cada animal está."
              actionLabel="Novo pasto"
              onAction={() => setDialog({ kind: 'create' })}
            />
          ) : (
            <ul className="pasture-list rb-pasture-list">
              {visible.map((pasture) => (
                <li key={pasture.name} className={pasture.inactive ? 'is-inactive' : ''}>
                  <span aria-hidden="true">
                    <MapPin />
                  </span>
                  <p>
                    <strong>
                      {pasture.name}
                      {pasture.inactive && <em className="rb-inactive-tag">Inativo</em>}
                    </strong>
                    <small>
                      {pasture.area} · {pasture.animals}{' '}
                      {pasture.animals === 1 ? 'animal' : 'animais'}
                    </small>
                  </p>
                  <div className="rb-pasture-actions">
                    {pasture.inactive ? (
                      <button
                        type="button"
                        onClick={() => {
                          setList(list.map((p) => (p.name === pasture.name ? { ...p, inactive: false } : p)))
                          setToast(`Pasto “${pasture.name}” reativado.`)
                        }}
                      >
                        <RotateCcw aria-hidden="true" /> Reativar
                      </button>
                    ) : (
                      <>
                        <button type="button" onClick={() => setDialog({ kind: 'rename', pasture })}>
                          <Edit3 aria-hidden="true" /> Renomear
                        </button>
                        {pasture.hasHistory ? (
                          <button
                            type="button"
                            onClick={() =>
                              setDialog({ kind: pasture.animals ? 'blocked' : 'inactivate', pasture })
                            }
                          >
                            <Power aria-hidden="true" /> Inativar
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="rb-danger-link"
                            onClick={() => setDialog({ kind: 'delete', pasture })}
                          >
                            <Trash2 aria-hidden="true" /> Excluir
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {(inactiveCount > 0 || showInactive) && state !== 'empty' && (
            <label className={`filter-chip ${showInactive ? 'active' : ''}`}>
              <input
                className="chip-checkbox"
                type="checkbox"
                checked={showInactive}
                onChange={(event) => onShowInactive?.(event.target.checked)}
              />
              Mostrar inativos ({inactiveCount})
            </label>
          )}
          <p className="fine-print">
            Pastos que já tiveram animais são inativados, não excluídos. Com animais dentro, mova-os
            antes de inativar. Só pasto sem nenhum vínculo pode ser excluído.
          </p>
        </div>
      </Modal>

      <PastureForm
        open={dialog?.kind === 'create' || dialog?.kind === 'rename'}
        editing={dialog?.kind === 'rename' ? dialog.pasture : null}
        names={list.map((p) => p.name)}
        onClose={() => setDialog(null)}
        onSave={save}
      />

      <Modal
        open={dialog?.kind === 'blocked'}
        onClose={() => setDialog(null)}
        title="Mova os animais antes"
      >
        {dialog?.kind === 'blocked' && (
          <>
            <p className="modal-copy">
              O {dialog.pasture.name} tem {dialog.pasture.animals}{' '}
              {dialog.pasture.animals === 1 ? 'animal' : 'animais'}. Mude o pasto deles na aba
              Animais do lote (dá para editar vários de uma vez) e depois inative o pasto.
            </p>
            <div className="modal__actions">
              <Button onClick={() => setDialog(null)}>Entendi</Button>
            </div>
          </>
        )}
      </Modal>

      <Modal
        open={dialog?.kind === 'inactivate' || dialog?.kind === 'delete'}
        onClose={() => setDialog(null)}
        title={
          dialog?.kind === 'delete'
            ? `Excluir ${dialog.pasture.name}?`
            : dialog?.kind === 'inactivate'
              ? `Inativar ${dialog.pasture.name}?`
              : ''
        }
      >
        {(dialog?.kind === 'inactivate' || dialog?.kind === 'delete') && (
          <>
            <p className="modal-copy">
              {dialog.kind === 'delete'
                ? 'Este pasto não tem nenhum vínculo e será removido da lista.'
                : 'O pasto some das listas de escolha, mas o histórico dos animais que passaram por ele é mantido. Você pode reativá-lo com “Mostrar inativos”.'}
            </p>
            <div className="modal__actions">
              <Button variant="ghost" onClick={() => setDialog(null)}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                icon={dialog.kind === 'delete' ? <Trash2 /> : <Power />}
                onClick={() => {
                  const name = dialog.pasture.name
                  if (dialog.kind === 'delete') {
                    setList(list.filter((p) => p.name !== name))
                    setToast(`Pasto “${name}” excluído.`)
                  } else {
                    setList(list.map((p) => (p.name === name ? { ...p, inactive: true } : p)))
                    setToast(`Pasto “${name}” inativado.`)
                  }
                  setDialog(null)
                }}
              >
                {dialog.kind === 'delete' ? 'Excluir pasto' : 'Inativar pasto'}
              </Button>
            </div>
          </>
        )}
      </Modal>
      <Toast message={toast} onClose={() => setToast(null)} />
    </>
  )
}

function PastureForm({
  open,
  editing,
  names,
  onClose,
  onSave,
}: {
  open: boolean
  editing: Pasture | null
  names: string[]
  onClose: () => void
  onSave: (name: string, area: string) => void
}) {
  const [name, setName] = useState('')
  const [area, setArea] = useState('')
  const [submitted, setSubmitted] = useState(false)
  useEffect(() => {
    if (open) {
      setName(editing?.name ?? '')
      setArea('')
      setSubmitted(false)
    }
  }, [open, editing])
  const trimmed = name.trim()
  const duplicate = names.some(
    (other) => other.toLowerCase() === trimmed.toLowerCase() && other !== editing?.name,
  )
  const areaValue = area ? Number(area.replace(',', '.')) : 0
  const error = duplicate
    ? 'Já existe um pasto com este nome.'
    : submitted && !trimmed
      ? 'Informe o nome do pasto.'
      : undefined
  const areaError = area && !(areaValue > 0) ? 'Informe a área em hectares. Ex.: 12,5' : undefined
  return (
    <Modal open={open} onClose={onClose} title={editing ? `Renomear ${editing.name}` : 'Novo pasto'}>
      <form
        className="form-stack"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          setSubmitted(true)
          if (!trimmed || duplicate || areaError) return
          onSave(trimmed, area)
        }}
      >
        <Field
          label="Nome do pasto"
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={error}
          placeholder="Ex.: Piquete Novo"
        />
        <Field
          label={editing ? `Área (opcional · hoje: ${editing.area})` : 'Área (opcional)'}
          inputMode="decimal"
          value={area}
          onChange={(event) => setArea(event.target.value)}
          error={areaError}
          suffix={<span className="field-suffix">ha</span>}
        />
        <div className="modal__actions">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">{editing ? 'Salvar nome' : 'Criar pasto'}</Button>
        </div>
      </form>
    </Modal>
  )
}
