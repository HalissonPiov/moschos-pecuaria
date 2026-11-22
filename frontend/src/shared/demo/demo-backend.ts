import type { MochosData } from '@/shared/demo/types'

// Dados de demonstração das cotações, cadastros, membros, convites e parâmetros (Etapa 0.11).
// Usados enquanto a API não entrega esses dados ou quando ela devolve listas vazias.
// TODO(integração): remover quando a API real estiver conectada.

const stamp = '2026-11-20T12:00:00.000Z'
const meta = { updatedAt: stamp, createdAt: stamp }

export const demoData: MochosData = {
  quotes: [
    {
      id: 'demo-q1',
      date: '2026-11-06T12:00:00.000Z',
      market: 'Minas Gerais',
      value: 318,
      source: 'Escritório local',
      ...meta,
    },
    {
      id: 'demo-q2',
      date: '2026-10-28T12:00:00.000Z',
      market: 'Minas Gerais',
      value: 312,
      source: 'Frigorífico',
      ...meta,
    },
    {
      id: 'demo-q3',
      date: '2026-10-14T12:00:00.000Z',
      market: 'Minas Gerais',
      value: 309.5,
      source: 'Sindicato rural',
      ...meta,
    },
  ],
  directory: [
    { id: 'demo-p1', name: 'Piquete da Serra', kind: 'pasto', active: true, linkedRecords: 23, ...meta },
    { id: 'demo-p2', name: 'Pasto do Córrego', kind: 'pasto', active: true, linkedRecords: 26, ...meta },
    { id: 'demo-p3', name: 'Piquete 3', kind: 'pasto', active: true, linkedRecords: 5, ...meta },
    { id: 'demo-p4', name: 'Pasto Alto', kind: 'pasto', active: true, linkedRecords: 0, ...meta },
    { id: 'demo-f1', name: 'Agropecuária Ponte Nova', kind: 'fornecedor', active: true, linkedRecords: 12, ...meta },
    { id: 'demo-f2', name: 'Casa do Criador', kind: 'fornecedor', active: true, linkedRecords: 8, ...meta },
    { id: 'demo-f3', name: 'Vet Rural', kind: 'fornecedor', active: true, linkedRecords: 6, ...meta },
    { id: 'demo-f4', name: 'Carlos Andrade (locação)', kind: 'fornecedor', active: true, linkedRecords: 4, ...meta },
    { id: 'demo-c1', name: 'Frigorífico União', kind: 'comprador', active: true, linkedRecords: 2, ...meta },
    { id: 'demo-c2', name: 'José Carlos', kind: 'comprador', active: true, linkedRecords: 0, ...meta },
    { id: 'demo-k1', name: 'Ração', kind: 'categoria', active: true, linkedRecords: 42, ...meta },
    { id: 'demo-k2', name: 'Suplemento', kind: 'categoria', active: true, linkedRecords: 18, ...meta },
    { id: 'demo-k3', name: 'Medicamento', kind: 'categoria', active: true, linkedRecords: 11, ...meta },
    { id: 'demo-k4', name: 'Locação de pasto', kind: 'categoria', active: true, linkedRecords: 6, ...meta },
    { id: 'demo-k5', name: 'Mão de obra', kind: 'categoria', active: true, linkedRecords: 9, ...meta },
    { id: 'demo-k6', name: 'Manutenção', kind: 'categoria', active: true, linkedRecords: 0, ...meta },
  ],
  members: [
    {
      id: 'demo-m1',
      name: 'João Batista',
      email: 'joao@fazendadabaixada.com.br',
      role: 'Proprietário',
      memberSince: '2024-01-18T12:00:00.000Z',
      currentUser: true,
      ...meta,
    },
    {
      id: 'demo-m2',
      name: 'Ana Batista',
      email: 'ana@fazendadabaixada.com.br',
      role: 'Gestor',
      memberSince: '2025-03-02T12:00:00.000Z',
      currentUser: false,
      ...meta,
    },
  ],
  invites: [
    {
      id: 'demo-i1',
      role: 'Gestor',
      createdByName: 'João Batista',
      expiresAt: '2026-11-27T12:00:00.000Z',
      status: 'Pendente',
      ...meta,
    },
    {
      id: 'demo-i2',
      role: 'Gestor',
      createdByName: 'João Batista',
      expiresAt: '2026-11-15T12:00:00.000Z',
      status: 'Expirado',
      ...meta,
    },
  ],
  settings: [
    {
      id: 'demo-s1',
      propertyName: 'Fazenda da Baixada',
      defaultCarcassYield: 50,
      defaultQuoteMarket: 'Minas Gerais',
      dueDateWarningDays: 7,
      ...meta,
    },
  ],
}

/** Completa cada lista vazia com a de demonstração. */
export function withDemoFallback(data: Partial<MochosData> | null | undefined): MochosData {
  const pick = <K extends keyof MochosData>(key: K): MochosData[K] => {
    const value = data?.[key]
    return Array.isArray(value) && value.length ? (value as MochosData[K]) : demoData[key]
  }
  return {
    quotes: pick('quotes'),
    directory: pick('directory'),
    members: pick('members'),
    invites: pick('invites'),
    settings: pick('settings'),
  }
}
