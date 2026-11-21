import { useSyncExternalStore } from 'react'
import { TODAY, user } from '@/shared/demo/data'

// TODO(integração): gravar a correção justificada na API (histórico do registro).

export type Correction = {
  id: string
  /** slug do registro (ex.: 'lote-recria-23'). */
  recordSlug: string
  /** O que foi corrigido (ex.: 'Venda total do lote'). */
  target: string
  before: string
  after: string
  reason: string
  author: string
  date: string
}

let corrections: Correction[] = []
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((listener) => listener())
}

export function addCorrection(
  input: Omit<Correction, 'id' | 'author' | 'date'> & Partial<Pick<Correction, 'author' | 'date'>>,
) {
  const correction: Correction = {
    id: `correcao-${corrections.length + 1}`,
    author: input.author ?? user.name,
    date: input.date ?? TODAY,
    ...input,
  }
  corrections = [correction, ...corrections]
  emit()
  return correction
}

export function getCorrections(recordSlug?: string) {
  return recordSlug ? corrections.filter((c) => c.recordSlug === recordSlug) : corrections
}

export function subscribeCorrections(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Lista reativa de correções (opcionalmente de um registro). */
export function useCorrections(recordSlug?: string) {
  const all = useSyncExternalStore(
    subscribeCorrections,
    () => corrections,
    () => corrections,
  )
  return recordSlug ? all.filter((c) => c.recordSlug === recordSlug) : all
}
