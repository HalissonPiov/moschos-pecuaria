import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import type { Usuario } from '@/shared/api/contracts'
import { onSessaoExpirada } from '@/shared/api/token'
import * as authApi from '@/features/auth/api'

type EstadoSessao =
  | { status: 'verificando'; usuario: null }
  | { status: 'autenticado'; usuario: Usuario }
  | { status: 'anonimo'; usuario: null }

type Sessao = EstadoSessao & {
  /** Guarda o usuário depois do login ou do cadastro. */
  iniciar: (usuario: Usuario) => void
  /** Encerra a sessão na API e no app (RF02). */
  encerrar: () => Promise<void>
}

const SessaoContext = createContext<Sessao | null>(null)

export function SessionProvider({
  children,
  usuarioInicial,
}: {
  children: ReactNode
  /** Só para testes: começa autenticado sem consultar a API. */
  usuarioInicial?: Usuario | null
}) {
  const [estado, setEstado] = useState<EstadoSessao>(() =>
    usuarioInicial === undefined
      ? { status: 'verificando', usuario: null }
      : usuarioInicial
        ? { status: 'autenticado', usuario: usuarioInicial }
        : { status: 'anonimo', usuario: null },
  )

  useEffect(() => {
    if (usuarioInicial !== undefined) return
    let ativo = true
    authApi
      .retomarSessao()
      .catch(() => null)
      .then((usuario) => {
        if (!ativo) return
        setEstado(usuario ? { status: 'autenticado', usuario } : { status: 'anonimo', usuario: null })
      })
    return () => {
      ativo = false
    }
  }, [usuarioInicial])

  useEffect(
    () => onSessaoExpirada(() => setEstado({ status: 'anonimo', usuario: null })),
    [],
  )

  const iniciar = useCallback((usuario: Usuario) => {
    setEstado({ status: 'autenticado', usuario })
  }, [])

  const encerrar = useCallback(async () => {
    try {
      await authApi.sair()
    } catch {
      // Sem rede, o token em memória já foi descartado; o cookie expira sozinho.
    }
    setEstado({ status: 'anonimo', usuario: null })
  }, [])

  const valor = useMemo(() => ({ ...estado, iniciar, encerrar }), [estado, iniciar, encerrar])
  return <SessaoContext.Provider value={valor}>{children}</SessaoContext.Provider>
}

export function useSessao(): Sessao {
  const sessao = useContext(SessaoContext)
  if (!sessao) throw new Error('useSessao precisa do SessionProvider.')
  return sessao
}

/**
 * "Sair" (RF02): vai para a tela de acesso com o aviso e encerra a sessão. Navega antes de
 * encerrar porque, sem sessão, as rotas privadas redirecionam e a tela atual some.
 */
export function useSair() {
  const navigate = useNavigate()
  const { encerrar } = useSessao()
  return useCallback(async () => {
    navigate('/entrar?saiu=1', { replace: true })
    await encerrar()
  }, [navigate, encerrar])
}

/** Iniciais do nome para o avatar ("João Batista" → "JB"). */
export function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  const letras = partes.length > 1 ? [partes[0], partes[partes.length - 1]] : partes
  return letras.map((parte) => parte[0]).join('').toUpperCase()
}
