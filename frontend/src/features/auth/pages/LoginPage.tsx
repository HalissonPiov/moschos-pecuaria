import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Eye, EyeOff, MailCheck, ShieldCheck } from "lucide-react";
import gsap from "gsap";
import { Button, Field, Brand } from "@/shared/ui/UI";

type LoginView = "form" | "confirm" | "confirmed" | "recover";

export default function LoginPage() {
  const [params, setParams] = useSearchParams();
  const initialView = (params.get("tela") as LoginView) || "form";
  const [view, setView] = useState<LoginView>(initialView);
  const [tab, setTab] = useState<"login" | "signup">(params.get("modo") === "cadastro" ? "signup" : "login");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loginError, setLoginError] = useState(params.get("erro") === "login");
  const [countdown, setCountdown] = useState(42);
  const brandRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const context = gsap.context(() => {
      gsap.from(".brand-panel__shape", { scale: 0.72, rotation: -7, opacity: 0, duration: 0.8, ease: "power3.out" });
      gsap.from(".brand-panel__content > *", { y: 28, opacity: 0, stagger: 0.11, duration: 0.55, delay: 0.12, ease: "power2.out" });
      gsap.from(formRef.current, { x: 28, opacity: 0, duration: 0.6, delay: 0.25, ease: "power2.out" });
    }, brandRef);
    return () => context.revert();
  }, []);

  useEffect(() => {
    if (view !== "confirm" || countdown <= 0) return;
    const timer = window.setTimeout(() => setCountdown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown, view]);

  function changeView(next: LoginView) {
    setView(next);
    setParams(next === "form" ? {} : { tela: next });
  }

  function changeTab(next: "login" | "signup") {
    setTab(next);
    setSubmitted(false);
    setLoginError(false);
    setParams(next === "signup" ? { modo: "cadastro" } : {});
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    const data = new FormData(event.currentTarget);
    if (tab === "login") {
      if (!data.get("email") || String(data.get("senha")).length < 8) return;
      setLoginError(false);
      navigate("/propriedades");
    } else {
      if (!data.get("nome") || !data.get("email") || String(data.get("senha")).length < 8 || data.get("senha") !== data.get("confirmar")) return;
      changeView("confirm");
    }
  }

  return (
    <div className="login-page" ref={brandRef}>
      <section className="brand-panel" aria-label="Mo$chos Pecuária">
        <div className="brand-panel__shape" aria-hidden="true"><span /><span /></div>
        <div className="brand-panel__content">
          <Brand light />
          <h1>Gestão que<br />fortalece o campo.</h1>
          <p>Decisões mais seguras, do pasto até a venda.</p>
          <div className="brand-panel__note"><ShieldCheck /> Seus dados da fazenda, sempre protegidos.</div>
        </div>
      </section>

      <section className="login-form-panel">
        <div className="login-form-wrap" ref={formRef}>
          {view === "form" && (
            <>
              <div className="login-heading">
                <span className="eyebrow">BEM-VINDO</span>
                <h2>{tab === "login" ? "Entre na sua fazenda" : "Comece a cuidar dos números"}</h2>
                <p>{tab === "login" ? "Tudo o que importa, sem complicação." : "Leva menos de dois minutos."}</p>
              </div>
              <div className="auth-tabs" role="tablist" aria-label="Acesso">
                <button role="tab" aria-selected={tab === "login"} onClick={() => changeTab("login")}>Entrar</button>
                <button role="tab" aria-selected={tab === "signup"} onClick={() => changeTab("signup")}>Criar conta</button>
              </div>
              {loginError && (
                <div className="inline-alert" role="alert">
                  <strong>Não foi possível entrar.</strong>
                  <span>Confira o e-mail e a senha e tente novamente.</span>
                </div>
              )}
              <form className="form-stack" onSubmit={submit} noValidate>
                {tab === "signup" && <Field label="Seu nome" name="nome" autoComplete="name" placeholder="Como devemos chamar você?" error={submitted ? "Informe seu nome." : undefined} />}
                <Field label="E-mail" name="email" type="email" autoComplete="email" placeholder="voce@exemplo.com.br" error={submitted ? "Informe um e-mail válido." : undefined} />
                <Field
                  label="Senha"
                  name="senha"
                  type={passwordVisible ? "text" : "password"}
                  autoComplete={tab === "login" ? "current-password" : "new-password"}
                  placeholder="Digite sua senha"
                  error={submitted ? "A senha precisa ter pelo menos 8 caracteres." : undefined}
                  suffix={<button type="button" className="field__icon" onClick={() => setPasswordVisible(!passwordVisible)} aria-label={passwordVisible ? "Ocultar senha" : "Mostrar senha"}>{passwordVisible ? <EyeOff /> : <Eye />}</button>}
                />
                {tab === "signup" && (
                  <>
                    <div className="password-strength" aria-label="Força da senha: média"><i /><i /><i /><i /><span>Força média</span></div>
                    <Field label="Confirme a senha" name="confirmar" type="password" autoComplete="new-password" placeholder="Digite a senha novamente" error={submitted ? "As senhas precisam ser iguais." : undefined} />
                  </>
                )}
                {tab === "login" && <button type="button" className="text-link form-link" onClick={() => changeView("recover")}>Esqueci minha senha</button>}
                <Button type="submit">{tab === "login" ? "Entrar" : "Criar minha conta"}</Button>
              </form>
              <p className="terms">Ao continuar, você aceita os <Link to="/termos">Termos de uso</Link> e a <Link to="/privacidade">Política de privacidade</Link>.</p>
            </>
          )}

          {view === "confirm" && (
            <SupportView icon={<MailCheck />} title="Confirme seu e-mail" text="Enviamos um link para joao@fazendabaixada.com.br. Abra a mensagem para confirmar seu cadastro.">
              <Button onClick={() => changeView("confirmed")}>Já confirmei meu e-mail</Button>
              <Button variant="ghost" disabled={countdown > 0} onClick={() => setCountdown(42)}>
                {countdown > 0 ? `Reenviar em ${countdown}s` : "Reenviar e-mail"}
              </Button>
            </SupportView>
          )}
          {view === "confirmed" && (
            <SupportView icon={<ShieldCheck />} title="E-mail confirmado" text="Pronto. Sua conta está segura e você já pode cadastrar sua primeira propriedade.">
              <Button onClick={() => navigate("/propriedades")}>Ir para minhas propriedades</Button>
            </SupportView>
          )}
          {view === "recover" && (
            <SupportView icon={<MailCheck />} title="Recuperar senha" text="Informe seu e-mail e enviaremos um link para criar uma nova senha.">
              <form className="form-stack" onSubmit={(event) => { event.preventDefault(); changeView("confirm"); }}>
                <Field label="E-mail" name="recover-email" type="email" autoComplete="email" placeholder="voce@exemplo.com.br" />
                <Button type="submit">Enviar link de recuperação</Button>
                <Button type="button" variant="ghost" onClick={() => changeView("form")}>Voltar para entrar</Button>
              </form>
            </SupportView>
          )}
        </div>
      </section>
    </div>
  );
}

function SupportView({ icon, title, text, children }: { icon: React.ReactNode; title: string; text: string; children: React.ReactNode }) {
  return (
    <div className="support-view">
      <div className="support-view__icon">{icon}</div>
      <span className="eyebrow">SUA CONTA</span>
      <h2>{title}</h2>
      <p>{text}</p>
      <div className="form-stack">{children}</div>
    </div>
  );
}
