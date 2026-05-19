import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Puzzle, Users, Settings,
  LogOut, Menu, X, Boxes
} from 'lucide-react';

const TRANSITION = 'all 200ms cubic-bezier(0.23, 1, 0.32, 1)';

interface LayoutProps { children: React.ReactNode; userName: string; onLogout: () => void; }

const navItems = [
  { to: '/',        icon: LayoutDashboard, label: 'Dashboard'  },
  { to: '/tenants', icon: Building2,       label: 'Empresas'   },
  { to: '/modules', icon: Puzzle,          label: 'Módulos'    },
  { to: '/users',   icon: Users,           label: 'Usuarios'   },
  { to: '/settings',icon: Settings,        label: 'Ajustes'    },
];

export default function Layout({ children, userName, onLogout }: LayoutProps) {
  const [open, setOpen] = useState(true);
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);
  const navigate = useNavigate();

  function handleLogout() { onLogout(); navigate('/login'); }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#F2F2F6' }}>
      <a href="#main-content" className="skip-link">Saltar al contenido principal</a>

      {/* Sidebar */}
      <aside
        aria-label="Navegación principal"
        className="flex flex-col flex-shrink-0 overflow-hidden"
        style={{
          width: open ? 232 : 62,
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
            background: 'linear-gradient(180deg, rgba(99,102,241,0.14) 0%, transparent 100%)',
          }}
        >
          <div
            className="w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0 relative z-10"
            style={{
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              boxShadow: '0 4px 12px rgba(99,102,241,0.55), inset 0 1px 0 rgba(255,255,255,0.22)',
            }}
            aria-hidden="true"
          >
            <Boxes size={15} className="text-white" />
          </div>
          {open && (
            <div className="flex flex-col min-w-0 relative z-10">
              <span
                className="font-bold text-white text-[13px] tracking-[-0.02em] leading-tight"
              >
                ModulaERP
              </span>
              <span className="text-[10.5px] font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Super Admin
              </span>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav aria-label="Módulos de administración" className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }, idx) => (
            <div
              key={to}
              className="animate-fade-up"
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              <NavLink
                to={to}
                end={to === '/'}
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
                        color: hoveredNav === to ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.42)',
                        background: hoveredNav === to ? 'rgba(255,255,255,0.065)' : '',
                        transition: TRANSITION,
                      }
                }
                onMouseEnter={() => setHoveredNav(to)}
                onMouseLeave={() => setHoveredNav(null)}
              >
                <Icon size={15} className="flex-shrink-0" aria-hidden="true" />
                {open ? <span>{label}</span> : <span className="sr-only">{label}</span>}
              </NavLink>
            </div>
          ))}
        </nav>

        {/* User */}
        <div
          className="p-2 flex-shrink-0"
          style={{ borderTop: '1px solid rgba(255,255,255,0.065)' }}
        >
          <div
            className={`flex items-center gap-2.5 p-2.5 rounded-xl ${open ? '' : 'justify-center'}`}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                boxShadow: '0 2px 6px rgba(99,102,241,0.4)',
              }}
              aria-hidden="true"
            >
              {userName[0]?.toUpperCase()}
            </div>
            {open && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-bold text-white truncate leading-tight">{userName}</p>
                  <p className="text-[10px] font-medium truncate" style={{ color: 'rgba(255,255,255,0.38)' }}>
                    Super Admin
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  aria-label="Cerrar sesión"
                  className="w-7 h-7 flex items-center justify-center rounded-lg flex-shrink-0 hover:bg-red-500/[0.12]"
                  style={{
                    color: 'rgba(255,255,255,0.35)',
                    transition: 'all 160ms cubic-bezier(0.23, 1, 0.32, 1)',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#f87171'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.35)'; }}
                >
                  <LogOut size={13} aria-hidden="true" />
                </button>
              </>
            )}
          </div>
          {!open && (
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Cerrar sesión"
              className="mt-2 w-full flex justify-center p-1.5 rounded-lg hover:bg-red-500/[0.12]"
              style={{
                color: 'rgba(255,255,255,0.35)',
                transition: 'all 160ms cubic-bezier(0.23, 1, 0.32, 1)',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#f87171'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.35)'; }}
            >
              <LogOut size={14} aria-hidden="true" />
            </button>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <header
          className="h-[58px] flex items-center justify-between px-6 flex-shrink-0"
          style={{
            background: 'rgba(255,255,255,0.94)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            borderBottom: '1px solid rgba(0,0,0,0.06)',
            boxShadow: '0 1px 0 rgba(255,255,255,0.6) inset',
          }}
        >
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-label={open ? 'Cerrar menú lateral' : 'Abrir menú lateral'}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-black/[0.05] rounded-xl"
            style={{ transition: 'all 160ms cubic-bezier(0.23, 1, 0.32, 1)' }}
          >
            {open ? <X size={16} aria-hidden="true" /> : <Menu size={16} aria-hidden="true" />}
          </button>
          <div className="flex items-center gap-2">
            <div
              className="px-3 py-1.5 rounded-lg text-[11px] font-semibold"
              style={{
                background: 'rgba(99,102,241,0.08)',
                color: '#6366f1',
                border: '1px solid rgba(99,102,241,0.12)',
              }}
            >
              Admin Panel
            </div>
          </div>
        </header>

        {/* Content */}
        <main id="main-content" className="flex-1 overflow-y-auto p-6" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
