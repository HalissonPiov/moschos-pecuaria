import { createContext, useContext, useEffect, useState } from 'react'
import { Outlet, useNavigate, useParams } from 'react-router'
import { ApiError } from '@/shared/api/client'
import { StateView } from '@/shared/ui/UI'
import { listarPropriedades, obterPropriedade, type Propriedade } from '@/features/properties/api'
import { guardarUltimaPropriedade } from '@/features/properties/model'
import { useSessao } from '@/features/auth/session'

type PropriedadeAtiva = { propriedade: Propriedade; lista: Propriedade[] }

const PropriedadeAtivaContext = createContext<PropriedadeAtiva | null>(null)

export function usePropriedadeAtiva() {
  return useContext(PropriedadeAtivaContext)
}

type Estado =
  | { status: 'carregando' }
  | { status: 'nao-encontrada' }
  | { status: 'erro' }
  | ({ status: 'pronta' } & PropriedadeAtiva)

export const propertyNotFoundCopy = {
  title: 'Propriedade não encontrada',
  text: 'O endereço não corresponde a nenhuma propriedade sua. Escolha uma propriedade na lista.',
  actionLabel: 'Ver minhas propriedades',
  to: '/propriedades',
}

/**
 * Rotas /fazenda/:propriedadeId/... (RF33, ADR 0002). Confere na API se o usuário é membro
 * da propriedade; a API responde 404 para propriedade alheia, inexistente ou inativa.
 */
export default function PropriedadeAtivaRoute() {
  const { propriedadeId = '' } = useParams()
  const navigate = useNavigate()
  const [estado, setEstado] = useState<Estado>({ status: 'carregando' })
  const [tentativa, setTentativa] = useState(0)
  const usuarioId = useSessao().usuario?.id

  useEffect(() => {
    let ativo = true
    setEstado({ status: 'carregando' })
    Promise.all([obterPropriedade(propriedadeId), listarPropriedades()])
      .then(([propriedade, lista]) => {
        if (!ativo) return
        if (usuarioId !== undefined) guardarUltimaPropriedade(usuarioId, propriedade.id)
        setEstado({ status: 'pronta', propriedade, lista })
      })
      .catch((erro: unknown) => {
        if (!ativo) return
        const naoEncontrada =
          erro instanceof ApiError && (erro.status === 404 || erro.status === 422)
        setEstado({ status: naoEncontrada ? 'nao-encontrada' : 'erro' })
      })
    return () => {
      ativo = false
    }
  }, [propriedadeId, tentativa, usuarioId])

  // Na troca de propriedade, a URL muda antes da nova resposta: nunca mostra a anterior.
  const atrasada = estado.status === 'pronta' && estado.propriedade.id !== propriedadeId
  if (estado.status === 'carregando' || atrasada) {
    return (
      <main className="auth-check">
        <StateView type="loading" title="Abrindo a propriedade…" />
      </main>
    )
  }
  if (estado.status === 'nao-encontrada') {
    return (
      <main className="auth-check">
        <h1 className="sr-only">{propertyNotFoundCopy.title}</h1>
        <StateView
          type="empty"
          title={propertyNotFoundCopy.title}
          text={propertyNotFoundCopy.text}
          actionLabel={propertyNotFoundCopy.actionLabel}
          onAction={() => navigate(propertyNotFoundCopy.to)}
        />
      </main>
    )
  }
  if (estado.status === 'erro') {
    return (
      <main className="auth-check">
        <StateView
          type="error"
          title="Não conseguimos abrir a propriedade"
          onAction={() => setTentativa((valor) => valor + 1)}
        />
      </main>
    )
  }
  return (
    <PropriedadeAtivaContext.Provider value={{ propriedade: estado.propriedade, lista: estado.lista }}>
      <Outlet />
    </PropriedadeAtivaContext.Provider>
  )
}
