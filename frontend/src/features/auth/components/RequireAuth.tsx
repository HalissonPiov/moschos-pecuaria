import { Navigate, Outlet, useLocation } from 'react-router'
import { StateView } from '@/shared/ui/UI'
import { useSessao } from '@/features/auth/session'

/** Rotas privadas: sem sessão, vai para /entrar e volta depois do login. */
export default function RequireAuth() {
  const sessao = useSessao()
  const location = useLocation()

  if (sessao.status === 'verificando') {
    return (
      <main className="auth-check">
        <StateView type="loading" title="Abrindo sua conta…" text="Isso deve levar só um instante." />
      </main>
    )
  }
  if (sessao.status === 'anonimo') {
    return <Navigate to="/entrar" replace state={{ de: `${location.pathname}${location.search}` }} />
  }
  return <Outlet />
}
