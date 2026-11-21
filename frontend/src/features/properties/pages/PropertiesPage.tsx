/*
 * Minhas propriedades (Etapa 1.3 a 1.6).
 * Parâmetros de demonstração na URL:
 *   ?estado=empty | loading | error   estado vazio (usuário novo), carregando e erro com "Tentar de novo"
 *   ?cadastro=1                        abre o cadastro de propriedade; ?passo=1|2|3 abre no passo
 *   ?cadastro=erro                     o cadastro falha na primeira tentativa (estado de erro)
 *   ?acao=editar|titular|inativar&id=  abre a ação do menu do cartão (respeita a permissão)
 *   ?inativada=<id>                    volta de Configurações com a propriedade inativada (toast)
 *   ?deixou=<id>                       volta de Configurações depois de "Sair desta propriedade"
 *   ?nova=1                            toast de propriedade cadastrada
 */
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import {
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Ellipsis,
  LogOut,
  MapPin,
  Pencil,
  Plus,
  Power,
  RotateCcw,
  ShieldCheck,
  UserRound,
  UsersRound,
} from 'lucide-react'
import { motion } from 'motion/react'
import { listableProperties, type PropertyInfo } from '@/shared/demo/data'
import PropertyRegistration, {
  canManageOwner,
  OWNER_ONLY_COPY,
  states as ufList,
  type RegisteredProperty,
} from '@/features/properties/components/PropertyRegistration'
import { Brand, Button, Field, Modal, StateView, Toast } from '@/shared/ui/UI'

type PropertyCardData = Pick<
  PropertyInfo,
  'name' | 'place' | 'area' | 'role' | 'owner' | 'confirmed' | 'logo' | 'cover' | 'lastUsed'
> & {
  id: string
  municipality: string
  uf: string
  inactive?: boolean
}

type CardAction = 'edit' | 'owner' | 'inactive'

const initialProperties: PropertyCardData[] = [
  ...listableProperties.map((property) => ({ ...property, inactive: false })),
  {
    id: 'boa-esperanca',
    name: 'Fazenda Boa Esperança',
    place: 'Mariana/MG',
    municipality: 'Mariana',
    uf: 'MG',
    area: '36 ha',
    role: 'Proprietário',
    owner: 'João Batista',
    confirmed: true,
    logo: '',
    cover: '',
    lastUsed: false,
    inactive: true,
  },
]

const actionParam: Record<string, CardAction> = {
  editar: 'edit',
  titular: 'owner',
  inativar: 'inactive',
}

export default function PropertiesPage() {
  const [params, setParams] = useSearchParams()
  const state = params.get('estado') as 'loading' | 'error' | 'empty' | null
  const registration = params.get('cadastro')
  const addOpen = registration === '1' || registration === 'erro'
  const step = Math.min(3, Math.max(1, Number(params.get('passo')) || 1))
  const [list, setList] = useState<PropertyCardData[]>(() => {
    const inactivated = params.get('inativada') || params.get('deixou')
    return initialProperties
      .filter((item) => item.id !== params.get('deixou'))
      .map((item) => (item.id === inactivated ? { ...item, inactive: true } : item))
  })
  const [menuId, setMenuId] = useState<string | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(() => {
    if (params.get('nova') === '1')
      return 'Propriedade cadastrada. Criamos 6 categorias de custo para você começar.'
    const inactivated = initialProperties.find((item) => item.id === params.get('inativada'))
    if (inactivated) return `${inactivated.name} foi inativada. Nada foi apagado.`
    const left = initialProperties.find((item) => item.id === params.get('deixou'))
    if (left) return `Você saiu da ${left.name}.`
    return null
  })
  const [showInactive, setShowInactive] = useState(true)
  const navigate = useNavigate()
  const menuRef = useRef<HTMLDivElement>(null)

  const actionId = params.get('id')
  const requestedAction = actionParam[params.get('acao') || '']
  const selected = list.find((item) => item.id === actionId) || null
  const action: CardAction | null =
    selected && requestedAction && !selected.inactive
      ? requestedAction === 'edit' || canManageOwner(selected)
        ? requestedAction
        : null
      : null

  useEffect(() => {
    if (!menuId) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuId(null)
    }
    function onPointer(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuId(null)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onPointer)
    }
  }, [menuId])

  function updateParams(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params)
    Object.entries(changes).forEach(([key, value]) =>
      value === null ? next.delete(key) : next.set(key, value),
    )
    setParams(next, { replace: true })
  }

  function openAction(property: PropertyCardData, next: CardAction) {
    setMenuId(null)
    const slug = Object.keys(actionParam).find((key) => actionParam[key] === next)!
    updateParams({ acao: slug, id: property.id })
  }

  function closeAction() {
    updateParams({ acao: null, id: null })
  }

  function updateProperty(id: string, changes: Partial<PropertyCardData>) {
    setList((current) => current.map((item) => (item.id === id ? { ...item, ...changes } : item)))
  }

  function logout() {
    navigate('/entrar?saiu=1')
  }

  function propertyRegistered(property: RegisteredProperty) {
    // TODO(integração): usar o identificador retornado pela API e persistir os dados digitados.
    try {
      sessionStorage.setItem('mochos:new-property-name', property.name)
    } catch {
      // Sem sessionStorage o Resumo usa o nome padrão.
    }
    navigate('/fazenda/nova-propriedade/resumo?nova=1')
  }

  const visible = list.filter((property) => !property.inactive || showInactive)
  const inactiveCount = list.filter((property) => property.inactive).length

  return (
    <div className="properties-page">
      <header className="properties-header">
        <Brand compact />
        <div className="properties-header__user">
          <span aria-hidden="true">JB</span>
          <div>
            <strong>João Batista</strong>
            <small>Produtor rural</small>
          </div>
          <button className="icon-button" onClick={logout} aria-label="Sair da conta">
            <LogOut aria-hidden="true" />
          </button>
        </div>
      </header>
      <main className="properties-content">
        <div className="page-title-row">
          <div>
            <span className="eyebrow">SEU CAMPO</span>
            <h1>Minhas propriedades</h1>
            <p>Escolha onde você quer trabalhar hoje.</p>
          </div>
          {state !== 'empty' && (
            <div className="property-page-actions">
              {inactiveCount > 0 && (
                <label className="inactive-filter">
                  <input
                    type="checkbox"
                    checked={showInactive}
                    onChange={(event) => setShowInactive(event.target.checked)}
                  />{' '}
                  Mostrar inativas ({inactiveCount})
                </label>
              )}
              <Button
                icon={<Plus aria-hidden="true" />}
                onClick={() => updateParams({ cadastro: '1', passo: null })}
              >
                Adicionar propriedade
              </Button>
            </div>
          )}
        </div>

        {state === 'empty' ? (
          <section className="first-property-empty">
            <div className="organic-property-empty" aria-hidden="true">
              <Building2 />
            </div>
            <span className="eyebrow">VAMOS COMEÇAR</span>
            <h2>Cadastre sua primeira propriedade</h2>
            <p>
              Adicione a fazenda ou o sítio onde você trabalha para começar a acompanhar o rebanho.
            </p>
            <Button
              icon={<Plus aria-hidden="true" />}
              onClick={() => updateParams({ cadastro: '1', passo: null })}
            >
              Cadastrar primeira propriedade
            </Button>
          </section>
        ) : state === 'loading' ? (
          <StateView type="loading" title="Buscando suas propriedades…" />
        ) : state === 'error' ? (
          <StateView
            type="error"
            title="Não conseguimos carregar suas propriedades"
            onAction={() => updateParams({ estado: null })}
          />
        ) : (
          <motion.div
            className="property-grid"
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.08 } } }}
          >
            {visible.map((property) => {
              const allowed = canManageOwner(property)
              const content = (
                <>
                  <div
                    className={`property-cover ${property.cover ? 'property-cover--photo' : ''}`}
                  >
                    {property.cover ? (
                      <img
                        src={property.cover}
                        width={800}
                        height={360}
                        alt={`Capa da ${property.name}`}
                      />
                    ) : (
                      <div className="cover-placeholder organic-placeholder" aria-hidden="true">
                        <Building2 />
                      </div>
                    )}
                    <div className="property-logo">
                      {property.logo ? (
                        <img src={property.logo} width={72} height={72} alt="" />
                      ) : (
                        <Building2 aria-hidden="true" />
                      )}
                    </div>
                    {property.lastUsed && !property.inactive && (
                      <span className="last-used">
                        <CheckCircle2 aria-hidden="true" />
                        Última usada
                      </span>
                    )}
                    {property.inactive && <span className="inactive-badge">Inativa</span>}
                  </div>
                  <div className="property-card__body">
                    <div className="property-card__heading">
                      <div>
                        <h2>{property.name}</h2>
                        <p>
                          <MapPin aria-hidden="true" /> {property.place}
                        </p>
                      </div>
                      {!property.inactive && <ChevronRight aria-hidden="true" />}
                    </div>
                    <span
                      className={`property-role property-role--${
                        property.role === 'Proprietário' ? 'owner' : 'manager'
                      }`}
                    >
                      {property.role === 'Proprietário' ? (
                        <UserRound aria-hidden="true" />
                      ) : (
                        <UsersRound aria-hidden="true" />
                      )}
                      Você é {property.role.toLowerCase()}
                    </span>
                    <dl>
                      <div>
                        <dt>Área</dt>
                        <dd>{property.area}</dd>
                      </div>
                      <div>
                        <dt>Titular</dt>
                        <dd>{property.owner}</dd>
                      </div>
                    </dl>
                  </div>
                </>
              )
              return (
                <motion.article
                  className={`property-card ${property.inactive ? 'property-card--inactive' : ''}`}
                  key={property.id}
                  aria-label={property.inactive ? `${property.name} (inativa)` : undefined}
                  variants={{
                    hidden: { opacity: 0, y: 18 },
                    show: { opacity: 1, y: 0 },
                  }}
                >
                  <div className="property-card__menu-wrap" ref={menuId === property.id ? menuRef : undefined}>
                    <button
                      className="property-card__menu"
                      onClick={() => setMenuId(menuId === property.id ? null : property.id)}
                      aria-label={`Mais opções para ${property.name}`}
                      aria-haspopup="true"
                      aria-expanded={menuId === property.id}
                    >
                      <Ellipsis aria-hidden="true" />
                    </button>
                    {menuId === property.id && (
                      <div className="property-action-menu">
                        {property.inactive ? (
                          <button
                            disabled={!allowed}
                            onClick={() => {
                              setMenuId(null)
                              updateProperty(property.id, { inactive: false })
                              setToast(`${property.name} foi reativada.`)
                            }}
                          >
                            <RotateCcw aria-hidden="true" />
                            Reativar
                            {!allowed && <small>{OWNER_ONLY_COPY}</small>}
                          </button>
                        ) : (
                          <>
                            <button onClick={() => openAction(property, 'edit')}>
                              <Pencil aria-hidden="true" />
                              Editar dados
                            </button>
                            <button
                              disabled={!allowed}
                              onClick={() => openAction(property, 'owner')}
                            >
                              <UserRound aria-hidden="true" />
                              Alterar titular
                              {!allowed && <small>{OWNER_ONLY_COPY}</small>}
                            </button>
                            <button
                              disabled={!allowed}
                              onClick={() => openAction(property, 'inactive')}
                            >
                              <Power aria-hidden="true" />
                              Inativar propriedade
                              {!allowed && <small>{OWNER_ONLY_COPY}</small>}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  {property.inactive ? (
                    <div className="property-card__main" aria-disabled="true">
                      {content}
                    </div>
                  ) : (
                    <Link
                      className="property-card__main"
                      to={`/fazenda/${property.id}/resumo`}
                      aria-label={`Entrar na ${property.name}`}
                    >
                      {content}
                    </Link>
                  )}
                  <div className="ownership-line property-card__ownership">
                    <span>
                      {property.confirmed ? (
                        <ShieldCheck aria-hidden="true" />
                      ) : (
                        <UsersRound aria-hidden="true" />
                      )}
                      {property.confirmed ? 'Titularidade confirmada' : 'Declarada por gestor'}
                    </span>
                    <button onClick={() => setHelpOpen(true)} aria-label="Entender titularidade">
                      <CircleHelp aria-hidden="true" />
                    </button>
                  </div>
                </motion.article>
              )
            })}
            <motion.button
              className="add-property-card"
              onClick={() => updateParams({ cadastro: '1', passo: null })}
              variants={{
                hidden: { opacity: 0, y: 18 },
                show: { opacity: 1, y: 0 },
              }}
            >
              <Plus aria-hidden="true" />
              <strong>Adicionar propriedade</strong>
              <small>Cadastre outra fazenda ou sítio</small>
            </motion.button>
          </motion.div>
        )}
      </main>

      <PropertyRegistration
        open={addOpen}
        step={step}
        onStepChange={(next) => updateParams({ passo: String(next) })}
        simulateFailure={registration === 'erro'}
        onClose={() => updateParams({ cadastro: null, passo: null })}
        onSuccess={propertyRegistered}
      />
      <Modal open={helpOpen} onClose={() => setHelpOpen(false)} title="O que muda na titularidade?">
        <div className="ownership-help">
          <div>
            <ShieldCheck aria-hidden="true" />
            <p>
              <strong>Titularidade confirmada</strong>
              <small>Há pelo menos um membro proprietário usando o sistema.</small>
            </p>
          </div>
          <div>
            <UsersRound aria-hidden="true" />
            <p>
              <strong>Declarada por gestor</strong>
              <small>
                O gestor informou o titular, mas nenhum proprietário está vinculado ao sistema.
                Nesse caso, o gestor pode alterar o titular e inativar a propriedade.
              </small>
            </p>
          </div>
        </div>
      </Modal>
      {selected && (
        <>
          <EditPropertyModal
            property={selected}
            open={action === 'edit'}
            onClose={closeAction}
            onSave={(changes) => {
              updateProperty(selected.id, changes)
              closeAction()
              setToast('Dados da propriedade atualizados.')
            }}
          />
          <OwnerModal
            property={selected}
            open={action === 'owner'}
            onClose={closeAction}
            onSave={(owner) => {
              updateProperty(selected.id, { owner })
              closeAction()
              setToast('Titular atualizado.')
            }}
          />
          <Modal open={action === 'inactive'} onClose={closeAction} title="Inativar propriedade?">
            <p className="modal-copy">
              A propriedade sai da sua lista e ninguém consegue lançar dados nela. Nada é apagado e
              você pode reativar depois.
            </p>
            <div className="modal__actions">
              <Button variant="ghost" onClick={closeAction}>
                Manter propriedade
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  updateProperty(selected.id, { inactive: true, lastUsed: false })
                  closeAction()
                  setToast(`${selected.name} foi inativada. Nada foi apagado.`)
                }}
              >
                Inativar
              </Button>
            </div>
          </Modal>
        </>
      )}
      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  )
}

/** Editar dados: nome, município, UF e área (proprietário e gestor). */
export function EditPropertyModal({
  property,
  open,
  onClose,
  onSave,
}: {
  property: Pick<PropertyCardData, 'name' | 'municipality' | 'uf' | 'area'>
  open: boolean
  onClose: () => void
  onSave: (changes: Pick<PropertyCardData, 'name' | 'municipality' | 'uf' | 'area' | 'place'>) => void
}) {
  const [errors, setErrors] = useState<Record<string, string>>({})
  return (
    <Modal open={open} onClose={onClose} title="Editar dados da propriedade">
      <form
        className="form-stack"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          const data = new FormData(event.currentTarget)
          const name = String(data.get('edit-name') || '').trim()
          const municipality = String(data.get('edit-municipality') || '').trim()
          const uf = String(data.get('edit-uf') || '')
          const areaRaw = String(data.get('edit-area') || '').trim()
          const areaNumber = Number(areaRaw.replace(/\./g, '').replace(',', '.'))
          const next: Record<string, string> = {}
          if (!name) next.name = 'Informe o nome da propriedade.'
          if (!municipality) next.municipality = 'Informe o município.'
          if (areaRaw && (!Number.isFinite(areaNumber) || areaNumber <= 0))
            next.area = 'Informe a área em hectares, por exemplo 42,5.'
          setErrors(next)
          if (Object.keys(next).length) return
          onSave({
            name,
            municipality,
            uf,
            area: areaRaw ? `${areaRaw} ha` : 'Área não informada',
            place: `${municipality}/${uf}`,
          })
        }}
      >
        <Field
          label="Nome"
          name="edit-name"
          defaultValue={property.name}
          error={errors.name}
          required
        />
        <div className="form-grid">
          <Field
            label="Município"
            name="edit-municipality"
            defaultValue={property.municipality}
            error={errors.municipality}
            required
          />
          <label className="select-field" htmlFor="edit-uf">
            <span>UF</span>
            <select id="edit-uf" name="edit-uf" defaultValue={property.uf}>
              {ufList.map((uf) => (
                <option key={uf}>{uf}</option>
              ))}
            </select>
          </label>
        </div>
        <Field
          label="Área em hectares (opcional)"
          name="edit-area"
          inputMode="decimal"
          defaultValue={property.area.replace(/\s*ha$/, '').replace(/^Área não informada$/, '')}
          error={errors.area}
          suffix={<span className="field-suffix">ha</span>}
        />
        <p className="field-help">Logo e capa são trocadas no cadastro da propriedade.</p>
        <div className="modal__actions">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">Salvar alterações</Button>
        </div>
      </form>
    </Modal>
  )
}

/** Alterar titular (só proprietário, ou gestor sem proprietário vinculado). */
export function OwnerModal({
  property,
  open,
  onClose,
  onSave,
}: {
  property: Pick<PropertyCardData, 'owner'>
  open: boolean
  onClose: () => void
  onSave: (owner: string) => void
}) {
  const [error, setError] = useState('')
  return (
    <Modal open={open} onClose={onClose} title="Alterar titular">
      <form
        className="form-stack"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          const owner = String(new FormData(event.currentTarget).get('owner-name') || '').trim()
          if (!owner) {
            setError('Informe o nome do titular.')
            return
          }
          onSave(owner)
        }}
      >
        <Field
          label="Nome do titular"
          name="owner-name"
          defaultValue={property.owner}
          error={error}
          required
        />
        <p className="field-help">Se houver mais de um dono, escreva todos os nomes.</p>
        <div className="modal__actions">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">Salvar titular</Button>
        </div>
      </form>
    </Modal>
  )
}
