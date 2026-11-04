import { createBrowserRouter, Navigate } from "react-router";
import LoginPage from "@/features/auth/pages/LoginPage";
import PropertiesPage from "@/features/properties/pages/PropertiesPage";
import DashboardPage from "@/features/dashboard/pages/DashboardPage";
import HerdPage from "@/features/herd/pages/HerdPage";
import AnimalFormPage from "@/features/herd/pages/AnimalFormPage";
import LotDetailPage from "@/features/herd/pages/LotDetailPage";
import CostsPage from "@/features/costs/pages/CostsPage";
import PurchasePage from "@/features/costs/pages/PurchasePage";
import FinancialPage from "@/features/finance/pages/FinancialPage";
import SalesPage from "@/features/sales/pages/SalesPage";
import MarketPage from "@/features/market/pages/MarketPage";
import SettingsPage from "@/features/settings/pages/SettingsPage";

export const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/entrar" replace /> },
  { path: "/entrar", Component: LoginPage },
  { path: "/propriedades", Component: PropertiesPage },
  { path: "/fazenda/baixada/resumo", Component: DashboardPage },
  { path: "/fazenda/baixada/rebanho", Component: HerdPage },
  { path: "/fazenda/baixada/rebanho/novo", Component: AnimalFormPage },
  { path: "/fazenda/baixada/rebanho/lote-safra-24", Component: LotDetailPage },
  { path: "/fazenda/baixada/rebanho/lote-safra-24/editar", Component: AnimalFormPage },
  { path: "/fazenda/baixada/rebanho/lote-safra-24/painel", Component: FinancialPage },
  { path: "/fazenda/baixada/custos", Component: CostsPage },
  { path: "/fazenda/baixada/custos/nova-compra", Component: PurchasePage },
  { path: "/fazenda/baixada/vendas", Component: SalesPage },
  { path: "/fazenda/baixada/mercado", Component: MarketPage },
  { path: "/fazenda/baixada/configuracoes", Component: SettingsPage },
  { path: "*", element: <Navigate to="/entrar" replace /> },
]);
