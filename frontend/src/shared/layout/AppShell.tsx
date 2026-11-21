import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, NavLink, useNavigate } from 'react-router'
import {
  BarChart3,
  Beef,
  Camera,
  ChevronDown,
  Check,
  LogOut,
  MapPin,
  Menu,
  ReceiptText,
  Settings,
  ShoppingBag,
  Store,
} from 'lucide-react'
import { Brand, Button } from '@/shared/ui/UI'
import { useActiveProperty } from '@/shared/routing/navigation'
import { listableProperties, type PropertyId } from '@/shared/demo/data'
import { Toast } from '@/shared/ui/UI'

const BRAND_MARK = '/assets/mochos-marca-verde.png'

/** Fecha um menu com Esc e com clique fora do elemento. */
function useDismiss(open: boolean, close: () => void, ...refs: React.RefObject<HTMLElement | null>[]) {
  const closeRef = useRef(close)
  closeRef.current = close
  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') closeRef.current()
    }
    function onPointer(event: MouseEvent) {
      const target = event.target as Node
      if (refs.some((ref) => ref.current?.contains(target))) return
      closeRef.current()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onPointer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
}

export default function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [switchOpen, setSwitchOpen] = useState<'sidebar' | 'mobile' | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const navigate = useNavigate()
  const { base, property, id } = useActiveProperty()
  const sidebarSwitchRef = useRef<HTMLDivElement>(null)
  const mobileSwitchRef = useRef<HTMLDivElement>(null)
  const accountRef = useRef<HTMLDivElement>(null)
  const navItems = [
    { to: `${base}/resumo`, label: 'Resumo', icon: BarChart3 },
    { to: `${base}/rebanho`, label: 'Rebanho', icon: Beef },
    { to: `${base}/custos`, label: 'Custos', icon: ReceiptText },
    { to: `${base}/vendas`, label: 'Vendas', icon: ShoppingBag },
    { to: `${base}/mercado`, label: 'Mercado', icon: Store },
    { to: `${base}/configuracoes`, label: 'Configurações', icon: Settings },
  ]
  const logo = property.logo || BRAND_MARK

  useDismiss(Boolean(switchOpen), () => setSwitchOpen(null), sidebarSwitchRef, mobileSwitchRef)
  useDismiss(mobileMenuOpen, () => setMobileMenuOpen(false), accountRef)

  function switchProperty(nextId: PropertyId) {
    const next = listableProperties.find((item) => item.id === nextId)
    setSwitchOpen(null)
    if (!next || nextId === id) return
    // Outra propriedade não tem os mesmos lotes/abas abertos: entra no Resumo dela.
    navigate(`/fazenda/${nextId}/resumo`)
    setToast(`Agora você está na ${next.name}.`)
  }

  function logout() {
    navigate('/entrar?saiu=1')
  }

  useEffect(() => {
    const openPurchase = () => navigate(`${base}/custos/nova-compra`)
    window.addEventListener('mochos:purchase', openPurchase)
    return () => window.removeEventListener('mochos:purchase', openPurchase)
  }, [navigate, base])

  return (
    <div className={`app-shell ${collapsed ? 'app-shell--collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar__brand">
          <Brand light compact={collapsed} />
        </div>
        <button
          className="sidebar__collapse"
          onClick={() => {
            setCollapsed(!collapsed)
            setSwitchOpen(null)
          }}
          aria-label={collapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
          aria-expanded={!collapsed}
        >
          <Menu aria-hidden="true" />
        </button>
        <div className="property-switch-wrap" ref={sidebarSwitchRef}>
          <button
            className="property-switch"
            onClick={() => {
              if (collapsed) setCollapsed(false)
              setSwitchOpen(switchOpen === 'sidebar' ? null : 'sidebar')
            }}
            aria-haspopup="true"
            aria-expanded={switchOpen === 'sidebar'}
            aria-label={collapsed ? `Propriedade: ${property.name}. Trocar propriedade` : undefined}
          >
            <img src={logo} width={44} height={44} alt="" />
            {!collapsed && (
              <span>
                <small>Propriedade · {property.role}</small>
                {property.name}
              </span>
            )}
            {!collapsed && <ChevronDown size={18} aria-hidden="true" />}
          </button>
          {switchOpen === 'sidebar' && !collapsed && (
            <PropertySwitcher activeId={id} onSwitch={switchProperty} />
          )}
        </div>
        <nav className="sidebar__nav" aria-label="Navegação principal">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={label}
              to={to}
              className={({ isActive }) => (isActive ? 'active' : '')}
              aria-label={collapsed ? label : undefined}
            >
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <Button
          className="sidebar__purchase"
          icon={<Camera aria-hidden="true" />}
          onClick={() => navigate(`${base}/custos/nova-compra`)}
          aria-label={collapsed ? 'Registrar compra' : undefined}
        >
          <span>Registrar compra</span>
        </Button>
        <button
          className={`sidebar__logout ${collapsed ? 'sidebar__logout--icon' : ''}`}
          onClick={logout}
          aria-label={collapsed ? 'Sair da conta' : undefined}
          title={collapsed ? 'Sair' : undefined}
        >
          <LogOut aria-hidden="true" />
          {!collapsed && 'Sair'}
        </button>
        {!collapsed && <p className="sidebar__foot">Gestão que fortalece o campo.</p>}
      </aside>

      <div className="mobile-header">
        <div className="property-switch-wrap" ref={mobileSwitchRef}>
          <button
            className="property-switch"
            onClick={() => setSwitchOpen(switchOpen === 'mobile' ? null : 'mobile')}
            aria-haspopup="true"
            aria-expanded={switchOpen === 'mobile'}
          >
            <img src={logo} width={42} height={42} alt="" />
            <span>
              <small>Propriedade · {property.role}</small>
              {property.name}
            </span>
            <ChevronDown size={18} aria-hidden="true" />
          </button>
          {switchOpen === 'mobile' && (
            <PropertySwitcher activeId={id} onSwitch={switchProperty} mobile />
          )}
        </div>
        <div className="mobile-account" ref={accountRef}>
          <button
            className="mobile-settings"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menu da conta"
            aria-haspopup="true"
            aria-expanded={mobileMenuOpen}
          >
            <Settings aria-hidden="true" />
          </button>
          {mobileMenuOpen && (
            <div className="mobile-account-menu">
              <Link to={`${base}/configuracoes`} onClick={() => setMobileMenuOpen(false)}>
                <Settings aria-hidden="true" />
                Configurações
              </Link>
              <button onClick={logout}>
                <LogOut aria-hidden="true" />
                Sair
              </button>
            </div>
          )}
        </div>
      </div>

      <main className="app-main">{children}</main>

      <nav className="bottom-nav" aria-label="Navegação principal no celular">
        {navItems.slice(0, 2).map(({ to, label, icon: Icon }) => (
          <NavLink key={label} to={to}>
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
        <Link
          className="bottom-nav__camera"
          to={`${base}/custos/nova-compra`}
          aria-label="Registrar compra"
        >
          <Camera aria-hidden="true" />
          <span>Compra</span>
        </Link>
        {navItems.slice(2, 4).map(({ to, label, icon: Icon }) => (
          <NavLink key={label} to={to}>
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  )
}

function PropertySwitcher({
  activeId,
  onSwitch,
  mobile,
}: {
  activeId: PropertyId
  onSwitch: (id: PropertyId) => void
  mobile?: boolean
}) {
  return (
    <div
      className={`property-switcher ${mobile ? 'property-switcher--mobile' : ''}`}
      role="group"
      aria-label="Trocar propriedade"
    >
      <span className="property-switcher__label">TROCAR PROPRIEDADE</span>
      {listableProperties.map((item) => (
        <button
          key={item.id}
          className={item.id === activeId ? 'active' : ''}
          aria-current={item.id === activeId ? 'true' : undefined}
          onClick={() => onSwitch(item.id)}
        >
          <img src={item.logo || BRAND_MARK} width={38} height={38} alt="" />
          <span>
            <strong>{item.name}</strong>
            <small>
              <MapPin aria-hidden="true" />
              {item.municipality}/{item.uf} · Você é {item.role.toLowerCase()}
            </small>
          </span>
          {item.id === activeId && <Check aria-label="Propriedade ativa" />}
        </button>
      ))}
      <Link className="property-switcher__all" to="/propriedades">
        Ver todas as propriedades
      </Link>
    </div>
  )
}
