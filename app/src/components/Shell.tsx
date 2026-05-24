import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Menu, X, LogOut, Bell, ChevronDown, Boxes, Package, ArrowRightLeft,
  Wrench, Users, Activity, LayoutDashboard, Settings, BarChart2,
  AlertCircle, AlertTriangle, CheckCircle, Truck, ClipboardList,
  FileCheck, LifeBuoy, PieChart, ShoppingCart, Zap, Sun, Moon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';

interface PlanInfo {
  plan: string;
  trial_days_left: number | null;
  usage: { assets: number; users: number; technicians: number; };
  limits: Record<string, number>;
  trial_modules: { code: string; name: string; days_left: number | null; }[];
}

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

interface NotifItem { type: string; message: string; count: number; severity: string; }
interface NotifSummary { total: number; items: NotifItem[]; }

const MODULE_ICONS: Record<string, React.ReactNode> = {
  inventory:    <Package        size={15} />,
  loans:        <ArrowRightLeft size={15} />,
  maintenance:  <Wrench         size={15} />,
  personnel:    <Users          size={15} />,
  monitoring:   <Activity       size={15} />,
  providers:    <Truck          size={15} />,
  requests:     <ClipboardList  size={15} />,
  contracts:    <FileCheck      size={15} />,
  tickets:      <LifeBuoy       size={15} />,
  cost_centers: <PieChart       size={15} />,
  purchases:    <ShoppingCart   size={15} />,
};

const MODULE_DISPLAY: Record<string, string> = {
  personnel: 'Personas',
};

const MODULE_ROUTES: Record<string, string> = {
  inventory:    '/inventory',
  loans:        '/loans',
  maintenance:  '/maintenance',
  personnel:    '/personnel',
  monitoring:   '/monitoring',
  providers:    '/providers',
  requests:     '/requests',
  contracts:    '/contracts',
  tickets:      '/tickets',
  cost_centers: '/cost_centers',
  purchases:    '/purchases',
};

const NOTIF_ICONS: Record<string, React.ReactNode> = {
  loan:        <AlertCircle   size={13} className="text-red-400 flex-shrink-0" />,
  stock:       <AlertTriangle size={13} className="text-amber-400 flex-shrink-0" />,
  maintenance: <AlertTriangle size={13} className="text-amber-400 flex-shrink-0" />,
  contract:    <AlertTriangle size={13} className="text-amber-400 flex-shrink-0" />,
  request:     <AlertCircle   size={13} className="text-blue-400 flex-shrink-0" />,
  ticket:      <AlertCircle   size={13} className="text-red-400 flex-shrink-0" />,
};

const WHATSAPP_NUMBER = '56920023072';

function getWhatsappUrl(tenantName: string) {
  const msg = `Hola, soy administrador de la empresa ${tenantName} en FB Core ERP. Quiero solicitar información sobre planes.`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
}

function PlanBanner({
  plan, tenantName, dismissed, onDismiss, dark,
}: {
  plan: PlanInfo | null; tenantName: string; dismissed: boolean; onDismiss: () => void; dark: boolean;
}) {
  if (!plan || dismissed) return null;

  const isStarterFree = plan.plan === 'starter_free';
  const trialDays     = plan.trial_days_left;
  const urgentTrial   = trialDays !== null && trialDays <= 7;
  const warnTrial     = trialDays !== null && trialDays <= 15 && !urgentTrial;

  const assetsLimit = plan.limits.assets ?? -1;
  const usersLimit  = plan.limits.users  ?? -1;
  const nearAssets  = assetsLimit > 0 && plan.usage.assets >= assetsLimit * 0.8;
  const nearUsers   = usersLimit  > 0 && plan.usage.users  >= usersLimit  * 0.8;
  const nearLimit   = nearAssets || nearUsers;

  const expiringMods = plan.trial_modules.filter(m => m.days_left !== null && m.days_left <= 7);

  if (!urgentTrial && !warnTrial && !nearLimit && expiringMods.length === 0 && !isStarterFree) return null;

  const waUrl = getWhatsappUrl(tenantName);
  const dismissBtn = (
    <button type="button" onClick={onDismiss}
      className="text-[18px] leading-none shrink-0"
      style={{ color: dark ? 'rgba(255,255,255,0.28)' : '#AEAEB2' }}
    >&times;</button>
  );

  if (urgentTrial) return (
    <div className="flex items-center justify-between gap-4 rounded-2xl px-5 py-3.5 mb-5 text-[13px]"
      style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)' }}>
      <div className="flex items-center gap-3">
        <AlertTriangle size={15} className="text-red-500 shrink-0" />
        <span className="font-semibold text-red-500">Tu prueba vence en {trialDays} día{trialDays !== 1 ? 's' : ''}.</span>
        <span className="hidden sm:inline" style={{ color: dark ? 'rgba(255,255,255,0.45)' : '#65656E' }}>No pierdas acceso a tus módulos.</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <a href={waUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold"
          style={{ background: '#C6922B', color: '#17120A' }}>
          <Zap size={12} /> Extender ahora
        </a>
        {dismissBtn}
      </div>
    </div>
  );

  if (warnTrial || expiringMods.length > 0) {
    const modNames = expiringMods.map(m => m.name).join(', ');
    return (
      <div className="flex items-center justify-between gap-4 rounded-2xl px-5 py-3.5 mb-5 text-[13px]"
        style={{ background: 'rgba(198,146,43,0.08)', border: '1px solid rgba(198,146,43,0.20)' }}>
        <div className="flex items-center gap-3">
          <AlertTriangle size={15} style={{ color: '#C6922B' }} className="shrink-0" />
          <span style={{ color: dark ? 'rgba(255,255,255,0.55)' : '#65656E' }}>
            {warnTrial
              ? <><strong style={{ color: dark ? '#F3F4F6' : '#0A0A0F' }}>Tu prueba vence en {trialDays} días.</strong> Mejora tu plan para no perder acceso.</>
              : <><strong style={{ color: dark ? '#F3F4F6' : '#0A0A0F' }}>Módulos por vencer:</strong> {modNames} — menos de 7 días.</>
            }
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a href={waUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold"
            style={{ background: 'rgba(198,146,43,0.12)', color: '#C6922B', border: '1px solid rgba(198,146,43,0.25)' }}>
            Ver planes
          </a>
          {dismissBtn}
        </div>
      </div>
    );
  }

  if (nearLimit && isStarterFree) {
    const what = nearAssets ? `activos (${plan.usage.assets}/${assetsLimit})` : `usuarios (${plan.usage.users}/${usersLimit})`;
    return (
      <div className="flex items-center justify-between gap-4 rounded-2xl px-5 py-3 mb-5 text-[12.5px]"
        style={{ background: 'rgba(198,146,43,0.06)', border: '1px solid rgba(198,146,43,0.15)' }}>
        <span style={{ color: dark ? 'rgba(255,255,255,0.45)' : '#9898A3' }}>
          Estás al límite de tu plan en <strong style={{ color: dark ? '#F3F4F6' : '#0A0A0F' }}>{what}</strong>.{' '}
          <a href={waUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#C6922B', fontWeight: 600 }}>
            Vuélvete Plus →
          </a>
        </span>
        {dismissBtn}
      </div>
    );
  }

  return null;
}

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return mobile;
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const { user, logout }          = useAuth();
  const { theme, toggle }         = useTheme();
  const dark                      = theme === 'dark';
  const isMobile                  = useIsMobile();
  const [sidebarOpen, setSidebarOpen]       = useState(() => window.innerWidth >= 768);
  const [profileOpen, setProfileOpen]       = useState(false);
  const [notifOpen,   setNotifOpen]         = useState(false);
  const [notifs,      setNotifs]            = useState<NotifSummary>({ total: 0, items: [] });
  const [plan,        setPlan]              = useState<PlanInfo | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(() =>
    localStorage.getItem('plan_banner_dismissed') === new Date().toDateString()
  );
  const notifRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const token    = localStorage.getItem('token');

  useEffect(() => { if (isMobile) setSidebarOpen(false); }, [isMobile]);

  const primaryColor = user?.tenant?.primary_color || '#C6922B';

  function handleLogout() { logout(); navigate('/login'); }

  useEffect(() => {
    if (!token) return;
    function fetchNotifs() {
      fetch(`${API}/notifications/summary`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => { if (typeof d.total === 'number') setNotifs(d); })
        .catch(() => {});
    }
    fetchNotifs();
    const id = setInterval(fetchNotifs, 60_000);
    return () => clearInterval(id);
  }, [token]);

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/dashboard/plan`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setPlan(d); })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Nav link styles
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `group flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[13px] font-semibold transition-all ${
      isActive ? '' : dark ? 'hover:bg-white/[0.05]' : 'hover:bg-black/[0.04]'
    }`;

  const navLinkStyle = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? {
          color: primaryColor,
          background: `linear-gradient(135deg, ${primaryColor}18, ${primaryColor}0A)`,
          boxShadow: `0 0 0 1px ${primaryColor}1E, inset 0 1px 0 ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.55)'}`,
          transition: 'all 200ms cubic-bezier(0.23, 1, 0.32, 1)',
        }
      : {
          color: dark ? '#9CA3AF' : '#65656E',
          transition: 'all 200ms cubic-bezier(0.23, 1, 0.32, 1)',
        };

  // Shared icon button style
  const iconBtn = (hoverRed = false) => ({
    base: `size-8 flex items-center justify-center rounded-xl transition-all duration-150`,
    style: {
      color: dark ? '#6B7280' : '#AEAEB2',
      transition: 'all 160ms cubic-bezier(0.23, 1, 0.32, 1)',
    } as React.CSSProperties,
    onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.style.background = hoverRed
        ? (dark ? 'rgba(239,68,68,0.12)' : '#FEF2F2')
        : (dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)');
      e.currentTarget.style.color = hoverRed ? '#EF4444' : (dark ? '#F3F4F6' : '#111827');
    },
    onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.style.background = '';
      e.currentTarget.style.color = dark ? '#6B7280' : '#AEAEB2';
    },
  });

  const sidebarBg    = dark ? 'rgba(17,20,27,0.98)' : 'rgba(255,255,255,0.96)';
  const sidebarBdr   = dark ? '#252B36' : 'rgba(0,0,0,0.06)';
  const topbarBg     = dark ? 'rgba(15,17,21,0.92)' : 'rgba(255,255,255,0.92)';
  const sectionLabel = dark ? '#6B7280' : '#C3C3C8';
  const dividerColor = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  return (
    <div className="flex h-screen overflow-hidden"
      style={{ background: dark ? '#0F1115' : '#F5F6F8' }}>
      <a href="#main-content" className="skip-link">Saltar al contenido principal</a>

      {/* Mobile backdrop */}
      {isMobile && sidebarOpen && (
        <div className="fixed inset-0 z-40 backdrop-blur-sm"
          style={{ background: dark ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.30)' }}
          aria-hidden="true"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        aria-label="Navegación principal"
        style={{
          width: sidebarOpen ? 236 : (isMobile ? 0 : 62),
          position: isMobile ? 'fixed' : 'relative',
          top: isMobile ? 0 : undefined,
          left: isMobile ? 0 : undefined,
          height: isMobile ? '100dvh' : undefined,
          zIndex: isMobile ? 50 : undefined,
          background: sidebarBg,
          backdropFilter: 'blur(12px) saturate(180%)',
          WebkitBackdropFilter: 'blur(12px) saturate(180%)',
          borderRight: `1px solid ${sidebarBdr}`,
          boxShadow: isMobile && sidebarOpen
            ? dark ? '4px 0 32px rgba(0,0,0,0.45)' : '4px 0 24px rgba(0,0,0,0.12)'
            : 'none',
          transition: 'width 280ms cubic-bezier(0.32, 0.72, 0, 1)',
          overflow: 'hidden',
        }}
        className="flex flex-col flex-shrink-0"
      >
        {/* Branding */}
        <div
          className="flex items-center gap-3 px-4 h-[58px] flex-shrink-0 relative overflow-hidden"
          style={{ borderBottom: `1px solid ${dividerColor}` }}
        >
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true"
            style={{ background: `radial-gradient(ellipse at 0% 50%, ${primaryColor}14, transparent 70%)` }}
          />
          <div
            className="size-8 rounded-[10px] flex items-center justify-center flex-shrink-0 text-white font-bold text-sm relative z-10"
            style={{
              background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}CC)`,
              boxShadow: `0 4px 10px ${primaryColor}40, inset 0 1px 0 rgba(255,255,255,0.25)`,
            }}
            aria-hidden="true"
          >
            {user?.tenant?.logo_url
              ? <img src={user.tenant.logo_url} className="w-full h-full object-contain rounded-[8px]" alt="" />
              : <Boxes size={15} />}
          </div>
          {sidebarOpen && (
            <div className="min-w-0 flex-1 relative z-10">
              <p className="font-bold text-[13px] truncate leading-tight tracking-[-0.02em]"
                style={{ color: dark ? '#F3F4F6' : '#0A0A0F' }}>
                {user?.tenant?.name || 'FB Core'}
              </p>
              <p className="text-[10.5px] truncate font-medium mt-0.5"
                style={{ color: dark ? '#6B7280' : '#AEAEB2' }}>
                Sistema de gestión
              </p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav aria-label="Módulos" className="flex-1 py-3 px-2 overflow-y-auto space-y-0.5">
          <div className="animate-fade-up" style={{ animationDelay: '0ms' }}>
            <NavLink to="/" end className={navLinkClass} style={navLinkStyle}
              onClick={() => isMobile && setSidebarOpen(false)}>
              <LayoutDashboard size={15} className="flex-shrink-0" aria-hidden="true" />
              {sidebarOpen ? <span>Dashboard</span> : <span className="sr-only">Dashboard</span>}
            </NavLink>
          </div>

          {user?.modules && user.modules.filter(m => MODULE_ROUTES[m.code]).length > 0 && (
            <>
              {sidebarOpen
                ? <p className="px-3 pt-5 pb-1.5 text-[10px] font-bold uppercase tracking-[0.1em]"
                    style={{ color: sectionLabel }}>Operación</p>
                : <div className="my-3 mx-2 border-t" role="separator"
                    style={{ borderColor: dividerColor }} />}
              {user.modules.filter(m => MODULE_ROUTES[m.code]).map((m, idx) => (
                <div key={m.code} className="animate-fade-up"
                  style={{ animationDelay: `${(idx + 1) * 35}ms` }}>
                  <NavLink to={MODULE_ROUTES[m.code]} className={navLinkClass} style={navLinkStyle}
                    onClick={() => isMobile && setSidebarOpen(false)}>
                    <span className="flex-shrink-0 text-current" aria-hidden="true">
                      {MODULE_ICONS[m.code] || <Package size={15} />}
                    </span>
                    {sidebarOpen
                      ? <span>{MODULE_DISPLAY[m.code] || m.name}</span>
                      : <span className="sr-only">{MODULE_DISPLAY[m.code] || m.name}</span>}
                  </NavLink>
                </div>
              ))}
            </>
          )}

          {sidebarOpen
            ? <p className="px-3 pt-5 pb-1.5 text-[10px] font-bold uppercase tracking-[0.1em]"
                style={{ color: sectionLabel }}>Análisis</p>
            : <div className="my-3 mx-2 border-t" role="separator"
                style={{ borderColor: dividerColor }} />}
          <div className="animate-fade-up" style={{ animationDelay: '240ms' }}>
            <NavLink to="/reports" className={navLinkClass} style={navLinkStyle}
              onClick={() => isMobile && setSidebarOpen(false)}>
              <BarChart2 size={15} className="flex-shrink-0" aria-hidden="true" />
              {sidebarOpen ? <span>Reportes</span> : <span className="sr-only">Reportes</span>}
            </NavLink>
          </div>

          {sidebarOpen
            ? <p className="px-3 pt-5 pb-1.5 text-[10px] font-bold uppercase tracking-[0.1em]"
                style={{ color: sectionLabel }}>Sistema</p>
            : <div className="my-3 mx-2 border-t" role="separator"
                style={{ borderColor: dividerColor }} />}
          <div className="animate-fade-up" style={{ animationDelay: '280ms' }}>
            <NavLink to="/settings" className={navLinkClass} style={navLinkStyle}
              onClick={() => isMobile && setSidebarOpen(false)}>
              <Settings size={15} className="flex-shrink-0" aria-hidden="true" />
              {sidebarOpen ? <span>Configuración</span> : <span className="sr-only">Configuración</span>}
            </NavLink>
          </div>
        </nav>

        {/* User profile */}
        <div className="p-2 flex-shrink-0"
          style={{ borderTop: `1px solid ${dividerColor}` }}>
          {sidebarOpen ? (
            <>
              <button
                type="button"
                onClick={() => setProfileOpen(!profileOpen)}
                aria-expanded={profileOpen}
                aria-haspopup="menu"
                aria-label={`Menú de usuario: ${user?.name}`}
                className="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-left transition-colors"
                style={{ transition: 'background-color 160ms cubic-bezier(0.23, 1, 0.32, 1)' }}
                onMouseEnter={e => { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = ''; }}
              >
                <div
                  className="size-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                  style={{
                    background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}BB)`,
                    boxShadow: `0 2px 6px ${primaryColor}35`,
                  }}
                  aria-hidden="true"
                >
                  {user?.name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-bold truncate leading-tight"
                    style={{ color: dark ? '#F3F4F6' : '#0A0A0F' }}>{user?.name}</p>
                  <p className="text-[10px] truncate capitalize font-medium"
                    style={{ color: dark ? '#6B7280' : '#AEAEB2' }}>{user?.role?.replace('_', ' ')}</p>
                </div>
                <ChevronDown
                  size={12}
                  className={`flex-shrink-0 transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`}
                  style={{ color: dark ? '#6B7280' : '#AEAEB2' }}
                  aria-hidden="true"
                />
              </button>
              {profileOpen && (
                <div
                  role="menu"
                  className="mt-1.5 rounded-xl overflow-hidden animate-slide-up"
                  style={{
                    background: dark ? '#1A1F2A' : '#FFFFFF',
                    border: `1px solid ${dark ? '#252B36' : 'rgba(0,0,0,0.07)'}`,
                    boxShadow: dark ? '0 8px 24px rgba(0,0,0,0.32)' : '0 8px 24px rgba(0,0,0,0.09)',
                  }}
                >
                  <button
                    type="button" role="menuitem"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-red-500 font-semibold transition-colors"
                    onMouseEnter={e => { e.currentTarget.style.background = dark ? 'rgba(239,68,68,0.10)' : '#FEF2F2'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = ''; }}
                  >
                    <LogOut size={13} aria-hidden="true" /> Cerrar sesión
                  </button>
                </div>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Cerrar sesión"
              className="w-full flex items-center justify-center p-2.5 rounded-xl transition-colors text-red-400"
              onMouseEnter={e => {
                e.currentTarget.style.background = dark ? 'rgba(239,68,68,0.12)' : '#FEF2F2';
                e.currentTarget.style.color = '#EF4444';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = '';
                e.currentTarget.style.color = '';
              }}
            >
              <LogOut size={15} aria-hidden="true" />
            </button>
          )}
        </div>
      </aside>

      {/* ── Main area ───────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Topbar */}
        <header
          className="h-[58px] flex items-center justify-between px-4 flex-shrink-0"
          style={{
            background: topbarBg,
            backdropFilter: 'blur(12px) saturate(180%)',
            WebkitBackdropFilter: 'blur(12px) saturate(180%)',
            borderBottom: `1px solid ${sidebarBdr}`,
          }}
        >
          {/* Left: sidebar toggle */}
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-expanded={sidebarOpen}
            aria-controls="sidebar"
            aria-label={sidebarOpen ? 'Cerrar menú lateral' : 'Abrir menú lateral'}
            className={iconBtn().base}
            style={iconBtn().style}
            onMouseEnter={iconBtn().onMouseEnter}
            onMouseLeave={iconBtn().onMouseLeave}
          >
            {sidebarOpen ? <X size={16} aria-hidden="true" /> : <Menu size={16} aria-hidden="true" />}
          </button>

          {/* Right: actions */}
          <div className="flex items-center gap-1">

            {/* Theme toggle */}
            <button
              type="button"
              onClick={toggle}
              aria-label={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              className={iconBtn().base}
              style={iconBtn().style}
              onMouseEnter={iconBtn().onMouseEnter}
              onMouseLeave={iconBtn().onMouseLeave}
            >
              {dark
                ? <Sun  size={15} strokeWidth={2} aria-hidden="true" />
                : <Moon size={15} strokeWidth={2} aria-hidden="true" />
              }
            </button>

            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => setNotifOpen(!notifOpen)}
                aria-label={notifs.total > 0 ? `${notifs.total} notificaciones pendientes` : 'Sin notificaciones'}
                aria-expanded={notifOpen}
                aria-haspopup="dialog"
                className={`relative ${iconBtn().base}`}
                style={iconBtn().style}
                onMouseEnter={iconBtn().onMouseEnter}
                onMouseLeave={iconBtn().onMouseLeave}
              >
                <Bell size={15} aria-hidden="true" />
                {notifs.total > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none px-1"
                    style={{ boxShadow: '0 2px 6px rgba(239,68,68,0.45)' }}
                  >
                    {notifs.total > 9 ? '9+' : notifs.total}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div
                  role="dialog"
                  aria-label="Notificaciones"
                  aria-live="polite"
                  className="absolute right-0 top-11 w-80 rounded-2xl z-50 overflow-hidden animate-slide-up"
                  style={{
                    background: dark ? '#151922' : '#FFFFFF',
                    border: `1px solid ${dark ? '#252B36' : 'rgba(0,0,0,0.07)'}`,
                    boxShadow: dark
                      ? '0 8px 32px rgba(0,0,0,0.40), 0 2px 8px rgba(0,0,0,0.22)'
                      : '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
                  }}
                >
                  <div className="px-4 py-3.5 flex items-center justify-between"
                    style={{ borderBottom: `1px solid ${dark ? '#252B36' : 'rgba(0,0,0,0.05)'}` }}>
                    <span className="font-bold text-[13px] tracking-[-0.02em]"
                      style={{ color: dark ? '#F3F4F6' : '#0A0A0F' }}>
                      Notificaciones
                    </span>
                    {notifs.total > 0 && (
                      <span className="px-2 py-0.5 bg-red-500/10 text-red-500 text-[10px] font-bold rounded-full">
                        {notifs.total}
                      </span>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {(notifs.items ?? []).length === 0 ? (
                      <div className="flex flex-col items-center py-10 gap-2">
                        <CheckCircle size={20} className="text-emerald-400" aria-hidden="true" />
                        <span className="text-[13px] font-semibold"
                          style={{ color: dark ? '#6B7280' : '#AEAEB2' }}>Todo al día</span>
                      </div>
                    ) : (notifs.items ?? []).map((item, i) => (
                      <div
                        key={`${item.type}:${item.message}`}
                        className="flex items-start gap-3 px-4 py-3 transition-colors"
                        style={{
                          borderBottom: i < notifs.items.length - 1
                            ? `1px solid ${dark ? '#252B36' : 'rgba(0,0,0,0.04)'}`
                            : 'none',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = ''; }}
                      >
                        {NOTIF_ICONS[item.type] || <AlertCircle size={13} style={{ color: dark ? '#6B7280' : '#AEAEB2' }} className="flex-shrink-0" />}
                        <p className="text-[12px] leading-relaxed"
                          style={{ color: dark ? '#9CA3AF' : '#3C3C43' }}>{item.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Logout (collapsed sidebar only) */}
            {!sidebarOpen && (
              <button
                type="button"
                onClick={handleLogout}
                aria-label="Cerrar sesión"
                className={iconBtn(true).base}
                style={iconBtn(true).style}
                onMouseEnter={iconBtn(true).onMouseEnter}
                onMouseLeave={iconBtn(true).onMouseLeave}
              >
                <LogOut size={15} aria-hidden="true" />
              </button>
            )}
          </div>
        </header>

        {/* Content */}
        <main id="main-content" className="flex-1 overflow-y-auto p-6" tabIndex={-1}>
          <PlanBanner
            plan={plan}
            tenantName={user?.tenant?.name || 'tu empresa'}
            dismissed={bannerDismissed}
            dark={dark}
            onDismiss={() => {
              localStorage.setItem('plan_banner_dismissed', new Date().toDateString());
              setBannerDismissed(true);
            }}
          />
          {children}
        </main>
      </div>
    </div>
  );
}
