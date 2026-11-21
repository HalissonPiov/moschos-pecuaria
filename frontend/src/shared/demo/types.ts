/**
 * Formato dos dados de apoio das telas (cotações, cadastros, membros, convites e
 * parâmetros). No protótipo do Figma eles vinham do Payload; aqui são preenchidos
 * por demo-backend.ts até cada feature ter seu adaptador de API.
 */
type Timestamps = {
  updatedAt: string
  createdAt: string
}

export type MarketQuote = Timestamps & {
  id: string
  date: string
  market: string
  value: number
  source: 'Escritório local' | 'Frigorífico' | 'Sindicato rural' | 'CEPEA (consulta manual)'
}

export type DirectoryEntry = Timestamps & {
  id: string
  name: string
  kind: 'pasto' | 'fornecedor' | 'comprador' | 'categoria'
  active?: boolean | null
  linkedRecords?: number | null
}

export type PropertyMember = Timestamps & {
  id: string
  name: string
  email: string
  role: 'Proprietário' | 'Gestor'
  memberSince: string
  currentUser?: boolean | null
}

export type PropertyInvite = Timestamps & {
  id: string
  role: 'Proprietário' | 'Gestor'
  createdByName: string
  expiresAt: string
  status: 'Pendente' | 'Aceito' | 'Expirado' | 'Revogado'
  singleUseToken?: string | null
}

export type PropertySetting = Timestamps & {
  id: string
  propertyName: string
  defaultCarcassYield: number
  defaultQuoteMarket: string
  dueDateWarningDays: number
}

export type MochosData = {
  quotes: MarketQuote[]
  directory: DirectoryEntry[]
  members: PropertyMember[]
  invites: PropertyInvite[]
  settings: PropertySetting[]
}
