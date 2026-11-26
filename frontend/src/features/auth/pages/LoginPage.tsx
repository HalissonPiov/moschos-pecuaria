/*
 * Tela de acesso (RF01, RF02, ADR 0001).
 * Parâmetros na URL:
 *   ?modo=cadastro            abre a aba "Criar conta"
 *   ?saiu=1                   toast "Você saiu da sua conta."
 *   ?tela=confirm | confirm-expired | confirmed   confirmação de e-mail (oculta: divergência M1)
 *   ?tela=recover | recover-sent | new-password | reset-invalid   recuperação de senha (oculta até o C4)
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { Eye, EyeOff, KeyRound, Link2Off, LoaderCircle, MailCheck, ShieldCheck } from 'lucide-react'
import gsap from 'gsap'
import { Brand, Button, Field, Toast } from '@/shared/ui/UI'
import {
  EMAIL_PATTERN,
  PasswordStrength,
  validateNewPassword,
} from '@/features/properties/components/PropertyRegistration'
import { ApiError } from '@/shared/api/client'
import { recursos } from '@/shared/config/recursos'
import { criarConta, entrar } from '@/features/auth/api'
import { useSessao } from '@/features/auth/session'
import { listarPropriedades } from '@/features/properties/api'

type LoginView =
  | 'form'
  | 'confirm'
  | 'confirm-expired'
  | 'confirmed'
  | 'recover'
  | 'recover-sent'
  | 'new-password'
  | 'reset-invalid'
type AuthField = 'nome' | 'email' | 'senha' | 'confirmar' | 'recover' | 'novaSenha' | 'novaConfirmar'
type AuthErrors = Partial<Record<AuthField, string>>
type LoginAlert = { title: string; text: string }

const CONFIRMATION_VIEWS: LoginView[] = ['confirm', 'confirm-expired', 'confirmed']
const RECOVERY_VIEWS: LoginView[] = ['recover', 'recover-sent', 'new-password', 'reset-invalid']

/** Telas de fluxos ainda ocultos (M1 e C4) voltam para o formulário. */
function allowedView(view: LoginView): LoginView {
  if (CONFIRMATION_VIEWS.includes(view) && !recursos.confirmacaoDeEmail) return 'form'
  if (RECOVERY_VIEWS.includes(view) && !recursos.recuperacaoDeSenha) return 'form'
  return view
}

export default function LoginPage() {
  const [params, setParams] = useSearchParams()
  const initialView = allowedView((params.get('tela') as LoginView) || 'form')
  const [view, setView] = useState<LoginView>(initialView)
  const [tab, setTab] = useState<'login' | 'signup'>(
    params.get('modo') === 'cadastro' ? 'signup' : 'login',
  )
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [errors, setErrors] = useState<AuthErrors>({})
  const [loginError, setLoginError] = useState<LoginAlert | null>(null)
  const [sending, setSending] = useState(false)
  const [countdown, setCountdown] = useState(42)
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [sentTo, setSentTo] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const brandRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const sessao = useSessao()
  const submittedRef = useRef(false)

  // "Sair" chega aqui com ?saiu=1, às vezes depois de a tela já estar aberta.
  const loggedOut = params.get('saiu') === '1'
  useEffect(() => {
    if (loggedOut) setToast('Você saiu da sua conta.')
  }, [loggedOut])

  // Quem já tem sessão e abre /entrar vai para as propriedades.
  useEffect(() => {
    if (sessao.status === 'autenticado' && !submittedRef.current && !loggedOut) {
      navigate('/propriedades', { replace: true })
    }
  }, [sessao.status, navigate, loggedOut])

  useLayoutEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const context = gsap.context(() => {
      gsap.from('.brand-panel__shape', {
        scale: 0.72,
        rotation: -7,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
      })
      gsap.from('.brand-panel__content > *', {
        y: 28,
        opacity: 0,
        stagger: 0.11,
        duration: 0.55,
        delay: 0.12,
        ease: 'power2.out',
      })
      gsap.from(formRef.current, {
        x: 28,
        opacity: 0,
        duration: 0.6,
        delay: 0.25,
        ease: 'power2.out',
      })
    }, brandRef)
    return () => context.revert()
  }, [])

  useEffect(() => {
    if (view !== 'confirm' || countdown <= 0) return
    const timer = window.setTimeout(() => setCountdown((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [countdown, view])

  function changeView(next: LoginView) {
    setView(next)
    setErrors({})
    setParams(next === 'form' ? {} : { tela: next })
  }

  function changeTab(next: 'login' | 'signup') {
    setTab(next)
    setErrors({})
    setLoginError(null)
    setParams(next === 'signup' ? { modo: 'cadastro' } : {})
  }

  function clearFieldError(event: React.FormEvent<HTMLFormElement>) {
    const field = (event.target as HTMLInputElement).name as AuthField
    if (!field || !errors[field]) return
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  /** Depois de entrar: volta para onde ia, ou abre a única propriedade (RF01). */
  async function goAfterLogin() {
    const from = (location.state as { de?: string } | null)?.de
    if (from) {
      navigate(from, { replace: true })
      return
    }
    try {
      const list = await listarPropriedades()
      navigate(list.length === 1 ? `/fazenda/${list[0].id}/resumo` : '/propriedades', {
        replace: true,
      })
    } catch {
      navigate('/propriedades', { replace: true })
    }
  }

  function connectionAlert(error: unknown): LoginAlert {
    const status = error instanceof ApiError ? error.status : 0
    // Só a recusa de dados traz uma mensagem escrita para o usuário; o resto (404, 500...)
    // vem do servidor em inglês e não ajuda quem está no campo.
    const text =
      status === 0
        ? 'Sem conexão com o servidor. Confira a internet e tente de novo.'
        : [400, 409, 422].includes(status)
          ? (error as ApiError).message
          : 'O servidor não respondeu como esperado. Tente de novo em instantes.'
    return { title: 'Não foi possível concluir agora.', text }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (sending) return
    const data = new FormData(event.currentTarget)
    const nome = String(data.get('nome') || '').trim()
    const email = String(data.get('email') || '').trim()
    const senha = String(data.get('senha') || '')
    const confirmar = String(data.get('confirmar') || '')
    const nextErrors: AuthErrors = {}

    if (!email || !EMAIL_PATTERN.test(email)) {
      nextErrors.email = 'Informe um e-mail válido.'
    }
    if (senha.length < 8) {
      nextErrors.senha = 'A senha precisa ter pelo menos 8 caracteres.'
    }

    if (tab === 'login') {
      setErrors(nextErrors)
      if (Object.keys(nextErrors).length > 0) return
      setLoginError(null)
      setSending(true)
      submittedRef.current = true
      try {
        sessao.iniciar(await entrar({ email, senha }))
        await goAfterLogin()
      } catch (error) {
        submittedRef.current = false
        setLoginError(
          error instanceof ApiError && error.status === 401
            ? { title: 'Não foi possível entrar.', text: 'Confira o e-mail e a senha e tente novamente.' }
            : connectionAlert(error),
        )
      } finally {
        setSending(false)
      }
    } else {
      if (!nome) nextErrors.nome = 'Informe seu nome.'
      const passwordErrors = validateNewPassword(senha, confirmar)
      if (passwordErrors.confirmar) nextErrors.confirmar = passwordErrors.confirmar
      setErrors(nextErrors)
      if (Object.keys(nextErrors).length > 0) return
      setLoginError(null)
      setSending(true)
      submittedRef.current = true
      try {
        sessao.iniciar(await criarConta({ nome, email, senha }))
        if (recursos.confirmacaoDeEmail) {
          setSentTo(email)
          setCountdown(42)
          changeView('confirm')
        } else {
          // Sem confirmação de e-mail na v1.0 (M1): a conta já nasce ativa.
          navigate('/propriedades', { replace: true })
        }
      } catch (error) {
        submittedRef.current = false
        if (error instanceof ApiError && error.status === 409) {
          setErrors({ email: error.message })
        } else {
          setLoginError(connectionAlert(error))
        }
      } finally {
        setSending(false)
      }
    }
  }

  return (
    <div className="login-page" ref={brandRef}>
      <section className="brand-panel" aria-label="Mo$chos Pecuária">
        <div className="brand-panel__shape" aria-hidden="true">
          <span />
          <span />
        </div>
        <div className="brand-panel__content">
          <Brand light />
          <h1>
            Gestão que
            <br />
            fortalece o campo.
          </h1>
          <p>Decisões mais seguras, do pasto até a venda.</p>
          <div className="brand-panel__note">
            <ShieldCheck /> Seus dados da fazenda, sempre protegidos.
          </div>
        </div>
      </section>

      <section className="login-form-panel">
        <div className="login-form-wrap" ref={formRef}>
          {view === 'form' && (
            <>
              <div className="login-heading">
                <span className="eyebrow">BEM-VINDO</span>
                <h2>{tab === 'login' ? 'Entre na sua fazenda' : 'Comece a cuidar dos números'}</h2>
                <p>
                  {tab === 'login'
                    ? 'Tudo o que importa, sem complicação.'
                    : 'Leva menos de dois minutos.'}
                </p>
              </div>
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
              {loginError && (
                <div className="inline-alert" role="alert">
                  <strong>{loginError.title}</strong>
                  <span>{loginError.text}</span>
                </div>
              )}
              <form className="form-stack" onSubmit={submit} onInput={clearFieldError} noValidate>
                {tab === 'signup' && (
                  <Field
                    label="Seu nome"
                    name="nome"
                    autoComplete="name"
                    placeholder="Como devemos chamar você?"
                    error={errors.nome}
                  />
                )}
                <Field
                  label="E-mail"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="O e-mail do seu cadastro"
                  error={errors.email}
                />
                <Field
                  label="Senha"
                  name="senha"
                  type={passwordVisible ? 'text' : 'password'}
                  autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  error={errors.senha}
                  suffix={
                    <button
                      type="button"
                      className="field__icon"
                      onClick={() => setPasswordVisible(!passwordVisible)}
                      aria-label={passwordVisible ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {passwordVisible ? <EyeOff /> : <Eye />}
                    </button>
                  }
                />
                {tab === 'signup' && (
                  <>
                    <PasswordStrength password={password} />
                    <Field
                      label="Confirme a senha"
                      name="confirmar"
                      type="password"
                      autoComplete="new-password"
                      placeholder="Digite a senha novamente"
                      error={errors.confirmar}
                    />
                  </>
                )}
                {tab === 'login' && recursos.recuperacaoDeSenha && (
                  <button
                    type="button"
                    className="text-link form-link"
                    onClick={() => changeView('recover')}
                  >
                    Esqueci minha senha
                  </button>
                )}
                <Button
                  type="submit"
                  disabled={sending}
                  aria-busy={sending}
                  icon={sending ? <LoaderCircle className="spin" aria-hidden="true" /> : undefined}
                >
                  {sending
                    ? tab === 'login'
                      ? 'Entrando…'
                      : 'Criando sua conta…'
                    : tab === 'login'
                      ? 'Entrar'
                      : 'Criar minha conta'}
                </Button>
              </form>
              <p className="terms">
                Ao continuar, você aceita os <Link to="/termos">Termos de uso</Link> e a{' '}
                <Link to="/privacidade">Política de privacidade</Link>.
              </p>
            </>
          )}

          {view === 'confirm' && (
            <SupportView
              icon={<MailCheck />}
              title="Confirme seu e-mail"
              text={`Enviamos um link para ${sentTo}. Abra a mensagem para confirmar seu cadastro.`}
            >
              <Button onClick={() => changeView('confirmed')}>Já confirmei meu e-mail</Button>
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
            </SupportView>
          )}
          {view === 'confirm-expired' && (
            <SupportView
              icon={<Link2Off />}
              title="Link de confirmação expirado"
              text="Este link não é mais válido. Envie um novo para confirmar seu e-mail com segurança."
            >
              <Button
                onClick={() => {
                  setCountdown(42)
                  changeView('confirm')
                }}
              >
                Enviar novo link
              </Button>
              <Button variant="ghost" onClick={() => changeView('form')}>
                Voltar para entrar
              </Button>
            </SupportView>
          )}
          {view === 'confirmed' && (
            <SupportView
              icon={<ShieldCheck />}
              title="E-mail confirmado"
              text="Pronto. Sua conta está segura e você já pode cadastrar sua primeira propriedade."
            >
              <Button onClick={() => navigate('/propriedades?estado=empty')}>
                Ir para minhas propriedades
              </Button>
            </SupportView>
          )}
          {view === 'recover' && (
            <SupportView
              icon={<MailCheck />}
              title="Recuperar senha"
              text="Informe seu e-mail e enviaremos um link para criar uma nova senha."
            >
              <form
                className="form-stack"
                noValidate
                onSubmit={(event) => {
                  event.preventDefault()
                  const email = String(
                    new FormData(event.currentTarget).get('recover-email') || '',
                  ).trim()
                  if (!EMAIL_PATTERN.test(email)) {
                    setErrors({ recover: 'Informe um e-mail válido.' })
                    return
                  }
                  setErrors({})
                  setSentTo(email)
                  changeView('recover-sent')
                }}
              >
                <Field
                  label="E-mail"
                  name="recover-email"
                  type="email"
                  autoComplete="email"
                  error={errors.recover}
                  onInput={() => errors.recover && setErrors({})}
                />
                <Button type="submit">Enviar link de recuperação</Button>
                <Button type="button" variant="ghost" onClick={() => changeView('form')}>
                  Voltar para entrar
                </Button>
              </form>
            </SupportView>
          )}
          {view === 'recover-sent' && (
            <SupportView
              icon={<MailCheck />}
              title="Confira seu e-mail"
              text={`Enviamos para ${sentTo} um link para você criar uma nova senha. Ele vence em 1 hora, por segurança.`}
            >
              <Button onClick={() => changeView('new-password')}>Abrir link de recuperação</Button>
              <Button variant="ghost" onClick={() => changeView('form')}>
                Voltar para entrar
              </Button>
            </SupportView>
          )}
          {view === 'new-password' && (
            <SupportView
              icon={<KeyRound />}
              title="Criar nova senha"
              text="Escolha uma senha segura e diferente da anterior."
            >
              <form
                className="form-stack"
                noValidate
                onSubmit={(event) => {
                  event.preventDefault()
                  const confirm = String(
                    new FormData(event.currentTarget).get('new-password-confirm') || '',
                  )
                  const result = validateNewPassword(newPassword, confirm)
                  if (result.senha || result.confirmar) {
                    setErrors({ novaSenha: result.senha, novaConfirmar: result.confirmar })
                    return
                  }
                  setErrors({})
                  setNewPassword('')
                  setToast('Senha criada. Entre com a nova senha.')
                  changeView('form')
                }}
              >
                <Field
                  label="Nova senha"
                  name="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => {
                    setNewPassword(event.target.value)
                    if (errors.novaSenha) setErrors({ ...errors, novaSenha: undefined })
                  }}
                  error={errors.novaSenha}
                />
                <PasswordStrength password={newPassword} />
                <Field
                  label="Confirmar nova senha"
                  name="new-password-confirm"
                  type="password"
                  autoComplete="new-password"
                  error={errors.novaConfirmar}
                  onInput={() =>
                    errors.novaConfirmar && setErrors({ ...errors, novaConfirmar: undefined })
                  }
                />
                <Button type="submit">Salvar nova senha</Button>
              </form>
            </SupportView>
          )}
          {view === 'reset-invalid' && (
            <SupportView
              icon={<Link2Off />}
              title="Link inválido ou expirado"
              text="Este link de recuperação não pode mais ser usado. Peça um novo para proteger sua conta."
            >
              <Button onClick={() => changeView('recover')}>Enviar novo link</Button>
              <Button variant="ghost" onClick={() => changeView('form')}>
                Voltar para entrar
              </Button>
            </SupportView>
          )}
        </div>
      </section>
      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  )
}

function SupportView({
  icon,
  title,
  text,
  children,
}: {
  icon: React.ReactNode
  title: string
  text: string
  children: React.ReactNode
}) {
  return (
    <div className="support-view">
      <div className="support-view__icon" aria-hidden="true">
        {icon}
      </div>
      <span className="eyebrow">SUA CONTA</span>
      <h2>{title}</h2>
      <p>{text}</p>
      <div className="form-stack">{children}</div>
    </div>
  )
}
