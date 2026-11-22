import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { MochosData } from '@/shared/demo/types'
import { demoData, withDemoFallback } from '@/shared/demo/demo-backend'

const BackendDataContext = createContext<MochosData>(demoData)

/** Fornece os dados de apoio das telas; listas vazias ou ausentes caem nos dados de demonstração. */
export function BackendDataProvider({
  children,
  data,
}: {
  children: ReactNode
  data?: Partial<MochosData> | null
}) {
  const value = useMemo(() => withDemoFallback(data), [data])
  return <BackendDataContext.Provider value={value}>{children}</BackendDataContext.Provider>
}

export function useBackendData() {
  return useContext(BackendDataContext)
}
