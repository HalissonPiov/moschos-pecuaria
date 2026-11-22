/*
 * Aceitar convite (Etapa 1.8) — rota /convite/:token.
 * O estado vem do token. Tokens de demonstração:
 *   /convite/valido     convite válido (Gestor)          /convite/expirado   venceu em 15/11/2026
 *   /convite/revogado   revogado por quem convidou       /convite/usado      já aceito
 *   /convite/membro     o usuário já faz parte
 *   Tokens gerados em Configurações (baixada-gestor-7d-xxxx / baixada-proprietario-...) são válidos
 *   e trazem o papel do convite.
 * Parâmetros de demonstração na URL:
 *   ?logado=1           já chega conectado (pula as abas Entrar / Criar conta)
 *   ?estado=loading     verificando o convite;  ?estado=error  falha ao verificar, com "Tentar de novo"
 *   ?falha=1            a primeira tentativa de "Aceitar convite" falha (erro com "Tentar de novo")
 */
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import {
  CheckCircle2,
  Clock3,
  Link2Off,
  LoaderCircle,
  LockKeyhole,
  MailCheck,
  ShieldCheck,
  UserCheck,
  UsersRound,
  XCircle,
} from 'lucide-react'
import {
  DeclarationTerm,
  EMAIL_PATTERN,
  PasswordStrength,
  validateNewPassword,
} from '@/features/properties/components/PropertyRegistration'
import { Brand, Button, Field, StateView, Toast } from '@/shared/ui/UI'
import { properties } from '@/shared/demo/data'

type InviteState = 'valido' | 'expirado' | 'revogado' | 'usado' | 'membro'

const property = properties.baixada

function inviteFromToken(token: string) {
  const fixed: Record<string, InviteState> = {
    expirado: 'expirado',
    revogado: 'revogado',
    usado: 'usado',
    membro: 'membro',
  }
  const state: InviteState = fixed[token] ?? 'valido'
  const role: 'Proprietário' | 'Gestor' = /proprietario/i.test(token) ? 'Proprietário' : 'Gestor'
  return { state, role }
}

type AuthErrors = Partial<Record<'nome' | 'email' | 'senha' | 'confirmar', string>>

export default function InvitePage() {
  const { token = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const loadState = params.get('estado') as 'loading' | 'error' | null
  const { state, role } = inviteFromToken(token)
  const roleKey = role === 'Proprietário' ? 'owner' : 'manager'
  const [identity, setIdentity] = useState<string | null>(
    params.get('logado') === '1' ? 'sua conta' : null,
  )
  const logged = identity !== null
  const [tab, setTab] = useState<'login' | 'signup'>('login')
  const [authStage, setAuthStage] = useState<'form' | 'confirm'>('form')
  const [pendingIdentity, setPendingIdentity] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<AuthErrors>({})
  const [countdown, setCountdown] = useState(42)
  const [accepted, setAccepted] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [termOpen, setTermOpen] = useState(false)
  const [accepting, setAccepting] = useState(false)
  const [acceptFailed, setAcceptFailed] = useState(false)
  const [failuresLeft, setFailuresLeft] = useState(params.get('falha') === '1' ? 1 : 0)
  const [toast, setToast] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (authStage !== 'confirm' || countdown <= 0) return
    const timer = window.setTimeout(() => setCountdown((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [authStage, countdown])

  if (loadState === 'loading' || loadState === 'error') {
    return (
      <div className="invite-page">
        <header className="invite-brand">
          <Brand compact />
        </header>
        <main className="invite-state">
          {loadState === 'loading' ? (
            <StateView type="loading" title="Verificando o convite…" text="Só um instante." />
          ) : (
            <StateView
              type="error"
              title="Não conseguimos abrir este convite"
              text="Sua internet pode ter oscilado. O link continua válido até o vencimento."
              onAction={() => setParams({})}
            />
          )}
        </main>
      </div>
    )
  }

  if (state !== 'valido') {
    const content = {
      expirado: {
        icon: Clock3,
        title: 'Este convite venceu',
        text: 'Este convite venceu em 15/11/2026. Peça um novo link.',
        action: 'Voltar para entrar',
      },
      revogado: {
        icon: XCircle,
        title: 'Convite revogado',
        text: 'Quem enviou este convite cancelou o acesso. Peça um novo link à propriedade.',
        action: 'Voltar para entrar',
      },
      usado: {
        icon: Link2Off,
        title: 'Este convite já foi usado',
        text: 'Cada link vale uma única vez e este já foi aceito. Peça um novo link, se precisar.',
        action: 'Voltar para entrar',
      },
      membro: {
        icon: UserCheck,
        title: 'Você já faz parte desta propriedade',
        text: `Seu acesso à ${property.name} já está ativo.`,
        action: 'Abrir propriedade',
      },
    }[state]
    const Icon = content.icon
    return (
      <div className="invite-page">
        <header className="invite-brand">
          <Brand compact />
        </header>
        <main className="invite-state">
          <span aria-hidden="true">
            <Icon />
          </span>
          <h1>{content.title}</h1>
          <p>{content.text}</p>
          <Link
            className="button button--primary"
            to={state === 'membro' ? `/fazenda/${property.id}/resumo` : '/entrar'}
          >
            {content.action}
          </Link>
        </main>
      </div>
    )
  }

  function changeTab(next: 'login' | 'signup') {
    setTab(next)
    setErrors({})
  }

  function authenticate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const nome = String(data.get('invite-name') || '').trim()
    const email = String(data.get('invite-email') || '').trim()
    const confirmar = String(data.get('invite-password-confirm') || '')
    const next: AuthErrors = {}
    if (!EMAIL_PATTERN.test(email)) next.email = 'Informe um e-mail válido.'
    if (tab === 'signup') {
      if (!nome) next.nome = 'Informe seu nome.'
      Object.assign(next, validateNewPassword(password, confirmar))
    } else if (password.length < 8) {
      next.senha = 'A senha precisa ter pelo menos 8 caracteres.'
    }
    setErrors(next)
    if (Object.keys(next).length) return
    // TODO(integração): autenticar ou criar a conta e retomar o token do convite.
    if (tab === 'signup') {
      setPendingIdentity(`${nome} (${email})`)
      setCountdown(42)
      setAuthStage('confirm')
      setToast('Conta criada. Confirme o e-mail para continuar com o convite.')
    } else {
      setIdentity(email)
      setToast('Você entrou. Agora aceite a declaração.')
    }
    setPassword('')
  }

  function acceptInvite() {
    setSubmitted(true)
    setAcceptFailed(false)
    if (!logged || !accepted) return
    // TODO(integração): aceitar convite com o token da rota.
    setAccepting(true)
    window.setTimeout(() => {
      setAccepting(false)
      if (failuresLeft > 0) {
        setFailuresLeft(failuresLeft - 1)
        setAcceptFailed(true)
        return
      }
      setToast(`Você agora faz parte da ${property.name}.`)
      window.setTimeout(() => navigate(`/fazenda/${property.id}/resumo`), 900)
    }, 700)
  }

  return (
    <div className="invite-page">
      <header className="invite-brand">
        <Brand compact />
      </header>
      <main className="invite-layout">
        <section className="invite-property">
          <div className="invite-property__logo">
            <img src={property.logo} width={96} height={96} alt={`Logo da ${property.name}`} />
          </div>
          <span className="eyebrow">CONVITE PARA UMA PROPRIEDADE</span>
          <h1>
            Ana Batista convidou você para a {property.name} como {role}.
          </h1>
          <div className="invite-facts">
            <div>
              <UsersRound aria-hidden="true" />
              <span>
                <small>Titular</small>
                <strong>{property.owner}</strong>
              </span>
            </div>
            <div>
              <ShieldCheck aria-hidden="true" />
              <span>
                <small>Seu papel</small>
                <strong>{role} · definido no convite</strong>
              </span>
            </div>
          </div>
        </section>

        <section className="invite-flow">
          {!logged && (
            <div className="invite-auth">
              {authStage === 'form' ? (
                <>
                  <div className="auth-tabs" role="tablist" aria-label="Acesso">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={tab === 'login'}
                      onClick={() => changeTab('login')}
                    >
                      Entrar
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={tab === 'signup'}
                      onClick={() => changeTab('signup')}
                    >
                      Criar conta
                    </button>
                  </div>
                  <form
                    className="form-stack"
                    onSubmit={authenticate}
                    noValidate
                    key={tab}
                  >
                    {tab === 'signup' && (
                      <Field
                        label="Seu nome"
                        name="invite-name"
                        autoComplete="name"
                        error={errors.nome}
                      />
                    )}
                    <Field
                      label="E-mail"
                      name="invite-email"
                      type="email"
                      autoComplete="email"
                      error={errors.email}
                    />
                    <Field
                      label="Senha"
                      name="invite-password"
                      type="password"
                      autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      error={errors.senha}
                    />
                    {tab === 'signup' && (
                      <>
                        <PasswordStrength password={password} />
                        <Field
                          label="Confirmar senha"
                          name="invite-password-confirm"
                          type="password"
                          autoComplete="new-password"
                          error={errors.confirmar}
                        />
                      </>
                    )}
                    <Button type="submit">
                      {tab === 'login' ? 'Entrar e continuar' : 'Criar conta e confirmar e-mail'}
                    </Button>
                  </form>
                </>
              ) : (
                <div className="invite-confirm-email">
                  <MailCheck aria-hidden="true" />
                  <h2>Confirme seu e-mail</h2>
                  <p>
                    Enviamos um link para {pendingIdentity}. Depois da confirmação, você volta a
                    este convite.
                  </p>
                  <Button
                    onClick={() => {
                      setIdentity(pendingIdentity)
                      setAuthStage('form')
                      setToast('E-mail confirmado. Continue com o convite.')
                    }}
                  >
                    Já confirmei meu e-mail
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={countdown > 0}
                    onClick={() => {
                      setCountdown(42)
                      setToast('Enviamos um novo link de confirmação.')
                    }}
                  >
                    {countdown > 0 ? `Reenviar em ${countdown}s` : 'Reenviar e-mail'}
                  </Button>
                </div>
              )}
            </div>
          )}
          {logged && (
            <div className="invite-logged">
              <CheckCircle2 aria-hidden="true" />
              <span>
                <strong>
                  {identity === 'sua conta'
                    ? 'Você já está conectado'
                    : `Você entrou como ${identity}`}
                </strong>
                <small>O convite será vinculado a esta conta.</small>
              </span>
            </div>
          )}

          <div className={!logged ? 'invite-declaration is-locked' : 'invite-declaration'}>
            <LockKeyhole aria-hidden="true" />
            <div>
              <h2>Declaração do {role.toLowerCase()}</h2>
              <p>
                {logged
                  ? 'O papel foi definido por quem enviou o convite e não pode ser alterado.'
                  : 'Entre ou crie sua conta para liberar a declaração.'}
              </p>
            </div>
            <label className={submitted && !accepted ? 'has-error' : ''}>
              <input
                type="checkbox"
                checked={accepted}
                disabled={!logged}
                aria-invalid={submitted && !accepted}
                aria-describedby={submitted && !accepted ? 'invite-term-error' : undefined}
                onChange={(event) => setAccepted(event.target.checked)}
              />
              <span>
                Declaro que{' '}
                {role === 'Proprietário'
                  ? 'sou o proprietário'
                  : 'faço a gestão com a permissão do proprietário'}{' '}
                e aceito o{' '}
                <button type="button" onClick={() => setTermOpen(true)}>
                  Termo de declaração
                </button>
                .
              </span>
            </label>
            {submitted && !accepted && (
              <p className="field__error" id="invite-term-error">
                Para continuar, aceite o termo.
              </p>
            )}
            {acceptFailed && (
              <div className="inline-alert" role="alert">
                <strong>Não conseguimos aceitar o convite agora.</strong>
                <span>Sua internet pode ter oscilado. Tente de novo.</span>
              </div>
            )}
            <Button
              onClick={acceptInvite}
              disabled={!logged || accepting}
              icon={accepting ? <LoaderCircle className="spin" aria-hidden="true" /> : undefined}
            >
              {accepting ? 'Aceitando…' : acceptFailed ? 'Tentar de novo' : 'Aceitar convite'}
            </Button>
          </div>
        </section>
      </main>
      <DeclarationTerm role={roleKey} open={termOpen} onClose={() => setTermOpen(false)} />
      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  )
}
