import { useState, type ReactNode } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Puzzle, Users, Settings,
  LogOut, Boxes, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';

const TRANSITION = 'all 200ms cubic-bezier(0.23, 1, 0.32, 1)';

interface LayoutProps { children: ReactNode; userName: string; onLogout: () => void; }

const navItems = [
  { to: '/',        icon: LayoutDashboard, label: 'Dashboard',     shortLabel: 'Inicio'   },
  { to: '/tenants', icon: Building2,       label: 'Empresas',      shortLabel: 'Empresas' },
  { to: '/modules', icon: Puzzle,          label: 'Módulos',       shortLabel: 'Módulos'  },
  { to: '/users',   icon: Users,           label: 'Usuarios',      shortLabel: 'Usuarios' },
  { to: '/settings',icon: Settings,        label: 'Configuración', shortLabel: 'Config'   },
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
  const navigate = useNavigate();
  const pageTitle = usePageTitle();

  function handleLogout() { onLogout(); navigate('/login'); }

  return (
    <div className="bg-[#F2F2F6] min-h-[100dvh] lg:flex lg:h-[100dvh] lg:overflow-hidden">

      <a href="#main-content" className="skip-link">Saltar al contenido principal</a>

      {/* ═══════════════════════════════════════════════════
          DESKTOP SIDEBAR — hidden on mobile/tablet
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
                    : { color: 'rgba(255,255,255,0.42)', transition: TRANSITION }
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
          mobile → natural document scroll (robust on iOS)
          desktop → fixed height + internal scroll
      ═══════════════════════════════════════════════════ */}
      <div className="flex flex-col min-w-0 lg:flex-1 lg:h-[100dvh] lg:overflow-hidden">

        {/* Top bar */}
        <header
          className="sticky top-0 z-30 lg:static flex items-center justify-between px-4 lg:px-5 flex-shrink-0"
          style={{
            paddingTop: 'env(safe-area-inset-top, 0px)',
            minHeight: 'calc(56px + env(safe-area-inset-top, 0px))',
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            borderBottom: '1px solid rgba(0,0,0,0.06)',
          }}
        >
          <div className="flex items-center gap-2.5 lg:gap-3 min-w-0">
            {/* Logo chip on mobile (no sidebar there) */}
            <div
              className="lg:hidden w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #F2B045, #EDA135)',
                boxShadow: '0 2px 8px rgba(242,176,69,0.45)',
              }}
              aria-hidden="true"
            >
              <Boxes size={15} style={{ color: '#131316' }} />
            </div>

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
                : <PanelLeftOpen  size={16} aria-hidden="true" />}
            </button>

            <div className="hidden lg:block h-4 w-px" style={{ background: 'rgba(0,0,0,0.09)' }} aria-hidden="true" />
            <h2 className="text-[15px] lg:text-[14px] font-bold text-slate-800 tracking-[-0.02em] truncate">
              {pageTitle}
            </h2>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <div
              className="hidden sm:block px-2.5 py-1.5 rounded-lg text-[11px] font-semibold"
              style={{ background: 'rgba(242,176,69,0.10)', color: '#EDA135', border: '1px solid rgba(242,176,69,0.20)' }}
            >
              Admin Panel
            </div>
            {/* Logout — mobile only (desktop has it in the sidebar) */}
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Cerrar sesión"
              className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 hover:text-red-500 hover:bg-red-50 active:bg-red-100"
              style={{ transition: TRANSITION }}
            >
              <LogOut size={17} aria-hidden="true" />
            </button>
          </div>
        </header>

        {/* Content */}
        <main
          id="main-content"
          className="lg:flex-1 lg:overflow-y-auto scroll-touch px-4 py-5 sm:px-6 sm:py-6 lg:p-6"
          style={{ paddingBottom: 'calc(82px + env(safe-area-inset-bottom, 0px))' }}
          tabIndex={-1}
        >
          {children}
        </main>
      </div>

      {/* ═══════════════════════════════════════════════════
          MOBILE / TABLET BOTTOM NAV — hidden on desktop
      ═══════════════════════════════════════════════════ */}
      <nav
        className="lg:hidden fixed inset-x-0 bottom-0 z-40"
        style={{
          background: 'rgba(10,10,18,0.94)',
          backdropFilter: 'blur(30px) saturate(180%)',
          WebkitBackdropFilter: 'blur(30px) saturate(180%)',
          borderTop: '1px solid rgba(255,255,255,0.09)',
          boxShadow: '0 -6px 28px rgba(0,0,0,0.22)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
        aria-label="Navegación principal"
      >
        <div className="flex items-stretch h-[64px] max-w-xl mx-auto px-2">
          {navItems.map(({ to, icon: Icon, shortLabel }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className="flex-1 flex flex-col items-center justify-center gap-1.5 relative select-none"
              style={{ WebkitTapHighlightColor: 'transparent', outline: 'none' }}
            >
              {({ isActive }) => (
                <>
                  {/* Active pill highlight behind the icon (Material-3 style) */}
                  <span
                    className="flex items-center justify-center"
                    style={{
                      width: 52,
                      height: 30,
                      borderRadius: 999,
                      background: isActive ? 'rgba(242,176,69,0.18)' : 'transparent',
                      transition: 'background 200ms cubic-bezier(0.23, 1, 0.32, 1)',
                    }}
                  >
                    <Icon
                      size={21}
                      strokeWidth={isActive ? 2.4 : 1.9}
                      style={{
                        color: isActive ? '#F2B045' : 'rgba(255,255,255,0.42)',
                        transition: 'color 200ms cubic-bezier(0.23, 1, 0.32, 1)',
                      }}
                      aria-hidden="true"
                    />
                  </span>
                  <span
                    className="text-[10px] tracking-[0.01em] leading-none"
                    style={{
                      fontWeight: isActive ? 800 : 600,
                      color: isActive ? '#F2B045' : 'rgba(255,255,255,0.40)',
                      transition: 'color 200ms cubic-bezier(0.23, 1, 0.32, 1)',
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
