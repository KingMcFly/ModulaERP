import { useState, type ReactNode } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Puzzle, Users, Settings,
  LogOut, Boxes, PanelLeftClose, PanelLeftOpen, Menu, X,
} from 'lucide-react';

const TRANSITION = 'all 200ms cubic-bezier(0.23, 1, 0.32, 1)';

interface LayoutProps { children: ReactNode; userName: string; onLogout: () => void; }

const navItems = [
  { to: '/',        icon: LayoutDashboard, label: 'Dashboard',    shortLabel: 'Inicio'   },
  { to: '/tenants', icon: Building2,       label: 'Empresas',     shortLabel: 'Empresas' },
  { to: '/modules', icon: Puzzle,          label: 'Módulos',      shortLabel: 'Módulos'  },
  { to: '/users',   icon: Users,           label: 'Usuarios',     shortLabel: 'Usuarios' },
  { to: '/settings',icon: Settings,        label: 'Configuración',shortLabel: 'Config'   },
];

function usePageTitle() {
  const { pathname } = useLocation();
  const match = [...navItems].reverse().find(
    n => pathname === n.to || (n.to !== '/' && pathname.startsWith(n.to))
  );
  return match?.label ?? 'Dashboard';
}

export default function Layout({ children, userName, onLogout }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [drawerOpen, setDrawerOpen]   = useState(false);
  const navigate = useNavigate();
  const pageTitle = usePageTitle();

  function handleLogout() { onLogout(); navigate('/login'); }
  function closeDrawer()  { setDrawerOpen(false); }

  return (
    <div
      className="flex overflow-hidden bg-[#F2F2F6]"
      style={{ height: '100dvh' }}
    >
      <a href="#main-content" className="skip-link">Saltar al contenido principal</a>

      {/* ═══════════════════════════════════════════════════
          MOBILE DRAWER (hidden on lg+)
      ═══════════════════════════════════════════════════ */}
      <div
        className="fixed inset-0 z-50 lg:hidden"
        style={{
          opacity: drawerOpen ? 1 : 0,
          pointerEvents: drawerOpen ? 'all' : 'none',
          transition: 'opacity 240ms cubic-bezier(0.32, 0.72, 0, 1)',
        }}
        aria-hidden={!drawerOpen}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0"
          style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
          onClick={closeDrawer}
        />

        {/* Drawer panel */}
        <nav
          className="absolute left-0 top-0 bottom-0 flex flex-col overflow-y-auto"
          style={{
            width: 288,
            background: '#0A0A12',
            borderRight: '1px solid rgba(255,255,255,0.065)',
            boxShadow: '4px 0 32px rgba(0,0,0,0.40)',
            transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 280ms cubic-bezier(0.32, 0.72, 0, 1)',
          }}
          aria-label="Menú de navegación móvil"
        >
          {/* Drawer header */}
          <div
            className="flex items-center justify-between px-4 flex-shrink-0"
            style={{
              height: 'calc(60px + env(safe-area-inset-top))',
              paddingTop: 'env(safe-area-inset-top)',
              borderBottom: '1px solid rgba(255,255,255,0.065)',
              background: 'linear-gradient(180deg, rgba(242,176,69,0.14) 0%, transparent 100%)',
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #F2B045, #EDA135)',
                  boxShadow: '0 4px 12px rgba(242,176,69,0.55), inset 0 1px 0 rgba(255,255,255,0.22)',
                }}
                aria-hidden="true"
              >
                <Boxes size={15} style={{ color: '#131316' }} />
              </div>
              <div>
                <p className="font-bold text-white text-[13px] tracking-[-0.02em] leading-tight">FB Core</p>
                <p className="text-[10.5px] font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>Super Admin</p>
              </div>
            </div>
            <button
              onClick={closeDrawer}
              className="w-9 h-9 flex items-center justify-center rounded-xl"
              style={{ color: 'rgba(255,255,255,0.45)', background: 'rgba(255,255,255,0.06)' }}
              aria-label="Cerrar menú"
            >
              <X size={17} />
            </button>
          </div>

          {/* Drawer nav links */}
          <div className="flex-1 py-3 px-2.5 space-y-0.5 overflow-y-auto">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] px-3 pt-1 pb-2" style={{ color: 'rgba(255,255,255,0.25)' }}>
              Navegación
            </p>
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                onClick={closeDrawer}
                className="flex items-center gap-3.5 px-3 py-3 rounded-xl text-[14px] font-semibold"
                style={({ isActive }) =>
                  isActive
                    ? {
                        color: 'rgba(255,255,255,0.95)',
                        background: 'rgba(255,255,255,0.10)',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10), 0 0 0 1px rgba(255,255,255,0.08)',
                        transition: TRANSITION,
                      }
                    : {
                        color: 'rgba(255,255,255,0.45)',
                        transition: TRANSITION,
                      }
                }
              >
                {({ isActive }) => (
                  <>
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: isActive ? 'rgba(242,176,69,0.18)' : 'rgba(255,255,255,0.06)' }}
                    >
                      <Icon size={16} style={{ color: isActive ? '#F2B045' : 'rgba(255,255,255,0.45)' }} />
                    </div>
                    <span>{label}</span>
                    {isActive && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: '#F2B045' }} />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>

          {/* Drawer user section */}
          <div
            className="p-3 flex-shrink-0"
            style={{
              borderTop: '1px solid rgba(255,255,255,0.065)',
              paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
            }}
          >
            <div
              className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-[13px] flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #F2B045, #EDA135)',
                  boxShadow: '0 2px 8px rgba(242,176,69,0.4)',
                  color: '#131316',
                }}
                aria-hidden="true"
              >
                {userName[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-white truncate leading-tight">{userName}</p>
                <p className="text-[11px] font-medium mt-0.5" style={{ color: 'rgba(255,255,255,0.38)' }}>Super Admin</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-8 h-8 flex items-center justify-center rounded-xl flex-shrink-0"
                style={{ color: 'rgba(255,255,255,0.38)', background: 'rgba(255,255,255,0.05)', transition: TRANSITION }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#f87171'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.12)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.38)'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; }}
                aria-label="Cerrar sesión"
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>
        </nav>
      </div>

      {/* ═══════════════════════════════════════════════════
          DESKTOP SIDEBAR (hidden on mobile)
      ═══════════════════════════════════════════════════ */}
      <aside
        aria-label="Navegación principal"
        className="hidden lg:flex flex-col flex-shrink-0 overflow-hidden"
        style={{
          width: sidebarOpen ? 232 : 62,
          background: '#0A0A12',
          borderRight: '1px solid rgba(255,255,255,0.065)',
          boxShadow: '1px 0 0 rgba(255,255,255,0.04) inset',
          transition: 'width 280ms cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-3 px-4 h-[58px] flex-shrink-0 relative overflow-hidden"
          style={{
            borderBottom: '1px solid rgba(255,255,255,0.065)',
            background: 'linear-gradient(180deg, rgba(242,176,69,0.14) 0%, transparent 100%)',
          }}
        >
          <div
            className="w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0 relative z-10"
            style={{
              background: 'linear-gradient(135deg, #F2B045, #EDA135)',
              boxShadow: '0 4px 12px rgba(242,176,69,0.55), inset 0 1px 0 rgba(255,255,255,0.22)',
            }}
            aria-hidden="true"
          >
            <Boxes size={15} style={{ color: '#131316' }} />
          </div>
          {sidebarOpen && (
            <div className="flex flex-col min-w-0 relative z-10">
              <span className="font-bold text-white text-[13px] tracking-[-0.02em] leading-tight">FB Core</span>
              <span className="text-[10.5px] font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>Super Admin</span>
            </div>
          )}
        </div>

        {/* Desktop nav */}
        <nav aria-label="Módulos de administración" className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }, idx) => (
            <div key={to} className="animate-fade-up" style={{ animationDelay: `${idx * 40}ms` }}>
              <NavLink
                to={to}
                end={to === '/'}
                title={!sidebarOpen ? label : undefined}
                className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[13px] font-semibold"
                style={({ isActive }) =>
                  isActive
                    ? {
                        color: 'rgba(255,255,255,0.95)',
                        background: 'rgba(255,255,255,0.10)',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10), 0 0 0 1px rgba(255,255,255,0.08)',
                        transition: TRANSITION,
                      }
                    : {
                        color: 'rgba(255,255,255,0.42)',
                        transition: TRANSITION,
                      }
                }
              >
                <Icon size={15} className="flex-shrink-0" aria-hidden="true" />
                {sidebarOpen ? <span>{label}</span> : <span className="sr-only">{label}</span>}
              </NavLink>
            </div>
          ))}
        </nav>

        {/* Desktop user section */}
        <div className="p-2 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.065)' }}>
          <div
            className={`flex items-center gap-2.5 p-2.5 rounded-xl ${sidebarOpen ? '' : 'justify-center'}`}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #F2B045, #EDA135)', boxShadow: '0 2px 6px rgba(242,176,69,0.4)', color: '#131316' }}
              aria-hidden="true"
            >
              {userName[0]?.toUpperCase()}
            </div>
            {sidebarOpen && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-bold text-white truncate leading-tight">{userName}</p>
                  <p className="text-[10px] font-medium truncate" style={{ color: 'rgba(255,255,255,0.38)' }}>Super Admin</p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  aria-label="Cerrar sesión"
                  className="w-7 h-7 flex items-center justify-center rounded-lg flex-shrink-0 hover:bg-red-500/[0.12]"
                  style={{ color: 'rgba(255,255,255,0.35)', transition: TRANSITION }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#f87171'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.35)'; }}
                >
                  <LogOut size={13} aria-hidden="true" />
                </button>
              </>
            )}
          </div>
          {!sidebarOpen && (
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Cerrar sesión"
              className="mt-2 w-full flex justify-center p-1.5 rounded-lg hover:bg-red-500/[0.12]"
              style={{ color: 'rgba(255,255,255,0.35)', transition: TRANSITION }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#f87171'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.35)'; }}
            >
              <LogOut size={14} aria-hidden="true" />
            </button>
          )}
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════════
          MAIN COLUMN
      ═══════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <header
          className="flex items-center justify-between px-4 lg:px-5 flex-shrink-0"
          style={{
            height: 'calc(58px + env(safe-area-inset-top, 0px))',
            paddingTop: 'env(safe-area-inset-top, 0px)',
            background: 'rgba(255,255,255,0.94)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            borderBottom: '1px solid rgba(0,0,0,0.06)',
            boxShadow: '0 1px 0 rgba(255,255,255,0.6) inset',
          }}
        >
          <div className="flex items-center gap-2.5 lg:gap-3">
            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Abrir menú de navegación"
              className="lg:hidden w-9 h-9 flex items-center justify-center text-slate-600 hover:bg-black/[0.06] active:bg-black/[0.10] rounded-xl"
              style={{ transition: TRANSITION, WebkitTapHighlightColor: 'transparent' }}
            >
              <Menu size={19} aria-hidden="true" />
            </button>
            {/* Desktop sidebar toggle */}
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-expanded={sidebarOpen}
              aria-label={sidebarOpen ? 'Colapsar menú lateral' : 'Expandir menú lateral'}
              className="hidden lg:flex w-8 h-8 items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-black/[0.05] rounded-xl"
              style={{ transition: TRANSITION }}
            >
              {sidebarOpen
                ? <PanelLeftClose size={16} aria-hidden="true" />
                : <PanelLeftOpen  size={16} aria-hidden="true" />
              }
            </button>

            <div className="h-4 w-px" style={{ background: 'rgba(0,0,0,0.09)' }} aria-hidden="true" />
            <h2 className="text-[13px] lg:text-[14px] font-bold text-slate-700 tracking-[-0.02em] truncate max-w-[140px] sm:max-w-none">
              {pageTitle}
            </h2>
          </div>

          <div
            className="px-2.5 py-1.5 rounded-lg text-[10px] lg:text-[11px] font-semibold"
            style={{ background: 'rgba(242,176,69,0.10)', color: '#EDA135', border: '1px solid rgba(242,176,69,0.20)' }}
          >
            Admin Panel
          </div>
        </header>

        {/* Content */}
        <main
          id="main-content"
          className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6 pb-24 lg:pb-6"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>

      {/* ═══════════════════════════════════════════════════
          MOBILE BOTTOM NAV (hidden on lg+)
      ═══════════════════════════════════════════════════ */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40"
        style={{
          background: 'rgba(8,8,16,0.97)',
          backdropFilter: 'blur(28px) saturate(180%)',
          WebkitBackdropFilter: 'blur(28px) saturate(180%)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
        aria-label="Navegación principal"
      >
        <div className="flex h-14">
          {navItems.map(({ to, icon: Icon, shortLabel }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className="flex-1 flex flex-col items-center justify-center gap-[3px] relative"
              style={{ WebkitTapHighlightColor: 'transparent', outline: 'none' }}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div
                      className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-full"
                      style={{ background: '#F2B045' }}
                    />
                  )}
                  <div
                    className="relative flex items-center justify-center w-10 h-6 rounded-xl"
                    style={{
                      background: isActive ? 'rgba(242,176,69,0.14)' : 'transparent',
                      transition: 'background 160ms cubic-bezier(0.23, 1, 0.32, 1)',
                    }}
                  >
                    <Icon
                      size={19}
                      strokeWidth={isActive ? 2.2 : 1.7}
                      style={{
                        color: isActive ? '#F2B045' : 'rgba(255,255,255,0.38)',
                        transition: 'color 160ms cubic-bezier(0.23, 1, 0.32, 1)',
                      }}
                    />
                  </div>
                  <span
                    className="text-[9.5px] font-bold tracking-[0.03em] leading-none"
                    style={{
                      color: isActive ? '#F2B045' : 'rgba(255,255,255,0.30)',
                      transition: 'color 160ms cubic-bezier(0.23, 1, 0.32, 1)',
                    }}
                  >
                    {shortLabel}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
