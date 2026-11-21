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

export const routes: RouteObject[] = [
  { path: '/', element: <Navigate to="/entrar" replace /> },
  { path: '/entrar', Component: LoginPage },
  { path: '/propriedades', Component: PropertiesPage },
  { path: '/convite/:token', Component: InvitePage },
  { path: '/fazenda/:propriedadeId/resumo', Component: DashboardPage },
  { path: '/fazenda/:propriedadeId/rebanho', Component: HerdPage },
  { path: '/fazenda/:propriedadeId/rebanho/novo', Component: AnimalFormPage },
  {
    path: '/fazenda/:propriedadeId/rebanho/:registroId',
    Component: LotDetailPage,
  },
  {
    path: '/fazenda/:propriedadeId/rebanho/:registroId/editar',
    Component: AnimalFormPage,
  },
  {
    path: '/fazenda/:propriedadeId/rebanho/:registroId/painel',
    Component: FinancialPage,
  },
  { path: '/fazenda/:propriedadeId/custos', Component: CostsPage },
  {
    path: '/fazenda/:propriedadeId/custos/nova-compra',
    Component: PurchasePage,
  },
  { path: '/fazenda/:propriedadeId/vendas', Component: SalesPage },
  { path: '/fazenda/:propriedadeId/mercado', Component: MarketPage },
  { path: '/fazenda/:propriedadeId/configuracoes', Component: SettingsPage },
  { path: '*', element: <Navigate to="/entrar" replace /> },
]

export const router = createBrowserRouter(routes)
