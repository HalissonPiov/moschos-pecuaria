import { useEffect, useState, type ReactNode } from "react";
import { NavLink, useNavigate } from "react-router";
import {
  BarChart3,
  Beef,
  Camera,
  ChevronDown,
  Menu,
  ReceiptText,
  Settings,
  ShoppingBag,
  Store,
} from "lucide-react";
import { Brand, Button } from "@/shared/ui/UI";

const navItems = [
  { to: "/fazenda/baixada/resumo", label: "Resumo", icon: BarChart3 },
  { to: "/fazenda/baixada/rebanho", label: "Rebanho", icon: Beef },
  { to: "/fazenda/baixada/custos", label: "Custos", icon: ReceiptText },
  { to: "/fazenda/baixada/vendas", label: "Vendas", icon: ShoppingBag },
  { to: "/fazenda/baixada/mercado", label: "Mercado", icon: Store },
  { to: "/fazenda/baixada/configuracoes", label: "Configurações", icon: Settings },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const openPurchase = () => navigate("/fazenda/baixada/custos/nova-compra");
    window.addEventListener("mochos:purchase", openPurchase);
    return () => window.removeEventListener("mochos:purchase", openPurchase);
  }, [navigate]);

  return (
    <div className={`app-shell ${collapsed ? "app-shell--collapsed" : ""}`}>
      <aside className="sidebar">
        <div className="sidebar__brand"><Brand light compact={collapsed} /></div>
        <button className="sidebar__collapse" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? "Expandir barra lateral" : "Recolher barra lateral"}>
          <Menu />
        </button>
        <button className="property-switch" onClick={() => navigate("/propriedades")}>
          <img src="/assets/fazenda-baixada-logo.png" width="44" height="44" alt="Logo da Fazenda da Baixada" />
          {!collapsed && <span><small>Propriedade</small>Fazenda da Baixada</span>}
          {!collapsed && <ChevronDown size={18} />}
        </button>
        <nav className="sidebar__nav" aria-label="Navegação principal">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={label} to={to} className={({ isActive }) => isActive ? "active" : ""}>
              <Icon /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <Button className="sidebar__purchase" icon={<Camera />} onClick={() => navigate("/fazenda/baixada/custos/nova-compra")}>
          <span>Registrar compra</span>
        </Button>
        {!collapsed && <p className="sidebar__foot">Gestão que fortalece o campo.</p>}
      </aside>

      <div className="mobile-header">
        <button className="property-switch" onClick={() => navigate("/propriedades")}>
          <img src="/assets/fazenda-baixada-logo.png" width="42" height="42" alt="Logo da Fazenda da Baixada" />
          <span><small>Propriedade</small>Fazenda da Baixada</span>
          <ChevronDown size={18} />
        </button>
        <button className="mobile-settings" onClick={() => navigate("/fazenda/baixada/configuracoes")} aria-label="Abrir configurações">
          <Settings />
        </button>
      </div>

      <main className="app-main">{children}</main>

      <nav className="bottom-nav" aria-label="Navegação principal">
        {navItems.slice(0, 2).map(({ to, label, icon: Icon }) => (
          <NavLink key={label} to={to}><Icon /><span>{label}</span></NavLink>
        ))}
        <button className="bottom-nav__camera" onClick={() => navigate("/fazenda/baixada/custos/nova-compra")} aria-label="Registrar compra">
          <Camera /><span>Compra</span>
        </button>
        {navItems.slice(2, 4).map(({ to, label, icon: Icon }) => (
          <NavLink key={label} to={to}><Icon /><span>{label}</span></NavLink>
        ))}
      </nav>

    </div>
  );
}
