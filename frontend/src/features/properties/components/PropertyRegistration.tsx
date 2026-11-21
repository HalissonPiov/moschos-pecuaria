import { useEffect, useState } from 'react'
import {
  AlertCircle,
  Building2,
  Camera,
  Check,
  FileCheck2,
  ImagePlus,
  LoaderCircle,
  ShieldCheck,
  Trash2,
  Upload,
  UserRound,
  UsersRound,
} from 'lucide-react'
import { Button, Field, Modal } from '@/shared/ui/UI'
import { user, type PropertyInfo } from '@/shared/demo/data'

export type PropertyRole = 'owner' | 'manager'

export const states = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
]

// ---------------------------------------------------------------------------
// Regras compartilhadas (Etapa 1.6) e senha
// ---------------------------------------------------------------------------

/**
 * Regra única de permissão (Etapa 1.6): alterar titular, inativar/reativar e remover membros.
 * Pode o proprietário; ou o gestor quando NÃO há proprietário vinculado (titularidade não confirmada).
 */
export function canManageOwner(property: Pick<PropertyInfo, 'role' | 'confirmed'>) {
  return property.role === 'Proprietário' || !property.confirmed
}

export const OWNER_ONLY_COPY = 'Só o proprietário pode fazer isso.'

/** Força da senha calculada (0 a 4). */
export function passwordStrength(password: string) {
  if (!password) return { score: 0, label: '' }
  let score = 0
  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1
  else if (/\d/.test(password) || /[^A-Za-z0-9]/.test(password)) score += 0.5
  if (password.length < 8) score = Math.min(score, 1)
  const rounded = Math.max(1, Math.min(4, Math.floor(score)))
  const labels = ['', 'Fraca', 'Média', 'Boa', 'Forte']
  return { score: rounded, label: labels[rounded] }
}

export function PasswordStrength({ password }: { password: string }) {
  const { score, label } = passwordStrength(password)
  return (
    <div
      className={`password-strength password-strength--live password-strength--${score}`}
      aria-live="polite"
    >
      {[1, 2, 3, 4].map((bar) => (
        <i key={bar} className={bar <= score ? 'is-on' : ''} aria-hidden="true" />
      ))}
      <span>{label ? `Força: ${label.toLowerCase()}` : 'Use 8 ou mais caracteres'}</span>
    </div>
  )
}

/** Validação comum de senha nova: 8 caracteres e confirmação igual. */
export function validateNewPassword(password: string, confirm: string) {
  const errors: { senha?: string; confirmar?: string } = {}
  if (password.length < 8) errors.senha = 'A senha precisa ter pelo menos 8 caracteres.'
  if (!confirm) errors.confirmar = 'Repita a senha para confirmar.'
  else if (confirm !== password) errors.confirmar = 'As senhas precisam ser iguais.'
  return errors
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ---------------------------------------------------------------------------
// Termo de declaração
// ---------------------------------------------------------------------------

export function DeclarationTerm({
  role,
  open,
  onClose,
  acceptedAt,
}: {
  role: PropertyRole
  open: boolean
  onClose: () => void
  /** Quando informado, mostra a data em que o termo foi aceito (Configurações). */
  acceptedAt?: string
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        role === 'owner' ? 'Termo de declaração do proprietário' : 'Termo de declaração do gestor'
      }
    >
      <div className="declaration-term">
        <span>Versão 1.0 · 18/11/2026</span>
        {acceptedAt && <span>Aceito em {acceptedAt}</span>}
        <p>
          Ao aceitar, você declara que as informações fornecidas são verdadeiras e que{' '}
          {role === 'owner'
            ? 'é titular ou representa os titulares da propriedade'
            : 'faz a gestão com a permissão do titular da propriedade'}
          .
        </p>
        <p>
          Você se responsabiliza pelos dados cadastrados. O Mo$chos usa dados e fotos das notas
          somente para prestar o serviço, proteger sua conta e melhorar a gestão, seguindo a LGPD.
        </p>
        <div className="help-note">
          <ShieldCheck aria-hidden="true" /> Você pode consultar este termo novamente nas
          Configurações.
        </div>
        <Button onClick={onClose}>Entendi</Button>
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Cadastro de propriedade (Etapa 1.5)
// ---------------------------------------------------------------------------

type RegistrationErrors = Partial<
  Record<'name' | 'municipality' | 'uf' | 'area' | 'owner' | 'term', string>
>

export type RegisteredProperty = {
  name: string
  municipality: string
  uf: string
  area: string
  role: PropertyRole
  owner: string
}

export default function PropertyRegistration({
  open,
  onClose,
  onSuccess,
  step: controlledStep,
  onStepChange,
  simulateFailure = false,
}: {
  open: boolean
  onClose: () => void
  onSuccess: (property: RegisteredProperty) => void
  /** Passo atual quando controlado pela rota (?passo=). */
  step?: number
  onStepChange?: (step: number) => void
  /** Demonstração do estado de erro (?cadastro=erro): a primeira tentativa falha. */
  simulateFailure?: boolean
}) {
  const [localStep, setLocalStep] = useState(1)
  const step = controlledStep ?? localStep
  const setStep = (next: number) => {
    setLocalStep(next)
    onStepChange?.(next)
  }
  const [role, setRole] = useState<PropertyRole>('owner')
  const [ownerName, setOwnerName] = useState(user.name)
  const [accepted, setAccepted] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [termOpen, setTermOpen] = useState(false)
  const [logoPreview, setLogoPreview] = useState(false)
  const [coverPreview, setCoverPreview] = useState(false)
  const [name, setName] = useState('')
  const [municipality, setMunicipality] = useState('')
  const [uf, setUf] = useState('MG')
  const [area, setArea] = useState('')
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)
  const [failuresLeft, setFailuresLeft] = useState(simulateFailure ? 1 : 0)

  useEffect(() => {
    if (!open) return
    setSubmitted(false)
    setSaving(false)
    setFailed(false)
    setFailuresLeft(simulateFailure ? 1 : 0)
  }, [open, simulateFailure])

  function chooseRole(next: PropertyRole) {
    setRole(next)
    setOwnerName(next === 'owner' ? user.name : '')
    setAccepted(false)
  }

  const areaNumber = Number(area.replace(/\./g, '').replace(',', '.'))
  const errors: RegistrationErrors = {}
  if (!name.trim()) errors.name = 'Informe o nome da propriedade.'
  if (!municipality.trim()) errors.municipality = 'Informe o município.'
  if (!uf) errors.uf = 'Escolha a UF.'
  if (area.trim() && (!Number.isFinite(areaNumber) || areaNumber <= 0))
    errors.area = 'Informe a área em hectares, por exemplo 42,5.'
  if (!ownerName.trim()) errors.owner = 'Informe o nome do titular.'
  if (!accepted) errors.term = 'Para continuar, aceite o termo.'
  const show = (key: keyof RegistrationErrors) => (submitted ? errors[key] : undefined)

  function submit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    setFailed(false)
    if (errors.name || errors.municipality || errors.uf || errors.area) {
      setStep(1)
      return
    }
    if (errors.owner) {
      setStep(2)
      return
    }
    if (errors.term) {
      setStep(3)
      return
    }
    // TODO(integração): enviar propriedade, arquivos e aceite do termo para a API.
    setSaving(true)
    window.setTimeout(() => {
      setSaving(false)
      if (failuresLeft > 0) {
        setFailuresLeft(failuresLeft - 1)
        setFailed(true)
        return
      }
      onSuccess({ name: name.trim(), municipality: municipality.trim(), uf, area, role, owner: ownerName.trim() })
    }, 700)
  }

  const submitButton = (
    <Button
      type="submit"
      disabled={saving}
      icon={saving ? <LoaderCircle className="spin" aria-hidden="true" /> : undefined}
    >
      {saving ? 'Cadastrando…' : failed ? 'Tentar de novo' : 'Cadastrar propriedade'}
    </Button>
  )

  return (
    <>
      <Modal open={open} onClose={onClose} title="Cadastrar propriedade">
        <form className="property-registration" onSubmit={submit} noValidate aria-busy={saving}>
          <ol className="registration-stepper" aria-label={`Etapa ${step} de 3`}>
            {[
              ['1', 'Sobre a propriedade'],
              ['2', 'Sua relação'],
              ['3', 'Declaração'],
            ].map(([number, label]) => (
              <li key={number}>
                <button
                  type="button"
                  className={step === Number(number) ? 'active' : ''}
                  aria-current={step === Number(number) ? 'step' : undefined}
                  onClick={() => setStep(Number(number))}
                >
                  <span>{number}</span>
                  {label}
                </button>
              </li>
            ))}
          </ol>

          {failed && (
            <div className="inline-alert" role="alert">
              <strong>Não conseguimos cadastrar agora.</strong>
              <span>Sua internet pode ter oscilado. Nada foi perdido: tente de novo.</span>
            </div>
          )}

          <section
            className={`registration-section registration-step registration-step--1 ${
              step === 1 ? 'is-current' : ''
            }`}
          >
            <div className="registration-heading">
              <Building2 aria-hidden="true" />
              <div>
                <h3>Sobre a propriedade</h3>
                <p>Informações para identificar sua fazenda ou sítio.</p>
              </div>
            </div>
            <Field
              label="Nome da propriedade"
              name="property-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Como a fazenda é conhecida"
              error={show('name')}
              required
            />
            <div className="form-grid">
              <Field
                label="Município"
                name="municipality"
                value={municipality}
                onChange={(event) => setMunicipality(event.target.value)}
                error={show('municipality')}
                required
              />
              <label className="select-field" htmlFor="property-uf">
                <span>UF</span>
                <select
                  id="property-uf"
                  name="uf"
                  value={uf}
                  onChange={(event) => setUf(event.target.value)}
                  required
                  aria-invalid={Boolean(show('uf'))}
                >
                  {states.map((state) => (
                    <option key={state}>{state}</option>
                  ))}
                </select>
              </label>
            </div>
            <Field
              label="Área em hectares (opcional)"
              name="area"
              inputMode="decimal"
              value={area}
              onChange={(event) => setArea(event.target.value)}
              error={show('area')}
              suffix={<span className="field-suffix">ha</span>}
            />
            <div className="property-media-grid">
              <div className="media-upload">
                <span>Logo (opcional)</span>
                <div className={`logo-preview ${logoPreview ? 'has-image' : ''}`}>
                  {logoPreview ? (
                    <img
                      src="/assets/fazenda-baixada-logo.png"
                      width={96}
                      height={96}
                      alt="Prévia da logo, recortada em círculo"
                    />
                  ) : (
                    <ImagePlus aria-hidden="true" />
                  )}
                </div>
                <div>
                  <button type="button" onClick={() => setLogoPreview(true)}>
                    <Upload aria-hidden="true" />
                    {logoPreview ? 'Trocar logo' : 'Adicionar logo'}
                  </button>
                  {logoPreview && (
                    <button type="button" onClick={() => setLogoPreview(false)}>
                      <Trash2 aria-hidden="true" />
                      Remover logo
                    </button>
                  )}
                </div>
              </div>
              <div className="media-upload">
                <span>Foto de capa (opcional)</span>
                <div className={`cover-preview ${coverPreview ? 'has-image' : ''}`}>
                  {coverPreview ? (
                    <img
                      src="/assets/fazenda-baixada-aerea.jpg"
                      width={600}
                      height={280}
                      alt="Prévia da capa, recortada na forma da marca"
                    />
                  ) : (
                    <Camera aria-hidden="true" />
                  )}
                </div>
                <div>
                  <button type="button" onClick={() => setCoverPreview(true)}>
                    <Upload aria-hidden="true" />
                    {coverPreview ? 'Trocar capa' : 'Adicionar capa'}
                  </button>
                  {coverPreview && (
                    <button type="button" onClick={() => setCoverPreview(false)}>
                      <Trash2 aria-hidden="true" />
                      Remover capa
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section
            className={`registration-section registration-step registration-step--2 ${
              step === 2 ? 'is-current' : ''
            }`}
          >
            <div className="registration-heading">
              <UsersRound aria-hidden="true" />
              <div>
                <h3>Sua relação com a propriedade</h3>
                <p>Isso define suas permissões e o termo de declaração.</p>
              </div>
            </div>
            <div className="role-choices" role="radiogroup" aria-label="Sua relação com a propriedade">
              <button
                type="button"
                role="radio"
                aria-checked={role === 'owner'}
                className={role === 'owner' ? 'active' : ''}
                onClick={() => chooseRole('owner')}
              >
                <UserRound aria-hidden="true" />
                <span>
                  <strong>Sou o proprietário</strong>
                  <small>Sou titular ou represento os donos da propriedade.</small>
                </span>
                <i aria-hidden="true">{role === 'owner' && <Check />}</i>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={role === 'manager'}
                className={role === 'manager' ? 'active' : ''}
                onClick={() => chooseRole('manager')}
              >
                <UsersRound aria-hidden="true" />
                <span>
                  <strong>Faço a gestão em nome do proprietário</strong>
                  <small>Cuido da fazenda com a permissão de quem é dono.</small>
                </span>
                <i aria-hidden="true">{role === 'manager' && <Check />}</i>
              </button>
            </div>
            <Field
              label={role === 'owner' ? 'Nome do titular' : 'Nome do dono da propriedade'}
              name="owner-name"
              value={ownerName}
              onChange={(event) => setOwnerName(event.target.value)}
              error={show('owner')}
              required
            />
            <p className="field-help">Se houver mais de um dono, escreva todos os nomes.</p>
            <div className="privacy-cpf">
              <ShieldCheck aria-hidden="true" />
              <span>
                <strong>Não pedimos CPF nem CNPJ.</strong>
                <small>O nome do titular e a sua declaração bastam.</small>
              </span>
            </div>
          </section>

          <section
            className={`registration-section registration-step registration-step--3 ${
              step === 3 ? 'is-current' : ''
            }`}
          >
            <div className="registration-heading">
              <FileCheck2 aria-hidden="true" />
              <div>
                <h3>Leia e aceite a declaração</h3>
                <p>Um último passo para manter as responsabilidades claras.</p>
              </div>
            </div>
            <label className={`term-checkbox ${show('term') ? 'has-error' : ''}`}>
              <input
                type="checkbox"
                checked={accepted}
                aria-invalid={Boolean(show('term'))}
                aria-describedby={show('term') ? 'registration-term-error' : undefined}
                onChange={(event) => setAccepted(event.target.checked)}
              />
              <span>
                Declaro que{' '}
                {role === 'owner'
                  ? 'sou o proprietário'
                  : 'faço a gestão com a permissão do proprietário'}{' '}
                e aceito o{' '}
                <button type="button" onClick={() => setTermOpen(true)}>
                  Termo de declaração
                </button>
                .
              </span>
            </label>
            {show('term') && (
              <p className="field__error" id="registration-term-error">
                <AlertCircle size={16} aria-hidden="true" /> {show('term')}
              </p>
            )}
            <div className="term-summary">
              <ShieldCheck aria-hidden="true" />
              <p>
                <strong>Versão 1.0 · 18/11/2026</strong>
                <small>
                  Autodeclaração, responsabilidade pelas informações e uso dos dados conforme a
                  LGPD.
                </small>
              </p>
            </div>
          </section>

          <div className="registration-actions registration-actions--mobile">
            {step > 1 ? (
              <Button type="button" variant="ghost" onClick={() => setStep(step - 1)}>
                Voltar
              </Button>
            ) : (
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
            )}
            {step < 3 ? (
              <Button type="button" onClick={() => setStep(step + 1)}>
                Continuar
              </Button>
            ) : (
              submitButton
            )}
          </div>
          <div className="registration-actions registration-actions--desktop">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            {submitButton}
          </div>
        </form>
      </Modal>
      <DeclarationTerm role={role} open={termOpen} onClose={() => setTermOpen(false)} />
    </>
  )
}
