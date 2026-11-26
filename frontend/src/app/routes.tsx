import { createBrowserRouter, Navigate, type RouteObject } from 'react-router'
import LoginPage from '@/features/auth/pages/LoginPage'
import PropertiesPage from '@/features/properties/pages/PropertiesPage'
import DashboardPage from '@/features/dashboard/pages/DashboardPage'
import HerdPage from '@/features/herd/pages/HerdPage'
import AnimalFormPage from '@/features/herd/pages/AnimalFormPage'
import LotDetailPage from '@/features/herd/pages/LotDetailPage'
import CostsPage from '@/features/costs/pages/CostsPage'
import PurchasePage from '@/features/costs/pages/PurchasePage'
import FinancialPage from '@/features/finance/pages/FinancialPage'
import SalesPage from '@/features/sales/pages/SalesPage'
import MarketPage from '@/features/market/pages/MarketPage'
import SettingsPage from '@/features/settings/pages/SettingsPage'
import InvitePage from '@/features/properties/pages/InvitePage'
import RequireAuth from '@/features/auth/components/RequireAuth'
import PropriedadeAtivaRoute from '@/features/properties/components/PropriedadeAtivaRoute'

export const routes: RouteObject[] = [
  { path: '/', element: <Navigate to="/entrar" replace /> },
  { path: '/entrar', Component: LoginPage },
  // O convite é aceito com ou sem conta (A5); a tela ainda usa dados de demonstração.
  { path: '/convite/:token', Component: InvitePage },
  {
    // Rotas privadas (RF01): sem sessão, vão para /entrar.
    Component: RequireAuth,
    children: [
      { path: '/propriedades', Component: PropertiesPage },
      {
        // Propriedade ativa na rota, conferida na API (RF33, RNF05, ADR 0002).
        path: '/fazenda/:propriedadeId',
        Component: PropriedadeAtivaRoute,
        children: [
          { index: true, element: <Navigate to="resumo" replace /> },
          { path: 'resumo', Component: DashboardPage },
          { path: 'rebanho', Component: HerdPage },
          { path: 'rebanho/novo', Component: AnimalFormPage },
          { path: 'rebanho/:registroId', Component: LotDetailPage },
          { path: 'rebanho/:registroId/editar', Component: AnimalFormPage },
          { path: 'rebanho/:registroId/painel', Component: FinancialPage },
          { path: 'custos', Component: CostsPage },
          { path: 'custos/nova-compra', Component: PurchasePage },
          { path: 'vendas', Component: SalesPage },
          { path: 'mercado', Component: MarketPage },
          { path: 'configuracoes', Component: SettingsPage },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/entrar" replace /> },
]

export const router = createBrowserRouter(routes)
