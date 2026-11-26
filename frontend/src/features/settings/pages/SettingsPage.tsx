/*
 * Configurações (Etapa 5.3 a 5.5).
 * Parâmetros na URL:
 *   ?secao=conta | propriedade | parametros | cadastros | membros | relatorios | calculos | em-breve
 *                               rola direto até a seção (link compartilhável)
 *   ?cadastro=pasto | fornecedor | comprador | categoria   aba aberta em Cadastros
 *   ?acao=convidar              abre "Convidar pessoa"
 *   ?relatorio=custos | margens tipo do relatório; ?lote=<slug> filtra a prévia por lote
 * Demonstração de estados:
 *   ?estado=vazio | carregando | erro      listas de Cadastros, Membros e Convites
 *   ?relatorio-estado=vazio | erro         "Nenhum dado neste período" / a geração falha (com "Tentar de novo")
 */
import { useEffect, useMemo, useState } from 'react'
import {
  Calculator,
  Check,
  ChevronRight,
  Clipboard,
  Download,
  Edit3,
  FileSpreadsheet,
  KeyRound,
  Link2,
  LoaderCircle,
  LogOut,
  MapPin,
  MessageCircle,
  Plus,
  Power,
  RotateCcw,
  Trash2,
  UserMinus,
  UserPlus,
  UserRound,
  Users,
} from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import AppShell from '@/shared/layout/AppShell'
import { Button, Field, Modal, StateView, Toast, type ToastAction } from '@/shared/ui/UI'
import { CalculationContent } from '@/shared/ui/BusinessRules'
import { propertyNotFoundCopy, useActiveProperty } from '@/shared/routing/navigation'
import { useBackendData } from '@/shared/demo/backend-data'
import { recursos } from '@/shared/config/recursos'
import { iniciais, useSair, useSessao } from '@/features/auth/session'
import { usePropriedadeAtiva } from '@/features/properties/components/PropriedadeAtivaRoute'
import {
  costCategories,
  decimal,
  money,
  parseBrDate,
  recordsForProperty,
  REPORT_PERIODS,
  reportRowsFor,
  type ReportPeriod,
  type ReportRow,
  referenceQuote,
  TODAY,
  user,
  type PropertyInfo,
} from '@/shared/demo/data'
import {
  canManageOwner,
  DeclarationTerm,
  EMAIL_PATTERN,
  OWNER_ONLY_COPY,
  PasswordStrength,
  validateNewPassword,
} from '@/features/properties/components/PropertyRegistration'
import { EditPropertyModal, OwnerModal } from '@/features/properties/pages/PropertiesPage'

const futureItems = [
  ['Leitura automática da foto da nota', 'Transformar a foto em itens e valores.'],
  ['Custos gerais da propriedade com rateio entre lotes', 'Distribuir despesas gerais.'],
  [
    'Sugestão do melhor momento de venda e alertas de mercado',
    'Cruzar custo, peso e cotação.',
  ],
  ['Modo offline', 'Registrar no campo e sincronizar depois.'],
  ['Cotação automática', 'Importar referências sem digitação.'],
  ['Registro de boleto pela linha digitável', 'Criar a conta a pagar pelo boleto.'],
  ['Convite por e-mail', 'Enviar o acesso direto para a pessoa.'],
] as const

const sections = [
  ['conta', 'Sua conta'],
  ['propriedade', 'Propriedade ativa'],
  ['parametros', 'Parâmetros'],
  ['cadastros', 'Cadastros'],
  ['membros', 'Membros e convites'],
  ['relatorios', 'Relatórios'],
  ['calculos', 'Como calculamos'],
  ['em-breve', 'Em breve'],
] as const

/** Seções de pacotes ainda não integrados ficam ocultas (escopo, seção 5.5). */
function hiddenSectionsNow(): Partial<Record<(typeof sections)[number][0], boolean>> {
  return {
    parametros: !recursos.parametrosDaPropriedade,
    cadastros: !recursos.cadastrosDaPropriedade,
    membros: !recursos.gestaoDeMembros,
    relatorios: !recursos.relatorios,
  }
}

const directoryKinds = [
  ['pasto', 'Pastos', 'pasto'],
  ['fornecedor', 'Fornecedores', 'fornecedor'],
  ['comprador', 'Compradores', 'comprador'],
  ['categoria', 'Categorias', 'categoria'],
] as const
type DirectoryKind = (typeof directoryKinds)[number][0]

/** Data em que o usuário aceitou o termo em cada propriedade (versão 1.0). */
const termAcceptedAt: Record<string, string> = {
  baixada: '18/01/2024',
  'serra-bonita': '09/04/2025',
  'cedro-alto': '22/08/2025',
  'nova-propriedade': TODAY,
}

type Member = {
  id: string
  name: string
  email: string
  role: 'Proprietário' | 'Gestor'
  since: string
  currentUser: boolean
}

// TODO(integração): membros por propriedade virão da API (os dados de demonstração só têm a Baixada).
const otherMembers: Record<string, Member[]> = {
  'serra-bonita': [
    {
      id: 'sb-1',
      name: user.name,
      email: user.email,
      role: 'Gestor',
      since: '09/04/2025',
      currentUser: true,
    },
  ],
  'cedro-alto': [
    {
      id: 'ca-1',
      name: 'Lúcia Andrade',
      email: 'lucia@cedroalto.com.br',
      role: 'Proprietário',
      since: '10/05/2023',
      currentUser: false,
    },
    {
      id: 'ca-2',
      name: user.name,
      email: user.email,
      role: 'Gestor',
      since: '22/08/2025',
      currentUser: true,
    },
  ],
  'nova-propriedade': [
    { id: 'np-1', name: user.name, email: user.email, role: 'Proprietário', since: TODAY, currentUser: true },
  ],
}

type Invite = {
  id: string
  role: 'Proprietário' | 'Gestor'
  createdBy: string
  expiresAt: string
  status: 'Pendente' | 'Aceito' | 'Expirado' | 'Revogado'
}

type DirectoryItem = { id: string; name: string; kind: DirectoryKind; active: boolean; links: number }

type ReportState = 'idle' | 'generating' | 'ready' | 'error' | 'empty'
type ModalName =
  | 'profile'
  | 'password'
  | 'calculation'
  | 'property'
  | 'owner'
  | 'inactivate'
  | 'term'
  | 'leave'
  | null

const isoToBr = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/')
const addDays = (br: string, days: number) => {
  const date = parseBrDate(br)
  date.setDate(date.getDate() + days)
  return date.toLocaleDateString('pt-BR')
}
const initials = (name: string) =>
  name
    .split(' ')
    .filter((part) => part.length > 2)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

export default function SettingsPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { property: routeProperty, id, found } = useActiveProperty()
  const sessao = useSessao()
  const logout = useSair()
  const hiddenSections = hiddenSectionsNow()
  const activeProperty = usePropriedadeAtiva()?.propriedade
  const account = { name: sessao.usuario?.nome ?? '', email: sessao.usuario?.email ?? '' }
  // Data e versão do termo aceito pelo usuário nesta propriedade (RN35).
  const termDate = activeProperty
    ? new Date(activeProperty.aceite_declaracao_em).toLocaleDateString('pt-BR')
    : (termAcceptedAt[id] ?? TODAY)
  const termVersion = activeProperty?.versao_termo ?? '1.0'
  const backend = useBackendData()
  const listState = params.get('estado') as 'vazio' | 'carregando' | 'erro' | null
  const [overrides, setOverrides] = useState<Record<string, Partial<PropertyInfo>>>({})
  const property: PropertyInfo = { ...routeProperty, ...overrides[id] }
  const manage = canManageOwner(property)
  const [modal, setModal] = useState<ModalName>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [toastAction, setToastAction] = useState<ToastAction | undefined>(undefined)

  // Parâmetros
  const settings =
    backend.settings.find((item) => item.propertyName === property.name) ??
    (id === 'baixada' ? backend.settings[0] : undefined)
  const [yieldRaw, setYieldRaw] = useState(String(settings?.defaultCarcassYield ?? 50))
  const [defaultMarket, setDefaultMarket] = useState(
    String(settings?.defaultQuoteMarket ?? referenceQuote.market),
  )
  const [warningRaw, setWarningRaw] = useState(String(settings?.dueDateWarningDays ?? 7))
  const [paramErrors, setParamErrors] = useState<{ yield?: string; days?: string }>({})
  const marketOptions = Array.from(
    new Set([referenceQuote.market, ...backend.quotes.map((quote) => String(quote.market)), 'Triângulo Mineiro', 'Zona da Mata — MG']),
  )

  // Cadastros
  const [directory, setDirectory] = useState<DirectoryItem[]>(() =>
    id === 'baixada'
      ? backend.directory.map((item) => ({
          id: String(item.id),
          name: String(item.name),
          kind: item.kind,
          active: item.active !== false,
          links: Number(item.linkedRecords ?? 0),
        }))
      : costCategories.map((name, index) => ({
          id: `${id}-cat-${index}`,
          name,
          kind: 'categoria' as const,
          active: true,
          links: 0,
        })),
  )
  const directoryKind = (params.get('cadastro') as DirectoryKind) || 'pasto'
  const [directoryForm, setDirectoryForm] = useState<{ item?: DirectoryItem; error?: string } | null>(null)
  const [directoryRemove, setDirectoryRemove] = useState<DirectoryItem | null>(null)

  // Membros e convites
  const [members, setMembers] = useState<Member[]>(() =>
    id === 'baixada'
      ? backend.members.map((member) => ({
          id: String(member.id),
          name: String(member.name),
          email: String(member.email),
          role: member.role,
          since: isoToBr(String(member.memberSince)),
          currentUser: Boolean(member.currentUser),
        }))
      : (otherMembers[id] ?? []),
  )
  const [memberRemove, setMemberRemove] = useState<Member | null>(null)
  const [invites, setInvites] = useState<Invite[]>(() =>
    id === 'baixada'
      ? backend.invites.map((invite) => ({
          id: String(invite.id),
          role: invite.role,
          createdBy: String(invite.createdByName),
          expiresAt: isoToBr(String(invite.expiresAt)),
          status: invite.status,
        }))
      : [],
  )
  const [inviteRevoke, setInviteRevoke] = useState<Invite | null>(null)
  const inviteOpen = params.get('acao') === 'convidar'
  const [inviteRole, setInviteRole] = useState<'Proprietário' | 'Gestor'>('Gestor')
  const [inviteDays, setInviteDays] = useState('7')
  const [inviteLink, setInviteLink] = useState<string | null>(null)

  // Relatórios
  const reportType = params.get('relatorio') === 'margens' ? 'Margens por lote' : 'Custos por lote'
  const reportLot = params.get('lote') || 'todos'
  const forcedReport = params.get('relatorio-estado') as 'vazio' | 'erro' | null
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>('Este ano')
  const [reportFormat, setReportFormat] = useState('CSV')
  const [reportState, setReportState] = useState<ReportState>('idle')
  const [reportFailures, setReportFailures] = useState(forcedReport === 'erro' ? 1 : 0)
  const propertyRecords = useMemo(() => recordsForProperty(id), [id])
  const reportRows =
    forcedReport === 'vazio'
      ? []
      : reportRowsFor(id, {
          type: reportType === 'Margens por lote' ? 'margens' : 'custos',
          period: reportPeriod,
          lot: reportLot,
        })

  // Senha e perfil
  const [newPassword, setNewPassword] = useState('')
  const [formErrors, setFormErrors] = useState<Record<string, string | undefined>>({})

  const secao = params.get('secao')
  useEffect(() => {
    if (!secao) return
    const target = document.getElementById(`secao-${secao}`)
    if (!target) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    target.focus({ preventScroll: true })
  }, [secao])

  function updateParams(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params)
    Object.entries(changes).forEach(([key, value]) =>
      value === null ? next.delete(key) : next.set(key, value),
    )
    setParams(next, { replace: true })
  }

  function notify(message: string, action?: ToastAction) {
    setToast(message)
    setToastAction(action)
  }

  function openModal(next: ModalName) {
    setFormErrors({})
    setNewPassword('')
    setModal(next)
  }

  if (!found) {
    return (
      <AppShell>
        <StateView
          type="empty"
          {...propertyNotFoundCopy}
          onAction={() => navigate(propertyNotFoundCopy.to)}
        />
      </AppShell>
    )
  }

  function saveParameters() {
    // TODO(integração): persistir parâmetros via Server Action autenticada.
    const yieldValue = Number(yieldRaw.replace(',', '.'))
    const days = Number(warningRaw)
    const errors: { yield?: string; days?: string } = {}
    if (!yieldRaw.trim() || !Number.isFinite(yieldValue) || yieldValue < 1 || yieldValue > 100)
      errors.yield = 'Informe um rendimento entre 1% e 100%.'
    if (!Number.isInteger(days) || days < 1 || days > 60)
      errors.days = 'Informe um número inteiro de dias entre 1 e 60.'
    setParamErrors(errors)
    if (errors.yield || errors.days) return
    notify('Parâmetros da propriedade atualizados.')
  }

  function generateReport() {
    // TODO(integração): gerar e armazenar o arquivo no backend.
    setReportState('generating')
    window.setTimeout(() => {
      if (reportFailures > 0) {
        setReportFailures(reportFailures - 1)
        setReportState('error')
        return
      }
      if (reportRows.length === 0) {
        setReportState('empty')
        return
      }
      setReportState('ready')
      notify(`Relatório pronto (${reportFormat}).`, {
        label: 'Baixar',
        onClick: () => notify(`Download do ${reportFormat} iniciado.`),
      })
    }, 700)
  }

  // Membros
  const onlyMember = members.length <= 1
  const pendingInvites = invites.filter((invite) => invite.status === 'Pendente')
  const pastInvites = invites.filter((invite) => invite.status !== 'Pendente')
  const activeDirectory = directory.filter((item) => item.kind === directoryKind)
  const kindLabel = directoryKinds.find(([key]) => key === directoryKind)?.[2] ?? 'cadastro'

  function listGate(empty: { title: string; text: string; actionLabel?: string; onAction?: () => void }) {
    if (listState === 'carregando') return <StateView type="loading" title="Buscando os dados…" />
    if (listState === 'erro')
      return (
        <StateView
          type="error"
          title="Não conseguimos carregar esta lista"
          onAction={() => updateParams({ estado: null })}
        />
      )
    if (listState === 'vazio') return <StateView type="empty" actionLabel="" {...empty} />
    return null
  }

  function saveDirectoryItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = String(new FormData(event.currentTarget).get('directory-name') || '').trim()
    const editing = directoryForm?.item
    if (!name) {
      setDirectoryForm({ item: editing, error: 'Informe o nome.' })
      return
    }
    const duplicateName = directory.some(
      (item) =>
        item.kind === directoryKind &&
        item.id !== editing?.id &&
        item.name.toLowerCase() === name.toLowerCase(),
    )
    if (duplicateName) {
      setDirectoryForm({ item: editing, error: `Já existe um ${kindLabel} com este nome.` })
      return
    }
    if (editing) {
      setDirectory(directory.map((item) => (item.id === editing.id ? { ...item, name } : item)))
      notify(`Renomeado para "${name}". Os registros ligados a ele mostram o novo nome.`)
    } else {
      setDirectory([
        ...directory,
        { id: `local-${Date.now()}`, name, kind: directoryKind, active: true, links: 0 },
      ])
      notify(`${name} adicionado.`)
    }
    setDirectoryForm(null)
  }

  return (
    <AppShell>
      <div className="settings-page settings-page--wide">
        <header className="section-heading">
          <div>
            <span className="eyebrow">ORGANIZAÇÃO DA FAZENDA</span>
            <h1>Configurações</h1>
            <p>Conta, propriedade, parâmetros, pessoas e relatórios.</p>
          </div>
        </header>
        <nav className="settings-section-nav" aria-label="Seções de Configurações">
          {sections.filter(([key]) => !hiddenSections[key]).map(([key, label]) => (
            <Link
              key={key}
              to={`?secao=${key}`}
              replace
              aria-current={secao === key ? 'location' : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="settings-layout">
          <main className="settings-main">
            <SettingsSection
              id="conta"
              icon={<UserRound aria-hidden="true" />}
              title="Sua conta"
              text="Perfil e segurança do seu acesso."
            >
              <button
                className="settings-row"
                onClick={() => openModal('profile')}
                disabled={!recursos.edicaoDoPerfil}
              >
                <span className="settings-avatar" aria-hidden="true">
                  {iniciais(account.name)}
                </span>
                <p>
                  <strong>{account.name}</strong>
                  <small>{account.email}</small>
                </p>
                {recursos.edicaoDoPerfil && <Edit3 aria-label="Editar perfil" />}
              </button>
              {recursos.trocaDeSenha && (
              <button className="settings-row" onClick={() => openModal('password')}>
                <span aria-hidden="true">
                  <KeyRound />
                </span>
                <p>
                  <strong>Trocar senha</strong>
                  <small>Última alteração há 4 meses</small>
                </p>
                <ChevronRight aria-hidden="true" />
              </button>
              )}
              <button
                className="settings-row settings-row--danger"
                onClick={logout}
              >
                <span aria-hidden="true">
                  <LogOut />
                </span>
                <p>
                  <strong>Sair</strong>
                  <small>Encerrar a sessão neste aparelho</small>
                </p>
                <ChevronRight aria-hidden="true" />
              </button>
            </SettingsSection>

            <SettingsSection
              id="propriedade"
              icon={<MapPin aria-hidden="true" />}
              title="Propriedade ativa"
              text="Dados, titularidade e responsabilidade."
            >
              <button
                className="settings-row"
                onClick={() => openModal('property')}
                disabled={!recursos.edicaoDaPropriedade}
              >
                <span className="property-mini-logo" aria-hidden="true">
                  {property.logo ? <img src={property.logo} width={40} height={40} alt="" /> : initials(property.name)}
                </span>
                <p>
                  <strong>{property.name}</strong>
                  <small>
                    {property.place} · {property.area}
                  </small>
                </p>
                {recursos.edicaoDaPropriedade && <Edit3 aria-label="Editar dados da propriedade" />}
              </button>
              <div className="property-details">
                <strong>Titular: {property.owner}</strong>
                <small>{property.ownership}</small>
                {recursos.gestaoDeMembros && (
                  <>
                    <button
                      type="button"
                      className="text-link"
                      disabled={!manage}
                      onClick={() => openModal('owner')}
                    >
                      Alterar titular
                    </button>
                    {!manage && <small className="permission-note">{OWNER_ONLY_COPY}</small>}
                  </>
                )}
              </div>
              <div className="accepted-term">
                <UserRound aria-hidden="true" />
                <p>
                  <strong>Seu papel: {property.role}</strong>
                  <small>
                    Termo aceito em {termDate} (versão {termVersion})
                  </small>
                </p>
                <button type="button" onClick={() => openModal('term')}>
                  Ver termo
                </button>
              </div>
              {recursos.gestaoDeMembros && (
              <button
                className="settings-row settings-row--danger"
                disabled={!manage}
                onClick={() => openModal('inactivate')}
              >
                <span aria-hidden="true">
                  <Power />
                </span>
                <p>
                  <strong>Inativar propriedade</strong>
                  <small>
                    {manage ? 'Nada é apagado e você pode reativar depois.' : OWNER_ONLY_COPY}
                  </small>
                </p>
                <ChevronRight aria-hidden="true" />
              </button>
              )}
            </SettingsSection>

            <SettingsSection
              hidden={hiddenSections.parametros}
              id="parametros"
              icon={<Calculator aria-hidden="true" />}
              title="Parâmetros da propriedade"
              text="Padrões usados nos cálculos e alertas."
            >
              <form
                className="settings-form-grid"
                noValidate
                onSubmit={(event) => {
                  event.preventDefault()
                  saveParameters()
                }}
              >
                <Field
                  label="Rendimento de carcaça padrão (%)"
                  inputMode="decimal"
                  value={yieldRaw}
                  error={paramErrors.yield}
                  suffix={<span className="field-suffix">%</span>}
                  onChange={(event) => {
                    setYieldRaw(event.target.value)
                    setParamErrors({ ...paramErrors, yield: undefined })
                  }}
                />
                <label className="select-field" htmlFor="default-market">
                  <span>Praça padrão de cotação</span>
                  <select
                    id="default-market"
                    value={defaultMarket}
                    onChange={(event) => setDefaultMarket(event.target.value)}
                  >
                    {marketOptions.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <Field
                  label="Dias de aviso antes do vencimento"
                  inputMode="numeric"
                  value={warningRaw}
                  error={paramErrors.days}
                  suffix={<span className="field-suffix">dias</span>}
                  onChange={(event) => {
                    setWarningRaw(event.target.value)
                    setParamErrors({ ...paramErrors, days: undefined })
                  }}
                />
                <p className="support-copy">Mudar o rendimento não altera vendas já registradas.</p>
                <Button type="submit">Salvar parâmetros</Button>
              </form>
            </SettingsSection>

            <SettingsSection
              hidden={hiddenSections.cadastros}
              id="cadastros"
              icon={<Edit3 aria-hidden="true" />}
              title="Cadastros"
              text="Renomeie, inative ou exclua registros. Só é possível excluir o que não tem vínculos."
            >
              <div
                className="period-switch settings-register-tabs"
                role="group"
                aria-label="Tipo de cadastro"
              >
                {directoryKinds.map(([key, label]) => (
                  <button
                    key={key}
                    className={directoryKind === key ? 'active' : ''}
                    aria-pressed={directoryKind === key}
                    onClick={() => updateParams({ cadastro: key })}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {listGate({
                title: 'Nada cadastrado ainda',
                text: `Adicione o primeiro ${kindLabel} para usar nos lançamentos.`,
                actionLabel: `Adicionar ${kindLabel}`,
                onAction: () => setDirectoryForm({}),
              }) ??
                (activeDirectory.length === 0 ? (
                  <StateView
                    type="empty"
                    title="Nada cadastrado ainda"
                    text={`Adicione o primeiro ${kindLabel} para usar nos lançamentos.`}
                    actionLabel={`Adicionar ${kindLabel}`}
                    onAction={() => setDirectoryForm({})}
                  />
                ) : (
                  <ul className="directory-list">
                    {activeDirectory.map((item) => (
                      <li key={item.id} className={item.active ? '' : 'is-inactive'}>
                        <p>
                          <strong>{item.name}</strong>
                          <small>
                            {item.links === 1 ? '1 vínculo' : `${item.links} vínculos`} ·{' '}
                            {item.active ? 'Ativo' : 'Inativo'}
                          </small>
                        </p>
                        <button
                          className="icon-button"
                          aria-label={`Renomear ${item.name}`}
                          onClick={() => setDirectoryForm({ item })}
                        >
                          <Edit3 aria-hidden="true" />
                        </button>
                        {item.active ? (
                          <button
                            className="icon-button danger-icon"
                            aria-label={`${item.links ? 'Inativar' : 'Excluir'} ${item.name}`}
                            onClick={() => setDirectoryRemove(item)}
                          >
                            {item.links ? <Power aria-hidden="true" /> : <Trash2 aria-hidden="true" />}
                          </button>
                        ) : (
                          <button
                            className="icon-button"
                            aria-label={`Reativar ${item.name}`}
                            onClick={() => {
                              setDirectory(
                                directory.map((row) =>
                                  row.id === item.id ? { ...row, active: true } : row,
                                ),
                              )
                              notify(`${item.name} reativado.`)
                            }}
                          >
                            <RotateCcw aria-hidden="true" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                ))}
              <Button
                variant="secondary"
                icon={<Plus aria-hidden="true" />}
                onClick={() => setDirectoryForm({})}
              >
                Adicionar {kindLabel}
              </Button>
            </SettingsSection>

            <SettingsSection
              hidden={hiddenSections.membros}
              id="membros"
              icon={<Users aria-hidden="true" />}
              title="Membros e convites"
              text="Controle quem acessa esta propriedade."
            >
              {listGate({
                title: 'Nenhum membro encontrado',
                text: 'Convide uma pessoa para dividir o trabalho nesta propriedade.',
              }) ?? (
                <ul className="member-list">
                  {members.map((member) => {
                    const blockedReason = onlyMember
                      ? 'A propriedade precisa de pelo menos um membro.'
                      : !member.currentUser && !manage
                        ? 'Só o proprietário pode remover membros.'
                        : ''
                    return (
                      <li key={member.id}>
                        <span className="settings-avatar" aria-hidden="true">
                          {initials(member.name)}
                        </span>
                        <p>
                          <strong>
                            {member.name} {member.currentUser && <em>Você</em>}
                          </strong>
                          <small>
                            {member.email} · {member.role} · desde {member.since}
                          </small>
                          {blockedReason && (
                            <small className="permission-note">{blockedReason}</small>
                          )}
                        </p>
                        <button
                          className="icon-button danger-icon"
                          disabled={Boolean(blockedReason)}
                          onClick={() =>
                            member.currentUser ? openModal('leave') : setMemberRemove(member)
                          }
                          aria-label={
                            member.currentUser
                              ? 'Sair desta propriedade'
                              : `Remover ${member.name}`
                          }
                        >
                          {member.currentUser ? (
                            <LogOut aria-hidden="true" />
                          ) : (
                            <UserMinus aria-hidden="true" />
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
              <div className="settings-actions">
                <Button
                  icon={<UserPlus aria-hidden="true" />}
                  onClick={() => {
                    setInviteLink(null)
                    updateParams({ acao: 'convidar' })
                  }}
                >
                  Convidar pessoa
                </Button>
                <Button
                  variant="secondary"
                  disabled={onlyMember}
                  onClick={() => openModal('leave')}
                >
                  Sair desta propriedade
                </Button>
              </div>
              {onlyMember && (
                <p className="support-copy">A propriedade precisa de pelo menos um membro.</p>
              )}
              <div className="invite-history">
                <h3>Convites pendentes</h3>
                {listGate({
                  title: 'Nenhum convite pendente',
                  text: 'Os links que você gerar aparecem aqui até serem aceitos ou vencerem.',
                }) ??
                  (pendingInvites.length === 0 ? (
                    <p className="support-copy">Nenhum convite pendente.</p>
                  ) : (
                    <ul>
                      {pendingInvites.map((invite) => (
                        <li key={invite.id}>
                          <p>
                            <strong>{invite.role} · Pendente</strong>
                            <small>
                              Criado por {invite.createdBy} · expira em {invite.expiresAt}
                            </small>
                          </p>
                          <Button variant="ghost" onClick={() => setInviteRevoke(invite)}>
                            Revogar
                          </Button>
                        </li>
                      ))}
                    </ul>
                  ))}
                <h3>Histórico de convites</h3>
                {listState ? null : pastInvites.length === 0 ? (
                  <p className="support-copy">Nenhum convite aceito, vencido ou revogado.</p>
                ) : (
                  <ul>
                    {pastInvites.map((invite) => (
                      <li key={invite.id}>
                        <p>
                          <strong>
                            {invite.role} · {invite.status}
                          </strong>
                          <small>
                            Criado por {invite.createdBy} ·{' '}
                            {invite.status === 'Expirado' ? 'venceu em' : 'validade até'}{' '}
                            {invite.expiresAt}
                          </small>
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </SettingsSection>

            <SettingsSection
              hidden={hiddenSections.relatorios}
              id="relatorios"
              icon={<FileSpreadsheet aria-hidden="true" />}
              title="Relatórios"
              text="Confira a prévia antes de baixar."
            >
              <div className="report-filters">
                <label className="select-field" htmlFor="report-type">
                  <span>Tipo</span>
                  <select
                    id="report-type"
                    value={reportType}
                    onChange={(event) => {
                      updateParams({
                        relatorio: event.target.value === 'Margens por lote' ? 'margens' : 'custos',
                      })
                      setReportState('idle')
                    }}
                  >
                    <option>Custos por lote</option>
                    <option>Margens por lote</option>
                  </select>
                </label>
                <label className="select-field" htmlFor="report-period">
                  <span>Período</span>
                  <select
                    id="report-period"
                    value={reportPeriod}
                    onChange={(event) => {
                      setReportPeriod(event.target.value as ReportPeriod)
                      setReportState('idle')
                    }}
                  >
                    {REPORT_PERIODS.map((period) => (
                      <option key={period}>{period}</option>
                    ))}
                  </select>
                </label>
                <label className="select-field" htmlFor="report-lot">
                  <span>Lotes</span>
                  <select
                    id="report-lot"
                    value={reportLot}
                    onChange={(event) => {
                      updateParams({ lote: event.target.value === 'todos' ? null : event.target.value })
                      setReportState('idle')
                    }}
                  >
                    <option value="todos">Todos os lotes e animais</option>
                    {propertyRecords.map((record) => (
                      <option key={record.slug} value={record.slug}>
                        {record.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="select-field" htmlFor="report-format">
                  <span>Formato</span>
                  <select
                    id="report-format"
                    value={reportFormat}
                    onChange={(event) => {
                      setReportFormat(event.target.value)
                      if (reportState === 'ready') setReportState('idle')
                    }}
                  >
                    <option>CSV</option>
                    <option>PDF</option>
                  </select>
                </label>
              </div>
              <ReportPreview type={reportType} period={reportPeriod} state={reportState} rows={reportRows} />
              <div className="settings-actions">
                <Button
                  icon={
                    reportState === 'generating' ? (
                      <LoaderCircle className="spin" aria-hidden="true" />
                    ) : (
                      <Download aria-hidden="true" />
                    )
                  }
                  disabled={reportState === 'generating'}
                  onClick={() => {
                    if (reportState === 'ready') {
                      notify(`Download do ${reportFormat} iniciado.`)
                      return
                    }
                    generateReport()
                  }}
                >
                  {reportState === 'generating'
                    ? 'Preparando seu relatório…'
                    : reportState === 'ready'
                      ? `Baixar ${reportFormat}`
                      : reportState === 'error'
                        ? 'Tentar de novo'
                        : 'Gerar relatório'}
                </Button>
              </div>
            </SettingsSection>

            <SettingsSection
              id="calculos"
              icon={<Calculator aria-hidden="true" />}
              title="Como calculamos"
              text="Custos, margens e arroba de equilíbrio."
            >
              <button className="settings-row" onClick={() => openModal('calculation')}>
                <span aria-hidden="true">
                  <Calculator />
                </span>
                <p>
                  <strong>Abrir regras de cálculo</strong>
                  <small>Veja as fórmulas e origens dos números.</small>
                </p>
                <ChevronRight aria-hidden="true" />
              </button>
            </SettingsSection>
          </main>

          <aside className="coming-soon" id="secao-em-breve" tabIndex={-1}>
            <div className="coming-soon__heading">
              <div>
                <b>EM BREVE</b>
                <h2>Novidades que vêm por aí</h2>
              </div>
            </div>
            <ul className="future-list future-list--plain">
              {futureItems.map(([title, text]) => (
                <li key={title}>
                  <p>
                    <strong>{title}</strong>
                    <small>{text}</small>
                  </p>
                  <span className="future-list__badge">Em breve</span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>

      {/* Conta */}
      <Modal open={modal === 'profile'} onClose={() => setModal(null)} title="Editar perfil">
        <form
          className="form-stack"
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            const data = new FormData(event.currentTarget)
            const errors = {
              nome: String(data.get('profile-name') || '').trim() ? undefined : 'Informe seu nome.',
              email: EMAIL_PATTERN.test(String(data.get('profile-email') || '').trim())
                ? undefined
                : 'Informe um e-mail válido.',
            }
            setFormErrors(errors)
            if (errors.nome || errors.email) return
            setModal(null)
            notify('Perfil atualizado.')
          }}
        >
          <Field
            label="Nome completo"
            name="profile-name"
            defaultValue={user.name}
            error={formErrors.nome}
          />
          <Field
            label="E-mail"
            name="profile-email"
            type="email"
            defaultValue={user.email}
            error={formErrors.email}
          />
          <div className="modal__actions">
            <Button type="button" variant="ghost" onClick={() => setModal(null)}>
              Cancelar
            </Button>
            <Button type="submit">Salvar</Button>
          </div>
        </form>
      </Modal>
      <Modal open={modal === 'password'} onClose={() => setModal(null)} title="Trocar senha">
        <form
          className="form-stack"
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            const data = new FormData(event.currentTarget)
            const current = String(data.get('current-password') || '')
            const result = validateNewPassword(newPassword, String(data.get('confirm-password') || ''))
            const errors = {
              atual: current ? undefined : 'Informe a senha atual.',
              senha: result.senha,
              confirmar: result.confirmar,
            }
            setFormErrors(errors)
            if (errors.atual || errors.senha || errors.confirmar) return
            setModal(null)
            notify('Senha atualizada.')
          }}
        >
          <Field
            label="Senha atual"
            name="current-password"
            type="password"
            autoComplete="current-password"
            error={formErrors.atual}
          />
          <Field
            label="Nova senha"
            name="new-password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            error={formErrors.senha}
          />
          <PasswordStrength password={newPassword} />
          <Field
            label="Confirmar nova senha"
            name="confirm-password"
            type="password"
            autoComplete="new-password"
            error={formErrors.confirmar}
          />
          <div className="modal__actions">
            <Button type="button" variant="ghost" onClick={() => setModal(null)}>
              Cancelar
            </Button>
            <Button type="submit">Atualizar senha</Button>
          </div>
        </form>
      </Modal>

      {/* Propriedade */}
      <EditPropertyModal
        key={`edit-${id}-${modal === 'property'}`}
        property={property}
        open={modal === 'property'}
        onClose={() => setModal(null)}
        onSave={(changes) => {
          setOverrides({ ...overrides, [id]: { ...overrides[id], ...changes } })
          setModal(null)
          notify('Dados da propriedade atualizados.')
        }}
      />
      <OwnerModal
        key={`owner-${id}-${modal === 'owner'}`}
        property={property}
        open={modal === 'owner' && manage}
        onClose={() => setModal(null)}
        onSave={(owner) => {
          setOverrides({ ...overrides, [id]: { ...overrides[id], owner } })
          setModal(null)
          notify('Titular atualizado.')
        }}
      />
      <Modal
        open={modal === 'inactivate' && manage}
        onClose={() => setModal(null)}
        title="Inativar propriedade?"
      >
        <p className="modal-copy">
          A propriedade sai da sua lista e ninguém consegue lançar dados nela. Nada é apagado e você
          pode reativar depois.
        </p>
        <div className="modal__actions">
          <Button variant="ghost" onClick={() => setModal(null)}>
            Manter propriedade
          </Button>
          <Button variant="danger" onClick={() => navigate(`/propriedades?inativada=${id}`)}>
            Inativar
          </Button>
        </div>
      </Modal>
      <DeclarationTerm
        role={property.role === 'Proprietário' ? 'owner' : 'manager'}
        open={modal === 'term'}
        onClose={() => setModal(null)}
        acceptedAt={termDate}
      />

      {/* Cadastros */}
      <Modal
        open={Boolean(directoryForm)}
        onClose={() => setDirectoryForm(null)}
        title={directoryForm?.item ? `Renomear ${kindLabel}` : `Adicionar ${kindLabel}`}
      >
        <form className="form-stack" noValidate onSubmit={saveDirectoryItem}>
          <Field
            label="Nome"
            name="directory-name"
            defaultValue={directoryForm?.item?.name ?? ''}
            error={directoryForm?.error}
          />
          {directoryForm?.item && directoryForm.item.links > 0 && (
            <p className="field-help">
              {directoryForm.item.links} registros usam este nome e passam a mostrar o novo.
            </p>
          )}
          <div className="modal__actions">
            <Button type="button" variant="ghost" onClick={() => setDirectoryForm(null)}>
              Cancelar
            </Button>
            <Button type="submit">Salvar</Button>
          </div>
        </form>
      </Modal>
      <Modal
        open={Boolean(directoryRemove)}
        onClose={() => setDirectoryRemove(null)}
        title={directoryRemove?.links ? 'Inativar cadastro?' : 'Excluir cadastro?'}
      >
        {directoryRemove && (
          <p className="modal-copy">
            {directoryRemove.links
              ? `${directoryRemove.name} tem ${directoryRemove.links} vínculos, por isso não pode ser excluído. Ao inativar, ele some das listas de escolha e o histórico fica como está.`
              : `${directoryRemove.name} não tem vínculos e será excluído.`}
          </p>
        )}
        <div className="modal__actions">
          <Button variant="ghost" onClick={() => setDirectoryRemove(null)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              const item = directoryRemove
              if (!item) return
              if (item.links) {
                setDirectory(directory.map((row) => (row.id === item.id ? { ...row, active: false } : row)))
                notify(`${item.name} inativado. O histórico foi mantido.`)
              } else {
                setDirectory(directory.filter((row) => row.id !== item.id))
                notify(`${item.name} excluído.`)
              }
              setDirectoryRemove(null)
            }}
          >
            {directoryRemove?.links ? 'Inativar' : 'Excluir'}
          </Button>
        </div>
      </Modal>

      {/* Membros */}
      <Modal
        open={Boolean(memberRemove)}
        onClose={() => setMemberRemove(null)}
        title="Remover membro?"
      >
        <p className="modal-copy">
          {memberRemove?.name} perderá o acesso a todos os dados da {property.name}. Os lançamentos
          que essa pessoa fez continuam no histórico.
        </p>
        <div className="modal__actions">
          <Button variant="ghost" onClick={() => setMemberRemove(null)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              setMembers(members.filter((member) => member.id !== memberRemove?.id))
              notify(`${memberRemove?.name} foi removido da propriedade.`)
              setMemberRemove(null)
            }}
          >
            Remover membro
          </Button>
        </div>
      </Modal>
      <Modal
        open={modal === 'leave' && !onlyMember}
        onClose={() => setModal(null)}
        title="Sair desta propriedade?"
      >
        <p className="modal-copy">
          Você perderá o acesso aos dados da {property.name} e precisará de um novo convite para
          voltar.
        </p>
        <div className="modal__actions">
          <Button variant="ghost" onClick={() => setModal(null)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={() => navigate(`/propriedades?deixou=${id}`)}>
            Sair desta propriedade
          </Button>
        </div>
      </Modal>
      <Modal
        open={Boolean(inviteRevoke)}
        onClose={() => setInviteRevoke(null)}
        title="Revogar convite?"
      >
        <p className="modal-copy">
          O link de {inviteRevoke?.role.toLowerCase()} deixa de funcionar na hora. Se a pessoa ainda
          precisar de acesso, gere um novo convite.
        </p>
        <div className="modal__actions">
          <Button variant="ghost" onClick={() => setInviteRevoke(null)}>
            Manter convite
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              setInvites(
                invites.map((invite) =>
                  invite.id === inviteRevoke?.id ? { ...invite, status: 'Revogado' } : invite,
                ),
              )
              setInviteRevoke(null)
              notify('Convite revogado.')
            }}
          >
            Revogar
          </Button>
        </div>
      </Modal>
      <Modal
        open={inviteOpen}
        onClose={() => {
          updateParams({ acao: null })
          setInviteLink(null)
        }}
        title="Convidar pessoa"
      >
        {inviteLink ? (
          <div className="invite-link-once">
            <AlertOnce />
            <code>{inviteLink}</code>
            <div className="modal__actions">
              <Button
                icon={<Clipboard aria-hidden="true" />}
                onClick={() => {
                  navigator.clipboard?.writeText(inviteLink).catch(() => undefined)
                  notify('Link copiado.')
                }}
              >
                Copiar link
              </Button>
              <a
                className="button button--secondary"
                href={`https://wa.me/?text=${encodeURIComponent(`Convite para a ${property.name} no Mo$chos: ${inviteLink}`)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle aria-hidden="true" />
                Enviar pelo WhatsApp
              </a>
            </div>
          </div>
        ) : (
          <div className="form-stack">
            <label className="select-field" htmlFor="invite-role">
              <span>Papel</span>
              <select
                id="invite-role"
                value={inviteRole}
                onChange={(event) => setInviteRole(event.target.value as 'Proprietário' | 'Gestor')}
              >
                <option>Proprietário</option>
                <option>Gestor</option>
              </select>
            </label>
            <label className="select-field" htmlFor="invite-days">
              <span>Validade</span>
              <select
                id="invite-days"
                value={inviteDays}
                onChange={(event) => setInviteDays(event.target.value)}
              >
                <option value="1">1 dia</option>
                <option value="7">7 dias</option>
                <option value="30">30 dias</option>
              </select>
            </label>
            <p className="field-help">
              O papel fica definido no convite e a pessoa não pode trocá-lo.
            </p>
            <Button
              icon={<Link2 aria-hidden="true" />}
              onClick={() => {
                const roleSlug = inviteRole === 'Proprietário' ? 'proprietario' : 'gestor'
                const token = `${id}-${roleSlug}-${inviteDays}d-${Math.random().toString(36).slice(2, 8)}`
                setInviteLink(`${window.location.origin}/convite/${token}`)
                setInvites([
                  ...invites,
                  {
                    id: token,
                    role: inviteRole,
                    createdBy: user.name,
                    expiresAt: addDays(TODAY, Number(inviteDays)),
                    status: 'Pendente',
                  },
                ])
              }}
            >
              Gerar link de uso único
            </Button>
          </div>
        )}
      </Modal>
      <Modal open={modal === 'calculation'} onClose={() => setModal(null)} title="Como calculamos">
        <CalculationContent />
      </Modal>
      <Toast
        message={toast}
        action={toastAction}
        onClose={() => {
          setToast(null)
          setToastAction(undefined)
        }}
      />
    </AppShell>
  )
}

function SettingsSection({
  hidden,
  id,
  icon,
  title,
  text,
  children,
}: {
  hidden?: boolean
  id: string
  icon: React.ReactNode
  title: string
  text: string
  children: React.ReactNode
}) {
  if (hidden) return null
  return (
    <section
      className="settings-section"
      id={`secao-${id}`}
      tabIndex={-1}
      aria-labelledby={`secao-${id}-titulo`}
    >
      <div className="settings-section__heading">
        {icon}
        <div>
          <h2 id={`secao-${id}-titulo`}>{title}</h2>
          <p>{text}</p>
        </div>
      </div>
      {children}
    </section>
  )
}

function AlertOnce() {
  return (
    <aside className="inline-notice">
      <Check aria-hidden="true" />
      <p>
        <strong>Guarde ou envie agora: por segurança, este link não aparece de novo.</strong>
        <small>O link é de uso único e expira conforme a validade escolhida.</small>
      </p>
    </aside>
  )
}

function ReportPreview({
  type,
  period,
  state,
  rows,
}: {
  type: string
  period: ReportPeriod
  state: ReportState
  rows: ReportRow[]
}) {
  if (state === 'generating')
    return <StateView type="loading" title="Preparando seu relatório…" text="Leva só um instante." />
  if (state === 'error')
    return (
      <div className="report-state error" role="alert">
        <strong>Não foi possível gerar o relatório</strong>
        <small>Sua conexão pode ter oscilado. Use "Tentar de novo" abaixo.</small>
      </div>
    )
  if (state === 'empty' || rows.length === 0)
    return (
      <div className="report-state">
        <strong>Nenhum dado neste período</strong>
        <small>Escolha outro período ou outros lotes.</small>
      </div>
    )
  const costs = type.startsWith('Custos')
  return (
    <div className="report-preview">
      <table>
        <caption className="sr-only">Prévia do relatório {type.toLowerCase()}</caption>
        <thead>
          <tr>
            <th scope="col">Lote / animal</th>
            {costs ? (
              <>
                <th scope="col">Saldo</th>
                <th scope="col">Custo acumulado</th>
                <th scope="col">Custo por cabeça</th>
              </>
            ) : (
              <>
                <th scope="col">Margem líquida</th>
                <th scope="col">Observação</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((record) => (
            <tr key={record.slug}>
              <th scope="row">{record.name}</th>
              {costs ? (
                <>
                  <td>
                    {record.balance} de {record.original}
                  </td>
                  <td>{money(record.accumulatedCost)}</td>
                  <td>{record.balance ? money(record.costPerHead) : '—'}</td>
                </>
              ) : (
                <>
                  <td>{record.netMargin === null ? 'Sem venda' : money(record.netMargin)}</td>
                  <td>
                    {record.netMargin === null
                      ? '—'
                      : `sobre custos diretos${record.marginPartial ? ' · parcial' : ''}`}
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="report-preview__period">
        {period}:{' '}
        {costs
          ? 'lotes e animais que estiveram na propriedade no período, com o custo acumulado até hoje.'
          : 'margem líquida das vendas feitas no período.'}
      </p>
      {state === 'ready' && (
        <p>
          <Check aria-hidden="true" /> Relatório pronto para baixar ({decimal(rows.length, 0)}{' '}
          {rows.length === 1 ? 'linha' : 'linhas'}).
        </p>
      )}
    </div>
  )
}
